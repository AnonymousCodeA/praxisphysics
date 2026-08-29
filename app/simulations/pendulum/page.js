import PendulumLab from '@/components/PendulumLab';

export const metadata = { title: 'Pendulum — Praxis' };

export default function PendulumPage() {
  return (
    <section>
      <div className="wrap">
        <div className="head">
          <h2>Pendulum</h2>
          <span className="count">PART A — MEASURE g</span>
        </div>
        <p className="lede">
          Drag the bob to a release angle, let it swing, and time enough oscillations to pin
          down g. Open an instrument below to take a reading.
        </p>
        <PendulumLab />
      </div>
    </section>
  );
}
