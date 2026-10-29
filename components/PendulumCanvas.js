'use client';

import { useEffect, useRef } from 'react';
import {
  clampPhotogatePos,
  drawScene,
  isOnAnglePlate,
  isOnScale,
} from '@/lib/pendulum/scene';

const MAX_LENGTH_M = 0.55; // headroom for the bob, sets the vertical draw-scale constraint
const FILL = 0.86; // fraction of the binding dimension the apparatus should occupy
// The bench's horizontal framing: wide enough for the whole swing either
// side of the pivot, so the bob never runs off the frame at a large
// amplitude — the bob's reach is L·sin(85°), and L goes up to half a
// metre. A wide canvas would otherwise leave the apparatus a sliver in
// the middle of empty space (see docs/conventions.md), and a narrow one (the
// instrument dock open) has to give the width back, which is exactly the
// rescaling the dock is meant to cause.
const BENCH_MIN_WIDTH_M = 1.0;
const GRAB_PAD_PX = 30; // touch-friendly hit margin around the bob
const BOB_DIRECT_PAD_PX = 4; // a press this close to the bob is unambiguously on it
const BODY_GRAB_PAD_PX = 14;
const PHOTOGATE_GRAB_PAD_PX = 30;

const HOLD_DELAY_MS = 380; // press-and-hold threshold before the lens raises
const HOLD_MOVE_CANCEL_PX = 6; // moving more than this before the delay elapses means "drag", not "hold"

const LENS_ZOOM_MULT = 1.5; // multiple of the bench's own pxPerM, when that's already large enough
const LENS_MIN_PX_PER_M = 5000; // floor: higher zoom for clearer mm ticks

// A world point (metres from the pivot) in viewport coordinates, through
// the exact transform the scene is drawn with — `view` is what this canvas
// publishes to viewRef on every resize. For pointing a popover at something
// that exists only as pixels on the canvas (the scale, the bob).
export function worldToClient(view, xM, yM) {
  if (!view?.canvas) return null;
  const r = view.canvas.getBoundingClientRect();
  return { x: r.left + view.originX + xM * view.pxPerM, y: r.top + view.originY + yM * view.pxPerM };
}

export default function PendulumCanvas({
  physicsRef,
  mode,
  length,
  bobRadius,
  dragCapRad,
  photogateRef,
  plateOffsetRef,
  visible, // { scale, anglePlate, photogate } — current toggle state
  lensRef, // written here on hold/move/release, read+drawn by PendulumLens
  sceneStateRef, // written here every frame, read by PendulumLens
  viewRef, // { canvas, originX, originY, pxPerM }, written on every resize — see worldToClient
  lensUsedRef, // set true the first time the lens is raised
  onBeginDrag,
  onUpdateDrag,
}) {
  const ref = useRef(null);
  const lengthRef = useRef(length);
  const visibleRef = useRef(visible);

  useEffect(() => {
    lengthRef.current = length;
  }, [length]);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return undefined;
    const ctx = cvs.getContext('2d');

    let W = 0,
      H = 0,
      dpr = 1,
      pxPerM = 1,
      visibleOnScreen = true,
      raf = 0;
    let pivotX = 0,
      pivotY = 0;
    // null | 'bob' | 'photogate' | 'pendingHold' | 'lens'
    let dragTarget = null;
    let grabOffset = { dx: 0, dy: 0 };
    let holdStartPx = { px: 0, py: 0 };
    let holdTimer = null;

    function resize() {
      const r = cvs.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = Math.round(r.width * dpr);
      cvs.height = Math.round(r.height * dpr);
      W = r.width;
      H = r.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pivotX = W * 0.5;
      pivotY = H * 0.1;
      // Fit the taller of the two things that actually need to fit — the
      // pendulum's vertical swing and the bench's horizontal framing —
      // against the dimension that constrains it, and use most of that
      // dimension rather than a fixed fraction of height alone. Otherwise
      // a wide canvas leaves the apparatus a sliver in the middle of empty
      // space (see docs/conventions.md).
      const pxPerMByHeight = (H * FILL) / MAX_LENGTH_M;
      const pxPerMByWidth = (W * FILL) / BENCH_MIN_WIDTH_M;
      pxPerM = Math.min(pxPerMByHeight, pxPerMByWidth);
      if (viewRef) viewRef.current = { canvas: cvs, originX: pivotX, originY: pivotY, pxPerM };
    }

    const toPx = (mx, my) => ({ x: pivotX + mx * pxPerM, y: pivotY + my * pxPerM });
    const toWorld = (px, py) => ({ x: (px - pivotX) / pxPerM, y: (py - pivotY) / pxPerM });

    function sceneState() {
      return {
        theta: physicsRef.current.theta,
        length: lengthRef.current,
        bobRadius,
        dragCapRad,
        maxLengthM: MAX_LENGTH_M,
        visible: visibleRef.current,
        anglePlateOffsetRad: plateOffsetRef.current,
        photogate: photogateRef.current,
      };
    }

    function draw() {
      const state = sceneState();
      sceneStateRef.current = state;
      drawScene(
        ctx,
        { originX: pivotX, originY: pivotY, pxPerM, width: W, height: H, showGuides: true },
        state
      );
    }

    function loop() {
      if (visibleOnScreen) draw();
      raf = requestAnimationFrame(loop);
    }

    function bobPos() {
      const { theta } = physicsRef.current;
      return toPx(Math.sin(theta) * lengthRef.current, Math.cos(theta) * lengthRef.current);
    }

    function angleFromEvent(e) {
      const r = cvs.getBoundingClientRect();
      const px = e.clientX - r.left,
        py = e.clientY - r.top;
      return Math.atan2(px - pivotX, py - pivotY);
    }

    function pointerXY(e) {
      const r = cvs.getBoundingClientRect();
      return { px: e.clientX - r.left, py: e.clientY - r.top };
    }

    function clearHoldTimer() {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    }

    function updateLens(px, py, clientX, clientY) {
      const world = toWorld(px, py);
      lensRef.current = {
        active: true,
        clientX,
        clientY,
        worldX: world.x,
        worldY: world.y,
        pxPerM: Math.max(pxPerM * LENS_ZOOM_MULT, LENS_MIN_PX_PER_M),
      };
    }

    function raiseLens(px, py, clientX, clientY) {
      dragTarget = 'lens';
      if (lensUsedRef) lensUsedRef.current = true;
      updateLens(px, py, clientX, clientY);
    }

    function onDown(e) {
      const { px, py } = pointerXY(e);
      const v = visibleRef.current;

      // 1. photogate — small, compact, just dragged by its beam centre
      if (v.photogate) {
        const gp = toPx(photogateRef.current.xM, photogateRef.current.yM);
        if (Math.hypot(px - gp.x, py - gp.y) <= PHOTOGATE_GRAB_PAD_PX) {
          const world = toWorld(px, py);
          dragTarget = 'photogate';
          grabOffset = { dx: photogateRef.current.xM - world.x, dy: photogateRef.current.yM - world.y };
          cvs.setPointerCapture(e.pointerId);
          cvs.classList.add('dragging');
          return;
        }
      }

      // The scale sits right beside the hanging bob, inside the bob's
      // generous touch margin — and the bob's height is exactly where a
      // student wants to hold the lens. So a press on the bob itself grabs
      // it; a press on the scale (even within that margin) raises the lens;
      // only then does the margin catch near-misses for the bob.
      const world = toWorld(px, py);
      const bob = bobPos();
      const rPx = Math.max(6, bobRadius * pxPerM);
      const bobDist = Math.hypot(px - bob.x, py - bob.y);

      // 2. bob, pressed directly
      if (bobDist <= rPx + BOB_DIRECT_PAD_PX) {
        beginBobDrag(e);
        return;
      }

      // 3. vertical scale — fixed apparatus: press and hold raises the lens
      // Allow magnifier anywhere on bench near scale/bob for easier access
      if (v.scale && (isOnScale(world.x, world.y, 0.015) || bobDist < 120 || Math.abs(world.x - SCALE_EDGE_X_M) < 0.08)) {
        beginHold(px, py, e.pointerId, e.clientX, e.clientY);
        return;
      }

      // 4. bob, within its touch margin — ahead of the angle plate, since
      // the margin reaches over the plate's edge
      if (bobDist <= rPx + GRAB_PAD_PX) {
        beginBobDrag(e);
        return;
      }

      // 5. angle plate — same press-and-hold as the scale
      if (v.anglePlate && (isOnAnglePlate(world.x, world.y, BODY_GRAB_PAD_PX / pxPerM + 0.015) || bobDist < 120 || Math.sqrt((world.x - anglePlatePos.x) ** 2 + (world.y - anglePlatePos.y) ** 2) < 0.15)) {
        beginHold(px, py, e.pointerId, e.clientX, e.clientY);
      }
    }

    function beginBobDrag(e) {
      dragTarget = 'bob';
      cvs.setPointerCapture(e.pointerId);
      cvs.classList.add('dragging');
      onBeginDrag(angleFromEvent(e));
    }

    // The scale and angle plate are part of the apparatus, so pressing on
    // either only ever means "read it": hold to raise the lens. Moving first
    // cancels rather than dragging — neither is the student's to move.
    function beginHold(px, py, pointerId, clientX, clientY) {
      dragTarget = 'pendingHold';
      holdStartPx = { px, py };
      cvs.setPointerCapture(pointerId);
      clearHoldTimer();
      holdTimer = setTimeout(() => {
        if (dragTarget === 'pendingHold') raiseLens(px, py, clientX, clientY);
      }, HOLD_DELAY_MS);
    }

    function onMove(e) {
      if (!dragTarget) return;
      const { px, py } = pointerXY(e);

      if (dragTarget === 'pendingHold') {
        const dist = Math.hypot(px - holdStartPx.px, py - holdStartPx.py);
        if (dist <= HOLD_MOVE_CANCEL_PX) return;
        clearHoldTimer();
        dragTarget = null;
        return;
      }

      if (dragTarget === 'photogate') {
        const world = toWorld(px, py);
        photogateRef.current = clampPhotogatePos(world.x + grabOffset.dx, world.y + grabOffset.dy);
      } else if (dragTarget === 'lens') {
        updateLens(px, py, e.clientX, e.clientY);
      } else if (dragTarget === 'bob') {
        onUpdateDrag(angleFromEvent(e));
      }
    }

    function onUp() {
      clearHoldTimer();
      if (dragTarget === 'lens') lensRef.current = { ...lensRef.current, active: false };
      dragTarget = null;
      cvs.classList.remove('dragging');
    }

    cvs.addEventListener('pointerdown', onDown);
    cvs.addEventListener('pointermove', onMove);
    cvs.addEventListener('pointerup', onUp);
    cvs.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', resize);

    // A plain window 'resize' listener misses size changes caused by our own
    // layout — switching mobile tabs in/out of `display:none`, or dragging
    // the desktop split divider — since neither fires a window resize event.
    // ResizeObserver reports the canvas's actual box size changing for any
    // reason, including the async initial call it makes right after observe(),
    // which is what rescues a canvas that first mounted inside a hidden pane.
    let ro = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(resize);
      ro.observe(cvs);
    }

    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((en) => {
        visibleOnScreen = en[0].isIntersecting;
      }, { threshold: 0.05 });
      io.observe(cvs);
    }

    resize();
    raf = requestAnimationFrame(loop);

    return () => {
      clearHoldTimer();
      cancelAnimationFrame(raf);
      cvs.removeEventListener('pointerdown', onDown);
      cvs.removeEventListener('pointermove', onMove);
      cvs.removeEventListener('pointerup', onUp);
      cvs.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', resize);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
    };
  }, [
    physicsRef,
    bobRadius,
    dragCapRad,
    photogateRef,
    plateOffsetRef,
    lensRef,
    sceneStateRef,
    viewRef,
    lensUsedRef,
    onBeginDrag,
    onUpdateDrag,
  ]);

  return (
    <canvas
      id="pendulum-canvas"
      ref={ref}
      className={mode === 'swinging' ? 'swinging' : ''}
      aria-label="Interactive pendulum bench. Drag the bob to set a release angle. Bring in the vertical scale, angle plate, or photogate from the instrument menu below; drag the photogate to position it, and press and hold on the scale or angle plate to magnify that spot."
    />
  );
}
