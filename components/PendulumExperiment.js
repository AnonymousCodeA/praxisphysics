'use client';

// The pendulum experiment as a consumer of the generic ExperimentWorkspace
// shell, rather than being the shell itself: this file just wires the
// pendulum's guide content and bench into it, plus the generic QuickEntry
// for filling the student's own table on a phone.
//
// `parts` arrives as a prop from the page (a Server Component) rather than
// being imported here, so its KaTeX maths is rendered on the server and no
// KaTeX JS ships with the bench — see data/pendulumGuide.js. Functions
// can't cross that boundary, so an answer whose true value depends on the
// bench names a resolver (`trueValueOf`) and gets it attached here.
import { useMemo } from 'react';
import ExperimentWorkspace from './ExperimentWorkspace';
import PendulumLab from './PendulumLab';
import QuickEntry from './QuickEntry';
import { WalkthroughProblemOffer } from './PendulumWalkthrough';
import { G } from '@/lib/pendulum/model.mjs';
import { getBenchLength } from '@/lib/pendulum/benchLength';
import { pendulumWalkthrough, pendulumWalkthroughPart } from '@/data/pendulumWalkthrough';

// Module-level, so its identity is stable across renders.
function ProblemTools(props) {
  return <WalkthroughProblemOffer {...props} steps={pendulumWalkthrough} walkPart={pendulumWalkthroughPart} />;
}

const trueValueResolvers = {
  // T₀ = 2π√(L/g) for the point-bob model (lib/pendulum/model.mjs), at the
  // length on the bench when the answer is committed. Five significant
  // figures is far below any timing error.
  smallAmplitudePeriod() {
    const L = getBenchLength();
    if (!L) return NaN;
    return Number((2 * Math.PI * Math.sqrt(L / G)).toPrecision(5));
  },
};

function resolveSpec(spec) {
  if (!spec.trueValueOf) return spec;
  const trueValue = trueValueResolvers[spec.trueValueOf];
  if (!trueValue) throw new Error(`Unknown trueValueOf: ${spec.trueValueOf}`);
  return { ...spec, trueValue };
}

function resolveAnswer(answer) {
  if (!answer) return answer;
  return Array.isArray(answer) ? answer.map(resolveSpec) : resolveSpec(answer);
}

function resolveTask(items) {
  return items?.map((t) => ({ ...t, answer: resolveAnswer(t.answer), items: resolveTask(t.items) }));
}

export default function PendulumExperiment({ parts, symbols }) {
  const resolved = useMemo(
    () => parts.map((p) => ({ ...p, answer: resolveAnswer(p.answer), task: resolveTask(p.task) })),
    [parts]
  );
  return (
    <ExperimentWorkspace
      experimentId="pendulum"
      parts={resolved}
      symbols={symbols}
      Bench={PendulumLab}
      DataTools={QuickEntry}
      ProblemTools={ProblemTools}
    />
  );
}
