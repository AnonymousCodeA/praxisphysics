import CircuitBenchHarness from './CircuitBenchHarness';

export const metadata = { title: 'Circuit Builder — Praxis' };

// Not linked from data/simulations.js yet — this page exists to exercise
// and visually verify CircuitBench in isolation, ahead of a real circuits
// experiment (problem statement, guide content, and a proper inventory)
// being built on top of it.
export default function CircuitBuilderPage() {
  return (
    <section>
      <div className="wrap">
        <div className="head">
          <h2>Circuit builder</h2>
        </div>
        <p className="lede">
          Work-in-progress bench for the circuits experiments — no guide content yet, just
          the board.
        </p>
        <CircuitBenchHarness />
      </div>
    </section>
  );
}
