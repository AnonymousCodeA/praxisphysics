// Prose for the guide's "Measurement and devices" section. `bodies` is keyed by the
// subsection ids in data/guide.js — those ids are what experiment hints
// link to, so add text here rather than renaming them. A subsection with no
// entry renders as a "Not written yet." stub; `intro` sits above the first.
// See content/guide/README.md for the maths/figure/table conventions.
import { M, Eq } from '@/components/Maths';

export const intro = (
  <>
    <p>
      Every number you write down came from an instrument, and every instrument has its own idea
      of what a reading means. This section is about those ideas: what an instrument can actually
      resolve, what it gets systematically wrong, and how to write down a reading that another
      person could repeat.
    </p>
  </>
);

export const bodies = {
  'reading-a-scale': (
    <>
      <p>
        An analogue scale has a pointer and a set of marks. The reading is the mark the pointer
        lines up with, and if the pointer sits between two marks you interpolate — which is only
        justified if you can actually judge the fraction, and only if the scale is evenly divided.
      </p>
      <p>
        Read to the last mark you can genuinely resolve, and no further. A scale with millimetre
        divisions does not give you 34.63 cm, however good your eyes are.
      </p>
    </>
  ),

  resolution: (
    <>
      <p>
        The <b>resolution</b> of an instrument is the smallest change it can show. For a scale
        divided into millimetres it is 1 mm; for a stopwatch displaying hundredths it is 0.01 s.
      </p>
      <p>
        The resolution sets the smallest <b>uncertainty</b> you can quote from a single reading.
        The usual convention is half the resolution, because the pointer can sit anywhere within
        the last division: a millimetre scale gives a reading of 34.6 cm ± 0.05 cm.
      </p>
      <p>
        Resolution is not accuracy. A cheap stopwatch can display hundredths of a second and still
        be wrong by half a second, and a ruler can be graduated in millimetres and be the wrong
        length. Resolution is what the instrument can <em>show</em>; accuracy is how close it is to
        the truth, and only comparing against something known settles the second question.
      </p>
    </>
  ),

  'zero-error': (
    <>
      <p>
        A <b>zero error</b> is a constant offset: the instrument reads a non-zero value when the
        quantity is zero, or reads <M>{String.raw`x`}</M> when the true value is{' '}
        <M>{String.raw`x - k`}</M>. Every reading is shifted by the same amount, so the error
        cancels in any <em>difference</em> of readings and survives in any <em>sum</em>.
      </p>
      <p>
        The way to find one is to measure something whose value you know exactly. Zero a
        stopwatch against the bench. Put a scale's zero against the pivot of a pendulum and see
        whether the two line up. If they do not, the offset is a real fact about the apparatus and
        it belongs in your write-up, not something to quietly ignore.
      </p>
      <p>
        Whether it matters downstream is a separate question, and often a nice one: a zero error in
        a length cancels when you take a ratio of two lengths, and does not cancel when you add
        them.
      </p>
    </>
  ),

  parallax: (
    <>
      <p>
        <b>Parallax</b> is the error you get by reading a scale from the wrong angle — your eye
        not level with the mark, so the pointer appears to be somewhere else.
      </p>
      <p>
        The rule is simple: read the scale from directly in front of it, with your eye at the same
        height as the mark. On a bench, that means crouching to the level of the pointer rather
        than looking down on it, and it is why a long pointer and a fine scale are harder to read
        than they should be.
      </p>
      <p>
        A magnifier that you hold against the scale and look straight through is a way of forcing
        this: the lens puts your eye at the mark's height, and the magnification makes the
        smallest divisions legible.
      </p>
    </>
  ),

  'digital-readouts': (
    <>
      <p>
        A digital display removes the parallax problem and the interpolation problem. It does not
        remove the uncertainty: the last digit is still only worth the instrument's resolution, and
        many instruments are specified as being accurate to a certain number of counts rather than
        to their last digit.
      </p>
      <p>
        A digital gauge is still an instrument with a zero. Some meters are adjusted to zero when
        switched on; most are not, and a small offset is the usual reason a digital length gauge
        disagrees with a ruler.
      </p>
    </>
  ),

  'timing-by-hand': (
    <>
      <p>
        A stopwatch measures the time between two events that a person decided were simultaneous.
        The measurement therefore contains the error in that decision — the reaction time, which is
        about a tenth of a second for each press, and not reliably the same in each direction.
      </p>
      <p>
        Two consequences follow, and they pull in opposite directions. The error is roughly
        constant, so timing a long interval makes it relatively smaller: a 0.2 s error on a
        2-second measurement is 10%, and the same error on a 20-second measurement is 1%. But
        starting and stopping at exactly the right moment is harder when the thing you are timing
        is fast, so there is a limit to how long you should time.
      </p>
      <p>
        The practical rules: time many oscillations as one interval and divide at the end; always
        start and stop at the same point in the cycle (the lowest point of a pendulum's swing is
        the easiest to judge, because the bob is moving fastest there — pick a point where the
        motion is slow and the timing is easier, and be consistent); and repeat, because the
        scatter tells you the size of the error you have actually made.
      </p>
    </>
  ),

  photogates: (
    <>
      <p>
        A photogate is a transmitter and a receiver facing each other across a gap. The transmitter
        sends an invisible beam; the receiver detects it. While the beam is unbroken the gate sees
        nothing happening, and the moment something interrupts it, a time is recorded. Nothing
        has to touch anything, and the timing is done by a clock rather than by a person.
      </p>
      <p>
        The beam is a line, so the gate is triggered by a body passing across it. In a pendulum
        experiment the body is the string (or the bob), and the string sweeps across the beam
        twice in every complete period — once each way. So the interval between crossing 1 and
        crossing 3 is one period, and the interval between crossing 1 and crossing 21 is ten.
      </p>
      <p>
        This is where a photogate earns its keep. The reaction time that limits a stopwatch is a
        fixed few tenths of a second; a photogate's resolution is a millisecond. If you are
        chasing an effect that is a fraction of a percent of a period — the change in a pendulum's
        period at a large amplitude, for instance — then the stopwatch error is larger than the
        effect, and no amount of careful timing will recover it. The gate does not merely make
        the measurement better; it makes it possible.
      </p>
      <p>
        A few practical points. The gate has to be <em>in</em> the path being timed, or nothing is
        recorded at all. The beam should cross the path squarely, near where the motion is
        fastest, so the trigger is sharp. And count crossings carefully: a gate placed off to one
        side is crossed twice per period, not once, and dividing by the wrong number of periods
        is the classic way to get a wrong answer from a perfectly good instrument.
      </p>
    </>
  ),

  'measuring-multiples': (
    <>
      <p>
        When the quantity you want is smaller than the thing you can time, measure many of them
        and divide. Timing twenty swings of a pendulum and dividing by twenty gives a period
        twenty times more precise than timing one swing.
      </p>
      <p>
        This works for anything with a repeating pattern: many oscillations, many revolutions,
        many drops. It is the single most effective thing you can do to a stopwatch measurement,
        and it costs nothing but patience.
      </p>
      <p>
        The catch is that the events you divide between must be the <em>same</em> event each time.
        Counting twenty swings and dividing by twenty is right; counting twenty swings but
        dividing by nineteen, because the first one was a half-swing, is off by five percent with no
        visible sign of it.
      </p>
    </>
  ),
};
