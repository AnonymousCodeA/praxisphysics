'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PendulumCanvas from './PendulumCanvas';
import InstrumentMenu from './instruments/InstrumentMenu';
import Stopwatch from './instruments/Stopwatch';
import Protractor from './instruments/Protractor';
import Photogate from './instruments/Photogate';
import { usePendulumPhysics } from '@/lib/pendulum/usePendulumPhysics';
import { sessionUniform } from '@/lib/instruments/rng';

const DRAG_CAP_DEG = 85; // the taut-string model is invalid past 90°
const BOB_RADIUS_M = 0.02;
const MIN_LENGTH_M = 0.2;
const MAX_LENGTH_M = 0.5;
const DEFAULT_LENGTH_M = 0.35;
const DRAG_CAP_RAD = (DRAG_CAP_DEG * Math.PI) / 180;

// A real ruler's printed "0" doesn't start exactly at its physical edge —
// there's a small blank margin. Session-seeded so it's a fixed, unstated
// systematic (not a random per-reading fudge), and now geometric/visible
// rather than a numeric offset baked into a digital readout.
const PRINT_MARGIN_MIN_M = 0.001;
const PRINT_MARGIN_MAX_M = 0.002;

const INSTRUMENTS = [
  { key: 'stopwatch', label: 'STOPWATCH' },
  { key: 'protractor', label: 'PROTRACTOR' },
  { key: 'photogate', label: 'PHOTOGATE' },
];

export default function PendulumLab() {
  const [stringLength, setStringLength] = useState(DEFAULT_LENGTH_M);
  const [open, setOpen] = useState({});

  const effectiveLength = stringLength + BOB_RADIUS_M; // pivot to bob centre
  const { mode, theta, physicsRef, triggers, clearTriggers, beginDrag, updateDrag, release } =
    usePendulumPhysics({ length: effectiveLength, dragCapDeg: DRAG_CAP_DEG });

  const rulerRef = useRef({ xM: 0.1, yM: 0.55, angleRad: 0 });
  const printMarginRef = useRef((PRINT_MARGIN_MIN_M + PRINT_MARGIN_MAX_M) / 2);

  useEffect(() => {
    printMarginRef.current = sessionUniform('ruler-print-margin-m', PRINT_MARGIN_MIN_M, PRINT_MARGIN_MAX_M);
  }, []);

  const toggleInstrument = useCallback((key) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const swinging = mode === 'swinging';

  return (
    <div className="pendulum-lab">
      <div className="pendulum-frame">
        <PendulumCanvas
          physicsRef={physicsRef}
          mode={mode}
          length={effectiveLength}
          bobRadius={BOB_RADIUS_M}
          dragCapRad={DRAG_CAP_RAD}
          rulerRef={rulerRef}
          printMarginRef={printMarginRef}
          onBeginDrag={beginDrag}
          onUpdateDrag={updateDrag}
        />
        <div className="pendulum-controls">
          <label className="length-control">
            <span>LENGTH</span>
            <input
              type="range"
              min={MIN_LENGTH_M}
              max={MAX_LENGTH_M}
              step={0.01}
              value={stringLength}
              disabled={swinging}
              onChange={(e) => setStringLength(Number(e.target.value))}
              aria-label="String length"
            />
          </label>
          <button type="button" className="btn btn-fill" onClick={release} disabled={swinging}>
            {swinging ? 'SWINGING' : 'RELEASE'}
          </button>
        </div>
        <p className="hint">
          Drag the bob to set a release angle (capped at {DRAG_CAP_DEG}°), then press Release.
          Grab the bob again at any time to stop it and reposition it. Drag the ruler by its
          body to move it, drag its end handle to turn it, and press and hold anywhere on it
          to magnify that spot.
        </p>
      </div>

      <InstrumentMenu items={INSTRUMENTS} open={open} onToggle={toggleInstrument} />

      <div className="instrument-panels">
        {open.stopwatch && <Stopwatch />}
        {open.protractor && <Protractor trueValueRad={theta} />}
        {open.photogate && <Photogate triggers={triggers} onClear={clearTriggers} />}
      </div>
    </div>
  );
}
