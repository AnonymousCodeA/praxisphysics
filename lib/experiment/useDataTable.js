'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// localStorage-persisted so a student's readings survive closing the tab —
// no accounts, but work shouldn't vanish just because the browser was closed.
// Keyed per experiment and part so each keeps its own table independently.
const storageKeyFor = (experimentId, partId) => `praxis:${experimentId}-${partId}-table`;

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

// Single source of truth for a part's table — shared by DataTable (renders/
// edits it) and Plot (reads columns/rows to plot), so both stay in sync
// without either owning a second localStorage copy.
//
// `experimentId`/`partId` pick the storage key and are read once at call
// time — ExperimentWorkspace holds one instance per part rather than
// swapping the arguments on a single instance, so this never needs to react
// to either changing underneath it.
export function useDataTable(experimentId, partId) {
  const [table, setTable] = useState(null); // null until the client load finishes
  const loadedRef = useRef(false);

  useEffect(() => {
    let initial = null;
    try {
      const stored = window.localStorage.getItem(storageKeyFor(experimentId, partId));
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
      window.localStorage.setItem(storageKeyFor(experimentId, partId), JSON.stringify(table));
    } catch {
      // storage unavailable (private mode etc) — reading still works this session
    }
  }, [table]);

  const addColumn = useCallback(() => {
    setTable((t) => {
      const id = nextId('col');
      return {
        columns: [...t.columns, { id, label: `COLUMN ${t.columns.length + 1}` }],
        rows: t.rows.map((r) => ({ ...r, cells: { ...r.cells, [id]: '' } })),
      };
    });
  }, []);

  const deleteColumn = useCallback((id) => {
    setTable((t) => ({
      columns: t.columns.filter((c) => c.id !== id),
      rows: t.rows.map((r) => {
        const cells = { ...r.cells };
        delete cells[id];
        return { ...r, cells };
      }),
    }));
  }, []);

  const renameColumn = useCallback((id, label) => {
    setTable((t) => ({ ...t, columns: t.columns.map((c) => (c.id === id ? { ...c, label } : c)) }));
  }, []);

  const addRow = useCallback(() => {
    setTable((t) => ({ ...t, rows: [...t.rows, emptyRow(t.columns)] }));
  }, []);

  // Append one row with its cells already filled, keyed by column id (as
  // QuickEntry collects them). Only the table's existing columns are
  // written — a value for a column that has since been deleted is dropped,
  // never turned into a new column: the columns are the student's to make.
  const appendRow = useCallback((cellsById) => {
    setTable((t) => {
      const row = emptyRow(t.columns);
      for (const c of t.columns) if (cellsById[c.id] !== undefined) row.cells[c.id] = String(cellsById[c.id]);
      return { ...t, rows: [...t.rows, row] };
    });
  }, []);

  const deleteRow = useCallback((id) => {
    setTable((t) => ({ ...t, rows: t.rows.filter((r) => r.id !== id) }));
  }, []);

  const setCell = useCallback((rowId, colId, value) => {
    setTable((t) => ({
      ...t,
      rows: t.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r)),
    }));
  }, []);

  // Back to a fresh default table — a part's "start over", not an edit.
  const reset = useCallback(() => setTable(defaultTable()), []);

  return {
    table,
    addColumn,
    deleteColumn,
    renameColumn,
    addRow,
    appendRow,
    deleteRow,
    setCell,
    reset,
  };
}
