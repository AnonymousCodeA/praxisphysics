'use client';

// Quick entry: one field per column of the student's own table, labelled
// with whatever they named it, stacked so a phone can fill a row without
// scrolling the table sideways. ADD ROW appends those values as a row.
// That is its whole job — it knows nothing about any experiment: it never
// names, creates or renames a column, never calculates one, and never
// touches the plot. What to measure, what to tabulate and what to plot
// against what are the student's decisions; with no columns yet it says so
// and points at the table rather than inventing any.
//
// Rendered as ExperimentWorkspace's `DataTools`, which hands it the active
// part's dataTable (and other props it ignores). Fields are free text, like
// the table's own cells. Enter moves to the next field and adds the row
// from the last one.
import { useRef, useState } from 'react';

export default function QuickEntry({ dataTable }) {
  const [values, setValues] = useState({}); // column id → text
  const [added, setAdded] = useState(0);
  const inputs = useRef([]);
  const table = dataTable.table;

  if (!table) return null; // still loading from storage

  const columns = table.columns;
  if (columns.length === 0) {
    return (
      <div className="quick-tools">
        <h4>Quick entry</h4>
        <p className="quick-empty">
          Your table has no columns yet. Add one in the table below and a field for it will appear
          here.
        </p>
      </div>
    );
  }

  const hasAny = columns.some((c) => (values[c.id] ?? '').trim() !== '');

  const addRow = (e) => {
    e.preventDefault();
    if (!hasAny) return;
    const cells = {};
    for (const c of columns) cells[c.id] = (values[c.id] ?? '').trim();
    dataTable.appendRow(cells);
    setValues({});
    setAdded((n) => n + 1);
    inputs.current[0]?.focus();
  };

  const onKeyDown = (i) => (e) => {
    if (e.key !== 'Enter' || i === columns.length - 1) return; // the last field's Enter submits
    e.preventDefault();
    inputs.current[i + 1]?.focus();
  };

  return (
    <form className="quick-tools" onSubmit={addRow}>
      <h4>Quick entry</h4>
      <div className="quick-fields">
        {columns.map((c, i) => (
          <label className="quick-field" key={c.id}>
            <span>{c.label.trim() || 'Untitled column'}</span>
            <input
              ref={(el) => (inputs.current[i] = el)}
              type="text"
              enterKeyHint={i === columns.length - 1 ? 'done' : 'next'}
              value={values[c.id] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [c.id]: e.target.value }))}
              onKeyDown={onKeyDown(i)}
            />
          </label>
        ))}
      </div>
      <div className="quick-actions">
        <button type="submit" disabled={!hasAny}>
          ADD ROW
        </button>
        {added > 0 && (
          <small role="status">
            {added === 1 ? 'Row added' : `${added} rows added`} to the table below.
          </small>
        )}
      </div>
    </form>
  );
}
