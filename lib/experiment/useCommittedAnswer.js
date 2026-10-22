'use client';

import { useCallback, useEffect, useState } from 'react';

// A part's committed final answers, localStorage-persisted alongside its
// table and plot (praxis:<experimentId>-<partId>-answer). Committing is
// final: a reload restores the committed record, and with it the reveal,
// rather than handing out a fresh attempt. Nothing in the answer box can
// overwrite it; `clear` exists only for the part's "start over", which
// clears the table and plot with it (see ExperimentWorkspace) — clearing the
// answer alone would let a student re-guess against the same data.
//
// Storage is `{ bySymbol: { [symbol]: record } }` so a part can have more
// than one commit-once box (Part B's α and β). An older single-record
// payload `{ value, uncertainty, trueValue, ... }` is still read: every
// symbol on that part sees it, which is right for the one-box parts that
// wrote that shape.
const storageKeyFor = (experimentId, partId) => `praxis:${experimentId}-${partId}-answer`;

function mapOf(stored) {
  if (!stored) return {};
  if (stored.bySymbol && typeof stored.bySymbol === 'object') return stored.bySymbol;
  return {};
}

// `stored` is undefined while the client load is in flight, then the
// persisted object or null. A box keyed by `symbol` gets its own record,
// or the whole legacy payload if that's what's in storage.
export function answerFor(stored, symbol) {
  if (stored === undefined) return undefined;
  if (!stored) return null;
  if (stored.bySymbol?.[symbol]) return stored.bySymbol[symbol];
  if (stored.value != null) return stored;
  return null;
}

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
  }, [experimentId, partId]);

  // Written straight through rather than from an effect on `answer`, so the
  // initial null never lands in storage over a record another tab committed.
  const commit = useCallback(
    (symbol, record) => {
      setAnswer((prev) => {
        const next = { bySymbol: { ...mapOf(prev), [symbol]: record } };
        try {
          window.localStorage.setItem(storageKeyFor(experimentId, partId), JSON.stringify(next));
        } catch {
          // storage unavailable (private mode etc) — the commit holds this session
        }
        return next;
      });
    },
    [experimentId, partId]
  );

  const clear = useCallback(() => {
    setAnswer(null);
    try {
      window.localStorage.removeItem(storageKeyFor(experimentId, partId));
    } catch {
      // nothing stored to clear
    }
  }, [experimentId, partId]);

  return { answer, commit, clear };
}
