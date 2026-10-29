'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { LabelText, foldLabel, hasMarkup, sciParts } from '@/lib/experiment/tableText';

// Characters a physics table header or reading needs that a phone keyboard
// buries (or lacks). Purely an input convenience: each just types its
// character into the focused cell/header, which stays free text. This base
// is on every table; `symbols` (from the experiment's data file) adds that
// experiment's own letters after it.
const BASE_SYMBOLS = ['Δ', 'θ', 'φ', 'λ', 'ω', 'Ω', 'µ', 'α', 'β', 'γ', '±', '°', '²', '³', '⁰', '¹', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '₀', '₁', '₂'];

// An input with an optional rendered `view` laid over it while it isn't
// focused — the header's maths, a cell's ×10ⁿ. Display only: the input
// still holds the raw text, and focusing it shows that text for editing.
// Always the same wrapper, view or not, so the input never remounts (and
// loses focus) when typing makes a view appear.
function Field({ view, className = '', ...props }) {
  return (
    <span className="field">
      <input className={view ? `${className} has-view` : className} {...props} />
      {view && (
        <span className="field-view" aria-hidden="true">
          {view}
        </span>
      )}
    </span>
  );
}

function cellView(raw) {
  const sci = sciParts(raw);
  if (!sci) return null;
  return (
    <>
      {sci.mantissa}×10<sup>{sci.exp}</sup>
    </>
  );
}

// Deliberately structure-free: no computed columns, no built-in T² or
// averaging. Cells are free text — students decide what's worth tabulating.
// A header's raw source is what's stored and edited; it's shown rendered
// (lib/experiment/tableText.js) when not focused. A cell that is wholly a
// number with an exponent shows as ×10ⁿ the same way, display only.
// Table state itself lives in lib/experiment/useDataTable.js, owned by
// ExperimentWorkspace and shared with Plot — this component only
// renders/edits it. CSS classes keep the "pendulum-" prefix: they're shared
// presentational styles, not experiment-specific, and renaming them is a
// separate cosmetic change from generalizing the component itself.
export default function DataTable({
  table,
  addColumn,
  deleteColumn,
  renameColumn,
  addRow,
  deleteRow,
  setCell,
  onTableChange,
  symbols = [],
}) {
  // The last cell/header input focused, remembered past blur so a keyboard
  // user who tabs onto a symbol button still inserts into it. An input keeps
  // its own selectionStart/End after losing focus, so nothing else needs
  // saving.
  const targetRef = useRef(null);
  const caretRef = useRef(null); // { el, pos } to restore once the new value renders
  const [hasTarget, setHasTarget] = useState(false);

  // The inputs are controlled, so the caret can only be put back after the
  // edited value has come round through the parent's table state.
  useLayoutEffect(() => {
    const c = caretRef.current;
    if (!c) return;
    caretRef.current = null;
    if (!c.el.isConnected) return;
    c.el.focus();
    c.el.setSelectionRange(c.pos, c.pos);
  });

  if (!table) return null;

  const symbolRow = [...new Set([...BASE_SYMBOLS, ...symbols])];

  function onFocusIn(e) {
    if (e.target.tagName !== 'INPUT') return;
    targetRef.current = e.target;
    setHasTarget(true);
  }

  // Replaces the selection (or inserts at the caret) through the same
  // setCell/renameColumn a keystroke goes through — identified by the
  // input's data attributes, so there's one edit path, not a DOM shortcut.
  function insert(sym) {
    const el = targetRef.current;
    if (!el || !el.isConnected) return;
    const v = el.value;
    const start = el.selectionStart ?? v.length;
    const end = el.selectionEnd ?? start;
    const next = v.slice(0, start) + sym + v.slice(end);
    const { row, col } = el.dataset;
    if (row) setCell(row, col, next);
    else renameColumn(col, next);
    caretRef.current = { el, pos: start + sym.length };
  }

  return (
    <div className="pendulum-table-box">
      <div className="table-symbols" role="toolbar" aria-label="Insert symbol">
        {symbolRow.map((sym) => (
          <button
            key={sym}
            type="button"
            disabled={!hasTarget}
            // Keep focus (and on a phone, the keyboard) in the cell: without
            // this, pressing the button blurs the input before the click.
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(sym)}
            aria-label={`Insert ${sym}`}
          >
            {sym}
          </button>
        ))}
      </div>
      <div className="pendulum-table-wrap" onFocus={onFocusIn}>
        <table className="pendulum-table">
          <thead>
            <tr>
              <th className="rowhead" aria-hidden="true" />
              {table.columns.map((c) => (
                <th key={c.id}>
                  <div className="col-head-in">
                    <Field
                      className="col-label"
                      view={hasMarkup(c.label) && <LabelText src={c.label} />}
                      data-col={c.id}
                      value={c.label}
                      onChange={(e) => {
                    renameColumn(c.id, e.target.value);
                    if (onTableChange) onTableChange({ type: 'renameColumn', columnId: c.id, label: e.target.value });
                  }}
                      aria-label="Column name"
                    />
                    <button
                      type="button"
                      className="cell-del"
                      onClick={() => deleteColumn(c.id)}
                      aria-label={`Delete column ${foldLabel(c.label)}`}
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
              <th className="add-col-head">
                <button type="button" onClick={() => { addColumn(); if (onTableChange) onTableChange({ type: 'addColumn' }); }}>
                  + COL
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={r.id}>
                <td className="rowhead">
                  <div className="rowhead-in">
                    <span>{i + 1}</span>
                    <button
                      type="button"
                      className="cell-del"
                      onClick={() => {
                      deleteRow(r.id);
                      if (onTableChange) onTableChange({ type: 'deleteRow', rowId: r.id });
                    }}
                      aria-label={`Delete row ${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                </td>
                {table.columns.map((c) => (
                  <td key={c.id}>
                    <Field
                      view={cellView(r.cells[c.id] ?? '')}
                      data-row={r.id}
                      data-col={c.id}
                      value={r.cells[c.id] ?? ''}
                      onChange={(e) => setCell(r.id, c.id, e.target.value)}
                      aria-label={`Row ${i + 1}, ${foldLabel(c.label)}`}
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="pendulum-add-row" onClick={() => { addRow(); if (onTableChange) onTableChange({ type: 'addRow' }); }}>
        + ROW
      </button>
    </div>
  );
}
