// Confirms the Part B amplitude series is actually recoverable from the
// simulation's own data, before a student is asked to do the same by hand.
// Uses only the ground-truth model in lib/pendulum/model.mjs (no series
// term lives there — see the note at the top of that file) and does its own
// fitting here. Touches no app code. Run with:
//   node scripts/pendulum-partb-verify.mjs
import { simulatePeriod } from '../lib/pendulum/model.mjs';

const g = 9.81;
const L = 1;
const dt = 1 / 2000; // finer than pendulum-verify.mjs's 1/500 — the beta-term
// signal we're trying to recover is itself only ~0.01%-3% of T, so the
// integrator's own error needs to be well below that, not just below AGM's.

const T0_TRUE = 2 * Math.PI * Math.sqrt(L / g);
const ALPHA_TRUE = 1 / 4;
const BETA_TRUE = 9 / 64; // == 0.140625

function sin2Half(phi0) {
  const s = Math.sin(phi0 / 2);
  return s * s;
}

// Ordinary least squares, y = intercept + slope*x.
function linfit(xs, ys) {
  const n = xs.length;
  const sx = xs.reduce((a, x) => a + x, 0);
  const sy = ys.reduce((a, y) => a + y, 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

// Least squares through the origin, y = slope*x — for the residual, where
// the model (T0*beta*x^2) has no constant term.
function fitThroughOrigin(xs, ys) {
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sxx = xs.reduce((a, x) => a + x * x, 0);
  return sxy / sxx;
}

function pctErr(fit, truth) {
  return ((fit - truth) / truth) * 100;
}

// --- Simulate T(phi0) across the full range, 5deg to 85deg ---
const samples = [];
for (let deg = 5; deg <= 85; deg += 5) {
  const phi0 = (deg * Math.PI) / 180;
  const T = simulatePeriod(phi0, g, L, dt);
  samples.push({ deg, phi0, x: sin2Half(phi0), T });
}

// --- Step 1: T0, alpha from the small-amplitude region ---
// Small enough that the beta*x^2 term (and beyond) is negligible next to
// the alpha*x term being fit — a 2-parameter linear fit can't tell the
// curvature apart from noise/bias once beta's contribution stops being tiny,
// so this region is deliberately narrow (see step 3 below for just how
// small the beta term already is out here).
const smallRegion = samples.filter((s) => s.deg <= 15);
const { slope: slopeSmall, intercept: T0_fit } = linfit(
  smallRegion.map((s) => s.x),
  smallRegion.map((s) => s.T)
);
const alpha_fit = slopeSmall / T0_fit;

console.log('=== Step 1: T0 and alpha from T = T0(1 + alpha*sin^2(phi0/2)), 5deg-15deg ===');
console.log(`T0:    fit ${T0_fit.toFixed(6)} s   true ${T0_TRUE.toFixed(6)} s   error ${pctErr(T0_fit, T0_TRUE).toFixed(4)}%`);
console.log(`alpha: fit ${alpha_fit.toFixed(6)}     true ${ALPHA_TRUE.toFixed(6)}     error ${pctErr(alpha_fit, ALPHA_TRUE).toFixed(4)}%`);

// --- Step 2: beta from the mid-amplitude region, via the residual ---
// Residual after removing the fitted alpha term should be ~T0*beta*x^2 (plus
// higher-order terms); fit that against x^2. Below ~30deg the residual is
// too small relative to the alpha-fit's own bias to pin down; above ~50deg
// the next (gamma) term starts contaminating it — 30deg-50deg is the sweet
// spot where beta dominates the residual.
const midRegion = samples.filter((s) => s.deg >= 30 && s.deg <= 50);
const residuals = midRegion.map((s) => s.T - T0_fit * (1 + alpha_fit * s.x));
const x2 = midRegion.map((s) => s.x * s.x);
const beta_fit = fitThroughOrigin(x2, residuals) / T0_fit;

console.log('\n=== Step 2: beta from the residual, T - T0(1 + alpha*sin^2(phi0/2)), 30deg-50deg ===');
console.log(`beta:  fit ${beta_fit.toFixed(6)}     true ${BETA_TRUE.toFixed(6)}     error ${pctErr(beta_fit, BETA_TRUE).toFixed(4)}%`);

// --- Step 3: how big is the beta term, physically, at a few amplitudes ---
// Uses the true beta (this is characterising the effect itself, not the fit
// above) so a reader can judge what timing precision is needed to see it at
// all, independent of how well steps 1-2 happened to recover it here.
console.log('\n=== Step 3: size of the beta*sin^4(phi0/2) term vs. timing precision ===');
console.log('deg   beta-term (% of T0)   beta-term (ms)');
for (const deg of [10, 20, 30, 50, 70, 85]) {
  const phi0 = (deg * Math.PI) / 180;
  const x = sin2Half(phi0);
  const frac = BETA_TRUE * x * x; // fraction of T0
  const ms = frac * T0_TRUE * 1000;
  console.log(`${String(deg).padStart(3)}   ${(frac * 100).toFixed(4).padStart(18)}   ${ms.toFixed(4).padStart(12)}`);
}
