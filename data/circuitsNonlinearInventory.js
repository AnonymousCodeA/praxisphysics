// Problem 2's shared stock list — one bench for both parts, same "modify
// rather than rebuild" reasoning as data/circuitsInventory.js. Two battery
// instances (rather than one with a flip) give the ±9V bipolar supply Part
// B needs: node order on a placed edge is fixed by grid geometry (see
// lib/circuits/grid.js), never flippable by re-placing, so the two
// polarities are two physical parts, not one part in two orientations.
export const circuitsNonlinearInventory = [
  { id: 'battery-pos9', type: 'battery', value: 9, label: '+9V', count: 1 },
  { id: 'battery-neg9', type: 'battery', value: -9, label: '−9V', count: 1 },
  { id: 'resistor-47m', type: 'resistor', value: 47e6, label: '47MΩ', count: 1 },
  { id: 'resistor-divider', type: 'resistor', value: 1e4, label: '10kΩ', count: 1 },
  {
    id: 'thermistor',
    type: 'thermistor',
    // Standard B-parameter part: 10k at 25 C, decades down by 80 C — see
    // thermistorResistance in lib/circuits/model.mjs and the values
    // verified in scripts/circuits-nonlinear-verify.mjs's Test 3.
    r0: 10000,
    beta: 3950,
    t0: 298.15,
    label: 'THERMISTOR',
    count: 1,
  },
  {
    id: 'capacitor-c1',
    type: 'capacitor',
    value: 1e-6,
    label: 'C₁ 1µF',
    count: 1,
  },
  {
    id: 'capacitor-c2',
    type: 'capacitor',
    // C(U) = 1 + 3.5/(1+(U/1.5)^2) uF — ranges 1 uF far from 0V up to 4.5
    // uF at U=0. Verified (charge integral, not capacitanceFn(u)*u) in
    // scripts/circuits-nonlinear-verify.mjs's Test 1.
    capacitanceFn: (v) => (1 + 3.5 / (1 + (v / 1.5) ** 2)) * 1e-6,
    label: 'C₂',
    count: 1,
  },
  { id: 'switch', type: 'switch', label: 'SWITCH', count: 4 },
  { id: 'wire', type: 'wire', label: 'WIRE', count: 20 },
  { id: 'voltmeter', type: 'voltmeter', label: 'V', count: 2 },
];
