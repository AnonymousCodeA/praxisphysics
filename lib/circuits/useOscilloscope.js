'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { captureWaveform } from './capture';
import { SCOPE_DIVISIONS_X, SCOPE_DISPLAY_SAMPLES, SCOPE_REFRESH_MS, applyCoupling } from './oscilloscopeControls';

const EMPTY_DISPLAY = { time: [], traces: {}, triggered: false };

// Tunable "real instrument" imperfections, applied here at the display
// stage — captureWaveform/model.mjs stay exact, since they're also what
// scripts/circuits-*-verify.mjs checks against a closed form. Quantisation
// is the other of the three contributions requested, but it depends on a
// channel's current volts/div (a display-only setting this hook doesn't
// see) so it lives in components/Oscilloscope.js's draw step instead — see
// the constants at the top of that file.
const NOISE_STDDEV_VOLTS = 0.008; // broadband noise stddev, in real volts —
// fixed regardless of volts/div, so zooming in (a smaller volts/div) makes
// the SAME physical noise more visible on screen without the noise itself
// getting any bigger. A real scope's front-end noise floor doesn't care
// what its own display gain is set to.
const TRIGGER_JITTER_MAX_SAMPLES = 2; // +/- this many whole samples, shared
// by every channel in one capture — real trigger jitter is uncertainty in
// exactly when the shared acquisition starts, not a per-channel effect.

// Box-Muller: a small broadband noise source should look Gaussian (thermal/
// Johnson noise does), not uniform — uniform noise has a hard-edged range
// that reads as a slightly artificial band rather than a soft fuzz.
function gaussianRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Drives the scope's live trace off the bench's CURRENT solver state, on
// its own slow interval — independent of, and never advancing,
// useCircuitPhysics's own real-time accumulator. captureWaveform is a
// read (see lib/circuits/capture.mjs: it clones the state it's handed and
// never mutates the caller's), so this can re-capture from
// `solverStateRef.current` as often as it likes without perturbing the
// actual simulation at all — "from the bench's current state without
// advancing it."
//
// `elements`/`ground`/`probes`/`timePerDiv`/`couplings`/`triggerSource`/
// `triggerSlope`/`triggerLevel` are read fresh via refs every tick (same
// convention as useCircuitPhysics), so a topology edit, a timebase change,
// or a dial on the trigger/coupling controls takes effect on the very next
// capture without needing to restart the interval.
export function useOscilloscope({
  elements,
  ground,
  solverStateRef,
  probes,
  enabled,
  running,
  timePerDiv,
  couplings,
  triggerSource,
  triggerSlope,
  triggerLevel,
}) {
  const elementsRef = useRef(elements);
  const groundRef = useRef(ground);
  const probesRef = useRef(probes);
  const timePerDivRef = useRef(timePerDiv);
  const couplingsRef = useRef(couplings);
  const triggerSourceRef = useRef(triggerSource);
  const triggerSlopeRef = useRef(triggerSlope);
  const triggerLevelRef = useRef(triggerLevel);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  useEffect(() => {
    groundRef.current = ground;
  }, [ground]);
  useEffect(() => {
    probesRef.current = probes;
  }, [probes]);
  useEffect(() => {
    timePerDivRef.current = timePerDiv;
  }, [timePerDiv]);
  useEffect(() => {
    couplingsRef.current = couplings;
  }, [couplings]);
  useEffect(() => {
    triggerSourceRef.current = triggerSource;
  }, [triggerSource]);
  useEffect(() => {
    triggerSlopeRef.current = triggerSlope;
  }, [triggerSlope]);
  useEffect(() => {
    triggerLevelRef.current = triggerLevel;
  }, [triggerLevel]);

  const [display, setDisplay] = useState(EMPTY_DISPLAY);
  // AUTO reads the latest capture directly, including while HOLD is on (it
  // still needs *some* trace to frame against) — a ref rather than state
  // since nothing needs to re-render when this alone changes.
  const lastCaptureRef = useRef(EMPTY_DISPLAY);

  const capture = useCallback(() => {
    const probesNow = probesRef.current;
    if (!probesNow || probesNow.length === 0) return;

    const windowSeconds = timePerDivRef.current * SCOPE_DIVISIONS_X;
    const dt = windowSeconds / SCOPE_DISPLAY_SAMPLES;
    // Captures 2x the display span: the first half is searched for a
    // channel-1 trigger crossing (see below), which leaves a full
    // display's worth of samples after any crossing found within it.
    const searchSteps = SCOPE_DISPLAY_SAMPLES;
    const totalSteps = SCOPE_DISPLAY_SAMPLES + searchSteps;

    const circuit = { ground: groundRef.current, elements: elementsRef.current };
    const cap = captureWaveform(circuit, solverStateRef.current, { dt, steps: totalSteps, probes: probesNow });

    // Broadband noise: fresh per capture, added before coupling so a
    // GND-coupled channel (coupling below replaces every sample with a
    // literal 0, regardless of what's here) still shows a perfectly flat
    // line rather than a noisy one — GND disconnects the input, so there's
    // nothing left for front-end noise to ride on.
    const traceKeys = Object.keys(cap.traces);
    for (const key of traceKeys) {
      const values = cap.traces[key];
      for (let i = 0; i < values.length; i++) values[i] += gaussianRandom() * NOISE_STDDEV_VOLTS;
    }

    // Coupling applies once, here, to the noisy captured samples — both the
    // trigger search below and the displayed trace see the same coupled
    // signal, the way a real scope's trigger comparator taps the vertical
    // amplifier downstream of the coupling switch.
    const couplingsNow = couplingsRef.current || {};
    for (const key of traceKeys) {
      cap.traces[key] = applyCoupling(cap.traces[key], couplingsNow[key] || 'DC');
    }

    // Trigger: the first crossing of `triggerLevel` on `triggerSource`, in
    // `triggerSlope`'s direction, so successive captures line up on the
    // same point in the cycle instead of visibly drifting. When no such
    // crossing exists in the search region — the level sits outside the
    // source's range, the source is GND-coupled (a flat line can't cross
    // anything), or the period is longer than the window — the capture
    // free-runs from sample 0 instead: still a perfectly valid capture,
    // just not stabilized, exactly like a real scope showing an
    // un-triggered sweep rather than refusing to display anything.
    const sourceKey = triggerSourceRef.current;
    const level = triggerLevelRef.current;
    const rising = triggerSlopeRef.current !== 'falling';
    const src = cap.traces[sourceKey];
    let triggerIdx = 0;
    let triggered = false;
    if (src) {
      for (let i = 1; i < searchSteps; i++) {
        const crossed = rising ? src[i - 1] <= level && src[i] > level : src[i - 1] >= level && src[i] < level;
        if (crossed) {
          triggerIdx = i;
          triggered = true;
          break;
        }
      }
    }

    // Trigger jitter: a small random offset in exactly where the capture
    // starts reading from, shared by every channel (see the constant's
    // comment above) — the trace shifts slightly left/right between
    // captures even for an otherwise-identical signal, which is what makes
    // reading a phase/timing value off the screen genuinely uncertain
    // rather than exact. Clamped to the same search region triggerIdx was
    // already found within, so the display window still fits inside the
    // buffer captureWaveform actually returned.
    const jitterSamples = Math.round((Math.random() * 2 - 1) * TRIGGER_JITTER_MAX_SAMPLES);
    triggerIdx = Math.min(searchSteps - 1, Math.max(0, triggerIdx + jitterSamples));

    const t0 = cap.time[triggerIdx];
    const time = new Array(SCOPE_DISPLAY_SAMPLES);
    const traces = {};
    for (const key of traceKeys) traces[key] = new Array(SCOPE_DISPLAY_SAMPLES);
    for (let k = 0; k < SCOPE_DISPLAY_SAMPLES; k++) {
      time[k] = cap.time[triggerIdx + k] - t0;
      for (const key of traceKeys) traces[key][k] = cap.traces[key][triggerIdx + k];
    }

    const result = { time, traces, triggered };
    lastCaptureRef.current = result;
    setDisplay(result);
  }, [solverStateRef]);

  useEffect(() => {
    if (!enabled || !running) return undefined;
    capture(); // paint immediately rather than waiting a full interval
    const id = setInterval(capture, SCOPE_REFRESH_MS);
    return () => clearInterval(id);
  }, [enabled, running, capture]);

  return { display, lastCaptureRef };
}
