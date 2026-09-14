import CircuitsNonlinearExperiment from '@/components/CircuitsNonlinearExperiment';

export const metadata = { title: 'Non-Linear Circuit Elements — Praxis' };

export default function CircuitsNonlinearPage() {
  return (
    <section>
      <div className="wrap">
        <div className="head">
          <h2>Non-Linear Circuit Elements</h2>
        </div>
        <p className="lede">
          Work the problem, log your own data, and build the circuit on the bench below.
        </p>
        <CircuitsNonlinearExperiment />
      </div>
    </section>
  );
}
