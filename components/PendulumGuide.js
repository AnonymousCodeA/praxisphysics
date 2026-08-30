// Static problem statement, formulae, and thin prompts per part. No
// accompanying method: deciding how to measure and what to tabulate is the
// skill this experiment is teaching, so Part A stays deliberately sparse.
function PartAGuide() {
  return (
    <div className="pendulum-guide">
      <span className="tag">PART A</span>
      <h3>Measure g from a pendulum</h3>
      <p>
        A simple pendulum is released from rest at a small angle and swings freely. Using
        the bench and whichever instruments you bring in below, find a value for the local
        gravitational acceleration <em>g</em> — and an honest estimate of its uncertainty.
      </p>

      <h4>Formulae</h4>
      <ul className="pendulum-formulae">
        <li>
          <span>T = 2π√(L / g)</span>
          <small>period of small oscillations</small>
        </li>
        <li>
          <span>g = 4π²L / T²</span>
          <small>rearranged for g</small>
        </li>
      </ul>

      <h4>Before you start, consider</h4>
      <ul className="pendulum-hints">
        <li>What exactly counts as one oscillation, and where in the swing is the best place to start and stop a timing?</li>
        <li>A single swing carries your full reaction-time error. Is there a way to shrink its effect on T?</li>
        <li>Does L mean the string&rsquo;s length, or the distance from the pivot to the bob&rsquo;s centre?</li>
        <li>Which reading dominates your uncertainty in g — and can you reduce it by changing what or how you measure?</li>
      </ul>
    </div>
  );
}

// Only the series is given, deliberately unrearranged — deciding what to
// linearise, and that no single linearisation covers the whole amplitude
// range, is the exercise. Hints stay as thin as Part A's: questions to
// weigh, never a named instrument or method.
function PartBGuide() {
  return (
    <div className="pendulum-guide">
      <span className="tag">PART B</span>
      <h3>The period at large amplitudes</h3>
      <p>
        Beyond the small-angle limit, a pendulum&rsquo;s period depends on its angular
        amplitude φ₀ as well as its length. Using the bench, measure the period across a
        range of amplitudes and use suitably linearised graphs to determine the
        small-amplitude period <em>T₀</em> and the constants <em>α</em> and <em>β</em>.
        Different linearisations are needed for different regions of the range — the same
        one won&rsquo;t work throughout.
      </p>
      <p className="pendulum-guide-credit">Adapted from APhO 2023, Experimental Problem 1.</p>

      <h4>Formulae</h4>
      <ul className="pendulum-formulae">
        <li>
          <span>T = T₀(1 + α·sin²(φ₀/2) + β·sin⁴(φ₀/2) + …)</span>
          <small>period vs. angular amplitude</small>
        </li>
      </ul>

      <h4>Before you start, consider</h4>
      <ul className="pendulum-hints">
        <li>
          How large is the effect you&rsquo;re trying to measure, compared with the precision
          of your timing? Estimate this before collecting a full data set.
        </li>
        <li>
          The α term dominates at small amplitudes and β only becomes visible once α&rsquo;s
          contribution is large enough. What does that imply about where each is best
          measured?
        </li>
        <li>Which of your systematic errors survive when you take the ratio T/T₀, and which cancel?</li>
      </ul>
    </div>
  );
}

export default function PendulumGuide({ part }) {
  return part === 'partb' ? <PartBGuide /> : <PartAGuide />;
}
