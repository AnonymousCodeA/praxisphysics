// Verifies the velocity-Verlet integrator against the exact AGM period
// across release angles. Run with: node scripts/pendulum-verify.mjs
import { simulatePeriod, exactPeriod } from '../lib/pendulum/model.mjs';

const g = 9.81;
const L = 1;
const dt = 1 / 500;

console.log('deg   simulated(s)   exact(s)   error(%)');
for (let deg = 5; deg <= 85; deg += 5) {
  const phi0 = (deg * Math.PI) / 180;
  const sim = simulatePeriod(phi0, g, L, dt);
  const exact = exactPeriod(phi0, g, L);
  const errPct = ((sim - exact) / exact) * 100;
  console.log(
    `${String(deg).padStart(3)}   ${sim.toFixed(6).padStart(12)}   ${exact
      .toFixed(6)
      .padStart(8)}   ${errPct.toFixed(4).padStart(7)}`
  );
}
