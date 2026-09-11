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
    label(ctx, f.at(0.5, -r), formatVolts(reading), TRACE);
  }
}

export function formatVolts(v) {
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e5)) return `${v.toExponential(2)} V`;
  return `${v.toFixed(abs < 1 ? 3 : 2)} V`;
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
    default:
      drawWireSymbol(ctx, p1, p2, color);
  }
  ctx.restore();
}

export { TRACE, CHALK, MUTED, DANGER };
