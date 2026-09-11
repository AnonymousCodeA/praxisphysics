// Pure grid geometry for the circuit bench: intersections are nodes, and
// every two-terminal component occupies the edge between two ADJACENT
// nodes. This maps directly onto lib/circuits/model.mjs's node/element
// structure (a node id here IS the solver's node id) — no translation layer,
// and orientation (horizontal vs. vertical) falls straight out of which two
// nodes an edge joins, so there's no separate rotate state to track.

export function nodeId(row, col) {
  return `${row},${col}`;
}

export function nodePx(row, col, cellPx) {
  return { x: col * cellPx, y: row * cellPx };
}

// Canonical key for the (unordered) pair of nodes an edge joins — same key
// regardless of which node is passed first, so "is this edge occupied" is a
// single Map lookup.
export function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Every horizontal and vertical edge in a rows*cols grid of nodes.
export function buildEdges(rows, cols) {
  const edges = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c < cols - 1) {
        const a = nodeId(r, c);
        const b = nodeId(r, c + 1);
        edges.push({ key: edgeKey(a, b), a, b, ra: r, ca: c, rb: r, cb: c + 1, orientation: 'h' });
      }
      if (r < rows - 1) {
        const a = nodeId(r, c);
        const b = nodeId(r + 1, c);
        edges.push({ key: edgeKey(a, b), a, b, ra: r, ca: c, rb: r + 1, cb: c, orientation: 'v' });
      }
    }
  }
  return edges;
}

// Nearest edge to a canvas point (perpendicular distance to the segment),
// or null if nothing is within maxSnapPx — that "null" is what lets the
// caller show no ghost at all when the pointer isn't near any edge.
export function nearestEdge(edges, cellPx, px, py, maxSnapPx) {
  let best = null;
  let bestDist = Infinity;
  for (const e of edges) {
    const ax = e.ca * cellPx;
    const ay = e.ra * cellPx;
    const bx = e.cb * cellPx;
    const by = e.rb * cellPx;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const dist = Math.hypot(px - cx, py - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = e;
    }
  }
  return best && bestDist <= maxSnapPx ? best : null;
}
