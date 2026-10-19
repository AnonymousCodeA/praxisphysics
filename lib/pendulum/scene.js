// Pure canvas drawing for the pendulum bench: pivot, string, bob, and the
// physical instruments (ruler, angle plate, photogate). World space is
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

// The angle plate's graduated arc must cross the string above the bob at
// every length: the shortest pendulum (0.2 m string) puts the bob's top at
// 0.2 m from the pivot, so the scale sits just inside that.
export const ANGLE_PLATE_RADIUS_M = 0.18; // 180mm, ~3.1mm per degree

export const PHOTOGATE_STAND_HEIGHT_M = 0.08; // 80mm posts
export const PHOTOGATE_BEAM_HALF_WIDTH_M = 0.045;

const SCALE_FONT = '"IBM Plex Mono", monospace';

export function drawScene(ctx, view, state) {
  const { originX, originY, pxPerM, width, height, showGuides } = view;
  ctx.clearRect(0, 0, width, height);
  const toPx = (mx, my) => ({ x: originX + mx * pxPerM, y: originY + my * pxPerM });

  if (showGuides) drawCapGuides(ctx, toPx, state);
  // The plate is mounted behind the pendulum, so it's drawn first and the
  // string swings in front of it.
  if (state.visible.anglePlate) drawAnglePlate(ctx, toPx, pxPerM, state.anglePlateOffsetRad);
  drawPendulum(ctx, toPx, pxPerM, state);
  if (state.visible.anglePlate) drawStringOverPlate(ctx, toPx, state);
  if (state.visible.photogate) drawPhotogate(ctx, toPx, pxPerM, state.photogate);
  if (state.visible.ruler) drawRuler(ctx, toPx, pxPerM, state.ruler, state.rulerPrintMarginM);
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

// ---------------------------------------------------------- angle plate --

// Part of the apparatus, not a tool the student places: a semicircular
// scale fixed behind the pendulum, centred on the pivot (world origin),
// covering the half-disc below it. It reads the displacement angle
// directly — 0° straight down, rising to 90° at the horizontal on either
// side — so there's no "subtract from 90°" step. A printed value d (signed,
// + to the right) sits at true angle d + offsetRad from the vertical: the
// session systematic is where the scale was printed relative to true
// vertical, visible as the hanging string not quite lining up with 0°.
const ANGLE_PLATE_ARC_SAMPLES = 90;

function plateAngleToWorld(r, phi) {
  return { x: r * Math.sin(phi), y: r * Math.cos(phi) };
}

// Is this world point on the plate (for press-and-hold hit-testing)?
export function isOnAnglePlate(wx, wy, padM) {
  return wy >= -padM && wx * wx + wy * wy <= (ANGLE_PLATE_RADIUS_M + padM) ** 2;
}

function anglePlatePath(ctx, toPx) {
  const R = ANGLE_PLATE_RADIUS_M;
  ctx.beginPath();
  for (let i = 0; i <= ANGLE_PLATE_ARC_SAMPLES; i++) {
    const phi = Math.PI / 2 - (i / ANGLE_PLATE_ARC_SAMPLES) * Math.PI; // +90° (right) round to -90° (left)
    const w = plateAngleToWorld(R, phi);
    const p = toPx(w.x, w.y);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath(); // the flat top edge, through the pivot
}

function drawAnglePlate(ctx, toPx, pxPerM, offsetRad) {
  const R = ANGLE_PLATE_RADIUS_M;
  const P = (r, phi) => {
    const w = plateAngleToWorld(r, phi);
    return toPx(w.x, w.y);
  };

  // solid, opaque body — same printed-scale look as the ruler
  anglePlatePath(ctx, toPx);
  ctx.fillStyle = '#DCE4EC';
  ctx.fill();
  ctx.strokeStyle = 'rgba(78,197,255,.7)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Graduations along the outer edge, growing inward: 1° short, 5° medium,
  // 10° long + numeral. True scale, like the ruler — sub-pixel apart at
  // bench zoom and read through the press-and-hold lens.
  const tickWidthPx = Math.max(0.05, 0.00025 * pxPerM);
  const fontPx = Math.max(0.3, 0.0034 * pxPerM);
  ctx.font = `${fontPx}px ${SCALE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let deg = -90; deg <= 90; deg++) {
    const phi = (deg * Math.PI) / 180 + offsetRad;
    const isTen = deg % 10 === 0;
    const isFive = !isTen && deg % 5 === 0;
    const tickLen = isTen ? 0.012 : isFive ? 0.008 : 0.004;
    const p0 = P(R, phi);
    const p1 = P(R - tickLen, phi);
    ctx.beginPath();
    ctx.strokeStyle = isTen ? 'rgba(6,10,15,.9)' : 'rgba(6,10,15,.55)';
    ctx.lineWidth = tickWidthPx;
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    if (isTen) {
      // Numerals upright as seen from the pivot: each one's top points at
      // the centre, so the scale reads round the arc without turning the page.
      const lp = P(R - tickLen - 0.005, phi);
      ctx.save();
      ctx.translate(lp.x, lp.y);
      ctx.rotate(-phi);
      ctx.fillStyle = 'rgba(6,10,15,.9)';
      ctx.fillText(String(Math.abs(deg)), 0, 0);
      ctx.restore();
    }
  }
}

// The string is light on the dark bench but would vanish against the light
// plate, so the stretch in front of the plate is redrawn as dark thread —
// how a real string reads against a printed scale. Clipped to the plate, so
// the string off the plate (and the bob) is untouched.
function drawStringOverPlate(ctx, toPx, state) {
  const pivot = toPx(0, 0);
  const bob = toPx(Math.sin(state.theta) * state.length, Math.cos(state.theta) * state.length);
  ctx.save();
  anglePlatePath(ctx, toPx);
  ctx.clip();
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(6,10,15,.85)';
  ctx.lineWidth = 1.4;
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(bob.x, bob.y);
  ctx.stroke();
  ctx.restore();
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
