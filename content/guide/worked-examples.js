// Prose for the guide's "Worked examples" section. `bodies` is keyed by the
// subsection ids in data/guide.js — those ids are what experiment hints
// link to, so add text here rather than renaming them. A subsection with no
// entry renders as a "Not written yet." stub; `intro` sits above the first.
// See content/guide/README.md for the maths/figure/table conventions.
//
// Demonstration only: real readings taken from a table to a graph to a
// number with an uncertainty. Explanation of each step belongs in the
// section that teaches it (the pipeline overview in Graphing, reporting a
// result in Error analysis) and is linked from here, not repeated. This is
// also where an experiment's worked solution lives — the pendulum links
// here only after an answer is committed (data/pendulumGuide.js).
//
// The worked example is written as questions rather than as narration: each
// step asks what the reader would have to work out, and the answer sits
// behind a disclosure (components/GuideQ.js). A student meeting the method
// for the first time can follow the argument without knowing what to do
// with it; a student meeting it for the first time *doing* the experiment
// needs the question as much as the answer.
import Link from 'next/link';
import { M, Eq } from '@/components/Maths';
import Fig from '@/components/Fig';
import GuideQ from '@/components/GuideQ';
import { guideHref } from '@/data/guide';

export const intro = (
  <>
    <p>
      The sections before this one each explain a step. This one does them all, on real readings,
      from the table to a result you can defend. If a step here is unfamiliar, the order they come
      in is set out in <Link href={guideHref('graphing', 'the-pipeline')}>the pipeline</Link>, and
      how to quote the final number is in{' '}
      <Link href={guideHref('error-analysis', 'reporting')}>reporting the result</Link>.
    </p>
    <p>
      Both examples use the pendulum because it is the experiment on this site, and because it
      exercises every step: a table, a linearisation, a gradient, an uncertainty, and a result
      that has to be reported. Nothing in the method is specific to it.
    </p>
  </>
);

export const bodies = {
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

  // Every number in this example comes from scripts/worked-example-partb.mjs:
  // the simulation's own exact period at L = 0.500 m, quantised by the
  // photogate's 1 ms resolution, then carried through with best, steepest
  // and shallowest lines — no regression. Rerun it before changing any
  // figure here. The readings are ours, not APhO's.
  'two-stage-fits': (
    <>
      <p>
        Part B of the pendulum asks for the small-amplitude period <M>{String.raw`T_0`}</M> and the
        constants <M>{String.raw`\alpha`}</M> and <M>{String.raw`\beta`}</M> in
      </p>
      <Eq>
        {String.raw`T = T_0\bigl(1 + \alpha\sin^2(\varphi_0/2) + \beta\sin^4(\varphi_0/2) + \cdots\bigr)`}
      </Eq>
      <p>
        Writing <M>{String.raw`x = \sin^2(\varphi_0/2)`}</M> turns the series into powers of{' '}
        <M>{String.raw`x`}</M>, and everything below works in <M>{String.raw`x`}</M>. One straight
        line cannot give both constants, so this is done in two stages over two ranges of release
        angle — and, as it turns out, done twice.
      </p>

      <h3>The readings</h3>
      <p>
        The bench: the pendulum at <M>{String.raw`L = 0.500\ \text{m}`}</M> from pivot to the centre
        of the bob (0.48 m of string and a 0.02 m bob). The photogate sits at the lowest point of the
        swing and logs each crossing to the nearest millisecond. Each reading is the time for{' '}
        <b>five periods</b>: crossing 1 to crossing 11 in the log. The release angle is read off the
        angle plate to the nearest degree.
      </p>
      <p>
        Both uncertainties come straight from the instruments. Five periods are the difference of
        two trigger times, each rounded to the nearest millisecond, so they are uncertain by up to
        1 ms — 0.2 ms per period. The angle is good to <M>{String.raw`\pm 0.5^\circ`}</M>, and{' '}
        <M>{String.raw`x`}</M> inherits
      </p>
      <Eq>{String.raw`\Delta x = \tfrac{1}{2}\sin\varphi_0\,\Delta\varphi_0 \qquad (\Delta\varphi_0 \text{ in radians})`}</Eq>
      <p>
        Set 1 covers small amplitudes, for <M>{String.raw`T_0`}</M> and <M>{String.raw`\alpha`}</M>:
      </p>
      <div className="guide-table">
        <table>
          <thead>
            <tr>
              <th>
                <M>{String.raw`\varphi_0`}</M> (°)
              </th>
              <th>
                <M>{String.raw`t_5`}</M> (ms)
              </th>
              <th>
                <M>{String.raw`T`}</M> (s)
              </th>
              <th>
                <M>{String.raw`x`}</M>
              </th>
              <th>
                <M>{String.raw`\Delta x`}</M>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr><td>7</td><td>7108</td><td>1.4216</td><td>0.00373</td><td>0.00053</td></tr>
            <tr><td>10</td><td>7114</td><td>1.4228</td><td>0.00760</td><td>0.00076</td></tr>
            <tr><td>14</td><td>7128</td><td>1.4256</td><td>0.01485</td><td>0.00106</td></tr>
            <tr><td>18</td><td>7145</td><td>1.4290</td><td>0.02447</td><td>0.00135</td></tr>
            <tr><td>22</td><td>7167</td><td>1.4334</td><td>0.03641</td><td>0.00163</td></tr>
            <tr><td>26</td><td>7193</td><td>1.4386</td><td>0.05060</td><td>0.00191</td></tr>
            <tr><td>30</td><td>7225</td><td>1.4450</td><td>0.06699</td><td>0.00218</td></tr>
            <tr><td>35</td><td>7270</td><td>1.4540</td><td>0.09042</td><td>0.00250</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Set 2 covers the whole range, for <M>{String.raw`\beta`}</M>:
      </p>
      <div className="guide-table">
        <table>
          <thead>
            <tr>
              <th>
                <M>{String.raw`\varphi_0`}</M> (°)
              </th>
              <th>
                <M>{String.raw`t_5`}</M> (ms)
              </th>
              <th>
                <M>{String.raw`T`}</M> (s)
              </th>
              <th>
                <M>{String.raw`x`}</M>
              </th>
              <th>
                <M>{String.raw`\Delta x`}</M>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr><td>10</td><td>7114</td><td>1.4228</td><td>0.00760</td><td>0.00076</td></tr>
            <tr><td>20</td><td>7155</td><td>1.4310</td><td>0.03015</td><td>0.00149</td></tr>
            <tr><td>30</td><td>7225</td><td>1.4450</td><td>0.06699</td><td>0.00218</td></tr>
            <tr><td>40</td><td>7324</td><td>1.4648</td><td>0.11698</td><td>0.00280</td></tr>
            <tr><td>50</td><td>7454</td><td>1.4908</td><td>0.17861</td><td>0.00334</td></tr>
            <tr><td>60</td><td>7621</td><td>1.5242</td><td>0.25000</td><td>0.00378</td></tr>
            <tr><td>70</td><td>7826</td><td>1.5652</td><td>0.32899</td><td>0.00410</td></tr>
            <tr><td>77</td><td>7997</td><td>1.5994</td><td>0.38752</td><td>0.00425</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Look at the top of set 1. Between 7° and 10° five periods change by only 6 ms, and every{' '}
        <M>{String.raw`T`}</M> moves in steps of 0.2 ms — the gate’s millisecond, shared over five
        periods. That is the scatter these graphs have to live with.
      </p>

      <h3>Stage one: T₀ and α</h3>
      <p>At small amplitudes the β term is negligible, and</p>
      <Eq>{String.raw`T = T_0 + T_0\alpha\,x`}</Eq>
      <p>
        is a straight line: <M>{String.raw`T`}</M> against <M>{String.raw`x`}</M>, with intercept{' '}
        <M>{String.raw`T_0`}</M> and gradient <M>{String.raw`T_0\alpha`}</M>.
      </p>
      <GuideQ q="Plot T against x for all of set 1, with ±0.2 ms and ±Δx error bars. What do the lines give for T₀ and α?">
        <p>
          The best line, through the middle of the points, is{' '}
          <M>{String.raw`T = 1.41993 + 0.3747\,x`}</M>. The steepest and shallowest lines that still
          pass through every error bar are
        </p>
        <Eq>{String.raw`T = 1.41973 + 0.3916\,x \qquad T = 1.42055 + 0.3578\,x`}</Eq>
        <p>
          so the gradient is <M>{String.raw`0.375 \pm 0.017\ \text{s}`}</M> (half the difference of
          the extremes) and the intercept is{' '}
          <M>{String.raw`T_0 = 1.4199 \pm 0.0004\ \text{s}`}</M>. Then <M>{String.raw`\alpha`}</M> is
          gradient over intercept, and its relative uncertainty is the two relative uncertainties
          added:
        </p>
        <Eq>{String.raw`\alpha = \frac{0.3747}{1.41993} = 0.264, \qquad \frac{\Delta\alpha}{\alpha} = \frac{0.017}{0.375} + \frac{0.0004}{1.420} = 4.5\%`}</Eq>
        <p>
          so <M>{String.raw`\alpha = 0.264 \pm 0.012`}</M>.
        </p>
      </GuideQ>

      <h3>Stage two: β</h3>
      <p>
        With <M>{String.raw`T_0`}</M> in hand, divide it out and divide by <M>{String.raw`x`}</M>:
      </p>
      <Eq>{String.raw`y = \frac{T/T_0 - 1}{x} = \alpha + \beta x + \cdots`}</Eq>
      <p>
        Another straight line: <M>{String.raw`y`}</M> against <M>{String.raw`x`}</M> has gradient{' '}
        <M>{String.raw`\beta`}</M>, and its intercept is <M>{String.raw`\alpha`}</M> again — a check
        on stage one for free.
      </p>
      <GuideQ q="Where do the error bars on y come from, and why are they so big at small angles?">
        <p>
          Three places: the timing (0.2 ms in <M>{String.raw`T`}</M>), the angle (through{' '}
          <M>{String.raw`\Delta x`}</M>), and <M>{String.raw`T_0`}</M> itself, which is only known to
          0.4 ms. All three are divided by <M>{String.raw`x`}</M>, and at 10°{' '}
          <M>{String.raw`x`}</M> is 0.0076 — so a 0.4 ms doubt in <M>{String.raw`T_0`}</M> becomes
          0.038 in <M>{String.raw`y`}</M>, bigger than the whole rise of the line. Adding the three,
          for set 2 with <M>{String.raw`T_0 = 1.41993\ \text{s}`}</M>:
        </p>
        <div className="guide-table">
          <table>
            <thead>
              <tr>
                <th>
                  <M>{String.raw`\varphi_0`}</M> (°)
                </th>
                <th>10</th>
                <th>20</th>
                <th>30</th>
                <th>40</th>
                <th>50</th>
                <th>60</th>
                <th>70</th>
                <th>77</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <M>{String.raw`y`}</M>
                </td>
                <td>0.266</td>
                <td>0.259</td>
                <td>0.264</td>
                <td>0.270</td>
                <td>0.279</td>
                <td>0.294</td>
                <td>0.311</td>
                <td>0.326</td>
              </tr>
              <tr>
                <td>
                  <M>{String.raw`\Delta y`}</M>
                </td>
                <td>0.083</td>
                <td>0.027</td>
                <td>0.015</td>
                <td>0.010</td>
                <td>0.008</td>
                <td>0.006</td>
                <td>0.005</td>
                <td>0.005</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The low points are almost uninformative, and the error bars say so. That is what they are
          for: the lines get pinned by the points that can pin them.
        </p>
      </GuideQ>
      <GuideQ q="Draw the lines through all of set 2. What is β?">
        <p>
          Best <M>{String.raw`y = 0.248 + 0.210\,x`}</M>; steepest{' '}
          <M>{String.raw`y = 0.230 + 0.263\,x`}</M>; shallowest{' '}
          <M>{String.raw`y = 0.260 + 0.158\,x`}</M>. So
        </p>
        <Eq>{String.raw`\beta = 0.210 \pm 0.052, \qquad \text{intercept: } \alpha = 0.248 \pm 0.015`}</Eq>
      </GuideQ>

      <h3>Are the lines straight?</h3>
      <p>
        The true values are <M>{String.raw`\alpha = 1/4`}</M> and{' '}
        <M>{String.raw`\beta = 9/64 = 0.141`}</M>, the real coefficients of the pendulum’s period.
        Neither interval above contains its true value: <M>{String.raw`0.264 \pm 0.012`}</M> stops
        short of 0.25, and <M>{String.raw`0.210 \pm 0.052`}</M> stops short of 0.141. Nothing was
        mismeasured. Both lines are bent, and a student without the answer can see it in their own
        data.
      </p>
      <GuideQ q="Stage one assumed that (T/T₀ − 1)/x is a constant, α. Is it, across set 1?">
        <p>
          Work it out for the top of set 1: at 35°, <M>{String.raw`y = 0.265`}</M>. Stage two’s
          intercept says that as <M>{String.raw`x \to 0`}</M> it is 0.248. So by 35° the{' '}
          <M>{String.raw`\beta x`}</M> term is already 7% of <M>{String.raw`\alpha`}</M> — more than
          the 4.5% uncertainty stage one claimed. Stage one’s straight line is really a gentle curve,
          and its gradient has absorbed part of <M>{String.raw`\beta`}</M>.
        </p>
        <p>
          The cure is to keep only the points where the neglected term is small next to the
          uncertainty. With <M>{String.raw`\beta \approx 0.2`}</M>, keeping{' '}
          <M>{String.raw`\beta x/\alpha`}</M> under about 3% means <M>{String.raw`x < 0.037`}</M> —
          release angles up to 22°.
        </p>
      </GuideQ>
      <GuideQ q="Is the stage-two graph a straight line?">
        <p>Take the slope between each pair of neighbouring points:</p>
        <div className="guide-table">
          <table>
            <thead>
              <tr>
                <th>between</th>
                <th>20–30°</th>
                <th>30–40°</th>
                <th>40–50°</th>
                <th>50–60°</th>
                <th>60–70°</th>
                <th>70–77°</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>slope</td>
                <td>0.14</td>
                <td>0.13</td>
                <td>0.15</td>
                <td>0.20</td>
                <td>0.22</td>
                <td>0.26</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          (10–20° comes out negative, but those two bars are wide enough to allow almost anything.)
          From 50° up the slope climbs steadily: the points curve upwards. That is the{' '}
          <M>{String.raw`\cdots`}</M> in the formula — the next term of the series — and a straight
          line drawn through it reads too steep. Drop 70° and 77°. Stopping at 50° instead would
          remove more of the curve, but it also throws away the points that pin the gradient, and the
          uncertainty in <M>{String.raw`\beta`}</M> nearly doubles. 60° is the compromise.
        </p>
      </GuideQ>

      <h3>The second pass</h3>
      <p>
        Stage one again, set 1 up to 22° only: best <M>{String.raw`T = 1.42015 + 0.3635\,x`}</M>,
        steepest <M>{String.raw`T = 1.41970 + 0.3998\,x`}</M>, shallowest{' '}
        <M>{String.raw`T = 1.42075 + 0.3271\,x`}</M>, so
      </p>
      <Eq>{String.raw`T_0 = 1.4202 \pm 0.0005\ \text{s}, \qquad \alpha = \frac{0.3635}{1.42015} = 0.256 \pm 0.026`}</Eq>
      <p>
        The uncertainty in <M>{String.raw`\alpha`}</M> has doubled — five points over a short range
        pin a gradient less well than eight over a long one — and that is the honest price of a line
        that is actually straight.
      </p>
      <p>
        Stage two again, set 2 up to 60°, with the new <M>{String.raw`T_0`}</M>: best{' '}
        <M>{String.raw`y = 0.247 + 0.179\,x`}</M>, steepest{' '}
        <M>{String.raw`y = 0.224 + 0.309\,x`}</M>, shallowest{' '}
        <M>{String.raw`y = 0.274 + 0.049\,x`}</M>, so <M>{String.raw`\beta = 0.18 \pm 0.13`}</M>.
      </p>
      <p>Reported to the precision the uncertainties support:</p>
      <Eq>{String.raw`T_0 = 1.4202 \pm 0.0005\ \text{s}, \qquad \alpha = 0.26 \pm 0.03, \qquad \beta = 0.18 \pm 0.13`}</Eq>
      <p>
        The simulation’s true values are{' '}
        <M>{String.raw`T_0 = 2\pi\sqrt{L/g} = 1.4202\ \text{s}`}</M>, <M>{String.raw`\alpha = 0.25`}</M>{' '}
        and <M>{String.raw`\beta = 0.141`}</M>, and all three intervals contain them. The first pass
        gave narrower intervals that did not. A tight answer that misses is worse than a wide one
        that brackets the truth.
      </p>

      <h3>What limited β</h3>
      <p>
        Not the timing. At 60° the bar on <M>{String.raw`y`}</M> is 0.0066, and 0.0044 of it comes
        from the angle — a half-degree doubt in <M>{String.raw`\varphi_0`}</M>. Timing ten periods
        instead of five would shrink the smallest part of the bar; reading the angle more finely,
        through the lens, would shrink the biggest.
      </p>
      <p>
        And there is a window. Below about 30° the <M>{String.raw`\beta x`}</M> term is too small
        next to the bars to measure; above about 60° the next term bends the line. Finding that
        window from your own data, rather than taking it on trust, is most of what this part of the
        experiment is for.
      </p>
    </>
  ),
};
