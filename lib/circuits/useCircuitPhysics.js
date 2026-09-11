'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createCircuitState, stepCircuit } from './model.mjs';

const DT = 1 / 200; // s — fixed step for the MNA solver
const DT_MS = DT * 1000;
const MAX_CATCHUP_MS = 120000; // safety valve for a slept/minimized tab
const POLL_MS = 20;
const RENDER_MS = 50; // how often the live meter readout actually re-renders

// Solves the board's circuit continuously via lib/circuits/model.mjs, on a
// wall-clock fixed-step accumulator decoupled from rendering — same
// reasoning as lib/pendulum/usePendulumPhysics.js: a capacitor mid-charge is
// a real-time transient a student is measuring, so this must keep running
// while the tab is backgrounded or the canvas is off-screen, exactly like
// the pendulum's swing. Unlike the pendulum, there's no "held" vs
// "swinging" mode — the circuit is just always solving.
//
// `elements`/`ground` describe the CURRENT topology and are read fresh every
// tick via a ref, so placing/removing/toggling a component takes effect on
// the very next step without restarting the accumulator or losing capacitor
// charge — that persistence lives entirely in model.mjs's per-id state,
// which this hook carries forward across ticks (and across topology
// changes) in `solverStateRef`.
export function useCircuitPhysics({ elements, ground }) {
  const elementsRef = useRef(elements);
  const groundRef = useRef(ground);
  const solverStateRef = useRef(createCircuitState());
  const accumMsRef = useRef(0);
  const lastRealRef = useRef(0);
  const lastRenderRef = useRef(0);
  const [voltages, setVoltages] = useState(new Map());

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  useEffect(() => {
    groundRef.current = ground;
  }, [ground]);

  const stepPhysics = useCallback(() => {
    const now = performance.now();
    let elapsed = now - lastRealRef.current;
    lastRealRef.current = now;
    if (elapsed > MAX_CATCHUP_MS) elapsed = MAX_CATCHUP_MS;
    accumMsRef.current += elapsed;

    let latest = null;
    while (accumMsRef.current >= DT_MS) {
      latest = stepCircuit({ ground: groundRef.current, elements: elementsRef.current }, solverStateRef.current, DT);
      solverStateRef.current = latest.state;
      accumMsRef.current -= DT_MS;
    }

    if (latest && now - lastRenderRef.current >= RENDER_MS) {
      lastRenderRef.current = now;
      setVoltages(latest.voltages);
    }
  }, []);

  useEffect(() => {
    lastRealRef.current = performance.now();
    const id = setInterval(stepPhysics, POLL_MS);
    return () => clearInterval(id);
  }, [stepPhysics]);

  // Explicit discharge: zero a capacitor's stored charge/current in place,
  // regardless of whether it's currently on the board or sitting in stock —
  // the model only ever looks this up by id, so it's safe either way.
  const dischargeCapacitor = useCallback((instanceId) => {
    const s = solverStateRef.current;
    const capacitorCharge = new Map(s.capacitorCharge);
    const capacitorCurrent = new Map(s.capacitorCurrent);
    capacitorCharge.delete(instanceId);
    capacitorCurrent.delete(instanceId);
    solverStateRef.current = { ...s, capacitorCharge, capacitorCurrent };
  }, []);

  const capacitorVoltage = useCallback((instanceId, capacitance) => {
    const s = solverStateRef.current;
    return s.capacitorCharge.has(instanceId) ? s.capacitorCharge.get(instanceId) / capacitance : 0;
  }, []);

  return { voltages, solverStateRef, dischargeCapacitor, capacitorVoltage };
}
