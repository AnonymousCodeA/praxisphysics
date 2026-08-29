'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { verletStep } from './model.mjs';

const DT = 1 / 500; // s — fixed step, matches the verified model
const DT_MS = DT * 1000;
const MAX_CATCHUP_MS = 120000; // safety valve for a slept/minimized tab; not
                                // hit by ordinary backgrounding, see below
const POLL_MS = 20; // interval poll period — background tabs clamp this up,
                     // the wall-clock accumulator below makes up the difference
const G = 9.81; // true value, never surfaced in the UI

// Drives the pendulum model (lib/pendulum/model.mjs) from real wall-clock
// time via a fixed-step accumulator, decoupled from rendering.
//
// Physics ticking runs on setInterval, not requestAnimationFrame, and —
// deliberately, unlike every other animation in this codebase — keeps
// running while the tab is backgrounded or the canvas is off-screen for as
// long as a swing is in progress. rAF throttles/pauses in hidden tabs; if
// the pendulum paused with it, a student could tab away and back to get a
// frictionless, instantly-finished reading instead of actually timing the
// swing. See CLAUDE.md.
export function usePendulumPhysics({ length, dragCapDeg = 85 }) {
  const dragCapRad = (dragCapDeg * Math.PI) / 180;

  const [mode, setMode] = useState('held'); // 'held' | 'swinging'
  const [theta, setTheta] = useState(0); // throttled copy for React-rendered readouts
  const [triggers, setTriggers] = useState([]); // photogate log: ms since release

  const physicsRef = useRef({ theta: 0, omega: 0 });
  const lengthRef = useRef(length);
  const accumMsRef = useRef(0);
  const lastRealRef = useRef(0);
  const simMsRef = useRef(0);

  useEffect(() => {
    lengthRef.current = length;
  }, [length]);

  const stepPhysics = useCallback(() => {
    const now = performance.now();
    let elapsed = now - lastRealRef.current;
    lastRealRef.current = now;
    if (elapsed > MAX_CATCHUP_MS) elapsed = MAX_CATCHUP_MS;
    accumMsRef.current += elapsed;

    const L = lengthRef.current;
    const crossed = [];
    while (accumMsRef.current >= DT_MS) {
      const prevTheta = physicsRef.current.theta;
      const next = verletStep(prevTheta, physicsRef.current.omega, G, L, DT);
      simMsRef.current += DT_MS;
      // photogate sits at the lowest point: catch theta crossing zero,
      // interpolated to sub-step precision the same way model.mjs locates
      // turning points.
      if (prevTheta !== 0 && Math.sign(next.theta) !== Math.sign(prevTheta)) {
        const frac = prevTheta / (prevTheta - next.theta);
        crossed.push(simMsRef.current - DT_MS + frac * DT_MS);
      }
      physicsRef.current = next;
      accumMsRef.current -= DT_MS;
    }
    if (crossed.length) setTriggers((prev) => prev.concat(crossed));
  }, []);

  useEffect(() => {
    if (mode !== 'swinging') return undefined;
    lastRealRef.current = performance.now();
    const id = setInterval(stepPhysics, POLL_MS);
    return () => clearInterval(id);
  }, [mode, stepPhysics]);

  // Throttled sync for React-rendered readouts (the protractor). This can
  // legitimately pause off-screen/backgrounded like any other rAF loop —
  // physics truth lives in physicsRef and keeps advancing regardless via
  // the interval above.
  useEffect(() => {
    let raf = 0;
    function sync() {
      setTheta(physicsRef.current.theta);
      raf = requestAnimationFrame(sync);
    }
    raf = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(raf);
  }, []);

  const clampDrag = useCallback(
    (raw) => Math.max(-dragCapRad, Math.min(dragCapRad, raw)),
    [dragCapRad]
  );

  // Grabbing the bob — whether it's at rest or mid-swing — stops any run
  // and pins it at the dragged angle.
  const beginDrag = useCallback(
    (raw) => {
      physicsRef.current = { theta: clampDrag(raw), omega: 0 };
      setMode('held');
    },
    [clampDrag]
  );

  const updateDrag = useCallback(
    (raw) => {
      physicsRef.current = { theta: clampDrag(raw), omega: 0 };
    },
    [clampDrag]
  );

  const release = useCallback(() => {
    physicsRef.current = { theta: physicsRef.current.theta, omega: 0 };
    simMsRef.current = 0;
    accumMsRef.current = 0;
    setTriggers([]);
    setMode('swinging');
  }, []);

  const clearTriggers = useCallback(() => setTriggers([]), []);

  return {
    mode,
    theta,
    physicsRef,
    triggers,
    clearTriggers,
    beginDrag,
    updateDrag,
    release,
  };
}
