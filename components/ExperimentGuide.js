// Renders a part's problem statement, formulae, task and hints from a plain
// data definition (title/body/formulae/task/answer/hints/credit — see e.g.
// data/pendulumGuide.js) rather than owning any experiment's actual content
// itself. Deliberately thin: no method beyond what `def` supplies, since
// deciding how to measure and what to tabulate is the skill each experiment
// is teaching, not something this shell should encode. A `task` says what to
// produce, never how; `answer` (on the part, or on a single task item) adds
// a commit-once answer box, and `startOver` a confirmed reset of the whole
// part below that. `stuckHint` is a single hint under the task, collapsed
// in a native <details> (as GuideQ does) so reading it is a deliberate act
// — see CLAUDE.md on the three tiers. A task item's `answer` may be one
// spec or an array (B3's α and β). `footer` closes the pane at body-text
// size (the guide links). The `answer` and `onStartOver` props come from
// ExperimentWorkspace, which owns the part's state. CSS classes keep the
// "pendulum-" prefix — see the matching note on DataTable.
import AnswerBox from './AnswerBox';
import StartOver from './StartOver';
import { answerFor } from '@/lib/experiment/useCommittedAnswer';

function TaskList({ items, stored, commit }) {
  return (
    <ol className="pendulum-task">
      {items.map((t) => (
        <li key={t.id}>
          <span>{t.id}</span>
          <div>
            <p>{t.text}</p>
            {t.items && t.items.length > 0 && <TaskList items={t.items} stored={stored} commit={commit} />}
            {t.answer &&
              [].concat(t.answer).map((spec) => (
                <AnswerBox
                  key={spec.symbol}
                  spec={spec}
                  answer={answerFor(stored, spec.symbol)}
                  commit={(record) => commit(spec.symbol, record)}
                />
              ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ExperimentGuide({ def, answer, onStartOver }) {
  if (!def) return null;
  const hasFormulae = def.formulae && def.formulae.length > 0;
  const hasTask = def.task && def.task.length > 0;
  const hasHints = def.hints && def.hints.length > 0;
  const stored = answer.answer;
  const commit = answer.commit;

  return (
    <div className="pendulum-guide">
      <span className="tag">{def.tag}</span>
      <h3>{def.title}</h3>
      {def.body}
      {def.credit && <p className="pendulum-guide-credit">{def.credit}</p>}

      {hasFormulae && (
        <>
          <h4>Formulae</h4>
          <ul className="pendulum-formulae">
            {def.formulae.map((f, i) => (
              <li key={i}>
                <span>{f.expr}</span>
                <small>{f.note}</small>
              </li>
            ))}
          </ul>
        </>
      )}

      {hasTask && (
        <>
          <h4>Task</h4>
          <TaskList items={def.task} stored={stored} commit={commit} />
        </>
      )}
      {def.stuckHint && (
        <details className="pendulum-stuck">
          <summary>Stuck? Show a hint</summary>
          <p>{def.stuckHint}</p>
        </details>
      )}
      {def.answer && (
        <AnswerBox
          spec={def.answer}
          answer={answerFor(stored, def.answer.symbol)}
          commit={(record) => commit(def.answer.symbol, record)}
        />
      )}
      {def.startOver && <StartOver {...def.startOver} onConfirm={onStartOver} />}

      {hasHints && (
        <>
          <h4>Before you start, consider</h4>
          <ul className="pendulum-hints">
            {def.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </>
      )}

      {def.footer && <div className="pendulum-guide-footer">{def.footer}</div>}
    </div>
  );
}
