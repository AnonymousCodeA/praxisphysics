'use client';

import { useEffect, useRef, useState } from 'react';
import { quantize } from '@/lib/instruments/reading';

const RESOLUTION_S = 0.01;

// A plain wall-clock stopwatch. It has no knowledge of the pendulum or any
// other experiment — start/stop is entirely up to the student, so the only
// error it can carry is their own reaction time. Reusable as-is anywhere a
// manual timing instrument is needed.
//
// Two details make it a fair instrument rather than a slightly broken one:
//
//   - The elapsed time is measured at the instant of the click, not at the
//     last animation frame. A frame-based stopwatch quietly loses up to a
//     frame — about 16 ms — off every interval it measures, and a student
//     timing twenty oscillations is entitled to the whole interval.
//   - START begins a fresh run from zero. A watch that carried on from
//     where it was last stopped would turn "time twenty oscillations,
//     repeat three times" into three cumulative numbers instead of three
//     intervals.
//
// The reaction time itself stays real: the watch cannot know when the
// pendulum passed the lowest point, and it must not be told (see CLAUDE.md
// on instruments staying blind to the experiment).
export default function Stopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  // The authoritative running flag. The state drives the button label; the
  // ref is what the animation loop checks, because a frame can land between
  // the click and the re-render, and a reading frozen at the click must not
  // be overwritten by it.
  const runningRef = useRef(false);
  const startRef = useRef(0);
  const baseRef = useRef(0);

  useEffect(() => {
    if (!running) return undefined;
    let raf = 0;
    function tick() {
      if (!runningRef.current) return;
      setElapsedMs(baseRef.current + (performance.now() - startRef.current));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  function handleStartStop() {
    if (runningRef.current) {
      runningRef.current = false;
      const total = baseRef.current + (performance.now() - startRef.current);
      baseRef.current = total;
      setElapsedMs(total);
      setRunning(false);
    } else {
      runningRef.current = true;
      startRef.current = performance.now();
      baseRef.current = 0;
      setElapsedMs(0);
      setRunning(true);
    }
  }

  function handleReset() {
    runningRef.current = false;
    baseRef.current = 0;
    startRef.current = 0;
    setElapsedMs(0);
    setRunning(false);
  }

  const seconds = quantize(elapsedMs / 1000, RESOLUTION_S);

  return (
    <div className="instrument">
      <div className="instrument-head">
        <b>STOPWATCH</b>
        <span className="instrument-res">{RESOLUTION_S.toFixed(2)}s</span>
      </div>
      <div className="instrument-read">
        {seconds.toFixed(2)}
        <span className="unit">s</span>
      </div>
      <p className="instrument-note">
        START begins a fresh run from zero; STOP freezes the reading at the instant you press it.
        Start and stop at the same point of the swing and the two reaction errors partly cancel —
        the watch cannot know when the pendulum passed that point.
      </p>
      <div className="instrument-controls">
        <button type="button" onClick={handleStartStop}>
          {running ? 'STOP' : 'START'}
        </button>
        <button type="button" onClick={handleReset}>
          RESET
        </button>
      </div>
    </div>
  );
}
