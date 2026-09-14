// DC circuit solver via modified nodal analysis, restricted to the element
// set the circuits experiments need: voltage source, resistor, capacitor
// (fixed or voltage-dependent), inductor, switch, wire, ideal voltmeter,
// ammeter, thermistor. No branch-current unknowns are needed for any of these —
// sources are stamped as a Norton equivalent (see VSOURCE_SERIES_R below),
// the voltmeter is read-only, and the ammeter is just a resistor whose
// current is read back out (see ammeterReading) — so the whole system
// reduces to plain nodal analysis: solve G*v = I for node voltages.
//
// Topology (wires, closed switches) is resolved once per step via
// union-find, merging shorted nodes exactly rather than approximating a
// wire as a very-low resistance. That keeps floating/shorted degenerate
// cases well-posed instead of producing an ill-conditioned matrix.
//
// A separate, broader union-find (see connUf in stepCircuit) tracks actual
// reachability — every conducting element, not just wires/closed switches —
// to flag nodes with no real path to any voltage source. GMIN keeps such a
// node's voltage numerically well-defined, but that value is an artifact of
// an arbitrary regularization, not a measurement; `floatingNodes` in
// stepCircuit's return lets a caller (e.g. a voltmeter reading) tell the
// difference and refuse to display it as a real number.
//
// A capacitor's charge is the one piece of state that must outlive a
// single step's topology: it's tracked in `state.capacitorCharge`, keyed
// by element id, and persists whether or not that capacitor even appears
// in a given step's element list. That's what lets the charge-cycling
// experiment (charge a small cap, disconnect it, dump it onto a large one)
// work — the capacitor doesn't need to stay in one circuit for its charge
// to survive. This holds equally for a voltage-dependent capacitor (see
// chargeAt/invertCharge below): what's persisted is always actual charge,
// never voltage or capacitanceFn(v)*v, so it stays correct across a
// topology change (or a discharge/reconnection) exactly like a fixed one.
//
// An inductor is the exact dual: CURRENT is what's physically continuous
// (a switch event can't make it jump) and what persists in
// `state.inductorCurrent` across a topology change, the way charge does
// for a capacitor — while the VOLTAGE across it is free to jump, the way
// a capacitor's current is. See the inductor case below and
// topologySignature's comment for how the companion model's history terms
// are chosen (only the always-valid state variable) to respect that.

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

// Same idea for a voltage-dependent capacitor whose capacitanceFn returns
// zero or negative somewhere it shouldn't (a modeling bug, not a real
// device) — floors it instead of producing a zero/negative stamp.
const CAPACITANCE_FLOOR = 1e-15;

// Guards a user-specified inductance of zero (or negative) the same way —
// note this is NOT the dual of CAPACITANCE_FLOOR's "an open circuit"
// treatment for a non-positive capacitor: a near-zero inductance is a
// near-ideal WIRE (its companion conductance dt/(2L) grows without bound
// as L -> 0, which is exactly a short's behaviour), so it's floored and
// still stamped, never skipped.
const INDUCTOR_FLOOR = 1e-9;

// Thermistor (NTC/PTC) resistance from the standard B-parameter equation.
// Exported so a caller (e.g. the verification script) computes the exact
// same value the stamp below does, rather than a hand-derived duplicate
// that could quietly drift out of sync.
export function thermistorResistance(r0, beta, t0, temperature) {
  return r0 * Math.exp(beta * (1 / temperature - 1 / t0));
}

// Numerically integrates a capacitanceFn from 0 to u via Simpson's rule —
// the TRUE charge Q(u) = integral of C(u')du', which is NOT
// capacitanceFn(u)*u except when C is constant. Fixed-panel Simpson (O(h^4))
// is plenty for any smooth, bounded physical C(U); this isn't meant to
// handle a pathological capacitanceFn.
const QUADRATURE_PANELS = 32; // even
function chargeAt(capacitanceFn, u) {
  if (u === 0) return 0;
  const n = QUADRATURE_PANELS;
  const h = u / n;
  let sum = capacitanceFn(0) + capacitanceFn(u);
  for (let i = 1; i < n; i++) {
    sum += capacitanceFn(i * h) * (i % 2 === 0 ? 2 : 4);
  }
  return (h / 3) * sum;
}

// Inverts Q(u) = chargeAt(capacitanceFn, u) for u given a target charge —
// needed because a nonlinear capacitor's persistent state (state.
// capacitorCharge, same map used for a linear one) stores actual charge,
// not voltage, and recovering the previous step's voltage (to evaluate the
// companion model's linearization point) means solving the integral
// backwards. capacitanceFn(u) > 0 everywhere (a physical capacitance) makes
// Q strictly increasing, so a bracket containing the root always exists —
// safeguarded Newton (falling back to bisection whenever a Newton step
// would leave the current bracket) converges reliably regardless of the
// seed, with no risk of diverging the way plain Newton could.
function invertCharge(capacitanceFn, targetQ) {
  let lo = -1;
  let hi = 1;
  while (chargeAt(capacitanceFn, lo) > targetQ) {
    hi = lo;
    lo *= 2;
  }
  while (chargeAt(capacitanceFn, hi) < targetQ) {
    lo = hi;
    hi *= 2;
  }
  let x = (lo + hi) / 2;
  for (let i = 0; i < 60; i++) {
    const fx = chargeAt(capacitanceFn, x) - targetQ;
    if (fx > 0) hi = x;
    else lo = x;
    if (hi - lo < 1e-12 * Math.max(1, Math.abs(x))) break;
    const slope = capacitanceFn(x);
    const xNewton = slope > 0 ? x - fx / slope : (lo + hi) / 2;
    x = xNewton > lo && xNewton < hi ? xNewton : (lo + hi) / 2;
  }
  return x;
}

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
  return {
    capacitorCharge: new Map(),
    capacitorCurrent: new Map(),
    inductorCurrent: new Map(),
    inductorVoltage: new Map(),
    topologySignature: null,
  };
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
//     { id, type: 'capacitor', nodes: [a, b],     capacitanceFn: (voltage) => farads },
//       // voltage-dependent capacitor — capacitanceFn instead of a fixed value;
//       // see chargeAt/invertCharge below for why charge (not capacitanceFn(v)*v)
//       // is what's actually integrated
//     { id, type: 'switch',    nodes: [a, b],     closed: bool },
//     { id, type: 'wire',      nodes: [a, b] },
//     { id, type: 'meter',     nodes: [a, b],     mode: 'voltage' },
//     { id, type: 'ammeter',   nodes: [a, b],     shuntOhms: ohms },
//     { id, type: 'thermistor', nodes: [a, b],    r0: ohms, beta: kelvin, t0: kelvin, temperature: kelvin },
//       // R = r0 * exp(beta * (1/temperature - 1/t0)) — see thermistorResistance
//     { id, type: 'inductor',  nodes: [a, b],     value: henries },
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

  // A second, separate union-find for reachability rather than node-identity
  // reduction: `uf` above must NOT union a resistor's two ends (they sit at
  // different potentials, and the matrix needs them as separate unknowns),
  // but for "is this node connected to a source at all" purposes, a
  // resistor, capacitor, or the ammeter's own shunt is just as real a
  // conducting path as a wire — so this one unions across all of them.
  // GMIN is deliberately excluded: it's a numerical regularization, not a
  // real path, and is exactly the artifact this check exists to catch — a
  // node held only by GMIN (no real route to any source) is floating, and
  // the voltage the solver assigns it is a numerical accident, not a
  // measurement (see meterReading/ammeterReading's callers).
  const connUf = makeUnionFind();
  connUf.find(ground);
  for (const el of elements) {
    connUf.find(el.nodes[0]);
    connUf.find(el.nodes[1]);
    const conducts =
      el.type === 'wire' ||
      (el.type === 'switch' && el.closed) ||
      el.type === 'resistor' ||
      el.type === 'thermistor' ||
      el.type === 'ammeter' ||
      el.type === 'vsource' ||
      el.type === 'inductor' ||
      (el.type === 'capacitor' && (el.value > 0 || typeof el.capacitanceFn === 'function'));
    if (conducts) connUf.union(el.nodes[0], el.nodes[1]);
  }
  const sourceRoots = new Set();
  for (const el of elements) {
    if (el.type === 'vsource') {
      sourceRoots.add(connUf.find(el.nodes[0]));
      sourceRoots.add(connUf.find(el.nodes[1]));
    }
  }
  const isFloating = (node) => !sourceRoots.has(connUf.find(node));

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
  const inductorStamps = new Map();
  for (const el of elements) {
    const ia = idxOf(el.nodes[0]);
    const ib = idxOf(el.nodes[1]);

    switch (el.type) {
      case 'resistor': {
        const r = Math.max(el.value, RESISTOR_FLOOR);
        stampG(G, ia, ib, 1 / r);
        break;
      }
      case 'thermistor': {
        const r = Math.max(thermistorResistance(el.r0, el.beta, el.t0, el.temperature), RESISTOR_FLOOR);
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
        const isNonlinear = typeof el.capacitanceFn === 'function';
        if (!isNonlinear && el.value <= 0) break; // no capacitance: an open circuit
        // Floored so a modeling bug in capacitanceFn (zero/negative
        // somewhere) degrades to a tiny-but-valid stamp rather than a
        // zero/negative conductance — same reasoning as RESISTOR_FLOOR.
        // Used everywhere capacitance is evaluated below, so the value
        // actually stamped and the charge integrated from it never disagree.
        const capacitanceFn = isNonlinear ? (u) => Math.max(el.capacitanceFn(u), CAPACITANCE_FLOOR) : null;
        const storedCharge = state.capacitorCharge.has(el.id) ? state.capacitorCharge.get(el.id) : 0;
        // vPrev is the companion model's linearization point — the actual
        // voltage from the end of the previous step, recovered from stored
        // charge. For a linear capacitor that's a division; for a nonlinear
        // one, charge is Q(u) = integral of C(u')du' (see chargeAt), so
        // recovering u from a charge means inverting that integral.
        const vPrev = isNonlinear
          ? storedCharge === 0
            ? 0
            : invertCharge(capacitanceFn, storedCharge)
          : storedCharge / el.value;
        // "Evaluate C at the current voltage each step": each step re-reads
        // capacitanceFn at that step's own linearization point (vPrev) —
        // never a value cached from further back — so a capacitor whose C(U)
        // is changing tracks it continuously, one step behind by exactly the
        // same one-step lag backward Euler already has for a linear C.
        const cEval = isNonlinear ? capacitanceFn(vPrev) : el.value;
        const iPrev = continuity && state.capacitorCurrent.has(el.id) ? state.capacitorCurrent.get(el.id) : 0;
        const g = continuity ? (2 * cEval) / dt : cEval / dt;
        const iEq = g * vPrev + iPrev;
        stampG(G, ia, ib, g);
        stampI(I, ia, ib, iEq);
        capacitorStamps.set(el.id, { g, iEq, value: el.value, capacitanceFn, a: el.nodes[0], b: el.nodes[1] });
        break;
      }
      case 'inductor': {
        const value = Math.max(el.value, INDUCTOR_FLOOR);
        // Dual of the capacitor case above: iPrev (the persisted CURRENT)
        // is always valid and always read, continuity or not — an
        // inductor's current can't jump. vPrev (the terminal VOLTAGE from
        // the previous step) is only valid — and only folded in — when the
        // topology hasn't changed since; on a restart it's read as 0
        // rather than gated through a separate coefficient, since it's
        // multiplied by `g` either way and the case that matters is simply
        // not including a V(n) term in the backward-Euler formula at all.
        const iPrev = state.inductorCurrent.has(el.id) ? state.inductorCurrent.get(el.id) : 0;
        const vPrev = continuity && state.inductorVoltage.has(el.id) ? state.inductorVoltage.get(el.id) : 0;
        const g = continuity ? dt / (2 * value) : dt / value;
        // Terminal current into node a is g*V - iEq (same convention as
        // every other Norton-style stamp here, capacitor included) and the
        // trapezoidal/backward-Euler current update is I(n+1) = iPrev +
        // g*(V(n+1) [+ V(n) when continuing]) — see the file header comment
        // for the derivation — so iEq is the negation of that intercept.
        const iEq = -(g * vPrev + iPrev);
        stampG(G, ia, ib, g);
        stampI(I, ia, ib, iEq);
        inductorStamps.set(el.id, { g, iEq, a: el.nodes[0], b: el.nodes[1] });
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
  const floatingNodes = new Set();
  for (const el of elements) {
    for (const node of el.nodes) {
      if (!voltages.has(node)) voltages.set(node, nodeVoltage(node));
      if (isFloating(node)) floatingNodes.add(node);
    }
  }

  const capacitorCharge = new Map(state.capacitorCharge);
  const capacitorCurrent = new Map(state.capacitorCurrent);
  for (const [id, stamp] of capacitorStamps) {
    const vNew = nodeVoltage(stamp.a) - nodeVoltage(stamp.b);
    const iNew = stamp.g * vNew - stamp.iEq;
    // The charge actually stored at vNew is Q(vNew) = integral of C(u)du —
    // NOT capacitanceFn(vNew)*vNew, and not stamp's own frozen cEval*vNew
    // either (that's this step's linearization slope, evaluated at the OLD
    // voltage; using it here would silently reintroduce the same C*U error
    // this is meant to avoid). Recomputed fresh from the true integral.
    capacitorCharge.set(id, stamp.capacitanceFn ? chargeAt(stamp.capacitanceFn, vNew) : stamp.value * vNew);
    capacitorCurrent.set(id, iNew);
  }

  const inductorCurrent = new Map(state.inductorCurrent);
  const inductorVoltage = new Map(state.inductorVoltage);
  for (const [id, stamp] of inductorStamps) {
    const vNew = nodeVoltage(stamp.a) - nodeVoltage(stamp.b);
    const iNew = stamp.g * vNew - stamp.iEq;
    inductorCurrent.set(id, iNew);
    inductorVoltage.set(id, vNew);
  }

  return {
    voltages,
    floatingNodes,
    state: { capacitorCharge, capacitorCurrent, inductorCurrent, inductorVoltage, topologySignature: signature },
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
