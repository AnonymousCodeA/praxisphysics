'use client';

// Problem 2 (non-linear elements) as a consumer of ExperimentWorkspace, same
// relationship as CircuitsExperiment.js has to problem 1 — see that file's
// header comment for why Bench is a module-level function.
import ExperimentWorkspace from './ExperimentWorkspace';
import CircuitBench from './CircuitBench';
import { circuitsNonlinearParts } from '@/data/circuitsNonlinearGuide';
import { circuitsNonlinearInventory } from '@/data/circuitsNonlinearInventory';

const ROWS = 6;
const COLS = 9;

function Bench({ dataTable }) {
  return <CircuitBench inventory={circuitsNonlinearInventory} rows={ROWS} cols={COLS} dataTable={dataTable} />;
}

export default function CircuitsNonlinearExperiment() {
  return <ExperimentWorkspace experimentId="circuits-nonlinear" parts={circuitsNonlinearParts} Bench={Bench} />;
}
