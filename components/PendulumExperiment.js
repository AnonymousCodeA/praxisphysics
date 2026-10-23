'use client';

// The pendulum experiment as a consumer of the generic ExperimentWorkspace
// shell, rather than being the shell itself: this file just wires the
// pendulum's guide content and bench into it, plus the generic QuickEntry
// for filling the student's own table on a phone.
import ExperimentWorkspace from './ExperimentWorkspace';
import PendulumLab from './PendulumLab';
import QuickEntry from './QuickEntry';
import { pendulumParts } from '@/data/pendulumGuide';

export default function PendulumExperiment() {
  return (
    <ExperimentWorkspace
      experimentId="pendulum"
      parts={pendulumParts}
      Bench={PendulumLab}
      DataTools={QuickEntry}
    />
  );
}
