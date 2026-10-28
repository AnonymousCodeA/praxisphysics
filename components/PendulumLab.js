'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PendulumCanvas from './PendulumCanvas';
import PendulumLens from './PendulumLens';
import BenchHint from './BenchHint';
import InstrumentMenu from './instruments/InstrumentMenu';
import Stopwatch from './instruments/Stopwatch';
import Photogate from './instruments/Photogate';
import CoachMark from './CoachMark';
import { usePendulumPhysics } from '@/lib/pendulum/usePendulumPhysics';
import { sessionRandom, sessionUniform } from '@/lib/instruments/rng';

const DRAG_CAP_DEG = 85; // the taut-string model is invalid past 90°
const BOB_RADIUS_M = 0.02;
const MIN_LENGTH_M = 0.2;
const MAX_LENGTH_M = 0.5;
const DEFAULT_LENGTH_M = 0.35;
const DRAG_CAP_RAD = (DRAG_CAP_DEG * Math.PI) / 180;

// A real scale's printed "0" doesn't start exactly at its physical top —
// there's a small blank margin. Session-seeded so it's a fixed, unstated
// systematic (not a random per-reading fudge), and geometric/visible
// rather than a numeric offset baked into a digital readout.
const PRINT_MARGIN_MIN_M = 0.001;
const PRINT_MARGIN_MAX_M = 0.002;

// Same idea for the angle plate: its printed scale sits at a small fixed
// angular offset from true vertical. A magnitude range with a separate sign
// (rather than one uniform draw across zero) so it's never negligibly
// small — the string hanging at rest never quite sits on 0°, which a
// careful student reading through the lens can catch.
const PLATE_OFFSET_MIN_RAD = (0.3 * Math.PI) / 180;
const PLATE_OFFSET_MAX_RAD = (1 * Math.PI) / 180;

// Sensible starting poses, applied fresh every time a tool is toggled on —
// "bringing it onto the bench" resets where it lands, it isn't remembered
// from before it was put away. The vertical scale and angle plate have
// none: they're part of the apparatus, fixed relative to the pivot, so the
// menu only toggles whether each is mounted, never where.
const PHOTOGATE_DEFAULT = { xM: 0.08, yM: 0.34 };

const INSTRUMENTS = [
  { key: 'stopwatch', label: 'STOPWATCH' },
  { key: 'scale', label: 'SCALE' },
  { key: 'anglePlate', label: 'ANGLE PLATE' },
  { key: 'photogate', label: 'PHOTOGATE' },
];

export default function PendulumLab() {
  const [stringLength, setStringLength] = useState(DEFAULT_LENGTH_M);
  const [open, setOpen] = useState({}); // every tool off by default — empty bench

  const photogateRef = useRef({ ...PHOTOGATE_DEFAULT });
  const printMarginRef = useRef((PRINT_MARGIN_MIN_M + PRINT_MARGIN_MAX_M) / 2);
  const plateOffsetRef = useRef(0);
  const lensRef = useRef({ active: false, clientX: 0, clientY: 0, worldX: 0, worldY: 0, pxPerM: 1 });
  const sceneStateRef = useRef({});

  const [modeGuided, setModeGuided] = useState(null); // null | 'guided' | 'self'
  const [guideStep, setGuideStep] = useState(0);

  const canvasRef = useRef(null);
  const controlsRef = useRef(null);
  const instrumentMenuRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    printMarginRef.current = sessionUniform('scale-print-margin-m', PRINT_MARGIN_MIN_M, PRINT_MARGIN_MAX_M);
    const sign = sessionRandom('angle-plate-offset-sign') < 0.5 ? -1 : 1;
    plateOffsetRef.current =
      sign * sessionUniform('angle-plate-offset-rad', PLATE_OFFSET_MIN_RAD, PLATE_OFFSET_MAX_RAD);
  }, []);

  const effectiveLength = stringLength + BOB_RADIUS_M; // pivot to bob centre
  const { mode, physicsRef, triggers, clearTriggers, beginDrag, updateDrag, release, hangRest } = usePendulumPhysics({
    length: effectiveLength,
    dragCapDeg: DRAG_CAP_DEG,
    photogateRef,
    photogateVisible: !!open.photogate,
  });

  const toggleInstrument = useCallback((key) => {
    setOpen((prev) => {
      const turningOn = !prev[key];
      if (turningOn) {
        if (key === 'photogate') photogateRef.current = { ...PHOTOGATE_DEFAULT };
      }
      return { ...prev, [key]: turningOn };
    });
  }, []);

  const visible = useMemo(
    () => ({ scale: !!open.scale, anglePlate: !!open.anglePlate, photogate: !!open.photogate }),
    [open.scale, open.anglePlate, open.photogate]
  );

  const swinging = mode === 'swinging';

  const handleStop = useCallback(() => {
    if (swinging) {
      hangRest(0);
    }
  }, [swinging, hangRest]);

  useEffect(() => {
    // track lens usage if needed
  }, []);

  const handleBeginDrag = useCallback(
    (angle) => {
      beginDrag(angle);
    },
    [beginDrag]
  );

  const handleRelease = useCallback(() => {
    release();
  }, [release]);

  const guideSteps = [
    { text: 'This walkthrough takes you through Part A one step at a time. You can switch to SELF at any point.', placement: 'bottom', target: () => canvasRef.current },
    { text: 'Add the SCALE and the STOPWATCH.', placement: 'top', target: () => instrumentMenuRef.current },
    { text: 'Set a length with this slider. The bench doesn\'t show the number; you read it off the scale.', placement: 'top', target: () => document.querySelector('.length-control') },
    { text: "Press STOP or HANG STRAIGHT so the string hangs still, then press and hold on the scale to magnify it. Read where the bob's centre is. The scale reads to 1 mm, so your uncertainty is about half a millimetre, 0.0005 m.", placement: 'bottom', target: () => document.querySelector('.pendulum-frame') },
    { text: "Drag the bob a little to one side, about 5°. Add the ANGLE PLATE if you want to check. Part A's formula only holds for small swings; at 20° your g will drift and you won't see why.", placement: 'bottom', target: () => canvasRef.current },
    { text: "Release it. Watch for the moment the bob passes the centre: that's where you'll start and stop timing.", placement: 'top', target: () => document.querySelector('.pendulum-controls') },
    { text: "One oscillation is the bob going out, coming back, and passing the centre the same way again. Start the watch as the bob passes the centre and stop it after 20 oscillations.", placement: 'top', target: () => document.querySelector('.instrument-panels') },
    { text: "How big is your timing error? Time 20 oscillations at this same length five times and type the five times in. The spread of those five tells you your Δt. ", placement: 'top', target: () => document.getElementById('pendulum-data-table') || document.querySelector('.pendulum-table-box') },
    { text: "Add columns with + COL and name them by typing, e.g. L, t_{20}, T_0, T_0^2, Δ(T_0^2) (rendered as math). If T0 has uncertainty ΔT_0, then Δ(T0^2) = 2T_0·ΔT_0.", placement: 'top', target: () => document.getElementById('pendulum-data-table') || document.querySelector('.pendulum-table-box') },
    { text: "Now repeat for at least six lengths.", placement: 'top', target: () => document.getElementById('pendulum-data-table') || document.querySelector('.pendulum-table-box') },
  ];

  const canAdvanceGuide = () => {
    if (!modeGuided) return true;
    if (guideStep === 0) return true;
    if (guideStep === 1) return !!open.scale && !!open.stopwatch;
    if (guideStep === 2) return true;
    if (guideStep === 3) return !!open.scale;
    if (guideStep === 4) return true;
    if (guideStep === 5) return true;
    if (guideStep === 6) return true;
    if (guideStep === 7) return true;
    if (guideStep === 8) return true;
    if (guideStep === 9) return true;
    return true;
  };

  return (
    <div className="pendulum-lab">
      {modeGuided === null && (
        <div className="pendulum-mode-select" style={{ marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>MODE:</span>
          <button type="button" className="btn btn-fill" onClick={() => { setModeGuided('guided'); setGuideStep(0); }}>
            GUIDED
          </button>
          <button type="button" className="btn btn-line" onClick={() => setModeGuided('self')}>
            SELF
          </button>
        </div>
      )}
      <div className="pendulum-frame bench-pinned" ref={canvasRef} style={{ margin: '0 auto', maxWidth: '900px' }}>
        <PendulumCanvas
          physicsRef={physicsRef}
          mode={mode}
          length={effectiveLength}
          bobRadius={BOB_RADIUS_M}
          dragCapRad={DRAG_CAP_RAD}
          photogateRef={photogateRef}
          printMarginRef={printMarginRef}
          plateOffsetRef={plateOffsetRef}
          visible={visible}
          lensRef={lensRef}
          sceneStateRef={sceneStateRef}
          onBeginDrag={handleBeginDrag}
          onUpdateDrag={updateDrag}
        />
        <PendulumLens lensRef={lensRef} sceneStateRef={sceneStateRef} />
        <div className="pendulum-controls" ref={controlsRef}>
          <label className="length-control">
            <span>LENGTH</span>
            <input
              type="range"
              min={MIN_LENGTH_M}
              max={MAX_LENGTH_M}
              step={0.01}
              value={stringLength}
              disabled={swinging}
              onChange={(e) => {
                setStringLength(Number(e.target.value));
              }}
              aria-label="String length"
            />
          </label>
          <button type="button" className="btn btn-line" onClick={handleStop}>
            {swinging ? 'STOP' : 'HANG STRAIGHT'}
          </button>
          <button type="button" className="btn btn-fill" onClick={handleRelease} disabled={swinging}>
            {swinging ? 'SWINGING' : 'RELEASE'}
          </button>
        </div>
        <BenchHint id="pendulum">
          Drag the bob to set a release angle (capped at {DRAG_CAP_DEG}°), then press Release.
          Grab the bob again at any time to stop it and reposition it. Bring instruments onto
          the bench from the menu below, and press and hold on the scale or the angle plate to
          magnify that spot.
        </BenchHint>
      </div>

      <div ref={instrumentMenuRef} style={{ marginTop: '12px' }}>
        <InstrumentMenu items={INSTRUMENTS} open={open} onToggle={toggleInstrument} />
      </div>

      <div className="instrument-panels">
        {open.stopwatch && <Stopwatch />}
        {open.photogate && <Photogate triggers={triggers} onClear={clearTriggers} />}
      </div>

      {modeGuided === 'guided' && (
        <CoachMark
          active={true}
          text={guideSteps[guideStep]?.text || ''}
          target={guideSteps[guideStep]?.target}
          placement={guideSteps[guideStep]?.placement || 'bottom'}
          nextLabel={guideStep === guideSteps.length - 1 ? 'DONE' : 'NEXT'}
          canAdvance={canAdvanceGuide()}
          onNext={() => {
            if (guideStep < guideSteps.length - 1) {
              setGuideStep((s) => s + 1);
            } else {
              setModeGuided('self');
            }
          }}
        />
      )}
    </div>
  );
}
