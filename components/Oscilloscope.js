'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DataTable from './DataTable';
import { useOscilloscope } from '@/lib/circuits/useOscilloscope';
import {
  SCOPE_DIVISIONS_X,
  SCOPE_DIVISIONS_Y,
  TIME_PER_DIV_OPTIONS,
  DEFAULT_TIME_PER_DIV,
  VOLTS_PER_DIV_OPTIONS,
  DEFAULT_VOLTS_PER_DIV,
  VERTICAL_POSITION_MIN,
  VERTICAL_POSITION_MAX,
  VERTICAL_POSITION_STEP,
  DEFAULT_VERTICAL_POSITION,
  COUPLING_OPTIONS,
  DEFAULT_COUPLING,
  TRIGGER_SLOPES,
  DEFAULT_TRIGGER_SLOPE,
  DEFAULT_TRIGGER_SOURCE,
  DEFAULT_TRIGGER_LEVEL,
  formatTimePerDiv,
  formatVoltsPerDiv,
  formatVoltage,
  autoFrame,
  SCOPE_BG,
  SCOPE_GRATICULE,
  SCOPE_GRATICULE_BRIGHT,
  SCOPE_CH1_COLOR,
  SCOPE_CH2_COLOR,
} from '@/lib/circuits/oscilloscopeControls';

// 8-bit digitisation of the visible window — a real digital scope's actual
// limit on how precisely a value can be read off screen, not a display
// nicety. Depends on volts/div (see drawTrace below), not a fixed voltage,
// so it's the display-stage counterpart to useOscilloscope.js's broadband
// noise / trigger jitter constants — all three tunable, none of them in
// the solver (see that file's own header comment on why).
const QUANTIZATION_BITS = 8;
const QUANTIZATION_LEVELS = 2 ** QUANTIZATION_BITS; // 256

// Pure canvas draw for the screen itself — graticule, up to two traces, and
// the trigger level marker. Not shared elsewhere (unlike
// lib/circuits/scene.js's drawComponent), so it lives here rather than in
// that file.
function drawScopeScreen(ctx, w, h, { display, voltsPerDiv, verticalPosition, showCh1, showCh2, trigger }) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = SCOPE_BG;
  ctx.fillRect(0, 0, w, h);

  const divW = w / SCOPE_DIVISIONS_X;
  const divH = h / SCOPE_DIVISIONS_Y;

  ctx.strokeStyle = SCOPE_GRATICULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < SCOPE_DIVISIONS_X; i++) {
    ctx.moveTo(i * divW, 0);
    ctx.lineTo(i * divW, h);
  }
  for (let j = 1; j < SCOPE_DIVISIONS_Y; j++) {
    ctx.moveTo(0, j * divH);
    ctx.lineTo(w, j * divH);
  }
  ctx.stroke();

  ctx.strokeStyle = SCOPE_GRATICULE_BRIGHT;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  function yFor(value, vPerDiv, posDiv) {
    const divsFromCenter = value / vPerDiv + posDiv;
    return h / 2 - divsFromCenter * divH;
  }

  function drawTrace(values, vPerDiv, posDiv, color) {
    if (!values || values.length === 0) return;
    // The window this channel's ADC would digitise is SCOPE_DIVISIONS_Y
    // divisions tall at this vPerDiv, split into QUANTIZATION_LEVELS steps.
    // Smaller vPerDiv (zooming in) shrinks the step until it's visible as
    // a staircase — exactly the real behaviour this models.
    const quantStep = (SCOPE_DIVISIONS_Y * vPerDiv) / QUANTIZATION_LEVELS;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const n = values.length;
    for (let k = 0; k < n; k++) {
      const x = (k / (n - 1)) * w;
      const quantized = Math.round(values[k] / quantStep) * quantStep;
      const y = yFor(quantized, vPerDiv, posDiv);
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (showCh1) drawTrace(display.traces.ch1, voltsPerDiv.ch1, verticalPosition.ch1, SCOPE_CH1_COLOR);
  if (showCh2) drawTrace(display.traces.ch2, voltsPerDiv.ch2, verticalPosition.ch2, SCOPE_CH2_COLOR);

  if (trigger) {
    // A small arrowhead at the left edge, in the trigger source's own
    // colour, at its own volts/div + position — same mapping drawTrace
    // uses, so the marker lines up with where that channel's trace would
    // actually cross this value.
    const y = yFor(trigger.value, trigger.vPerDiv, trigger.posDiv);
    ctx.fillStyle = trigger.color;
    ctx.beginPath();
    ctx.moveTo(0, y - 5);
    ctx.lineTo(9, y);
    ctx.lineTo(0, y + 5);
    ctx.closePath();
    ctx.fill();
  }
}

// The oscilloscope: two probe channels (placed on the board like a
// voltmeter — see CircuitBench.js's SOLVER_TYPE, both map to the same
// non-loading 'meter' solver element) read out here as a live trace.
// Collapsed by default; OPEN SCOPE expands it into a large in-page panel
// (never a modal/fullscreen takeover). Expanded, its header and screen are
// portaled into `pinnedSlot` — CircuitBench's pinned region, which the
// board's frame vacates — so the trace stays on screen while the controls
// here and every other panel, Generators included, scroll beneath it.
// `expanded` is lifted to the parent since the parent does that swap.
//
// `dataTable` (the active part's useDataTable() return value, forwarded
// from ExperimentWorkspace through CircuitBench — see that file) is
// undefined on the circuit-builder sandbox, which has no experiment part
// and hence no table at all, so nothing renders there. Where it exists,
// it's mirrored — not duplicated — into the space below the scope while
// expanded: the very same table/mutators DataTable already renders from
// in ExperimentWorkspace's own TABLE pane, just a second view onto the
// same state, so a reading taken off the trace can be logged without
// leaving the scope.
export default function Oscilloscope({
  placedProbes,
  elements,
  ground,
  solverStateRef,
  floatingNodes,
  expanded,
  onExpandedChange,
  dataTable,
  tableSymbols,
  pinnedSlot,
}) {
  const [running, setRunning] = useState(true);
  const [timePerDiv, setTimePerDiv] = useState(DEFAULT_TIME_PER_DIV);
  const [voltsPerDiv, setVoltsPerDiv] = useState({ ch1: DEFAULT_VOLTS_PER_DIV, ch2: DEFAULT_VOLTS_PER_DIV });
  const [verticalPosition, setVerticalPosition] = useState({
    ch1: DEFAULT_VERTICAL_POSITION,
    ch2: DEFAULT_VERTICAL_POSITION,
  });
  const [channelOn, setChannelOn] = useState({ ch1: true, ch2: true });
  const [coupling, setCoupling] = useState({ ch1: DEFAULT_COUPLING, ch2: DEFAULT_COUPLING });
  const [triggerSource, setTriggerSource] = useState(DEFAULT_TRIGGER_SOURCE);
  const [triggerSlope, setTriggerSlope] = useState(DEFAULT_TRIGGER_SLOPE);
  const [triggerLevel, setTriggerLevel] = useState(DEFAULT_TRIGGER_LEVEL);

  const ch1Comp = placedProbes.find((c) => c.type === 'probe1');
  const ch2Comp = placedProbes.find((c) => c.type === 'probe2');
  const hasCh1 = !!ch1Comp;
  const hasCh2 = !!ch2Comp;
  const ch1Floating = !!(ch1Comp && floatingNodes && (floatingNodes.has(ch1Comp.a) || floatingNodes.has(ch1Comp.b)));
  const ch2Floating = !!(ch2Comp && floatingNodes && (floatingNodes.has(ch2Comp.a) || floatingNodes.has(ch2Comp.b)));

  // A trigger source that no longer has a probe on the board (its channel
  // was removed) is worthless — fall back to whichever channel is still
  // present rather than leaving the trigger silently dead.
  useEffect(() => {
    if (triggerSource === 'ch1' && !hasCh1 && hasCh2) setTriggerSource('ch2');
    else if (triggerSource === 'ch2' && !hasCh2 && hasCh1) setTriggerSource('ch1');
  }, [hasCh1, hasCh2, triggerSource]);

  const probes = useMemo(() => {
    const list = [];
    if (ch1Comp) list.push({ id: 'ch1', nodes: [ch1Comp.a, ch1Comp.b] });
    if (ch2Comp) list.push({ id: 'ch2', nodes: [ch2Comp.a, ch2Comp.b] });
    return list;
  }, [ch1Comp, ch2Comp]);

  const { display, lastCaptureRef } = useOscilloscope({
    elements,
    ground,
    solverStateRef,
    probes,
    enabled: expanded, // nothing shows the trace while collapsed, so don't bother capturing
    running,
    timePerDiv,
    couplings: coupling,
    triggerSource,
    triggerSlope,
    triggerLevel,
  });

  const handleAuto = useCallback(() => {
    const cap = lastCaptureRef.current;
    if (!cap || cap.time.length === 0) return;
    const { timePerDiv: tpd, voltsPerDiv: vpd } = autoFrame(cap);
    setTimePerDiv(tpd);
    setVoltsPerDiv((prev) => ({ ...prev, ...vpd }));
    setVerticalPosition({ ch1: DEFAULT_VERTICAL_POSITION, ch2: DEFAULT_VERTICAL_POSITION });
    setTriggerLevel(DEFAULT_TRIGGER_LEVEL);
  }, [lastCaptureRef]);

  const canvasRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !expanded) return undefined;

    function resize() {
      const r = cvs.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvs.width = Math.round(r.width * dpr);
      cvs.height = Math.round(r.height * dpr);
      const ctx = cvs.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setSize({ w: r.width, h: r.height });
    }

    let ro = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(resize);
      ro.observe(cvs);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
    };
  }, [expanded]);

  const triggerVPerDiv = voltsPerDiv[triggerSource] ?? DEFAULT_VOLTS_PER_DIV;
  const triggerRange = 4 * triggerVPerDiv; // +-4 divisions, matching the 8-division-tall screen
  const triggerColor = triggerSource === 'ch1' ? SCOPE_CH1_COLOR : SCOPE_CH2_COLOR;
  const triggerShown = (triggerSource === 'ch1' && hasCh1) || (triggerSource === 'ch2' && hasCh2);

  // Redraws whenever the data or the display scaling changes — not a
  // continuous rAF loop like the physics canvases, since nothing here
  // animates between captures (see useOscilloscope: display only updates a
  // few times a second, or not at all during HOLD) — an imperative draw
  // triggered by its own inputs is simpler and cheaper, the same pattern
  // Plot.js uses for the same reason.
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !expanded || size.w === 0) return;
    const ctx = cvs.getContext('2d');
    drawScopeScreen(ctx, size.w, size.h, {
      display,
      voltsPerDiv,
      verticalPosition,
      showCh1: hasCh1 && channelOn.ch1 && (coupling.ch1 === 'GND' || !ch1Floating),
      showCh2: hasCh2 && channelOn.ch2 && (coupling.ch2 === 'GND' || !ch2Floating),
      trigger: triggerShown
        ? {
            value: triggerLevel,
            vPerDiv: triggerVPerDiv,
            posDiv: verticalPosition[triggerSource] ?? 0,
            color: triggerColor,
          }
        : null,
    });
  }, [
    expanded,
    size,
    display,
    voltsPerDiv,
    verticalPosition,
    hasCh1,
    hasCh2,
    channelOn,
    coupling,
    ch1Floating,
    ch2Floating,
    triggerShown,
    triggerLevel,
    triggerVPerDiv,
    triggerSource,
    triggerColor,
  ]);

  const timeIndex = Math.max(0, TIME_PER_DIV_OPTIONS.indexOf(timePerDiv));
  const ch1Index = Math.max(0, VOLTS_PER_DIV_OPTIONS.indexOf(voltsPerDiv.ch1));
  const ch2Index = Math.max(0, VOLTS_PER_DIV_OPTIONS.indexOf(voltsPerDiv.ch2));
  const clampedTriggerLevel = Math.min(triggerRange, Math.max(-triggerRange, triggerLevel));

  if (!expanded) {
    return (
      <div className="circuit-scope circuit-scope-collapsed">
        <h4 className="circuit-scope-nameplate">OSCILLOSCOPE</h4>
        <button type="button" className="btn btn-line" onClick={() => onExpandedChange(true)}>
          OPEN SCOPE
        </button>
      </div>
    );
  }

  function channelBlock(ch, color, floating) {
    return (
      <div className="circuit-scope-channel">
        <div className="circuit-generator-row">
          <span className="circuit-scope-channel-label" style={{ color }}>
            {ch.toUpperCase()}
            {floating && coupling[ch] !== 'GND' ? ' (no signal)' : ''}
          </span>
          <div className="circuit-range-switch" role="tablist" aria-label={`${ch.toUpperCase()} on or off`}>
            <button
              type="button"
              role="tab"
              aria-selected={channelOn[ch]}
              className={channelOn[ch] ? 'active' : ''}
              onClick={() => setChannelOn((prev) => ({ ...prev, [ch]: true }))}
            >
              ON
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!channelOn[ch]}
              className={!channelOn[ch] ? 'active' : ''}
              onClick={() => setChannelOn((prev) => ({ ...prev, [ch]: false }))}
            >
              OFF
            </button>
          </div>
        </div>

        <div className="circuit-generator-row">
          <span>COUPLING</span>
          <div className="circuit-range-switch" role="tablist" aria-label={`${ch.toUpperCase()} coupling`}>
            {COUPLING_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={coupling[ch] === c}
                className={coupling[ch] === c ? 'active' : ''}
                onClick={() => setCoupling((prev) => ({ ...prev, [ch]: c }))}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="circuit-generator-slider">
          <span>VOLTS/DIV</span>
          <input
            type="range"
            min={0}
            max={VOLTS_PER_DIV_OPTIONS.length - 1}
            step={1}
            value={ch === 'ch1' ? ch1Index : ch2Index}
            onChange={(e) =>
              setVoltsPerDiv((prev) => ({ ...prev, [ch]: VOLTS_PER_DIV_OPTIONS[parseInt(e.target.value, 10)] }))
            }
          />
          <span className="circuit-generator-value">{formatVoltsPerDiv(voltsPerDiv[ch])}</span>
        </label>
        <label className="circuit-generator-slider">
          <span>POSITION</span>
          <input
            type="range"
            min={VERTICAL_POSITION_MIN}
            max={VERTICAL_POSITION_MAX}
            step={VERTICAL_POSITION_STEP}
            value={verticalPosition[ch]}
            onChange={(e) => setVerticalPosition((prev) => ({ ...prev, [ch]: parseFloat(e.target.value) }))}
          />
        </label>
      </div>
    );
  }

  // Header + screen: the part that has to stay in view. Portaled into the
  // bench's pinned region when there is one; rendered in place otherwise.
  const screen = (
    <div className="scope-pinned">
      <div className="circuit-scope-header">
        <h4 className="circuit-scope-nameplate">OSCILLOSCOPE</h4>
        <button type="button" className="btn btn-line" onClick={() => onExpandedChange(false)}>
          CLOSE
        </button>
      </div>
      <div className="scope-screen">
        <div className="scope-statusbar">
          <span>{formatTimePerDiv(timePerDiv)}/div</span>
          {hasCh1 && <span style={{ color: SCOPE_CH1_COLOR }}>CH1 {formatVoltsPerDiv(voltsPerDiv.ch1)}/div</span>}
          {hasCh2 && <span style={{ color: SCOPE_CH2_COLOR }}>CH2 {formatVoltsPerDiv(voltsPerDiv.ch2)}/div</span>}
          <span style={{ color: display.triggered ? undefined : SCOPE_CH2_COLOR }}>
            {display.triggered ? "TRIG'D" : 'UNTRIG (free-run)'}
          </span>
          <span className="scope-status-run">{running ? 'RUN' : 'HOLD'}</span>
        </div>
        <div className="scope-canvas-wrap">
          <canvas ref={canvasRef} className="scope-canvas" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="circuit-scope circuit-scope-expanded">
      {pinnedSlot ? createPortal(screen, pinnedSlot) : screen}

      {/* Controls only: the screen they used to sit beside is in the pinned
          region above, so on wide screens they spread across the panel's
          width (see globals.css) and stack on narrow ones. */}
      <div className="circuit-scope-body">
        <div className="circuit-scope-controls">
          <section className="circuit-scope-section">
            <h5>HORIZONTAL</h5>
            <div className="circuit-generator-row">
              <span>TIME/DIV</span>
              <input
                type="range"
                min={0}
                max={TIME_PER_DIV_OPTIONS.length - 1}
                step={1}
                value={timeIndex}
                onChange={(e) => setTimePerDiv(TIME_PER_DIV_OPTIONS[parseInt(e.target.value, 10)])}
              />
              <span className="circuit-generator-value">{formatTimePerDiv(timePerDiv)}/div</span>
            </div>
          </section>

          <section className="circuit-scope-section">
            <h5>VERTICAL</h5>
            {hasCh1 && channelBlock('ch1', SCOPE_CH1_COLOR, ch1Floating)}
            {hasCh2 && channelBlock('ch2', SCOPE_CH2_COLOR, ch2Floating)}
          </section>

          <section className="circuit-scope-section">
            <h5>TRIGGER</h5>
            <div className="circuit-generator-row">
              <span>SOURCE</span>
              <div className="circuit-range-switch" role="tablist" aria-label="Trigger source">
                {hasCh1 && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={triggerSource === 'ch1'}
                    className={triggerSource === 'ch1' ? 'active' : ''}
                    onClick={() => setTriggerSource('ch1')}
                  >
                    CH1
                  </button>
                )}
                {hasCh2 && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={triggerSource === 'ch2'}
                    className={triggerSource === 'ch2' ? 'active' : ''}
                    onClick={() => setTriggerSource('ch2')}
                  >
                    CH2
                  </button>
                )}
              </div>
            </div>
            <div className="circuit-generator-row">
              <span>SLOPE</span>
              <div className="circuit-range-switch" role="tablist" aria-label="Trigger slope">
                {TRIGGER_SLOPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={triggerSlope === s}
                    className={triggerSlope === s ? 'active' : ''}
                    onClick={() => setTriggerSlope(s)}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <label className="circuit-generator-slider">
              <span>LEVEL</span>
              <input
                type="range"
                min={-triggerRange}
                max={triggerRange}
                step={triggerRange / 100 || 0.01}
                value={clampedTriggerLevel}
                onChange={(e) => setTriggerLevel(parseFloat(e.target.value))}
              />
              <span className="circuit-generator-value">{formatVoltage(triggerLevel)}</span>
            </label>
          </section>

          <div className="circuit-scope-buttons">
            <button type="button" className="btn btn-line" onClick={handleAuto}>
              AUTO
            </button>
            <div className="circuit-range-switch" role="tablist" aria-label="Run or hold">
              <button type="button" role="tab" aria-selected={running} className={running ? 'active' : ''} onClick={() => setRunning(true)}>
                RUN
              </button>
              <button type="button" role="tab" aria-selected={!running} className={!running ? 'active' : ''} onClick={() => setRunning(false)}>
                HOLD
              </button>
            </div>
          </div>
        </div>
      </div>

      {dataTable && dataTable.table && (
        <div className="circuit-scope-section circuit-scope-table">
          <h5>DATA TABLE</h5>
          <DataTable {...dataTable} symbols={tableSymbols} />
        </div>
      )}
    </div>
  );
}
