'use client';

// Deliberately structure-free: no computed columns, no built-in T² or
// averaging. Cells are free text — students decide what's worth tabulating.
// Table state itself lives in lib/experiment/useDataTable.js, owned by
// ExperimentWorkspace and shared with Plot — this component only
// renders/edits it. CSS classes keep the "pendulum-" prefix: they're shared
// presentational styles, not experiment-specific, and renaming them is a
// separate cosmetic change from generalizing the component itself.
export default function DataTable({ table, addColumn, deleteColumn, renameColumn, addRow, deleteRow, setCell }) {
  if (!table) return null;

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
