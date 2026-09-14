// Static problem statement, formulae, and thin prompts per part — the
// circuits experiment's content, consumed by the generic ExperimentGuide
// via ExperimentWorkspace. No accompanying method, same philosophy as
// data/pendulumGuide.js: deciding how to measure and what to tabulate is
// the skill being taught, so hints stay questions, never instructions.
export const circuitsParts = [
  {
    key: 'parta',
    label: 'PART A',
    tag: 'PART A',
    title: 'Measure a capacitance from an RC decay',
    body: (
      <p>
        Charge the 100 µF capacitor from the battery, then let it discharge through a
        resistor while you record voltage against time. Extract the time constant{' '}
        <em>τ</em> from your data, and hence the capacitance. The bench provides two
        resistors — measure <em>τ</em> with each and check it scales the way you'd expect
        with <em>R</em>.
      </p>
    ),
    formulae: [
      { expr: 'τ = RC', note: 'time constant of the discharge' },
      { expr: 'V = V₀e^(−t/RC)', note: 'voltage during discharge' },
    ],
    hints: [
      'What does the voltmeter’s range resolution do to your readings as the voltage falls?',
      'How do you know your circuit is discharging rather than charging?',
      'What would you expect if you doubled R?',
    ],
  },
  {
    key: 'partb',
    label: 'PART B',
    tag: 'PART B',
    title: 'A capacitor too fast to follow',
    body: (
      <>
        <p>
          In Part A you could measure <em>C</em> because it discharged slowly enough to
          follow. Try the same with the 100 nF capacitor — it collapses faster than you can
          start a stopwatch.
        </p>
        <p>
          There's a trick: bring back the larger capacitor from Part A, and transfer charge
          from the small one onto it repeatedly. Charge the small capacitor from the battery,
          disconnect it, connect it across the large one, and repeat. Consider the parallel
          connection on the <em>N</em>th cycle, and what condition makes the analysis
          tractable.
        </p>
      </>
    ),
    credit: 'Adapted from EuPhO 2024, Experimental Problem 2.',
    formulae: [
      { expr: 'Q = CV', note: 'charge on a capacitor' },
      { expr: 'C = C₁ + C₂', note: 'charge is conserved when capacitors are connected in parallel' },
    ],
    hints: [
      'What must be true of the small capacitor’s connection to the battery at the moment you transfer it, and why?',
      'What happens to each transferred packet of charge as the voltage on the large capacitor rises?',
      'Over what range of N do you expect your analysis to hold?',
      'Which C belongs in your analysis here — a nominal 100 µF, or the value you measured in Part A?',
    ],
  },
];
