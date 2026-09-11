'use client';

import CircuitBench from '@/components/CircuitBench';
import { circuitInventory } from './circuitInventory';

export default function CircuitBenchHarness() {
  return <CircuitBench inventory={circuitInventory} rows={5} cols={7} />;
}
