'use client';

import { useSyncExternalStore } from 'react';

// Whether any bench's how-to strip (BenchHint) is on screen right now —
// the one thing an instrument's first-use note needs to know about the
// bench it sits on, so two first-use explanations never compete for a
// phone's screen. Module-level rather than context: BenchHint and the
// instruments sit in unrelated branches of each experiment's tree, and
// threading a prop through every bench for this would couple instruments
// to experiments. Keyed by hint id in case a page ever has more than one.

const showing = new Set();
const listeners = new Set();

export function setBenchHintShowing(id, isShowing) {
  const had = showing.has(id);
  if (isShowing === had) return;
  if (isShowing) showing.add(id);
  else showing.delete(id);
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => showing.size > 0;
const getServerSnapshot = () => false;

export function useBenchHintShowing() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
