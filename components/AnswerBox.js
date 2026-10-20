'use client';

import { useState } from 'react';

// A part's final answer: value ± uncertainty, committed once. After the
// commit it shows the value the simulation actually uses and whether the
// student's interval contains it — stated flatly. The check is coverage
// only, never closeness: an honest wide interval that brackets the true
// value is the better answer, so nothing here rewards a small uncertainty
// or scores the distance. The true value is not hidden; it's in the bundle.
//
// `spec` is { symbol, unit, trueValue } from the part's definition — see
// data/pendulumGuide.js. The true value is copied into the committed record
// so the reveal a student saw can't change under them later. `answer` and
// `commit` come from the part's useCommittedAnswer, held by
// ExperimentWorkspace so the part's "start over" can clear it.

const parse = (s) => {
  const t = s.trim();
  if (t === '') return NaN;
  return Number(t);
};

// Decimal places as typed ("0.30" → 2), so the interval is shown to the
// precision the student wrote rather than to float noise.
const decimalsOf = (s) => (s.trim().split('.')[1] || '').replace(/e.*$/i, '').length;

export default function AnswerBox({ spec, answer, commit }) {
  const [value, setValue] = useState('');
  const [uncertainty, setUncertainty] = useState('');

  if (answer === undefined) return null; // still loading — don't flash the form over a committed answer

  if (answer) {
    const v = parse(answer.value);
    const u = parse(answer.uncertainty);
    const d = Math.max(decimalsOf(answer.value), decimalsOf(answer.uncertainty));
    const contains = Math.abs(v - answer.trueValue) <= u;
    return (
      <div className="answer-box answer-committed">
        <p className="answer-line">
          <em>{spec.symbol}</em> = {answer.value} ± {answer.uncertainty} {spec.unit}
        </p>
        <p>
          The simulation uses <em>{spec.symbol}</em> = {answer.trueValue} {spec.unit}. Your
          interval, {(v - u).toFixed(d)} to {(v + u).toFixed(d)} {spec.unit},{' '}
          {contains ? 'contains it.' : 'does not contain it.'}
        </p>
      </div>
    );
  }

  const v = parse(value);
  const u = parse(uncertainty);
  const valid = Number.isFinite(v) && Number.isFinite(u) && u > 0;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!valid) return;
    commit({
      value: value.trim(),
      uncertainty: uncertainty.trim(),
      trueValue: spec.trueValue,
      committedAt: new Date().toISOString(),
    });
  };

  return (
    <form className="answer-box" onSubmit={onSubmit}>
      <div className="answer-fields">
        <em>{spec.symbol}</em>
        <span>=</span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={`Value of ${spec.symbol}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <span>±</span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={`Uncertainty in ${spec.symbol}`}
          value={uncertainty}
          onChange={(e) => setUncertainty(e.target.value)}
        />
        <span>{spec.unit}</span>
      </div>
      <div className="answer-actions">
        <button type="submit" disabled={!valid}>
          COMMIT
        </button>
        <small>A committed answer can’t be changed.</small>
      </div>
    </form>
  );
}
