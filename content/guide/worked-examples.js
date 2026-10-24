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
import PartBStageOne from './figures/PartBStageOne';
import PartBStageTwo from './figures/PartBStageTwo';
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
  // Every number in this example comes from scripts/worked-example-parta.mjs:
  // the simulation's exact period at a 5° release, timed by a modelled hand
  // whose reaction time varies from press to press, then carried through with
  // best, steepest and shallowest lines — no regression. Rerun it before
  // changing any figure here. The seed was fixed before the first run and not
  // chosen for the result; the result misses, and the example says why.
  'worked-example': (
    <>
      <p>
        Here is a complete set of readings from the pendulum bench, and the whole analysis worked
        through. Six lengths, from 0.250 m to 0.500 m between the pivot and the centre of the bob,
        each read off the vertical scale. At each length the stopwatch times twenty complete
        oscillations of a pendulum released at about 5°. At one length, 0.350 m, that timing is
        repeated five times.
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

      <h3>The uncertainty in the timing</h3>
      <p>
        <M>{String.raw`\Delta L = 0.0005\ \text{m}`}</M> for every row: the scale reads to the
        nearest millimetre, so a reading is good to half of that. The timing needs more care. The
        stopwatch displays hundredths of a second, but its real error is the person pressing it, and
        the only way to find out how large that error is is to measure it.
      </p>
      <GuideQ q="Time twenty oscillations five times at one length. What is the uncertainty in one timing?">
        <p>At <M>{String.raw`L = 0.350\ \text{m}`}</M>:</p>
        <div className="guide-table">
          <table>
            <thead>
              <tr>
                <th>repeat</th>
                <th>1</th>
                <th>2</th>
                <th>3</th>
                <th>4</th>
                <th>5</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <M>{String.raw`t_{20}`}</M> (s)
                </td>
                <td>23.82</td>
                <td>23.83</td>
                <td>23.72</td>
                <td>23.82</td>
                <td>23.73</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The mean is 23.784 s and the readings range over 0.11 s. Half the range is the
          uncertainty in one timing, as in the tabulation section:
        </p>
        <Eq>{String.raw`\Delta t_{20} = \frac{23.83 - 23.72}{2} = 0.055\ \text{s}, \qquad \Delta T_0 = \frac{\Delta t_{20}}{20} = 0.0028\ \text{s}`}</Eq>
      </GuideQ>
      <GuideQ q="A common estimate is 0.2 s of reaction time at the two ends of the interval. How does that compare with the spread you measured?">
        <p>
          The 0.2 s estimate gives <M>{String.raw`\Delta T_0 = 0.2/20 = 0.010\ \text{s}`}</M>. The
          spread gives 0.0028 s, smaller by a factor of 3.6.
        </p>
        <p>
          The two numbers measure different things. Each press of the stopwatch comes some time
          after the bob passes the point you are watching. If that delay were the same at the start
          and at the stop, it would cancel out of the interval entirely. What does not cancel is how
          much the delay changes from one press to the next, and that is what the spread of the
          repeats measures: 0.055 s for the interval, which is about 0.04 s per press. The 0.2 s
          figure counts the whole delay at both ends, including the part that cancels.
        </p>
        <p>
          This example uses <M>{String.raw`\Delta T_0 = 0.0028\ \text{s}`}</M>, the value from the
          spread, because it was measured rather than assumed.
        </p>
      </GuideQ>
      <GuideQ q="Do you repeat the timing five times at every length?">
        <p>
          Not here. The other five lengths are each timed once, and each single timing is given the
          same <M>{String.raw`\Delta T_0 = 0.0028\ \text{s}`}</M>. This is a trade of accuracy for
          time: five repeats at six lengths is thirty timings, and this way it is ten.
        </p>
        <p>
          The trade is reasonable because the source of the error does not change between lengths.
          It is the same person pressing the same stopwatch at the same point in the swing, and the
          periods differ by less than a factor of 1.5, so there is no reason for one single timing to
          scatter more or less than another. What it assumes is that the spread of five repeats is a
          good measure of that scatter. The end of this example shows what that assumption costs.
        </p>
      </GuideQ>

      <h3>The table</h3>
      <div className="guide-table">
        <table>
          <thead>
            <tr>
              <th>
                <M>{String.raw`L`}</M> (m)
              </th>
              <th>
                <M>{String.raw`t_{20}`}</M> (s)
              </th>
              <th>
                <M>{String.raw`T_0`}</M> (s)
              </th>
              <th>
                <M>{String.raw`T_0^2`}</M> (s²)
              </th>
              <th>
                <M>{String.raw`\Delta(T_0^2)`}</M> (s²)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr><td>0.250</td><td>19.99</td><td>0.9995</td><td>0.9990</td><td>0.0055</td></tr>
            <tr><td>0.300</td><td>21.98</td><td>1.0990</td><td>1.2078</td><td>0.0060</td></tr>
            <tr><td>0.350</td><td>23.784</td><td>1.1892</td><td>1.4142</td><td>0.0065</td></tr>
            <tr><td>0.400</td><td>25.47</td><td>1.2735</td><td>1.6218</td><td>0.0070</td></tr>
            <tr><td>0.450</td><td>27.03</td><td>1.3515</td><td>1.8266</td><td>0.0074</td></tr>
            <tr><td>0.500</td><td>28.44</td><td>1.4220</td><td>2.0221</td><td>0.0078</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        The 0.350 m row is the mean of the five repeats. Every row has{' '}
        <M>{String.raw`\Delta L = 0.0005\ \text{m}`}</M> and{' '}
        <M>{String.raw`\Delta T_0 = 0.0028\ \text{s}`}</M>. The last column follows from the
        squaring, which doubles the relative uncertainty:
      </p>
      <Eq>{String.raw`\Delta(T_0^2) = 2T_0\,\Delta T_0`}</Eq>
      <p>Those are the numbers the error bars are drawn from.</p>

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
          Here the best line is <M>{String.raw`T_0^2 = -0.025 + 4.107\,L`}</M>, and the steepest
          and shallowest are <M>{String.raw`-0.049 + 4.162\,L`}</M> and{' '}
          <M>{String.raw`-0.007 + 4.053\,L`}</M>, so
        </p>
        <Eq>{String.raw`m = 4.11 \pm 0.05\ \text{s}^2\text{m}^{-1}`}</Eq>
      </GuideQ>

      <GuideQ q="How does the uncertainty in the gradient reach g, and what is the final answer?">
        <p>
          From the gradient, <M>{String.raw`g = 4\pi^2/m`}</M>, and the fractional uncertainty in{' '}
          <M>{String.raw`g`}</M> is the fractional uncertainty in <M>{String.raw`m`}</M>:
        </p>
        <Eq>{String.raw`\frac{\Delta g}{g} = \frac{\Delta m}{m} = \frac{0.054}{4.107} = 1.3\%, \qquad g = 9.61 \pm 0.13\ \text{m s}^{-2}`}</Eq>
        <p>
          The other route is a single length. From <M>{String.raw`g = 4\pi^2 L/T_0^2`}</M> at{' '}
          <M>{String.raw`L = 0.350\ \text{m}`}</M>, the length with the repeats, adding the
          relative uncertainties in quadrature:
        </p>
        <Eq>
          {String.raw`\left(\frac{\Delta g}{g}\right)^2 = \left(\frac{\Delta L}{L}\right)^2 + 4\left(\frac{\Delta T_0}{T_0}\right)^2`}
        </Eq>
        <p>
          The length contributes 0.14% and the timing 0.46%, so the timing dominates, and{' '}
          <M>{String.raw`g = 9.77 \pm 0.05\ \text{m s}^{-2}`}</M>.
        </p>
      </GuideQ>

      <h3>Checking the result</h3>
      <p>
        The simulation uses <M>{String.raw`g = 9.787\ \text{m s}^{-2}`}</M>. The single-length
        result, <M>{String.raw`9.77 \pm 0.05`}</M>, contains it. The graph result,{' '}
        <M>{String.raw`9.61 \pm 0.13`}</M>, does not: its upper end is 9.74.
      </p>
      <GuideQ q="Your best-fit line does not pass through the origin. What should you do about it?">
        <p>
          The intercept here is <M>{String.raw`-0.025 \pm 0.021\ \text{s}^2`}</M>, and the
          physics says it must be zero. That is the sign in the data, visible without knowing the
          true value, that the line is tilted. Find out what it means before you trust the
          gradient.
        </p>
        <p>
          One cause is a fixed error, such as every length measured to the end of the string
          instead of to the centre of the bob. That shifts every point by the same amount, so it
          shows up as an intercept, and it does not average away over six rows. That is not what
          happened here. The cause here is one timing: the single reading at 0.250 m came out about
          0.1 s short, roughly twice the spread of the repeats. That is not unusual for one timing
          in five, but its error bar is drawn from the spread of five repeats and does not reach
          the true line, and a low point at the short end tilts the line steeper.
        </p>
      </GuideQ>
      <GuideQ q="So was carrying ΔT₀ across to the other lengths a mistake?">
        <p>
          It was a trade, and this is its cost. Half the range of five repeats is close to one
          standard deviation of a single timing, so each single timing has a fair chance of falling
          outside its error bar, and with five single timings at least one does in about three runs
          out of four. Repeat this whole
          procedure many times on the simulation and the interval for{' '}
          <M>{String.raw`g`}</M> misses the true value about two times in five.
        </p>
        <p>
          The way to remove the cost is to repeat the timing at every length and use each length's
          mean and its own spread. That is five times the timing, and it is what an experiment with
          the time to spare should do. When you make the trade, say that you made it, and treat a
          non-zero intercept as a sign that it has cost you.
        </p>
        <p>
          A tight answer that misses is worse than a wider one that contains the true value. Here
          the more careful result is the single length with five repeats.
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

      <Fig
        num="5.1"
        id="fig-partb-stage-one"
        caption="Stage one. T against x for set 1. The best line, and the steepest and shallowest lines that still pass through every error bar, all drawn through the five points below 22°. The intercept is T₀, the gradient is T₀α. The hollow points sit above the line — that is the curvature, visible from the data alone."
      >
        <PartBStageOne />
      </Fig>

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

      <Fig
        num="5.2"
        id="fig-partb-stage-two"
        caption="Stage two. The same readings as y = (T/T₀ − 1)/x. The intercept is α and the gradient is β. The 70° and 77° points, hollow, climb above the fan."
      >
        <PartBStageTwo />
      </Fig>

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
