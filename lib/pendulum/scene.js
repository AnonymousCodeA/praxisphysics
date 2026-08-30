// Pure canvas drawing for the pendulum bench: pivot, string, bob, and the
// physical ruler. World space is meters, origin at the pivot, +x right,
// +y down.
//
// drawScene() is called identically by PendulumCanvas for the full bench
// view AND, at a higher `view.pxPerM`, for the press-and-hold lens drawn
// over it (see PendulumCanvas.js) — same function, different scale. The
// lens is never a separate diagram: whatever exists on the bench is what
// it shows, just bigger. See docs/pendulum-plan.md and CLAUDE.md.

export const RULER_LENGTH_M = 0.5; // 50cm ruler body
export const RULER_WIDTH_M = 0.02;
export const RULER_SCALE_LENGTH_MM = 480; // printed 0..48cm

const RULER_FONT = '"IBM Plex Mono", monospace';

export function drawScene(ctx, view, state) {
  const { originX, originY, pxPerM, width, height, showGuides } = view;
  ctx.clearRect(0, 0, width, height);
  const toPx = (mx, my) => ({ x: originX + mx * pxPerM, y: originY + my * pxPerM });

  if (showGuides) drawCapGuides(ctx, toPx, state);
  drawPendulum(ctx, toPx, pxPerM, state);
  drawRuler(ctx, toPx, pxPerM, state.ruler, state.rulerPrintMarginM);
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
// (-halfLen) to its physical end (+halfLen); y is width, from the
// graduated edge (-halfW, where every tick starts) to the plain edge
// (+halfW). The ruler's own (xM, yM) is its centre; rotating spins it
// about that centre.
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
  const gradEdge = -halfW; // every tick starts here, growing inward (+ly)
  const P = (lx, ly) => rulerLocalToPx(toPx, ruler, lx, ly);

  // solid, opaque body — reads as a physical object, not an outline
  const corners = [P(-halfLen, -halfW), P(halfLen, -halfW), P(halfLen, halfW), P(-halfLen, halfW)];
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fillStyle = '#DCE4EC';
  ctx.fill();
  ctx.strokeStyle = 'rgba(78,197,255,.7)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // graduated edge: 1mm ticks short, 5mm medium, 10mm long + cm numeral,
  // all measured inward from the graduated edge. True scale (same pxPerM
  // as everything else on the bench), so at bench zoom this is
  // deliberately near-illegible — the press-and-hold lens is what makes
  // it legible.
  const scaleStartLx = -halfLen + printMarginM;
  const tickWidthPx = Math.max(0.05, 0.00025 * pxPerM);
  const fontPx = Math.max(0.3, 0.0034 * pxPerM);
  ctx.font = `${fontPx}px ${RULER_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let mm = 0; mm <= RULER_SCALE_LENGTH_MM; mm++) {
    const lx = scaleStartLx + mm / 1000;
    const isCm = mm % 10 === 0;
    const isHalfCm = !isCm && mm % 5 === 0;
    const tickLen = isCm ? RULER_WIDTH_M * 0.62 : isHalfCm ? RULER_WIDTH_M * 0.4 : RULER_WIDTH_M * 0.2;
    const p0 = P(lx, gradEdge);
    const p1 = P(lx, gradEdge + tickLen);
    ctx.beginPath();
    ctx.strokeStyle = isCm ? 'rgba(6,10,15,.9)' : 'rgba(6,10,15,.55)';
    ctx.lineWidth = tickWidthPx;
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    if (isCm) {
      const lp = P(lx, gradEdge + tickLen + RULER_WIDTH_M * 0.14);
      ctx.save();
      ctx.translate(lp.x, lp.y);
      ctx.rotate(ruler.angleRad);
      ctx.fillStyle = 'rgba(6,10,15,.9)';
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
