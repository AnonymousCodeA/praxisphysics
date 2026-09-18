// Pure canvas draw functions for the circuit bench — one function per
// component symbol, all working in already-projected canvas pixels, shared
// verbatim between the real board and its ghost preview (same idea as
// lib/pendulum/scene.js: one drawScene, every caller supplies its own view).

const LABEL_FONT = '10.5px "IBM Plex Mono", monospace';
const TRACE = '#4EC5FF';
const CHALK = '#E6EDF3';
const MUTED = '#7A8B9C';
const DANGER = '#FF6B6B';
const GRID_DOT = 'rgba(78,197,255,.35)';

// A meter's reading is the experiment's output, not a component label — it
// gets its own much larger, bolder, brighter treatment (see drawReading)
// than the small muted LABEL_FONT used for "10kΩ"-style component values.
const READING_FONT_SIZE = 16;
const READING_FONT = `700 ${READING_FONT_SIZE}px "IBM Plex Mono", monospace`;
const READING_COLOR = '#8FE0FF'; // brighter than --trace, reserved for live readings
const READING_PLATE = 'rgba(6,10,15,0.94)'; // near-opaque so a wire underneath never fights it
const READING_PLATE_BORDER = 'rgba(78,197,255,.35)';
const READING_PAD_X = 7;
const READING_PAD_Y = 5;
const READING_PLATE_HALF_H = READING_FONT_SIZE / 2 + READING_PAD_Y;
const READING_GAP = 8; // desired clear px between the meter symbol's edge and the plate's near edge
const FLOATING_TEXT = '---'; // shown instead of a number when a meter's nodes have no real path to a source

function edgeFrame(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const length = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / length, y: dy / length };
  const perp = { x: -dir.y, y: dir.x };
  return {
    dir,
    perp,
    length,
    at(f, offset = 0) {
      const bx = p1.x + dir.x * f * length;
      const by = p1.y + dir.y * f * length;
      return { x: bx + perp.x * offset, y: by + perp.y * offset };
    },
  };
}

function line(ctx, a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function label(ctx, p, text, color) {
  ctx.font = LABEL_FONT;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, p.x, p.y - 6);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A live meter reading: large, bold, high-contrast text on its own opaque
// plate, centered at `p`. The plate is what keeps it legible over a wire
// (or another component) that happens to cross underneath — everything
// else on this board is thin strokes, so a solid rect reliably wins.
// OL (out of range) gets the danger color — it's not a value, it's a "pick
// a different range" signal and should read as one at a glance. The
// floating-node dash gets the muted label color instead: it isn't an error
// to fix by switching range, just "nothing to measure here."
function drawReading(ctx, p, text) {
  ctx.font = READING_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + READING_PAD_X * 2;
  const h = READING_FONT_SIZE + READING_PAD_Y * 2;
  ctx.fillStyle = READING_PLATE;
  roundRectPath(ctx, p.x - w / 2, p.y - h / 2, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = READING_PLATE_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = text === 'OL' ? DANGER : text === FLOATING_TEXT ? MUTED : READING_COLOR;
  ctx.fillText(text, p.x, p.y + 0.5);
}

export function drawGrid(ctx, view) {
  const { originX, originY, cellPx, rows, cols } = view;
  ctx.fillStyle = GRID_DOT;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = originX + c * cellPx;
      const y = originY + r * cellPx;
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWireSymbol(ctx, p1, p2, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  line(ctx, p1, p2);
}

function drawBatterySymbol(ctx, p1, p2, color, text, reversed) {
  const f = edgeFrame(p1, p2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  line(ctx, p1, f.at(0.42));
  line(ctx, f.at(0.58), p2);
  // Long thin plate (+) toward p2, short thick plate (-) toward p1 by
  // default — orientation comes from the edge, never a flip gesture, so a
  // negative-valued instance (e.g. the ±9V bipolar supply's "-9V" part —
  // see data/circuitsNonlinearInventory.js) swaps which end gets which
  // plate instead, to keep the drawn symbol true to its actual polarity.
  const thinFrac = reversed ? 0.54 : 0.46;
  const thickFrac = reversed ? 0.46 : 0.54;
  line(ctx, f.at(thinFrac, -10), f.at(thinFrac, 10));
  ctx.lineWidth = 4;
  line(ctx, f.at(thickFrac, -6), f.at(thickFrac, 6));
  ctx.lineWidth = 2;
  label(ctx, f.at(0.5), text, color === DANGER ? color : CHALK);
}

function drawResistorSymbol(ctx, p1, p2, color, text) {
  const f = edgeFrame(p1, p2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  line(ctx, p1, f.at(0.3));
  line(ctx, f.at(0.7), p2);
  const zig = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];
  const amp = [0, 9, -9, 9, -9, 9, -9, 9, 0];
  ctx.beginPath();
  zig.forEach((fr, i) => {
    const p = f.at(fr, amp[i]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  label(ctx, f.at(0.5), text, color === DANGER ? color : CHALK);
}

function drawThermistorSymbol(ctx, p1, p2, color, text) {
  const f = edgeFrame(p1, p2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  line(ctx, p1, f.at(0.3));
  line(ctx, f.at(0.7), p2);
  const zig = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];
  const amp = [0, 9, -9, 9, -9, 9, -9, 9, 0];
  ctx.beginPath();
  zig.forEach((fr, i) => {
    const p = f.at(fr, amp[i]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  // A diagonal bar through the zigzag is the standard "this resistor
  // depends on something external" marking (same idea as a photoresistor's
  // arrows) — what visually distinguishes it from a plain resistor.
  line(ctx, f.at(0.26, -14), f.at(0.74, 14));
  label(ctx, f.at(0.5), text, color === DANGER ? color : CHALK);
}

// A row of humps (quadratic bumps toward one side of the edge) is the
// standard coil symbol — distinct from the resistor's zigzag, which
// alternates sides.
function drawInductorSymbol(ctx, p1, p2, color, text) {
  const f = edgeFrame(p1, p2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const start = 0.26;
  const end = 0.74;
  const bumps = 4;
  line(ctx, p1, f.at(start));
  line(ctx, f.at(end), p2);
  ctx.beginPath();
  for (let i = 0; i < bumps; i++) {
    const a = f.at(start + ((end - start) * i) / bumps);
    const b = f.at(start + ((end - start) * (i + 1)) / bumps);
    const mid = f.at(start + ((end - start) * (i + 0.5)) / bumps, -11);
    if (i === 0) ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mid.x, mid.y, b.x, b.y);
  }
  ctx.stroke();
  label(ctx, f.at(0.5), text, color === DANGER ? color : CHALK);
}

function drawCapacitorSymbol(ctx, p1, p2, color, text) {
  const f = edgeFrame(p1, p2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  line(ctx, p1, f.at(0.46));
  line(ctx, f.at(0.54), p2);
  line(ctx, f.at(0.46, -11), f.at(0.46, 11));
  line(ctx, f.at(0.54, -11), f.at(0.54, 11));
  label(ctx, f.at(0.5), text, color === DANGER ? color : CHALK);
}

function drawSwitchSymbol(ctx, p1, p2, color, closed, text) {
  const f = edgeFrame(p1, p2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  line(ctx, p1, f.at(0.34));
  line(ctx, f.at(0.66), p2);
  ctx.beginPath();
  ctx.arc(f.at(0.34).x, f.at(0.34).y, 2.5, 0, Math.PI * 2);
  ctx.arc(f.at(0.66).x, f.at(0.66).y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (closed) {
    line(ctx, f.at(0.34), f.at(0.66));
  } else {
    line(ctx, f.at(0.34), f.at(0.62, -14));
  }
  label(ctx, f.at(0.5), text || (closed ? 'CLOSED' : 'OPEN'), color === DANGER ? color : MUTED);
}

function drawMeterSymbol(ctx, p1, p2, color, reading, rangeId, floating) {
  const f = edgeFrame(p1, p2);
  const r = 13;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  line(ctx, p1, f.at(0.5, -r));
  line(ctx, f.at(0.5, r), p2);
  // A voltmeter taps two points without joining them — the circle sits off
  // to the side of the straight edge line, wired in by its own two stubs,
  // so it never itself provides a conduction path (see model.mjs's meter
  // stamp: infinite impedance, purely a read).
  ctx.beginPath();
  ctx.arc(f.at(0.5).x, f.at(0.5).y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = color === DANGER ? color : TRACE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('V', f.at(0.5).x, f.at(0.5).y + 1);
  if (floating) {
    drawReading(ctx, f.at(0.5, -(r + READING_GAP + READING_PLATE_HALF_H)), FLOATING_TEXT);
  } else if (Number.isFinite(reading)) {
    drawReading(ctx, f.at(0.5, -(r + READING_GAP + READING_PLATE_HALF_H)), formatVoltageReading(reading, rangeId));
  }
}

// Ranged, fixed-decimal display — the way a real (non-auto-ranging) meter
// works: the student picks a range, the reading is always shown in that
// range's own unit at that range's own resolution, and anything beyond the
// range's max reads OL rather than a number. This doubles as the noise
// floor: a value that rounds to zero steps of the range's own resolution —
// which the solver's GMIN leak (~1e-13 A for a node at a few volts; see
// GMIN in model.mjs) always does, since every range here resolves no finer
// than 1e-4 (V) / 1e-7 (A) — displays as a clean zero, not a tiny decimal.
//
// `resolutionBase`/`maxBase` are in the reading's own base unit (V or A);
// `unitMult` converts base -> the range's displayed unit.
export const VOLT_RANGES = {
  mV: { label: 'mV', suffix: 'mV', unitMult: 1e3, resolutionBase: 1e-4, maxBase: 2 },
  V: { label: 'V', suffix: 'V', unitMult: 1, resolutionBase: 1e-2, maxBase: 20 },
};
export const VOLT_RANGE_ORDER = ['mV', 'V'];
export const DEFAULT_VOLT_RANGE = 'mV';

export const AMP_RANGES = {
  'µA': { label: 'µA', suffix: 'µA', unitMult: 1e6, resolutionBase: 1e-7, maxBase: 2e-3 },
  mA: { label: 'mA', suffix: 'mA', unitMult: 1e3, resolutionBase: 1e-5, maxBase: 2e-2 },
};
export const AMP_RANGE_ORDER = ['µA', 'mA'];
export const DEFAULT_AMP_RANGE = 'µA';

function formatForRange(value, range) {
  if (Math.abs(value) > range.maxBase) return 'OL';
  let roundedBase = Math.round(value / range.resolutionBase) * range.resolutionBase;
  if (Object.is(roundedBase, -0)) roundedBase = 0;
  const displayed = roundedBase * range.unitMult;
  const resDisplay = range.resolutionBase * range.unitMult;
  const decimals = resDisplay > 0 && resDisplay < 1 ? Math.max(0, -Math.floor(Math.log10(resDisplay))) : 0;
  return `${displayed.toFixed(decimals)} ${range.suffix}`;
}

export function formatVoltageReading(v, rangeId) {
  return formatForRange(v, VOLT_RANGES[rangeId] || VOLT_RANGES[DEFAULT_VOLT_RANGE]);
}

export function formatCurrentReading(i, rangeId) {
  return formatForRange(i, AMP_RANGES[rangeId] || AMP_RANGES[DEFAULT_AMP_RANGE]);
}

// An ammeter goes IN SERIES — current actually flows through it — so unlike
// the voltmeter's off-to-the-side tap, its circle sits ON the edge itself,
// with the two leads running straight into it.
function drawAmmeterSymbol(ctx, p1, p2, color, reading, rangeId, floating) {
  const f = edgeFrame(p1, p2);
  const r = 13;
  const gapFrac = Math.min(0.4, r / f.length);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  line(ctx, p1, f.at(0.5 - gapFrac));
  line(ctx, f.at(0.5 + gapFrac), p2);
  ctx.beginPath();
  ctx.arc(f.at(0.5).x, f.at(0.5).y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = color === DANGER ? color : TRACE;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', f.at(0.5).x, f.at(0.5).y + 1);
  if (floating) {
    drawReading(ctx, f.at(0.5, -(r + READING_GAP + READING_PLATE_HALF_H)), FLOATING_TEXT);
  } else if (Number.isFinite(reading)) {
    drawReading(ctx, f.at(0.5, -(r + READING_GAP + READING_PLATE_HALF_H)), formatCurrentReading(reading, rangeId));
  }
}

// component: { type, value, label, closed, range }. `range` selects a
// voltmeter/ammeter's display range (see VOLT_RANGES/AMP_RANGES) and is
// ignored by every other type. `reading` is the live numeric value (volts
// or amps) for a voltmeter/ammeter, ignored when `floating` is true (nodes
// with no real path to a source — see floatingNodes in model.mjs — get a
// dash instead of whatever numerically-arbitrary value the solver's GMIN
// regularization happened to assign them). color/alpha let the ghost
// preview reuse every symbol drawn here with reduced opacity, and red when
// the edge it's hovering is already occupied.
export function drawComponent(ctx, p1, p2, component, { color = TRACE, alpha = 1, reading, floating = false } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  switch (component.type) {
    case 'wire':
      drawWireSymbol(ctx, p1, p2, color);
      break;
    case 'battery':
      drawBatterySymbol(ctx, p1, p2, color, component.label, component.value < 0);
      break;
    case 'resistor':
      drawResistorSymbol(ctx, p1, p2, color, component.label);
      break;
    case 'thermistor':
      drawThermistorSymbol(ctx, p1, p2, color, component.label);
      break;
    case 'capacitor':
      drawCapacitorSymbol(ctx, p1, p2, color, component.label);
      break;
    case 'inductor':
      drawInductorSymbol(ctx, p1, p2, color, component.label);
      break;
    case 'switch':
      drawSwitchSymbol(ctx, p1, p2, color, !!component.closed, component.label);
      break;
    case 'voltmeter':
      drawMeterSymbol(ctx, p1, p2, color, reading, component.range, floating);
      break;
    case 'ammeter':
      drawAmmeterSymbol(ctx, p1, p2, color, reading, component.range, floating);
      break;
    default:
      drawWireSymbol(ctx, p1, p2, color);
  }
  ctx.restore();
}

export { TRACE, CHALK, MUTED, DANGER };
