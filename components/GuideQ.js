// A question in guide prose, with its answer behind a disclosure.
//
// The reason this exists: a worked example that only narrates what to do
// leaves a first-timer with nothing to hold on to — they can follow the
// argument, but they have no idea what they themselves are supposed to be
// doing at each step, and no way to check that they got it right. Here the
// question is stated outright, in the reader's terms ("what goes on each
// axis?"), and the answer is one tap away rather than buried in the prose.
//
// <details> is native, so it works with no JavaScript and is announced as
// a disclosure by screen readers. No 'use client' needed: this renders in
// the guide's server components.
export default function GuideQ({ q, id, children }) {
  return (
    <div className="guide-q" id={id}>
      <p className="guide-q-text">
        <span className="guide-q-tag">Q</span>
        <span>{q}</span>
      </p>
      <details className="guide-q-answer">
        <summary>Show the answer</summary>
        <div className="guide-q-body">{children}</div>
      </details>
    </div>
  );
}
