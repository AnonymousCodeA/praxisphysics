'use client';

import { useEffect, useRef, useState } from 'react';

// localStorage-persisted so a student's readings survive closing the tab —
// no accounts, but work shouldn't vanish just because the browser was closed.
const STORAGE_KEY = 'praxis:pendulum-parta-table';

let uid = 0;
function nextId(prefix) {
  uid += 1;
  return `${prefix}${Date.now().toString(36)}${uid}`;
}

function emptyRow(columns) {
  return { id: nextId('row'), cells: Object.fromEntries(columns.map((c) => [c.id, ''])) };
}

function defaultTable() {
  const columns = [
    { id: nextId('col'), label: 'COLUMN 1' },
    { id: nextId('col'), label: 'COLUMN 2' },
  ];
  return { columns, rows: [emptyRow(columns), emptyRow(columns), emptyRow(columns)] };
}

// Deliberately structure-free: no computed columns, no built-in T² or
// averaging. Cells are free text — students decide what's worth tabulating.
export default function PendulumDataTable() {
  const [table, setTable] = useState(null); // null until the client load finishes
  const loadedRef = useRef(false);

  useEffect(() => {
    let initial = null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) initial = JSON.parse(stored);
    } catch {
      initial = null;
    }
    setTable(initial || defaultTable());
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current || !table) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(table));
    } catch {
      // storage unavailable (private mode etc) — reading still works this session
    }
  }, [table]);

  if (!table) return null;

  function addColumn() {
    setTable((t) => {
      const id = nextId('col');
      return {
        columns: [...t.columns, { id, label: `COLUMN ${t.columns.length + 1}` }],
        rows: t.rows.map((r) => ({ ...r, cells: { ...r.cells, [id]: '' } })),
      };
    });
  }

  function deleteColumn(id) {
    setTable((t) => ({
      columns: t.columns.filter((c) => c.id !== id),
      rows: t.rows.map((r) => {
        const cells = { ...r.cells };
        delete cells[id];
        return { ...r, cells };
      }),
    }));
  }

  function renameColumn(id, label) {
    setTable((t) => ({ ...t, columns: t.columns.map((c) => (c.id === id ? { ...c, label } : c)) }));
  }

  function addRow() {
    setTable((t) => ({ ...t, rows: [...t.rows, emptyRow(t.columns)] }));
  }

  function deleteRow(id) {
    setTable((t) => ({ ...t, rows: t.rows.filter((r) => r.id !== id) }));
  }

  function setCell(rowId, colId, value) {
    setTable((t) => ({
      ...t,
      rows: t.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r)),
    }));
  }

  return (
    <div className="pendulum-table-box">
      <div className="pendulum-table-wrap">
        <table className="pendulum-table">
          <thead>
            <tr>
              <th className="rowhead" aria-hidden="true" />
              {table.columns.map((c) => (
                <th key={c.id}>
                  <div className="col-head-in">
                    <input
                      className="col-label"
                      value={c.label}
                      onChange={(e) => renameColumn(c.id, e.target.value)}
                      aria-label="Column name"
                    />
                    <button
                      type="button"
                      className="cell-del"
                      onClick={() => deleteColumn(c.id)}
                      aria-label={`Delete column ${c.label}`}
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
              <th className="add-col-head">
                <button type="button" onClick={addColumn}>
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
                      onClick={() => deleteRow(r.id)}
                      aria-label={`Delete row ${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                </td>
                {table.columns.map((c) => (
                  <td key={c.id}>
                    <input
                      value={r.cells[c.id] ?? ''}
                      onChange={(e) => setCell(r.id, c.id, e.target.value)}
                      aria-label={`Row ${i + 1}, ${c.label}`}
                    />
                  </td>
                ))}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="pendulum-add-row" onClick={addRow}>
        + ROW
      </button>
    </div>
  );
}
