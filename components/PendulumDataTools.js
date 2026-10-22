'use client';

// The pendulum's own data-entry helper, rendered in the DATA section above
// the table. It exists because the review that shaped this experiment asked
// for exactly this: type the values you measured and have the graph
// plotted for you, rather than re-typing them into a free-form table and
// then setting up the axes by hand.
//
// What it does is deliberately boring. It adds a row to the same table the
// student can edit, writes a calculated column the way a calculator would,
// points the plot at two columns, and picks an axis range that frames the
// points. It never fits a line and never computes a gradient: the line is
// still the student's to draw, and the gradient is still read off the line
// by hand — that is the skill the experiment is for.
//
// Part B is a two-stage fit, so it has two stages here as well: the first
// plots T/T₀ − 1 against x, and the second — once the student has read α
// off that first line — plots what is left of the data against x². The
// second stage needs the student to type in the α they measured, which is
// the point: the number comes from their own line, not from here.
//
// It is a convenience, not a constraint. Everything it produces is an
// ordinary column and an ordinary pair of axes, and the student can rename
// them, retype them, or ignore the helper entirely and fill the table in
// directly.
import { useState } from 'react';
import { autoRangeFromPoints } from '@/lib/experiment/usePlotConfig';

const DEG = Math.PI / 180;

// The columns this helper works with. Part A measures a length and a
// period; Part B measures an amplitude and a period, and needs the
// small-amplitude period T₀ as a constant to form the ratio.
const PART_A = {
  x: 'L (m)',
  y: 'T₀ (s)',
  derived: 'T₀² (s²)',
  xTitle: 'L (m)',
  yTitle: 'T₀ (s)',
};

const PART_B = {
  x: 'φ₀ (°)',
  y: 'T (s)',
  derivedX: 'x = sin²(φ₀/2)',
  derivedY: 'T/T₀ − 1',
  derivedX2: 'x²',
  derivedR: 'R = T/T₀ − 1 − αx',
  xTitle: 'φ₀ (°)',
  yTitle: 'T (s)',
};

// Four significant figures, no exponent: these are numbers a student reads
// off an instrument and types into a table, not machine output.
function fmt(v) {
  if (!Number.isFinite(v)) return '';
  const s = v.toPrecision(4);
  return String(Number(s));
}

function NumInput({ value, onChange, label, unit, step = 'any' }) {
  return (
    <label className="quick-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
      />
      <small>{unit}</small>
    </label>
  );
}

export default function PendulumDataTools({ dataTable, plotConfig, part }) {
  const isB = part === 'partb';
  const spec = isB ? PART_B : PART_A;

  const [first, setFirst] = useState(''); // L (m) or φ₀ (°)
  const [second, setSecond] = useState(''); // T₀ (s) or T (s)
  const [t0, setT0] = useState(''); // Part B's T₀ constant
  const [alpha, setAlpha] = useState(''); // Part B's α, read off the first line
  const [note, setNote] = useState('');

  const table = dataTable.table;

  const addRow = () => {
    const a = parseFloat(first);
    const b = parseFloat(second);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      setNote('Enter both numbers first.');
      return;
    }
    dataTable.appendRow({ [spec.x]: fmt(a), [spec.y]: fmt(b) });
    setFirst('');
    setSecond('');
    setNote(`Added a row: ${spec.x} = ${fmt(a)}, ${spec.y} = ${fmt(b)}.`);
  };

  // The measured columns, read back out of the table. A row with a blank or
  // non-numeric cell is skipped rather than guessed at.
  const measured = () => {
    const sourceX = table?.columns.find((c) => c.label === spec.x);
    const sourceY = table?.columns.find((c) => c.label === spec.y);
    if (!sourceX || !sourceY) return null;
    const rows = [];
    for (const row of table.rows) {
      const a = parseFloat(row.cells[sourceX.id]);
      const b = parseFloat(row.cells[sourceY.id]);
      if (Number.isFinite(a) && Number.isFinite(b)) rows.push({ row, a, b });
    }
    return { sourceX, sourceY, rows };
  };

  // Stage one: Part A squares the period into its own column and plots it
  // against the length. Part B turns the amplitude into x = sin²(φ₀/2) and
  // the period into the ratio T/T₀ − 1, plotted against x.
  const plot = () => {
    if (!table) return;
    const data = measured();
    if (!data) {
      setNote(`Add a row first, so the ${spec.x} and ${spec.y} columns exist.`);
      return;
    }
    const t0 = isB ? parseFloat(t0) : NaN;
    if (isB && !Number.isFinite(t0)) {
      setNote('Enter T₀ first — the ratio needs it.');
      return;
    }

    const xs = [];
    const ys = [];
    const derivedX = isB ? dataTable.upsertColumn(spec.derivedX) : data.sourceX.id;
    const derivedY = isB ? dataTable.upsertColumn(spec.derivedY) : dataTable.upsertColumn(spec.derived);

    for (const { row, a, b } of data.rows) {
      if (isB) {
        const x = Math.sin((a * DEG) / 2) ** 2;
        const y = b / t0 - 1;
        dataTable.setCell(row.id, derivedX, fmt(x));
        dataTable.setCell(row.id, derivedY, fmt(y));
        xs.push(x);
        ys.push(y);
      } else {
        const y = b * b;
        dataTable.setCell(row.id, derivedY, fmt(y));
        xs.push(a);
        ys.push(y);
      }
    }

    if (!xs.length) {
      setNote('No rows with both numbers yet.');
      return;
    }

    plotConfig.setCols({ x: derivedX, y: derivedY });
    // Both relationships are supposed to pass through the origin, so the
    // window starts there — the intercept is one of the things the graph
    // is for, and it is invisible if the axis begins just below the first
    // point.
    const range = autoRangeFromPoints(xs, ys, { zero: true });
    if (range) plotConfig.setBounds(range);
    setNote(
      isB
        ? `Plotted ${spec.derivedY} against ${spec.derivedX}. Draw the line yourself, read α off it, then enter α below for the second stage.`
        : `Plotted ${spec.derived} against ${spec.x}. Draw the line yourself and read the gradient off it.`,
    );
  };

  // Stage two (Part B only): take α off the data and plot what is left.
  // The residual R = T/T₀ − 1 − αx is the β term plus everything above it,
  // so plotting R against x² turns the second stage into an ordinary
  // straight line through the origin.
  const plotResidual = () => {
    if (!table) return;
    const data = measured();
    if (!data) {
      setNote('Add a row first.');
      return;
    }
    const t0 = parseFloat(t0);
    const al = parseFloat(alpha);
    if (!Number.isFinite(t0)) {
      setNote('Enter T₀ first — the ratio needs it.');
      return;
    }
    if (!Number.isFinite(al)) {
      setNote('Enter α first — the residual needs it. Read it off your first line.');
      return;
    }

    const xs = [];
    const ys = [];
    const colX = dataTable.upsertColumn(spec.derivedX);
    const colY = dataTable.upsertColumn(spec.derivedY);
    const colX2 = dataTable.upsertColumn(spec.derivedX2);
    const colR = dataTable.upsertColumn(spec.derivedR);

    for (const { row, a, b } of data.rows) {
      const x = Math.sin((a * DEG) / 2) ** 2;
      const y = b / t0 - 1;
      const r = y - al * x;
      dataTable.setCell(row.id, colX, fmt(x));
      dataTable.setCell(row.id, colY, fmt(y));
      dataTable.setCell(row.id, colX2, fmt(x * x));
      dataTable.setCell(row.id, colR, fmt(r));
      xs.push(x * x);
      ys.push(r);
    }

    if (!xs.length) {
      setNote('No rows with both numbers yet.');
      return;
    }

    plotConfig.setCols({ x: colX2, y: colR });
    const range = autoRangeFromPoints(xs, ys, { zero: true });
    if (range) plotConfig.setBounds(range);
    setNote(
      `Plotted ${spec.derivedR} against ${spec.derivedX2}, using α = ${fmt(al)}. Draw the line yourself and read β off it.`,
    );
  };

  return (
    <div className="quick-tools">
      <h4>Quick entry</h4>
      <p>
        Type a reading and add it to the table, then plot the pair the question asks for. Both
        columns are ordinary table columns — rename them, retype them, or fill the table in by hand
        instead.
      </p>

      <div className="quick-row">
        <NumInput
          label={spec.xTitle}
          unit={isB ? 'deg' : 'm'}
          value={first}
          onChange={setFirst}
        />
        <NumInput
          label={spec.yTitle}
          unit="s"
          value={second}
          onChange={setSecond}
        />
        <button type="button" onClick={addRow}>
          ADD ROW
        </button>
      </div>

      {isB && (
        <div className="quick-row">
          <NumInput label="T₀" unit="s" value={t0} onChange={setT0} />
          <button type="button" onClick={plot}>
            PLOT (T/T₀ − 1) vs x
          </button>
        </div>
      )}
      {!isB && (
        <div className="quick-row">
          <button type="button" onClick={plot}>
            PLOT T₀² vs L
          </button>
        </div>
      )}

      {isB && (
        <div className="quick-row">
          <NumInput label="α" unit="" value={alpha} onChange={setAlpha} />
          <button type="button" onClick={plotResidual}>
            PLOT residual vs x²
          </button>
        </div>
      )}

      {note && <p className="quick-note">{note}</p>}
    </div>
  );
}
