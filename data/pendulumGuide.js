// Static problem statement, formulae, and thin prompts per part — the
// pendulum experiment's content, consumed by the generic ExperimentGuide via
// ExperimentWorkspace. No accompanying method: deciding how to measure and
// what to tabulate is the skill this experiment is teaching, so Part A stays
// deliberately sparse. Part B's series is given deliberately unrearranged —
// deciding what to linearise, and that no single linearisation covers the
// whole amplitude range, is the exercise; hints stay as thin as Part A's:
// questions to weigh, never a named instrument or method.
export const pendulumParts = [
  {
    key: 'parta',
    label: 'PART A',
    tag: 'PART A',
    title: 'Measure g from a pendulum',
    body: (
      <p>
        A simple pendulum is released from rest at a small angle and swings freely. Using
        the bench and whichever instruments you bring in below, find a value for the local
        gravitational acceleration <em>g</em> — and an honest estimate of its uncertainty.
      </p>
    ),
    formulae: [
      { expr: 'T = 2π√(L / g)', note: 'period of small oscillations' },
      { expr: 'g = 4π²L / T²', note: 'rearranged for g' },
    ],
    hints: [
      'What exactly counts as one oscillation, and where in the swing is the best place to start and stop a timing?',
      'A single swing carries your full reaction-time error. Is there a way to shrink its effect on T?',
      'Does L mean the string’s length, or the distance from the pivot to the bob’s centre?',
      'Which reading dominates your uncertainty in g — and can you reduce it by changing what or how you measure?',
    ],
  },
  {
    key: 'partb',
    label: 'PART B',
    tag: 'PART B',
    title: 'The period at large amplitudes',
    body: (
      <p>
        Beyond the small-angle limit, a pendulum’s period depends on its angular
        amplitude φ₀ as well as its length. Using the bench, measure the period across a
        range of amplitudes and use suitably linearised graphs to determine the
        small-amplitude period <em>T₀</em> and the constants <em>α</em> and <em>β</em>.
        Different linearisations are needed for different regions of the range — the same
        one won’t work throughout.
      </p>
    ),
    credit: 'Adapted from APhO 2023, Experimental Problem 1.',
    formulae: [
      { expr: 'T = T₀(1 + α·sin²(φ₀/2) + β·sin⁴(φ₀/2) + …)', note: 'period vs. angular amplitude' },
    ],
    hints: [
      'How large is the effect you’re trying to measure, compared with the precision of your timing? Estimate this before collecting a full data set.',
      'The α term dominates at small amplitudes and β only becomes visible once α’s contribution is large enough. What does that imply about where each is best measured?',
      'Which of your systematic errors survive when you take the ratio T/T₀, and which cancel?',
    ],
  },
];
