// DC circuit solver via modified nodal analysis, restricted to the element
// set the circuits experiments need: voltage source, resistor, capacitor,
// switch, wire, ideal voltmeter, ammeter. No branch-current unknowns are
// needed for any of these — sources are stamped as a Norton equivalent
// (see VSOURCE_SERIES_R below), the voltmeter is read-only, and the ammeter
// is just a resistor whose current is read back out (see ammeterReading) —
// so the whole system reduces to plain nodal analysis: solve G*v = I for
// node voltages.
//
// Topology (wires, closed switches) is resolved once per step via
// union-find, merging shorted nodes exactly rather than approximating a
// wire as a very-low resistance. That keeps floating/shorted degenerate
// cases well-posed instead of producing an ill-conditioned matrix.
//
// A capacitor's charge is the one piece of state that must outlive a
// single step's topology: it's tracked in `state.capacitorCharge`, keyed
// by element id, and persists whether or not that capacitor even appears
// in a given step's element list. That's what lets the charge-cycling
// experiment (charge a small cap, disconnect it, dump it onto a large one)
// work — the capacitor doesn't need to stay in one circuit for its charge
// to survive.

import { solveLinear } from './mna.mjs';

// Small leak conductance from every node to ground. Standard SPICE
// convergence aid: guarantees every node has *some* path to the reference,
// so a floating node (or a capacitor with no discharge path) still yields
// a well-posed, non-singular system instead of NaN. Kept well below the
// conductance of any realistic resistor in these experiments (even a 1 GOhm
// one leaks only ~1e-5 of its current through GMIN instead) — see
// gminLeakTimeConstant for the same leak read as a capacitor self-discharge.
export const GMIN = 1e-14;

// An ideal voltage source is modeled as a Norton equivalent: a real source
// always has *some* internal resistance, and giving it a tiny fixed one
// turns "solve for an extra branch-current unknown" into "stamp like a
// resistor," and — critically — keeps a dead short across the source
// (V+ wired straight to V-) a regular, solvable system (a large but finite
// circulating current) instead of a contradiction (0 = V) that would make
// the matrix singular.
export const VSOURCE_SERIES_R = 1e-6;

// Same leak, expressed for reporting: the RC time constant it imposes on a
// capacitor of a given value, purely from sitting on a node with no other
// path to ground.
export function gminLeakTimeConstant(capacitance) {
  return capacitance / GMIN;
}

// Guards against a user-specified R of zero (or negative): treat it as a
// near-ideal wire rather than dividing by zero.
const RESISTOR_FLOOR = 1e-9;

// Capacitor companion model: trapezoidal integration (SPICE's default —
// second-order accurate, vs. backward Euler's first-order) whenever the
// circuit around the capacitor is unchanged from the previous step, falling
// back to a one-step backward-Euler restart right after any topology change
// (a switch thrown, a wire added/removed, a capacitor id appearing for the
// first time). Trapezoidal's accuracy comes from averaging the current with
// its value on the *previous* step — an assumption that a switch event or a
// fresh reconnection breaks outright (the current can jump discontinuously),
// so blindly averaging across that instant would ring or corrupt what
// should be an exact charge transfer (see the charge-sharing/cycling
// verification). Backward Euler needs no such history, so it's the safe
// choice for the single step immediately following any change.
function topologySignature(elements) {
  return elements
    .map((el) => `${el.id}:${el.type}:${el.nodes[0]}:${el.nodes[1]}:${el.type === 'switch' ? !!el.closed : ''}`)
    .sort()
    .join('|');
}

function makeUnionFind() {
  const parent = new Map();
  function find(x) {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root);
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur);
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  return { find, union };
}

// Stamps a two-terminal conductance g between matrix indices i and j (either
// may be null, meaning "ground"). When i === j (the element's two terminals
// were unioned onto the same node, e.g. a shorted source) the contributions
// cancel exactly to zero, which is the correct behaviour: current
// recirculates locally and the element has no effect on the rest of the
// circuit.
function stampG(G, i, j, g) {
  if (i !== null) G[i][i] += g;
  if (j !== null) G[j][j] += g;
  if (i !== null && j !== null) {
    G[i][j] -= g;
    G[j][i] -= g;
  }
}

// Stamps an injected current of `val` flowing from terminal j to terminal i.
function stampI(I, i, j, val) {
  if (i !== null) I[i] += val;
  if (j !== null) I[j] -= val;
}

export function createCircuitState() {
  return { capacitorCharge: new Map(), capacitorCurrent: new Map(), topologySignature: null };
}

// Advances the circuit by one fixed timestep dt, returning the solved node
// voltages and the next state (a new object; `state` is not mutated).
//
// circuit = {
//   ground: <node id>,
//   elements: [
//     { id, type: 'vsource',   nodes: [pos, neg], value: volts },
//     { id, type: 'resistor',  nodes: [a, b],     value: ohms },
//     { id, type: 'capacitor', nodes: [a, b],     value: farads },
//     { id, type: 'switch',    nodes: [a, b],     closed: bool },
//     { id, type: 'wire',      nodes: [a, b] },
//     { id, type: 'meter',     nodes: [a, b],     mode: 'voltage' },
//     { id, type: 'ammeter',   nodes: [a, b],     shuntOhms: ohms },
//   ],
// }
export function stepCircuit(circuit, state, dt) {
  const { ground, elements } = circuit;
  const signature = topologySignature(elements);
  const continuity = signature === state.topologySignature;
  const uf = makeUnionFind();

  uf.find(ground);
  for (const el of elements) {
    uf.find(el.nodes[0]);
    uf.find(el.nodes[1]);
    if (el.type === 'wire' || (el.type === 'switch' && el.closed)) {
      uf.union(el.nodes[0], el.nodes[1]);
    }
  }

  const groundRoot = uf.find(ground);
  const indexByRoot = new Map();
  for (const el of elements) {
    for (const node of el.nodes) {
      const root = uf.find(node);
      if (root !== groundRoot && !indexByRoot.has(root)) {
        indexByRoot.set(root, indexByRoot.size);
      }
    }
  }

  const n = indexByRoot.size;
  const idxOf = (node) => {
    const root = uf.find(node);
    return root === groundRoot ? null : indexByRoot.get(root);
  };

  const G = Array.from({ length: n }, () => new Array(n).fill(0));
  const I = new Array(n).fill(0);
  for (let i = 0; i < n; i++) stampG(G, i, null, GMIN);

  const capacitorStamps = new Map();
  for (const el of elements) {
    const ia = idxOf(el.nodes[0]);
    const ib = idxOf(el.nodes[1]);

    switch (el.type) {
      case 'resistor': {
        const r = Math.max(el.value, RESISTOR_FLOOR);
        stampG(G, ia, ib, 1 / r);
        break;
      }
      case 'ammeter': {
        // Nodal analysis has no branch-current unknowns, so an ammeter is
        // stamped exactly like a resistor of its own named shuntOhms — a
        // real ammeter's small series resistance, not a hidden solver
        // constant — and its current is read back out afterward (see
        // ammeterReading) as the voltage across that shunt over shuntOhms.
        const r = Math.max(el.shuntOhms, RESISTOR_FLOOR);
        stampG(G, ia, ib, 1 / r);
        break;
      }
      case 'vsource': {
        const g = 1 / VSOURCE_SERIES_R;
        stampG(G, ia, ib, g);
        stampI(I, ia, ib, g * el.value);
        break;
      }
      case 'capacitor': {
        if (el.value <= 0) break; // no capacitance: an open circuit
        const vPrev = state.capacitorCharge.has(el.id)
          ? state.capacitorCharge.get(el.id) / el.value
          : 0;
        const iPrev = continuity && state.capacitorCurrent.has(el.id) ? state.capacitorCurrent.get(el.id) : 0;
        const g = continuity ? (2 * el.value) / dt : el.value / dt;
        const iEq = g * vPrev + iPrev;
        stampG(G, ia, ib, g);
        stampI(I, ia, ib, iEq);
        capacitorStamps.set(el.id, { g, iEq, value: el.value, a: el.nodes[0], b: el.nodes[1] });
        break;
      }
      case 'switch': // open: no branch at all; closed: merged above
      case 'wire': // merged above
      case 'meter': // ideal: infinite input impedance, no loading
        break;
      default:
        throw new Error(`Unknown circuit element type: ${el.type}`);
    }
  }

  const v = solveLinear(G, I);
  const nodeVoltage = (node) => {
    const idx = idxOf(node);
    return idx === null ? 0 : v[idx];
  };

  const voltages = new Map();
  voltages.set(ground, 0);
  for (const el of elements) {
    for (const node of el.nodes) {
      if (!voltages.has(node)) voltages.set(node, nodeVoltage(node));
    }
  }

  const capacitorCharge = new Map(state.capacitorCharge);
  const capacitorCurrent = new Map(state.capacitorCurrent);
  for (const [id, stamp] of capacitorStamps) {
    const vNew = nodeVoltage(stamp.a) - nodeVoltage(stamp.b);
    const iNew = stamp.g * vNew - stamp.iEq;
    capacitorCharge.set(id, stamp.value * vNew);
    capacitorCurrent.set(id, iNew);
  }

  return {
    voltages,
    state: { capacitorCharge, capacitorCurrent, topologySignature: signature },
  };
}

export function meterReading(circuit, voltages, meterId) {
  const el = circuit.elements.find((e) => e.id === meterId);
  if (!el || el.type !== 'meter') {
    throw new Error(`No meter with id ${meterId}`);
  }
  return voltages.get(el.nodes[0]) - voltages.get(el.nodes[1]);
}

export function ammeterReading(circuit, voltages, ammeterId) {
  const el = circuit.elements.find((e) => e.id === ammeterId);
  if (!el || el.type !== 'ammeter') {
    throw new Error(`No ammeter with id ${ammeterId}`);
  }
  return (voltages.get(el.nodes[0]) - voltages.get(el.nodes[1])) / el.shuntOhms;
}

export function capacitorVoltage(state, capacitorId, capacitance) {
  return state.capacitorCharge.has(capacitorId)
    ? state.capacitorCharge.get(capacitorId) / capacitance
    : 0;
}
