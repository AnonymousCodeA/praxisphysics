'use client';

import { useCallback, useRef, useState } from 'react';
import ExperimentGuide from './ExperimentGuide';
import DataTable from './DataTable';
import Plot from './Plot';
import { useDataTable } from '@/lib/experiment/useDataTable';
import { usePlotConfig } from '@/lib/experiment/usePlotConfig';

const TABS = [
  { key: 'problem', label: 'PROBLEM' },
  { key: 'table', label: 'TABLE' },
  { key: 'lab', label: 'LAB' },
];

const SPLIT_MIN = 28;
const SPLIT_MAX = 72;
const SPLIT_DEFAULT = 44;
const SPLIT_STEP = 2;

// Mobile-first shell, generalized from the pendulum lab so any experiment
// with a problem statement, a student-defined table/plot, and a bench can
// reuse it: three panes (problem, table, lab) that are tab-switched on
// narrow screens, and become a two-column split with a draggable divider on
// wide ones (see the min-width breakpoint in globals.css). Left column
// groups the part switch, problem, and table; right column holds `Bench`
// (shared, doesn't change with part) and the plot.
//
// `experimentId` and each part's `key` pick the localStorage keys
// (praxis:<experimentId>-<partId>-table / -plot, see lib/experiment/), so
// every experiment and part keeps independent, persistent data.
//
// Table/plot state lives here, one instance per part rather than one that's
// re-keyed, so switching parts is just picking which already-loaded
// instance to hand down — each part's table and plot stay independently
// live (and independently in localStorage) the whole time, not just while
// that part is on screen. This only supports exactly two parts (matching
// every experiment built so far, and the two fixed hook-call sites below) —
// generalizing further would need the per-part state lifted into a small
// subcomponent instead of two named hook calls.
//
// `parts` is a two-element array of { key, label, tag, title, body,
// formulae?, hints?, credit? } — see data/pendulumGuide.js for the shape.
// `Bench` gets the active part's `dataTable` (the same useDataTable() return
// value handed to the DataTable/Plot below) as its one prop — a plain prop
// update, not a remount trigger, since `Bench`'s own identity never changes
// here; most consumers (e.g. PendulumLab) simply don't use it. CircuitBench
// uses it to mirror the table into its oscilloscope panel — see that file.
export default function ExperimentWorkspace({ experimentId, parts, Bench }) {
  const [partA, partB] = parts;
  const [activeTab, setActiveTab] = useState('problem');
  const [part, setPart] = useState(partA.key);
  const [splitPct, setSplitPct] = useState(SPLIT_DEFAULT);
  const wrapRef = useRef(null);
  const draggingRef = useRef(false);
  const tableA = useDataTable(experimentId, partA.key);
  const tableB = useDataTable(experimentId, partB.key);
  const plotA = usePlotConfig(experimentId, partA.key);
  const plotB = usePlotConfig(experimentId, partB.key);
  const isPartA = part === partA.key;
  const dataTable = isPartA ? tableA : tableB;
  const plotConfig = isPartA ? plotA : plotB;
  const activeDef = isPartA ? partA : partB;

  const updateSplitFromClientX = useCallback((clientX) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct)));
  }, []);

  const onDividerDown = useCallback((e) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onDividerMove = useCallback(
    (e) => {
      if (!draggingRef.current) return;
      updateSplitFromClientX(e.clientX);
    },
    [updateSplitFromClientX]
  );

  const onDividerUp = useCallback((e) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const onDividerKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      setSplitPct((p) => Math.max(SPLIT_MIN, p - SPLIT_STEP));
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      setSplitPct((p) => Math.min(SPLIT_MAX, p + SPLIT_STEP));
      e.preventDefault();
    }
  }, []);

  return (
    <div
      className="pendulum-workspace"
      ref={wrapRef}
      data-active-tab={activeTab}
      style={{ '--pendulum-split': `${splitPct}%` }}
    >
      <div className="pendulum-tabs" role="tablist" aria-label="Lab sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            className={activeTab === t.key ? 'active' : ''}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pendulum-col-left">
        <div className="pendulum-part-switch" role="tablist" aria-label="Lab part">
          {parts.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={part === p.key}
              className={part === p.key ? 'active' : ''}
              onClick={() => setPart(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="pendulum-pane" data-pane="problem">
          <ExperimentGuide def={activeDef} />
        </div>
        <div className="pendulum-pane" data-pane="table">
          <DataTable {...dataTable} />
        </div>
      </div>

      <div
        className="pendulum-divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize problem/table and lab panels"
        aria-valuemin={SPLIT_MIN}
        aria-valuemax={SPLIT_MAX}
        aria-valuenow={Math.round(splitPct)}
        tabIndex={0}
        onPointerDown={onDividerDown}
        onPointerMove={onDividerMove}
        onPointerUp={onDividerUp}
        onPointerCancel={onDividerUp}
        onKeyDown={onDividerKeyDown}
      />

      <div className="pendulum-col-right">
        <div className="pendulum-pane" data-pane="lab">
          <Bench dataTable={dataTable} />
          {dataTable.table && <Plot part={part} table={dataTable.table} {...plotConfig} />}
        </div>
      </div>
    </div>
  );
}
