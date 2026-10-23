'use client';

import { quantize } from '@/lib/instruments/reading';
import { InstrumentNoteButton, InstrumentNotePopover, useInstrumentNote } from './InstrumentNote';

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
  const note = useInstrumentNote('photogate');
  return (
    <div className="instrument" ref={note.panelRef}>
      <div className="instrument-head">
        <b>PHOTOGATE</b>
        <span className="instrument-head-end">
          <span className="instrument-res">{RESOLUTION_MS}ms</span>
          <InstrumentNoteButton note={note} name="photogate" />
        </span>
      </div>
      <InstrumentNotePopover note={note} name="photogate">
        A beam between two posts. Each time something crosses it, a time is logged.
      </InstrumentNotePopover>
      <div className="photogate-log">
        {triggers.length === 0 ? (
          <p className="instrument-note">No triggers yet — nothing has crossed the beam.</p>
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
