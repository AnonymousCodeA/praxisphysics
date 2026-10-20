'use client';

import { useState } from 'react';

// A quiet "start this part over" text button: a rare destructive action, not
// a primary control. The first press only asks, naming what goes (`confirm`);
// the part is cleared on the second, explicit press. Inline rather than
// window.confirm so the wording stays the part's own and it works the same
// on a phone.
export default function StartOver({ label, confirm, onConfirm }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <div className="start-over">
        <button type="button" onClick={() => setAsking(true)}>
          {label}
        </button>
      </div>
    );
  }

  return (
    <div className="start-over" role="group" aria-label={label}>
      <p>{confirm}</p>
      <div className="start-over-actions">
        <button type="button" className="start-over-confirm" onClick={onConfirm}>
          {label}
        </button>
        <button type="button" onClick={() => setAsking(false)} autoFocus>
          Cancel
        </button>
      </div>
    </div>
  );
}
