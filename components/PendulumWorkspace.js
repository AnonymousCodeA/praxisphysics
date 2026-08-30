'use client';

import { useCallback, useRef, useState } from 'react';
import PendulumGuide from './PendulumGuide';
import PendulumDataTable from './PendulumDataTable';
import PendulumLab from './PendulumLab';

const TABS = [
  { key: 'problem', label: 'PROBLEM' },
  { key: 'table', label: 'TABLE' },
  { key: 'lab', label: 'LAB' },
];

const SPLIT_MIN = 28;
const SPLIT_MAX = 72;
const SPLIT_DEFAULT = 44;
const SPLIT_STEP = 2;

// Mobile-first shell: three panes (problem, table, lab) that are tab-switched
// on narrow screens, and become a two-column split with a draggable divider
// on wide ones (see the min-width breakpoint in globals.css). Left column
// groups problem+table, right column holds the bench — same three panes
// either way, just regrouped by CSS, never duplicated markup. The right
// column also reserves a slot for the plot that joins this page later.
export default function PendulumWorkspace() {
  const [activeTab, setActiveTab] = useState('problem');
  const [splitPct, setSplitPct] = useState(SPLIT_DEFAULT);
  const wrapRef = useRef(null);
  const draggingRef = useRef(false);

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
      <div className="pendulum-tabs" role="tablist" aria-label="Pendulum lab sections">
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
        <div className="pendulum-pane" data-pane="problem">
          <PendulumGuide />
        </div>
        <div className="pendulum-pane" data-pane="table">
          <PendulumDataTable />
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
          <PendulumLab />
          <div className="pendulum-plot-slot">
            <span className="tag">PLOT — SOON</span>
            <p className="hint">A live g-fit plot joins this panel once there&rsquo;s table data to chart.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
