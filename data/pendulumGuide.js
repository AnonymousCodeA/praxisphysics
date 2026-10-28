// Static problem statement, formulae, and task or prompts per part — the
// pendulum experiment's content, consumed by the generic ExperimentGuide via
// ExperimentWorkspace. No accompanying method: deciding how to measure and
// what to tabulate is the skill this experiment is teaching.
//
// Part A splits three ways: the task (A1–A3) says what to produce and never
// how — no T² against L, no best-fit or worst-acceptable lines, no repeated
// timings, nothing on reaction time; working those out is the point. The
// bench explains its own controls (`notes`, shown beside the table and the
// plot). The guide (/guide) teaches method. The answer box under A3 commits
// once and then reveals the g the simulation uses (G, from
// usePendulumPhysics) and whether the student's interval contains it. The
// only way back is "Start Part A over", which clears the table and plot too.
// The formulae give the governing relation only, no rearrangement.
//
// Part B's series is given deliberately unrearranged —
// deciding what to linearise, and that no single linearisation covers the
// whole amplitude range, is the exercise; its hints stay thin: questions to
// weigh, never a named instrument or method.
import { G } from '@/lib/pendulum/usePendulumPhysics';

export const pendulumParts = [
  {
    key: 'parta',
    label: 'PART A',
    tag: 'PART A',
    title: 'Measure g from a pendulum',
    body: (
      <p>
        A simple pendulum is released from rest at a small angle and swings freely. Using
        whichever instruments you bring to the bench, find a value for the local
        gravitational acceleration <em>g</em> — and an honest estimate of its uncertainty.
      </p>
    ),
    // Only the governing relation: rearranging it into something with a
    // gradient is the step A2 asks for, so it isn't done for them here.
    formulae: [{ expr: 'T = 2π√(L / g)', note: 'period of small oscillations' }],
    task: [
      {
        id: 'A1',
        text: 'Measure the period of the pendulum for at least six different lengths. Record the uncertainty in every quantity you measure.',
      },
      { id: 'A2', text: 'Plot a graph whose gradient gives g, with error bars on your points.' },
      { id: 'A3', text: 'Determine g, with its uncertainty.' },
    ],
    answer: { symbol: 'g', unit: 'm s⁻²', trueValue: G },
    startOver: {
      label: 'Start Part A over',
      confirm: 'This clears your table, your plot and your committed answer for Part A.',
    },
    notes: {
      table: 'Record your readings in the table; add a column for the uncertainty in any quantity. Use the symbol bar for Δ, θ, T² etc., or type in KaTeX-like syntax (e.g. 2e2, T^2).',
      plot: 'On the plot, choose which columns are the axes and which hold the error bars, and set the axis range. Drag the endpoints to draw your own line and read m,c yourself.',
    },
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
