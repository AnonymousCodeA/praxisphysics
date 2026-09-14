// Verifies the inductor companion model against known analytic results,
// the same way scripts/circuits-verify.mjs does for the capacitor. Run
// with: node scripts/circuits-inductor-verify.mjs
import { createCircuitState, stepCircuit } from '../lib/circuits/model.mjs';

function runSteps(circuit, state, dt, count) {
  let s = state;
  for (let i = 0; i < count; i++) {
    s = stepCircuit(circuit, s, dt).state;
  }
  return s;
}

function fmt(x, digits = 6) {
  return x.toFixed(digits).padStart(digits + 4);
}

// --- Test 1: RL current rise matches I0*(1-exp(-tR/L)) across several
// decades of L/R. R is held fixed (well above VSOURCE_SERIES_R, so the
// source's own internal resistance never distorts the result) and L is
// varied to sweep tau = L/R — the dual of circuits-verify.mjs's Test 1,
// which holds C fixed and sweeps R.

console.log('=== Test 1: RL current rise vs analytic I0*(1-e^(-tR/L)) ===');
console.log('tau(s)      t/tau   simulated(A)   exact(A)      error(%)');

const V0 = 5;
const R_FIXED = 1000; // ohm — comfortably above VSOURCE_SERIES_R (1e-6 ohm)
let test1MaxErrPct = 0;

for (const tau of [1e-6, 1e-3, 1, 1e3]) {
  const L = tau * R_FIXED;
  const circuit = {
    ground: 'gnd',
    elements: [
      { id: 'V1', type: 'vsource', nodes: ['src', 'gnd'], value: V0 },
      { id: 'R1', type: 'resistor', nodes: ['src', 'a'], value: R_FIXED },
      { id: 'L1', type: 'inductor', nodes: ['a', 'gnd'], value: L },
    ],
  };
  const dt = tau / 2000;
  const I0 = V0 / R_FIXED;

  let state = createCircuitState();
  let t = 0;
  for (const nTau of [1, 2, 3, 4, 5]) {
    const targetT = nTau * tau;
    while (t < targetT - dt / 2) {
      state = stepCircuit(circuit, state, dt).state;
      t += dt;
    }
    const sim = state.inductorCurrent.get('L1');
    const exact = I0 * (1 - Math.exp(-t / tau));
    const errPct = ((sim - exact) / exact) * 100;
    test1MaxErrPct = Math.max(test1MaxErrPct, Math.abs(errPct));
    console.log(
      `${tau.toExponential(0).padEnd(10)}  ${String(nTau).padStart(3)}     ${fmt(sim)}     ${fmt(
        exact
      )}    ${errPct.toFixed(4).padStart(8)}`
    );
  }
}
console.log(
  `max |error| = ${test1MaxErrPct.toFixed(4)}% — ${test1MaxErrPct < 0.5 ? 'PASS' : 'FAIL'} (tolerance 0.5%)`
);

// --- Test 2: series RLC step response rings at the analytic frequency and
// decays at the analytic rate. Rather than fit the closed form directly,
// this extracts both quantities from the raw simulated current the way an
// experimenter would: zero-crossing spacing for the (angular) frequency,
// and a log-linear fit through successive |peak| values for the decay
// rate. For f(t) = A*e^(-at)*sin(wd*t + phi), both are exact properties of
// the waveform (zero crossings are spaced exactly pi/wd apart regardless
// of damping, and successive extrema of |f| fall on a perfect exponential
// envelope — see the derivation in this file's own commit for why), so any
// deviation here reflects only the solver's numerical integration error.

console.log('\n=== Test 2: series RLC ringing — frequency and decay from a step ===');

const RLC_V0 = 5;
const RLC_R = 50; // ohm
const RLC_L = 1; // H
const RLC_C = 1e-6; // F
const omega0 = 1 / Math.sqrt(RLC_L * RLC_C);
const alpha = RLC_R / (2 * RLC_L);
const omegaD = Math.sqrt(omega0 ** 2 - alpha ** 2);
const period = (2 * Math.PI) / omegaD;
console.log(
  `omega0=${omega0.toFixed(3)} rad/s, alpha=${alpha.toFixed(3)} 1/s, omegaD=${omegaD.toFixed(3)} rad/s, period=${(
    period * 1000
  ).toFixed(4)} ms`
);

const rlcCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['src', 'gnd'], value: RLC_V0 },
    { id: 'R1', type: 'resistor', nodes: ['src', 'a'], value: RLC_R },
    { id: 'L1', type: 'inductor', nodes: ['a', 'b'], value: RLC_L },
    { id: 'C1', type: 'capacitor', nodes: ['b', 'gnd'], value: RLC_C },
  ],
};

const rlcDt = period / 1000;
const rlcSteps = Math.round((5 / alpha) / rlcDt); // ~5 decay time constants
let rlcState = createCircuitState();
const times = [0];
const currents = [0]; // I(0) = 0, zero initial conditions
for (let i = 1; i <= rlcSteps; i++) {
  rlcState = stepCircuit(rlcCircuit, rlcState, rlcDt).state;
  times.push(i * rlcDt);
  currents.push(rlcState.inductorCurrent.get('L1'));
}

// Zero crossings (linearly interpolated) are spaced pi/wd apart, i.e. half
// a period, for this waveform at ANY damping — so their average spacing,
// doubled, gives the period directly.
const crossings = [];
for (let i = 1; i < currents.length; i++) {
  const v0 = currents[i - 1];
  const v1 = currents[i];
  if ((v0 <= 0 && v1 > 0) || (v0 >= 0 && v1 < 0)) {
    const frac = v0 / (v0 - v1);
    crossings.push(times[i - 1] + frac * (times[i] - times[i - 1]));
  }
}
const crossingGaps = [];
for (let i = 1; i < crossings.length; i++) crossingGaps.push(crossings[i] - crossings[i - 1]);
const meanHalfPeriod = crossingGaps.reduce((a, b) => a + b, 0) / crossingGaps.length;
const periodMeasured = 2 * meanHalfPeriod;
const omegaDMeasured = (2 * Math.PI) / periodMeasured;
const omegaDErrPct = ((omegaDMeasured - omegaD) / omegaD) * 100;
console.log(
  `measured from ${crossings.length} zero crossings: period=${(periodMeasured * 1000).toFixed(
    4
  )} ms, omegaD=${omegaDMeasured.toFixed(3)} rad/s (error ${omegaDErrPct.toFixed(4)}%)`
);

// Local extrema of |I(t)| — same argument, they fall exactly pi/wd apart on
// a perfect e^(-alpha*t) envelope, so ln|peak| vs t is exactly linear with
// slope -alpha. Ordinary least squares through (t_k, ln|peak_k|).
const peaks = [];
for (let i = 1; i < currents.length - 1; i++) {
  const a = Math.abs(currents[i - 1]);
  const b = Math.abs(currents[i]);
  const c = Math.abs(currents[i + 1]);
  if (b >= a && b >= c && b > 0) peaks.push({ t: times[i], v: b });
}
const n = peaks.length;
const sumT = peaks.reduce((s, p) => s + p.t, 0);
const sumY = peaks.reduce((s, p) => s + Math.log(p.v), 0);
const sumTT = peaks.reduce((s, p) => s + p.t * p.t, 0);
const sumTY = peaks.reduce((s, p) => s + p.t * Math.log(p.v), 0);
const slope = (n * sumTY - sumT * sumY) / (n * sumTT - sumT * sumT);
const alphaMeasured = -slope;
const alphaErrPct = ((alphaMeasured - alpha) / alpha) * 100;
console.log(
  `measured from ${n} peak extrema (log-linear fit): alpha=${alphaMeasured.toFixed(3)} 1/s (error ${alphaErrPct.toFixed(
    4
  )}%)`
);

const test2Pass = Math.abs(omegaDErrPct) < 0.5 && Math.abs(alphaErrPct) < 0.5;
console.log(`${test2Pass ? 'PASS' : 'FAIL'} (tolerance 0.5% on both omegaD and alpha)`);

// --- Test 3: inductor current persists across a topology change — the
// dual of circuits-verify.mjs's Test 2 (charge sharing). There, capacitor
// VOLTAGE survives a reconnection unchanged; here, inductor CURRENT does,
// while picking up the new topology's own dynamics (a fresh RL decay)
// immediately afterward with no discontinuous jump.

console.log('\n=== Test 3: inductor current persists across a topology change ===');

const CHARGE_V0 = 6;
const R_CHARGE = 100;
const L1 = 1; // H
const tauCharge = L1 / R_CHARGE;
const dtCharge = tauCharge / 2000;

const chargingCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['src', 'gnd'], value: CHARGE_V0 },
    { id: 'SW1', type: 'switch', nodes: ['src', 'mid'], closed: true },
    { id: 'R1', type: 'resistor', nodes: ['mid', 'a'], value: R_CHARGE },
    { id: 'L1', type: 'inductor', nodes: ['a', 'gnd'], value: L1 },
  ],
};

let state3 = createCircuitState();
state3 = runSteps(chargingCircuit, state3, dtCharge, 15 * 2000); // 15 time constants
const iBeforeChange = state3.inductorCurrent.get('L1');
const iTarget = CHARGE_V0 / R_CHARGE;
console.log(`L1 built up to ${iBeforeChange.toFixed(6)} A (target ${iTarget.toFixed(6)} A)`);

// Topology change: the source/switch/charging resistor are gone, replaced
// by a bare decay resistor straight across the inductor's own two nodes —
// same element id, same nodes, so from the solver's point of view this is
// exactly "the branch this inductor used to see is now a different one."
const R_DECAY = 300;
const tauDecay = L1 / R_DECAY;
const decayCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'R2', type: 'resistor', nodes: ['a', 'gnd'], value: R_DECAY },
    { id: 'L1', type: 'inductor', nodes: ['a', 'gnd'], value: L1 },
  ],
};

const dtDecay = tauDecay / 2000;
let state3b = stepCircuit(decayCircuit, state3, dtDecay).state;
const iRightAfter = state3b.inductorCurrent.get('L1');
const expectedRightAfter = iBeforeChange * Math.exp(-dtDecay / tauDecay);
const jumpErrPct = ((iRightAfter - expectedRightAfter) / iBeforeChange) * 100;
console.log(
  `one step (${dtDecay.toExponential(2)} s) into the new topology: ${iRightAfter.toFixed(
    6
  )} A (expected ${expectedRightAfter.toFixed(6)} A from continuous decay, NOT a jump to/toward 0) — error ${jumpErrPct.toFixed(
    4
  )}% of the pre-change current`
);

let t3 = dtDecay;
let state3c = state3b;
let test3MaxErrPct = Math.abs(jumpErrPct);
for (const nTau of [1, 2, 3, 4, 5]) {
  const targetT = nTau * tauDecay;
  while (t3 < targetT - dtDecay / 2) {
    state3c = stepCircuit(decayCircuit, state3c, dtDecay).state;
    t3 += dtDecay;
  }
  const sim = state3c.inductorCurrent.get('L1');
  const exact = iBeforeChange * Math.exp(-t3 / tauDecay);
  const errPct = ((sim - exact) / exact) * 100;
  test3MaxErrPct = Math.max(test3MaxErrPct, Math.abs(errPct));
  console.log(`t/tauDecay=${nTau}: simulated=${fmt(sim)} A, exact=${fmt(exact)} A, error=${errPct.toFixed(4).padStart(8)}%`);
}
console.log(`max |error| = ${test3MaxErrPct.toFixed(4)}% — ${test3MaxErrPct < 0.5 ? 'PASS' : 'FAIL'} (tolerance 0.5%)`);

// --- Test 4: degenerate cases don't produce NaN/Infinity ---

console.log('\n=== Test 4: degenerate inductor cases stay finite ===');

let degenerateState = createCircuitState();
degenerateState.inductorCurrent.set('L1', 0.5);
degenerateState.inductorVoltage.set('L1', 0);

const degenerateCases = [
  {
    name: 'inductor in an open circuit (source cut off by an open switch)',
    circuit: {
      ground: 'gnd',
      elements: [
        { id: 'V1', type: 'vsource', nodes: ['a', 'b'], value: 9 },
        { id: 'L1', type: 'inductor', nodes: ['b', 'c'], value: 1e-3 },
        { id: 'SW1', type: 'switch', nodes: ['c', 'gnd'], closed: false },
      ],
    },
  },
  {
    // Genuinely open terminals — nothing else touches either node. Unlike
    // an isolated capacitor (which can sit at a fixed nonzero charge
    // indefinitely), a real current can't flow through an open break, so
    // the correct behaviour is for this to collapse toward 0A, not hold —
    // see the shorted-loop case below this list for the actual dual.
    name: 'inductor with no path to anything else at all',
    circuit: {
      ground: 'gnd',
      elements: [{ id: 'L1', type: 'inductor', nodes: ['a', 'b'], value: 1e-3 }],
    },
  },
  {
    name: 'zero inductance (floored — should behave like a near-ideal wire, not NaN)',
    circuit: {
      ground: 'gnd',
      elements: [
        { id: 'V1', type: 'vsource', nodes: ['a', 'gnd'], value: 9 },
        { id: 'L1', type: 'inductor', nodes: ['a', 'gnd'], value: 0 },
      ],
    },
  },
  {
    name: 'negative inductance (nonsensical input, still floored rather than NaN)',
    circuit: {
      ground: 'gnd',
      elements: [
        { id: 'V1', type: 'vsource', nodes: ['a', 'gnd'], value: 9 },
        { id: 'L1', type: 'inductor', nodes: ['a', 'gnd'], value: -1e-3 },
      ],
    },
  },
];

let allFinite = true;
for (const { name, circuit } of degenerateCases) {
  const { voltages, state: nextState } = stepCircuit(circuit, degenerateState, 1e-3);
  const voltageValues = [...voltages.values()];
  const inductorValues = [...nextState.inductorCurrent.values(), ...nextState.inductorVoltage.values()];
  const finite = voltageValues.every(Number.isFinite) && inductorValues.every(Number.isFinite);
  allFinite = allFinite && finite;
  console.log(
    `${finite ? 'ok  ' : 'FAIL'} — ${name}: voltages [${voltageValues.map((v) => v.toFixed(3)).join(', ')}], inductor state [${inductorValues
      .map((v) => v.toFixed(6))
      .join(', ')}]`
  );
}

console.log(allFinite ? 'PASS — no NaN/Infinity in any degenerate case' : 'FAIL — a degenerate case produced NaN/Infinity');

// Bonus, not one of the required degenerate cases above (that "no path at
// all" case is genuinely an open circuit — current through an open break
// must be zero, so it correctly collapses to 0A, not held, as Test 4 shows):
// a wire shorted directly across the inductor's own two terminals forces
// V=0 across it always, hence dI/dt=0 forever — a real closed
// superconducting-style loop, and the actual dual of the capacitor's
// "holds its charge with open terminals" case (there, an open circuit is
// what lets the state persist; here, a SHORT is what does).
console.log('\n=== Bonus: a wire-shorted inductor loop holds its current (true dual of an isolated capacitor) ===');
const shortedCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'L1', type: 'inductor', nodes: ['a', 'b'], value: 1e-3 },
    { id: 'W1', type: 'wire', nodes: ['a', 'b'] },
  ],
};
let shortState = createCircuitState();
shortState.inductorCurrent.set('L1', 0.5);
shortState = runSteps(shortedCircuit, shortState, 1e-3, 1000);
const shortedCurrent = shortState.inductorCurrent.get('L1');
const shortedDriftPct = ((shortedCurrent - 0.5) / 0.5) * 100;
const shortedOk = Number.isFinite(shortedCurrent) && Math.abs(shortedDriftPct) < 1e-6;
console.log(
  `held for 1000 steps: ${shortedCurrent.toFixed(9)} A (started at 0.5 A, drift ${shortedDriftPct.toExponential(2)}%) — ${
    shortedOk ? 'PASS' : 'FAIL'
  }`
);
