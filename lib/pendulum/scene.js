// Pure canvas drawing for the pendulum bench: pivot, string, bob, the
// physical ruler, and the magnifier's read-point marker. World space is
// meters, origin at the pivot, +x right, +y down.
//
// drawScene() is called identically by PendulumCanvas (the bench, full
// view) and MagnifierPanel (a small window zoomed on the read-point) —
// same function, different `view.pxPerM`/origin. The magnifier is never a
// separate diagram: whatever exists on the bench is what it shows, just
// bigger. See docs/pendulum-plan.md and CLAUDE.md.

export const RULER_LENGTH_M = 0.3; // 30cm ruler body
export const RULER_WIDTH_M = 0.016;
export const RULER_SCALE_LENGTH_MM = 280; // printed 0..28cm

const RULER_FONT = '"IBM Plex Mono", monospace';

export function drawScene(ctx, view, state) {
  const { originX, originY, pxPerM, width, height, showGuides } = view;
  ctx.clearRect(0, 0, width, height);
  const toPx = (mx, my) => ({ x: originX + mx * pxPerM, y: originY + my * pxPerM });

  if (showGuides) drawCapGuides(ctx, toPx, state);
  drawPendulum(ctx, toPx, pxPerM, state);
  drawRuler(ctx, toPx, pxPerM, state.ruler, state.rulerPrintMarginM);
  drawMarker(ctx, toPx, state.marker);
}

function drawCapGuides(ctx, toPx, state) {
  const p0 = toPx(0, 0);
  ctx.save();
  ctx.strokeStyle = 'rgba(78,197,255,.14)';
  ctx.setLineDash([2, 6]);
  ctx.lineWidth = 1;
  for (const sign of [-1, 1]) {
    const p1 = toPx(
      Math.sin(sign * state.dragCapRad) * state.maxLengthM,
      Math.cos(sign * state.dragCapRad) * state.maxLengthM
    );
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPendulum(ctx, toPx, pxPerM, state) {
  const pivot = toPx(0, 0);
  const bob = toPx(Math.sin(state.theta) * state.length, Math.cos(state.theta) * state.length);
  const rPx = Math.max(6, state.bobRadius * pxPerM);

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(230,237,243,.7)';
  ctx.lineWidth = 1.4;
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(bob.x, bob.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = '#7A8B9C';
  ctx.arc(pivot.x, pivot.y, 3.5, 0, 6.2832);
  ctx.fill();

  const grad = ctx.createRadialGradient(bob.x - rPx * 0.3, bob.y - rPx * 0.3, rPx * 0.1, bob.x, bob.y, rPx);
  grad.addColorStop(0, '#9EE5FF');
  grad.addColorStop(1, '#1B7FA8');
  ctx.beginPath();
  ctx.fillStyle = grad;
  ctx.arc(bob.x, bob.y, rPx, 0, 6.2832);
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(78,197,255,.6)';
  ctx.lineWidth = 1;
  ctx.arc(bob.x, bob.y, rPx, 0, 6.2832);
  ctx.stroke();
}

// Local ruler space: x runs along the body from its physical start
// (-halfLen) to its physical end (+halfLen); y is width, centred. The
// ruler's own (xM, yM) is its centre; rotating spins it about that centre.
function rulerToWorld(ruler, lx, ly) {
  const cos = Math.cos(ruler.angleRad);
  const sin = Math.sin(ruler.angleRad);
  return { x: ruler.xM + lx * cos - ly * sin, y: ruler.yM + lx * sin + ly * cos };
}

export function rulerLocalToPx(toPx, ruler, lx, ly) {
  const w = rulerToWorld(ruler, lx, ly);
  return toPx(w.x, w.y);
}

// Inverse: a world point -> the ruler's own local coordinates. Used for
// hit-testing (is this pointer over the ruler's body?).
export function worldToRulerLocal(ruler, wx, wy) {
  const dx = wx - ruler.xM;
  const dy = wy - ruler.yM;
  const cos = Math.cos(-ruler.angleRad);
  const sin = Math.sin(-ruler.angleRad);
  return { lx: dx * cos - dy * sin, ly: dx * sin + dy * cos };
}

export function rulerHandleLocal() {
  return { lx: RULER_LENGTH_M / 2, ly: 0 };
}

function drawRuler(ctx, toPx, pxPerM, ruler, printMarginM) {
  const halfLen = RULER_LENGTH_M / 2;
  const halfW = RULER_WIDTH_M / 2;
  const P = (lx, ly) => rulerLocalToPx(toPx, ruler, lx, ly);

  // body
  const corners = [P(-halfLen, -halfW), P(halfLen, -halfW), P(halfLen, halfW), P(-halfLen, halfW)];
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(230,237,243,.10)';
  ctx.strokeStyle = 'rgba(78,197,255,.55)';
  ctx.lineWidth = 1.2;
  ctx.fill();
  ctx.stroke();

  // scale: true-scale mm ticks and cm labels, deliberately near-invisible
  // at bench zoom (see PendulumCanvas's pxPerM) — the magnifier is what
  // makes them legible.
  const scaleStartLx = -halfLen + printMarginM;
  const tickWidthPx = Math.max(0.05, 0.00025 * pxPerM);
  const fontPx = Math.max(0.3, 0.0028 * pxPerM);
  ctx.font = `${fontPx}px ${RULER_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let mm = 0; mm <= RULER_SCALE_LENGTH_MM; mm++) {
    const lx = scaleStartLx + mm / 1000;
    const isCm = mm % 10 === 0;
    const isHalfCm = !isCm && mm % 5 === 0;
    const tickLen = isCm ? halfW * 0.55 : isHalfCm ? halfW * 0.4 : halfW * 0.22;
    const p0 = P(lx, -halfW);
    const p1 = P(lx, -halfW + tickLen);
    ctx.beginPath();
    ctx.strokeStyle = isCm ? 'rgba(6,10,15,.85)' : 'rgba(6,10,15,.5)';
    ctx.lineWidth = tickWidthPx;
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    if (isCm) {
      const lp = P(lx, halfW * 0.15);
      ctx.save();
      ctx.translate(lp.x, lp.y);
      ctx.rotate(ruler.angleRad);
      ctx.fillStyle = 'rgba(6,10,15,.85)';
      ctx.fillText(String(mm / 10), 0, 0);
      ctx.restore();
    }
  }

  // rotate handle, fixed pixel size — a UI affordance, not a scale mark
  const handle = P(halfLen, 0);
  ctx.beginPath();
  ctx.fillStyle = 'rgba(78,197,255,.30)';
  ctx.strokeStyle = 'rgba(78,197,255,.85)';
  ctx.lineWidth = 1.3;
  ctx.arc(handle.x, handle.y, 6, 0, 6.2832);
  ctx.fill();
  ctx.stroke();
}

function drawMarker(ctx, toPx, marker) {
  const p = toPx(marker.xM, marker.yM);
  ctx.save();
  ctx.strokeStyle = '#4EC5FF';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 7, 0, 6.2832);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x - 11, p.y);
  ctx.lineTo(p.x - 3, p.y);
  ctx.moveTo(p.x + 3, p.y);
  ctx.lineTo(p.x + 11, p.y);
  ctx.moveTo(p.x, p.y - 11);
  ctx.lineTo(p.x, p.y - 3);
  ctx.moveTo(p.x, p.y + 3);
  ctx.lineTo(p.x, p.y + 11);
  ctx.stroke();
  ctx.restore();
}
