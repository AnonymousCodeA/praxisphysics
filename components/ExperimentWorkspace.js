'use client';

import { useCallback, useRef, useState } from 'react';
import ExperimentGuide from './ExperimentGuide';
import DataTable from './DataTable';
import Plot from './Plot';
import { useDataTable } from '@/lib/experiment/useDataTable';
import { usePlotConfig } from '@/lib/experiment/usePlotConfig';
import { useCommittedAnswer } from '@/lib/experiment/useCommittedAnswer';

const TABS = [
  { key: 'problem', label: 'PROBLEM' },
  { key: 'sim', label: 'SIMULATION' },
  { key: 'data', label: 'DATA' },
];

const SPLIT_MIN = 28;
const SPLIT_MAX = 72;
const SPLIT_DEFAULT = 44;
const SPLIT_STEP = 2;

// Mobile-first shell, generalized from the pendulum lab so any experiment
// with a problem statement, a student-defined table/plot, and a bench can
// reuse it. It is organised as three sections, in the order a student
// actually works through them:
//
//   PROBLEM    — what to do: the statement, the task, the answer box
//   SIMULATION — the bench: the apparatus, and what each instrument is
//   DATA       — the numbers: the table, and the graph drawn from it
//
// The three are tabs on a narrow screen and a two-column split on a wide
// one: the problem statement takes the left column (prose, narrow is fine)
// while the bench and the data take the right one — the bench needs width
// to be usable and the graph needs width to be readable, and the two sit
// one above the other so a student can read the problem and work the
// apparatus without scrolling between columns.
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
// formulae?, task?, answer?, hints?, credit?, notes?, simulation? } — see
// data/pendulumGuide.js for the shape. `notes.table` / `notes.plot` (the
// bench explaining its own controls) render directly above the table and
// the plot, in the data section, not with the problem. `simulation` is
// free-form content for the simulation section — the apparatus notes that
// tell a student what the bench in front of them actually is.
//
// A part with `startOver` gets a confirmed "start this part over" under its
// answer box. It clears that part's table, plot and committed answer
// together — never the answer alone, which would let a student re-guess
// against the same data — and never the other part's. Each part's reset
// count keys its guide/DataTable/Plot so their ephemeral UI state (a plot
// readout, half-typed answer fields) goes too. Those keys carry a per-element
// suffix (`:guide`, `:table`, …) because several of them are siblings in the
// same container, and sibling keys must be unique even across element types.
// `Bench` gets the active part's `dataTable` (the same useDataTable() return
// value handed to the DataTable/Plot below) as its one prop — a plain prop
// update, not a remount trigger, since `Bench`'s own identity never changes
// here; most consumers (e.g. PendulumLab) simply don't use it. CircuitBench
// uses it to mirror the table into its oscilloscope panel — see that file.
// `DataTools`, if given, is rendered in the data section above the table
// and receives the same table/plot state, without the shell knowing what it
// does (the pendulum passes the generic QuickEntry). `symbols` is the
// experiment's own letters for the table's symbol bar (from its data file),
// added after DataTable's shared base.
export default function ExperimentWorkspace({ experimentId, parts, symbols, Bench, DataTools }) {
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
  const answerA = useCommittedAnswer(experimentId, partA.key);
  const answerB = useCommittedAnswer(experimentId, partB.key);
  const [resets, setResets] = useState({}); // part key → times started over
  const isPartA = part === partA.key;
  const dataTable = isPartA ? tableA : tableB;
  const plotConfig = isPartA ? plotA : plotB;
  const answer = isPartA ? answerA : answerB;
  const activeDef = isPartA ? partA : partB;
  const gen = `${part}:${resets[part] || 0}`;

  const startOver = useCallback(() => {
    dataTable.reset();
    plotConfig.reset();
    answer.clear();
    setResets((r) => ({ ...r, [part]: (r[part] || 0) + 1 }));
  }, [dataTable, plotConfig, answer, part]);

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
          <ExperimentGuide key={`${gen}:guide`} def={activeDef} answer={answer} onStartOver={startOver} />
        </div>
      </div>

      <div
        className="pendulum-divider"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize problem and lab panels"
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
        <div className="pendulum-pane" data-pane="sim">
          {activeDef.simulation && (
            <div className="pendulum-sim-notes">{activeDef.simulation}</div>
          )}
          <Bench dataTable={dataTable} />
        </div>

        <div className="pendulum-pane" data-pane="data">
          {activeDef.notes?.table && <p className="bench-note">{activeDef.notes.table}</p>}
          {DataTools && (
            <DataTools
              dataTable={dataTable}
              plotConfig={plotConfig}
              part={part}
              def={activeDef}
              key={`${gen}:tools`}
            />
          )}
          <DataTable key={`${gen}:table`} {...dataTable} symbols={symbols} />
          {dataTable.table && activeDef.notes?.plot && (
            <p className="bench-note bench-note-plot">{activeDef.notes.plot}</p>
          )}
          {dataTable.table && <Plot key={`${gen}:plot`} part={part} table={dataTable.table} {...plotConfig} />}
        </div>
      </div>
    </div>
  );
}
