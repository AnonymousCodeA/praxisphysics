// The circuit builder sandbox's stock list: one of every component type
// lib/circuits/model.mjs supports, including the inductor — added to the
// solver but not yet built into any guided problem's own inventory — so it
// can be placed and tested here first. Counts are generous rather than
// truly unlimited: expandInventory in CircuitBench.js enumerates each count
// as a numbered instance up front, so Infinity would hang it. MANY is well
// beyond anything the sandbox's own board (see the circuit-builder page)
// could ever hold at once, which is what "unlimited" means in practice.
const MANY = 40;

export const circuitsSandboxInventory = [
  { id: 'battery', type: 'battery', value: 9, label: '9V', count: MANY },
  // Waveform/amplitude/frequency are all dialed in from the Generators
  // panel once placed (see CircuitBench.js) — outputImpedance is left
  // unset here, so the solver's own DEFAULT_GENERATOR_OUTPUT_IMPEDANCE
  // (50 ohm) applies.
  { id: 'generator', type: 'generator', label: 'GEN', count: MANY },
  { id: 'resistor-1k', type: 'resistor', value: 1000, label: '1kΩ', count: MANY },
  // 1k paired with the 100uF capacitor below gives RC = 0.1s — nothing
  // watchable on a meter. 220k gives RC = 22s, slow enough to actually read.
  { id: 'resistor-220k', type: 'resistor', value: 220000, label: '220kΩ', count: MANY },
  { id: 'capacitor', type: 'capacitor', value: 100e-6, label: '100µF', count: MANY },
  { id: 'inductor', type: 'inductor', value: 1, label: '1H', count: MANY },
  {
    id: 'thermistor',
    type: 'thermistor',
    // Same standard B-parameter part as data/circuitsNonlinearInventory.js —
    // see thermistorResistance in lib/circuits/model.mjs.
    r0: 10000,
    beta: 3950,
    t0: 298.15,
    label: 'THERMISTOR',
    count: MANY,
  },
  { id: 'switch', type: 'switch', label: 'SWITCH', count: MANY },
  { id: 'wire', type: 'wire', label: 'WIRE', count: MANY },
  { id: 'voltmeter', type: 'voltmeter', label: 'V', count: MANY },
  { id: 'ammeter', type: 'ammeter', shuntOhms: 1, label: 'A', count: MANY },
];
