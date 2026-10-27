'use client';

// The circuits experiment as a consumer of the generic ExperimentWorkspace
// shell, rather than being the shell itself: this file just wires the
// circuits guide content, the shared inventory, and the bench into it.
import ExperimentWorkspace from './ExperimentWorkspace';
import CircuitBench from './CircuitBench';
import { circuitsParts, circuitsSymbols } from '@/data/circuitsGuide';
import { circuitsInventory } from '@/data/circuitsInventory';

const ROWS = 6;
const COLS = 9;

// A module-level function (not defined inside CircuitsExperiment) so its
// identity is stable across renders — a freshly-created component reference
// every render would remount CircuitBench (and with it, the board and every
// capacitor's charge) instead of leaving it alone across a part switch.
// ExperimentWorkspace passes the active part's `dataTable` as a plain prop
// update, which doesn't trigger that — forwarded straight through so
// CircuitBench can mirror it into the oscilloscope's own panel.
function Bench({ dataTable }) {
  return (
    <CircuitBench
      inventory={circuitsInventory}
      rows={ROWS}
      cols={COLS}
      dataTable={dataTable}
      tableSymbols={circuitsSymbols}
    />
  );
}

export default function CircuitsExperiment() {
  return (
    <ExperimentWorkspace experimentId="circuits" parts={circuitsParts} symbols={circuitsSymbols} Bench={Bench} />
  );
}
