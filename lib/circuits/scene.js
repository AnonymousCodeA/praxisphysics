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
  ctx.fillStyle = READING_COLOR;
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

function drawBatterySymbol(ctx, p1, p2, color, text) {
  const f = edgeFrame(p1, p2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  line(ctx, p1, f.at(0.42));
  line(ctx, f.at(0.58), p2);
  // Long thin plate (+) toward p2, short thick plate (-) toward p1 — a
  // fixed convention since orientation comes from the edge, not a flip.
  line(ctx, f.at(0.46, -10), f.at(0.46, 10));
  ctx.lineWidth = 4;
  line(ctx, f.at(0.54, -6), f.at(0.54, 6));
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

function drawMeterSymbol(ctx, p1, p2, color, reading) {
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
  if (Number.isFinite(reading)) {
    drawReading(ctx, f.at(0.5, -(r + READING_GAP + READING_PLATE_HALF_H)), formatVolts(reading));
  }
}

// Fixed-significant-figure, auto-ranging unit prefix — the way an actual
// instrument displays a reading, never scientific notation. Tiers are
// ordered smallest-limit first; `limit` is the raw (unscaled) magnitude
// below which that tier applies. See formatWithPrefix for the rounding
// rule that keeps a value from ever needing a 4th digit (e.g. 999.6 uA
// becomes 1.000 mA instead of overflowing its tier).
const SIG_FIGS = 3;
const VOLT_TIERS = [
  { limit: 1, mult: 1e3, suffix: 'mV' },
  { limit: Infinity, mult: 1, suffix: 'V' },
];
const AMP_TIERS = [
  { limit: 1e-3, mult: 1e6, suffix: 'µA' },
  { limit: 1, mult: 1e3, suffix: 'mA' },
  { limit: Infinity, mult: 1, suffix: 'A' },
];

function roundToSigFigs(x, sig) {
  if (x === 0) return { value: 0, decimals: sig - 1 };
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const intDigits = Math.floor(Math.log10(ax)) + 1; // <=0 for ax < 1
  const decimals = Math.max(0, sig - intDigits);
  const factor = 10 ** decimals;
  let value = (sign * Math.round(ax * factor)) / factor;
  if (Object.is(value, -0)) value = 0;
  return { value, decimals };
}

function formatWithPrefix(value, tiers, sig) {
  let idx = tiers.findIndex((t) => Math.abs(value) < t.limit);
  if (idx === -1) idx = tiers.length - 1;
  let { value: rounded, decimals } = roundToSigFigs(value * tiers[idx].mult, sig);
  // Rounding can push the scaled magnitude up into the next tier's range
  // (999.6 -> 1000) — re-round against that tier rather than ever showing
  // a 4th digit or drifting off the fixed significant-figure count.
  if (Math.abs(rounded) >= 1000 && idx < tiers.length - 1) {
    idx += 1;
    ({ value: rounded, decimals } = roundToSigFigs(value * tiers[idx].mult, sig));
  }
  return `${rounded.toFixed(decimals)} ${tiers[idx].suffix}`;
}

export function formatVolts(v) {
  return formatWithPrefix(v, VOLT_TIERS, SIG_FIGS);
}

// An ammeter goes IN SERIES — current actually flows through it — so unlike
// the voltmeter's off-to-the-side tap, its circle sits ON the edge itself,
// with the two leads running straight into it.
function drawAmmeterSymbol(ctx, p1, p2, color, reading) {
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
  if (Number.isFinite(reading)) {
    drawReading(ctx, f.at(0.5, -(r + READING_GAP + READING_PLATE_HALF_H)), formatAmps(reading));
  }
}

export function formatAmps(i) {
  return formatWithPrefix(i, AMP_TIERS, SIG_FIGS);
}

// component: { type, value, label, closed }. reading: live voltmeter value
// (only used for type 'voltmeter'). color/alpha let the ghost preview reuse
// every symbol drawn here with reduced opacity, and red when the edge it's
// hovering is already occupied.
export function drawComponent(ctx, p1, p2, component, { color = TRACE, alpha = 1, reading } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  switch (component.type) {
    case 'wire':
      drawWireSymbol(ctx, p1, p2, color);
      break;
    case 'battery':
      drawBatterySymbol(ctx, p1, p2, color, component.label);
      break;
    case 'resistor':
      drawResistorSymbol(ctx, p1, p2, color, component.label);
      break;
    case 'capacitor':
      drawCapacitorSymbol(ctx, p1, p2, color, component.label);
      break;
    case 'switch':
      drawSwitchSymbol(ctx, p1, p2, color, !!component.closed, component.label);
      break;
    case 'voltmeter':
      drawMeterSymbol(ctx, p1, p2, color, reading);
      break;
    case 'ammeter':
      drawAmmeterSymbol(ctx, p1, p2, color, reading);
      break;
    default:
      drawWireSymbol(ctx, p1, p2, color);
  }
  ctx.restore();
}

export { TRACE, CHALK, MUTED, DANGER };
