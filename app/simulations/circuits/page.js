import CircuitsExperiment from '@/components/CircuitsExperiment';

export const metadata = { title: 'RC Circuits — Praxis' };

export default function CircuitsPage() {
  return (
    <section className="bench-page">
      <div className="wrap">
        <div className="head">
          <h2>RC Circuits</h2>
        </div>
      </div>
      {/* Outside .wrap on purpose: the 1160px cap suits prose, not a bench. */}
      <div className="bench-wrap">
        <CircuitsExperiment />
      </div>
    </section>
  );
}
