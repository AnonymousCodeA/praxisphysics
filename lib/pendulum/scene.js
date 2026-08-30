// Pure canvas drawing for the pendulum bench: pivot, string, bob, and the
// physical instruments (ruler, protractor, photogate). World space is
// meters, origin at the pivot, +x right, +y down.
//
// drawScene() is called identically by PendulumCanvas for the full bench
// view AND, at a higher `view.pxPerM`, for the press-and-hold lens drawn
// over it (see PendulumCanvas.js) — same function, different scale. The
// lens is never a separate diagram: whatever exists on the bench is what
// it shows, just bigger. See docs/pendulum-plan.md and CLAUDE.md.

export const RULER_LENGTH_M = 0.5; // 50cm ruler body
export const RULER_WIDTH_M = 0.02;
export const RULER_SCALE_LENGTH_MM = 480; // printed 0..48cm

export const PROTRACTOR_RADIUS_M = 0.13; // 130mm

export const PHOTOGATE_STAND_HEIGHT_M = 0.08; // 80mm posts
export const PHOTOGATE_BEAM_HALF_WIDTH_M = 0.045;

const SCALE_FONT = '"IBM Plex Mono", monospace';

export function drawScene(ctx, view, state) {
  const { originX, originY, pxPerM, width, height, showGuides } = view;
  ctx.clearRect(0, 0, width, height);
  const toPx = (mx, my) => ({ x: originX + mx * pxPerM, y: originY + my * pxPerM });

  if (showGuides) drawCapGuides(ctx, toPx, state);
  drawPendulum(ctx, toPx, pxPerM, state);
  if (state.visible.photogate) drawPhotogate(ctx, toPx, pxPerM, state.photogate);
  if (state.visible.ruler) drawRuler(ctx, toPx, pxPerM, state.ruler, state.rulerPrintMarginM);
  if (state.visible.protractor) drawProtractor(ctx, toPx, pxPerM, state.protractor, state.protractorOffsetRad);
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

// ---------------------------------------------------------------- ruler --

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
  ctx.font = `${fontPx}px ${SCALE_FONT}`;
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
  drawHandle(ctx, P(halfLen, 0));
}

// ----------------------------------------------------------- protractor --

// Local protractor space: origin (0,0) is the centre mark — the point a
// student aligns with the vertex being measured, and the pivot the whole
// object rotates about. Local +x runs along the baseline (the flat edge,
// from -R to +R); local +y bulges into the semicircular body. Degrees are
// measured from the +x baseline (0°) round to -x (180°).
function protractorToWorld(pr, lx, ly) {
  const cos = Math.cos(pr.angleRad);
  const sin = Math.sin(pr.angleRad);
  return { x: pr.xM + lx * cos - ly * sin, y: pr.yM + lx * sin + ly * cos };
}

export function protractorLocalToPx(toPx, pr, lx, ly) {
  const w = protractorToWorld(pr, lx, ly);
  return toPx(w.x, w.y);
}

export function worldToProtractorLocal(pr, wx, wy) {
  const dx = wx - pr.xM;
  const dy = wy - pr.yM;
  const cos = Math.cos(-pr.angleRad);
  const sin = Math.sin(-pr.angleRad);
  return { lx: dx * cos - dy * sin, ly: dx * sin + dy * cos };
}

export function protractorHandleLocal() {
  return { lx: PROTRACTOR_RADIUS_M, ly: 0 };
}

const PROTRACTOR_ARC_SAMPLES = 72;

function drawProtractor(ctx, toPx, pxPerM, pr, offsetRad) {
  const R = PROTRACTOR_RADIUS_M;
  const P = (lx, ly) => protractorLocalToPx(toPx, pr, lx, ly);

  // solid, opaque body: baseline + arc
  const start = P(-R, 0);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  const end = P(R, 0);
  ctx.lineTo(end.x, end.y);
  for (let i = 0; i <= PROTRACTOR_ARC_SAMPLES; i++) {
    const phi = (i / PROTRACTOR_ARC_SAMPLES) * Math.PI;
    const p = P(R * Math.cos(phi), R * Math.sin(phi));
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = '#DCE4EC';
  ctx.fill();
  ctx.strokeStyle = 'rgba(78,197,255,.7)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // baseline, emphasised — a clear alignment reference, always visible
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(6,10,15,.75)';
  ctx.lineWidth = 1.4;
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // degree graduations: true scale (sub-pixel at bench zoom, legible via
  // the lens), offset from the geometric baseline by a small session-seeded
  // rotation — the systematic is in where the printed scale sits relative
  // to the centre mark, not a hidden number.
  const tickWidthPx = Math.max(0.05, 0.00025 * pxPerM);
  const fontPx = Math.max(0.3, 0.0034 * pxPerM);
  ctx.font = `${fontPx}px ${SCALE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let deg = 0; deg <= 180; deg++) {
    const phi = (deg * Math.PI) / 180 + offsetRad;
    const isTen = deg % 10 === 0;
    const isFive = !isTen && deg % 5 === 0;
    const tickLen = isTen ? R * 0.16 : isFive ? R * 0.1 : R * 0.05;
    const c = Math.cos(phi),
      s = Math.sin(phi);
    const p0 = P(R * c, R * s);
    const p1 = P((R - tickLen) * c, (R - tickLen) * s);
    ctx.beginPath();
    ctx.strokeStyle = isTen ? 'rgba(6,10,15,.9)' : 'rgba(6,10,15,.55)';
    ctx.lineWidth = tickWidthPx;
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    if (isTen) {
      const labelR = R - tickLen - R * 0.13;
      const lp = P(labelR * c, labelR * s);
      ctx.save();
      ctx.translate(lp.x, lp.y);
      ctx.rotate(pr.angleRad + phi - Math.PI / 2);
      ctx.fillStyle = 'rgba(6,10,15,.9)';
      ctx.fillText(String(deg), 0, 0);
      ctx.restore();
    }
  }

  // centre mark, fixed pixel size — the vertex a student aligns against,
  // always clearly visible without the lens
  const c = P(0, 0);
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(78,197,255,.9)';
  ctx.lineWidth = 1.4;
  ctx.moveTo(c.x - 5, c.y);
  ctx.lineTo(c.x + 5, c.y);
  ctx.moveTo(c.x, c.y - 5);
  ctx.lineTo(c.x, c.y + 5);
  ctx.stroke();

  drawHandle(ctx, P(R, 0));
}

// ------------------------------------------------------------ photogate --

// The gate's (xM, yM) is the beam's centre. The beam runs tangentially
// (across the pendulum's arc at that point); the stand's posts extend
// radially outward from the pivot, away from the swing.
function photogateGeometry(gate) {
  const r = Math.hypot(gate.xM, gate.yM) || 1e-6;
  const rx = gate.xM / r,
    ry = gate.yM / r; // radial unit (pivot -> gate)
  const tx = -ry,
    ty = rx; // tangent unit
  const hw = PHOTOGATE_BEAM_HALF_WIDTH_M;
  const h = PHOTOGATE_STAND_HEIGHT_M;
  const beamL = { x: gate.xM - tx * hw, y: gate.yM - ty * hw };
  const beamR = { x: gate.xM + tx * hw, y: gate.yM + ty * hw };
  const baseL = { x: beamL.x + rx * h, y: beamL.y + ry * h };
  const baseR = { x: beamR.x + rx * h, y: beamR.y + ry * h };
  return { beamL, beamR, baseL, baseR };
}

function drawPhotogate(ctx, toPx, pxPerM, gate) {
  const { beamL, beamR, baseL, baseR } = photogateGeometry(gate);
  const pL = toPx(beamL.x, beamL.y);
  const pR = toPx(beamR.x, beamR.y);
  const bL = toPx(baseL.x, baseL.y);
  const bR = toPx(baseR.x, baseR.y);

  // posts
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(122,139,156,.9)';
  ctx.lineWidth = Math.max(1.4, 0.003 * pxPerM);
  ctx.moveTo(pL.x, pL.y);
  ctx.lineTo(bL.x, bL.y);
  ctx.moveTo(pR.x, pR.y);
  ctx.lineTo(bR.x, bR.y);
  ctx.stroke();

  // beam — a glowing line, this is the sensing element
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bg = ctx.createLinearGradient(pL.x, pL.y, pR.x, pR.y);
  bg.addColorStop(0, 'rgba(78,197,255,.12)');
  bg.addColorStop(0.5, 'rgba(158,229,255,.8)');
  bg.addColorStop(1, 'rgba(78,197,255,.12)');
  ctx.beginPath();
  ctx.strokeStyle = bg;
  ctx.lineWidth = Math.max(1.6, 0.0022 * pxPerM);
  ctx.moveTo(pL.x, pL.y);
  ctx.lineTo(pR.x, pR.y);
  ctx.stroke();
  ctx.restore();

  // sensor heads
  for (const p of [pL, pR]) {
    ctx.beginPath();
    ctx.fillStyle = 'rgba(78,197,255,.30)';
    ctx.strokeStyle = 'rgba(78,197,255,.9)';
    ctx.lineWidth = 1.2;
    ctx.arc(p.x, p.y, 4, 0, 6.2832);
    ctx.fill();
    ctx.stroke();
  }
}

// -------------------------------------------------------- shared handle --

function drawHandle(ctx, p) {
  ctx.beginPath();
  ctx.fillStyle = 'rgba(78,197,255,.30)';
  ctx.strokeStyle = 'rgba(78,197,255,.85)';
  ctx.lineWidth = 1.3;
  ctx.arc(p.x, p.y, 6, 0, 6.2832);
  ctx.fill();
  ctx.stroke();
}
