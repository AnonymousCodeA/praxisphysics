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
const MARKER_GRAB_PAD_PX = 26;
const HANDLE_GRAB_PAD_PX = 20;
const RULER_BODY_GRAB_PAD_PX = 14;

export default function PendulumCanvas({
  physicsRef,
  mode,
  length,
  bobRadius,
  dragCapRad,
  rulerRef,
  markerRef,
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
    let dragTarget = null; // null | 'bob' | 'marker' | 'rulerHandle' | 'rulerBody'
    let rulerGrabOffset = { dx: 0, dy: 0 };

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

    function draw() {
      drawScene(
        ctx,
        { originX: pivotX, originY: pivotY, pxPerM, width: W, height: H, showGuides: true },
        {
          theta: physicsRef.current.theta,
          length: lengthRef.current,
          bobRadius,
          dragCapRad,
          maxLengthM: MAX_LENGTH_M,
          ruler: rulerRef.current,
          rulerPrintMarginM: printMarginRef.current,
          marker: markerRef.current,
        }
      );
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

    function onDown(e) {
      const { px, py } = pointerXY(e);

      // 1. read-point marker — small, and often sits on the ruler, so it
      // must win the hit-test over the (much larger) ruler body.
      const markerPx = toPx(markerRef.current.xM, markerRef.current.yM);
      if (Math.hypot(px - markerPx.x, py - markerPx.y) <= MARKER_GRAB_PAD_PX) {
        dragTarget = 'marker';
        cvs.setPointerCapture(e.pointerId);
        cvs.classList.add('dragging');
        return;
      }

      // 2. ruler rotate handle
      const handleLocal = rulerHandleLocal();
      const handlePx = rulerLocalToPx(toPx, rulerRef.current, handleLocal.lx, handleLocal.ly);
      if (Math.hypot(px - handlePx.x, py - handlePx.y) <= HANDLE_GRAB_PAD_PX) {
        dragTarget = 'rulerHandle';
        cvs.setPointerCapture(e.pointerId);
        cvs.classList.add('dragging');
        return;
      }

      // 3. ruler body
      const world = toWorld(px, py);
      const local = worldToRulerLocal(rulerRef.current, world.x, world.y);
      const padM = RULER_BODY_GRAB_PAD_PX / pxPerM;
      if (Math.abs(local.lx) <= RULER_LENGTH_M / 2 + padM && Math.abs(local.ly) <= RULER_WIDTH_M / 2 + padM) {
        dragTarget = 'rulerBody';
        rulerGrabOffset = { dx: rulerRef.current.xM - world.x, dy: rulerRef.current.yM - world.y };
        cvs.setPointerCapture(e.pointerId);
        cvs.classList.add('dragging');
        return;
      }

      // 4. bob
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

      if (dragTarget === 'marker') {
        const world = toWorld(px, py);
        markerRef.current = { xM: world.x, yM: world.y };
      } else if (dragTarget === 'rulerHandle') {
        const world = toWorld(px, py);
        const angleRad = Math.atan2(world.y - rulerRef.current.yM, world.x - rulerRef.current.xM);
        rulerRef.current = { ...rulerRef.current, angleRad };
      } else if (dragTarget === 'rulerBody') {
        const world = toWorld(px, py);
        rulerRef.current = {
          ...rulerRef.current,
          xM: world.x + rulerGrabOffset.dx,
          yM: world.y + rulerGrabOffset.dy,
        };
      } else if (dragTarget === 'bob') {
        onUpdateDrag(angleFromEvent(e));
      }
    }

    function onUp() {
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
      cancelAnimationFrame(raf);
      cvs.removeEventListener('pointerdown', onDown);
      cvs.removeEventListener('pointermove', onMove);
      cvs.removeEventListener('pointerup', onUp);
      cvs.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', resize);
      if (io) io.disconnect();
    };
  }, [physicsRef, bobRadius, dragCapRad, rulerRef, markerRef, printMarginRef, onBeginDrag, onUpdateDrag]);

  return (
    <canvas
      id="pendulum-canvas"
      ref={ref}
      className={mode === 'swinging' ? 'swinging' : ''}
      aria-label="Interactive pendulum bench. Drag the bob to set a release angle, drag the ruler to position it, drag its handle to rotate it, and drag the marker to choose a read point."
    />
  );
}
