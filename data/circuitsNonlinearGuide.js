// Static problem statement, formulae, and thin prompts for problem 2 (non-
// linear elements) — same philosophy as data/circuitsGuide.js: no method,
// hints stay questions.

// The data table's symbol bar, after its shared base (Δ ± ° ² ³ ₀) — the
// same circuit letters as problem 1.
export const circuitsNonlinearSymbols = ['Ω', 'µ', 'τ', 'ω'];

export const circuitsNonlinearParts = [
  {
    key: 'parta',
    label: 'PART A',
    tag: 'PART A',
    title: 'Find B from a thermistor',
    body: (
      <p>
        The thermistor is rated to 80 °C — go past that and you're outside the part's spec.
        Use the heater to hold it at a series of temperatures between 25 °C and 80 °C, and at
        each one, measure its resistance. The bench gives you a fixed 10kΩ resistor to build a
        divider with and two voltmeters — there's no ammeter, so resistance has to come from
        voltage readings alone. Plot your data so that the B-parameter equation becomes a
        straight line, and read <em>B</em> off it.
      </p>
    ),
    formulae: [{ expr: 'R = R₀·exp(B/T)', note: 'B-parameter equation, T in kelvin' }],
    hints: [
      'What temperature scale does that equation actually require?',
      'How do you get a resistance out of a circuit that only has voltmeters in it?',
      'What should you plot against what to get a straight line — and what does its gradient give you?',
    ],
  },
  {
    key: 'partb',
    label: 'PART B',
    tag: 'PART B',
    title: 'A capacitance that depends on voltage',
    body: (
      <>
        <p>
          Both capacitors on the bench are unlabeled by value — measure C(U), the differential
          capacitance, as a function of voltage for each, using only the 47MΩ resistor and your
          voltmeters.
        </p>
        <p>
          Measure each polarity as a separate run from the same starting voltage: charge from
          −9V toward 0 for the negative range, and from +9V toward 0 for the positive range,
          rather than sweeping straight through 0. The dielectric's behaviour depends on how
          fast the voltage across it is changing, so both halves need to be measured under
          comparable conditions — a single sweep through 0 doesn't give you that.
        </p>
      </>
    ),
    credit: 'Adapted from IPhO 2021, Experimental Problem 1.',
    formulae: [{ expr: 'C(U) = dQ/dU = I·dt/dU', note: 'differential capacitance' }],
    hints: [
      'How do you get a current when the only instrument on the bench is a voltmeter?',
      'What happens to the spacing between successive readings as the voltage approaches its final value — and what does that do to a derivative built from them?',
      'What should C₁ tell you about your method, before you trust what C₂ tells you about the capacitor?',
    ],
  },
];
