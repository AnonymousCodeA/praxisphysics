// The guide's way of getting a gradient and its uncertainty off a graph,
// as code: the steepest and shallowest straight lines that still pass
// through every error bar, and a best line through the middle — never a
// regression. Shared by the worked-example generators
// (scripts/worked-example-parta.mjs, scripts/worked-example-partb.mjs) so
// both guide examples are carried through by exactly the same method.
//
// Points are { x, ex, y, ey }: value and half-width of each error bar.

// ---- Extreme lines through every error bar --------------------------------
// A line y = a + b x "passes through" a point's error bars if it crosses the
// box [x +/- dx] x [y +/- dy]. For b >= 0 that is two linear constraints:
//   a + b(x - dx) <= y + dy   and   a + b(x + dx) >= y - dy.
// The steepest and shallowest such lines are the extreme b over that
// polygon; with two unknowns, an optimum sits at a vertex, so try every
// pairwise intersection of constraint boundaries and keep the feasible ones.
export function extremeLines(pts) {
  const cons = []; // each: p*a + q*b <= r
  for (const { x, y, ex, ey } of pts) {
    cons.push({ p: 1, q: x - ex, r: y + ey });
    cons.push({ p: -1, q: -(x + ex), r: -(y - ey) });
  }
  const feasible = (a, b) => cons.every((c) => c.p * a + c.q * b <= c.r + 1e-12);
  let steep = null;
  let shallow = null;
  for (let i = 0; i < cons.length; i++) {
    for (let j = i + 1; j < cons.length; j++) {
      const c1 = cons[i];
      const c2 = cons[j];
      const det = c1.p * c2.q - c2.p * c1.q;
      if (Math.abs(det) < 1e-15) continue;
      const a = (c1.r * c2.q - c2.r * c1.q) / det;
      const b = (c1.p * c2.r - c2.p * c1.r) / det;
      if (!feasible(a, b)) continue;
      if (!steep || b > steep.b) steep = { a, b };
      if (!shallow || b < shallow.b) shallow = { a, b };
    }
  }
  return { steep, shallow };
}

// The best line as the guide says to draw it: through the centre of the
// cloud of points, at the slope the points themselves set — taken here as
// midway between the extreme lines, which is what a ruler laid "through the
// middle" of the bars amounts to. Not a least-squares fit.
export function bestLine(pts, steep, shallow) {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const b = (steep.b + shallow.b) / 2;
  return { a: cy - b * cx, b, cx, cy };
}

export function analyse(pts) {
  const { steep, shallow } = extremeLines(pts);
  if (!steep) return null;
  const best = bestLine(pts, steep, shallow);
  return {
    best,
    steep,
    shallow,
    db: (steep.b - shallow.b) / 2,
    // The intercept's spread comes from the same two lines.
    da: Math.abs(steep.a - shallow.a) / 2,
  };
}
