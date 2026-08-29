'use client';

import { useCallback, useState } from 'react';
import PendulumCanvas from './PendulumCanvas';
import InstrumentMenu from './instruments/InstrumentMenu';
import Stopwatch from './instruments/Stopwatch';
import Ruler from './instruments/Ruler';
import Protractor from './instruments/Protractor';
import Photogate from './instruments/Photogate';
import { usePendulumPhysics } from '@/lib/pendulum/usePendulumPhysics';

const DRAG_CAP_DEG = 85; // the taut-string model is invalid past 90°
const BOB_RADIUS_M = 0.02;
const MIN_LENGTH_M = 0.3;
const MAX_LENGTH_M = 1.2;
const DEFAULT_LENGTH_M = 0.9;
const DRAG_CAP_RAD = (DRAG_CAP_DEG * Math.PI) / 180;

const INSTRUMENTS = [
  { key: 'stopwatch', label: 'STOPWATCH' },
  { key: 'ruler', label: 'RULER' },
  { key: 'protractor', label: 'PROTRACTOR' },
  { key: 'photogate', label: 'PHOTOGATE' },
];

export default function PendulumLab() {
  const [stringLength, setStringLength] = useState(DEFAULT_LENGTH_M);
  const [open, setOpen] = useState({});

  const effectiveLength = stringLength + BOB_RADIUS_M; // pivot to bob centre
  const { mode, theta, physicsRef, triggers, clearTriggers, beginDrag, updateDrag, release } =
    usePendulumPhysics({ length: effectiveLength, dragCapDeg: DRAG_CAP_DEG });

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
          Grab the bob again at any time to stop it and reposition it.
        </p>
      </div>

      <InstrumentMenu items={INSTRUMENTS} open={open} onToggle={toggleInstrument} />

      <div className="instrument-panels">
        {open.stopwatch && <Stopwatch />}
        {open.ruler && <Ruler trueValueM={stringLength} />}
        {open.protractor && <Protractor trueValueRad={theta} />}
        {open.photogate && <Photogate triggers={triggers} onClear={clearTriggers} />}
      </div>
    </div>
  );
}
