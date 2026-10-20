// Prose for the guide's "Error analysis" section. `bodies` is keyed by the
// subsection ids in data/guide.js — those ids are what experiment hints
// link to, so add text here rather than renaming them. A subsection with no
// entry renders as a "Not written yet." stub; `intro` sits above the first.
// See content/guide/README.md for the maths/figure/table conventions.
import { M, Eq } from '@/components/Maths';
import Fig from '@/components/Fig';
import QuadratureCuboid from './figures/QuadratureCuboid';

export const intro = null;

export const bodies = {
  introduction: (
    <>
      <p>
        Now there's two parts to this, first of all is actually finding the error in a measured
        quantity, and then second is actually propagating the errors to calculated quantities.
      </p>
      <p>
        This is the part where a lot of students may get overwhelmed in, but remember, in most
        experiment problems, a general sense of the technique can be enough — formal exact error
        analysis is too rigorous for Olympiads, and hence try to make your answer reasonably
        calculated.
      </p>
      <p>
        A bit of context, errors can be represented either as ABSOLUTE errors or RELATIVE errors
        (called percentage errors when expressed as percentage).
      </p>
      <p>
        ABSOLUTE errors are the magnitude of the errors themselves, the value which we calculate in
        (1) below.
      </p>
      <Eq>{String.raw`\text{Absolute Error} = \Delta x`}</Eq>
      <p>
        RELATIVE errors are the absolute errors divided by the determined value itself (hence
        dimensionless)
      </p>
      <Eq>{String.raw`\text{Relative Error} = \frac{\Delta x}{x}`}</Eq>
      <Eq>{String.raw`\text{Percentage Error} = \left(\frac{\Delta x}{x}\right) \times 100\%`}</Eq>
    </>
  ),

  'finding-the-error': (
    <>
      <h3 id="measurement-device">i) Error in Measurement device</h3>
      <p>
        For measurement devices which have even divisions and you have to read off them, the
        error/uncertainty is half the smallest division. This applies to most analogue devices:
        rulers, analog voltmeters and ammeters, protractors, etc.
      </p>
      <p>
        There's unfortunately not really an easy way to reduce this error besides just using a more
        accurate device, that is, the divisions being finer.
      </p>

      <h3 id="statistical-error">ii) Statistical error</h3>
      <p>
        These are fluctuating errors that appear naturally due to unpredictable environmental
        variances, observer reaction times, or intrinsic system noise.
      </p>
      <p>
        For these errors, we require repeat measurements of the same event multiple times to get
        multiple readings. With say <M>{String.raw`N`}</M> readings:
      </p>
      <p>We first find the mean</p>
      <Eq>{String.raw`\bar{x} = \frac{1}{N}\sum_{i=1}^{N} x_i`}</Eq>
      <p>Then we calculate the experimental standard deviation</p>
      <p>
        (by the way we divide by <M>{String.raw`N-1`}</M> not <M>{String.raw`N`}</M> here, this is
        because this is a better estimation of the population [its actual values] distribution from
        the sample [what we measure] distribution, this is called Bessel's correction if you're
        curious)
      </p>
      <Eq>{String.raw`\sigma = \sqrt{\frac{1}{N-1}\sum_{i=1}^{N}(x_i - \bar{x})^2}`}</Eq>
      <p>Best to use your calculator's statistics function for this!</p>
      <p>Now this isn't QUITE the uncertainty/error in the mean quite yet!</p>
      <p>To find the standard error of the mean, do this last step:</p>
      <Eq>{String.raw`\Delta\bar{x} = \frac{\sigma}{\sqrt{N}}`}</Eq>
      <p>
        If the question is structured so that you really cannot make enough time to do this entire
        process, and the number of measurements is small enough (around 3 to 5), then you can take a
        VERY rough and informal estimation of the error as:
      </p>
      <Eq>{String.raw`\Delta x = \frac{x_\text{max} - x_\text{min}}{2}`}</Eq>
    </>
  ),

  'propagating-errors': (
    <>
      <p>
        The formal calculus based method will be introduced a bit later, let's first get used to
        it's results for the common case where the derived quantity is a sum or a product of
        different exponents (power law) of the quantities with the error whose value we know.
      </p>
      <p>
        An important idea is "adding in quadrature", which is to say that we take the square of the
        terms and add them, then finally take the square root — in a way that's pretty much
        pythagorean addition.
      </p>
      <p>
        For sums (and differences) we add the ABSOLUTE errors in quadrature, and scale each of the
        errors with their coefficients so say for <M>{String.raw`Q = aP + bT - cL`}</M>, we get:
      </p>
      <Eq>{String.raw`\Delta Q = \sqrt{a^2(\Delta P)^2 + b^2(\Delta T)^2 + c^2(\Delta L)^2}`}</Eq>
      <p>
        For products (and divisions) we add the RELATIVE errors in quadrature (to also get a relative
        error), and scale each of the errors with their corresponding exponents so say
        for <M>{String.raw`Q = P^a T^b / L^c`}</M>, we get:
      </p>
      <Eq>
        {String.raw`\frac{\Delta Q}{Q} = \sqrt{\left(a\,\frac{\Delta P}{P}\right)^2 + \left(b\,\frac{\Delta T}{T}\right)^2 + \left(c\,\frac{\Delta L}{L}\right)^2}`}
      </Eq>
      <p>
        Now again, If the question is structured so that you really cannot make enough time to do
        this entire process, then you can leave the accuracy provided by adding in quadrature and
        just add the terms normally (but please make all the coefficients positive!), so for the
        above we get:
      </p>
      <Eq>{String.raw`\Delta Q = |a|\Delta P + |b|\Delta T + |c|\Delta L`}</Eq>
      <p>And</p>
      <Eq>
        {String.raw`\frac{\Delta Q}{Q} = |a|\left(\frac{\Delta P}{P}\right) + |b|\left(\frac{\Delta T}{T}\right) + |c|\left(\frac{\Delta L}{L}\right)`}
      </Eq>
      <p>
        You can think of it as calculating the diagonal through a cuboid (not necessarily 3
        dimensional though), which basically takes into account all the errors.
      </p>
      <Fig
        num="2.1"
        id="quadrature-cuboid"
        caption="The three errors laid tip to tail; ΔQ is the arrow that closes the chain."
      >
        <QuadratureCuboid />
      </Fig>
      <p>
        An important caveat in quadrature is that the different errors need to be independent and
        uncorrelated, this means that how much error is in one variable should not affect the
        others', say the error in measurement of <M>{String.raw`d`}</M> by a ruler should not affect
        the error in measuring <M>{String.raw`T`}</M> from your stopwatch, this is usually a met
        condition.
      </p>

      <h3 id="max-min-method">The max–min method</h3>
      <p>
        Now, yeah there's cases like <M>{String.raw`F = mg\sin\theta`}</M> and there is uncertainty
        in <M>{String.raw`\theta`}</M> (the angle), or say <M>{String.raw`E = k/(n-1)`}</M> and
        there's uncertainty in <M>{String.raw`n`}</M>. Here the addition case and the power law case
        doesn't apply. Here an informal method exists, just take the difference in the maximum value
        of the derived quantity (<M>{String.raw`F`}</M> or <M>{String.raw`E`}</M> here) and the
        minimum value of that quantity and half it.
      </p>
      <p>
        Actually this is mostly what we do for finding the uncertainty of the gradient too! Unless
        you go the formal way and use regression (not as common).
      </p>
      <Eq>{String.raw`\Delta q = \frac{q_\text{max} - q_\text{min}}{2}`}</Eq>
      <p>
        One thing to watch: this works as long as the quantity varies in one direction only over the
        interval <M>{String.raw`[x - \Delta x,\ x + \Delta x]`}</M> — that is, it keeps increasing or
        keeps decreasing. Then the largest and smallest values really do sit at the two ends. If
        there's a turning point inside the interval, the extreme value is at the turning point rather
        than at an end, and you'd have to find it there instead. In practice the intervals are small
        and this rarely bites, but it's worth a glance at the function first.
      </p>
      <p>Lets treat this for our cases:</p>
      <Eq>{String.raw`F_\text{max} = mg\sin(\theta + \Delta\theta)`}</Eq>
      <Eq>{String.raw`F_\text{min} = mg\sin(\theta - \Delta\theta)`}</Eq>
      <Eq>
        {String.raw`\Delta F = \frac{mg\sin(\theta + \Delta\theta) - mg\sin(\theta - \Delta\theta)}{2}`}
      </Eq>
      <p>
        To find <M>{String.raw`\Delta F`}</M>.
      </p>
      <Eq>{String.raw`E_\text{max} = \frac{k}{(n - \Delta n) - 1}`}</Eq>
      <Eq>{String.raw`E_\text{min} = \frac{k}{(n + \Delta n) - 1}`}</Eq>
      <Eq>
        {String.raw`\Delta E = \frac{E_\text{max} - E_\text{min}}{2} = \frac{1}{2}\left[\frac{k}{n - \Delta n - 1} - \frac{k}{n + \Delta n - 1}\right]`}
      </Eq>
      <p>
        To find <M>{String.raw`\Delta E`}</M>.
      </p>
      <p>
        Here be careful! <M>{String.raw`E(n)`}</M> is a decreasing function (that is to say,
        as <M>{String.raw`n`}</M> increases <M>{String.raw`E`}</M> decreases, or in other
        words <M>{String.raw`E'(n) < 0`}</M>) so the smaller value of <M>{String.raw`n`}</M> gives
        the larger value of <M>{String.raw`E`}</M>.
      </p>
    </>
  ),

  'formal-propagation': (
    <>
      <p>
        The most general way to look at the relationship between our variables [both the one whose
        uncertainty we want to know and the ones we already know] is as a function, now what applies
        to all (assumed continuous) functions in general?
      </p>
      <p>
        That it can be written as a (infinite) polynomial function! This is called a Taylor Series
        and to write a function as such is called a Taylor expansion.
      </p>
      <p>
        If this is your first time learning about Taylor Series, or that your grasp of these concepts
        are still a bit shaky. You could watch this
        video: <a href="https://www.youtube.com/watch?v=3d6DsjIBzJ4">https://www.youtube.com/watch?v=3d6DsjIBzJ4</a>
      </p>
      <p>
        Now let's write this functional relationship. Say now <M>{String.raw`Q = f(P, T, L)`}</M>.
      </p>
      <p>
        Now, we can write each of the variables in the functions
        as <M>{String.raw`x = x_\text{mean} \pm \Delta x`}</M>.
      </p>
      <p>
        So we get <M>{String.raw`Q \pm \Delta Q = f(P \pm \Delta P,\ T \pm \Delta T,\ L \pm \Delta L)`}</M>.
      </p>
      <p>Now let's do the taylor expansion around the mean:</p>
      <Eq>
        {String.raw`f(\bar{P} \pm \Delta P, \bar{T} \pm \Delta T, \bar{L} \pm \Delta L) = f(\bar{P}, \bar{T}, \bar{L}) + \frac{\partial f}{\partial P}(\pm\Delta P) + \frac{\partial f}{\partial T}(\pm\Delta T) + \frac{\partial f}{\partial L}(\pm\Delta L) + \mathcal{O}(\Delta x^2)`}
      </Eq>
      <p>
        Here the partial derivative is used, this means that when we differentiate we only
        differentiate with respect to <M>{String.raw`P`}</M> and treat everything else as constants!
      </p>
      <p>
        Now <M>{String.raw`\mathcal{O}(\Delta x^2)`}</M> pretty much groups all the higher order
        terms in order <M>{String.raw`\Delta x^2`}</M> where <M>{String.raw`x`}</M> can
        be <M>{String.raw`P`}</M>, <M>{String.raw`T`}</M>, <M>{String.raw`L`}</M>:
      </p>
      <Eq>
        {String.raw`\bar{Q} \pm \Delta Q \approx f(\bar{P}, \bar{T}, \bar{L}) + \frac{\partial f}{\partial P}(\pm\Delta P) + \frac{\partial f}{\partial T}(\pm\Delta T) + \frac{\partial f}{\partial L}(\pm\Delta L)`}
      </Eq>
      <Eq>
        {String.raw`\pm\Delta Q = \frac{\partial f}{\partial P}(\pm\Delta P) + \frac{\partial f}{\partial T}(\pm\Delta T) + \frac{\partial f}{\partial L}(\pm\Delta L)`}
      </Eq>
      <p>Now, we're not quite there yet! To deal with the signs, we square both sides.</p>
      <p>
        Now when we square the right hand side, you will notice we get some terms
        in <M>{String.raw`\Delta P\,\Delta T`}</M>, <M>{String.raw`\Delta T\,\Delta L`}</M> and <M>{String.raw`\Delta P\,\Delta L`}</M>,
        these are called cross product terms. When the errors in these three variables are
        independent (as mentioned earlier), each cross term is just as likely to come out positive
        as negative — the errors don't know about each other — so over many repeats of the whole
        experiment they average to zero and we drop them. (For any one single measurement they are
        of course still there; what we're really calculating is the typical size
        of <M>{String.raw`\Delta Q`}</M>, not its value on one particular run.) Dropping them, we
        recover the final:
      </p>
      <Eq>
        {String.raw`\Delta Q = \sqrt{\left(\frac{\partial f}{\partial P}\right)^2(\Delta P)^2 + \left(\frac{\partial f}{\partial T}\right)^2(\Delta T)^2 + \left(\frac{\partial f}{\partial L}\right)^2(\Delta L)^2}`}
      </Eq>
      <p>
        The structure is the exact same as we've seen before, terms added in quadrature, scaled by
        their partial derivatives.
      </p>
      <p>
        This might not make much sense yet, so let's apply them to the cases we treated before
        informally:
      </p>

      <h3>
        <M>{String.raw`F = mg\sin\theta`}</M>
      </h3>
      <Eq>{String.raw`F = f(\theta) = mg\sin\theta`}</Eq>
      <Eq>{String.raw`\frac{\partial F}{\partial\theta} = \frac{d}{d\theta}(mg\sin\theta) = mg\cos\theta`}</Eq>
      <Eq>
        {String.raw`\Delta F = \sqrt{\left(\frac{\partial F}{\partial\theta}\right)^2(\Delta\theta)^2} = \left|\frac{\partial F}{\partial\theta}\right|\Delta\theta`}
      </Eq>
      <Eq>{String.raw`\Delta F = (mg\cos\theta)\cdot\Delta\theta`}</Eq>
      <p>
        BY THE WAY, keep <M>{String.raw`\theta`}</M> in radians, as we always do in calculus!
      </p>
      <p>
        This can be easily edited for when we have an error in the mass <M>{String.raw`m`}</M>,
      </p>
      <Eq>{String.raw`F = f(m, \theta) = mg\sin\theta`}</Eq>
      <Eq>
        {String.raw`\Delta F = \sqrt{\left(\frac{\partial F}{\partial m}\right)^2(\Delta m)^2 + \left(\frac{\partial F}{\partial\theta}\right)^2(\Delta\theta)^2}`}
      </Eq>
      <Eq>{String.raw`\Delta F = \sqrt{(g\sin\theta\cdot\Delta m)^2 + (mg\cos\theta\cdot\Delta\theta)^2}`}</Eq>

      <h3>
        <M>{String.raw`E = k/(n-1)`}</M>
      </h3>
      <Eq>{String.raw`E = f(n) = k(n-1)^{-1}`}</Eq>
      <Eq>
        {String.raw`\frac{\partial E}{\partial n} = k\cdot(-1)(n-1)^{-2}\cdot\frac{d}{dn}(n-1) = -\frac{k}{(n-1)^2}`}
      </Eq>
      <Eq>
        {String.raw`\Delta E = \sqrt{\left(\frac{\partial E}{\partial n}\right)^2(\Delta n)^2} = \left|\frac{\partial E}{\partial n}\right|\Delta n`}
      </Eq>
      <Eq>{String.raw`\Delta E = \frac{k}{(n-1)^2}\cdot\Delta n`}</Eq>
      <p>
        Now remember, you can also sacrifice some accuracy for time AGAIN by NOT adding in
        quadrature and doing plain addition! That is almost always acceptable in Olympiads. SO
        for <M>{String.raw`F`}</M> it would look like:
      </p>
      <Eq>
        {String.raw`\Delta F_\text{informal} = (g\sin\theta)\cdot\Delta m + (mg\cos\theta)\cdot\Delta\theta`}
      </Eq>
      <p>
        Now that was a lot for one section, and to be honest this section will not hold nearly as
        much raw score value in proportion than the other sections will; actually, there's a
        phenomenon called Pareto's principle, where its said 20% of the effort causes 80% of the
        results. I suspect it to be true here as well.
      </p>
    </>
  ),
};
