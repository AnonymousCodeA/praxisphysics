'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CircuitCanvas from './CircuitCanvas';
import CircuitInventory from './CircuitInventory';
import { useCircuitPhysics } from '@/lib/circuits/useCircuitPhysics';

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
};

// Expands the problem definition's inventory ({ id, type, value, label,
// count }[]) into individually-numbered physical instances. Each is its own
// object with its own identity for the whole session — critically, this is
// what lets a specific capacitor keep its charge across being removed to
// stock and placed again elsewhere: "stock" is a pool of these instances,
// not a fungible count that would blur which physical object is which.
function expandInventory(inventory) {
  const instances = [];
  for (const item of inventory) {
    for (let i = 1; i <= item.count; i++) {
      instances.push({ instanceId: `${item.id}#${i}`, itemId: item.id, type: item.type, value: item.value, label: item.label });
    }
  }
  return instances;
}

// The circuit-building bench: a grid of nodes where every two-terminal
// component occupies one edge (see lib/circuits/grid.js), solved
// continuously by lib/circuits/model.mjs. `inventory` is the problem
// definition's stock list and should be a stable reference (defined once,
// not recreated every render) since it drives every callback's identity.
export default function CircuitBench({ inventory, rows = 5, cols = 7 }) {
  const instances = useMemo(() => expandInventory(inventory), [inventory]);

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
        closed: c.closed,
      })),
    [placed]
  );

  const { voltages, dischargeCapacitor, capacitorVoltage } = useCircuitPhysics({ elements, ground: GROUND });

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
      const comp = { ...inst, edgeKey: edge.key, a: edge.a, b: edge.b, closed: inst.type === 'switch' ? false : undefined };
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
  const capacitorInstances = useMemo(() => instances.filter((i) => i.type === 'capacitor'), [instances]);

  return (
    <div className="circuit-bench">
      <div className="circuit-frame">
        <CircuitCanvas
          rows={rows}
          cols={cols}
          placed={placed}
          armed={armedItem}
          voltages={voltages}
          onPlace={handlePlace}
          onRemove={handleRemove}
          onToggleSwitch={handleToggleSwitch}
        />
        <p className="hint">
          Tap a component below to arm it, move over the board to preview it on the nearest
          edge, then tap again to place it. Tap a placed component to remove it and return it
          to stock. Tap a placed switch to toggle it — press and hold a switch to remove it.
        </p>
      </div>

      <div className="circuit-toolbar">
        <button type="button" className="btn btn-line" onClick={handleUndo} disabled={history.length === 0}>
          UNDO
        </button>
      </div>

      <CircuitInventory items={inventory} remaining={remaining} armedId={armedId} onArm={handleArm} />

      {capacitorInstances.length > 0 && (
        <div className="circuit-capacitors">
          <h4>Capacitors</h4>
          <ul>
            {capacitorInstances.map((inst) => {
              const onBoard = placed.some((c) => c.instanceId === inst.instanceId);
              const v = capacitorVoltage(inst.instanceId, inst.value);
              return (
                <li key={inst.instanceId}>
                  <span className="circuit-cap-label">{inst.label}</span>
                  <span className="circuit-cap-status">{onBoard ? 'ON BOARD' : 'IN STOCK'}</span>
                  <span className="circuit-cap-voltage">{v.toFixed(3)} V</span>
                  <button type="button" onClick={() => dischargeCapacitor(inst.instanceId)}>
                    DISCHARGE
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
