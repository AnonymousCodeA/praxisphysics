'use client';

import { quantize } from '@/lib/instruments/reading';

const RESOLUTION_MS = 1;

// Triggers each time the string crosses the beam — twice per period if the
// gate sits inside the swing, once each direction. No noise: the trigger
// times are exact to the resolution. The crossings themselves are detected
// in the physics loop (lib/pendulum/usePendulumPhysics.js) and handed down
// as a log.
//
// Each row is numbered so a student measuring many periods at once (large
// amplitude, where one period's worth of the effect they're after can be a
// fraction of a percent of T) can identify "crossing 1" and "crossing 41" by
// their number rather than counting down the list — every 5th row is marked
// as a waypoint for exactly that scan. This log deliberately stops at
// listing raw crossings: no interval/period arithmetic here — picking which
// two crossings to use, and dividing by the right number of periods, is the
// exercise.
export default function Photogate({ triggers, onClear }) {
  return (
    <div className="instrument">
      <div className="instrument-head">
        <b>PHOTOGATE</b>
        <span className="instrument-res">{RESOLUTION_MS}ms</span>
      </div>
      <p className="instrument-note">
        A beam between two posts. Each time the string crosses it, a time is logged.
        Place it inside the swing and you get two triggers per period — one each way.
        The interval from crossing 1 to crossing 3 is one period; from 1 to 21 is ten.
      </p>
      <div className="photogate-log">
        {triggers.length === 0 ? (
          <p className="instrument-note">No triggers yet — release the pendulum.</p>
        ) : (
          <table className="photogate-log-table">
            <thead>
              <tr>
                <th>#</th>
                <th>t (ms)</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map((t, i) => {
                const n = i + 1;
                return (
                  <tr key={i} className={n % 5 === 0 ? 'milestone' : undefined}>
                    <td>{n}</td>
                    <td>{quantize(t, RESOLUTION_MS).toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
