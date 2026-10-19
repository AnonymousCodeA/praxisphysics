'use client';

import { useEffect, useRef } from 'react';
import {
  drawScene,
  rulerLocalToPx,
  rulerHandleLocal,
  worldToRulerLocal,
  isOnAnglePlate,
  RULER_LENGTH_M,
  RULER_WIDTH_M,
} from '@/lib/pendulum/scene';

const MAX_LENGTH_M = 0.55; // headroom for bob radius, sets the vertical draw-scale constraint
const FILL = 0.86; // fraction of the binding dimension the apparatus should occupy
const GRAB_PAD_PX = 30; // touch-friendly hit margin around the bob
const HANDLE_GRAB_PAD_PX = 20;
const BODY_GRAB_PAD_PX = 14;
const PHOTOGATE_GRAB_PAD_PX = 30;

const HOLD_DELAY_MS = 380; // press-and-hold threshold before the lens raises
const HOLD_MOVE_CANCEL_PX = 6; // moving more than this before the delay elapses means "drag", not "hold"

const LENS_ZOOM_MULT = 1.5; // multiple of the bench's own pxPerM, when that's already large enough
const LENS_MIN_PX_PER_M = 3500; // floor: ~3.5 px/mm, the minimum for adjacent mm ticks to be distinguishable

export default function PendulumCanvas({
  physicsRef,
  mode,
  length,
  bobRadius,
  dragCapRad,
  rulerRef,
  photogateRef,
  printMarginRef,
  plateOffsetRef,
  visible, // { ruler, anglePlate, photogate } — current toggle state
  lensRef, // written here on hold/move/release, read+drawn by PendulumLens
  sceneStateRef, // written here every frame, read by PendulumLens
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
    // null | 'bob' | 'rulerHandle' | 'photogate' | 'pendingBody' | 'body' | 'lens'
    let dragTarget = null;
    let pendingKind = null; // 'ruler' | 'anglePlate', while dragTarget is 'pendingBody'/'body'
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
      // pendulum's vertical swing and the ruler's horizontal length —
      // against the dimension that constrains it, and use most of that
      // dimension rather than a fixed fraction of height alone. Otherwise
      // a wide canvas leaves the apparatus a sliver in the middle of empty
      // space (see CLAUDE.md).
      const pxPerMByHeight = (H * FILL) / MAX_LENGTH_M;
      const pxPerMByWidth = (W * FILL) / RULER_LENGTH_M;
      pxPerM = Math.min(pxPerMByHeight, pxPerMByWidth);
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
        ruler: rulerRef.current,
        rulerPrintMarginM: printMarginRef.current,
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
      updateLens(px, py, clientX, clientY);
    }

    function onDown(e) {
      const { px, py } = pointerXY(e);
      const v = visibleRef.current;

      // 1. ruler rotate handle — instant, unaffected by the hold gesture
      if (v.ruler) {
        const hl = rulerHandleLocal();
        const hp = rulerLocalToPx(toPx, rulerRef.current, hl.lx, hl.ly);
        if (Math.hypot(px - hp.x, py - hp.y) <= HANDLE_GRAB_PAD_PX) {
          dragTarget = 'rulerHandle';
          cvs.setPointerCapture(e.pointerId);
          cvs.classList.add('dragging');
          return;
        }
      }

      // 2. photogate — small, compact, just dragged by its beam centre
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

      // 3. ruler body — press-and-hold raises the lens; moving first drags it
      if (v.ruler) {
        const world = toWorld(px, py);
        const local = worldToRulerLocal(rulerRef.current, world.x, world.y);
        const padM = BODY_GRAB_PAD_PX / pxPerM;
        if (Math.abs(local.lx) <= RULER_LENGTH_M / 2 + padM && Math.abs(local.ly) <= RULER_WIDTH_M / 2 + padM) {
          beginPendingBody('ruler', px, py, world, e.pointerId, e.clientX, e.clientY);
          return;
        }
      }

      // 4. bob — ahead of the angle plate, since the bob's generous grab
      // margin reaches over the plate's edge and grabbing the bob there
      // should still work
      const bob = bobPos();
      const rPx = Math.max(6, bobRadius * pxPerM);
      if (Math.hypot(px - bob.x, py - bob.y) <= rPx + GRAB_PAD_PX) {
        dragTarget = 'bob';
        cvs.setPointerCapture(e.pointerId);
        cvs.classList.add('dragging');
        onBeginDrag(angleFromEvent(e));
        return;
      }

      // 5. angle plate — fixed apparatus, so only the hold half of the
      // gesture: press and hold raises the lens; moving first cancels
      if (v.anglePlate) {
        const world = toWorld(px, py);
        if (isOnAnglePlate(world.x, world.y, BODY_GRAB_PAD_PX / pxPerM)) {
          beginPendingBody('anglePlate', px, py, world, e.pointerId, e.clientX, e.clientY);
        }
      }
    }

    function beginPendingBody(kind, px, py, world, pointerId, clientX, clientY) {
      dragTarget = 'pendingBody';
      pendingKind = kind;
      holdStartPx = { px, py };
      if (kind === 'ruler') grabOffset = { dx: rulerRef.current.xM - world.x, dy: rulerRef.current.yM - world.y };
      cvs.setPointerCapture(pointerId);
      clearHoldTimer();
      holdTimer = setTimeout(() => {
        if (dragTarget === 'pendingBody') raiseLens(px, py, clientX, clientY);
      }, HOLD_DELAY_MS);
    }

    function onMove(e) {
      if (!dragTarget) return;
      const { px, py } = pointerXY(e);

      if (dragTarget === 'pendingBody') {
        const dist = Math.hypot(px - holdStartPx.px, py - holdStartPx.py);
        if (dist <= HOLD_MOVE_CANCEL_PX) return;
        clearHoldTimer();
        if (pendingKind === 'anglePlate') {
          // nothing to drag: the plate isn't the student's to move
          dragTarget = null;
          pendingKind = null;
          return;
        }
        dragTarget = 'body';
        cvs.classList.add('dragging');
      }

      if (dragTarget === 'body') {
        const world = toWorld(px, py);
        rulerRef.current = { ...rulerRef.current, xM: world.x + grabOffset.dx, yM: world.y + grabOffset.dy };
      } else if (dragTarget === 'photogate') {
        const world = toWorld(px, py);
        photogateRef.current = { xM: world.x + grabOffset.dx, yM: world.y + grabOffset.dy };
      } else if (dragTarget === 'lens') {
        updateLens(px, py, e.clientX, e.clientY);
      } else if (dragTarget === 'rulerHandle') {
        const world = toWorld(px, py);
        const angleRad = Math.atan2(world.y - rulerRef.current.yM, world.x - rulerRef.current.xM);
        rulerRef.current = { ...rulerRef.current, angleRad };
      } else if (dragTarget === 'bob') {
        onUpdateDrag(angleFromEvent(e));
      }
    }

    function onUp() {
      clearHoldTimer();
      if (dragTarget === 'lens') lensRef.current = { ...lensRef.current, active: false };
      dragTarget = null;
      pendingKind = null;
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
    rulerRef,
    photogateRef,
    printMarginRef,
    plateOffsetRef,
    lensRef,
    sceneStateRef,
    onBeginDrag,
    onUpdateDrag,
  ]);

  return (
    <canvas
      id="pendulum-canvas"
      ref={ref}
      className={mode === 'swinging' ? 'swinging' : ''}
      aria-label="Interactive pendulum bench. Drag the bob to set a release angle. Bring in a ruler, angle plate, or photogate from the instrument menu below; drag the ruler and photogate to position, drag the ruler's end handle to rotate it, and press and hold on the ruler or angle plate to magnify that spot."
    />
  );
}
