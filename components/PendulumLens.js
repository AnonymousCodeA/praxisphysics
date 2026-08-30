'use client';

import { useEffect, useRef } from 'react';
import { drawScene } from '@/lib/pendulum/scene';

const LENS_RADIUS_PX = 95;
const LENS_SIZE_PX = LENS_RADIUS_PX * 2;
const LENS_OFFSET_PX = LENS_RADIUS_PX + 26; // raised above the pointer so a finger doesn't cover it
const VIEWPORT_MARGIN_PX = 8; // keep it fully on-screen, whichever edge it nears

// A floating overlay, not a region clipped inside the bench canvas — it
// renders as its own small `position:fixed` canvas so it can extend past
// the bench frame's edges (which clip an ordinary child via
// `overflow:hidden`). It still draws through the exact same drawScene()
// as the bench, just with a different view transform (see scene.js) —
// PendulumCanvas only ever writes to lensRef/sceneStateRef, never draws
// the lens itself.
export default function PendulumLens({ lensRef, sceneStateRef }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cvs = canvasRef.current;
    if (!wrap || !cvs) return undefined;
    const ctx = cvs.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs.width = Math.round(LENS_SIZE_PX * dpr);
    cvs.height = Math.round(LENS_SIZE_PX * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;

    function loop() {
      const lens = lensRef.current;
      if (!lens.active) {
        wrap.style.display = 'none';
      } else {
        wrap.style.display = 'block';

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const left = Math.min(
          Math.max(lens.clientX - LENS_RADIUS_PX, VIEWPORT_MARGIN_PX),
          vw - LENS_SIZE_PX - VIEWPORT_MARGIN_PX
        );
        const top = Math.min(
          Math.max(lens.clientY - LENS_OFFSET_PX - LENS_RADIUS_PX, VIEWPORT_MARGIN_PX),
          vh - LENS_SIZE_PX - VIEWPORT_MARGIN_PX
        );
        wrap.style.transform = `translate(${left}px, ${top}px)`;

        const originX = LENS_RADIUS_PX - lens.worldX * lens.pxPerM;
        const originY = LENS_RADIUS_PX - lens.worldY * lens.pxPerM;
        ctx.fillStyle = '#0B1219';
        ctx.fillRect(0, 0, LENS_SIZE_PX, LENS_SIZE_PX);
        drawScene(
          ctx,
          { originX, originY, pxPerM: lens.pxPerM, width: LENS_SIZE_PX, height: LENS_SIZE_PX, showGuides: false },
          sceneStateRef.current
        );
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, [lensRef, sceneStateRef]);

  return (
    <div ref={wrapRef} className="pendulum-lens" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
