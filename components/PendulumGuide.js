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

// Placeholder until Part B's physics content is written — keeps the switch,
// the table, and the plot fully working ahead of that.
function PartBGuide() {
  return (
    <div className="pendulum-guide">
      <span className="tag">PART B</span>
      <h3>Coming soon</h3>
      <p>
        Part B uses the same bench with a different problem. Its statement, formulae, and
        hints land here next — the table and plot on this tab are already yours to use.
      </p>
    </div>
  );
}

export default function PendulumGuide({ part }) {
  return part === 'partb' ? <PartBGuide /> : <PartAGuide />;
}
