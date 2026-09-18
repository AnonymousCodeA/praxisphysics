// Fast off-cadence acquisition for a "scope" over the same verified solver
// (model.mjs), independent of the bench's own real-time step. The bench
// runs stepCircuit on a wall-clock accumulator fixed at 1/200 s (see
// useCircuitPhysics.js) — fine for a meter reading, hopelessly coarse for
// an AC waveform: a 10 kHz signal completes a cycle in 100 microseconds,
// well under one real-time step. A capture instead steps the solver `steps`
// times at a much finer `dt`, chosen by the caller from the time window it
// actually wants to see (e.g. a 2 ms window sampled at 2000 points is
// dt = 1 microsecond) rather than any fixed constant here.
//
// A capture is a read, not an advance of the bench's own simulation: it
// starts from a snapshot of the caller's `state` and only ever threads the
// solver's own returned state through a local variable, so the object the
// caller passed in is left exactly as it was.
import { stepCircuit } from './model.mjs';

function cloneState(state) {
  return {
    capacitorCharge: new Map(state.capacitorCharge),
    capacitorCurrent: new Map(state.capacitorCurrent),
    inductorCurrent: new Map(state.inductorCurrent),
    inductorVoltage: new Map(state.inductorVoltage),
    topologySignature: state.topologySignature,
    // Reset, not copied from state.time: a signal generator's phase is a
    // fixed property of the element itself (see generatorValue in
    // model.mjs), so a capture always starts from that well-defined point
    // in its cycle rather than wherever the bench's own real-time clock
    // happens to be — otherwise the same capture call would read
    // differently depending on how long the bench had already been
    // running before it was taken.
    time: 0,
  };
}

// probes: [{ id, nodes: [a, b] }] — same two-node-difference convention as
// meterReading (voltages.get(a) - voltages.get(b)), recorded fresh after
// every step. Returns { time, traces }: `time` is the sample instants
// (dt, 2*dt, ..., steps*dt — one per step, not counting the t=0 starting
// condition), and `traces` maps each probe's id to its array of `steps`
// samples.
export function captureWaveform(circuit, state, { dt, steps, probes }) {
  let cur = cloneState(state);
  const time = new Array(steps);
  const traces = {};
  for (const probe of probes) traces[probe.id] = new Array(steps);

  for (let i = 0; i < steps; i++) {
    const result = stepCircuit(circuit, cur, dt);
    cur = result.state;
    time[i] = (i + 1) * dt;
    for (const probe of probes) {
      const [a, b] = probe.nodes;
      const va = result.voltages.get(a) ?? 0;
      const vb = result.voltages.get(b) ?? 0;
      traces[probe.id][i] = va - vb;
    }
  }

  return { time, traces };
}
