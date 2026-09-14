'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { quantize } from '@/lib/instruments/reading';

const AMBIENT_C = 25;
const MAX_TEMP_C = 80; // the thermistor's rated limit — the heater can't exceed it
const HEAT_SECONDS_25_TO_80 = 120; // "roughly two minutes"
const HEAT_RATE_C_PER_S = (MAX_TEMP_C - AMBIENT_C) / HEAT_SECONDS_25_TO_80;
const COOL_TIME_CONSTANT_S = 300; // 5 minutes — noticeably slower than heating, per spec
const POLL_MS = 200;
const RESOLUTION_C = 0.1; // a realistic digital thermometer's resolution

// A heater's temperature, on an analytic (not stepped) thermal model: while
// on, constant-power heating is a plain linear ramp capped at MAX_TEMP_C
// (a thermostatic cutoff, not an asymptote); while off, Newtonian cooling
// is the usual exponential relaxation back toward ambient. Both have closed
// forms, so temperature is computed directly from wall-clock time elapsed
// since the last on/off transition rather than integrated step by step —
// exact, and with nothing to accumulate error in even if a background tab
// throttles the poll interval.
//
// `displayTemperature` is quantized to RESOLUTION_C — this is also the
// value a thermistor reading this heater should actually use (see
// CircuitBench.js): there's no thermal lag modeled between the heater and
// the thermistor, so the thermistor sits at exactly the displayed
// temperature, never a hidden higher-precision one.
export function useHeater() {
  const [on, setOn] = useState(false);
  const [temperature, setTemperature] = useState(AMBIENT_C);
  const modeRef = useRef({ on: false, startTime: performance.now(), startTemp: AMBIENT_C });

  const computeTemperature = useCallback(() => {
    const { on: modeOn, startTime, startTemp } = modeRef.current;
    const elapsedS = (performance.now() - startTime) / 1000;
    if (modeOn) {
      return Math.min(MAX_TEMP_C, startTemp + HEAT_RATE_C_PER_S * elapsedS);
    }
    return AMBIENT_C + (startTemp - AMBIENT_C) * Math.exp(-elapsedS / COOL_TIME_CONSTANT_S);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTemperature(computeTemperature()), POLL_MS);
    return () => clearInterval(id);
  }, [computeTemperature]);

  const setHeaterOn = useCallback(
    (nextOn) => {
      setOn((prevOn) => {
        if (prevOn === nextOn) return prevOn;
        modeRef.current = { on: nextOn, startTime: performance.now(), startTemp: computeTemperature() };
        return nextOn;
      });
      setTemperature(computeTemperature());
    },
    [computeTemperature]
  );

  return { on, setHeaterOn, displayTemperature: quantize(temperature, RESOLUTION_C) };
}
