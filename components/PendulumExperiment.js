'use client';

// The pendulum experiment as a consumer of the generic ExperimentWorkspace
// shell, rather than being the shell itself: this file just wires the
// pendulum's guide content and bench into it.
import ExperimentWorkspace from './ExperimentWorkspace';
import PendulumLab from './PendulumLab';
import { pendulumParts } from '@/data/pendulumGuide';

export default function PendulumExperiment() {
  return <ExperimentWorkspace experimentId="pendulum" parts={pendulumParts} Bench={PendulumLab} />;
}
