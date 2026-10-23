'use client';

import { useCallback, useEffect, useState } from 'react';

// An instrument panel's description of the device, as a first-use card
// rather than permanent text: shown the first time that instrument is
// placed, then — once dismissed — only a "?" in the panel header, so a
// panel the student already knows stays compact enough to sit beside the
// apparatus. Remembered per instrument (praxis:instrument-<id>-seen), not
// per experiment: a stopwatch is the same stopwatch on every bench.
//
// The note describes the device, never how to use it for an experiment —
// method lives in the guide (content/guide/measurement.js).
export function useInstrumentNote(id) {
  const storageKey = `praxis:instrument-${id}-seen`;
  const [shown, setShown] = useState(null); // null until localStorage is read

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(storageKey) === '1';
    } catch {}
    setShown(!seen);
  }, [storageKey]);

  const show = useCallback(() => setShown(true), []);
  const dismiss = useCallback(() => {
    setShown(false);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {}
  }, [storageKey]);

  return { shown, show, dismiss };
}

// The header's "?" — only while the note is dismissed.
export function InstrumentNoteButton({ note, name }) {
  if (note.shown !== false) return null;
  return (
    <button
      type="button"
      className="instrument-note-reopen"
      aria-label={`About the ${name}`}
      title={`About the ${name}`}
      onClick={note.show}
    >
      ?
    </button>
  );
}

export function InstrumentNoteCard({ note, children }) {
  if (!note.shown) return null;
  return (
    <div className="instrument-note-card">
      <p className="instrument-note">{children}</p>
      <button type="button" onClick={note.dismiss}>
        GOT IT
      </button>
    </div>
  );
}
