'use client';

import { useEffect, useRef } from 'react';
import {
  drawScene,
  rulerLocalToPx,
  rulerHandleLocal,
  worldToRulerLocal,
  RULER_LENGTH_M,
  RULER_WIDTH_M,
} from '@/lib/pendulum/scene';

const MAX_LENGTH_M = 1.3; // headroom for bob radius, sets the draw scale
const GRAB_PAD_PX = 30; // touch-friendly hit margin around the bob
const HANDLE_GRAB_PAD_PX = 20;
const RULER_BODY_GRAB_PAD_PX = 14;

const HOLD_DELAY_MS = 380; // press-and-hold threshold before the lens raises
const HOLD_MOVE_CANCEL_PX = 6; // moving more than this before the delay elapses means "drag", not "hold"

const LENS_ZOOM = 2.5;
const LENS_RADIUS_PX = 70;
const LENS_OFFSET_PX = LENS_RADIUS_PX + 26; // raised above the pointer so a finger doesn't cover it

export default function PendulumCanvas({
  physicsRef,
  mode,
  length,
  bobRadius,
  dragCapRad,
  rulerRef,
  printMarginRef,
  onBeginDrag,
  onUpdateDrag,
}) {
  const ref = useRef(null);
  const lengthRef = useRef(length);

  useEffect(() => {
    lengthRef.current = length;
  }, [length]);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return undefined;
    const ctx = cvs.getContext('2d');

    let W = 0,
      H = 0,
      dpr = 1,
      pxPerM = 1,
      visible = true,
      raf = 0;
    let pivotX = 0,
      pivotY = 0;
    // null | 'bob' | 'rulerHandle' | 'pendingRulerBody' | 'rulerBody' | 'lens'
    let dragTarget = null;
    let rulerGrabOffset = { dx: 0, dy: 0 };
    let holdStartPx = { px: 0, py: 0 };
    let holdTimer = null;
    let lens = { active: false, px: 0, py: 0 };

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
      pxPerM = (H * 0.82) / MAX_LENGTH_M;
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
        ruler: rulerRef.current,
        rulerPrintMarginM: printMarginRef.current,
      };
    }

    function draw() {
      drawScene(
        ctx,
        { originX: pivotX, originY: pivotY, pxPerM, width: W, height: H, showGuides: true },
        sceneState()
      );

      if (lens.active) drawLens();
    }

    function drawLens() {
      const lensScreenX = lens.px;
      const lensScreenY = lens.py - LENS_OFFSET_PX;
      const world = toWorld(lens.px, lens.py);
      const lensPxPerM = pxPerM * LENS_ZOOM;
      const originX = lensScreenX - world.x * lensPxPerM;
      const originY = lensScreenY - world.y * lensPxPerM;

      ctx.save();
      ctx.beginPath();
      ctx.arc(lensScreenX, lensScreenY, LENS_RADIUS_PX, 0, 6.2832);
      ctx.clip();
      ctx.fillStyle = '#0B1219';
      ctx.fillRect(lensScreenX - LENS_RADIUS_PX, lensScreenY - LENS_RADIUS_PX, LENS_RADIUS_PX * 2, LENS_RADIUS_PX * 2);
      drawScene(
        ctx,
        { originX, originY, pxPerM: lensPxPerM, width: W, height: H, showGuides: false },
        sceneState()
      );
      ctx.restore();

      ctx.beginPath();
      ctx.arc(lensScreenX, lensScreenY, LENS_RADIUS_PX, 0, 6.2832);
      ctx.strokeStyle = 'rgba(78,197,255,.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function loop() {
      if (visible) draw();
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

    function raiseLens(px, py) {
      dragTarget = 'lens';
      lens = { active: true, px, py };
    }

    function onDown(e) {
      const { px, py } = pointerXY(e);

      // 1. ruler rotate handle — instant, unaffected by the hold gesture
      const handleLocal = rulerHandleLocal();
      const handlePx = rulerLocalToPx(toPx, rulerRef.current, handleLocal.lx, handleLocal.ly);
      if (Math.hypot(px - handlePx.x, py - handlePx.y) <= HANDLE_GRAB_PAD_PX) {
        dragTarget = 'rulerHandle';
        cvs.setPointerCapture(e.pointerId);
        cvs.classList.add('dragging');
        return;
      }

      // 2. ruler body — press-and-hold raises the lens; moving first drags it
      const world = toWorld(px, py);
      const local = worldToRulerLocal(rulerRef.current, world.x, world.y);
      const padM = RULER_BODY_GRAB_PAD_PX / pxPerM;
      if (Math.abs(local.lx) <= RULER_LENGTH_M / 2 + padM && Math.abs(local.ly) <= RULER_WIDTH_M / 2 + padM) {
        dragTarget = 'pendingRulerBody';
        holdStartPx = { px, py };
        rulerGrabOffset = { dx: rulerRef.current.xM - world.x, dy: rulerRef.current.yM - world.y };
        cvs.setPointerCapture(e.pointerId);
        clearHoldTimer();
        holdTimer = setTimeout(() => {
          if (dragTarget === 'pendingRulerBody') raiseLens(px, py);
        }, HOLD_DELAY_MS);
        return;
      }

      // 3. bob
      const bob = bobPos();
      const rPx = Math.max(6, bobRadius * pxPerM);
      if (Math.hypot(px - bob.x, py - bob.y) <= rPx + GRAB_PAD_PX) {
        dragTarget = 'bob';
        cvs.setPointerCapture(e.pointerId);
        cvs.classList.add('dragging');
        onBeginDrag(angleFromEvent(e));
      }
    }

    function onMove(e) {
      if (!dragTarget) return;
      const { px, py } = pointerXY(e);

      if (dragTarget === 'pendingRulerBody') {
        const dist = Math.hypot(px - holdStartPx.px, py - holdStartPx.py);
        if (dist <= HOLD_MOVE_CANCEL_PX) return;
        clearHoldTimer();
        dragTarget = 'rulerBody';
        cvs.classList.add('dragging');
      }

      if (dragTarget === 'rulerBody') {
        const world = toWorld(px, py);
        rulerRef.current = {
          ...rulerRef.current,
          xM: world.x + rulerGrabOffset.dx,
          yM: world.y + rulerGrabOffset.dy,
        };
      } else if (dragTarget === 'lens') {
        lens = { active: true, px, py };
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
      if (dragTarget === 'lens') lens = { active: false, px: 0, py: 0 };
      dragTarget = null;
      cvs.classList.remove('dragging');
    }

    cvs.addEventListener('pointerdown', onDown);
    cvs.addEventListener('pointermove', onMove);
    cvs.addEventListener('pointerup', onUp);
    cvs.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', resize);

    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((en) => {
        visible = en[0].isIntersecting;
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
      if (io) io.disconnect();
    };
  }, [physicsRef, bobRadius, dragCapRad, rulerRef, printMarginRef, onBeginDrag, onUpdateDrag]);

  return (
    <canvas
      id="pendulum-canvas"
      ref={ref}
      className={mode === 'swinging' ? 'swinging' : ''}
      aria-label="Interactive pendulum bench. Drag the bob to set a release angle. Drag the ruler to position it, drag its end handle to rotate it, and press and hold anywhere on the ruler to magnify that spot."
    />
  );
}
