// The pendulum's current effective length (pivot to bob centre, metres),
// published by PendulumLab whenever the LENGTH control changes. Exists for
// one reader: Part B's T₀ answer, whose true value — 2π√(L/g) for the
// point-bob model in model.mjs — depends on the length on the bench, unlike
// g, α or β. The answer spec reads it at the moment of commit and the
// committed record keeps the number, so the reveal can't drift afterwards.
// Module-level for the same reason as lib/experiment/benchHintState.js: the
// bench and the problem pane sit in unrelated branches of the workspace.
let current = null;

export function setBenchLength(L) {
  current = L;
}

export function getBenchLength() {
  return current;
}
