'use client';

import { useCallback, useEffect, useState } from 'react';

// A part's committed final answer, localStorage-persisted alongside its
// table and plot (praxis:<experimentId>-<partId>-answer). Committing is
// final: a reload restores the committed record, and with it the reveal,
// rather than handing out a fresh attempt. Nothing in the answer box can
// overwrite it; `clear` exists only for the part's "start over", which
// clears the table and plot with it (see ExperimentWorkspace) — clearing the
// answer alone would let a student re-guess against the same data.
const storageKeyFor = (experimentId, partId) => `praxis:${experimentId}-${partId}-answer`;

export function useCommittedAnswer(experimentId, partId) {
  // undefined until the client load finishes, then the record or null.
  const [answer, setAnswer] = useState(undefined);

  useEffect(() => {
    let stored = null;
    try {
      const raw = window.localStorage.getItem(storageKeyFor(experimentId, partId));
      if (raw) stored = JSON.parse(raw);
    } catch {
      stored = null;
    }
    setAnswer(stored);
  }, []);

  // Written straight through rather than from an effect on `answer`, so the
  // initial null never lands in storage over a record another tab committed.
  const commit = useCallback((record) => {
    setAnswer(record);
    try {
      window.localStorage.setItem(storageKeyFor(experimentId, partId), JSON.stringify(record));
    } catch {
      // storage unavailable (private mode etc) — the commit holds this session
    }
  }, []);

  const clear = useCallback(() => {
    setAnswer(null);
    try {
      window.localStorage.removeItem(storageKeyFor(experimentId, partId));
    } catch {
      // nothing stored to clear
    }
  }, []);

  return { answer, commit, clear };
}
