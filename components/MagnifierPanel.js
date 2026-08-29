'use client';

import { useEffect, useRef } from 'react';
import { drawScene } from '@/lib/pendulum/scene';

// The bench necessarily compresses a ~1.3 m pendulum swing into a small
// canvas, so its true-scale pxPerM is tiny and the ruler's mm ticks are
// sub-pixel there — that's deliberate (see PendulumCanvas). Inheriting
// that same scale here would make the magnifier illegible, so it defines
// its own true-scale factor sized to its own panel instead: enough to
// show roughly this many millimetres of the scene around the read-point
// marker, which comes out to on the order of an 8x loupe over what's
// visible on the bench.
const WINDOW_M = 0.02;

export default function MagnifierPanel({
  physicsRef,
  length,
  bobRadius,
  rulerRef,
  markerRef,
  printMarginRef,
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

    function resize() {
      const r = cvs.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = Math.round(r.width * dpr);
      cvs.height = Math.round(r.height * dpr);
      W = r.width;
      H = r.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pxPerM = W / WINDOW_M;
    }

    function draw() {
      const marker = markerRef.current;
      const originX = W / 2 - marker.xM * pxPerM;
      const originY = H / 2 - marker.yM * pxPerM;
      drawScene(
        ctx,
        { originX, originY, pxPerM, width: W, height: H, showGuides: false },
        {
          theta: physicsRef.current.theta,
          length: lengthRef.current,
          bobRadius,
          ruler: rulerRef.current,
          rulerPrintMarginM: printMarginRef.current,
          marker,
        }
      );
    }

    function loop() {
      if (visible) draw();
      raf = requestAnimationFrame(loop);
    }

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
      window.removeEventListener('resize', resize);
      if (io) io.disconnect();
    };
  }, [physicsRef, bobRadius, rulerRef, markerRef, printMarginRef]);

  return (
    <div className="magnifier">
      <div className="instrument-head">
        <b>MAGNIFIER</b>
        <span className="instrument-res">~{(WINDOW_M * 1000).toFixed(0)}mm FIELD</span>
      </div>
      <canvas id="magnifier-canvas" ref={ref} aria-label="Magnified view around the read-point marker" />
      <p className="instrument-note">Drag the crosshair marker on the bench to move this view.</p>
    </div>
  );
}
