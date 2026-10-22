// The guide's outline: its four sections and every subsection's anchor id.
// This file is the deep-link contract — an experiment hint points at
// `guideHref('graphing', 'error-bars')`, so renaming an id here breaks every
// link to it (guideHref throws, which fails the build rather than shipping a
// dead anchor). The prose itself lives separately in content/guide/<slug>.js,
// keyed by these same ids, so this file stays small enough to import from a
// client component without pulling the whole guide into its bundle.
//
// `anchors` lists the <h3 id>s inside a subsection that a hint may link to
// directly (`guideHref('error-analysis', 'max-min-method')`); the content
// file must give its <h3> the same id. `short` is an optional label for the
// page's sidebar when the heading itself is too long to sit there.
export const guideSections = [
  {
    slug: 'measurement',
    index: '01',
    title: 'Measurement and devices',
    blurb: 'Reading instruments, what their resolution really means, and the errors built into the act of measuring.',
    subsections: [
      { id: 'reading-a-scale', title: 'Reading an analogue scale' },
      { id: 'resolution', title: 'Resolution' },
      { id: 'zero-error', title: 'Zero error' },
      { id: 'parallax', title: 'Parallax' },
      { id: 'digital-readouts', title: 'Digital readouts' },
      { id: 'timing-by-hand', title: 'Timing by hand' },
      { id: 'photogates', title: 'Photogates' },
      { id: 'measuring-multiples', title: 'Measuring many to find one' },
    ],
  },
  {
    slug: 'error-analysis',
    index: '02',
    title: 'Error analysis',
    blurb: 'Finding the error in a single reading or a set of repeats, then carrying it through to a calculated result — by quadrature, the max–min method, or the general partial-derivative formula.',
    subsections: [
      { id: 'introduction', title: 'Introduction' },
      {
        id: 'finding-the-error',
        title: 'Finding the error',
        anchors: [
          { id: 'measurement-device', title: 'Error in Measurement device' },
          { id: 'statistical-error', title: 'Statistical error' },
        ],
      },
      {
        id: 'propagating-errors',
        title: 'Propagating Errors',
        anchors: [{ id: 'max-min-method', title: 'The max–min method' }],
      },
      {
        id: 'formal-propagation',
        title: "Now let's get serious (formal) and generalize EVERYTHING",
        short: 'The general formula',
      },
    ],
  },
  {
    slug: 'tabulation',
    index: '03',
    title: 'Tabulation',
    blurb: 'Laying out a results table so the raw readings, units and calculated columns read clearly.',
    subsections: [
      { id: 'table-layout', title: 'Laying out a table' },
      { id: 'headings-and-units', title: 'Column headings and units' },
      { id: 'raw-data-precision', title: 'Precision of raw readings' },
      { id: 'calculated-columns', title: 'Calculated columns' },
      { id: 'recording-repeats', title: 'Recording repeated readings' },
    ],
  },
  {
    slug: 'graphing',
    index: '04',
    title: 'Graphing',
    blurb: 'Choosing what to plot, linearising, error bars, and pulling a gradient and intercept out of a line.',
    subsections: [
      { id: 'choosing-axes', title: 'Choosing what to plot' },
      { id: 'linearisation', title: 'Linearising a relationship' },
      { id: 'scales', title: 'Choosing scales' },
      { id: 'plotting-points', title: 'Plotting points' },
      { id: 'error-bars', title: 'Error bars' },
      { id: 'best-fit-line', title: 'The line of best fit' },
      { id: 'worst-acceptable-line', title: 'The worst acceptable line' },
      { id: 'gradient-and-intercept', title: 'Gradient and intercept' },
    ],
  },
  {
    slug: 'analysis',
    index: '05',
    title: 'Data analysis',
    blurb:
      'A handout for the whole pipeline: readings to a table, table to a graph, graph to a number with an uncertainty.',
    subsections: [
      { id: 'the-pipeline', title: 'The pipeline' },
      { id: 'worked-example', title: 'Worked example: a pendulum’s T² against L' },
      { id: 'two-stage-fits', title: 'When one straight line is not enough' },
      { id: 'reporting', title: 'Reporting the result' },
    ],
  },
];

export function guideHref(slug, id) {
  const section = guideSections.find((s) => s.slug === slug);
  if (!section) throw new Error(`guideHref: no guide section "${slug}"`);
  if (id === undefined) return `/guide/${slug}`;
  const known = section.subsections.some(
    (s) => s.id === id || s.anchors?.some((a) => a.id === id),
  );
  if (!known) {
    throw new Error(`guideHref: no subsection "${id}" in guide section "${slug}"`);
  }
  return `/guide/${slug}#${id}`;
}
