// Sample stock for exercising the circuit bench — enough to build an RC
// charge/discharge loop, a charge-sharing pair, and a small charge-cycling
// setup (battery + resistor + small capacitor, dumped onto a larger one).
// Not tied to a specific problem statement yet; a real experiment would
// define its own inventory alongside its guide content.
export const circuitInventory = [
  { id: 'battery-6v', type: 'battery', value: 6, label: '6V', count: 1 },
  { id: 'resistor-10k', type: 'resistor', value: 10000, label: '10kΩ', count: 2 },
  { id: 'resistor-4k7', type: 'resistor', value: 4700, label: '4.7kΩ', count: 1 },
  { id: 'capacitor-100u', type: 'capacitor', value: 100e-6, label: '100µF', count: 2 },
  { id: 'capacitor-10u', type: 'capacitor', value: 10e-6, label: '10µF', count: 1 },
  { id: 'switch', type: 'switch', value: undefined, label: 'SWITCH', count: 2 },
  { id: 'wire', type: 'wire', value: undefined, label: 'WIRE', count: 18 },
  { id: 'voltmeter', type: 'voltmeter', value: undefined, label: 'V', count: 2 },
  { id: 'ammeter', type: 'ammeter', shuntOhms: 1, label: 'A', count: 1 },
];
