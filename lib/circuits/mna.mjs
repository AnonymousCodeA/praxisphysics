// Dense linear solver for the MNA conductance system G*v = I. Circuits here
// have at most a handful of nodes, so plain Gaussian elimination with
// partial pivoting is plenty — no need for a sparse solver.

const PIVOT_FLOOR = 1e-15;

export function solveLinear(G, I) {
  const n = I.length;
  if (n === 0) return [];

  const A = G.map((row) => row.slice());
  const b = I.slice();

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotMag = Math.abs(A[col][col]);
    for (let row = col + 1; row < n; row++) {
      const mag = Math.abs(A[row][col]);
      if (mag > pivotMag) {
        pivotRow = row;
        pivotMag = mag;
      }
    }
    if (pivotRow !== col) {
      [A[col], A[pivotRow]] = [A[pivotRow], A[col]];
      [b[col], b[pivotRow]] = [b[pivotRow], b[col]];
    }

    // A near-zero pivot here means a node MNA's own GMIN stamp should have
    // kept off the ground reference — fall back to a floor instead of
    // dividing by zero, so a modeling bug degrades to a clamped voltage
    // rather than NaN/Infinity.
    if (Math.abs(A[col][col]) < PIVOT_FLOOR) {
      A[col][col] = A[col][col] >= 0 ? PIVOT_FLOOR : -PIVOT_FLOOR;
    }

    for (let row = col + 1; row < n; row++) {
      const factor = A[row][col] / A[col][col];
      if (factor === 0) continue;
      for (let k = col; k < n; k++) A[row][k] -= factor * A[col][k];
      b[row] -= factor * b[col];
    }
  }

  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = b[row];
    for (let k = row + 1; k < n; k++) sum -= A[row][k] * x[k];
    x[row] = sum / A[row][row];
  }
  return x;
}
