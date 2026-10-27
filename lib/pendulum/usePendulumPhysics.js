'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { verletStep, G } from './model.mjs';

const DT = 1 / 500; // s — fixed step, matches the verified model
const DT_MS = DT * 1000;
const MAX_CATCHUP_MS = 120000; // safety valve for a slept/minimized tab; not
                                // hit by ordinary backgrounding, see below
const POLL_MS = 20; // interval poll period — background tabs clamp this up,
                     // the wall-clock accumulator below makes up the difference
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
//
// The photogate is a freely-placed bench object (lib/pendulum/scene.js),
// not fixed to the lowest point: `photogateRef` holds its beam centre in
// world coordinates (owned by the caller, mutated by dragging on the
// canvas), and `photogateVisible` gates whether it's on the bench at all.
export function usePendulumPhysics({ length, dragCapDeg = 85, photogateRef, photogateVisible = false }) {
  const dragCapRad = (dragCapDeg * Math.PI) / 180;

  const [mode, setMode] = useState('held'); // 'held' | 'swinging'
  const [triggers, setTriggers] = useState([]); // photogate log: ms since release

  const physicsRef = useRef({ theta: 0, omega: 0 });
  const lengthRef = useRef(length);
  const photogateVisibleRef = useRef(photogateVisible);
  const accumMsRef = useRef(0);
  const lastRealRef = useRef(0);
  const simMsRef = useRef(0);

  useEffect(() => {
    lengthRef.current = length;
  }, [length]);

  useEffect(() => {
    photogateVisibleRef.current = photogateVisible;
  }, [photogateVisible]);

  const stepPhysics = useCallback(() => {
    const now = performance.now();
    let elapsed = now - lastRealRef.current;
    lastRealRef.current = now;
    if (elapsed > MAX_CATCHUP_MS) elapsed = MAX_CATCHUP_MS;
    accumMsRef.current += elapsed;

    const L = lengthRef.current;

    // The beam sits at a fixed world point; the string (pivot -> bob)
    // sweeps past it at radius L. As long as the gate is within reach of
    // the string, "crossing the beam" reduces to theta crossing the
    // angular position of that point, the same interpolated zero-crossing
    // technique model.mjs uses for turning points.
    let gateOn = photogateVisibleRef.current && photogateRef && photogateRef.current;
    let thetaGate = 0;
    let gateInReach = false;
    if (gateOn) {
      const gate = photogateRef.current;
      thetaGate = Math.atan2(gate.xM, gate.yM);
      gateInReach = Math.hypot(gate.xM, gate.yM) <= L;
    }

    const crossed = [];
    while (accumMsRef.current >= DT_MS) {
      const prevTheta = physicsRef.current.theta;
      const next = verletStep(prevTheta, physicsRef.current.omega, G, L, DT);
      simMsRef.current += DT_MS;

      if (gateOn && gateInReach) {
        const prevRel = prevTheta - thetaGate;
        const nextRel = next.theta - thetaGate;
        if (prevRel !== 0 && Math.sign(nextRel) !== Math.sign(prevRel)) {
          const frac = prevRel / (prevRel - nextRel);
          crossed.push(simMsRef.current - DT_MS + frac * DT_MS);
        }
      }

      physicsRef.current = next;
      accumMsRef.current -= DT_MS;
    }
    if (crossed.length) setTriggers((prev) => prev.concat(crossed));
  }, [photogateRef]);

  useEffect(() => {
    if (mode !== 'swinging') return undefined;
    lastRealRef.current = performance.now();
    const id = setInterval(stepPhysics, POLL_MS);
    return () => clearInterval(id);
  }, [mode, stepPhysics]);

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

  // Stops a run where it is: the bob stays at the angle it was passing
  // through, at rest, ready to be repositioned or released again. Neither
  // this nor hangRest touches the photogate log (or the stopwatch, which
  // this hook never sees): those are the student's instruments to clear.
  const stop = useCallback(() => {
    physicsRef.current = { theta: physicsRef.current.theta, omega: 0 };
    setMode('held');
  }, []);

  // Stops any run and hangs the bob at rest on the true vertical, so a
  // length or the angle plate's zero can be read without fighting a held
  // angle. Always the true vertical, never the plate's printed 0°: that
  // scale sits a fraction of a degree off, and a string hanging straight is
  // how a student notices it.
  const hangRest = useCallback(() => {
    physicsRef.current = { theta: 0, omega: 0 };
    setMode('held');
  }, []);

  const clearTriggers = useCallback(() => setTriggers([]), []);

  return {
    mode,
    physicsRef,
    triggers,
    clearTriggers,
    beginDrag,
    updateDrag,
    release,
    stop,
    hangRest,
  };
}
