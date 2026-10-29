'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AnchoredPopover from '../AnchoredPopover';
import { useBenchHintShowing } from '@/lib/experiment/benchHintState';

// An instrument panel's description of the device, as a popover beside the
// panel rather than text inside it: it opens the first time that
// instrument is placed, the "?" in the panel header reopens it, and it
// takes no layout height either way — the panel is the same size open or
// closed. Dismissal is remembered per instrument
// (praxis:instrument-<id>-seen), not per experiment: a stopwatch is the
// same stopwatch on every bench.
//
// The note describes the device, never how to use it for an experiment —
// method lives in the guide (content/guide/measurement.js).
//
// Placed by the shared AnchoredPopover (portaled, fixed, clear of the
// apparatus and on screen) — see that file.

// The automatic first-use open waits while a bench's how-to strip is up
// (two first-use explanations shouldn't compete for a phone's screen) and
// fires the moment it's dismissed, if this instrument is still placed and
// its note still unseen. "Seen" is only ever set by dismissing a note that
// actually showed. The "?" opens it at any time.
export function useInstrumentNote(id) {
  const storageKey = `praxis:instrument-${id}-seen`;
  const [seen, setSeen] = useState(null); // null until localStorage is read
  const [shown, setShown] = useState(false);
  const autoOpened = useRef(false);
  const benchHintUp = useBenchHintShowing();
  const panelRef = useRef(null);
  const anchorRef = useRef(null);

  useEffect(() => {
    let s = false;
    try {
      s = localStorage.getItem(storageKey) === '1';
    } catch {}
    setSeen(s);
  }, [storageKey]);

  useEffect(() => {
    if (seen !== false || benchHintUp || autoOpened.current) return;
    autoOpened.current = true;
    setShown(true);
  }, [seen, benchHintUp]);

  const show = useCallback(() => {
    autoOpened.current = true; // opened by hand: nothing left to open automatically
    setShown(true);
  }, []);
  const dismiss = useCallback(() => {
    setShown(false);
    setSeen(true);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {}
  }, [storageKey]);

  return { shown, show, dismiss, panelRef, anchorRef };
}

// The header's "?" — always there, so opening the note never shifts the
// header, and the tail points at it.
export function InstrumentNoteButton({ note, name }) {
  return (
    <button
      ref={note.anchorRef}
      type="button"
      className="instrument-note-reopen"
      aria-label={`About the ${name}`}
      aria-expanded={!!note.shown}
      title={`About the ${name}`}
      onClick={note.shown ? note.dismiss : note.show}
    >
      ?
    </button>
  );
}

// Positioned by the shared AnchoredPopover: beside the panel, tail on the
// "?", dismissed by GOT IT, Escape, or a press anywhere outside (the "?"
// toggles itself).
export function InstrumentNotePopover({ note, name, children }) {
  return (
    <AnchoredPopover
      open={note.shown}
      box={note.panelRef}
      anchor={note.anchorRef}
      onDismiss={note.dismiss}
      label={`About the ${name}`}
      className="instrument-popover"
    >
      <p className="instrument-note">{children}</p>
      <button type="button" onClick={note.dismiss}>
        GOT IT
      </button>
    </AnchoredPopover>
  );
}
