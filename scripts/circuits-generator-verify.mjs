// Verifies the signal generator element (lib/circuits/model.mjs's
// generatorValue + its 'generator' stamp) against known analytic results,
// read out through the same captureWaveform used elsewhere. Run with:
// node scripts/circuits-generator-verify.mjs
import { createCircuitState, DEFAULT_GENERATOR_OUTPUT_IMPEDANCE } from '../lib/circuits/model.mjs';
import { captureWaveform } from '../lib/circuits/capture.mjs';

// Quadrature (lock-in) demodulation: the amplitude and phase (relative to a
// sin(omega*t) reference, i.e. v(t) = amplitude*sin(omega*t + phase)) of the
// steady-state component of a captured trace, recovered by correlating
// against sin/cos references over an integer number of periods — the same
// idea as a real lock-in amplifier reading a noisy signal against a known
// reference frequency. `time`/`values` should already exclude any startup
// transient.
function demodulate(time, values, omega) {
  let sumSin = 0;
  let sumCos = 0;
  const dt = time[1] - time[0];
  for (let i = 0; i < time.length; i++) {
    sumSin += values[i] * Math.sin(omega * time[i]);
    sumCos += values[i] * Math.cos(omega * time[i]);
  }
  const span = time.length * dt;
  const aSin = (2 / span) * sumSin * dt; // = amplitude*cos(phase)
  const aCos = (2 / span) * sumCos * dt; // = amplitude*sin(phase)
  return { amplitude: Math.hypot(aSin, aCos), phase: Math.atan2(aCos, aSin) };
}

function fmt(x, digits = 6) {
  return x.toFixed(digits).padStart(digits + 4);
}

// --- Test 1: a sine into a purely resistive load. With no capacitor or
// inductor in the circuit there's no transient at all — the load tracks
// the (divided) source instantaneously — so amplitude and frequency are
// recovered from the raw samples with nothing to settle first.

console.log('=== Test 1: sine into a resistive load — amplitude & frequency recovered from samples ===');

const T1_AMPLITUDE = 5;
const T1_FREQ = 1000; // Hz
const T1_R_LOAD = 1e6; // ohm — >> the generator's own 50 ohm output impedance
const t1Circuit = {
  ground: 'gnd',
  elements: [
    { id: 'G1', type: 'generator', nodes: ['a', 'gnd'], waveform: 'sine', amplitude: T1_AMPLITUDE, frequency: T1_FREQ, offset: 0, phase: 0 },
    { id: 'R1', type: 'resistor', nodes: ['a', 'gnd'], value: T1_R_LOAD },
  ],
};
const t1Expected = (T1_AMPLITUDE * T1_R_LOAD) / (T1_R_LOAD + DEFAULT_GENERATOR_OUTPUT_IMPEDANCE);

const t1Period = 1 / T1_FREQ;
const t1Dt = t1Period / 200;
const t1Periods = 10;
const t1Steps = Math.round((t1Periods * t1Period) / t1Dt);
const t1Cap = captureWaveform(t1Circuit, createCircuitState(), {
  dt: t1Dt,
  steps: t1Steps,
  probes: [{ id: 'v', nodes: ['a', 'gnd'] }],
});

const t1Values = t1Cap.traces.v;
const t1AmplitudeMeasured = (Math.max(...t1Values) - Math.min(...t1Values)) / 2;
const t1AmplitudeErrPct = ((t1AmplitudeMeasured - t1Expected) / t1Expected) * 100;

const t1Crossings = [];
for (let i = 1; i < t1Values.length; i++) {
  const v0 = t1Values[i - 1];
  const v1 = t1Values[i];
  if ((v0 <= 0 && v1 > 0) || (v0 >= 0 && v1 < 0)) {
    const frac = v0 / (v0 - v1);
    t1Crossings.push(t1Cap.time[i - 1] + frac * (t1Cap.time[i] - t1Cap.time[i - 1]));
  }
}
const t1Gaps = [];
for (let i = 1; i < t1Crossings.length; i++) t1Gaps.push(t1Crossings[i] - t1Crossings[i - 1]);
const t1PeriodMeasured = 2 * (t1Gaps.reduce((a, b) => a + b, 0) / t1Gaps.length);
const t1FreqMeasured = 1 / t1PeriodMeasured;
const t1FreqErrPct = ((t1FreqMeasured - T1_FREQ) / T1_FREQ) * 100;

console.log(
  `amplitude: measured ${t1AmplitudeMeasured.toFixed(6)} V, expected ${t1Expected.toFixed(6)} V (divider through the ${DEFAULT_GENERATOR_OUTPUT_IMPEDANCE} ohm output impedance) — error ${t1AmplitudeErrPct.toFixed(4)}%`
);
console.log(`frequency: measured ${t1FreqMeasured.toFixed(3)} Hz, expected ${T1_FREQ} Hz — error ${t1FreqErrPct.toFixed(4)}%`);
const t1Pass = Math.abs(t1AmplitudeErrPct) < 0.1 && Math.abs(t1FreqErrPct) < 0.1;
console.log(`${t1Pass ? 'PASS' : 'FAIL'} (tolerance 0.1% on both)`);

// --- Test 2: series RC steady-state amplitude and phase vs the analytic
// transfer function 1/(1+j*omega*R_total*C), R_total including the
// generator's own outputImpedance (it's genuinely in series with the
// external R) — the important test: if both amplitude and phase come out
// right against a closed-form transfer function, the generator's waveform
// AND the capture path are both correct.

console.log('\n=== Test 2: series RC steady state vs analytic 1/(1+j*omega*R_total*C) ===');

const T2_AMPLITUDE = 5;
const T2_R = 10000; // ohm, external
const T2_C = 100e-9; // F
const T2_R_TOTAL = T2_R + DEFAULT_GENERATOR_OUTPUT_IMPEDANCE;
const T2_TAU = T2_R_TOTAL * T2_C;

function rcCircuitFor(freq) {
  return {
    ground: 'gnd',
    elements: [
      { id: 'G1', type: 'generator', nodes: ['src', 'gnd'], waveform: 'sine', amplitude: T2_AMPLITUDE, frequency: freq, offset: 0, phase: 0 },
      { id: 'R1', type: 'resistor', nodes: ['src', 'a'], value: T2_R },
      { id: 'C1', type: 'capacitor', nodes: ['a', 'gnd'], value: T2_C },
    ],
  };
}

const t2Freqs = [20, 1 / (2 * Math.PI * T2_TAU), 1000, 5000]; // below, at, above the corner
let t2MaxAmplitudeErrPct = 0;
let t2MaxPhaseErrAbs = 0;

for (const freq of t2Freqs) {
  const omega = 2 * Math.PI * freq;
  const period = 1 / freq;
  const settle = 8 * T2_TAU; // >> RC, so the transient is negligible before we start measuring
  const avgWindow = Math.max(10 * period, 10 * T2_TAU); // enough cycles for a clean correlation
  const dt = Math.min(period, T2_TAU) / 200;
  const steps = Math.round((settle + avgWindow) / dt);

  const cap = captureWaveform(rcCircuitFor(freq), createCircuitState(), {
    dt,
    steps,
    probes: [{ id: 'vc', nodes: ['a', 'gnd'] }],
  });

  const startIdx = cap.time.findIndex((t) => t >= settle);
  const steadyTime = cap.time.slice(startIdx);
  const steadyValues = cap.traces.vc.slice(startIdx);
  const { amplitude, phase } = demodulate(steadyTime, steadyValues, omega);

  const hMag = 1 / Math.sqrt(1 + (omega * T2_TAU) ** 2);
  const expectedAmplitude = T2_AMPLITUDE * hMag;
  const expectedPhase = -Math.atan(omega * T2_TAU);

  const amplitudeErrPct = ((amplitude - expectedAmplitude) / expectedAmplitude) * 100;
  const phaseErrAbs = Math.abs(phase - expectedPhase);
  t2MaxAmplitudeErrPct = Math.max(t2MaxAmplitudeErrPct, Math.abs(amplitudeErrPct));
  t2MaxPhaseErrAbs = Math.max(t2MaxPhaseErrAbs, phaseErrAbs);

  console.log(
    `f=${freq.toFixed(2).padStart(9)} Hz: amplitude measured=${fmt(amplitude)} V expected=${fmt(
      expectedAmplitude
    )} V (err ${amplitudeErrPct.toFixed(4)}%), phase measured=${fmt(phase, 5)} rad expected=${fmt(
      expectedPhase,
      5
    )} rad (err ${phaseErrAbs.toExponential(3)} rad)`
  );
}
const t2Pass = t2MaxAmplitudeErrPct < 0.5 && t2MaxPhaseErrAbs < 0.01;
console.log(`${t2Pass ? 'PASS' : 'FAIL'} (tolerance 0.5% amplitude, 0.01 rad phase)`);

// --- Test 3: series RLC near resonance — the response should peak at
// omega0 = 1/sqrt(LC), recovered by sweeping frequency, demodulating the
// resistor's voltage (proportional to current) at each, and fitting a
// parabola through the three points around the sampled maximum for a
// sub-grid-resolution peak estimate.

console.log('\n=== Test 3: series RLC — response peaks at omega0 = 1/sqrt(LC) ===');

const T3_AMPLITUDE = 5;
const T3_R = 200; // ohm, external
const T3_L = 10e-3; // H
const T3_C = 10e-9; // F
const T3_R_TOTAL = T3_R + DEFAULT_GENERATOR_OUTPUT_IMPEDANCE;
const omega0 = 1 / Math.sqrt(T3_L * T3_C);
const f0 = omega0 / (2 * Math.PI);
const alpha = T3_R_TOTAL / (2 * T3_L);
const tauDecay = 1 / alpha;

function rlcCircuitFor(freq) {
  return {
    ground: 'gnd',
    elements: [
      { id: 'G1', type: 'generator', nodes: ['src', 'gnd'], waveform: 'sine', amplitude: T3_AMPLITUDE, frequency: freq, offset: 0, phase: 0 },
      { id: 'R1', type: 'resistor', nodes: ['src', 'a'], value: T3_R },
      { id: 'L1', type: 'inductor', nodes: ['a', 'b'], value: T3_L },
      { id: 'C1', type: 'capacitor', nodes: ['b', 'gnd'], value: T3_C },
    ],
  };
}

const T3_SWEEP_POINTS = 21;
const T3_SWEEP_SPAN = 0.3; // +-15% around f0
const sweepFreqs = [];
for (let i = 0; i < T3_SWEEP_POINTS; i++) {
  const frac = (1 - T3_SWEEP_SPAN / 2) + (i / (T3_SWEEP_POINTS - 1)) * T3_SWEEP_SPAN;
  sweepFreqs.push(f0 * frac);
}

const sweepAmplitudes = sweepFreqs.map((freq) => {
  const omega = 2 * Math.PI * freq;
  const period = 1 / freq;
  const settle = 10 * tauDecay;
  const avgWindow = Math.max(10 * period, 10 * tauDecay);
  const dt = Math.min(period, tauDecay) / 200;
  const steps = Math.round((settle + avgWindow) / dt);

  const cap = captureWaveform(rlcCircuitFor(freq), createCircuitState(), {
    dt,
    steps,
    probes: [{ id: 'vr', nodes: ['src', 'a'] }], // I*R_ext, proportional to current
  });

  const startIdx = cap.time.findIndex((t) => t >= settle);
  const { amplitude } = demodulate(cap.time.slice(startIdx), cap.traces.vr.slice(startIdx), omega);
  return amplitude;
});

let peakIdx = 0;
for (let i = 1; i < sweepAmplitudes.length; i++) {
  if (sweepAmplitudes[i] > sweepAmplitudes[peakIdx]) peakIdx = i;
}
console.log(`grid peak at f=${sweepFreqs[peakIdx].toFixed(1)} Hz (index ${peakIdx} of ${T3_SWEEP_POINTS})`);

let f0Measured = sweepFreqs[peakIdx];
if (peakIdx > 0 && peakIdx < sweepAmplitudes.length - 1) {
  const yMinus = sweepAmplitudes[peakIdx - 1];
  const y0 = sweepAmplitudes[peakIdx];
  const yPlus = sweepAmplitudes[peakIdx + 1];
  const df = sweepFreqs[peakIdx + 1] - sweepFreqs[peakIdx];
  const p = (0.5 * (yMinus - yPlus)) / (yMinus - 2 * y0 + yPlus);
  f0Measured = sweepFreqs[peakIdx] + p * df;
}
const f0ErrPct = ((f0Measured - f0) / f0) * 100;
console.log(
  `analytic f0=${f0.toFixed(2)} Hz (omega0=${omega0.toFixed(1)} rad/s), Q=${(omega0 / (2 * alpha)).toFixed(
    2
  )} — parabolic-interpolated peak f0=${f0Measured.toFixed(2)} Hz, error ${f0ErrPct.toFixed(4)}%`
);
console.log(`${Math.abs(f0ErrPct) < 1 ? 'PASS' : 'FAIL'} (tolerance 1%)`);

// --- Test 4: a square wave into an RC gives exponential segments — each
// half-period, the capacitor relaxes exponentially (time constant
// R_total*C) toward whichever level the square wave is currently sitting
// at, starting from wherever it was at the start of that half-period. The
// very first segment starts from a known true initial condition (v_C(0)=0,
// fresh state) rather than a measured one, so it's checked against the
// closed form independently; later segments are checked against the same
// law using their own measured starting sample, confirming the relaxation
// continues correctly across repeated square-wave transitions.

console.log('\n=== Test 4: square wave into RC — exponential relaxation each half-period ===');

const T4_AMPLITUDE = 5;
const T4_R = 10000;
const T4_C = 100e-9;
const T4_R_TOTAL = T4_R + DEFAULT_GENERATOR_OUTPUT_IMPEDANCE;
const T4_TAU = T4_R_TOTAL * T4_C;

const T4_HALF_PERIOD_STEPS = 1500; // exact number of samples per half-period
const T4_DT = T4_TAU / 500; // half-period = 3*tau = 1500*dt, exactly
const T4_HALF_PERIOD = T4_HALF_PERIOD_STEPS * T4_DT;
const T4_FREQ = 1 / (2 * T4_HALF_PERIOD);
const T4_SEGMENTS = 8;

const squareCircuit = {
  ground: 'gnd',
  elements: [
    { id: 'G1', type: 'generator', nodes: ['src', 'gnd'], waveform: 'square', amplitude: T4_AMPLITUDE, frequency: T4_FREQ, offset: 0, phase: 0 },
    { id: 'R1', type: 'resistor', nodes: ['src', 'a'], value: T4_R },
    { id: 'C1', type: 'capacitor', nodes: ['a', 'gnd'], value: T4_C },
  ],
};

const t4Cap = captureWaveform(squareCircuit, createCircuitState(), {
  dt: T4_DT,
  steps: T4_SEGMENTS * T4_HALF_PERIOD_STEPS,
  probes: [{ id: 'vc', nodes: ['a', 'gnd'] }],
});

const T4_ABS_TOL = T4_AMPLITUDE * 1e-4;
const T4_REL_TOL = 1e-3;
let t4MaxRatio = 0;
let t4WorstSegment = -1;

for (let k = 0; k < T4_SEGMENTS; k++) {
  const level = T4_AMPLITUDE * (k % 2 === 0 ? 1 : -1);
  const anchor = k === 0 ? 0 : t4Cap.traces.vc[k * T4_HALF_PERIOD_STEPS - 1];
  const tStart = k * T4_HALF_PERIOD;

  // Excludes each segment's very last sample: it lands exactly on the
  // square wave's own transition instant (theta = a multiple of pi), where
  // floating-point time accumulation can push generatorValue's sign either
  // way — a real square wave's value at the exact transition instant is
  // undefined anyway, so this checks the relaxation everywhere except that
  // one knife-edge sample.
  for (let i = k * T4_HALF_PERIOD_STEPS; i < (k + 1) * T4_HALF_PERIOD_STEPS - 1; i++) {
    const elapsed = t4Cap.time[i] - tStart;
    const expected = level + (anchor - level) * Math.exp(-elapsed / T4_TAU);
    const err = Math.abs(t4Cap.traces.vc[i] - expected);
    const tol = T4_ABS_TOL + T4_REL_TOL * Math.abs(expected - level) + T4_REL_TOL * Math.abs(level);
    const ratio = err / tol;
    if (ratio > t4MaxRatio) {
      t4MaxRatio = ratio;
      t4WorstSegment = k;
    }
  }
}
console.log(
  `${T4_SEGMENTS} half-periods (T/2=3*tau=${(T4_HALF_PERIOD * 1000).toFixed(4)} ms, tau=${(T4_TAU * 1000).toFixed(
    4
  )} ms): worst sample used ${(t4MaxRatio * 100).toFixed(2)}% of its tolerance budget, in segment ${t4WorstSegment}`
);
console.log(`${t4MaxRatio < 1 ? 'PASS' : 'FAIL'} (every sample within its tolerance)`);
