'use client';

import { useEffect, useRef } from 'react';

const MAX_LENGTH_M = 1.3; // headroom for bob radius, sets the draw scale
const GRAB_PAD_PX = 30; // touch-friendly hit margin around the bob

export default function PendulumCanvas({
  physicsRef,
  mode,
  length,
  bobRadius,
  dragCapRad,
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
      raf = 0,
      dragging = false;
    let pivotX = 0,
      pivotY = 0;

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

    function bobPos() {
      const { theta } = physicsRef.current;
      const L = lengthRef.current;
      return {
        x: pivotX + Math.sin(theta) * L * pxPerM,
        y: pivotY + Math.cos(theta) * L * pxPerM,
      };
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const { x, y } = bobPos();
      const rPx = Math.max(6, bobRadius * pxPerM);
      const capLen = MAX_LENGTH_M * pxPerM;

      // drag-cap guides
      ctx.save();
      ctx.strokeStyle = 'rgba(78,197,255,.14)';
      ctx.setLineDash([2, 6]);
      ctx.lineWidth = 1;
      for (const sign of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(
          pivotX + Math.sin(sign * dragCapRad) * capLen,
          pivotY + Math.cos(sign * dragCapRad) * capLen
        );
        ctx.stroke();
      }
      ctx.restore();

      // string
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(230,237,243,.7)';
      ctx.lineWidth = 1.4;
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // pivot
      ctx.beginPath();
      ctx.fillStyle = '#7A8B9C';
      ctx.arc(pivotX, pivotY, 3.5, 0, 6.2832);
      ctx.fill();

      // bob
      const grad = ctx.createRadialGradient(x - rPx * 0.3, y - rPx * 0.3, rPx * 0.1, x, y, rPx);
      grad.addColorStop(0, '#9EE5FF');
      grad.addColorStop(1, '#1B7FA8');
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(x, y, rPx, 0, 6.2832);
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(78,197,255,.6)';
      ctx.lineWidth = 1;
      ctx.arc(x, y, rPx, 0, 6.2832);
      ctx.stroke();
    }

    function loop() {
      if (visible) draw();
      raf = requestAnimationFrame(loop);
    }

    function angleFromEvent(e) {
      const r = cvs.getBoundingClientRect();
      const px = e.clientX - r.left,
        py = e.clientY - r.top;
      return Math.atan2(px - pivotX, py - pivotY);
    }

    function onDown(e) {
      const { x, y } = bobPos();
      const r = cvs.getBoundingClientRect();
      const px = e.clientX - r.left,
        py = e.clientY - r.top;
      const rPx = Math.max(6, bobRadius * pxPerM);
      if (Math.hypot(px - x, py - y) > rPx + GRAB_PAD_PX) return;
      dragging = true;
      cvs.setPointerCapture(e.pointerId);
      cvs.classList.add('dragging');
      onBeginDrag(angleFromEvent(e));
    }
    function onMove(e) {
      if (dragging) onUpdateDrag(angleFromEvent(e));
    }
    function onUp() {
      dragging = false;
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
  }, [physicsRef, bobRadius, dragCapRad, onBeginDrag, onUpdateDrag]);

  return (
    <canvas
      id="pendulum-canvas"
      ref={ref}
      className={mode === 'swinging' ? 'swinging' : ''}
      aria-label="Interactive pendulum. Drag the bob to set a release angle."
    />
  );
}
