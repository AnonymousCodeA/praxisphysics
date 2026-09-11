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
  ExperimentWorkspace.js  reusable lab shell (generalized from the pendulum's original
                          workspace): tabs on narrow screens, a two-column split with
                          draggable divider on wide ones (see the min-width breakpoint in
                          globals.css), plus a part pill switch at the top of the left
                          column. Takes `experimentId`, a two-element `parts` array (problem
                          statement/formulae/hints per part — see data/pendulumGuide.js for
                          the shape), and a `Bench` component to render in the right panel.
                          Holds one useDataTable/usePlotConfig instance per part (both
                          always mounted, so both parts' data stay live and independently
                          saved regardless of which is on screen — only two parts are
                          supported, one named hook-call site each) and hands the active
                          part's down to DataTable/Plot; `Bench` is the one thing that
                          doesn't change with part. CSS classes keep their original
                          "pendulum-" prefix (shared presentational styles, not
                          experiment-specific — renaming them is a separate cosmetic change)
  ExperimentGuide.js      renders a part's problem statement/formulae/hints from the plain
                          data definition it's given — no method, just prompts; owns no
                          content of its own
  DataTable.js            student-defined table (add/delete row & column, rename headers,
                          free-typed cells) — controlled by the table state in
                          ExperimentWorkspace, not owned here
  Plot.js                 plot for the table's data: student picks x/y columns and types
                          axis min/max (no auto-scaling), drags a line's two endpoints
                          freely to set gradient/intercept (never a fit), saves up to four
                          lines in distinct colours — see the palette exception above
  PendulumExperiment.js   the pendulum as a consumer of ExperimentWorkspace rather than
                          being the shell itself: wires data/pendulumGuide.js's part
                          definitions and PendulumLab together and renders the shell.
                          Kept as its own 'use client' file (rather than passed as props
                          from app/simulations/pendulum/page.js, a Server Component) so the
                          guide content's JSX never has to cross the server/client boundary
  PendulumLab.js / PendulumCanvas.js / PendulumLens.js
                          canonical example of a measurement-driven experiment: physics
                          engine + drag/release, decoupled from the instrument panels.
                          PendulumLens is the press-and-hold magnifier — a floating
                          `position:fixed` overlay, not part of the bench canvas, so it
                          isn't clipped by the frame's `overflow:hidden`
  instruments/            generic digital instruments (Stopwatch; Photogate's trigger-log
                          panel) — each takes a true value and applies its own resolution/
                          error, reusable across experiments. Not every instrument is
                          digital: the ruler, protractor, and photogate itself are drawn as
                          objects on the bench (lib/pendulum/scene.js), toggled on/off from
                          the same instrument menu
data/
  simulations.js         categories[] (fixed 6: mechanics, thermodynamics, electromagnetism,
                          waves-optics, modern-physics, mixed-bag) + simulations{} keyed by
                          category slug — add a sim by pushing into the right array
  papers.js               collections[] for past-paper archives
  pendulumGuide.js        pendulumParts[] — the pendulum's own problem statement/formulae/
                          hints, in the shape ExperimentGuide/ExperimentWorkspace expect.
                          `body`/`credit` are JSX, since this is content, not serializable
                          data; that's fine as long as it's only ever imported from a
                          'use client' consumer (PendulumExperiment.js), never passed as a
                          prop across the Server/Client boundary
lib/
  pendulum/model.mjs      ground-truth physics (accel/verletStep), verified against the exact
                          AGM period — see docs/pendulum-plan.md. Plain ESM so the same file
                          runs under Next and under plain Node (scripts/pendulum-verify.mjs)
  pendulum/usePendulumPhysics.js
                          wraps model.mjs in a wall-clock fixed-step accumulator; see the
                          background-continuity exception below
  pendulum/scene.js       pure canvas draw functions (pivot, string, bob, ruler, protractor,
                          photogate) shared verbatim between the bench and its press-and-
                          hold lens — see below
  instruments/rng.js      session-seeded PRNG for instrument zero-offsets (sessionStorage-
                          backed seed, deterministic per key — stable across reloads)
  instruments/reading.js  quantize(value, resolution) — shared by every instrument
  experiment/useDataTable.js
                          a part's table state + localStorage persistence, keyed by
                          `praxis:<experimentId>-<partId>-table` — the single source of
                          truth shared by DataTable and Plot. ExperimentWorkspace holds one
                          instance per part rather than re-keying a single instance, so
                          `experimentId`/`partId` are read once and never expected to change
                          under a given instance
  experiment/usePlotConfig.js
                          a part's plot state (column choices, axis bounds, current/saved
                          lines) + localStorage persistence at
                          `praxis:<experimentId>-<partId>-plot`, plus parseBounds/lineStats
                          helpers. Column choices are keyed by role (`PLOT_ROLES`), not
                          hardcoded x/y fields, so an error-bar column is a one-line
                          addition later
```

Routes are static/data-driven: `generateStaticParams` reads `data/*.js`, and `notFound()` fires for unknown slugs. There's no CMS or DB — content changes are code changes to the `data/` files.

## Design constraints (non-negotiable)

- **Palette**: near-black ink background (`--ink #060A0F`, panels `--panel #0B1219`) with a single light-blue accent (`--trace #4EC5FF`) used for interactive/live elements, highlights, and glow. Text is off-white (`--chalk`) or muted gray (`--muted`). No other hues — new UI must work within this two-tone system.
  - **Exception — plot line colours**: `components/Plot.js` needs up to four saved student-drawn lines to stay visually distinct from each other *and* from the data points/axes, which a single accent can't do. It uses a small fixed palette (`LINE_COLORS` in `lib/experiment/usePlotConfig.js`) of four hues at the same saturation/lightness as `--trace`, reserved for saved/current lines only — points, axes, and everything else on the plot still key off `--trace` alone. This is a deliberate, scoped exception; don't extend the palette to other UI or collapse it back to monochrome.
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

Not every instrument is a digital readout. Physical ones (ruler, protractor) are drawn as objects on the bench at true scale — same pixels-per-metre conversion as the pendulum itself — which means their finest graduations are legitimately sub-pixel there; that's the point, not a bug. Reading them needs the press-and-hold lens. Their systematics are geometric, not a hidden random number added to a digital value: the ruler's printed "0" sits a session-seeded fraction of a mm in from its physical edge, and the protractor's printed degree scale sits at a session-seeded angular offset from its own centre mark/baseline (`lib/instruments/rng.js`'s `sessionUniform`, same as before, just consumed by the draw code instead of a component's readout). The photogate is physical too but doesn't need the lens — it's a coarse mechanical object (posts + beam), sized to be legible at bench scale directly; only its trigger *log* is a digital panel (`components/instruments/Photogate.js`).

All bench-object tools start off — `open` in `PendulumLab.js` is `{}`, so the bench is empty until the student brings something in from the instrument menu. Bringing a tool onto the bench (toggling it on) resets it to a fixed sensible pose near the pendulum, not wherever it was left before being toggled off — see the `toggleInstrument` callback.

### Shared draw functions at different scales (bench + lens)

`lib/pendulum/scene.js` exports one `drawScene(ctx, view, state)`. `PendulumCanvas.js` calls it every frame for the full bench (`view.showGuides: true`, its own `pxPerM`). The press-and-hold lens is **not** drawn inside the bench canvas — it's a separate small `<canvas>` in `PendulumLens.js`, positioned via `position:fixed` (escapes any ancestor's `overflow:hidden`, including the bench frame's) so it can extend past the bench's own edges — which matters, since a lens confined to the bench canvas gets clipped exactly where a student is likely to be reading, e.g. a protractor placed near the pivot at the top of the frame. `PendulumCanvas` never draws the lens itself; on a hold it only writes into two refs owned by `PendulumLab.js` — `sceneStateRef` (the same state object passed to its own `drawScene` call, refreshed every frame) and `lensRef` (`{active, clientX, clientY, worldX, worldY, pxPerM}`, viewport coordinates for CSS positioning plus the lens's own view transform) — and `PendulumLens` reads both every rAF frame and calls `drawScene` itself with that different view. Same function, two independent callers, zero duplicated drawing logic. `state.visible.{ruler,protractor,photogate}` gates whether each is drawn at all — check the same flags in `PendulumCanvas`'s hit-testing so an invisible tool can't still be grabbed. World space is meters with the origin at a fixed point (the pendulum pivot); every object's position is stored in those world coordinates, and each caller supplies its own `{ originX, originY, pxPerM }` to project world → canvas pixels. When a simulation needs a "zoomed" or "magnified" view of the same scene, extend `drawScene` and pass a different `view` — never duplicate the drawing logic into a second component/canvas.

Draggable bench objects (ruler, protractor, photogate) live in refs owned by the parent (`PendulumLab.js`), not React state — nothing outside the canvas needs to react to them, so mutating `ref.current` from `PendulumCanvas`'s pointer handlers and reading it every rAF frame avoids needless re-renders. Where a gesture is ambiguous (grabbing a ruler/protractor body could mean "move it" or "hold to read it"), disambiguate with a short delay + move-cancel threshold rather than a mode switch the student has to know about — see `HOLD_DELAY_MS`/`HOLD_MOVE_CANCEL_PX` in `PendulumCanvas.js`; the same `pendingBody`/`body` state machine handles both the ruler and the protractor by keying off which one's hit-test matched (`pendingKind`), rather than duplicating the gesture per object. The photogate doesn't rotate and has no fine scale, so it skips the hold gesture entirely — grabbing it is always a plain drag.

Physics that depends on a draggable bench object's position (the photogate's beam) reads it straight from that object's ref inside the fixed-step accumulator — see `photogateRef`/`photogateVisible` in `usePendulumPhysics.js`. The beam is treated as a fixed point at a given angle from the pivot; "the string crosses the beam" reduces to the same interpolated angle-crossing technique used for turning points and the old fixed-position photogate, just against that point's angle instead of a hardcoded one, and gated on the beam being within the string's current reach.

## Notes

- Dependency versions in `package.json` are floors (`^`), not pins — bump deliberately, don't assume the installed version is exactly what's declared.
- Content for simulations/papers pages is currently stubbed ("Nothing here yet...") — building out `simulations/[slug]/page.js` and `papers/[slug]/page.js` content is expected future work, not a bug.
