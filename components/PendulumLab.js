'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PendulumCanvas from './PendulumCanvas';
import PendulumLens from './PendulumLens';
import InstrumentMenu from './instruments/InstrumentMenu';
import Stopwatch from './instruments/Stopwatch';
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
// systematic (not a random per-reading fudge), and geometric/visible
// rather than a numeric offset baked into a digital readout.
const PRINT_MARGIN_MIN_M = 0.001;
const PRINT_MARGIN_MAX_M = 0.002;

// Same idea for the protractor: its printed degree scale sits at a small,
// fixed angular offset from the geometric baseline/centre mark.
const PROTRACTOR_OFFSET_MIN_RAD = (-1 * Math.PI) / 180;
const PROTRACTOR_OFFSET_MAX_RAD = (1 * Math.PI) / 180;

// Sensible starting poses, applied fresh every time a tool is toggled on —
// "bringing it onto the bench" resets where it lands, it isn't remembered
// from before it was put away.
const RULER_DEFAULT = { xM: 0.1, yM: 0.55, angleRad: 0 };
const PROTRACTOR_DEFAULT = { xM: -0.14, yM: 0.06, angleRad: 0 };
const PHOTOGATE_DEFAULT = { xM: 0.08, yM: 0.34 };

const INSTRUMENTS = [
  { key: 'stopwatch', label: 'STOPWATCH' },
  { key: 'ruler', label: 'RULER' },
  { key: 'protractor', label: 'PROTRACTOR' },
  { key: 'photogate', label: 'PHOTOGATE' },
];

export default function PendulumLab() {
  const [stringLength, setStringLength] = useState(DEFAULT_LENGTH_M);
  const [open, setOpen] = useState({}); // every tool off by default — empty bench

  const rulerRef = useRef({ ...RULER_DEFAULT });
  const protractorRef = useRef({ ...PROTRACTOR_DEFAULT });
  const photogateRef = useRef({ ...PHOTOGATE_DEFAULT });
  const printMarginRef = useRef((PRINT_MARGIN_MIN_M + PRINT_MARGIN_MAX_M) / 2);
  const protractorOffsetRef = useRef(0);
  const lensRef = useRef({ active: false, clientX: 0, clientY: 0, worldX: 0, worldY: 0, pxPerM: 1 });
  const sceneStateRef = useRef({});

  useEffect(() => {
    printMarginRef.current = sessionUniform('ruler-print-margin-m', PRINT_MARGIN_MIN_M, PRINT_MARGIN_MAX_M);
    protractorOffsetRef.current = sessionUniform(
      'protractor-scale-offset-rad',
      PROTRACTOR_OFFSET_MIN_RAD,
      PROTRACTOR_OFFSET_MAX_RAD
    );
  }, []);

  const effectiveLength = stringLength + BOB_RADIUS_M; // pivot to bob centre
  const { mode, physicsRef, triggers, clearTriggers, beginDrag, updateDrag, release } = usePendulumPhysics({
    length: effectiveLength,
    dragCapDeg: DRAG_CAP_DEG,
    photogateRef,
    photogateVisible: !!open.photogate,
  });

  const toggleInstrument = useCallback((key) => {
    setOpen((prev) => {
      const turningOn = !prev[key];
      if (turningOn) {
        if (key === 'ruler') rulerRef.current = { ...RULER_DEFAULT };
        if (key === 'protractor') protractorRef.current = { ...PROTRACTOR_DEFAULT };
        if (key === 'photogate') photogateRef.current = { ...PHOTOGATE_DEFAULT };
      }
      return { ...prev, [key]: turningOn };
    });
  }, []);

  const visible = useMemo(
    () => ({ ruler: !!open.ruler, protractor: !!open.protractor, photogate: !!open.photogate }),
    [open.ruler, open.protractor, open.photogate]
  );

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
          protractorRef={protractorRef}
          photogateRef={photogateRef}
          printMarginRef={printMarginRef}
          protractorOffsetRef={protractorOffsetRef}
          visible={visible}
          lensRef={lensRef}
          sceneStateRef={sceneStateRef}
          onBeginDrag={beginDrag}
          onUpdateDrag={updateDrag}
        />
        <PendulumLens lensRef={lensRef} sceneStateRef={sceneStateRef} />
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
          Grab the bob again at any time to stop it and reposition it. Bring instruments onto
          the bench from the menu below — drag a ruler or protractor by its body to move it,
          drag its end handle to turn it, and press and hold on it to magnify that spot.
        </p>
      </div>

      <InstrumentMenu items={INSTRUMENTS} open={open} onToggle={toggleInstrument} />

      <div className="instrument-panels">
        {open.stopwatch && <Stopwatch />}
        {open.photogate && <Photogate triggers={triggers} onClear={clearTriggers} />}
      </div>
    </div>
  );
}
