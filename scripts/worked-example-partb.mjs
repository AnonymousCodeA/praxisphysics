// Generates the readings for the guide's Part B worked example
// (content/guide/worked-examples.js, 'two-stage-fits') from the simulation's
// own physics, so every number there is one a student could actually get
// off the bench — and then carries them through the way the guide teaches:
// best line by eye, steepest and shallowest lines through every error bar,
// no regression. Run with:
//   node scripts/worked-example-partb.mjs
//
// The bench, as a student would set it up:
//   - Length: L = 0.500 m, pivot to bob centre (the LENGTH slider at
//     0.48 m of string plus the 0.02 m bob radius, PendulumLab.js).
//   - Photogate at the lowest point. Released from rest at phi0, the string
//     first crosses the beam a quarter period after release and then every
//     half period; the gate logs each crossing in ms since release, rounded
//     to its 1 ms resolution (usePendulumPhysics.js / lib/instruments/
//     reading.js's quantize). Timing N periods is crossing 1 to crossing
//     2N + 1 — the difference of two rounded trigger times.
//   - Release angle read off the angle plate to the nearest degree, so
//     +/- 0.5 deg. (The plate's session-seeded zero offset is left out:
//     this is about the series, not about catching a systematic.)
//
// The period itself is exact (lib/pendulum/model.mjs's AGM form) — the
// integrator reproduces it to far better than 1 ms (scripts/pendulum-verify.mjs),
// so the only imperfection in the data is the instrument's, which is the
// point: the quantisation is visible.
import { exactPeriod } from '../lib/pendulum/model.mjs';
import { analyse } from './lib/lines.mjs';

const G = 9.787; // lib/pendulum/model.mjs — the simulation's g
const L = 0.5;
const N = Number(process.argv[2] ?? 5); // periods timed per reading (crossing 1 to 2N + 1)
const DPHI_DEG = 0.5;
const RES_MS = 1;

const DEG = Math.PI / 180;
const T0_TRUE = 2 * Math.PI * Math.sqrt(L / G);
const ALPHA_TRUE = 1 / 4;
const BETA_TRUE = 9 / 64;

const quantize = (v, r) => Math.round(v / r) * r;

// One reading: the time for N periods off the photogate log, in ms.
function reading(deg) {
  const T = exactPeriod(deg * DEG, G, L) * 1000; // ms
  const t1 = quantize(T / 4, RES_MS); // crossing 1
  const tLast = quantize(T / 4 + N * T, RES_MS); // crossing 2N + 1
  return { deg, tN: tLast - t1, Ttrue: T / 1000 };
}

const sin2half = (deg) => Math.sin((deg * DEG) / 2) ** 2;
// d/dphi of sin^2(phi/2) = sin(phi)/2
const dx = (deg) => (Math.sin(deg * DEG) / 2) * DPHI_DEG * DEG;

const f = (v, d) => v.toFixed(d);
const pad = (s, n) => String(s).padStart(n);

// ---- The two data sets ------------------------------------------------------
// Set 1, small amplitudes, for T0 and alpha; set 2, the full range, for
// beta. Overridable for exploring (SET1=7,10,... SET2=...), but the guide's
// numbers come from these defaults.
const SET1 = process.env.SET1 ? process.env.SET1.split(',').map(Number) : [7, 10, 14, 18, 22, 26, 30, 35];
const SET2 = process.env.SET2 ? process.env.SET2.split(',').map(Number) : [10, 20, 30, 40, 50, 60, 70, 77];
// Where each stage's straight line actually stays straight, found on the
// first pass (see the curvature checks below): the second pass keeps only
// these points.
const CUT1 = Number(process.env.CUT1 ?? 22);
const CUT2 = Number(process.env.CUT2 ?? 60);

console.log(`L = ${f(L, 3)} m (pivot to bob centre), g = ${G} m/s^2 in the simulation`);
console.log(`Photogate at the lowest point, 1 ms resolution; time for ${N} periods = crossing 1 to crossing ${2 * N + 1}`);
console.log(`True T0 = ${f(T0_TRUE, 6)} s, alpha = 1/4, beta = 9/64 = ${BETA_TRUE}\n`);

const dT = RES_MS / 1000 / N; // s per period: +/- one count over N periods

function measure(degs) {
  return degs.map((deg) => {
    const r = reading(deg);
    return { deg, tN: r.tN, T: r.tN / 1000 / N, x: sin2half(deg), ex: dx(deg) };
  });
}

function printTable(label, rows) {
  console.log(`=== ${label}: +/- ${DPHI_DEG} deg, dT = ${f(dT * 1000, 2)} ms per period ===`);
  console.log(`phi0(deg)  t_${N}T(ms)   T(s)      x = sin^2(phi0/2)   dx`);
  for (const r of rows) {
    console.log(`${pad(r.deg, 6)}   ${pad(r.tN, 9)}   ${f(r.T, 5)}   ${f(r.x, 5)}             ${f(r.ex, 5)}`);
  }
  console.log('');
}

// Stage one: T against x. Intercept T0, gradient T0*alpha.
function stageOne(label, rows) {
  const a = analyse(rows.map((r) => ({ x: r.x, ex: r.ex, y: r.T, ey: dT })));
  const T0 = a.best.a;
  const dT0 = a.da;
  const alpha = a.best.b / T0;
  const dAlpha = alpha * (a.db / a.best.b + dT0 / T0);
  console.log(`--- Stage one, ${label}: T against x ---`);
  console.log(`  steepest   : T = ${f(a.steep.a, 5)} + ${f(a.steep.b, 4)} x`);
  console.log(`  shallowest : T = ${f(a.shallow.a, 5)} + ${f(a.shallow.b, 4)} x`);
  console.log(`  best       : T = ${f(a.best.a, 5)} + ${f(a.best.b, 4)} x   (through centre ${f(a.best.cx, 4)}, ${f(a.best.cy, 5)})`);
  console.log(`  gradient = ${f(a.best.b, 4)} +/- ${f(a.db, 4)} s; T0 = ${f(T0, 5)} +/- ${f(dT0, 5)} s (true ${f(T0_TRUE, 5)})`);
  console.log(`  alpha = gradient/T0 = ${f(alpha, 4)} +/- ${f(dAlpha, 4)}   (true 0.2500)\n`);
  return { T0, dT0, alpha, dAlpha };
}

// Stage two: y = (T/T0 - 1)/x against x. Intercept alpha, gradient beta.
// Each point's bar carries its own dT and dx, and T0's uncertainty too:
// dividing by x magnifies a small error in T0 into a large one at small
// angles (a 0.5 ms shift in T0 moves the 10 deg point by more than its own
// timing bar), so leaving it out would make the low points look far better
// determined than they are. Adding it to every bar is conservative — a
// wrong T0 really moves all the points the same way — and lets the
// steepest and shallowest lines account for it in one step.
function stageTwoPoints(rows, T0, dT0) {
  return rows.map((r) => {
    const y = (r.T / T0 - 1) / r.x;
    const fromT = dT / (T0 * r.x);
    const fromT0 = (r.T / (T0 * T0)) * dT0 / r.x;
    const fromX = (y * r.ex) / r.x;
    return { deg: r.deg, x: r.x, ex: r.ex, y, ey: fromT + fromT0 + fromX, fromT, fromT0, fromX };
  });
}
function stageTwo(label, rows, T0, dT0) {
  const pts = stageTwoPoints(rows, T0, dT0);
  const a = analyse(pts);
  console.log(`--- Stage two, ${label}: y = (T/T0 - 1)/x against x, T0 = ${f(T0, 5)} +/- ${f(dT0, 5)} s ---`);
  console.log('phi0(deg)  y        dy       (from dT, dT0, dx)');
  for (const p of pts) {
    console.log(`${pad(p.deg, 6)}   ${f(p.y, 4)}   ${f(p.ey, 4)}   (${f(p.fromT, 4)}, ${f(p.fromT0, 4)}, ${f(p.fromX, 4)})`);
  }
  if (!a) {
    console.log('  no straight line passes through every error bar\n');
    return null;
  }
  console.log(`  steepest   : y = ${f(a.steep.a, 4)} + ${f(a.steep.b, 4)} x`);
  console.log(`  shallowest : y = ${f(a.shallow.a, 4)} + ${f(a.shallow.b, 4)} x`);
  console.log(`  best       : y = ${f(a.best.a, 4)} + ${f(a.best.b, 4)} x   (through centre ${f(a.best.cx, 4)}, ${f(a.best.cy, 4)})`);
  console.log(`  beta = gradient = ${f(a.best.b, 4)} +/- ${f(a.db, 4)}   (true ${f(BETA_TRUE, 4)}); intercept alpha = ${f(a.best.a, 4)} +/- ${f(a.da, 4)}\n`);
  return { pts, beta: a.best.b, dBeta: a.db, alphaIntercept: a.best.a, dAlphaIntercept: a.da };
}

const set1 = measure(SET1);
const set2 = measure(SET2);
printTable('Set 1 (small amplitudes)', set1);
printTable('Set 2 (full range)', set2);

console.log('##### First pass: every point #####\n');
const p1 = stageOne('all of set 1', set1);
const p2 = stageTwo('all of set 2', set2, p1.T0, p1.dT0);

// The checks that show both first-pass lines are bent rather than noisy.
console.log('--- Curvature checks ---');
const at35 = stageTwoPoints(set1.filter((r) => r.deg === Math.max(...SET1)), p1.T0, p1.dT0)[0];
console.log(
  `  stage one assumes (T/T0 - 1)/x is a constant alpha; at ${at35.deg} deg it is already ${f(at35.y, 4)}, ` +
    `vs ${f(p2.alphaIntercept, 4)} at x -> 0 (stage two's intercept): the beta term is ${f(((at35.y - p2.alphaIntercept) / p2.alphaIntercept) * 100, 1)}% of alpha there`,
);
console.log('  stage two, slope between neighbouring points:');
for (let i = 1; i < p2.pts.length; i++) {
  const a = p2.pts[i - 1];
  const b = p2.pts[i];
  console.log(`    ${pad(a.deg, 2)}-${pad(b.deg, 2)} deg: ${f((b.y - a.y) / (b.x - a.x), 3)}`);
}
console.log('');

console.log(`##### Second pass: set 1 up to ${CUT1} deg, set 2 up to ${CUT2} deg #####\n`);
const q1 = stageOne(`set 1 up to ${CUT1} deg`, set1.filter((r) => r.deg <= CUT1));
const q2 = stageTwo(`set 2 up to ${CUT2} deg`, set2.filter((r) => r.deg <= CUT2), q1.T0, q1.dT0);

console.log('##### Summary #####');
const cover = (v, d, t) => (Math.abs(v - t) <= d ? 'contains' : 'MISSES');
console.log(`  first pass : alpha = ${f(p1.alpha, 3)} +/- ${f(p1.dAlpha, 3)} (${cover(p1.alpha, p1.dAlpha, 0.25)} 0.25); beta = ${f(p2.beta, 3)} +/- ${f(p2.dBeta, 3)} (${cover(p2.beta, p2.dBeta, BETA_TRUE)} 9/64)`);
console.log(`  second pass: alpha = ${f(q1.alpha, 3)} +/- ${f(q1.dAlpha, 3)} (${cover(q1.alpha, q1.dAlpha, 0.25)} 0.25); beta = ${f(q2.beta, 3)} +/- ${f(q2.dBeta, 3)} (${cover(q2.beta, q2.dBeta, BETA_TRUE)} 9/64)`);
console.log(`  T0 = ${f(q1.T0, 4)} +/- ${f(q1.dT0, 4)} s (true ${f(T0_TRUE, 4)})`);
