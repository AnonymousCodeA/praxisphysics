// Pure canvas drawing for the pendulum bench: pivot, string, bob, and the
// physical instruments (vertical scale, angle plate, photogate). World space is
// meters, origin at the pivot, +x right, +y down.
//
// drawScene() is called identically by PendulumCanvas for the full bench
// view AND, at a higher `view.pxPerM`, for the press-and-hold lens drawn
// over it (see PendulumCanvas.js) — same function, different scale. The
// lens is never a separate diagram: whatever exists on the bench is what
// it shows, just bigger. See docs/pendulum-plan.md and CLAUDE.md.

// The vertical scale is part of the apparatus, like the angle plate: fixed
// beside the hanging string with its physical top level with the pivot, so
// its zero is level with the pivot and it reads the distance down from
// there. Its graduated edge faces the string, just clear of the 20mm bob at
// rest, so the bob's centre (or the string's end) can be sighted straight
// across to it.
export const SCALE_EDGE_X_M = 0.025;
export const SCALE_WIDTH_M = 0.02;
export const SCALE_LENGTH_M = 0.56; // past the bob's lowest point at full length (0.52 m)
const SCALE_PRINTED_MM = 550; // printed 0..55 cm

// The angle plate's graduated arc must cross the string above the bob at
// every length: the shortest pendulum (0.2 m string) puts the bob's top at
// 0.2 m from the pivot, so the scale sits just inside that.
export const ANGLE_PLATE_RADIUS_M = 0.18; // 180mm, ~3.1mm per degree

export const PHOTOGATE_STAND_HEIGHT_M = 0.08; // 80mm posts
export const PHOTOGATE_BEAM_HALF_WIDTH_M = 0.045;
export const PHOTOGATE_MIN_R_M = 0.06;
export const PHOTOGATE_MAX_R_M = 0.5;

// Keep the gate in the lower half-disc and off the pivot: through the
// origin the radial/tangent basis flips, which is the "isn't rotating
// properly" failure. The beam stays tangent to the pendulum's arc.
export function clampPhotogatePos(xM, yM) {
  let x = xM;
  let y = Math.max(0.02, yM);
  const r = Math.hypot(x, y);
  if (r < 1e-9) return { xM: 0, yM: PHOTOGATE_MIN_R_M };
  if (r < PHOTOGATE_MIN_R_M || r > PHOTOGATE_MAX_R_M) {
    const t = (r < PHOTOGATE_MIN_R_M ? PHOTOGATE_MIN_R_M : PHOTOGATE_MAX_R_M) / r;
    x *= t;
    y *= t;
  }
  if (y < 0.02) y = 0.02;
  return { xM: x, yM: y };
}

const SCALE_FONT = '"IBM Plex Mono", monospace';

export function drawScene(ctx, view, state) {
  const { originX, originY, pxPerM, width, height, showGuides } = view;
  ctx.clearRect(0, 0, width, height);
  const toPx = (mx, my) => ({ x: originX + mx * pxPerM, y: originY + my * pxPerM });

  if (showGuides) drawCapGuides(ctx, toPx, state);
  // The plate and scale are mounted behind the pendulum, so they're drawn
  // first and the string swings in front of them. The scale sits in front
  // of the plate: it's the narrower of the two and crosses the plate's
  // right side, so the plate is still fully readable on its left.
  if (state.visible.anglePlate) drawAnglePlate(ctx, toPx, pxPerM, state.anglePlateOffsetRad);
  if (state.visible.scale) drawVerticalScale(ctx, toPx, pxPerM);
  drawPendulum(ctx, toPx, pxPerM, state);
  drawStringOverBackdrops(ctx, toPx, state);
  if (state.visible.photogate) drawPhotogate(ctx, toPx, pxPerM, state.photogate);
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

// The string's visible run: from the pivot to where it meets the bob's
// surface. The bob's *centre* sits at `length` — the pendulum length L —
// so the string itself is one bob-radius shorter, and the line stops at
// the bob's edge instead of running through it.
function stringGeometry(state, toPx) {
  const dx = Math.sin(state.theta);
  const dy = Math.cos(state.theta);
  const run = Math.max(0, state.length - state.bobRadius);
  return {
    pivot: toPx(0, 0),
    end: toPx(dx * run, dy * run),
    bob: toPx(dx * state.length, dy * state.length),
  };
}

function drawPendulum(ctx, toPx, pxPerM, state) {
  const { pivot, end, bob } = stringGeometry(state, toPx);
  const rPx = Math.max(6, state.bobRadius * pxPerM);

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(230,237,243,.7)';
  ctx.lineWidth = 1.4;
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(end.x, end.y);
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

// ------------------------------------------------------- vertical scale --

// Is this world point on the scale (for press-and-hold hit-testing)?
export function isOnScale(wx, wy, padM) {
  return (
    wx >= SCALE_EDGE_X_M - padM &&
    wx <= SCALE_EDGE_X_M + SCALE_WIDTH_M + padM &&
    wy >= -padM &&
    wy <= SCALE_LENGTH_M + padM
  );
}

function addScalePath(ctx, toPx) {
  const a = toPx(SCALE_EDGE_X_M, 0);
  const b = toPx(SCALE_EDGE_X_M + SCALE_WIDTH_M, SCALE_LENGTH_M);
  ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
}

// The printed "0" is level with the pivot — the scale is calibrated — and
// the numerals count the distance down from it, so the scale reads the
// same length the length gauge does. Whether a length is read to the
// string's end or to the bob's centre is left to the student: the scale
// just measures distance down.
function drawVerticalScale(ctx, toPx, pxPerM) {
  const W = SCALE_WIDTH_M;
  const edge = SCALE_EDGE_X_M; // graduated edge, facing the string; ticks grow away from it (+x)

  // solid, opaque body — reads as a physical object, not an outline
  ctx.beginPath();
  addScalePath(ctx, toPx);
  ctx.fillStyle = '#DCE4EC';
  ctx.fill();
  ctx.strokeStyle = 'rgba(78,197,255,.7)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // 1mm ticks short, 5mm medium, 10mm long + cm numeral. True scale (same
  // pxPerM as everything else on the bench), so at bench zoom this is
  // deliberately near-illegible — the press-and-hold lens makes it legible.
  const tickWidthPx = Math.max(0.05, 0.00025 * pxPerM);
  const fontPx = Math.max(0.3, 0.0034 * pxPerM);
  ctx.font = `${fontPx}px ${SCALE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelX = edge + W * 0.76;

  for (let mm = 0; mm <= SCALE_PRINTED_MM; mm++) {
    const y = mm / 1000;
    const isCm = mm % 10 === 0;
    const isHalfCm = !isCm && mm % 5 === 0;
    const tickLen = isCm ? W * 0.62 : isHalfCm ? W * 0.4 : W * 0.2;
    const p0 = toPx(edge, y);
    const p1 = toPx(edge + tickLen, y);
    ctx.beginPath();
    ctx.strokeStyle = isCm ? 'rgba(6,10,15,.9)' : 'rgba(6,10,15,.55)';
    ctx.lineWidth = tickWidthPx;
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    ctx.fillStyle = 'rgba(6,10,15,.9)';
    if (isCm) {
      const lp = toPx(labelX, y);
      ctx.fillText(String(mm / 10), lp.x, lp.y);
    }
    // The unit, printed in the half-centimetre gap after every tenth
    // numeral rather than once at the top, so it's in view wherever along
    // the scale the lens happens to be.
    if (mm % 100 === 5) {
      const up = toPx(labelX, y);
      ctx.fillText('cm', up.x, up.y);
    }
  }

  // At bench zoom the millimetre type is deliberately sub-pixel (that's
  // what the lens is for). A single unit stamp on the plate still has to
  // be readable without it, or the scale looks unmarked.
  if (pxPerM < 2000) {
    const stamp = toPx(edge + W * 0.55, 0.012);
    ctx.font = `${Math.max(10, 0.016 * pxPerM)}px ${SCALE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(6,10,15,.78)';
    ctx.fillText('cm', stamp.x, stamp.y);
  }
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

function addAnglePlatePath(ctx, toPx) {
  const R = ANGLE_PLATE_RADIUS_M;
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

  // solid, opaque body — same printed-scale look as the vertical scale
  ctx.beginPath();
  addAnglePlatePath(ctx, toPx);
  ctx.fillStyle = '#DCE4EC';
  ctx.fill();
  ctx.strokeStyle = 'rgba(78,197,255,.7)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Graduations along the outer edge, growing inward: 1° short, 5° medium,
  // 10° long + numeral. True scale, like the vertical scale — sub-pixel apart at
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
// plate and scale, so the stretch in front of either is redrawn as dark
// thread — how a real string reads against a printed scale. Clipped to each
// in turn (an opaque colour, so where they overlap it isn't drawn darker),
// leaving the string off them, and the bob, untouched.
const STRING_ON_SCALE = '#262C31';

function drawStringOverBackdrops(ctx, toPx, state) {
  const { pivot, end } = stringGeometry(state, toPx);
  const shapes = [];
  if (state.visible.anglePlate) shapes.push(addAnglePlatePath);
  if (state.visible.scale) shapes.push(addScalePath);
  for (const addPath of shapes) {
    ctx.save();
    ctx.beginPath();
    addPath(ctx, toPx);
    ctx.clip();
    ctx.beginPath();
    ctx.strokeStyle = STRING_ON_SCALE;
    ctx.lineWidth = 1.4;
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }
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

  // The feet: a base bar between the two posts, so the gate reads as an
  // object standing on the bench rather than two floating rods.
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(122,139,156,.55)';
  ctx.lineWidth = Math.max(2, 0.005 * pxPerM);
  ctx.moveTo(bL.x, bL.y);
  ctx.lineTo(bR.x, bR.y);
  ctx.stroke();

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
