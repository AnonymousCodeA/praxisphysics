'use client';

import { quantize } from '@/lib/instruments/reading';

const RESOLUTION_MS = 1;

// Triggers twice per period as the bob crosses the lowest point — once
// each direction. No noise: the trigger times are exact to the resolution.
// The crossings themselves are detected in the physics loop
// (lib/pendulum/usePendulumPhysics.js) and handed down as a log.
export default function Photogate({ triggers, onClear }) {
  return (
    <div className="instrument">
      <div className="instrument-head">
        <b>PHOTOGATE</b>
        <span className="instrument-res">{RESOLUTION_MS}ms</span>
      </div>
      <p className="instrument-note">Triggers twice per period, at the lowest point of the swing.</p>
      <div className="photogate-log">
        {triggers.length === 0 ? (
          <p className="instrument-note">No triggers yet — release the pendulum.</p>
        ) : (
          <ol>
            {triggers.map((t, i) => (
              <li key={i}>{quantize(t, RESOLUTION_MS).toFixed(0)} ms</li>
            ))}
          </ol>
        )}
      </div>
      <div className="instrument-controls">
        <button type="button" onClick={onClear}>
          CLEAR
        </button>
      </div>
    </div>
  );
}
