'use client';

import { useEffect, useRef, useState } from 'react';
import { quantize } from '@/lib/instruments/reading';

const RESOLUTION_S = 0.01;

// A plain wall-clock stopwatch. It has no knowledge of the pendulum or any
// other experiment — start/stop is entirely up to the student, so the only
// error it can carry is their own reaction time. Reusable as-is anywhere a
// manual timing instrument is needed.
export default function Stopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(0);
  const baseRef = useRef(0);

  useEffect(() => {
    if (!running) return undefined;
    let raf = 0;
    function tick() {
      setElapsedMs(baseRef.current + (performance.now() - startRef.current));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  function handleStartStop() {
    if (running) {
      baseRef.current = elapsedMs;
      setRunning(false);
    } else {
      startRef.current = performance.now();
      setRunning(true);
    }
  }

  function handleReset() {
    setRunning(false);
    baseRef.current = 0;
    setElapsedMs(0);
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
