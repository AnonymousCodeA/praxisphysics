'use client';

import { useEffect, useRef } from 'react';

const STEP = 26;      // grid spacing
const R = 220;        // influence radius of the charge
const PINCH = 2.7;    // map exponent at the centre — raise for a harder pull
const SAMPLE = 6;
const LEVELS = 7;

export default function FieldBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer:fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');

    document.body.classList.add('warp');

    let W = 0, H = 0, dpr = 1, raf = 0;
    let tx = -1e4, ty = -1e4, mx = -1e4, my = -1e4;
    let sgn = -1, sgnTarget = -1, primed = false, dirty = true;

    const bucket = [], bcount = [];
    for (let i = 0; i < LEVELS; i++) { bucket.push(new Float32Array(32000)); bcount.push(0); }
    const P = [0, 0, 0];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cvs.width = Math.round(W * dpr);
      cvs.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = true;
    }

    // radial remap. p>1 draws the grid inward, p<1 pushes it outward,
    // p->1 at the boundary so the warp joins the plain grid seamlessly.
    function warp(x, y, out) {
      const dx = x - mx, dy = y - my;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r >= R || r < 0.001) { out[0] = x; out[1] = y; out[2] = 1; return; }
      const t = r / R, s = 1 - t;
      const p = Math.pow(PINCH, -sgn * s * s);
      const tt = Math.pow(t, p);
      const f = tt / t;
      out[0] = mx + dx * f;
      out[1] = my + dy * f;
      out[2] = tt > 1 ? 1 : tt;
    }

    function sm(x, a, b) {
      let t = (x - a) / (b - a);
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      return t * t * (3 - 2 * t);
    }

    // faint far from the charge, brightest where lines bunch,
    // fading to nothing at the singularity so there is no blob
    function alphaOf(v) {
      let g = 1 - v;
      if (g < 0) g = 0;
      return (.032 + .17 * g * g) * sm(v, .02, .13);
    }

    const AMAX = .202;

    function seg(x0, y0, x1, y1, v) {
      const a = alphaOf(v);
      let k = (a / AMAX * LEVELS) | 0;
      if (k < 0) k = 0;
      if (k > LEVELS - 1) k = LEVELS - 1;
      const n = bcount[k], b = bucket[k];
      if (n + 4 > b.length) return;
      b[n] = x0; b[n + 1] = y0; b[n + 2] = x1; b[n + 3] = y1;
      bcount[k] = n + 4;
    }

    function line(vert, fixed, a0, a1) {
      let n = Math.ceil((a1 - a0) / SAMPLE);
      if (n < 1) n = 1;
      let px = 0, py = 0, pv = 0, first = true;
      for (let i = 0; i <= n; i++) {
        const u = a0 + (a1 - a0) * i / n;
        const x = vert ? fixed : u;
        const y = vert ? u : fixed;
        warp(x, y, P);
        const vx = P[0], vy = P[1], vv = P[2];
        if (!first) seg(px, py, vx, vy, (pv + vv) * .5);
        px = vx; py = vy; pv = vv; first = false;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let k = 0; k < LEVELS; k++) bcount[k] = 0;

      const oy = -(window.scrollY % STEP);
      let x, y, d, half, lo, hi;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(78,197,255,.032)';
      ctx.lineWidth = 1;

      for (x = 0; x <= W + STEP; x += STEP) {
        d = x - mx;
        if (d < -R || d > R) { ctx.moveTo(x, 0); ctx.lineTo(x, H); continue; }
        half = Math.sqrt(R * R - d * d);
        lo = Math.max(0, my - half); hi = Math.min(H, my + half);
        if (hi <= lo) { ctx.moveTo(x, 0); ctx.lineTo(x, H); continue; }
        if (lo > 0) { ctx.moveTo(x, 0); ctx.lineTo(x, lo); }
        if (hi < H) { ctx.moveTo(x, hi); ctx.lineTo(x, H); }
        line(true, x, lo, hi);
      }
      for (y = oy; y <= H + STEP; y += STEP) {
        d = y - my;
        if (d < -R || d > R) { ctx.moveTo(0, y); ctx.lineTo(W, y); continue; }
        half = Math.sqrt(R * R - d * d);
        lo = Math.max(0, mx - half); hi = Math.min(W, mx + half);
        if (hi <= lo) { ctx.moveTo(0, y); ctx.lineTo(W, y); continue; }
        if (lo > 0) { ctx.moveTo(0, y); ctx.lineTo(lo, y); }
        if (hi < W) { ctx.moveTo(hi, y); ctx.lineTo(W, y); }
        line(false, y, lo, hi);
      }
      ctx.stroke();

      for (let k = 0; k < LEVELS; k++) {
        const n = bcount[k];
        if (!n) continue;
        const b = bucket[k];
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(78,197,255,' + (((k + .5) / LEVELS) * AMAX) + ')';
        ctx.lineWidth = 1;
        for (let j = 0; j < n; j += 4) { ctx.moveTo(b[j], b[j + 1]); ctx.lineTo(b[j + 2], b[j + 3]); }
        ctx.stroke();
      }
    }

    function loop() {
      const moving = Math.abs(tx - mx) > .4 || Math.abs(ty - my) > .4;
      const flipping = Math.abs(sgnTarget - sgn) > .004;
      if (moving) { mx += (tx - mx) * .16; my += (ty - my) * .16; }
      if (flipping) { sgn += (sgnTarget - sgn) * .11; }
      if (moving || flipping || dirty) { draw(); dirty = false; }
      raf = requestAnimationFrame(loop);
    }

    function onMove(e) {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!primed) { mx = tx; my = ty; primed = true; }
    }
    function onDown() { sgnTarget = 1; }
    function onUp() { sgnTarget = -1; }
    function onScroll() { dirty = true; }

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);

    resize();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      document.body.classList.remove('warp');
    };
  }, []);

  return <canvas id="field" ref={ref} aria-hidden="true" />;
}
