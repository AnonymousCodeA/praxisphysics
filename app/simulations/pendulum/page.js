import PendulumExperiment from '@/components/PendulumExperiment';

export const metadata = { title: 'Pendulum — Praxis' };

export default function PendulumPage() {
  return (
    <section>
      <div className="wrap">
        <div className="head">
          <h2>Pendulum</h2>
        </div>
        <p className="lede">
          Work the problem, log your own data, and take readings from the bench below.
        </p>
        <PendulumExperiment />
      </div>
    </section>
  );
}
