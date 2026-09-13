// Verifies the MNA circuit model against known analytic results before any
// wire gets drawn on a bench. Run with: node scripts/circuits-verify.mjs
import {
  createCircuitState,
  stepCircuit,
  ammeterReading,
  VSOURCE_SERIES_R,
  gminLeakTimeConstant,
} from '../lib/circuits/model.mjs';

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

// --- Test 1: RC discharge matches V0*exp(-t/RC) across several decades of tau ---

console.log('=== Test 1: RC discharge vs analytic exponential ===');
console.log('tau(s)      t/tau   simulated(V)   exact(V)      error(%)');

const V0 = 5;
const C_FIXED = 1e-6;
let test1MaxErrPct = 0;

for (const tau of [1e-6, 1e-3, 1, 1e3]) {
  const R = tau / C_FIXED;
  const circuit = {
    ground: 'gnd',
    elements: [
      { id: 'R1', type: 'resistor', nodes: ['a', 'gnd'], value: R },
      { id: 'C1', type: 'capacitor', nodes: ['a', 'gnd'], value: C_FIXED },
    ],
  };
  const dt = tau / 2000;

  let state = createCircuitState();
  state.capacitorCharge.set('C1', C_FIXED * V0);

  let t = 0;
  for (const nTau of [1, 2, 3, 4, 5]) {
    const targetT = nTau * tau;
    while (t < targetT - dt / 2) {
      state = stepCircuit(circuit, state, dt).state;
      t += dt;
    }
    const sim = state.capacitorCharge.get('C1') / C_FIXED;
    const exact = V0 * Math.exp(-t / tau);
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

// --- Test 2: charge sharing between two capacitors conserves charge ---

console.log('\n=== Test 2: charge sharing (charge C1, disconnect, connect to C2) ===');

const CHARGE_V0 = 6;
const R_CHARGE = 1000;
const C1 = 1e-6;
const C2 = 3e-6;
const tauCharge = R_CHARGE * C1;
const dtCharge = tauCharge / 2000;

const chargingCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['src', 'gnd'], value: CHARGE_V0 },
    { id: 'SW1', type: 'switch', nodes: ['src', 'mid'], closed: true },
    { id: 'R1', type: 'resistor', nodes: ['mid', 'a'], value: R_CHARGE },
    { id: 'C1', type: 'capacitor', nodes: ['a', 'gnd'], value: C1 },
  ],
};

let state = createCircuitState();
state = runSteps(chargingCircuit, state, dtCharge, 15 * 2000); // 15 time constants

const vAfterCharge = state.capacitorCharge.get('C1') / C1;
console.log(`C1 charged to ${vAfterCharge.toFixed(6)} V (target ${CHARGE_V0} V)`);

// Disconnect: switch open, C1 isolated with no discharge path. Hold for a
// while and confirm the charge doesn't leak away in the meantime.
const disconnectedCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['src', 'gnd'], value: CHARGE_V0 },
    { id: 'SW1', type: 'switch', nodes: ['src', 'mid'], closed: false },
    { id: 'R1', type: 'resistor', nodes: ['mid', 'a'], value: R_CHARGE },
    { id: 'C1', type: 'capacitor', nodes: ['a', 'gnd'], value: C1 },
  ],
};
state = runSteps(disconnectedCircuit, state, dtCharge, 1000);
const vAfterHold = state.capacitorCharge.get('C1') / C1;
console.log(
  `C1 after holding disconnected: ${vAfterHold.toFixed(6)} V (drift ${(
    ((vAfterHold - vAfterCharge) / vAfterCharge) *
    100
  ).toExponential(2)}%)`
);

const qBefore = C1 * vAfterHold + C2 * 0; // C2 never touched: starts uncharged

// Connect: wire C1 straight across a fresh, uncharged C2. The companion
// model reduces this to one node, so a single step gives the exact
// analytic charge-sharing result regardless of dt.
const sharingCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'C1', type: 'capacitor', nodes: ['a', 'gnd'], value: C1 },
    { id: 'W1', type: 'wire', nodes: ['a', 'b'] },
    { id: 'C2', type: 'capacitor', nodes: ['b', 'gnd'], value: C2 },
  ],
};
state = stepCircuit(sharingCircuit, state, dtCharge).state;

const vFinal = state.capacitorCharge.get('C1') / C1;
const v2Final = state.capacitorCharge.get('C2') / C2;
const qAfter = C1 * vFinal + C2 * v2Final;
const expectedVFinal = (vAfterHold * C1) / (C1 + C2);

console.log(`C1 final: ${vFinal.toFixed(6)} V, C2 final: ${v2Final.toFixed(6)} V (should be equal)`);
console.log(`expected V = V0*C1/(C1+C2) = ${expectedVFinal.toFixed(6)} V, simulated = ${vFinal.toFixed(6)} V`);
console.log(`charge before = ${qBefore.toExponential(6)} C, charge after = ${qAfter.toExponential(6)} C`);
const chargeErrPct = (Math.abs(qAfter - qBefore) / qBefore) * 100;
const voltageErrPct = (Math.abs(vFinal - expectedVFinal) / expectedVFinal) * 100;
console.log(
  `charge conservation error = ${chargeErrPct.toExponential(2)}%, final-voltage error = ${voltageErrPct.toExponential(
    2
  )}% — ${chargeErrPct < 1e-6 && voltageErrPct < 1e-6 ? 'PASS' : 'FAIL'} (tolerance 1e-6%)`
);

// --- Test 3: charge-cycling (problem 1 Part B) — U_N linear then saturating ---

console.log('\n=== Test 3: charge cycling, small Cp dumped repeatedly onto large C ===');

const U0 = 10;
const Cp = 1e-9;
const CBig = 1e-6;
const R_CYCLE = 1000;
const tauCycle = R_CYCLE * Cp;
const dtCycle = tauCycle / 25;
const CHARGE_STEPS = 25 * 10; // 10 time constants per charge phase

function chargeCircuitFor() {
  return {
    ground: 'gnd',
    elements: [
      { id: 'V1', type: 'vsource', nodes: ['src', 'gnd'], value: U0 },
      { id: 'R1', type: 'resistor', nodes: ['src', 'p'], value: R_CYCLE },
      { id: 'Cp', type: 'capacitor', nodes: ['p', 'gnd'], value: Cp },
    ],
  };
}
const dumpCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'Cp', type: 'capacitor', nodes: ['p', 'gnd'], value: Cp },
    { id: 'W1', type: 'wire', nodes: ['p', 'big'] },
    { id: 'CBig', type: 'capacitor', nodes: ['big', 'gnd'], value: CBig },
  ],
};

let cycState = createCircuitState();
const r = CBig / (CBig + Cp);
const sampleNs = new Set([1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 3000]);
const maxN = 3000;

console.log('N       U_N sim(V)   U_N analytic(V)   error(%)   regime');
for (let n = 1; n <= maxN; n++) {
  cycState = runSteps(chargeCircuitFor(), cycState, dtCycle, CHARGE_STEPS);
  cycState = stepCircuit(dumpCircuit, cycState, dtCycle).state;

  if (sampleNs.has(n)) {
    const uSim = cycState.capacitorCharge.get('CBig') / CBig;
    const uAnalytic = U0 * (1 - Math.pow(r, n));
    const errPct = ((uSim - uAnalytic) / uAnalytic) * 100;
    const regime = (n * Cp) / CBig < 0.05 ? 'linear' : 'saturating';
    console.log(
      `${String(n).padStart(5)}   ${fmt(uSim)}     ${fmt(uAnalytic)}       ${errPct.toFixed(4).padStart(8)}   ${regime}`
    );
  }
}

// Linear-regime gradient check: dU/dN should be ~ Cp*U0/CBig while N*Cp << C.
// Use the very first cycle (N=1, starting from an uncharged C) rather than a
// finite difference over many cycles: the analytic recursion U_N =
// U0*(1-r^N) is only exactly linear in the N->0 limit, so averaging over a
// wider span mixes in real curvature of that formula itself, not simulation
// error.
let linState = createCircuitState();
linState = runSteps(chargeCircuitFor(), linState, dtCycle, CHARGE_STEPS);
linState = stepCircuit(dumpCircuit, linState, dtCycle).state;
const measuredGradient = linState.capacitorCharge.get('CBig') / CBig;
const expectedGradient = (Cp * U0) / CBig;
const gradientErrPct = (Math.abs(measuredGradient - expectedGradient) / expectedGradient) * 100;
console.log(
  `\nlinear-regime gradient: measured = ${measuredGradient.toExponential(
    6
  )} V/cycle, expected Cp*U0/C = ${expectedGradient.toExponential(6)} V/cycle, error = ${gradientErrPct.toFixed(
    4
  )}% — ${gradientErrPct < 1 ? 'PASS' : 'FAIL'} (tolerance 1%)`
);

const uFinal = cycState.capacitorCharge.get('CBig') / CBig;
console.log(
  `after ${maxN} cycles: U_N = ${uFinal.toFixed(4)} V, approaching U0 = ${U0} V (${((uFinal / U0) * 100).toFixed(
    2
  )}% of saturation) — confirms curvature toward saturation`
);

// --- Test 4: ammeter reads current via a shunt of explicit resistance ---

console.log('\n=== Test 4: ammeter (series shunt) reads the loop current ===');

const AMMETER_V0 = 5;
const AMMETER_R = 1000;
const SHUNT_OHMS = 0.01;

const ammeterCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['b', 'gnd'], value: AMMETER_V0 },
    { id: 'R1', type: 'resistor', nodes: ['b', 'c'], value: AMMETER_R },
    { id: 'A1', type: 'ammeter', nodes: ['c', 'gnd'], shuntOhms: SHUNT_OHMS },
  ],
};
const { voltages: ammeterVoltages } = stepCircuit(ammeterCircuit, createCircuitState(), 1e-3);
const iMeasured = ammeterReading(ammeterCircuit, ammeterVoltages, 'A1');
const iExact = AMMETER_V0 / (AMMETER_R + SHUNT_OHMS + VSOURCE_SERIES_R); // what the loop actually carries
const iIdeal = AMMETER_V0 / AMMETER_R; // if the shunt (and the source's own series R) weren't there

console.log(`measured current   = ${iMeasured.toExponential(6)} A`);
console.log(`exact loop current = ${iExact.toExponential(6)} A  (R + R_shunt + source's own series R)`);
console.log(`ideal (R alone)    = ${iIdeal.toExponential(6)} A`);

const errVsExactPct = (Math.abs(iMeasured - iExact) / iExact) * 100;
console.log(
  `measured vs exact loop current: error = ${errVsExactPct.toExponential(2)}% — ${
    errVsExactPct < 1e-6 ? 'PASS' : 'FAIL'
  } (tolerance 1e-6%)`
);

const shuntBiasPct = (Math.abs(iIdeal - iExact) / iIdeal) * 100;
console.log(
  `systematic bias from the ammeter's own shuntOhms: ${shuntBiasPct.toFixed(4)}% low ` +
    `(≈ R_shunt/R = ${((SHUNT_OHMS / AMMETER_R) * 100).toFixed(4)}%) — a deliberate, usable error, not a bug`
);

// --- Test 5: a meter's nodes must be flagged floating when cut off from
// every source, and NOT flagged just because a resistor chain doesn't
// happen to be wire-merged with a source terminal ---

console.log('\n=== Test 5: floating-node detection ===');

// Same shape as the reported bug: battery - switch1(open) - a wire-tied
// middle section a voltmeter taps across - switch2(open) - capacitor -
// resistor - back to the battery. Both switches open isolates the middle
// section from every source; it must read as floating, not a number.
const floatingBugCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['top', 'gnd'], value: 6 },
    { id: 'SW1', type: 'switch', nodes: ['top', 'mid'], closed: false },
    { id: 'W1', type: 'wire', nodes: ['mid', 'mid2'] },
    { id: 'VM', type: 'meter', nodes: ['mid', 'mid2'] },
    { id: 'SW2', type: 'switch', nodes: ['mid2', 'n4'], closed: false },
    { id: 'C1', type: 'capacitor', nodes: ['n4', 'n5'], value: 100e-6 },
    { id: 'R1', type: 'resistor', nodes: ['n5', 'gnd'], value: 4700 },
  ],
};
const bugResult = stepCircuit(floatingBugCircuit, createCircuitState(), 1e-3);
const bothOpenFloating = bugResult.floatingNodes.has('mid') && bugResult.floatingNodes.has('mid2');
console.log(`both switches open: mid/mid2 flagged floating = ${bothOpenFloating} — ${bothOpenFloating ? 'PASS' : 'FAIL'}`);

// Closing either switch reconnects the section to the source; it must stop
// being flagged.
const oneClosedCircuit = {
  ...floatingBugCircuit,
  elements: floatingBugCircuit.elements.map((el) => (el.id === 'SW1' ? { ...el, closed: true } : el)),
};
const oneClosedResult = stepCircuit(oneClosedCircuit, createCircuitState(), 1e-3);
const reconnected = !oneClosedResult.floatingNodes.has('mid') && !oneClosedResult.floatingNodes.has('mid2');
console.log(`closing SW1: mid/mid2 no longer floating = ${reconnected} — ${reconnected ? 'PASS' : 'FAIL'}`);

// Regression: a plain series resistor chain must NOT be flagged floating
// just because a resistor (unlike a wire or closed switch) doesn't get
// union-merged with anything — the junction between two resistors is a
// real, current-carrying node, reached via a real conducting path.
const seriesCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'V1', type: 'vsource', nodes: ['a', 'gnd'], value: 6 },
    { id: 'R1', type: 'resistor', nodes: ['a', 'b'], value: 1000 },
    { id: 'R2', type: 'resistor', nodes: ['b', 'gnd'], value: 1000 },
    { id: 'VM', type: 'meter', nodes: ['b', 'gnd'] },
  ],
};
const seriesResult = stepCircuit(seriesCircuit, createCircuitState(), 1e-3);
const noFalsePositive = seriesResult.floatingNodes.size === 0;
console.log(
  `series resistor divider (no explicit wire at the junction): floatingNodes = [${[...seriesResult.floatingNodes]}] — ${
    noFalsePositive ? 'PASS' : 'FAIL'
  } (should be empty)`
);

// --- Degenerate cases: must not crash or produce NaN ---

console.log('\n=== Degenerate cases: no crash, no NaN ===');

const degenerateCases = [
  {
    name: 'floating node (dangling resistor to nowhere)',
    circuit: {
      ground: 'gnd',
      elements: [
        { id: 'V1', type: 'vsource', nodes: ['a', 'gnd'], value: 5 },
        { id: 'R1', type: 'resistor', nodes: ['a', 'gnd'], value: 100 },
        { id: 'R2', type: 'resistor', nodes: ['floaty', 'gnd'], value: 1e12 },
      ],
    },
  },
  {
    name: 'shorted voltage source (V+ wired to V-)',
    circuit: {
      ground: 'gnd',
      elements: [
        { id: 'V1', type: 'vsource', nodes: ['a', 'gnd'], value: 9 },
        { id: 'W1', type: 'wire', nodes: ['a', 'gnd'] },
      ],
    },
  },
  {
    name: 'open circuit (source cut off by an open switch)',
    circuit: {
      ground: 'gnd',
      elements: [
        { id: 'V1', type: 'vsource', nodes: ['a', 'b'], value: 9 },
        { id: 'SW1', type: 'switch', nodes: ['b', 'gnd'], closed: false },
      ],
    },
  },
];

let degenerateState = createCircuitState();
degenerateState.capacitorCharge.set('C1', 1e-6 * 7);
degenerateCases.push({
  name: 'capacitor with no discharge path at all',
  circuit: {
    ground: 'gnd',
    elements: [{ id: 'C1', type: 'capacitor', nodes: ['a', 'b'], value: 1e-6 }],
  },
});

let allFinite = true;
for (const { name, circuit } of degenerateCases) {
  const { voltages } = stepCircuit(circuit, degenerateState, 1e-3);
  const values = [...voltages.values()];
  const finite = values.every(Number.isFinite);
  allFinite = allFinite && finite;
  console.log(`${finite ? 'ok  ' : 'FAIL'} — ${name}: ${values.map((v) => v.toFixed(3)).join(', ')}`);
}
console.log(allFinite ? 'PASS — no NaN/Infinity in any degenerate case' : 'FAIL — a degenerate case produced NaN/Infinity');

// --- Numerical conveniences that stand in for real physical effects ---
// These constants keep the solver well-posed for degenerate topologies, but
// each corresponds to something a real bench circuit actually has, so it's
// worth knowing their size relative to the experiments run above.

console.log('\n=== Numerical parameters, read as physical quantities ===');
console.log(
  `VSOURCE_SERIES_R = ${VSOURCE_SERIES_R} ohm — stands in for real battery internal resistance ` +
    `(negligible next to the kilohm-scale resistors used above, so it doesn't distort any reading)`
);
const smallestCapacitance = Math.min(C_FIXED, C1, C2, Cp, CBig);
const leakTau = gminLeakTimeConstant(smallestCapacitance);
console.log(
  `GMIN leak, against the smallest capacitor used here (Cp = ${smallestCapacitance.toExponential(0)} F): ` +
    `time constant = ${leakTau.toExponential(3)} s (~${(leakTau / 3600).toFixed(1)} hours) — ` +
    `stands in for real capacitor self-discharge, and is far longer than any hold time simulated above`
);
