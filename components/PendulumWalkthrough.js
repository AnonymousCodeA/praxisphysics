'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import AnchoredPopover from './AnchoredPopover';
import GuideQ from './GuideQ';
import { isDefaultColumnLabel } from '@/lib/experiment/useDataTable';
import { foldLabel } from '@/lib/experiment/tableText';
import { setBenchHintShowing } from '@/lib/experiment/benchHintState';

// GUIDED mode for the pendulum bench: coach marks, one step at a time,
// placed by the shared AnchoredPopover. SELF — the bench as it always was
// — is the default; GUIDED is only ever entered from a visible
// "Take the walkthrough" offer, never a dialog on load. There are two
// offers: over the canvas, and (narrow screens only, where the page opens
// on PROBLEM) at the top of the problem pane — WalkthroughProblemOffer.
//
// The mode and step persist per experiment at praxis:<experimentId>-mode
// ({ mode, step }), so a reload mid-walkthrough resumes it. Leaving for
// SELF keeps the step (taking the walkthrough again resumes there);
// finishing resets it to the start. Nothing here touches the table, the
// plot or a committed answer.

const POLL_MS = 150; // how often a step's condition is checked while GUIDED
const DEFAULT = { mode: 'self', step: 1 };

// One store per storage key, module-level like lib/experiment/
// benchHintState.js: the bench's offer and the problem pane's sit in
// unrelated branches of the workspace and must agree on the mode.
const stores = new Map();
function storeFor(key, stepCount) {
  let s = stores.get(key);
  if (!s) {
    let state = DEFAULT;
    try {
      const v = JSON.parse(localStorage.getItem(key));
      if ((v?.mode === 'self' || v?.mode === 'guided') && Number.isInteger(v.step) && v.step >= 1 && v.step <= stepCount) {
        state = { mode: v.mode, step: v.step };
      }
    } catch {}
    s = { state, listeners: new Set() };
    stores.set(key, s);
  }
  return s;
}

export function useWalkthroughMode(experimentId, stepCount) {
  const key = `praxis:${experimentId}-mode`;
  const subscribe = useCallback(
    (listener) => {
      const s = storeFor(key, stepCount);
      s.listeners.add(listener);
      return () => s.listeners.delete(listener);
    },
    [key, stepCount]
  );
  // The server render (and hydration) is always SELF; a stored GUIDED
  // takes over straight after.
  const state = useSyncExternalStore(subscribe, () => storeFor(key, stepCount).state, () => DEFAULT);

  const save = useCallback(
    (next) => {
      const s = storeFor(key, stepCount);
      s.state = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      s.listeners.forEach((l) => l());
    },
    [key, stepCount]
  );

  return {
    ...state,
    start: () => save({ mode: 'guided', step: state.step }),
    exit: () => save({ mode: 'self', step: state.step }),
    finish: () => save({ mode: 'self', step: 1 }),
    goTo: (step) => save({ mode: 'guided', step }),
  };
}

// Each `advance` name from data/pendulumWalkthrough.js, as a test of the
// bench as it is now against the bench as it was when the step began.
const CONDITIONS = {
  scaleOn: (now) => now.scaleOn,
  lengthChanged: (now, entry) => now.length !== entry.length,
  lensUsed: (now) => now.lensUsed,
  bobDisplaced: (now) => now.mode === 'held' && now.theta !== 0,
  swinging: (now) => now.mode === 'swinging',
  stopwatchOn: (now) => now.stopwatchOn,
  // A stop during this step, with something on the display.
  stopwatchTimed: (now, entry) => now.stopwatchStops > entry.stopwatchStops && now.stopwatchLastS > 0,
  fiveRows: (now) => filledRows(now.table) >= 5,
  columnRenamed: (now) => !!now.table?.columns.some((c) => c.label.trim() !== '' && !isDefaultColumnLabel(c.label)),
  sixLengths: (now) => lengthColumns(now.table).some((c) => distinctValues(now.table, c.id) >= 6),
};

// Rows with anything typed in them.
function filledRows(table) {
  return table ? table.rows.filter((r) => Object.values(r.cells).some((v) => String(v).trim() !== '')).length : 0;
}

// The column(s) the student has headed as a length: "L / m", "L_0 (cm)",
// "Length"… — an L not followed by another letter, or the word itself.
function lengthColumns(table) {
  return table ? table.columns.filter((c) => /length|^\s*l(?![a-z])/i.test(foldLabel(c.label))) : [];
}

// How many different values a column holds, compared as numbers where they
// parse (so 0.30 and 0.3 are one length).
function distinctValues(table, colId) {
  const seen = new Set();
  for (const r of table.rows) {
    const raw = String(r.cells[colId] ?? '').trim();
    if (!raw) continue;
    const n = parseFloat(raw);
    seen.add(Number.isFinite(n) ? `n:${n}` : `s:${raw}`);
  }
  return seen.size;
}

// One step's coach mark. A condition advances the walkthrough when it
// becomes true during the step. If it was already true when the step began
// (the scale was on before step 2, or the student came BACK to a step
// they'd done), it can't become true, so the mark offers NEXT instead of
// either skipping the step or waiting for nothing. The last step always
// offers NEXT as well: its condition guesses at the student's own column
// names, so it's a convenience, never the only way to finish.
function CoachMark({ index, steps, def, target, readBench, showPane, goTo, onExit, onFinish }) {
  const n = steps.length;
  const cond = CONDITIONS[def.advance];
  const [doneAtEntry, setDoneAtEntry] = useState(null);

  useEffect(() => {
    showPane(def.pane);
    const entry = readBench();
    if (!cond) return undefined;
    const already = cond(entry, entry);
    setDoneAtEntry(already);
    if (already) return undefined;
    const id = setInterval(() => {
      if (!cond(readBench(), entry)) return;
      if (index === n - 1) onFinish(); // the last step ends the walkthrough
      else goTo(index + 2);
    }, POLL_MS);
    return () => clearInterval(id);
    // Once per step: this component is keyed by step, so each mount is a
    // fresh entry snapshot.
  }, []);

  // Escape is SWITCH TO SELF: the mark stays open while the student works
  // on the bench, so it can't close on a press elsewhere, but a keyboard
  // user needs a way out. An open instrument note takes Escape for itself.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || document.querySelector('.instrument-popover')) return;
      onExit();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onExit]);

  const last = index === n - 1;
  const canNext = !cond || doneAtEntry || last;
  return (
    <AnchoredPopover
      open
      box={target.box}
      anchor={target.anchor}
      label={`Walkthrough, step ${index + 1} of ${n}`}
      className="coach-mark"
    >
      <p className="coach-count">
        STEP {index + 1} OF {n}
      </p>
      <p className="coach-text">{def.text}</p>
      {def.q && <GuideQ q={def.q}>{def.a}</GuideQ>}
      <div className="coach-actions">
        <button type="button" onClick={() => goTo(index)} disabled={index === 0}>
          BACK
        </button>
        {canNext && (
          <button type="button" className="coach-next" onClick={last ? onFinish : () => goTo(index + 2)}>
            NEXT
          </button>
        )}
        <button type="button" className="coach-exit" onClick={onExit}>
          SWITCH TO SELF
        </button>
      </div>
    </AnchoredPopover>
  );
}

// The offer at the top of the problem pane, for narrow screens (CSS hides
// it from 900px, where the bench's own offer is on screen beside the
// problem). A phone opens on PROBLEM, so without this a first-time student
// would never see the offer over the canvas in SIMULATION. It keeps its
// one line in GUIDED too, as the way back to the current step's tab, so
// the pane's height doesn't change with the mode. Rendered by
// ExperimentWorkspace as `ProblemTools`.
// Only on the walkthrough's own part (`walkPart`): Part B has none.
export function WalkthroughProblemOffer({ experimentId, showPane, part, steps, walkPart }) {
  const walk = useWalkthroughMode(experimentId, steps.length);
  const guided = walk.mode === 'guided';
  if (part !== walkPart) return null;
  const go = () => {
    if (!guided) walk.start();
    showPane?.(steps[walk.step - 1].pane);
  };
  return (
    <button type="button" className="walkthrough-offer-problem" onClick={go}>
      {guided ? `Back to the walkthrough (step ${walk.step} of ${steps.length})` : 'New to this bench? Take the walkthrough'}
    </button>
  );
}

// `walk` is useWalkthroughMode's return value; `targets` maps each step's
// `target` name to { box, anchor } (refs or functions — see
// AnchoredPopover); `readBench()` returns { scaleOn, length, theta, mode,
// lensUsed, stopwatchOn, stopwatchStops, stopwatchLastS, table } from the
// bench's existing state and the part's table. `active` is false on any
// part but the walkthrough's own: the mode stays GUIDED, but no mark shows
// until the student is back on Part A.
//
// While a mark is up, instrument notes hold their first-use open, exactly
// as they do for the bench's how-to strip (lib/experiment/benchHintState.js)
// — the stopwatch's note would otherwise open beside the same panel step 8
// points at. It opens once the walkthrough ends, if still unseen.
export default function PendulumWalkthrough({ walk, steps, targets, readBench, showPane, active = true }) {
  const readRef = useRef(readBench);
  readRef.current = readBench;
  const read = useCallback(() => readRef.current(), []);
  const showing = active && walk.mode === 'guided';
  useEffect(() => {
    setBenchHintShowing('walkthrough', showing);
    return () => setBenchHintShowing('walkthrough', false);
  }, [showing]);
  if (!showing) return null;
  const index = walk.step - 1;
  const def = steps[index];
  return (
    <CoachMark
      key={walk.step}
      index={index}
      steps={steps}
      def={def}
      target={targets[def.target]}
      readBench={read}
      showPane={showPane || (() => {})}
      goTo={walk.goTo}
      onExit={walk.exit}
      onFinish={walk.finish}
    />
  );
}
