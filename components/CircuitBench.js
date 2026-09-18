'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CircuitCanvas from './CircuitCanvas';
import CircuitInventory from './CircuitInventory';
import Oscilloscope from './Oscilloscope';
import { useCircuitPhysics } from '@/lib/circuits/useCircuitPhysics';
import { useHeater } from '@/lib/circuits/useHeater';
import {
  VOLT_RANGE_ORDER,
  AMP_RANGE_ORDER,
  DEFAULT_VOLT_RANGE,
  DEFAULT_AMP_RANGE,
} from '@/lib/circuits/scene';
import {
  GENERATOR_WAVEFORMS,
  DEFAULT_GENERATOR_WAVEFORM,
  DEFAULT_GENERATOR_AMPLITUDE_PKPK,
  GENERATOR_AMPLITUDE_PKPK_MAX,
  GENERATOR_AMPLITUDE_PKPK_STEP,
  GENERATOR_DECADES,
  DEFAULT_GENERATOR_DECADE,
  GENERATOR_COARSE_MIN,
  GENERATOR_COARSE_MAX,
  GENERATOR_COARSE_STEP,
  DEFAULT_GENERATOR_COARSE,
  GENERATOR_FINE_RANGE,
  GENERATOR_FINE_STEP,
  DEFAULT_GENERATOR_FINE,
  generatorFrequency,
  formatFrequency,
} from '@/lib/circuits/generatorControls';

const GROUND = '__ground__'; // an internal reference node, never a real grid
// intersection — see model.mjs: any unreferenced node still gets its GMIN
// leak, which is all a "ground" needs to be here. The board has no earth
// symbol; only voltage DIFFERENCES (what the meter reads) are physical, so
// which node this constant names doesn't matter.

const SOLVER_TYPE = {
  battery: 'vsource',
  resistor: 'resistor',
  capacitor: 'capacitor',
  switch: 'switch',
  wire: 'wire',
  voltmeter: 'meter',
  ammeter: 'ammeter',
  thermistor: 'thermistor',
  inductor: 'inductor',
  generator: 'generator',
  // The scope's probes tap two nodes without loading the circuit — exactly
  // a voltmeter's own 'meter' stamp (infinite impedance, purely a read).
  // Two distinct inventory/board types (rather than one 'probe' type with
  // a channel field) so a channel is decided at placement, the same way a
  // voltmeter and ammeter are separate types rather than one "meter" with
  // a mode.
  probe1: 'meter',
  probe2: 'meter',
};

// Expands the problem definition's inventory ({ id, type, value, label,
// count, shuntOhms?, capacitanceFn?, r0?/beta?/t0? }[]) into individually-
// numbered physical instances. Each is its own object with its own
// identity for the whole session — critically, this is what lets a
// specific capacitor keep its charge across being removed to stock and
// placed again elsewhere: "stock" is a pool of these instances, not a
// fungible count that would blur which physical object is which.
function expandInventory(inventory) {
  const instances = [];
  for (const item of inventory) {
    for (let i = 1; i <= item.count; i++) {
      instances.push({
        instanceId: `${item.id}#${i}`,
        itemId: item.id,
        type: item.type,
        value: item.value,
        shuntOhms: item.shuntOhms,
        capacitanceFn: item.capacitanceFn,
        r0: item.r0,
        beta: item.beta,
        t0: item.t0,
        outputImpedance: item.outputImpedance,
        label: item.label,
      });
    }
  }
  return instances;
}

// The circuit-building bench: a grid of nodes where every two-terminal
// component occupies one edge (see lib/circuits/grid.js), solved
// continuously by lib/circuits/model.mjs. `inventory` is the problem
// definition's stock list and should be a stable reference (defined once,
// not recreated every render) since it drives every callback's identity.
// `dataTable` is optional — the active part's useDataTable() return value,
// forwarded from ExperimentWorkspace via the CircuitsExperiment.js-style
// Bench wrapper; undefined on the circuit-builder sandbox page, which
// renders CircuitBench directly with no ExperimentWorkspace/table at all.
// Passed straight through to Oscilloscope, which mirrors it into its own
// panel when expanded.
export default function CircuitBench({ inventory, rows = 5, cols = 7, dataTable }) {
  const instances = useMemo(() => expandInventory(inventory), [inventory]);
  // Whether this problem's inventory includes a thermistor at all — drives
  // whether the Heater/Thermometer panel exists. useHeater() is still
  // called unconditionally below regardless (hooks can't be conditional),
  // it's only the panel and the temperature fed into a thermistor element
  // that are gated on this.
  const hasThermistor = useMemo(() => inventory.some((item) => item.type === 'thermistor'), [inventory]);
  const heater = useHeater();

  const [placed, setPlaced] = useState([]); // on-board components
  const [history, setHistory] = useState([]); // undo stack: { action: 'place'|'remove', component }
  const [armedId, setArmedId] = useState(null);

  const placedRef = useRef(placed);
  const armedIdRef = useRef(armedId);
  useEffect(() => {
    placedRef.current = placed;
  }, [placed]);
  useEffect(() => {
    armedIdRef.current = armedId;
  }, [armedId]);

  const remaining = useMemo(() => {
    const placedIds = new Set(placed.map((c) => c.instanceId));
    const counts = {};
    for (const item of inventory) {
      counts[item.id] = instances.filter((i) => i.itemId === item.id && !placedIds.has(i.instanceId)).length;
    }
    return counts;
  }, [inventory, instances, placed]);

  const elements = useMemo(
    () =>
      placed.map((c) => ({
        id: c.instanceId,
        type: SOLVER_TYPE[c.type],
        nodes: [c.a, c.b],
        value: c.value,
        shuntOhms: c.shuntOhms,
        capacitanceFn: c.capacitanceFn,
        closed: c.closed,
        r0: c.r0,
        beta: c.beta,
        t0: c.t0,
        // No thermal lag: a placed thermistor sits at exactly the heater's
        // displayed temperature, converted to kelvin for model.mjs's
        // thermistorResistance — never a separately-simulated value.
        temperature: c.type === 'thermistor' ? heater.displayTemperature + 273.15 : undefined,
        outputImpedance: c.outputImpedance,
        waveform: c.waveform,
        // model.mjs's `amplitude` is a PEAK value; the control panel shows
        // peak-to-peak (what a student would actually read a generator's
        // own dial as), so the halving happens here, at the one point the
        // two representations meet.
        amplitude: c.type === 'generator' ? c.amplitudePkPk / 2 : undefined,
        frequency: c.type === 'generator' ? generatorFrequency(c.freqDecade, c.freqCoarse, c.freqFine) : undefined,
        offset: c.type === 'generator' ? 0 : undefined,
        phase: c.type === 'generator' ? 0 : undefined,
      })),
    [placed, heater.displayTemperature]
  );

  const { voltages, floatingNodes, solverStateRef, dischargeCapacitor } = useCircuitPhysics({ elements, ground: GROUND });

  const handleArm = useCallback((itemId) => {
    setArmedId((prev) => (prev === itemId ? null : itemId));
  }, []);

  // Reads placedRef (not `placed` via closure) so this callback's identity
  // never changes with every placement — CircuitCanvas rebuilds its pointer
  // handlers whenever onPlace/onRemove/onToggleSwitch change, so keeping
  // these stable matters for not tearing down the canvas effect mid-build.
  const handlePlace = useCallback(
    (edge) => {
      const itemId = armedIdRef.current;
      if (!itemId) return;
      if (placedRef.current.some((c) => c.edgeKey === edge.key)) return;
      const usedInstanceIds = new Set(placedRef.current.map((c) => c.instanceId));
      const inst = instances.find((i) => i.itemId === itemId && !usedInstanceIds.has(i.instanceId));
      if (!inst) return;
      const comp = {
        ...inst,
        edgeKey: edge.key,
        a: edge.a,
        b: edge.b,
        closed: inst.type === 'switch' ? false : undefined,
        range: inst.type === 'voltmeter' ? DEFAULT_VOLT_RANGE : inst.type === 'ammeter' ? DEFAULT_AMP_RANGE : undefined,
        // Reset to a fixed sensible default on every fresh placement, same
        // convention as a switch's `closed` or a meter's `range` — not
        // persisted per-instance across a remove/replace.
        waveform: inst.type === 'generator' ? DEFAULT_GENERATOR_WAVEFORM : undefined,
        amplitudePkPk: inst.type === 'generator' ? DEFAULT_GENERATOR_AMPLITUDE_PKPK : undefined,
        freqDecade: inst.type === 'generator' ? DEFAULT_GENERATOR_DECADE : undefined,
        freqCoarse: inst.type === 'generator' ? DEFAULT_GENERATOR_COARSE : undefined,
        freqFine: inst.type === 'generator' ? DEFAULT_GENERATOR_FINE : undefined,
      };
      setPlaced((prev) => [...prev, comp]);
      setHistory((prev) => [...prev, { action: 'place', component: comp }]);
    },
    [instances]
  );

  const handleRemove = useCallback((instanceId) => {
    const comp = placedRef.current.find((c) => c.instanceId === instanceId);
    if (!comp) return;
    setPlaced((prev) => prev.filter((c) => c.instanceId !== instanceId));
    setHistory((prev) => [...prev, { action: 'remove', component: comp }]);
  }, []);

  // Toggling a switch is an experiment operation, not a build action — it
  // deliberately does not touch `history`, per the spec.
  const handleToggleSwitch = useCallback((instanceId) => {
    setPlaced((prev) => prev.map((c) => (c.instanceId === instanceId ? { ...c, closed: !c.closed } : c)));
  }, []);

  // Same reasoning as the switch: a meter's range is an experiment
  // operation (like flipping a real range dial), not a build action.
  const handleSetRange = useCallback((instanceId, range) => {
    setPlaced((prev) => prev.map((c) => (c.instanceId === instanceId ? { ...c, range } : c)));
  }, []);

  // Same reasoning again: waveform/amplitude/frequency are dials on the
  // generator itself, not build actions, so — like handleSetRange — this
  // never touches `history`. `patch` merges into the placed component's
  // own state so one handler covers every dial (waveform pill, amplitude
  // slider, decade pill, coarse/fine sliders) rather than one callback per
  // field.
  const handleSetGeneratorParam = useCallback((instanceId, patch) => {
    setPlaced((prev) => prev.map((c) => (c.instanceId === instanceId ? { ...c, ...patch } : c)));
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.action === 'place') {
        setPlaced((p) => p.filter((c) => c.instanceId !== last.component.instanceId));
      } else {
        setPlaced((p) => [...p, last.component]);
      }
      return prev.slice(0, -1);
    });
  }, []);

  const armedItem = armedId ? instances.find((i) => i.itemId === armedId) : null;
  // Only capacitors actually on the board — not every stocked instance (see
  // expandInventory): with a sandbox-sized stock (dozens per type), listing
  // every one in stock here would swamp the panel with rows for components
  // that aren't even placed yet.
  const placedCapacitors = useMemo(() => placed.filter((c) => c.type === 'capacitor'), [placed]);
  // Range only means anything for a meter that's actually on the board —
  // unlike capacitor charge, it isn't a property worth tracking in stock.
  const placedMeters = useMemo(
    () => placed.filter((c) => c.type === 'voltmeter' || c.type === 'ammeter'),
    [placed]
  );
  const placedGenerators = useMemo(() => placed.filter((c) => c.type === 'generator'), [placed]);
  const placedProbes = useMemo(() => placed.filter((c) => c.type === 'probe1' || c.type === 'probe2'), [placed]);

  // Lifted here (not owned by Oscilloscope itself) because expanding the
  // scope needs to hide the board-building UI below — see the render:
  // canvas/toolbar/inventory disappear while expanded, but every info/
  // control panel, Generators included, stays in normal flow underneath
  // the now-much-taller scope panel, satisfying "generator controls stay
  // visible below the expanded scope" for free, with no absolute-position
  // overlay math needed.
  const [scopeExpanded, setScopeExpanded] = useState(false);

  return (
    <div className="circuit-bench">
      {!scopeExpanded && (
        <div className="circuit-frame">
          <CircuitCanvas
            rows={rows}
            cols={cols}
            placed={placed}
            armed={armedItem}
            voltages={voltages}
            floatingNodes={floatingNodes}
            onPlace={handlePlace}
            onRemove={handleRemove}
            onToggleSwitch={handleToggleSwitch}
          />
          <p className="hint">
            Tap a component below to arm it, move over the board to preview it on the nearest
            edge, then tap again to place it. Tap a placed component to remove it and return it
            to stock. Tap a placed switch to toggle it — press and hold a switch to remove it. A
            placed meter reads OL if the value is beyond its selected range — switch its range in
            the Meters panel below.
          </p>
        </div>
      )}

      {!scopeExpanded && (
        <div className="circuit-toolbar">
          <button type="button" className="btn btn-line" onClick={handleUndo} disabled={history.length === 0}>
            UNDO
          </button>
        </div>
      )}

      {!scopeExpanded && <CircuitInventory items={inventory} remaining={remaining} armedId={armedId} onArm={handleArm} />}

      {hasThermistor && (
        <div className="circuit-heater">
          <h4>Heater / thermometer</h4>
          <div className="circuit-heater-row">
            <div className="circuit-range-switch" role="tablist" aria-label="Heater power">
              <button type="button" role="tab" aria-selected={heater.on} className={heater.on ? 'active' : ''} onClick={() => heater.setHeaterOn(true)}>
                ON
              </button>
              <button type="button" role="tab" aria-selected={!heater.on} className={!heater.on ? 'active' : ''} onClick={() => heater.setHeaterOn(false)}>
                OFF
              </button>
            </div>
            <span className="circuit-heater-temp" aria-label="Thermometer reading">
              {heater.displayTemperature.toFixed(1)} °C
            </span>
          </div>
          <p className="circuit-heater-note">
            Heats toward its 80 °C limit while on; cools back toward 25 °C ambient, more slowly, while off. The
            thermistor sits at exactly this temperature.
          </p>
        </div>
      )}

      {placedCapacitors.length > 0 && (
        <div className="circuit-capacitors">
          <h4>Capacitors</h4>
          {/* No voltage readout here, deliberately — showing it would let a
              student read a capacitor's charge without ever placing a
              voltmeter, which is exactly the measurement problem 1 Part B
              is testing. */}
          <ul>
            {placedCapacitors.map((inst) => (
              <li key={inst.instanceId}>
                <span className="circuit-cap-label">{inst.label}</span>
                <button type="button" onClick={() => dischargeCapacitor(inst.instanceId)}>
                  DISCHARGE
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {placedMeters.length > 0 && (
        <div className="circuit-meters">
          <h4>Meters</h4>
          <ul>
            {placedMeters.map((c) => {
              const options = c.type === 'voltmeter' ? VOLT_RANGE_ORDER : AMP_RANGE_ORDER;
              return (
                <li key={c.instanceId}>
                  <span className="circuit-meter-label">{c.label}</span>
                  <div className="circuit-range-switch" role="tablist" aria-label={`${c.label} meter range`}>
                    {options.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="tab"
                        aria-selected={c.range === r}
                        className={c.range === r ? 'active' : ''}
                        onClick={() => handleSetRange(c.instanceId, r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {placedProbes.length > 0 && (
        <Oscilloscope
          placedProbes={placedProbes}
          elements={elements}
          ground={GROUND}
          solverStateRef={solverStateRef}
          floatingNodes={floatingNodes}
          expanded={scopeExpanded}
          onExpandedChange={setScopeExpanded}
          dataTable={dataTable}
        />
      )}

      {placedGenerators.length > 0 && (
        <div className="circuit-generators">
          <h4>Generators</h4>
          {placedGenerators.map((c) => {
            const freq = generatorFrequency(c.freqDecade, c.freqCoarse, c.freqFine);
            return (
              <div className="circuit-generator" key={c.instanceId}>
                <div className="circuit-generator-row">
                  <span className="circuit-generator-label">{c.label}</span>
                  <div className="circuit-range-switch" role="tablist" aria-label={`${c.label} waveform`}>
                    {GENERATOR_WAVEFORMS.map((wf) => (
                      <button
                        key={wf}
                        type="button"
                        role="tab"
                        aria-selected={c.waveform === wf}
                        className={c.waveform === wf ? 'active' : ''}
                        onClick={() => handleSetGeneratorParam(c.instanceId, { waveform: wf })}
                      >
                        {wf.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="circuit-generator-slider">
                  <span>Amplitude (pk-pk)</span>
                  <input
                    type="range"
                    min={0}
                    max={GENERATOR_AMPLITUDE_PKPK_MAX}
                    step={GENERATOR_AMPLITUDE_PKPK_STEP}
                    value={c.amplitudePkPk}
                    onChange={(e) => handleSetGeneratorParam(c.instanceId, { amplitudePkPk: parseFloat(e.target.value) })}
                  />
                  <span className="circuit-generator-value">{c.amplitudePkPk.toFixed(1)} V</span>
                </label>

                <div className="circuit-generator-row">
                  <span>Range</span>
                  <div className="circuit-range-switch" role="tablist" aria-label={`${c.label} frequency range`}>
                    {GENERATOR_DECADES.map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="tab"
                        aria-selected={c.freqDecade === d}
                        className={c.freqDecade === d ? 'active' : ''}
                        onClick={() => handleSetGeneratorParam(c.instanceId, { freqDecade: d })}
                      >
                        {formatFrequency(d)}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="circuit-generator-slider">
                  <span>Coarse</span>
                  <input
                    type="range"
                    min={GENERATOR_COARSE_MIN}
                    max={GENERATOR_COARSE_MAX}
                    step={GENERATOR_COARSE_STEP}
                    value={c.freqCoarse}
                    onChange={(e) => handleSetGeneratorParam(c.instanceId, { freqCoarse: parseFloat(e.target.value) })}
                  />
                </label>
                <label className="circuit-generator-slider">
                  <span>Fine</span>
                  <input
                    type="range"
                    min={-GENERATOR_FINE_RANGE}
                    max={GENERATOR_FINE_RANGE}
                    step={GENERATOR_FINE_STEP}
                    value={c.freqFine}
                    onChange={(e) => handleSetGeneratorParam(c.instanceId, { freqFine: parseFloat(e.target.value) })}
                  />
                </label>

                <span className="circuit-generator-freq">{formatFrequency(freq)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
