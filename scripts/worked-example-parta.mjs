// Generates the readings for the guide's Part A worked example
// (content/guide/worked-examples.js, 'worked-example') from the simulation's
// own physics and a modelled hand on the stopwatch, then carries them
// through the way the guide teaches: repeats at one length, half the range
// as the uncertainty, that uncertainty carried to the other lengths, and
// the gradient from best, steepest and shallowest lines — no regression.
// Run with:
//   node scripts/worked-example-parta.mjs
//
// The bench, as a student would set it up:
//   - Lengths 0.250 to 0.500 m, pivot to bob centre (the LENGTH slider at
//     0.23 to 0.48 m of string plus the 0.02 m bob, PendulumLab.js), each
//     read off the vertical scale to the nearest millimetre: +/- 0.0005 m.
//   - Released at about 5 deg, so the period is the exact one at 5 deg
//     (lib/pendulum/model.mjs's AGM form) — 0.05% above T0, far below the
//     timing error, which is what makes "small angle" small enough.
//   - Twenty oscillations timed with the stopwatch (0.01 s display,
//     components/instruments/Stopwatch.js). Each press lags the moment the
//     bob passes the chosen point by a reaction time drawn afresh: mean
//     0.15 s, standard deviation 0.04 s (content/guide/measurement.js: about
//     a tenth of a second a press, and not the same each time). The reading
//     is the true interval plus the stop lag minus the start lag, rounded
//     to the display. A steady lag cancels; only its variation survives —
//     which is exactly what the repeats measure.
//   - Five repeats at 0.350 m; one timing at every other length.
//
// The reaction times come from a fixed-seed generator, so the numbers are
// the same on every run. The seed was fixed before the first run and not
// chosen for the result — and with it the graph's interval for g misses the
// simulation's g, which the guide's example states and explains. SEED=n
// overrides it, which is how the example's run-to-run figures were found:
// over seeds 1-120 the interval contains g in 73 runs (it misses about two
// times in five), and in 88 at least one single timing falls outside its own
// error bar, because half the range of five repeats is about one standard
// deviation of a single timing.
import { exactPeriod } from '../lib/pendulum/model.mjs';
import { analyse } from './lib/lines.mjs';

const G = 9.787; // lib/pendulum/usePendulumPhysics.js — the simulation's g
const DEG = Math.PI / 180;
const RELEASE_DEG = 5;
const OSC = 20;
const LENGTHS = [0.25, 0.3, 0.35, 0.4, 0.45, 0.5];
const REPEAT_AT = 0.35;
const REPEATS = 5;
const DL = 0.0005;
const RES = 0.01; // stopwatch display, s
const LAG_MEAN = 0.15;
const LAG_SD = 0.04;
const SEED = Number(process.env.SEED ?? 20231);

// mulberry32 + Box–Muller: small, deterministic, good enough for jitter.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const uniform = rng(SEED);
function normal(mean, sd) {
  const u = 1 - uniform();
  const v = uniform();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const quantize = (v, r) => Math.round(v / r) * r;
const f = (v, d) => v.toFixed(d);
const pad = (s, n) => String(s).padStart(n);

// One stopwatch timing of OSC oscillations at length L.
function timing(L) {
  const truth = OSC * exactPeriod(RELEASE_DEG * DEG, G, L);
  const start = normal(LAG_MEAN, LAG_SD);
  const stop = normal(LAG_MEAN, LAG_SD);
  return { reading: quantize(truth + stop - start, RES), truth, start, stop };
}

console.log(`g = ${G} m/s^2 in the simulation; released at ${RELEASE_DEG} deg; ${OSC} oscillations per timing`);
console.log(`stopwatch ${RES} s; each press lags by N(${LAG_MEAN}, ${LAG_SD}) s; seed ${SEED}\n`);

// ---- Step 1: repeats at one length ------------------------------------------
console.log(`=== Repeats at L = ${f(REPEAT_AT, 3)} m: t_${OSC} (s) ===`);
const reps = [];
for (let i = 0; i < REPEATS; i++) {
  const t = timing(REPEAT_AT);
  reps.push(t.reading);
  console.log(
    `  ${i + 1}: ${f(t.reading, 2)}   (true ${f(t.truth, 3)}, start lag ${f(t.start, 3)}, stop lag ${f(t.stop, 3)})`,
  );
}
const mean = reps.reduce((s, v) => s + v, 0) / reps.length;
const range = Math.max(...reps) - Math.min(...reps);
const dt20 = range / 2;
const dT0 = dt20 / OSC;
console.log(`  mean ${f(mean, 3)} s; range ${f(range, 2)} s; half the range ${f(dt20, 3)} s`);
console.log(`  => Delta t_${OSC} = ${f(dt20, 3)} s, Delta T0 = ${f(dT0, 4)} s`);

// ---- Step 2: what the spread says about reaction time -----------------------
// The spread is in (stop lag - start lag). If the two presses varied
// independently by sigma each, the difference varies by sigma*sqrt(2);
// half the range of a handful of readings is roughly that.
console.log('\n=== Step 2: the spread against the 0.2 s assumption ===');
console.log(`  assumed: 0.2 s at the two ends in all => Delta T0 = 0.2/${OSC} = ${f(0.2 / OSC, 3)} s`);
console.log(`  measured: half the range ${f(dt20, 3)} s => Delta T0 = ${f(dT0, 4)} s (${f(0.2 / dt20, 1)}x smaller)`);
console.log(`  implied press-to-press variation: about ${f(dt20 / Math.SQRT2, 3)} s per press`);

// ---- Step 3: one timing at every other length, carrying Delta T0 ------------
console.log(`\n=== Table: Delta L = ${DL} m, Delta T0 = ${f(dT0, 4)} s carried from the repeats ===`);
console.log(`L(m)    t_${OSC}(s)  T0(s)    T0^2(s^2)  Delta(T0^2)`);
const rows = LENGTHS.map((L) => {
  const t20 = L === REPEAT_AT ? mean : timing(L).reading;
  const T0 = t20 / OSC;
  const T02 = T0 * T0;
  const dT02 = 2 * T0 * dT0;
  const shown = L === REPEAT_AT ? `${f(t20, 3)}*` : f(t20, 2);
  console.log(`${f(L, 3)}   ${pad(shown, 7)}   ${f(T0, 4)}   ${f(T02, 4)}     ${f(dT02, 4)}`);
  return { L, t20, T0, T02, dT02 };
});
console.log('  * mean of the repeats');

// ---- The graph: T0^2 against L ----------------------------------------------
const a = analyse(rows.map((r) => ({ x: r.L, ex: DL, y: r.T02, ey: r.dT02 })));
console.log('\n=== T0^2 against L ===');
if (!a) {
  console.log('  no straight line passes through every error bar');
} else {
  console.log(`  steepest   : T0^2 = ${f(a.steep.a, 4)} + ${f(a.steep.b, 4)} L`);
  console.log(`  shallowest : T0^2 = ${f(a.shallow.a, 4)} + ${f(a.shallow.b, 4)} L`);
  console.log(`  best       : T0^2 = ${f(a.best.a, 4)} + ${f(a.best.b, 4)} L   (through centre ${f(a.best.cx, 4)}, ${f(a.best.cy, 4)})`);
  const m = a.best.b;
  const g = (4 * Math.PI ** 2) / m;
  const dg = g * (a.db / m);
  console.log(`  gradient m = ${f(m, 3)} +/- ${f(a.db, 3)} s^2/m; intercept ${f(a.best.a, 4)} +/- ${f(a.da, 4)} s^2`);
  console.log(`  g = 4 pi^2 / m = ${f(g, 3)} +/- ${f(dg, 3)} m/s^2   (simulation: ${G}) ${Math.abs(g - G) <= dg ? 'contains' : 'MISSES'}`);
}

// ---- The other route, at the repeated length --------------------------------
const r = rows.find((x) => x.L === REPEAT_AT);
const relL = DL / r.L;
const relT = (2 * dT0) / r.T0;
const gPoint = (4 * Math.PI ** 2 * r.L) / r.T02;
console.log(`\n=== g = 4 pi^2 L / T0^2 at L = ${f(REPEAT_AT, 3)} m alone ===`);
console.log(`  dL/L = ${f(relL * 100, 2)}%, 2 dT0/T0 = ${f(relT * 100, 2)}%, in quadrature ${f(Math.hypot(relL, relT) * 100, 2)}%`);
console.log(`  g = ${f(gPoint, 3)} +/- ${f(gPoint * Math.hypot(relL, relT), 3)} m/s^2`);
