// Prose for the guide's "Tabulation" section. `bodies` is keyed by the
// subsection ids in data/guide.js — those ids are what experiment hints
// link to, so add text here rather than renaming them. A subsection with no
// entry renders as a "Not written yet." stub; `intro` sits above the first.
// See content/guide/README.md for the maths/figure/table conventions.
import { M, Eq } from '@/components/Maths';

export const intro = (
  <>
    <p>
      A results table is not a record of what you did — it is a tool for seeing the relationship
      in the data. It should be laid out so that the answer is visible in the table, and not only
      in the graph you are about to draw from it.
    </p>
  </>
);

export const bodies = {
  'table-layout': (
    <>
      <p>
        One row per independent reading, one column per quantity. The leftmost column is the
        quantity you varied or chose — the independent variable — and everything to the right of
        it is what you measured in response, or calculated from what you measured.
      </p>
      <p>
        Keep the raw readings in the table, not just the processed ones. If you timed twenty
        oscillations, put the time in the table as well as the period: a reader who doubts your
        division should be able to check it, and you should be able to check it yourself if you
        spot a bad row later.
      </p>
      <p>
        And do not leave the table half-written. A table with the last row empty, or with units
        that change halfway down, is harder to use than no table at all.
      </p>
    </>
  ),

  'headings-and-units': (
    <>
      <p>
        Every column heading carries its unit, in brackets: <M>{String.raw`L`}</M> (m),{' '}
        <M>{String.raw`T`}</M> (s), <M>{String.raw`\Delta T`}</M> (s). The unit belongs in the
        heading and nowhere else, so that every number in the column is a bare number.
      </p>
      <p>
        A calculated column should say so. A heading like <M>{String.raw`T_0^2`}</M> (s²) is
        unambiguous; <M>{String.raw`t²`}</M> (s²) next to a column of times might be read as the
        square of the time rather than of the period.
      </p>
      <p>
        Symbols should match the ones used in the rest of your write-up. If the question calls the
        length <M>{String.raw`L`}</M>, the table calls it <M>{String.raw`L`}</M>.
      </p>
    </>
  ),

  'raw-data-precision': (
    <>
      <p>
        Record a raw reading to the precision of the instrument that produced it, and no further.
        A scale divided into millimetres gives a reading like 34.6 cm, not 34.63 cm — the extra
        digits are invented, and they make the uncertainty look larger than it is.
      </p>
      <p>
        The exception is a timing read from a stopwatch, where the reading is a length of time
        rather than a position: the uncertainty in a stopwatch reading is set by the reaction time,
        which is much larger than the display's resolution. Nobody times a swing to 0.01 s, even
        though the display shows hundredths.
      </p>
    </>
  ),

  'calculated-columns': (
    <>
      <p>
        A calculated column — a square, a ratio, a converted unit — is a column like any other, and
        it is worth having. It lets you see the relationship in the table, and it saves you
        converting units over and over.
      </p>
      <p>
        Two rules keep it honest. Round the calculated value to the precision the inputs deserve,
        not to the precision the calculator offers: if <M>{String.raw`T = 1.187 \pm 0.004`}</M> s,
        then <M>{String.raw`T^2 = 1.41 \pm 0.01`}</M> s², not 1.408969. And calculate the
        uncertainty of a calculated column with the propagated value, not by eyeballing the
        scatter of the column.
      </p>
      <p>
        When a column is calculated from another column in the same table, write the formula in
        the heading or just above the table. It saves a reader the work of reverse-engineering
        it, and it saves you from a typo you would not otherwise catch.
      </p>
    </>
  ),

  'recording-repeats': (
    <>
      <p>
        Repeat every measurement. Not to make the first one more accurate — you cannot do that
        after the fact — but because the spread of the repeats is the only honest estimate of how
        well you can measure that quantity.
      </p>
      <p>
        Take the mean of the repeats as the value, and use the spread of the repeats as the
        uncertainty: for a handful of readings, half the range is a fair estimate.
      </p>
      <Eq>{String.raw`\Delta x = \frac{x_{\max} - x_{\min}}{2}`}</Eq>
      <p>
        A more careful treatment uses the standard deviation of the repeats divided by the square
        root of the number of repeats, which is the standard error of the mean — see the{' '}
        <b>Error analysis</b> section for that. But note what the repeats are and are not for: they
        tell you about the random scatter of your timing, and nothing at all about a systematic
        error, which shifts every repeat in the same direction and is invisible in their spread.
      </p>
      <p>
        Keep the individual repeats in the table, in their own rows or their own columns. It costs
        a few lines and it is the evidence for the uncertainty you quote.
      </p>
    </>
  ),
};
