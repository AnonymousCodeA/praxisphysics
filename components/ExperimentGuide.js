// Renders a part's problem statement, formulae, and hints from a plain data
// definition (title/body/formulae/hints/credit — see e.g. data/pendulumGuide.js)
// rather than owning any experiment's actual content itself. Deliberately
// thin: no method beyond what `def` supplies, since deciding how to measure
// and what to tabulate is the skill each experiment is teaching, not
// something this shell should encode. CSS classes keep the "pendulum-"
// prefix — see the matching note on DataTable.
export default function ExperimentGuide({ def }) {
  if (!def) return null;
  const hasFormulae = def.formulae && def.formulae.length > 0;
  const hasHints = def.hints && def.hints.length > 0;

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
    </div>
  );
}
