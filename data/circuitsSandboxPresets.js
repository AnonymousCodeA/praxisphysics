// Loadable example circuits for the circuit-builder sandbox — each is a
// list of component placements (type, value, and the grid edge it
// occupies), loaded wholesale by CircuitBench.js's handleLoadPreset.
// Adding one is a data edit: push a new { id, label, components } entry.
//
// `a`/`b` are [row, col] pairs on the sandbox's own ROWS x COLS board (see
// app/simulations/circuit-builder/page.js). An edge only ever joins two
// ADJACENT nodes (see lib/circuits/grid.js) — a component whose two
// terminals aren't one grid-step apart needs a 'wire' placement routed
// through an intermediate node, exactly like wiring it up by hand on the
// board. Preset components are independent of the sandbox's own inventory
// stock (see handleLoadPreset's own comment) — their values don't need to
// match any inventory card's.
export const circuitsSandboxPresets = [
  {
    id: 'rc-charge-discharge',
    label: 'RC CHARGE/DISCHARGE',
    components: [
      { type: 'battery', value: 9, label: '9V', a: [1, 1], b: [1, 2] },
      // CHARGE closed / DISCHARGE open: battery charges the capacitor
      // through the resistor. CHARGE open / DISCHARGE closed: the same
      // resistor now sits between the capacitor and ground, so discharge
      // follows the identical RC time constant as the charge did.
      { type: 'switch', label: 'CHARGE', a: [1, 2], b: [1, 3] },
      { type: 'switch', label: 'DISCHARGE', a: [1, 3], b: [2, 3] },
      // 220kΩ with 100µF gives RC = 22s — slow enough to watch both charge
      // and discharge on the voltmeter with nothing faster needed.
      { type: 'resistor', value: 220000, label: '220kΩ', a: [1, 3], b: [1, 4] },
      { type: 'capacitor', value: 100e-6, label: '100µF', a: [1, 4], b: [2, 4] },
      { type: 'wire', label: 'WIRE', a: [1, 4], b: [1, 5] },
      // a/b reversed from the capacitor's own (node, ground) order: with
      // the battery's positive terminal on the ground-rail side of this
      // loop (nodes:[pos,neg] — see model.mjs), reading (ground - node)
      // rather than (node - ground) is what shows a positive number while
      // charging, matching what a voltmeter connected the "intuitive" way
      // round would read.
      { type: 'voltmeter', label: 'V', a: [2, 5], b: [1, 5] },
      { type: 'wire', label: 'WIRE', a: [1, 1], b: [2, 1] },
      { type: 'wire', label: 'WIRE', a: [2, 1], b: [2, 2] },
      { type: 'wire', label: 'WIRE', a: [2, 2], b: [2, 3] },
      { type: 'wire', label: 'WIRE', a: [2, 3], b: [2, 4] },
      { type: 'wire', label: 'WIRE', a: [2, 4], b: [2, 5] },
    ],
  },
  {
    id: 'wheatstone-bridge',
    label: 'WHEATSTONE BRIDGE',
    components: [
      { type: 'battery', value: 9, label: '9V', a: [1, 1], b: [2, 1] },
      { type: 'wire', label: 'WIRE', a: [2, 1], b: [3, 1] },
      { type: 'wire', label: 'WIRE', a: [1, 1], b: [1, 2] },
      { type: 'wire', label: 'WIRE', a: [1, 2], b: [1, 3] },
      { type: 'wire', label: 'WIRE', a: [3, 1], b: [3, 2] },
      { type: 'wire', label: 'WIRE', a: [3, 2], b: [3, 3] },
      // Left arm 1k/2k against the right arm's 1k/1k — deliberately
      // unbalanced, so the bridge voltmeter reads a clear, calculable
      // 1.5V (= 9*(2/3 - 1/2)) rather than a suspicious 0, which would be
      // easy to mistake for "nothing's connected."
      { type: 'resistor', value: 1000, label: '1kΩ', a: [1, 2], b: [2, 2] },
      { type: 'resistor', value: 2000, label: '2kΩ', a: [2, 2], b: [3, 2] },
      { type: 'resistor', value: 1000, label: '1kΩ', a: [1, 3], b: [2, 3] },
      { type: 'resistor', value: 1000, label: '1kΩ', a: [2, 3], b: [3, 3] },
      { type: 'voltmeter', label: 'V', a: [2, 2], b: [2, 3] },
    ],
  },
  {
    id: 'series-rlc',
    label: 'SERIES RLC',
    components: [
      { type: 'generator', label: 'GEN', a: [1, 1], b: [1, 2] },
      // f0 = 1/(2*pi*sqrt(LC)) ~ 5.03kHz, comfortably inside the
      // generator's 10Hz-100kHz range with margin either side to sweep.
      // No separate resistor placed — the generator's own 50 ohm output
      // impedance (DEFAULT_GENERATOR_OUTPUT_IMPEDANCE) is the loop's only
      // resistance, giving Q ~ 6.3: sharp enough for a clear peak.
      { type: 'inductor', value: 0.01, label: '10mH', a: [1, 2], b: [1, 3] },
      { type: 'capacitor', value: 100e-9, label: '100nF', a: [1, 3], b: [1, 4] },
      { type: 'wire', label: 'WIRE', a: [1, 1], b: [2, 1] },
      { type: 'wire', label: 'WIRE', a: [1, 4], b: [2, 4] },
      { type: 'wire', label: 'WIRE', a: [2, 1], b: [2, 2] },
      { type: 'wire', label: 'WIRE', a: [2, 2], b: [2, 3] },
      { type: 'wire', label: 'WIRE', a: [2, 3], b: [2, 4] },
      // Taps the L-C junction via row 0 (never touching the row-2 ground
      // rail) so probe1's two terminals land on the junction and on
      // ground — the same two nodes the capacitor itself spans.
      { type: 'wire', label: 'WIRE', a: [1, 3], b: [0, 3] },
      { type: 'wire', label: 'WIRE', a: [0, 3], b: [0, 4] },
      { type: 'probe1', label: 'CH1 PROBE', a: [0, 4], b: [1, 4] },
    ],
  },
];
