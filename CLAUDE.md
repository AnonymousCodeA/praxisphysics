# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Praxis — free, interactive physics simulations and past-paper archives for students, "Physics Lab, Simulated." Marketing/product site today (homepage + category/collection shells); the simulations themselves are the product being built out incrementally, one canvas at a time.

## Stack

Next.js 15 (App Router) + React 19, plain JS (no TypeScript), no CSS framework — everything lives in `app/globals.css` with CSS custom properties at the top. No test setup, no linter config. `@/*` path alias resolves to the repo root (see `jsconfig.json`).

## Commands

```
npm run dev      # start dev server, http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
```

Deploys on push to `main` via Vercel (auto-detects Next.js, no config needed).

## Layout

```
app/
  layout.js              fonts (self-hosted via next/font, not Google-fetched at runtime),
                          metadata, mounts Header/Footer/FieldBackground
  page.js                homepage: hero + sims grid + papers grid + community band
  globals.css             all styling; CSS vars at the top define the palette/type/spacing
  simulations/[slug]/    one page per category (data-driven, see data/simulations.js)
  papers/[slug]/         one page per collection (data-driven, see data/papers.js)
components/
  Header.js / Footer.js
  FieldBackground.js     fixed-canvas cursor "charge field" that warps the page's grid lines
  DiffractionGrating.js  the hero simulation — canonical example for how a sim is built
  Figures.js             small inline-SVG line drawings used on the category cards
  PendulumLab.js / PendulumCanvas.js
                          canonical example of a measurement-driven experiment: physics
                          engine + drag/release, decoupled from the instrument panels
  MagnifierPanel.js       renders the same bench scene as PendulumCanvas, zoomed — see the
                          shared-draw-function pattern below
  instruments/            generic digital instruments (Stopwatch, Protractor, Photogate) —
                          each takes a true value and applies its own resolution/error,
                          reusable across experiments. Not every instrument is digital: the
                          ruler is a draggable object drawn on the bench itself (lib/pendulum/scene.js)
data/
  simulations.js         categories[] (fixed 6: mechanics, thermodynamics, electromagnetism,
                          waves-optics, modern-physics, mixed-bag) + simulations{} keyed by
                          category slug — add a sim by pushing into the right array
  papers.js               collections[] for past-paper archives
lib/
  pendulum/model.mjs      ground-truth physics (accel/verletStep), verified against the exact
                          AGM period — see docs/pendulum-plan.md. Plain ESM so the same file
                          runs under Next and under plain Node (scripts/pendulum-verify.mjs)
  pendulum/usePendulumPhysics.js
                          wraps model.mjs in a wall-clock fixed-step accumulator; see the
                          background-continuity exception below
  pendulum/scene.js       pure canvas draw functions (pivot, string, bob, ruler, read-point
                          marker) shared verbatim by the bench and the magnifier — see below
  instruments/rng.js      session-seeded PRNG for instrument zero-offsets (sessionStorage-
                          backed seed, deterministic per key — stable across reloads)
  instruments/reading.js  quantize(value, resolution) — shared by every instrument
```

Routes are static/data-driven: `generateStaticParams` reads `data/*.js`, and `notFound()` fires for unknown slugs. There's no CMS or DB — content changes are code changes to the `data/` files.

## Design constraints (non-negotiable)

- **Palette**: near-black ink background (`--ink #060A0F`, panels `--panel #0B1219`) with a single light-blue accent (`--trace #4EC5FF`) used for interactive/live elements, highlights, and glow. Text is off-white (`--chalk`) or muted gray (`--muted`). No other hues — new UI must work within this two-tone system.
- **Type**: IBM Plex Sans for prose/headings, IBM Plex Mono for labels/eyebrows/data readouts/nav — the mono face is what signals "instrument panel" and should be used for anything numeric or tag-like, not for body copy.
- **Mobile-first, metered-data-first**: the audience is students in Bangladesh, often on phones with capped/slow data and modest batteries. Concretely this means:
  - Fonts self-hosted through `next/font` (never fetched from Google at request time).
  - Canvas animations pause off-screen (`IntersectionObserver`) and on tab-hide (`visibilitychange`) — see `DiffractionGrating.js`.
  - `FieldBackground` only runs when `(pointer: fine)` matches (skips touch devices) and is fully gated behind `prefers-reduced-motion`.
  - Respect `prefers-reduced-motion: reduce` everywhere motion is added (global CSS rule kills animations/transitions; simulations must check it themselves too, per `DiffractionGrating.js`'s `reduce` flag).
  - Keep interactions touch-friendly (`touch-action:none`, pointer events over mouse events) since canvases are dragged directly on phones.

## Building a simulation

Follow `components/DiffractionGrating.js` as the template:

1. Register it in `data/simulations.js` — add to the category's array with `slug`, `title`, `blurb`, `status`.
2. Client component (`'use client'`), a single `<canvas>` behind a `ref`, all drawing and the animation loop inside one `useEffect`.
3. Two-canvas trick for glow effects: draw fringes/lines to an off-screen canvas, then `drawImage` it back with `ctx.filter = 'blur(...)'` at decreasing radii — see the bloom pass in `DiffractionGrating.js`.
4. Handle resize by reading `getBoundingClientRect()`, capping `devicePixelRatio` at 2, and calling `ctx.setTransform(dpr,0,0,dpr,0,0)`.
5. Stop animating when off-screen (`IntersectionObserver`) or the tab is hidden — required, not optional, given the target devices.
6. Gate any continuous animation behind `prefers-reduced-motion`.
7. Clean up every listener and `cancelAnimationFrame` in the `useEffect` return.
8. Use pointer events (`pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`) rather than mouse events so drag works on touch.
9. Colors for anything glowing should key off `--trace` (`#4EC5FF`, rgba variants at low alpha), composited with `globalCompositeOperation = 'lighter'` for additive light effects — see the beam/fringe rendering.

### Measurement-driven experiments (instruments, timing)

Follow `components/PendulumLab.js` / `lib/pendulum/usePendulumPhysics.js` for anything where a student takes a *reading* of a running simulation, rather than just watching one. Two deliberate departures from the rules above:

- **The physics accumulator must not pause off-screen or backgrounded, even though rendering still does.** Split the two: drive physics on a `setInterval`-based wall-clock accumulator that catches up on real elapsed time (fixed `dt`, no dependence on frame rate — see `usePendulumPhysics.js`), and keep it running for the whole duration of a run regardless of visibility; keep the `requestAnimationFrame` render loop and its `IntersectionObserver` pause exactly as in rule 5. If the physics loop paused with the render loop, a student could background the tab and return to a frictionless, already-finished reading instead of actually timing the thing — that defeats the experiment.
- **Don't gate the simulation's own motion behind `prefers-reduced-motion`.** That rule is for decorative animation (idle "breathing", the cursor field); a pendulum's swing is the experiment's content, not decoration, so it always runs. Idle/decorative flourishes layered on top of an experiment should still be gated as normal.

Instruments (`components/instruments/*`) are generic and experiment-agnostic: each takes a `trueValue*` prop and applies its own resolution (`lib/instruments/reading.js`'s `quantize`) and, where the experiment calls for it, a fixed session zero-offset (`lib/instruments/rng.js`'s `sessionUniform`, seeded once via `sessionStorage` so it's stable across reloads but not hard-coded). Keep instruments blind to anything but the value they're handed — e.g. the stopwatch must never be given pendulum state, or its "reaction time" error stops being real.

Not every instrument is a digital readout. A physical one (the ruler) is drawn as an object on the bench at true scale — same pixels-per-metre conversion as the pendulum itself — which means its mm ticks are legitimately sub-pixel there; that's the point, not a bug. Reading it needs a magnifier.

### Shared draw functions at different scales (bench + magnifier)

`lib/pendulum/scene.js` exports one `drawScene(ctx, view, state)`, called by both `PendulumCanvas.js` (the full bench, `view.showGuides: true`) and `MagnifierPanel.js` (a small window centred on the read-point marker, higher `view.pxPerM`, no guides). World space is meters with the origin at a fixed point (the pendulum pivot); every object's position is stored in those world coordinates, and each caller supplies its own `{ originX, originY, pxPerM }` to project world → canvas pixels. When a simulation needs a "zoomed" or "magnified" view of the same scene, extend `drawScene` and pass a different `view` — never duplicate the drawing logic into a second component. A view's `pxPerM` is free to be chosen independently per panel (the bench's is constrained by fitting the whole apparatus in a compact canvas; a magnifier should instead be sized off its own panel dimensions and a target real-world field of view, not derived as a fixed multiple of the bench's).

Draggable bench objects (the ruler's body/rotate-handle, the read-point marker) live in refs owned by the parent (`PendulumLab.js`), not React state — nothing outside the canvases needs to react to them, so mutating `ref.current` from `PendulumCanvas`'s pointer handlers and reading it every rAF frame in both canvases avoids needless re-renders. Hit-test small/overlapping targets in priority order (marker before ruler-handle before ruler-body before bob) since a marker parked on top of the ruler must still win.

## Notes

- Dependency versions in `package.json` are floors (`^`), not pins — bump deliberately, don't assume the installed version is exactly what's declared.
- Content for simulations/papers pages is currently stubbed ("Nothing here yet...") — building out `simulations/[slug]/page.js` and `papers/[slug]/page.js` content is expected future work, not a bug.
