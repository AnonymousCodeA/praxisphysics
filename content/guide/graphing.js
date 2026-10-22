// Prose for the guide's "Graphing" section. `bodies` is keyed by the
// subsection ids in data/guide.js — those ids are what experiment hints
// link to, so add text here rather than renaming them. A subsection with no
// entry renders as a "Not written yet." stub; `intro` sits above the first.
// See content/guide/README.md for the maths/figure/table conventions.
import { M, Eq } from '@/components/Maths';
import Fig from '@/components/Fig';

export const intro = (
  <>
    <p>
      A graph is not a picture of your data — it is an argument about what the data means. You
      choose the axes, you choose what to plot against what, and you choose the line. Each of
      those choices can help the reader see the relationship, or hide it.
    </p>
    <p>
      The rule that follows from all of this: <b>the graph should make the answer easy to read
      off</b>. A gradient that takes a magnifying glass and a steady hand to read is a gradient
      that will be read wrong.
    </p>
  </>
);

export const bodies = {
  'choosing-axes': (
    <>
      <p>
        Two decisions, and they are separate decisions. <b>What goes on each axis</b> is decided by
        the question you are asking; <b>which axis is which</b> is decided by convention and by
        what makes the line easiest to read.
      </p>
      <p>
        The independent variable — the one you chose and then measured a response to — goes on the
        horizontal axis. So if you vary the length of a pendulum and measure its period,{' '}
        <M>{String.raw`L`}</M> is horizontal and <M>{String.raw`T`}</M> is vertical. If you vary
        the amplitude and measure the period, <M>{String.raw`\varphi_0`}</M> is horizontal.
      </p>
      <p>
        The reason is not fashion. The gradient of a line is read as a rise over a run, and the
        run is always along the horizontal axis, so the horizontal axis is the one whose units the
        gradient carries. A gradient of <M>{String.raw`\text{s}^2/\text{m}`}</M> is a statement
        about how much the vertical quantity changes per metre on the horizontal one.
      </p>
      <p>
        Plot the quantity you actually want on the vertical axis if you can. If you want the
        gradient of <M>{String.raw`T`}</M> against <M>{String.raw`L`}</M>, plot{' '}
        <M>{String.raw`T`}</M>, not <M>{String.raw`1/T`}</M> or{' '}
        <M>{String.raw`T^2`}</M> — unless the relationship is not straight until you transform
        it, which is the next section.
      </p>
    </>
  ),

  'linearisation': (
    <>
      <p>
        A relationship like <M>{String.raw`T = 2\pi\sqrt{L/g}`}</M> is not a straight line, and no
        amount of careful drawing will make it one. The fix is to change the variables until the
        relationship <em>is</em> straight. This is called <b>linearising</b>, and it is the single
        most useful thing you can do to a set of experimental data.
      </p>

      <h3>How to do it</h3>
      <p>
        Take the relationship and ask what it would look like plotted the other way round. For the
        pendulum:
      </p>
      <Eq>{String.raw`T = 2\pi\sqrt{\frac{L}{g}}`}</Eq>
      <p>
        Square both sides to get the square root out of the way, and every remaining piece is
        proportional:
      </p>
      <Eq>{String.raw`T^2 = \frac{4\pi^2}{g}\,L`}</Eq>
      <p>
        That is <M>{String.raw`y = mx`}</M> with <M>{String.raw`y = T^2`}</M>,{' '}
        <M>{String.raw`x = L`}</M> and <M>{String.raw`m = 4\pi^2/g`}</M>. Plot it, draw a straight
        line through it, and read the gradient — and the answer to the question comes straight back
        out of the gradient.
      </p>

      <h3>Common transformations, and what they do</h3>
      <div className="guide-table">
        <table>
          <thead>
            <tr>
              <th>Relationship</th>
              <th>Plot</th>
              <th>Gradient is</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <M>{String.raw`y = mx`}</M>
              </td>
              <td>
                <M>{String.raw`y`}</M> against <M>{String.raw`x`}</M>
              </td>
              <td>
                <M>{String.raw`m`}</M>
              </td>
            </tr>
            <tr>
              <td>
                <M>{String.raw`y = mx + c`}</M>
              </td>
              <td>
                <M>{String.raw`y`}</M> against <M>{String.raw`x`}</M>
              </td>
              <td>
                <M>{String.raw`m`}</M>, intercept <M>{String.raw`c`}</M>
              </td>
            </tr>
            <tr>
              <td>
                <M>{String.raw`y = mx^n`}</M>
              </td>
              <td>
                <M>{String.raw`\log y`}</M> against <M>{String.raw`\log x`}</M>
              </td>
              <td>
                <M>{String.raw`n`}</M> (the exponent)
              </td>
            </tr>
            <tr>
              <td>
                <M>{String.raw`y = A/x`}</M>
              </td>
              <td>
                <M>{String.raw`y`}</M> against <M>{String.raw`1/x`}</M>
              </td>
              <td>
                <M>{String.raw`A`}</M>
              </td>
            </tr>
            <tr>
              <td>
                <M>{String.raw`y = A e^{-bx}`}</M>
              </td>
              <td>
                <M>{String.raw`\ln y`}</M> against <M>{String.raw`x`}</M>
              </td>
              <td>
                <M>{String.raw`-b`}</M>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The last three are the ones that catch people out. If the power <M>{String.raw`n`}</M> is
        not known in advance, a log-log plot measures it: the gradient of{' '}
        <M>{String.raw`\log y`}</M> against <M>{String.raw`\log x`}</M> <em>is</em> the exponent.
        If the data really is a power law, that plot is a straight line; if it is not, the curvature
        tells you immediately that your model is wrong. That is worth a lot more than a bad fit.
      </p>

      <h3>Check the straightness</h3>
      <p>
        After transforming, the points should lie on a straight line. If they do not, something is
        wrong: the model is wrong, or the range of data is too wide for the model, or one of the
        points is bad. Do not draw a straight line through curved data and quote a gradient — the
        gradient of a curve depends on where you read it, and the answer will be arbitrary.
      </p>
      <p>
        A useful check: an intercept that should be zero but is not. For{' '}
        <M>{String.raw`T^2`}</M> against <M>{String.raw`L`}</M> the intercept is zero, because a
        pendulum of zero length has zero period. A large intercept usually means the horizontal
        axis does not start where you think it does — a length measured to the string's end rather
        than to the bob's centre, for instance, offsets every point by the same amount and shows up
        as an intercept rather than as a gradient.
      </p>
    </>
  ),

  scales: (
    <>
      <p>
        The scale is how one unit on the paper relates to one unit in the data, and it is a free
        choice that affects how well you can read the graph.
      </p>
      <ul>
        <li>
          <b>Start at zero</b> unless there is a reason not to. A graph that begins partway up a
          scale exaggerates the steepness of a line, and the reader is entitled to assume you
          started at zero.
        </li>
        <li>
          <b>Choose round numbers</b> for the axis limits and the gridlines: 0, 0.5, 1.0 rather
          than 0, 0.47, 0.94. Your points then land on or between readable gridlines.
        </li>
        <li>
          <b>Make the line use the paper.</b> A good graph spreads its data over most of the
          available area. A line squeezed into one corner is read badly, and its gradient is read
          off a short stretch, which is exactly where the relative error is largest.
        </li>
        <li>
          <b>Do not go past the data.</b> Lots of empty graph is wasted graph, and the eye
          measures the gradient relative to the whole page.
        </li>
      </ul>
      <p>
        If the data spans a wide range, consider a logarithmic scale — but only if the relationship
        is a power law, and label the axis clearly so the reader knows the spacing is not uniform.
      </p>
    </>
  ),

  'plotting-points': (
    <>
      <p>
        Mark each point with a small cross, and mark it at the <em>centre</em> of its uncertainty,
        not at its edge. A filled blob suggests more precision than you have; a neat dot suggests
        an exact measurement. A cross with bars is honest.
      </p>
      <p>
        Plot every point you measured, including the ones that do not fit. Leaving out the point
        that disagrees with you is not analysis, it is a different experiment — and if the
        disagreement is real, it is the most interesting thing in the data.
      </p>
      <p>
        If two points land on top of each other, offset one slightly and note that you have done
        so, or draw a symbol showing there are two.
      </p>
    </>
  ),

  'error-bars': (
    <>
      <p>
        An error bar shows the range within which the true value probably lies. It is drawn as a
        bar through the point, half above and half below, with a cap at each end.
      </p>
      <p>
        The bar is <b>one</b> uncertainty, not two and not the full range. If your reading is{' '}
        <M>{String.raw`x \pm \Delta x`}</M>, the bar runs from <M>{String.raw`x - \Delta x`}</M> to{' '}
        <M>{String.raw`x + \Delta x`}</M>.
      </p>
      <p>
        Every point gets an error bar, on both axes, and the uncertainty has to be the same for
        every point if the same instrument produced them all. A length gauge that reads to the
        nearest millimetre gives every length the same error bar; a stopwatch gives every timing
        the same one.
      </p>
      <p>
        When a quantity is calculated from others, its error bar is calculated too, and the
        calculation is not the same as the one for the quantity itself. For a product or a quotient,
        it is the <em>relative</em> uncertainties that add:
      </p>
      <Eq>
        {String.raw`\frac{\Delta (AB)}{AB} = \sqrt{\left(\frac{\Delta A}{A}\right)^2 + \left(\frac{\Delta B}{B}\right)^2}`}
      </Eq>
      <p>
        and for a power, the exponent comes along for the ride:
      </p>
      <Eq>
        {String.raw`\frac{\Delta (A^n)}{A^n} = n\,\frac{\Delta A}{A}`}
      </Eq>
      <p>
        So a period measured as <M>{String.raw`T = t_{20}/20`}</M> has an error bar of{' '}
        <M>{String.raw`\Delta t_{20}/20`}</M>, and a period that then gets squared has an error
        bar of <M>{String.raw`2T\,\Delta T`}</M> — squaring doubles the <em>relative</em>{' '}
        uncertainty, which is why the vertical error bars on a{' '}
        <M>{String.raw`T^2`}</M> graph are relatively larger than those on a{' '}
        <M>{String.raw`T`}</M> graph.
      </p>
      <p>
        Where the uncertainty in a plotted quantity comes from depends on the instrument and on
        what you did: half the smallest division for a reading off a scale, the scatter of
        repeated readings for anything measured by hand, and the propagated value for anything
        calculated.
      </p>
    </>
  ),

  'best-fit-line': (
    <>
      <p>
        Draw the best-fit line by hand, with a ruler, in one stroke if you can. It should pass
        close to the middle of the points — not through every one of them, and not through none of
        them.
      </p>
      <p>
        A line that wiggles to follow each point is not a fit; it is a record of the noise, and
        every wiggle you draw has a gradient of its own. A fit is a straight line, and the question
        it answers is "what single straight line best describes these points?".
      </p>
      <p>
        There is a reasonable way to do it by eye: mark the centre of the cloud of points, and
        draw a line through that centre with the right slope. The slope is fixed by the data
        itself, so all you are choosing is the position.
      </p>
      <p>
        The intercept is not free, either. On a graph where the relationship must pass through the
        origin, draw the line through the origin and through the middle of the points — but if
        your data says otherwise, do not force it, and say so.
      </p>
    </>
  ),

  'worst-acceptable-line': (
    <>
      <p>
        A best-fit line gives you a gradient, but not an uncertainty in it. For that you need two
        more lines: the <b>steepest</b> and the <b>shallowest</b> lines that still pass through
        every one of your error bars.
      </p>
      <p>
        Draw them with a ruler, without lifting the pencil, and keeping them as steep or as
        shallow as the data allows. They are usually much less tidy than the best-fit line, and
        that is fine — the gap between them is the honest statement of how well the data pins down
        the gradient.
      </p>
      <p>
        Read the gradient off all three lines. The uncertainty in the gradient is half the
        difference between the steepest and the shallowest:
      </p>
      <Eq>{String.raw`\Delta m = \frac{m_{\text{steep}} - m_{\text{shallow}}}{2}`}</Eq>
      <p>
        This is the same <b>max–min</b> method used elsewhere for propagating errors, and it is
        worth understanding why it works: the true gradient is somewhere in the range the data
        allows, and half the width of that range is a fair estimate of how wide it is. It is
        slightly conservative, which is the right side to err on.
      </p>
      <p>
        Two practical warnings. First, the extreme lines are only as good as the error bars: if a
        point is missing its bar, the steepest and shallowest lines collapse towards the
        best-fit line and you will report an uncertainty that is far too small. Second, if the
        data has real curvature, the extreme lines will be steep and shallow in ways that have
        little to do with the measurement uncertainty — that is a signal to look at the model, not
        to quote a big error bar.
      </p>
    </>
  ),

  'gradient-and-intercept': (
    <>
      <p>
        Read the gradient from the line using two points a long way apart, and take them from the
        line rather than from the data. Draw a thin ruler, or two imaginary horizontal lines a
        long way apart, and read the vertical distance between them against the horizontal
        distance:
      </p>
      <Eq>{String.raw`m = \frac{\Delta y}{\Delta x}`}</Eq>
      <p>
        Two points a long way apart are worth far more than two close together. If the total
        length of the line you are reading is <M>{String.raw`L`}</M> and each reading of a position
        has an uncertainty <M>{String.raw`\delta`}</M>, the uncertainty in the gradient is roughly{' '}
        <M>{String.raw`\sqrt{2}\,\delta / L`}</M> — so doubling the length of the stretch you
        read over halves the error in the gradient. Read it over as much of the line as you can.
      </p>
      <p>
        The intercept is the value of the vertical axis where the line crosses it, and it is read
        the same way — extend the line to the axis if the data do not reach it. An intercept that
        should be zero and is not is one of the most useful things a graph can tell you, so do not
        ignore it.
      </p>
      <p>
        Both numbers should carry units, and the units come from the axes: a gradient read off a
        graph of s² against m is in s² m⁻¹, and an intercept on that graph is in s².
      </p>
    </>
  ),
};
