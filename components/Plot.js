'use client';

import { useEffect, useRef, useState } from 'react';
import {
  parseBounds,
  lineStats,
  autoRange,
  PLOT_ROLES,
  ERR_CONSTANT,
  MAX_LINES,
} from '@/lib/experiment/usePlotConfig';

const PAD_LEFT = 60;
const PAD_RIGHT = 16;
const PAD_TOP = 14;
const PAD_BOTTOM = 48;
const TICKS = 5;
const HANDLE_R = 7;
const HANDLE_GRAB_PAD = 12;
const CLICK_MOVE_CANCEL_PX = 6;
const POINT_R = 3.5;
const POINT_COLOR = '#4EC5FF';
const ERR_CAP = 4; // half-width of an error bar's end cap, px
const AXIS_FONT = '"IBM Plex Mono", monospace';

function formatNum(v) {
  if (!Number.isFinite(v)) return '';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 0.001 || abs >= 100000)) return v.toExponential(2);
  let s = v.toPrecision(4);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

// An error role's ± half-width for one row, read exactly as entered: that
// row's cell for a column, or the one typed constant for every row. Anything
// that isn't a positive number (blank, text, negative) means no bar on that
// side for that point — never a substituted or corrected value, since
// deciding the uncertainty is the student's job, not the plot's.
function errorFor(cfg, role, row) {
  const sel = cfg.cols[role];
  if (!sel) return 0;
  const v = parseFloat(sel === ERR_CONSTANT ? cfg.errConst[role] : row.cells[sel]);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function getPoints(table, cfg) {
  const { x: xCol, y: yCol } = cfg.cols;
  if (!xCol || !yCol) return [];
  const pts = [];
  for (const row of table.rows) {
    const x = parseFloat(row.cells[xCol]);
    const y = parseFloat(row.cells[yCol]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      pts.push({ x, y, xe: errorFor(cfg, 'xErr', row), ye: errorFor(cfg, 'yErr', row) });
    }
  }
  return pts;
}

// Standard bars with end caps, one path for every point. Called inside the
// plot-rect clip: a bar running past an axis is cut at it (its cap missing
// is the honest way to show it extends beyond), rather than spilling over
// the tick labels.
function drawErrorBars(ctx, toPx, pts) {
  ctx.strokeStyle = POINT_COLOR;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  for (const pt of pts) {
    if (pt.xe) {
      const a = toPx(pt.x - pt.xe, pt.y);
      const b = toPx(pt.x + pt.xe, pt.y);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.moveTo(a.x, a.y - ERR_CAP);
      ctx.lineTo(a.x, a.y + ERR_CAP);
      ctx.moveTo(b.x, b.y - ERR_CAP);
      ctx.lineTo(b.x, b.y + ERR_CAP);
    }
    if (pt.ye) {
      const a = toPx(pt.x, pt.y - pt.ye);
      const b = toPx(pt.x, pt.y + pt.ye);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.moveTo(a.x - ERR_CAP, a.y);
      ctx.lineTo(a.x + ERR_CAP, a.y);
      ctx.moveTo(b.x - ERR_CAP, b.y);
      ctx.lineTo(b.x + ERR_CAP, b.y);
    }
  }
  ctx.stroke();
}

function colLabel(table, id) {
  return table.columns.find((c) => c.id === id)?.label || '';
}

// Draws the line defined by p1/p2 (data space) extended across the whole
// plot rect — the endpoints set the gradient/intercept, but the stroke spans
// the box so it reads as a candidate line through the data, not a short
// segment. Clipping to the plot rect (done by the caller) trims it cleanly.
function drawExtendedLine(ctx, toPx, rect, p1, p2, color, dashed) {
  const a = toPx(p1.x, p1.y);
  const b = toPx(p2.x, p2.y);
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const ext = (rect.w + rect.h) * 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash(dashed ? [7, 5] : []);
  ctx.beginPath();
  ctx.moveTo(a.x - dx * ext, a.y - dy * ext);
  ctx.lineTo(a.x + dx * ext, a.y + dy * ext);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Config and its mutators are owned by ExperimentWorkspace (one
// usePlotConfig instance per part) and handed down as props — same
// controlled pattern as DataTable — so switching parts swaps in a
// different part's plot without this component needing to know parts exist
// beyond resetting its own ephemeral click-readout below. CSS classes keep
// the "pendulum-"/"plot-" prefix: shared presentational styles, not
// experiment-specific — see the matching note on DataTable.
export default function Plot({
  part,
  table,
  config,
  setCol,
  setErrConst,
  setBoundText,
  setBounds,
  addLine,
  updateCurrentPoint,
  discardCurrent,
  saveLine,
  editLine,
  deleteLine,
}) {
  const canvasRef = useRef(null);
  const configRef = useRef(config);
  const tableRef = useRef(table);
  const drawRef = useRef(null);
  const [lastClick, setLastClick] = useState(null);
  const lastClickRef = useRef(lastClick);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    tableRef.current = table;
  }, [table]);
  useEffect(() => {
    lastClickRef.current = lastClick;
  }, [lastClick]);

  // The click-to-read coordinate is ephemeral UI state, not part of the
  // persisted config — clear it on a part switch so it doesn't show a stale
  // reading (or a crosshair placed by the other part's axis bounds) here.
  useEffect(() => {
    setLastClick(null);
  }, [part]);

  // Drop a selected column from the config if it no longer exists in the
  // table (renamed away is fine — only a delete needs this).
  useEffect(() => {
    if (!config) return;
    for (const role of PLOT_ROLES) {
      const id = config.cols[role.key];
      if (id && id !== ERR_CONSTANT && !table.columns.some((c) => c.id === id)) setCol(role.key, '');
    }
  }, [table.columns, config, setCol]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return undefined;
    const ctx = cvs.getContext('2d');
    let W = 0,
      H = 0,
      dpr = 1;
    let dragKey = null; // 'p1' | 'p2' | null
    let dragPreview = null; // { key, x, y } — live position while dragging, ahead of committed state
    let downPx = { x: 0, y: 0 };

    function plotRect() {
      return { x: PAD_LEFT, y: PAD_TOP, w: Math.max(0, W - PAD_LEFT - PAD_RIGHT), h: Math.max(0, H - PAD_TOP - PAD_BOTTOM) };
    }

    function toPx(b, rect, x, y) {
      return {
        x: rect.x + ((x - b.xMin) / (b.xMax - b.xMin)) * rect.w,
        y: rect.y + rect.h - ((y - b.yMin) / (b.yMax - b.yMin)) * rect.h,
      };
    }

    function toData(b, rect, px, py) {
      return {
        x: b.xMin + ((px - rect.x) / rect.w) * (b.xMax - b.xMin),
        y: b.yMin + (1 - (py - rect.y) / rect.h) * (b.yMax - b.yMin),
      };
    }

    function clampToBounds(b, x, y) {
      return { x: Math.min(b.xMax, Math.max(b.xMin, x)), y: Math.min(b.yMax, Math.max(b.yMin, y)) };
    }

    function resize() {
      const r = cvs.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = Math.round(r.width * dpr);
      cvs.height = Math.round(r.height * dpr);
      W = r.width;
      H = r.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const cfg = configRef.current;
      const tbl = tableRef.current;
      if (!cfg) return;
      const b = parseBounds(cfg.bounds);
      const rect = plotRect();

      if (!b || rect.w <= 10 || rect.h <= 10) {
        ctx.fillStyle = '#7A8B9C';
        ctx.font = `12px ${AXIS_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Set axis min and max to plot', W / 2, H / 2);
        return;
      }

      const px = (x, y) => toPx(b, rect, x, y);

      ctx.strokeStyle = 'rgba(78,197,255,.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w, rect.h);

      ctx.font = `10.5px ${AXIS_FONT}`;
      for (let i = 0; i <= TICKS; i++) {
        const xv = b.xMin + ((b.xMax - b.xMin) * i) / TICKS;
        const xp = px(xv, b.yMin).x;
        ctx.strokeStyle = 'rgba(78,197,255,.12)';
        ctx.beginPath();
        ctx.moveTo(xp, rect.y);
        ctx.lineTo(xp, rect.y + rect.h);
        ctx.stroke();
        ctx.fillStyle = '#7A8B9C';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(formatNum(xv), xp, rect.y + rect.h + 6);

        const yv = b.yMin + ((b.yMax - b.yMin) * i) / TICKS;
        const yp = px(b.xMin, yv).y;
        ctx.strokeStyle = 'rgba(78,197,255,.12)';
        ctx.beginPath();
        ctx.moveTo(rect.x, yp);
        ctx.lineTo(rect.x + rect.w, yp);
        ctx.stroke();
        ctx.fillStyle = '#7A8B9C';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatNum(yv), rect.x - 8, yp);
      }

      ctx.fillStyle = '#E6EDF3';
      ctx.font = `11px ${AXIS_FONT}`;
      const xLabel = colLabel(tbl, cfg.cols.x);
      if (xLabel) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(xLabel, rect.x + rect.w / 2, H - 8);
      }
      const yLabel = colLabel(tbl, cfg.cols.y);
      if (yLabel) {
        ctx.save();
        ctx.translate(14, rect.y + rect.h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
      }

      // Only points inside the axis bounds are drawn, and their error bars
      // with them — a bar belongs to its point, so an off-plot point doesn't
      // leave a stray bar poking in from the edge.
      const pts = getPoints(tbl, cfg).filter((pt) => pt.x >= b.xMin && pt.x <= b.xMax && pt.y >= b.yMin && pt.y <= b.yMax);

      // Lines are infinite (extended to the box edges) so they still need
      // clipping, and error bars are cut at the axes the same way; points
      // don't get clipped at all — a point exactly on the
      // axis boundary should render as a full dot, not be sliced in half by
      // the plot edge, and drawing it after the restore puts it above the
      // gridlines/axis box instead of flush with (and hard to read against) them.
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();

      // Beneath the lines, so a candidate line stays readable where it
      // crosses a bar — the bars are context for judging the line.
      drawErrorBars(ctx, px, pts);

      for (const line of cfg.saved) {
        drawExtendedLine(ctx, (x, y) => px(x, y), rect, line.p1, line.p2, line.color, false);
      }

      let cur = cfg.current;
      if (cur && dragPreview) cur = { ...cur, [dragPreview.key]: { x: dragPreview.x, y: dragPreview.y } };
      if (cur) drawExtendedLine(ctx, (x, y) => px(x, y), rect, cur.p1, cur.p2, cur.color, true);

      ctx.restore();

      ctx.fillStyle = POINT_COLOR;
      for (const pt of pts) {
        const p = px(pt.x, pt.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, POINT_R, 0, Math.PI * 2);
        ctx.fill();
      }

      const lc = lastClickRef.current;
      if (lc) {
        const p = px(lc.x, lc.y);
        ctx.strokeStyle = '#E6EDF3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x - 6, p.y);
        ctx.lineTo(p.x + 6, p.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 6);
        ctx.lineTo(p.x, p.y + 6);
        ctx.stroke();
      }

      if (cur) {
        for (const key of ['p1', 'p2']) {
          const p = px(cur[key].x, cur[key].y);
          ctx.fillStyle = cur.color;
          ctx.strokeStyle = '#060A0F';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, HANDLE_R, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    drawRef.current = draw;

    function pointerXY(e) {
      const r = cvs.getBoundingClientRect();
      return { px: e.clientX - r.left, py: e.clientY - r.top };
    }

    function hitHandle(pxv, pyv) {
      const cfg = configRef.current;
      if (!cfg || !cfg.current) return null;
      const b = parseBounds(cfg.bounds);
      if (!b) return null;
      const rect = plotRect();
      for (const key of ['p1', 'p2']) {
        const p = toPx(b, rect, cfg.current[key].x, cfg.current[key].y);
        if (Math.hypot(pxv - p.x, pyv - p.y) <= HANDLE_R + HANDLE_GRAB_PAD) return key;
      }
      return null;
    }

    function onDown(e) {
      const { px: pxv, py: pyv } = pointerXY(e);
      const hit = hitHandle(pxv, pyv);
      if (hit) {
        dragKey = hit;
        cvs.setPointerCapture(e.pointerId);
        cvs.classList.add('dragging');
      } else {
        dragKey = null;
        downPx = { x: pxv, y: pyv };
      }
    }

    function onMove(e) {
      if (!dragKey) return;
      const cfg = configRef.current;
      const b = cfg && parseBounds(cfg.bounds);
      if (!b) return;
      const rect = plotRect();
      const { px: pxv, py: pyv } = pointerXY(e);
      const raw = toData(b, rect, pxv, pyv);
      const data = clampToBounds(b, raw.x, raw.y);
      dragPreview = { key: dragKey, x: data.x, y: data.y };
      updateCurrentPoint(dragKey, data.x, data.y);
      draw();
    }

    function onUp(e) {
      if (dragKey) {
        dragKey = null;
        dragPreview = null;
        cvs.classList.remove('dragging');
        return;
      }
      const { px: pxv, py: pyv } = pointerXY(e);
      if (Math.hypot(pxv - downPx.x, pyv - downPx.y) > CLICK_MOVE_CANCEL_PX) return;
      const cfg = configRef.current;
      const b = cfg && parseBounds(cfg.bounds);
      const rect = plotRect();
      if (!b || pxv < rect.x || pxv > rect.x + rect.w || pyv < rect.y || pyv > rect.y + rect.h) return;
      setLastClick(toData(b, rect, pxv, pyv));
    }

    cvs.addEventListener('pointerdown', onDown);
    cvs.addEventListener('pointermove', onMove);
    cvs.addEventListener('pointerup', onUp);
    cvs.addEventListener('pointercancel', onUp);

    let ro = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(resize);
      ro.observe(cvs);
    } else {
      window.addEventListener('resize', resize);
    }

    resize();

    return () => {
      cvs.removeEventListener('pointerdown', onDown);
      cvs.removeEventListener('pointermove', onMove);
      cvs.removeEventListener('pointerup', onUp);
      cvs.removeEventListener('pointercancel', onUp);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
    };
    // `!!config` (not `config`) is deliberate: config starts null while it
    // loads from localStorage, so the <canvas> itself doesn't exist in the
    // DOM on the first render — this effect would bind to nothing and never
    // get another chance, since updateCurrentPoint's identity never changes.
    // The boolean flips false->true exactly once, right when the real canvas
    // node appears, without re-binding on every later config edit.
  }, [updateCurrentPoint, !!config]);

  useEffect(() => {
    drawRef.current && drawRef.current();
  }, [config, table, lastClick]);

  if (!config) return null;

  const bounds = parseBounds(config.bounds);
  const canAddLine = !config.current && config.saved.length < MAX_LINES && !!bounds;
  const auto = autoRange(table, config);

  // Frame the points: pick the window, nothing else. The line is still the
  // student's to draw and the gradient is still read off it by hand.
  const applyAutoRange = () => {
    if (auto) setBounds(auto);
  };

  const roleSelect = (r) => (
    <label key={r.key} className="plot-col-select">
      <span>{r.label}</span>
      <select value={config.cols[r.key]} onChange={(e) => setCol(r.key, e.target.value)}>
        <option value="">—</option>
        {r.error && <option value={ERR_CONSTANT}>CONSTANT</option>}
        {table.columns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="pendulum-plot">
      <div className="plot-row plot-cols">{PLOT_ROLES.filter((r) => !r.error).map(roleSelect)}</div>

      <div className="plot-row plot-cols">
        {PLOT_ROLES.filter((r) => r.error).map((r) => (
          <div key={r.key} className="plot-err">
            {roleSelect(r)}
            {config.cols[r.key] === ERR_CONSTANT && (
              <span className="plot-bound-group">
                <span className="plot-bound-axis">±</span>
                <input
                  aria-label={`${r.label} constant value`}
                  placeholder="value"
                  inputMode="decimal"
                  value={config.errConst[r.key]}
                  onChange={(e) => setErrConst(r.key, e.target.value)}
                />
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="plot-row plot-bounds">
        <div className="plot-bound-group">
          <span className="plot-bound-axis">X</span>
          <input
            aria-label="X axis minimum"
            placeholder="min"
            inputMode="decimal"
            value={config.bounds.xMin}
            onChange={(e) => setBoundText('xMin', e.target.value)}
          />
          <span className="plot-bound-sep">–</span>
          <input
            aria-label="X axis maximum"
            placeholder="max"
            inputMode="decimal"
            value={config.bounds.xMax}
            onChange={(e) => setBoundText('xMax', e.target.value)}
          />
        </div>
        <div className="plot-bound-group">
          <span className="plot-bound-axis">Y</span>
          <input
            aria-label="Y axis minimum"
            placeholder="min"
            inputMode="decimal"
            value={config.bounds.yMin}
            onChange={(e) => setBoundText('yMin', e.target.value)}
          />
          <span className="plot-bound-sep">–</span>
          <input
            aria-label="Y axis maximum"
            placeholder="max"
            inputMode="decimal"
            value={config.bounds.yMax}
            onChange={(e) => setBoundText('yMax', e.target.value)}
          />
        </div>
        <button type="button" onClick={applyAutoRange} disabled={!auto} title="Set the axis range to frame the plotted points">
          AUTO RANGE
        </button>
      </div>

      <div className="plot-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="plot-canvas"
          aria-label="Line graph of the selected table columns, with any chosen error bars. Click the plot to read a point's coordinates; drag a line's endpoints to position it."
        />
        <div className="plot-readout">
          {lastClick ? `x = ${formatNum(lastClick.x)}, y = ${formatNum(lastClick.y)}` : 'Click the plot to read a point'}
        </div>
      </div>

      <div className="plot-row plot-line-actions">
        <button type="button" onClick={addLine} disabled={!canAddLine}>
          + LINE
        </button>
        {config.current && (
          <>
            <button type="button" className="plot-btn-fill" onClick={saveLine}>
              SAVE LINE
            </button>
            <button type="button" onClick={discardCurrent}>
              DISCARD
            </button>
          </>
        )}
      </div>

      {config.saved.length > 0 && (
        <ul className="plot-lines-list">
          {config.saved.map((line) => {
            const { m, c } = lineStats(line);
            return (
              <li key={line.id}>
                <span className="plot-line-swatch" style={{ background: line.color }} aria-hidden="true" />
                <span className="plot-line-eq">
                  {m === null ? 'vertical line' : `m = ${formatNum(m)}   c = ${formatNum(c)}`}
                </span>
                <button type="button" onClick={() => editLine(line.id)} disabled={!!config.current}>
                  EDIT
                </button>
                <button type="button" onClick={() => deleteLine(line.id)}>
                  DELETE
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
