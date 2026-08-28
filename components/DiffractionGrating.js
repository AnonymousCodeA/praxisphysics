'use client';

import { useEffect, useRef } from 'react';

const LAM = 633e-9;   // He-Ne red
const SHIFT = 0.14;   // how far left of flush-right the grating sits
const NS = 18;        // slits contributing — sets how tight the fringes are
const SLIT = 0.20;    // slit width as a fraction of the spacing
const SAMPLES = 2000;
const LV = 28;        // brightness levels in the fringe pattern

export default function DiffractionGrating() {
  const ref = useRef(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');

    const fx = document.createElement('canvas');
    const fctx = fx.getContext('2d');
    const blurOK = 'filter' in ctx;

    const segs = [];
    for (let i = 0; i < LV; i++) segs.push([]);

    let W = 0, H = 0, dpr = 1;
    let N = 620, phase = 0, breath = 0, idle = 9;
    let dragging = false, visible = true, last = 0, raf = 0;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const r = cvs.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = Math.round(r.width * dpr);
      cvs.height = Math.round(r.height * dpr);
      fx.width = cvs.width;
      fx.height = cvs.height;
      W = r.width; H = r.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function geom() {
      const Rr = Math.min(H * 0.44, W * 0.47);
      let gx = W - Rr - 18 - W * SHIFT;
      if (gx < W * 0.30) gx = W * 0.30;
      return { cy: H * 0.5, R: Rr, gx, front: Math.max(50, W * 0.16) };
    }

    // single-slit envelope, in units of the order coordinate
    function envAt(u) {
      const al = Math.PI * SLIT * u;
      if (Math.abs(al) < 1e-7) return 1;
      const e = Math.sin(al) / al;
      return e * e;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const g = geom(), cy = g.cy, R = g.R, gx = g.gx;
      const rt = LAM * N * 1000;              // lambda / d
      const mmax = Math.floor(1 / rt);
      let m, th, x, y, i, k;

      const lx1 = g.front, lh = 24;
      const bx = lx1 + 9;
      const span = Math.min(H * 0.115, 25);

      // optical axis
      ctx.beginPath();
      ctx.setLineDash([2, 7]);
      ctx.strokeStyle = 'rgba(122,139,156,.20)';
      ctx.lineWidth = 1;
      ctx.moveTo(bx, cy); ctx.lineTo(gx + R + 8, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // detector arc
      const ag = ctx.createLinearGradient(0, cy - R, 0, cy + R);
      ag.addColorStop(0, 'rgba(78,197,255,.04)');
      ag.addColorStop(.5, 'rgba(78,197,255,.17)');
      ag.addColorStop(1, 'rgba(78,197,255,.04)');
      ctx.beginPath();
      ctx.strokeStyle = ag;
      ctx.lineWidth = 1;
      ctx.arc(gx, cy, R, -1.40, 1.40);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';

      // incident beam
      const ib = ctx.createLinearGradient(0, cy - span, 0, cy + span);
      ib.addColorStop(0, 'rgba(78,197,255,0)');
      ib.addColorStop(.42, 'rgba(78,197,255,.10)');
      ib.addColorStop(.5, 'rgba(158,229,255,.26)');
      ib.addColorStop(.58, 'rgba(78,197,255,.10)');
      ib.addColorStop(1, 'rgba(78,197,255,0)');
      ctx.fillStyle = ib;
      ctx.fillRect(bx, cy - span, gx - bx, span * 2);

      for (x = gx - 11 - (phase % 13); x > bx; x -= 13) {
        const wg = ctx.createLinearGradient(0, cy - span, 0, cy + span);
        wg.addColorStop(0, 'rgba(158,229,255,0)');
        wg.addColorStop(.5, 'rgba(158,229,255,.30)');
        wg.addColorStop(1, 'rgba(158,229,255,0)');
        ctx.beginPath();
        ctx.strokeStyle = wg;
        ctx.lineWidth = 1;
        ctx.moveTo(x, cy - span); ctx.lineTo(x, cy + span);
        ctx.stroke();
      }

      // diffracted beams, dimmed by the same envelope the fringes obey
      for (m = -mmax; m <= mmax; m++) {
        th = Math.asin(m * rt);
        const a = 0.44 * envAt(m);
        if (a < .012) continue;
        x = gx + R * Math.cos(th);
        y = cy - R * Math.sin(th);

        const bg = ctx.createLinearGradient(gx, cy, x, y);
        bg.addColorStop(0, 'rgba(158,229,255,' + a + ')');
        bg.addColorStop(.55, 'rgba(78,197,255,' + (a * .40) + ')');
        bg.addColorStop(1, 'rgba(78,197,255,' + (a * .18) + ')');

        ctx.save();
        ctx.beginPath();
        ctx.arc(gx, cy, R, 0, 6.2832);
        ctx.clip();

        ctx.globalAlpha = .13;
        ctx.beginPath();
        ctx.strokeStyle = bg;
        ctx.lineWidth = (m === 0 ? 4.5 : 3.4);
        ctx.moveTo(gx, cy); ctx.lineTo(x, y);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.strokeStyle = bg;
        ctx.lineWidth = (m === 0 ? 1.15 : 0.9);
        ctx.moveTo(gx, cy); ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
      }

      // ---- the fringe pattern itself, swept along the arc ----
      for (k = 0; k < LV; k++) segs[k].length = 0;

      const RR = R - 1.6;                    // fringes sit on the screen surface
      const t0 = -1.40, t1 = 1.40, dt = (t1 - t0) / SAMPLES;
      let pX = 0, pY = 0, pI = 0, have = false;

      for (i = 0; i <= SAMPLES; i++) {
        th = t0 + i * dt;
        const u = Math.sin(th) / rt;         // order coordinate
        const b = Math.PI * u;
        const sb = Math.sin(b);
        const gf = Math.abs(sb) < 1e-7 ? 1 : Math.sin(NS * b) / (NS * sb);
        const I = gf * gf * envAt(u);
        const xx = gx + RR * Math.cos(th), yy = cy - RR * Math.sin(th);
        if (have) {
          const mid = (I + pI) * 0.5;
          if (mid > 0.002) {
            k = Math.floor(Math.pow(mid, 0.45) * LV);
            if (k > LV - 1) k = LV - 1;
            if (k < 0) k = 0;
            segs[k].push(pX, pY, xx, yy);
          }
        }
        pX = xx; pY = yy; pI = I; have = true;
      }

      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.clearRect(0, 0, W, H);
      fctx.globalCompositeOperation = 'lighter';
      fctx.lineCap = 'butt';
      for (k = 0; k < LV; k++) {
        const arr = segs[k];
        if (!arr.length) continue;
        const tl = (k + 0.5) / LV, tp = Math.pow(tl, 1.5);
        fctx.beginPath();
        for (i = 0; i < arr.length; i += 4) {
          fctx.moveTo(arr[i], arr[i + 1]);
          fctx.lineTo(arr[i + 2], arr[i + 3]);
        }
        fctx.strokeStyle = 'rgba(' + Math.round(78 + (234 - 78) * tp) + ','
          + Math.round(197 + (250 - 197) * tp) + ',255,'
          + (0.06 + 0.94 * tl) + ')';
        fctx.lineWidth = 2.6;
        fctx.stroke();
      }

      // bloom it inward only — nothing gets past the screen
      ctx.save();
      ctx.beginPath();
      ctx.arc(gx, cy, R, 0, 6.2832);
      ctx.clip();
      if (blurOK) {
        ctx.filter = 'blur(11px)'; ctx.globalAlpha = .95; ctx.drawImage(fx, 0, 0, W, H);
        ctx.filter = 'blur(4px)'; ctx.globalAlpha = .75; ctx.drawImage(fx, 0, 0, W, H);
        ctx.filter = 'none';
      }
      ctx.globalAlpha = 1;
      ctx.drawImage(fx, 0, 0, W, H);
      ctx.restore();

      // light pooling on the grating, and the aperture flare
      const hg = ctx.createRadialGradient(gx, cy, 0, gx, cy, H * 0.22);
      hg.addColorStop(0, 'rgba(158,229,255,.22)');
      hg.addColorStop(1, 'rgba(78,197,255,0)');
      ctx.beginPath(); ctx.fillStyle = hg;
      ctx.arc(gx, cy, H * 0.22, 0, 6.2832); ctx.fill();

      const af = ctx.createRadialGradient(lx1 + 3, cy, 0, lx1 + 3, cy, 26);
      af.addColorStop(0, 'rgba(226,247,255,.62)');
      af.addColorStop(.3, 'rgba(120,214,255,.20)');
      af.addColorStop(1, 'rgba(78,197,255,0)');
      ctx.beginPath(); ctx.fillStyle = af;
      ctx.arc(lx1 + 3, cy, 26, 0, 6.2832); ctx.fill();

      ctx.globalCompositeOperation = 'source-over';

      // ---- laser: front end only, body running off the left edge ----
      ctx.beginPath();
      ctx.rect(-30, cy - lh / 2, lx1 + 30, lh);
      ctx.fillStyle = 'rgba(9,15,21,.94)';
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(78,197,255,.42)';
      ctx.lineWidth = 1.1;
      ctx.moveTo(-30, cy - lh / 2); ctx.lineTo(lx1, cy - lh / 2);
      ctx.lineTo(lx1, cy + lh / 2); ctx.lineTo(-30, cy + lh / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(78,197,255,.22)';
      ctx.lineWidth = 1;
      for (i = 1; i <= 3; i++) {
        const vx = lx1 - 12 - i * 11;
        if (vx < 2) break;
        ctx.moveTo(vx, cy - lh / 2 + 5); ctx.lineTo(vx, cy + lh / 2 - 5);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.rect(lx1, cy - 5.5, 9, 11);
      ctx.fillStyle = 'rgba(9,15,21,.94)';
      ctx.strokeStyle = 'rgba(78,197,255,.5)';
      ctx.fill(); ctx.stroke();

      // grating, edge-on
      const gh = H * 0.30;
      const sub = ctx.createLinearGradient(0, cy - gh, 0, cy + gh);
      sub.addColorStop(0, 'rgba(78,197,255,.09)');
      sub.addColorStop(.5, 'rgba(78,197,255,.5)');
      sub.addColorStop(1, 'rgba(78,197,255,.09)');
      ctx.beginPath();
      ctx.strokeStyle = sub;
      ctx.lineWidth = 1.4;
      ctx.moveTo(gx, cy - gh); ctx.lineTo(gx, cy + gh);
      ctx.stroke();

      const gap = Math.max(2.3, 2600 / N);
      for (y = cy - gh; y <= cy + gh; y += gap) {
        const tt = 1 - Math.abs(y - cy) / gh;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(158,229,255,' + (.36 * tt * tt) + ')';
        ctx.lineWidth = 1;
        ctx.moveTo(gx - 4.5, y); ctx.lineTo(gx + 4.5, y);
        ctx.stroke();
      }
    }

    function loop(t) {
      if (!last) last = t;
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      if (visible) {
        if (!reduce) {
          phase += dt * 26;
          breath += dt;
          idle += dt;
          if (!dragging && idle > 3.5) {
            const target = 700 + 400 * Math.sin(breath * 0.38);
            N += (target - N) * Math.min(1, dt * 0.85);
          }
        }
        draw();
      }
      raf = requestAnimationFrame(loop);
    }

    function setFromPoint(e) {
      const r = cvs.getBoundingClientRect();
      let f = 1 - (e.clientY - r.top) / r.height;
      if (f < 0) f = 0;
      if (f > 1) f = 1;
      N = 280 + f * (1120 - 280);
      idle = 0;
    }

    function onDown(e) {
      dragging = true;
      cvs.classList.add('dragging');
      cvs.setPointerCapture(e.pointerId);
      setFromPoint(e);
    }
    function onMove(e) { if (dragging) setFromPoint(e); }
    function onUp() { dragging = false; idle = 0; cvs.classList.remove('dragging'); }
    function onVis() { visible = !document.hidden; }

    cvs.addEventListener('pointerdown', onDown);
    cvs.addEventListener('pointermove', onMove);
    cvs.addEventListener('pointerup', onUp);
    cvs.addEventListener('pointercancel', onUp);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', resize);

    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: .05 });
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
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', resize);
      if (io) io.disconnect();
    };
  }, []);

  return <canvas id="lab" ref={ref} aria-label="Interactive diffraction grating, side view" />;
}
