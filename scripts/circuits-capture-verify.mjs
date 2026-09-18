// Verifies lib/circuits/capture.mjs's captureWaveform against known analytic
// results, the same way scripts/circuits-verify.mjs and
// circuits-inductor-verify.mjs do for stepCircuit itself. Run with:
// node scripts/circuits-capture-verify.mjs
import { createCircuitState, stepCircuit } from '../lib/circuits/model.mjs';
import { captureWaveform } from '../lib/circuits/capture.mjs';

function fmt(x, digits = 6) {
  return x.toFixed(digits).padStart(digits + 4);
}

// --- Test 1: a plain resistive divider driven by a DC source — the
// captured trace should be flat at the expected value at every sample,
// since there's nothing reactive to settle: no capacitor/inductor state,
// so even the very first sample should already be exact (modulo GMIN).

console.log('=== Test 1: resistive divider — captured trace is flat at V0*R2/(R1+R2) ===');

const V0_1 = 9;
const R1_1 = 1000;
const R2_1 = 2000;
const dividerCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['src', 'gnd'], value: V0_1 },
    { id: 'R1', type: 'resistor', nodes: ['src', 'mid'], value: R1_1 },
    { id: 'R2', type: 'resistor', nodes: ['mid', 'gnd'], value: R2_1 },
  ],
};
const expectedDivider = (V0_1 * R2_1) / (R1_1 + R2_1);

const WINDOW_1 = 1e-3; // s
const STEPS_1 = 200;
const DT_1 = WINDOW_1 / STEPS_1; // 5 us — chosen from the window, not hardcoded

const cap1 = captureWaveform(dividerCircuit, createCircuitState(), {
  dt: DT_1,
  steps: STEPS_1,
  probes: [{ id: 'mid', nodes: ['mid', 'gnd'] }],
});

let test1MaxErrPct = 0;
for (const v of cap1.traces.mid) {
  const errPct = (Math.abs(v - expectedDivider) / expectedDivider) * 100;
  test1MaxErrPct = Math.max(test1MaxErrPct, errPct);
}
console.log(
  `${STEPS_1} samples over ${(WINDOW_1 * 1000).toFixed(2)} ms (dt=${DT_1.toExponential(2)} s): expected ${expectedDivider.toFixed(
    6
  )} V, max deviation ${test1MaxErrPct.toExponential(3)}%`
);
console.log(`${test1MaxErrPct < 1e-6 ? 'PASS' : 'FAIL'} (tolerance 1e-6%)`);

// --- Test 2: an RC circuit's step response. Starting from a fresh state
// (capacitor charge 0) with the source connected straight through is
// exactly the boundary condition for V0*(1 - e^(-t/RC)) from t=0, so the
// whole captured trace — not just a few sampled points — should match it.
// Near t=0 the exact value itself is near zero, so the check below uses an
// absolute-plus-relative tolerance rather than a bare relative one.

console.log("\n=== Test 2: RC step response — captured trace vs V0*(1-e^(-t/RC)) ===");

const V0_2 = 5;
const R_2 = 10000; // ohm
const C_2 = 100e-9; // F
const RC = R_2 * C_2; // 1 ms
const rcCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['src', 'gnd'], value: V0_2 },
    { id: 'R1', type: 'resistor', nodes: ['src', 'a'], value: R_2 },
    { id: 'C1', type: 'capacitor', nodes: ['a', 'gnd'], value: C_2 },
  ],
};

const WINDOW_2 = 5 * RC;
const STEPS_2 = 2000;
const DT_2 = WINDOW_2 / STEPS_2; // 2.5 us — RC/400, plenty fine for trapezoidal

const cap2 = captureWaveform(rcCircuit, createCircuitState(), {
  dt: DT_2,
  steps: STEPS_2,
  probes: [{ id: 'vc', nodes: ['a', 'gnd'] }],
});

const ABS_TOL_2 = V0_2 * 1e-4;
const REL_TOL_2 = 1e-3;
let test2MaxRatio = 0;
for (let i = 0; i < STEPS_2; i++) {
  const t = cap2.time[i];
  const exact = V0_2 * (1 - Math.exp(-t / RC));
  const err = Math.abs(cap2.traces.vc[i] - exact);
  const tol = ABS_TOL_2 + REL_TOL_2 * Math.abs(exact);
  test2MaxRatio = Math.max(test2MaxRatio, err / tol);
}
console.log(
  `${STEPS_2} samples over ${(WINDOW_2 * 1000).toFixed(3)} ms (dt=${DT_2.toExponential(
    2
  )} s, RC=${(RC * 1000).toFixed(3)} ms): worst sample used ${(test2MaxRatio * 100).toFixed(
    2
  )}% of its tolerance budget (abs=${ABS_TOL_2} V, rel=${REL_TOL_2 * 100}%)`
);
console.log(`${test2MaxRatio < 1 ? 'PASS' : 'FAIL'} (every sample within its tolerance)`);

// --- Test 3: a series RLC ring. Probing the resistor's own voltage (= I*R)
// gives a signal that oscillates and decays toward zero, the same waveform
// circuits-inductor-verify.mjs reads directly off inductorCurrent — so the
// same zero-crossing-spacing trick recovers the analytic ringing frequency
// from nothing but the captured samples, exactly as a student reading a
// real scope trace would.

console.log('\n=== Test 3: series RLC ring — omegaD recovered from captured zero crossings ===');

const V0_3 = 5;
const R_3 = 50; // ohm
const L_3 = 1; // H
const C_3 = 1e-6; // F
const omega0 = 1 / Math.sqrt(L_3 * C_3);
const alpha = R_3 / (2 * L_3);
const omegaD = Math.sqrt(omega0 ** 2 - alpha ** 2);
const period = (2 * Math.PI) / omegaD;

const rlcCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['src', 'gnd'], value: V0_3 },
    { id: 'R1', type: 'resistor', nodes: ['src', 'a'], value: R_3 },
    { id: 'L1', type: 'inductor', nodes: ['a', 'b'], value: L_3 },
    { id: 'C1', type: 'capacitor', nodes: ['b', 'gnd'], value: C_3 },
  ],
};

const DT_3 = period / 1000;
const WINDOW_3 = 5 / alpha; // ~5 decay time constants
const STEPS_3 = Math.round(WINDOW_3 / DT_3);

const cap3 = captureWaveform(rlcCircuit, createCircuitState(), {
  dt: DT_3,
  steps: STEPS_3,
  probes: [{ id: 'vr', nodes: ['src', 'a'] }], // I*R — oscillates about 0
});

const crossings = [];
for (let i = 1; i < cap3.time.length; i++) {
  const v0 = cap3.traces.vr[i - 1];
  const v1 = cap3.traces.vr[i];
  if ((v0 <= 0 && v1 > 0) || (v0 >= 0 && v1 < 0)) {
    const frac = v0 / (v0 - v1);
    crossings.push(cap3.time[i - 1] + frac * (cap3.time[i] - cap3.time[i - 1]));
  }
}
const gaps = [];
for (let i = 1; i < crossings.length; i++) gaps.push(crossings[i] - crossings[i - 1]);
const meanHalfPeriod = gaps.reduce((a, b) => a + b, 0) / gaps.length;
const periodMeasured = 2 * meanHalfPeriod;
const omegaDMeasured = (2 * Math.PI) / periodMeasured;
const omegaDErrPct = ((omegaDMeasured - omegaD) / omegaD) * 100;

console.log(
  `analytic omegaD=${omegaD.toFixed(3)} rad/s (period=${(period * 1000).toFixed(4)} ms); captured ${
    STEPS_3
  } samples (dt=${DT_3.toExponential(2)} s) over ${(WINDOW_3 * 1000).toFixed(2)} ms, found ${
    crossings.length
  } zero crossings`
);
console.log(`measured omegaD=${omegaDMeasured.toFixed(3)} rad/s, error ${omegaDErrPct.toFixed(4)}%`);
console.log(`${Math.abs(omegaDErrPct) < 0.5 ? 'PASS' : 'FAIL'} (tolerance 0.5%)`);

// --- Test 4: a capture must not mutate the caller's state. Build up real
// capacitor charge and inductor current first (via ordinary stepCircuit
// calls, exactly like the bench's own real-time loop), snapshot them, run a
// capture from that same state object, then confirm every value is still
// there afterward — a capture is an observation, not an advance of the
// bench's own simulation.

console.log("\n=== Test 4: capture doesn't mutate the caller's state ===");

const stateCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['src', 'gnd'], value: 6 },
    { id: 'R1', type: 'resistor', nodes: ['src', 'a'], value: 200 },
    { id: 'L1', type: 'inductor', nodes: ['a', 'b'], value: 0.5 },
    { id: 'C1', type: 'capacitor', nodes: ['b', 'gnd'], value: 1e-6 },
  ],
};

let state4 = createCircuitState();
for (let i = 0; i < 500; i++) {
  state4 = stepCircuit(stateCircuit, state4, 1e-5).state;
}

const before = {
  capacitorCharge: new Map(state4.capacitorCharge),
  capacitorCurrent: new Map(state4.capacitorCurrent),
  inductorCurrent: new Map(state4.inductorCurrent),
  inductorVoltage: new Map(state4.inductorVoltage),
  topologySignature: state4.topologySignature,
};

captureWaveform(stateCircuit, state4, {
  dt: 1e-7,
  steps: 500,
  probes: [{ id: 'vc', nodes: ['b', 'gnd'] }],
});

function mapsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    if (!b.has(k) || b.get(k) !== v) return false;
  }
  return true;
}

const unchanged =
  mapsEqual(before.capacitorCharge, state4.capacitorCharge) &&
  mapsEqual(before.capacitorCurrent, state4.capacitorCurrent) &&
  mapsEqual(before.inductorCurrent, state4.inductorCurrent) &&
  mapsEqual(before.inductorVoltage, state4.inductorVoltage) &&
  before.topologySignature === state4.topologySignature;

console.log(`capacitor charge before/after: ${before.capacitorCharge.get('C1')} / ${state4.capacitorCharge.get('C1')}`);
console.log(`inductor current before/after: ${before.inductorCurrent.get('L1')} / ${state4.inductorCurrent.get('L1')}`);
console.log(`${unchanged ? 'PASS' : 'FAIL'} — caller's state ${unchanged ? 'is' : 'is NOT'} unchanged after capture`);
