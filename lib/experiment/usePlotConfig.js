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

  return { config, setCol, setErrConst, setBoundText, addLine, updateCurrentPoint, discardCurrent, saveLine, editLine, deleteLine, reset };
}
