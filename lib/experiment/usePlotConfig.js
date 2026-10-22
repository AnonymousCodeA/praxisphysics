'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Keyed per experiment and part so each keeps its own plot independently.
const storageKeyFor = (experimentId, partId) => `praxis:${experimentId}-${partId}-plot`;

// Column roles the plot can draw from. Kept as a list (not two hardcoded
// x/y fields) so the selection state and UI don't care how many there are.
// An `error` role is optional and takes either a column (an uncertainty that
// varies per point) or ERR_CONSTANT plus a typed value in `errConst` (one
// instrument uncertainty applied to every point). Either way it's the ± half-
// width the student decided on, drawn as given — the plot never estimates,
// propagates, or derives an uncertainty itself; that's the exercise.
export const PLOT_ROLES = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'xErr', label: 'X ERROR', error: true },
  { key: 'yErr', label: 'Y ERROR', error: true },
];

// Selected in place of a column id for an error role. Can't collide with a
// real column id, which useDataTable always prefixes with "col".
export const ERR_CONSTANT = '__const__';

// A small fixed palette for saved lines, distinct from --trace (reserved for
// points/axes) — see the CLAUDE.md exception this deliberately relies on.
export const LINE_COLORS = ['#FFA64D', '#4DFF88', '#FF4DC4', '#974DFF'];
export const MAX_LINES = LINE_COLORS.length;

let uid = 0;
function nextId(prefix) {
  uid += 1;
  return `${prefix}${Date.now().toString(36)}${uid}`;
}

function defaultConfig() {
  return {
    cols: Object.fromEntries(PLOT_ROLES.map((r) => [r.key, ''])),
    errConst: Object.fromEntries(PLOT_ROLES.filter((r) => r.error).map((r) => [r.key, ''])), // typed text, parsed at draw time
    bounds: { xMin: '', xMax: '', yMin: '', yMax: '' },
    current: null, // { p1:{x,y}, p2:{x,y}, color } — the one draggable, unsaved line
    saved: [], // { id, p1, p2, color }[]
  };
}

// A config saved before a role or field existed (e.g. before error bars) is
// filled in from the defaults rather than discarded, so a student's existing
// column choices, bounds and lines survive the upgrade.
function withDefaults(stored) {
  const d = defaultConfig();
  return { ...d, ...stored, cols: { ...d.cols, ...stored.cols }, errConst: { ...d.errConst, ...stored.errConst } };
}

// Parses the student's typed axis bounds; null unless all four are real
// numbers with min < max — no auto-scaling or "nice" bound suggestions.
export function parseBounds(b) {
  const xMin = parseFloat(b.xMin);
  const xMax = parseFloat(b.xMax);
  const yMin = parseFloat(b.yMin);
  const yMax = parseFloat(b.yMax);
  if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) return null;
  if (xMin >= xMax || yMin >= yMax) return null;
  return { xMin, xMax, yMin, yMax };
}

// Gradient/intercept from the two dragged endpoints — never a fit to the data.
export function lineStats(line) {
  const dx = line.p2.x - line.p1.x;
  if (dx === 0) return { m: null, c: null };
  const m = (line.p2.y - line.p1.y) / dx;
  const c = line.p1.y - m * line.p1.x;
  return { m, c };
}

// A "nice" step size for an axis: 1, 2, 2.5, 5 or 10 times a power of ten,
// close to range/5 — about as many gridlines as the plot draws ticks.
function niceStep(range) {
  const raw = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function frame(values, zero) {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    const d = Math.abs(lo) * 0.1 || 1;
    lo -= d;
    hi += d;
  }
  const step = niceStep(hi - lo);
  let min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  // A relationship that passes through the origin should be shown passing
  // through it: the intercept is one of the things a graph is for, and it
  // is invisible if the axis starts just below the first point.
  if (zero && lo > 0) min = 0;
  return { min, max };
}

// Axis bounds that frame the plotted points, rounded outward to tidy
// numbers. This chooses the *window* only — it fits nothing, and it does
// not touch the student's line, so the gradient still has to be read off
// the line they drew. Returns null when the chosen columns hold no
// plottable pair.
//
// `zero` pulls the lower bound down to the origin, for the relationships
// whose line is supposed to go through it.
export function autoRangeFromPoints(xs, ys, { zero = false } = {}) {
  if (!xs.length || xs.length !== ys.length) return null;
  const xf = frame(xs, zero);
  const yf = frame(ys, zero);
  return { xMin: xf.min, xMax: xf.max, yMin: yf.min, yMax: yf.max };
}

export function autoRange(table, cfg, opts) {
  if (!table || !cfg) return null;
  const { x: xCol, y: yCol } = cfg.cols;
  if (!xCol || !yCol) return null;
  const xs = [];
  const ys = [];
  for (const row of table.rows) {
    const x = parseFloat(row.cells[xCol]);
    const y = parseFloat(row.cells[yCol]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      xs.push(x);
      ys.push(y);
    }
  }
  return autoRangeFromPoints(xs, ys, opts);
}

// `experimentId`/`partId` pick the storage key and are read once at call
// time — see the matching note on useDataTable for why this hook doesn't
// need to react to either changing underneath a single instance.
export function usePlotConfig(experimentId, partId) {
  const [config, setConfig] = useState(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let initial = null;
    try {
      const stored = window.localStorage.getItem(storageKeyFor(experimentId, partId));
      if (stored) initial = JSON.parse(stored);
    } catch {
      initial = null;
    }
    setConfig(initial ? withDefaults(initial) : defaultConfig());
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current || !config) return;
    try {
      window.localStorage.setItem(storageKeyFor(experimentId, partId), JSON.stringify(config));
    } catch {
      // storage unavailable (private mode etc) — reading still works this session
    }
  }, [config]);

  const setCol = useCallback((role, colId) => {
    setConfig((p) => p && { ...p, cols: { ...p.cols, [role]: colId } });
  }, []);

  // Several roles at once — an experiment's quick-plot helper picks the
  // axes for the student in a single step.
  const setCols = useCallback((map) => {
    setConfig((p) => p && { ...p, cols: { ...p.cols, ...map } });
  }, []);

  // The axis window, as numbers. The bounds are held as text so the
  // student can type a half-finished value into a box without it being
  // rewritten under them; this is the programmatic way in.
  const setBounds = useCallback((b) => {
    setConfig((p) =>
      p && {
        ...p,
        bounds: {
          xMin: String(b.xMin),
          xMax: String(b.xMax),
          yMin: String(b.yMin),
          yMax: String(b.yMax),
        },
      }
    );
  }, []);

  const setErrConst = useCallback((role, text) => {
    setConfig((p) => p && { ...p, errConst: { ...p.errConst, [role]: text } });
  }, []);

  const setBoundText = useCallback((key, text) => {
    setConfig((p) => p && { ...p, bounds: { ...p.bounds, [key]: text } });
  }, []);

  const addLine = useCallback(() => {
    setConfig((p) => {
      if (!p || p.current || p.saved.length >= MAX_LINES) return p;
      const b = parseBounds(p.bounds);
      if (!b) return p;
      const used = new Set(p.saved.map((l) => l.color));
      const color = LINE_COLORS.find((c) => !used.has(c)) || LINE_COLORS[0];
      const p1 = { x: b.xMin + (b.xMax - b.xMin) * 0.3, y: b.yMin + (b.yMax - b.yMin) * 0.3 };
      const p2 = { x: b.xMin + (b.xMax - b.xMin) * 0.7, y: b.yMin + (b.yMax - b.yMin) * 0.7 };
      return { ...p, current: { p1, p2, color } };
    });
  }, []);

  const updateCurrentPoint = useCallback((which, x, y) => {
    setConfig((p) => p && p.current && { ...p, current: { ...p.current, [which]: { x, y } } });
  }, []);

  const discardCurrent = useCallback(() => {
    setConfig((p) => p && { ...p, current: null });
  }, []);

  const saveLine = useCallback(() => {
    setConfig((p) => {
      if (!p || !p.current || p.saved.length >= MAX_LINES) return p;
      return { ...p, saved: [...p.saved, { id: nextId('line'), ...p.current }], current: null };
    });
  }, []);

  const editLine = useCallback((id) => {
    setConfig((p) => {
      if (!p || p.current) return p;
      const line = p.saved.find((l) => l.id === id);
      if (!line) return p;
      return { ...p, saved: p.saved.filter((l) => l.id !== id), current: { p1: line.p1, p2: line.p2, color: line.color } };
    });
  }, []);

  const deleteLine = useCallback((id) => {
    setConfig((p) => p && { ...p, saved: p.saved.filter((l) => l.id !== id) });
  }, []);

  // Back to a fresh default config — a part's "start over", not an edit.
  const reset = useCallback(() => setConfig(defaultConfig()), []);

  return {
    config,
    setCol,
    setCols,
    setErrConst,
    setBoundText,
    setBounds,
    addLine,
    updateCurrentPoint,
    discardCurrent,
    saveLine,
    editLine,
    deleteLine,
    reset,
  };
}
