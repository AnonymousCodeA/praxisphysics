import PendulumExperiment from '@/components/PendulumExperiment';

export const metadata = { title: 'Pendulum — Praxis' };

export default function PendulumPage() {
  return (
    <section className="bench-page">
      <div className="wrap">
        <div className="head">
          <h2>Pendulum</h2>
        </div>
      </div>
      {/* Outside .wrap on purpose: the 1160px cap suits prose, not a bench. */}
      <div className="bench-wrap">
        <PendulumExperiment />
      </div>
    </section>
  );
}
