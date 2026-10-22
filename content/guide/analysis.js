// Prose for the guide's "Data analysis" section — the handout. `bodies` is
// keyed by the subsection ids in data/guide.js — those ids are what
// experiment hints link to, so add text here rather than renaming them. A
// subsection with no entry renders as a "Not written yet." stub; `intro`
// sits above the first. See content/guide/README.md for the maths/figure/
// table conventions.
//
// This is the end-to-end write-up: readings to a table, table to a graph,
// graph to a number with an uncertainty. It runs on the pendulum throughout
// because that is the experiment the site ships, but every step is general.
//
// The worked example is written as questions rather than as narration: each
// step asks what the reader would have to work out, and the answer sits
// behind a disclosure (components/GuideQ.js). A student meeting the method
// for the first time can follow the argument without knowing what to do
// with it; a student meeting it for the first time *doing* the experiment
// needs the question as much as the answer.
import { M, Eq } from '@/components/Maths';
import Fig from '@/components/Fig';
import GuideQ from '@/components/GuideQ';

export const intro = (
  <>
    <p>
      Measuring is only the first half of an experiment. The second half is turning a pile of
      numbers into a result you can defend — with an uncertainty attached, and a method you could
      explain to somebody else. This is that half, written out end to end.
    </p>
    <p>
      The pendulum is used as the running example because it is the experiment on this site, and
      because it exercises every step: a table, a linearisation, a gradient, an uncertainty, and a
      result that has to be reported. Nothing here is specific to it.
    </p>
  </>
);

export const bodies = {
  'the-pipeline': (
    <>
      <p>There are five steps, and doing them out of order is the commonest way to go wrong.</p>
      <ol className="guide-steps">
        <li>
          <b>Take the readings.</b> One number per measurement, with its uncertainty, and the
          instrument that produced it written down beside it. Resist the urge to process anything
          yet.
        </li>
        <li>
          <b>Tabulate them.</b> One row per reading or per set of readings, one column per
          quantity, units in the column headings. If a column is calculated rather than measured,
          say so in its heading.
        </li>
        <li>
          <b>Linearise.</b> If the relationship you want is not a straight line, change the
          variables until it is. This is the step that turns a scatter of points into something a
          gradient can be read from.
        </li>
        <li>
          <b>Graph and fit.</b> Plot the points with their error bars, draw the best-fit line by
          hand, and read the gradient off the line — not by joining points up.
        </li>
        <li>
          <b>Propagate and report.</b> Carry the uncertainty in the gradient through to the
          quantity you actually want, and report the result as a value with an uncertainty.
        </li>
      </ol>
      <aside>
        <p>
          The order matters because each step constrains the next. A table that omits an
          uncertainty cannot grow error bars later; a graph with the wrong axes cannot be rescued by
          a better line; and a gradient read off a graph has to be read before it can be propagated.
        </p>
      </aside>
    </>
  ),

  'worked-example': (
    <>
      <p>
        Here is a complete set of readings from the pendulum bench, and the whole analysis worked
        through. Six lengths; at each one, the time for twenty complete oscillations, measured with
        the stopwatch and repeated three times.
      </p>

      <div className="guide-table">
        <table>
          <thead>
            <tr>
              <th>
                <M>{String.raw`L`}</M> (m)
              </th>
              <th>
                <M>{String.raw`\Delta L`}</M> (m)
              </th>
              <th>
                <M>{String.raw`t_{20}`}</M> (s)
              </th>
              <th>
                <M>{String.raw`T_0`}</M> (s)
              </th>
              <th>
                <M>{String.raw`\Delta T_0`}</M> (s)
              </th>
              <th>
                <M>{String.raw`T_0^2`}</M> (s²)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>0.200</td>
              <td>0.0005</td>
              <td>17.96</td>
              <td>0.898</td>
              <td>0.010</td>
              <td>0.806</td>
            </tr>
            <tr>
              <td>0.250</td>
              <td>0.0005</td>
              <td>20.10</td>
              <td>1.005</td>
              <td>0.010</td>
              <td>1.010</td>
            </tr>
            <tr>
              <td>0.300</td>
              <td>0.0005</td>
              <td>22.01</td>
              <td>1.101</td>
              <td>0.010</td>
              <td>1.212</td>
            </tr>
            <tr>
              <td>0.350</td>
              <td>0.0005</td>
              <td>23.77</td>
              <td>1.189</td>
              <td>0.010</td>
              <td>1.414</td>
            </tr>
            <tr>
              <td>0.400</td>
              <td>0.0005</td>
              <td>25.41</td>
              <td>1.271</td>
              <td>0.010</td>
              <td>1.615</td>
            </tr>
            <tr>
              <td>0.450</td>
              <td>0.0005</td>
              <td>26.93</td>
              <td>1.347</td>
              <td>0.010</td>
              <td>1.814</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        Four columns of that table were calculated, not measured: the period is the time divided by
        twenty, the last column is the period squared, and the two uncertainty columns come from
        the instruments. The rest of the analysis is a question about each of those in turn.
      </p>

      <GuideQ q="The pendulum obeys T₀ = 2π√(L/g). What do you plot against what, and what should the resulting line look like?">
        <p>
          Squaring both sides takes the square root out and leaves everything proportional:
        </p>
        <Eq>{String.raw`T_0^2 = \frac{4\pi^2}{g}\,L`}</Eq>
        <p>
          So plot <M>{String.raw`T_0^2`}</M> on the vertical axis against <M>{String.raw`L`}</M> on
          the horizontal one, and the points should fall on a straight line through the origin. The
          gradient is <M>{String.raw`m = 4\pi^2/g`}</M>, and the intercept is zero — a pendulum of
          zero length has a period of zero, and that is worth checking for, because a non-zero
          intercept is a clue that something is wrong rather than a nuisance to be ignored.
        </p>
      </GuideQ>

      <GuideQ q="Where does each uncertainty in that table come from?">
        <p>
          <M>{String.raw`\Delta L = 0.0005\ \text{m}`}</M> for every row: the length gauge reads
          to the nearest millimetre, so a reading is worth half of that. It is the same for every
          row, because it comes from the instrument rather than from the particular reading.
        </p>
        <p>
          <M>{String.raw`\Delta T_0 = 0.010\ \text{s}`}</M> comes from the stopwatch, and it is
          worth being careful about where. The stopwatch's display reads to 0.01 s, but its real
          error is your reaction time at the two ends of the interval — say 0.2 s in all. That
          0.2 s is spread over twenty oscillations, so the period carries
        </p>
        <Eq>{String.raw`\Delta T_0 = \frac{\Delta t_{20}}{20} = \frac{0.2}{20} = 0.01\ \text{s}`}</Eq>
        <p>
          which is a hundredth of a second. The last column, <M>{String.raw`T_0^2`}</M>, is
          squared, so it inherits twice the <em>relative</em> uncertainty:
        </p>
        <Eq>{String.raw`\Delta(T_0^2) = 2T_0\,\Delta T_0`}</Eq>
        <p>
          — about 0.018 s² at the short end of the range and 0.027 s² at the long end. Those are
          the numbers the error bars are drawn from.
        </p>
      </GuideQ>

      <GuideQ q="You have drawn the line. How do you get a number out of it, and how do you get an uncertainty for that number?">
        <p>
          Take two points a long way apart <em>on the line</em> — not on the data — and divide the
          rise by the run:
        </p>
        <Eq>{String.raw`m = \frac{\Delta(T_0^2)}{\Delta L}`}</Eq>
        <p>
          The longer the stretch of line you use, the smaller the relative error in the gradient,
          so read it over as much of the line as you can.
        </p>
        <p>
          For the uncertainty, draw the steepest and the shallowest lines that still pass through
          every error bar, read the gradient off each, and take half the difference:
        </p>
        <Eq>{String.raw`\Delta m = \frac{m_{\text{steep}} - m_{\text{shallow}}}{2}`}</Eq>
        <p>
          Here the two extreme lines come out at about 4.07 and 4.00 s² m⁻¹, so the best-fit
          gradient is
        </p>
        <Eq>{String.raw`m = 4.03 \pm 0.04\ \text{s}^2\text{m}^{-1}`}</Eq>
      </GuideQ>

      <GuideQ q="How does the uncertainty in the gradient reach g, and what is the final answer?">
        <p>
          From the gradient alone, <M>{String.raw`g = 4\pi^2/m`}</M>, and the fractional
          uncertainty in <M>{String.raw`g`}</M> is the fractional uncertainty in{' '}
          <M>{String.raw`m`}</M>:
        </p>
        <Eq>{String.raw`\frac{\Delta g}{g} = \frac{\Delta m}{m}`}</Eq>
        <p>
          With <M>{String.raw`m = 4.03`}</M> and <M>{String.raw`\Delta m = 0.04`}</M> that is about
          1%, and the result is
        </p>
        <Eq>{String.raw`g = 9.80 \pm 0.10\ \text{m s}^{-2}`}</Eq>
        <p>
          The other route should give the same thing. From{' '}
          <M>{String.raw`g = 4\pi^2 L/T_0^2`}</M>, adding the relative uncertainties in quadrature:
        </p>
        <Eq>
          {String.raw`\left(\frac{\Delta g}{g}\right)^2 = \left(\frac{\Delta L}{L}\right)^2 + 4\left(\frac{\Delta T_0}{T_0}\right)^2`}
        </Eq>
        <p>
          At <M>{String.raw`L = 0.35\ \text{m}`}</M> the length contributes 0.1% and the timing
          about 1.7%, so the timing dominates — and the timing is where the effort should go. If the
          two routes do not agree to within a factor of order one, the graph is not measuring what
          you think it is: most often an error bar is missing, or the one point left out of the fit
          is the one that matters.
        </p>
      </GuideQ>

      <GuideQ q="Your best-fit line does not pass exactly through the origin. What should you do about it?">
        <p>
          Find out what it means before you trust the gradient. A constant offset in the horizontal
          variable shifts every point by the same amount and shows up as an intercept rather than
          as a slope — and the commonest cause is a length measured to the end of the string
          instead of to the centre of the bob. That is a fixed error, not a random one, so it does
          not average away over six rows: it biases the gradient.
        </p>
        <p>
          A small intercept is not always a disaster — an intercept that should be zero and is not
          is one of the most useful things a graph can tell you, and it is only a problem if you
          ignore it. Say what it is, and say what you did about it.
        </p>
      </GuideQ>

      <aside>
        <p>
          The whole of the above is what the pendulum's Part A asks for, and the bench will let you
          do it: measure the period at a spread of lengths, plot the squared period against the
          length, read the gradient off your own line, and turn it into{' '}
          <M>{String.raw`g`}</M>. The one thing the bench will not do for you is the last step —
          the gradient is yours to read off the line you drew.
        </p>
      </aside>
    </>
  ),

  'two-stage-fits': (
    <>
      <p>
        Sometimes the relationship is a straight line plus a correction, and one line cannot
        describe it. The pendulum at large amplitude is the standard example: the period is no
        longer <M>{String.raw`T_0 = 2\pi\sqrt{L/g}`}</M>, but
      </p>
      <Eq>
        {String.raw`T = T_0\bigl(1 + \alpha\sin^2(\varphi_0/2) + \beta\sin^4(\varphi_0/2) + \cdots\bigr)`}
      </Eq>
      <p>
        Here <M>{String.raw`\varphi_0`}</M> is the release angle and{' '}
        <M>{String.raw`\alpha,\ \beta`}</M> are dimensionless constants to be found. The trick is
        that the series can be taken apart one term at a time.
      </p>

      <h3>Stage one: the first correction</h3>
      <p>
        Write <M>{String.raw`x = \sin^2(\varphi_0/2)`}</M>. Then
      </p>
      <Eq>{String.raw`\frac{T}{T_0} - 1 = \alpha x + \beta x^2 + \cdots`}</Eq>
      <p>
        To a first approximation that is a straight line through the origin: plot{' '}
        <M>{String.raw`T/T_0 - 1`}</M> against <M>{String.raw`x`}</M>, and the gradient is{' '}
        <M>{String.raw`\alpha`}</M>. Use only the small-amplitude points for this stage, where the{' '}
        <M>{String.raw`\beta`}</M> term is still too small to notice — otherwise the line is bent
        by it and the gradient you read is not <M>{String.raw`\alpha`}</M> alone.
      </p>

      <GuideQ q="Why does the stage-one line have to pass through the origin?">
        <p>
          Because at <M>{String.raw`x = 0`}</M> — a release angle of zero — the correction is zero
          and the period is exactly <M>{String.raw`T_0`}</M>, so{' '}
          <M>{String.raw`T/T_0 - 1 = 0`}</M>. Any non-zero intercept is telling you that the
          points and the model disagree, which is worth knowing before you read a gradient.
        </p>
      </GuideQ>

      <h3>Stage two: what is left over</h3>
      <p>
        Now take the first correction off and look at the remainder:
      </p>
      <Eq>{String.raw`R = \frac{T}{T_0} - 1 - \alpha x = \beta x^2 + \cdots`}</Eq>
      <p>
        Plotting the residual <M>{String.raw`R`}</M> against <M>{String.raw`x^2`}</M> turns the
        second stage into an ordinary straight line through the origin, and its gradient is{' '}
        <M>{String.raw`\beta`}</M>.
      </p>

      <GuideQ q="Why not just fit one line to all the points and read a single slope?">
        <p>
          Because the slope of a bent line depends on where you read it, and the answer would be a
          mixture of <M>{String.raw`\alpha`}</M> and <M>{String.raw`\beta`}</M> in an amount that
          depends on your choice of amplitude range. Splitting the fit means each constant is
          measured in a range where it dominates: <M>{String.raw`\alpha`}</M> where the second
          term is negligible, <M>{String.raw`\beta`}</M> where the first has been taken off and
          the second is still bigger than the noise.
        </p>
        <p>
          It also gives you two different amplitude ranges to report, which is itself a result: the
          range in which a constant is best determined is set by how big it is and by how well the
          next term up has died away.
        </p>
      </GuideQ>

      <p>
        The residual is small, so this stage needs data with real precision, and it needs the
        amplitudes where the second term is genuinely bigger than the noise. There is a window:
        below about 30° the residual is too small to measure, and above about 50° the next term in
        the series starts to bend the line. Find that window from your own data rather than taking
        it on trust — plot the residual, and look at where it stops being a straight line through
        the origin.
      </p>

      <h3>The point of doing it in two stages</h3>
      <p>
        One straight line through all the data would give a slope that is a mixture of both
        corrections, and a curvature that says nothing cleanly. Splitting it means each constant
        is measured in a range where it dominates, which is both more accurate and much easier to
        reason about.
      </p>
      <p>
        It also shows up as a question worth asking in the write-up: <em>over what range of
        amplitudes is this constant best determined, and what limits that range?</em> The answer is
        different for the two of them, and the reason is instructive.
      </p>
    </>
  ),

  'reporting': (
    <>
      <p>
        A result is a number with an uncertainty attached, quoted to a sensible number of
        significant figures, and it is never quoted to more precision than the uncertainty
        supports.
      </p>
      <ul>
        <li>
          The uncertainty is quoted to <b>one</b> significant figure (or two at most), and the value
          is quoted to the same decimal place as the uncertainty. A result of 9.79 ± 0.04 is
          honest; 9.7871 ± 0.04 pretends to a precision you do not have.
        </li>
        <li>
          The uncertainty is rounded <b>up</b> if anything — it is better to state a slightly
          larger uncertainty than a slightly smaller one.
        </li>
        <li>
          Always give the unit. An error bar without a unit is a number on a graph.
        </li>
      </ul>
      <p>
        Alongside the number, a good write-up states how it was obtained: what was measured, how
        many times, what the scatter was, what was plotted against what, and what limited the
        result. If the honest answer is "the timing was the limit, not the length", say so — it is
        a result about the experiment, and it is worth more than a number with no explanation.
      </p>
      <aside>
        <p>
          A tight interval is not a better answer than a wide one that brackets the truth. In
          Olympiad marking, coverage is what counts: an honest, wide interval that contains the
          right value scores the same as a narrow one, and scores better than a narrow one that
          does not.
        </p>
      </aside>
    </>
  ),
};
