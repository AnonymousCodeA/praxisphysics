// Static problem statement, formulae, and task per part — the pendulum
// experiment's content, consumed by the generic ExperimentGuide via
// ExperimentWorkspace. No accompanying method: deciding how to measure and
// what to tabulate is the skill this experiment is teaching.
//
// Each part's task says what to produce and never how — no T² against L, no
// best-fit or worst-acceptable lines, no repeated timings, nothing on
// reaction time, no linearisation for Part B's series; working those out is
// the point. The bench explains its own controls (`notes`, shown beside the
// table and the plot). The answer boxes commit once and then reveal the
// value the simulation uses and whether the student's interval contains it;
// the only way back is the part's "start over", which clears the table and
// plot too. The formulae give the governing relation only, unrearranged.
//
// Help beyond the task follows docs/conventions.md's tiers: Part B has one opt-in
// `stuckHint`, Part A none; both parts end with the same two guide links
// (`footer`): the worked solution, with a nudge to try first, and error
// analysis.
//
// Imported by the pendulum's page (a Server Component) and passed down as a
// prop, so the maths is KaTeX rendered on the server and no KaTeX JS ships
// with the bench. That means everything here crosses the Server/Client
// boundary: JSX and plain values only, no functions. A true value that
// depends on the bench names its resolver with `trueValueOf` instead (see
// PendulumExperiment.js). An answer's `symbol` and `unit` stay plain strings
// (the stored answer's key, aria labels); `label`/`unitLabel` are what shows.
import Link from 'next/link';
import { M } from '@/components/Maths';
import { G } from '@/lib/pendulum/model.mjs';
import { guideHref, guideSections } from '@/data/guide';

// A symbol picked out in the formulae box. KaTeX's colour check rejects
// var(--trace), so this is its hex.
const hl = (tex) => String.raw`\textcolor{#4EC5FF}{${tex}}`;

// A link to a guide section, labelled with its own title so a rename
// doesn't leave stale text behind (guideHref already throws on a bad slug).
function guideLink(slug) {
  const href = guideHref(slug);
  return <Link href={href}>{guideSections.find((s) => s.slug === slug).title}</Link>;
}

const footer = (
  <>
    <p>
      To see a worked solution, go to {guideLink('worked-examples')}. It is highly recommended to
      first try the experiment yourself.
    </p>
    <p>For a guide on error analysis, see {guideLink('error-analysis')}.</p>
  </>
);

// The data table's symbol bar, after its shared base (Δ ± ° ² ³ ₀).
export const pendulumSymbols = ['φ', 'θ', 'α', 'β'];

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
        gravitational acceleration <em><M>g</M></em> — and an honest estimate of its uncertainty.
      </p>
    ),
    // Only the governing relation: rearranging it into something with a
    // gradient is the step A2 asks for, so it isn't done for them here.
    formulae: [
      {
        expr: <M>{String.raw`T = 2\pi\sqrt{L/${hl('g')}}`}</M>,
        note: 'period of small oscillations',
      },
    ],
    task: [
      {
        id: 'A1',
        text: 'Measure the period of the pendulum for at least six different lengths. Record the uncertainty in every quantity you measure.',
      },
      {
        id: 'A2',
        text: (
          <>
            Plot a graph whose gradient gives <M>g</M>, with error bars on your points.
          </>
        ),
      },
      {
        id: 'A3',
        text: (
          <>
            Determine <M>g</M>, with its uncertainty.
          </>
        ),
      },
    ],
    answer: {
      symbol: 'g',
      label: <M>g</M>,
      unit: 'm s⁻²',
      unitLabel: <M>{String.raw`\text{m s}^{-2}`}</M>,
      trueValue: G,
    },
    startOver: {
      label: 'Start Part A over',
      confirm: 'This clears your table, your plot and your committed answer for Part A.',
    },
    notes: {
      table: 'Record your readings in the table; add a column for the uncertainty in any quantity.',
      plot: 'On the plot, choose which columns are the axes and which hold the error bars, and set the axis range. Drag across the plot to draw a line.',
    },
    footer,
  },
  {
    key: 'partb',
    label: 'PART B',
    tag: 'PART B',
    title: 'The period at large amplitudes',
    body: (
      <p>
        Beyond the small-angle limit, a pendulum’s period depends on its angular
        amplitude <M>{String.raw`\varphi_0`}</M> as well as its length. Using the bench, measure
        the period across a range of amplitudes and use suitably linearised graphs to determine
        the small-amplitude period <em><M>T_0</M></em> and the constants{' '}
        <em><M>{String.raw`\alpha`}</M></em> and <em><M>{String.raw`\beta`}</M></em>.
      </p>
    ),
    credit: 'Adapted from APhO 2023, Experimental Problem 1.',
    formulae: [
      {
        expr: (
          <M>
            {String.raw`T = ${hl('T_0')}\bigl(1 + ${hl(String.raw`\alpha`)}\sin^2(\varphi_0/2) + ${hl(String.raw`\beta`)}\sin^4(\varphi_0/2) + \cdots\bigr)`}
          </M>
        ),
        note: 'period vs. angular amplitude',
      },
    ],
    // α = 1/4 and β = 9/64 are the true series coefficients of the exact
    // period, not chosen constants; the simulation reproduces them because
    // it integrates the full equation of motion (model.mjs).
    task: [
      {
        id: 'B1',
        text: 'Measure the period of the pendulum across the full range of release angles available to you. Record the uncertainty in every quantity you measure.',
      },
      {
        id: 'B2',
        text: (
          <>
            Determine the small-amplitude period <M>T_0</M>, with its uncertainty.
          </>
        ),
        // 2π√(L/g) at the length on the bench when the answer is committed:
        // unlike g, α and β it isn't a constant.
        answer: {
          symbol: 'T₀',
          label: <M>T_0</M>,
          unit: 's',
          unitLabel: <M>{String.raw`\text{s}`}</M>,
          trueValueOf: 'smallAmplitudePeriod',
          trueNote: 'at the length on the bench when you committed',
        },
      },
      {
        id: 'B3',
        text: (
          <>
            Determine <M>{String.raw`\alpha`}</M> and <M>{String.raw`\beta`}</M>, each with its
            uncertainty.
          </>
        ),
        answer: [
          { symbol: 'α', label: <M>{String.raw`\alpha`}</M>, unit: '', trueValue: 0.25 },
          { symbol: 'β', label: <M>{String.raw`\beta`}</M>, unit: '', trueValue: 0.140625 },
        ],
      },
    ],
    // Opt-in, and only the structure of the solution: not which ranges,
    // not the axes, not T₀ from an intercept, not the residual. Part A has
    // none — T² against L is one step with no stall point.
    stuckHint: (
      <>
        It is not possible to obtain both <M>{String.raw`\alpha`}</M> and{' '}
        <M>{String.raw`\beta`}</M> from a single linearisation. Plan on two separate ranges of
        release angle, and two linearisations — one for each coefficient.
      </>
    ),
    startOver: {
      label: 'Start Part B over',
      confirm: 'This clears your table, your plot and your committed answers for Part B.',
    },
    footer,
  },
];
