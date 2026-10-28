'use client';

// Quick entry: a compact strip for typing a reading into the student's own
// table on a phone — [column ▾][value] [column ▾][value] [ENTER READING].
// The dropdowns list the table's existing columns by the student's own
// headings, and the button appends a row with the two values in those two
// columns. That is its whole job: it knows nothing about any experiment,
// never names, creates or calculates a column, and never touches the plot.
// What to measure and tabulate is the student's decision; with no columns
// yet it says so and points at the table rather than inventing any.
//
// Rendered as ExperimentWorkspace's `DataTools`, which hands it the active
// part's dataTable (and other props it ignores). The button is deliberately
// not called ADD ROW: the table's own "+ ROW" sits right below.
//
// An <option> can't hold markup, so the dropdowns show each heading as
// plain Unicode (foldLabel: T_0^2 → T₀²), matching the rendered header.
import { useRef, useState } from 'react';
import { foldLabel } from '@/lib/experiment/tableText';

const PAIRS = [0, 1];

export default function QuickEntry({ dataTable }) {
  const [cols, setCols] = useState([null, null]); // chosen column ids; null → default
  const [values, setValues] = useState(['', '']);
  const inputs = useRef([]);
  const table = dataTable.table;

  if (!table) return null; // still loading from storage

  const columns = table.columns;
  if (columns.length === 0) {
    return (
      <p className="quick-empty">Quick entry needs a column — add one to the table below.</p>
    );
  }

  // A chosen column that's since been deleted falls back to the default:
  // the first column for the first pair, the second (if any) for the second.
  const colFor = (i) =>
    columns.some((c) => c.id === cols[i]) ? cols[i] : (columns[i] ?? columns[0]).id;
  const chosen = PAIRS.map(colFor);
  const filled = PAIRS.filter((i) => values[i].trim() !== '');
  const clash = chosen[0] === chosen[1] && filled.length === 2;
  const canEnter = filled.length > 0 && !clash;

  const enter = (e) => {
    e.preventDefault();
    if (!canEnter) return;
    const cells = {};
    for (const i of filled) cells[chosen[i]] = values[i].trim();
    dataTable.appendRow(cells);
    setValues(['', '']);
    inputs.current[0]?.focus();
  };

  return (
    <form className="quick-strip" onSubmit={enter} aria-label="Quick entry">
      {PAIRS.map((i) => (
        <span className="quick-pair" key={i}>
          <select
            aria-label={`Column for value ${i + 1}`}
            value={chosen[i]}
            onChange={(e) => setCols((c) => c.map((v, j) => (j === i ? e.target.value : v)))}
          >
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {foldLabel(c.label.trim()) || 'Untitled column'}
              </option>
            ))}
          </select>
          <input
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            inputMode="decimal"
            enterKeyHint={i === 0 ? 'next' : 'enter'}
            aria-label={`Value ${i + 1}`}
            value={values[i]}
            onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
            onKeyDown={(e) => {
              if (i === 0 && e.key === 'Enter') {
                e.preventDefault(); // first value: on to the second, not a half-entered reading
                inputs.current[1]?.focus();
              }
            }}
          />
        </span>
      ))}
      <button type="submit" disabled={!canEnter} title={clash ? 'Both values point at the same column' : undefined}>
        ENTER READING
      </button>
    </form>
  );
}
