import CircuitsExperiment from '@/components/CircuitsExperiment';

export const metadata = { title: 'RC Circuits — Praxis' };

export default function CircuitsPage() {
  return (
    <section>
      <div className="wrap">
        <div className="head">
          <h2>RC Circuits</h2>
        </div>
        <p className="lede">
          Work the problem, log your own data, and build the circuit on the bench below.
        </p>
        <CircuitsExperiment />
      </div>
    </section>
  );
}
