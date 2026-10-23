'use client';

import { useCallback, useEffect, useState } from 'react';
import { setBenchHintShowing } from '@/lib/experiment/benchHintState';

// A bench's how-to-use note as a dismissible strip. Shown until the student
// dismisses it (remembered per bench in localStorage), after which it holds
// no space at all — only a small "?" in the pinned region's corner, which
// is absolutely positioned there, so bringing the note back costs nothing
// either. Hidden until mounted so a returning student's dismissed note
// never flashes in and pushes the panels down on load.
export default function BenchHint({ id, children }) {
  const storageKey = `praxis:bench-hint-${id}`;
  const [shown, setShown] = useState(null); // null until localStorage is read

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(storageKey) === 'dismissed';
    } catch {}
    setShown(!dismissed);
  }, [storageKey]);

  // Let instruments know a first-use explanation is already on screen, so
  // theirs waits (see lib/experiment/benchHintState.js).
  useEffect(() => {
    setBenchHintShowing(id, shown === true);
    return () => setBenchHintShowing(id, false);
  }, [id, shown]);

  const setDismissed = useCallback(
    (dismissed) => {
      setShown(!dismissed);
      try {
        if (dismissed) localStorage.setItem(storageKey, 'dismissed');
        else localStorage.removeItem(storageKey);
      } catch {}
    },
    [storageKey]
  );

  if (shown === null) return null;
  if (!shown) {
    return (
      <button
        type="button"
        className="bench-hint-reopen"
        aria-label="How to use the bench"
        title="How to use the bench"
        onClick={() => setDismissed(false)}
      >
        ?
      </button>
    );
  }
  return (
    <div className="bench-hint">
      <p className="hint">{children}</p>
      <button type="button" onClick={() => setDismissed(true)}>
        GOT IT
      </button>
    </div>
  );
}
