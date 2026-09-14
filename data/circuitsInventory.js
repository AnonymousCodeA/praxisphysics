// The circuits experiment's one shared stock list — used for both Part A
// (RC decay) and Part B (charge cycling), since the student modifies their
// Part A circuit rather than rebuilding for Part B. See CircuitBench.js:
// every count here is a numbered physical instance, not a fungible pool, so
// a capacitor built up in Part A keeps its charge into Part B.
export const circuitsInventory = [
  { id: 'battery-6v', type: 'battery', value: 6, label: '6V', count: 1 },
  { id: 'resistor-220k', type: 'resistor', value: 220000, label: '220kΩ', count: 1 },
  { id: 'resistor-100k', type: 'resistor', value: 100000, label: '100kΩ', count: 1 },
  { id: 'capacitor-100u', type: 'capacitor', value: 100e-6, label: '100µF', count: 1 },
  { id: 'capacitor-100n', type: 'capacitor', value: 100e-9, label: '100nF', count: 1 },
  { id: 'switch', type: 'switch', label: 'SWITCH', count: 4 },
  { id: 'wire', type: 'wire', label: 'WIRE', count: 20 },
  { id: 'voltmeter', type: 'voltmeter', label: 'V', count: 2 },
  { id: 'ammeter', type: 'ammeter', shuntOhms: 1, label: 'A', count: 1 },
];
