import CircuitBench from '@/components/CircuitBench';
import { circuitsSandboxInventory } from '@/data/circuitsSandboxInventory';
import { circuitsSandboxPresets } from '@/data/circuitsSandboxPresets';

export const metadata = { title: 'Circuit Builder — Praxis' };

const ROWS = 6;
const COLS = 9;

export default function CircuitBuilderPage() {
  return (
    <section>
      <div className="wrap">
        <div className="head">
          <h2>Circuit Builder</h2>
        </div>
        <p className="lede">
          Free-build sandbox: every component the solver supports, unlimited stock. No
          guide, no data table — just the bench, for trying things out.
        </p>
        <CircuitBench
          inventory={circuitsSandboxInventory}
          rows={ROWS}
          cols={COLS}
          presets={circuitsSandboxPresets}
        />
      </div>
    </section>
  );
}
