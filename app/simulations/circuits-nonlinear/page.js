import CircuitsNonlinearExperiment from '@/components/CircuitsNonlinearExperiment';

export const metadata = { title: 'Non-Linear Circuit Elements — Praxis' };

export default function CircuitsNonlinearPage() {
  return (
    <section className="bench-page">
      <div className="wrap">
        <div className="head">
          <h2>Non-Linear Circuit Elements</h2>
        </div>
      </div>
      {/* Outside .wrap on purpose: the 1160px cap suits prose, not a bench. */}
      <div className="bench-wrap">
        <CircuitsNonlinearExperiment />
      </div>
    </section>
  );
}
