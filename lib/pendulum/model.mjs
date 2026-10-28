// Ground-truth pendulum model: inextensible taut string, point bob, no
// small-angle approximation. theta'' = -(g/L) sin(theta). See
// docs/pendulum-plan.md — equation 4 (the amplitude series) must never be
// computed here; that is what the student is meant to discover.

// True value: a plausible local g (Dhaka, about 9.787 m s⁻²), not the
// textbook 9.81, so the Part A reveal can't be matched from memory — and so
// "the local gravitational acceleration" in the problem is literally what's
// asked for. Shown only after Part A's answer is committed
// (data/pendulumGuide.js); deliberately not hidden, it ships in the bundle.
// Lives here rather than in the 'use client' physics hook so the server-
// rendered part definitions can read it as a number.
export const G = 9.787;

export function accel(theta, g, L) {
  return -(g / L) * Math.sin(theta);
}

// One velocity-Verlet step. Acceleration depends only on position, so the
// standard two-evaluation form applies.
export function verletStep(theta, omega, g, L, dt) {
  const a0 = accel(theta, g, L);
  const nextTheta = theta + omega * dt + 0.5 * a0 * dt * dt;
  const a1 = accel(nextTheta, g, L);
  const nextOmega = omega + 0.5 * (a0 + a1) * dt;
  return { theta: nextTheta, omega: nextOmega };
}

// Releases from rest at phi0 and integrates until the bob has swung to the
// far extremum and back — one full period. Turning points (omega crossing
// zero) are located by linear interpolation between steps so the period
// does not inherit the full step size as its resolution.
export function simulatePeriod(phi0, g, L, dt) {
  let theta = phi0;
  let omega = 0;
  let t = 0;
  let crossings = 0;
  let periodTime = null;

  while (crossings < 2) {
    const prevOmega = omega;
    const next = verletStep(theta, omega, g, L, dt);
    t += dt;

    if (prevOmega !== 0 && Math.sign(next.omega) !== Math.sign(prevOmega)) {
      const frac = prevOmega / (prevOmega - next.omega);
      const crossTime = t - dt + frac * dt;
      crossings++;
      if (crossings === 2) periodTime = crossTime;
    }

    theta = next.theta;
    omega = next.omega;
  }

  return periodTime;
}

// Exact period via the arithmetic-geometric mean:
//   T = T0 / AGM(1, cos(phi0/2))
export function agm(a, b, iterations = 5) {
  for (let i = 0; i < iterations; i++) {
    const nextA = (a + b) / 2;
    const nextB = Math.sqrt(a * b);
    a = nextA;
    b = nextB;
  }
  return a;
}

export function exactPeriod(phi0, g, L) {
  const t0 = 2 * Math.PI * Math.sqrt(L / g);
  return t0 / agm(1, Math.cos(phi0 / 2));
}
