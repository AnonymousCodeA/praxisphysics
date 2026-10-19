// The guide's outline: its four sections and every subsection's anchor id.
// This file is the deep-link contract — an experiment hint points at
// `guideHref('graphing', 'error-bars')`, so renaming an id here breaks every
// link to it (guideHref throws, which fails the build rather than shipping a
// dead anchor). The prose itself lives separately in content/guide/<slug>.js,
// keyed by these same ids, so this file stays small enough to import from a
// client component without pulling the whole guide into its bundle.
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
      { id: 'measuring-multiples', title: 'Measuring many to find one' },
    ],
  },
  {
    slug: 'error-analysis',
    index: '02',
    title: 'Error analysis',
    blurb: 'Random and systematic error, how uncertainties combine, and how honestly to state a result.',
    subsections: [
      { id: 'random-and-systematic', title: 'Random and systematic errors' },
      { id: 'absolute-and-percentage', title: 'Absolute, fractional and percentage uncertainty' },
      { id: 'repeated-readings', title: 'Repeated readings and the mean' },
      { id: 'combining-uncertainties', title: 'Combining uncertainties' },
      { id: 'significant-figures', title: 'Significant figures' },
      { id: 'comparing-results', title: 'Comparing a result with an accepted value' },
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
];

export function guideHref(slug, id) {
  const section = guideSections.find((s) => s.slug === slug);
  if (!section) throw new Error(`guideHref: no guide section "${slug}"`);
  if (id === undefined) return `/guide/${slug}`;
  if (!section.subsections.some((s) => s.id === id)) {
    throw new Error(`guideHref: no subsection "${id}" in guide section "${slug}"`);
  }
  return `/guide/${slug}#${id}`;
}
