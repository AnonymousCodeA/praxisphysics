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
  guide/                 long-form practical-skills guide: page.js is the contents,
                          [slug]/ one page per section (outline from data/guide.js, prose
                          from content/guide/<slug>.js). layout.js loads Plex Sans italic
                          for these routes only
components/
  Header.js / Footer.js
  Maths.js                KaTeX via react-katex: <M> inline, <Eq> display. Rendered to HTML
                          on the server (no maths JS shipped); imports katex.min.css itself
                          so only pages using it carry the stylesheet. Bad TeX throws, so a
                          typo fails `next build`
  Fig.js                  numbered, captioned figure for guide prose (distinct from
                          Figures.js's card drawings)
  FieldBackground.js     fixed-canvas cursor "charge field" that warps the page's grid lines
  DiffractionGrating.js  the hero simulation — canonical example for how a sim is built
  Figures.js             small inline-SVG line drawings used on the category cards
  ExperimentWorkspace.js  reusable lab shell (generalized from the pendulum's original
                          workspace): tabs on narrow screens, a two-column split with
                          draggable divider on wide ones (see the min-width breakpoint in
                          globals.css), plus a part pill switch at the top of the left
                          column. Takes `experimentId`, a two-element `parts` array (problem
                          statement/formulae/task/answer/hints/notes per part — see
                          data/pendulumGuide.js for the shape), and a `Bench` component to
                          render in the right panel. A part's `notes.table`/`notes.plot` (the
                          bench explaining its own controls) render directly above the table
                          and the plot, not with the problem. Also holds each part's
                          useCommittedAnswer, and a part's `startOver` clears its table,
                          plot and answer together (never the answer alone, never the
                          other part's), re-keying that part's guide/table/plot.
                          Layout: the experiment pages render it outside `.wrap` in a
                          `.bench-wrap` (full viewport width less a small gutter — the
                          1160px cap is for prose). On wide screens the bench column is
                          its own sticky, viewport-high panel that scrolls internally;
                          inside it (and under the header on narrow screens) the bench's
                          `.bench-pinned` region — the apparatus frame — stays put while
                          the bench's panels scroll beneath. The pin is sticky within the
                          bench, so it lets go where the bench ends and the plot scrolls
                          up into the whole column — nobody needs the apparatus while
                          plotting; the plot canvas is capped so the whole plot block
                          fits that column height. The workspace uses `overflow:clip`,
                          not `hidden`, which would break that sticky. Canvases are 4:3
                          from width but capped at 45vh (min 280px), the lab pane at 900px
                          content; both canvases already fit their drawing to any box.
                          The pages are `section.bench-page`: a compact title and no lede
                          (each part's problem statement is the opening context), so the
                          bench starts ~70px under the header and pins almost from load.
                          Nothing permanent sits between the apparatus and the readings:
                          the how-to note is a dismissible BenchHint, and stock/instrument
                          pickers are one-row trays that scroll sideways, never wrap.
                          Holds one useDataTable/usePlotConfig instance per part (both
                          always mounted, so both parts' data stay live and independently
                          saved regardless of which is on screen — only two parts are
                          supported, one named hook-call site each) and hands the active
                          part's down to DataTable/Plot; `Bench` is the one thing that
                          doesn't change with part. CSS classes keep their original
                          "pendulum-" prefix (shared presentational styles, not
                          experiment-specific — renaming them is a separate cosmetic change)
  ExperimentGuide.js      renders a part's problem statement/formulae/task/hints from the
                          plain data definition it's given — no method; owns no content of
                          its own. A `task` (pendulum Part A's A1–A3) says what to produce,
                          never how; `answer` adds an AnswerBox under it
  AnswerBox.js            commit-once value ± uncertainty answer; after commit, reveals the
                          simulation's true value and states flatly whether the interval
                          contains it — coverage only, never closeness or praise
  StartOver.js            quiet "Start Part A over" text button with an inline confirm
                          naming what goes; a rare destructive action, not a control
  BenchHint.js            a bench's how-to note as a strip under the apparatus until
                          dismissed (praxis:bench-hint-<id>), then only a "?" laid over
                          the pinned region's corner — no height once read
  DataTable.js            student-defined table (add/delete row & column, rename headers,
                          free-typed cells) — controlled by the table state in
                          ExperimentWorkspace, not owned here. A symbol bar above it (Δ θ λ
                          ω Ω µ ± ° ² ³) inserts at the caret of the last focused cell or
                          header, through the same setCell/renameColumn a keystroke uses;
                          buttons preventDefault on pointerdown so the cell (and a phone's
                          keyboard) keeps focus. Pure input convenience — still free text
  Plot.js                 plot for the table's data: student picks x/y columns and types
                          axis min/max (no auto-scaling), drags a line's two endpoints
                          freely to set gradient/intercept (never a fit), saves up to four
                          lines in distinct colours — see the palette exception above.
                          Each editable endpoint shows a dashed ring that is exactly its
                          grab radius (GRAB_R_FINE/GRAB_R_COARSE by `(pointer: coarse)`, one
                          value for hit-test and drawing); data points get no ring.
                          Optional x/y error bars (capped, point colour, drawn under the
                          lines, clipped at the axes), each from a table column or one
                          typed constant. Drawn exactly as given — the plot never
                          estimates, propagates or derives an uncertainty; a leading ± or +
                          is stripped (the symbol bar offers ±), and a blank, non-numeric
                          or negative value just means no bar for that point
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
                          digital: the vertical scale, angle plate, and photogate itself are drawn as
                          objects on the bench (lib/pendulum/scene.js), toggled on/off from
                          the same instrument menu (InstrumentMenu: one sideways-scrolling row).
                          A panel's description of its device is an InstrumentNote popover
                          beside the panel (fixed, portaled to <body>, so the panel's height
                          is the same open or closed), opened on first placement and from
                          a "?" in the panel header; dismissal is remembered per instrument,
                          not per experiment (praxis:instrument-<id>-seen). It never covers
                          the bench's .bench-pinned apparatus or leaves the screen, and
                          describes the device only, never the method (that's
                          content/guide/measurement.js)
  CircuitBench.js         the circuit-building bench: owns board state (placed components,
                          undo history, armed inventory item) and lib/circuits/
                          useCircuitPhysics's continuous solve loop; renders CircuitCanvas,
                          CircuitInventory, a capacitor panel with an explicit DISCHARGE
                          button per instance (see lib/circuits/model.mjs's persistent-charge
                          design) — deliberately status only (ON BOARD/IN STOCK), no voltage
                          readout, since that would let a student read a capacitor's charge
                          without ever placing a voltmeter — and a Meters panel: a range pill
                          switch per placed voltmeter/ammeter (see lib/circuits/scene.js's
                          VOLT_RANGES/AMP_RANGES), the visible "not hidden" control the spec
                          calls for. Takes `inventory`/`rows`/`cols` as props, plus an optional
                          `dataTable` (the active part's useDataTable() return value) forwarded
                          straight through to Oscilloscope — CircuitsExperiment.js is what
                          actually supplies all of these, since ExperimentWorkspace renders
                          `Bench` with just that one prop of its own
  CircuitsExperiment.js   the circuits experiment as a consumer of ExperimentWorkspace: binds
                          data/circuitsGuide.js's parts and data/circuitsInventory.js's shared
                          stock into a module-level `Bench` wrapper around CircuitBench (module-
                          level, not defined inside the component — a fresh function identity
                          every render would remount CircuitBench, and with it the board and
                          every capacitor's charge, on every re-render; ExperimentWorkspace's
                          own `dataTable` prop update doesn't have this problem, since it's a
                          plain prop change on the same stable `Bench` reference, and is simply
                          forwarded into CircuitBench). Same consumer-not-shell relationship,
                          and same JSX-content caveat, as PendulumExperiment.js
  CircuitCanvas.js        canvas + pointer mechanics for the board, mirroring
                          PendulumCanvas.js's conventions (refs for gesture state, rAF loop
                          paused off-screen, ResizeObserver, pointer events) — see the
                          "Circuit bench" note below for the placement gesture and why
                          nothing here is reduced-motion-gated
  CircuitInventory.js     one-row tray of compact tiles beside UNDO, scrolling sideways
                          (schematic symbol via lib/circuits/scene.js drawn at 64×34 and
                          shown smaller, label, remaining count) — tap to arm for
                          placement, disabled at zero stock
  Oscilloscope.js         two-channel scope panel rendered by CircuitBench when at least one
                          probe is placed: collapsed by default (OPEN SCOPE), expands into a
                          large in-page panel. Expanded, its header and screen are portaled
                          (`pinnedSlot`) into CircuitBench's pinned region in place of the
                          board's frame — a swap of what's pinned, not a hide — with the
                          screen capped at 45vh tall (square divisions kept), while the
                          HORIZONTAL/VERTICAL/TRIGGER controls stay in the panel beneath,
                          spread across its width on wide screens and stacked on narrow. Captures live via lib/circuits/useOscilloscope.js
                          (its own slow interval, independent of useCircuitPhysics's real-time
                          loop) and draws the trace itself here. Mirrors the active part's
                          `dataTable` (see CircuitBench.js) into a DATA TABLE section below the
                          panel when one exists — the same live state DataTable already
                          renders elsewhere in ExperimentWorkspace, not a copy of it — so
                          nothing appears on the circuit-builder sandbox, which has none
data/
  simulations.js         categories[] (fixed 6: mechanics, thermodynamics, electromagnetism,
                          waves-optics, modern-physics, mixed-bag) + simulations{} keyed by
                          category slug — add a sim by pushing into the right array
  papers.js               collections[] for past-paper archives
  guide.js                guideSections[] — the guide's four sections and every subsection's
                          anchor id, plus guideHref(slug, id), which throws on an unknown id.
                          These ids are the deep-link contract experiment hints point at —
                          don't rename one without updating its links. Kept free of prose so
                          a client component can import guideHref cheaply
content/guide/            the guide's prose, one file per section: `intro` + `bodies` keyed by
                          data/guide.js's subsection ids (missing key → "Not written yet."
                          stub). Authoring conventions in content/guide/README.md
  pendulumGuide.js        pendulumParts[] — the pendulum's own problem statement/formulae/
                          hints, in the shape ExperimentGuide/ExperimentWorkspace expect.
                          `body`/`credit` are JSX, since this is content, not serializable
                          data; that's fine as long as it's only ever imported from a
                          'use client' consumer (PendulumExperiment.js), never passed as a
                          prop across the Server/Client boundary
  circuitsGuide.js        circuitsParts[] — same shape and same JSX-content caveat as
                          pendulumGuide.js, imported by CircuitsExperiment.js. Part A/B share
                          one circuit built up across both — see the "Circuit bench" note
                          below on persistence
  circuitsInventory.js    circuitsInventory[] — the one stock list both parts draw from (a
                          student modifies their Part A circuit rather than rebuilding for
                          Part B), in the shape CircuitBench/expandInventory expect
lib/
  pendulum/model.mjs      ground-truth physics (accel/verletStep), verified against the exact
                          AGM period — see docs/pendulum-plan.md. Plain ESM so the same file
                          runs under Next and under plain Node (scripts/pendulum-verify.mjs)
  pendulum/usePendulumPhysics.js
                          wraps model.mjs in a wall-clock fixed-step accumulator; see the
                          background-continuity exception below
  pendulum/scene.js       pure canvas draw functions (pivot, string, bob, vertical scale, angle plate,
                          photogate) shared verbatim between the bench and its press-and-
                          hold lens — see below
  instruments/rng.js      session-seeded PRNG for instrument zero-offsets (sessionStorage-
                          backed seed, deterministic per key — stable across reloads)
  instruments/reading.js  quantize(value, resolution) — shared by every instrument
  circuits/model.mjs      DC circuit solver via modified nodal analysis — see the file's own
                          header comment and scripts/circuits-verify.mjs for the physics this
                          is verified against (RC discharge, charge sharing, charge cycling)
                          before it's the basis of anything drawn. Also a voltage-dependent
                          capacitor (capacitanceFn instead of a fixed value) and a thermistor
                          (thermistorResistance, the B-parameter equation) — see
                          scripts/circuits-nonlinear-verify.mjs, and the note below on why a
                          nonlinear capacitor needs its own charge-integral machinery
  circuits/mna.mjs        the dense linear solver model.mjs's stamps feed into
  circuits/grid.js        pure grid geometry for the circuit bench — node ids ARE the
                          solver's node ids (no translation layer), edges are the
                          (row,col)-adjacent pairs a two-terminal component can occupy
  circuits/scene.js       pure canvas draw functions, one per component symbol, shared
                          between the real board and its ghost preview — same idea as
                          lib/pendulum/scene.js
  circuits/useCircuitPhysics.js
                          drives model.mjs continuously via a wall-clock fixed-step
                          accumulator, same reasoning as usePendulumPhysics.js: a capacitor
                          mid-charge is a real-time transient, so this keeps running
                          off-screen/backgrounded while CircuitCanvas's render loop pauses
  experiment/useDataTable.js
                          a part's table state + localStorage persistence, keyed by
                          `praxis:<experimentId>-<partId>-table` — the single source of
                          truth shared by DataTable and Plot. ExperimentWorkspace holds one
                          instance per part rather than re-keying a single instance, so
                          `experimentId`/`partId` are read once and never expected to change
                          under a given instance
  experiment/useCommittedAnswer.js
                          a part's committed answer at `praxis:<experimentId>-<partId>-answer`.
                          Final once committed: a reload restores it and its reveal rather
                          than offering a fresh attempt; `clear` is called only by the
                          part's start-over, alongside the table and plot resets
  experiment/usePlotConfig.js
                          a part's plot state (column choices, axis bounds, current/saved
                          lines) + localStorage persistence at
                          `praxis:<experimentId>-<partId>-plot`, plus parseBounds/lineStats
                          helpers. Column choices are keyed by role (`PLOT_ROLES`), not
                          hardcoded x/y fields; the `error: true` roles (xErr/yErr) also
                          accept ERR_CONSTANT, with the typed value in `errConst`. A stored
                          config from before a role existed is merged over the defaults on
                          load (withDefaults), not discarded
```

Routes are static/data-driven: `generateStaticParams` reads `data/*.js`, and `notFound()` fires for unknown slugs. There's no CMS or DB — content changes are code changes to the `data/` files.

## Design constraints (non-negotiable)

- **Palette**: near-black ink background (`--ink #060A0F`, panels `--panel #0B1219`) with a single light-blue accent (`--trace #4EC5FF`) used for interactive/live elements, highlights, and glow. Text is off-white (`--chalk`) or muted gray (`--muted`). No other hues — new UI must work within this two-tone system.
  - **Exception — plot line colours**: `components/Plot.js` needs up to four saved student-drawn lines to stay visually distinct from each other *and* from the data points/axes, which a single accent can't do. It uses a small fixed palette (`LINE_COLORS` in `lib/experiment/usePlotConfig.js`) of four hues at the same saturation/lightness as `--trace`, reserved for saved/current lines only — points, axes, and everything else on the plot still key off `--trace` alone. This is a deliberate, scoped exception; don't extend the palette to other UI or collapse it back to monochrome.
  - **Exception — oscilloscope screen**: `components/Oscilloscope.js`'s scope screen is green phosphor on black, not `--trace` on `--ink` — a scope is green because phosphor is green, and every real one looks like this. Colors (`SCOPE_BG`/`SCOPE_GRATICULE`/`SCOPE_CH1_COLOR`/`SCOPE_CH2_COLOR`) live in `lib/circuits/oscilloscopeControls.js`. The green also appears once outside the canvas itself: the `OSCILLOSCOPE` nameplate (`.circuit-scope-nameplate` in `globals.css`, hardcoded to match `SCOPE_CH1_COLOR` since CSS can't import the JS constant) — an instrument's case label reads as part of the instrument, not as UI chrome. Everything else in the scope's own panel (section headings, buttons, sliders, control labels) still keys off the normal palette. Channel 2 is a second, distinct hue (amber) rather than a second shade of green, so the two traces stay distinguishable at a glance. Same deliberate-and-scoped rule as the plot line colours above — don't spread the green any further than the screen and its nameplate.
- **Type**: IBM Plex Sans for prose/headings, IBM Plex Mono for labels/eyebrows/data readouts/nav — the mono face is what signals "instrument panel" and should be used for anything numeric or tag-like, not for body copy.
  - **Guide pages** (`.guide`/`.prose` in `globals.css`) are for reading rather than operating an instrument, so their typography differs in scale and rhythm instead of using a new typeface: larger body text, longer leading, a ~68ch measure, and a solid background so the grid and cursor field don't run behind the text. The one addition is a real Plex Sans italic, loaded only on `/guide` routes.
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

Not every instrument is a digital readout. Physical ones (vertical scale, angle plate) are drawn as objects on the bench at true scale — same pixels-per-metre conversion as the pendulum itself — which means their finest graduations are legitimately sub-pixel there; that's the point, not a bug. Reading them needs the press-and-hold lens. Their systematics are geometric, not a hidden random number added to a digital value: the vertical scale's printed "0" sits a session-seeded 1–2 mm below its physical top (which is level with the pivot), and the angle plate's printed degree scale sits at a session-seeded angular offset from true vertical (`lib/instruments/rng.js`'s `sessionUniform`/`sessionRandom`, consumed by the draw code instead of a component's readout) — 0.3°–1° with a random sign, so it's never negligible and a student reading the string at rest through the lens can catch it not sitting on 0°. The photogate is physical too but doesn't need the lens — it's a coarse mechanical object (posts + beam), sized to be legible at bench scale directly; only its trigger *log* is a digital panel (`components/instruments/Photogate.js`).

All bench-object tools start off — `open` in `PendulumLab.js` is `{}`, so the bench is empty until the student brings something in from the instrument menu. Bringing the photogate onto the bench (toggling it on) resets it to a fixed sensible pose near the pendulum, not wherever it was left before being toggled off — see the `toggleInstrument` callback.

The angle plate and vertical scale are the exception to all of that positioning: they're part of the apparatus, and the student toggles whether each is mounted, never where it sits — neither has a ref, a pose, a handle, or anything to drag. The angle plate follows the APhO 2023 apparatus, a large semicircular scale mounted behind the pendulum and centred on the pivot (`ANGLE_PLATE_RADIUS_M`, sized so its graduated arc crosses the string above the bob at every length). It reads the displacement angle directly (0° straight down, 90° at the horizontal each side, 1°/5°/10° graduations, numerals every 10°), with no numeric readout anywhere. The vertical scale is fixed beside the hanging string (`SCALE_EDGE_X_M`, graduated edge facing the string just clear of the bob at rest), physical top level with the pivot, running down past the bob's lowest point at full length; 1/5/10 mm graduations, centimetre numerals, and "cm" printed after every tenth numeral so the unit is in view wherever the lens is. Where a length runs to — string end or bob centre — is left entirely to the student. Both are drawn before the pendulum so the string swings in front (the scale in front of the plate, hiding the plate's ~8°–14° graduations on the right; the left half stays fully readable), and the stretch of string over either is redrawn as dark thread (`drawStringOverBackdrops`) since the light bench string would vanish against them. Pressing on either only ever raises the lens: moving before the hold delay cancels rather than dragging. Because the scale sits inside the bob's generous touch margin, `onDown` checks a press directly on the bob first, then the scale, and only then the bob's margin — so holding the scale at the bob's height reads it instead of grabbing the bob.

### Shared draw functions at different scales (bench + lens)

`lib/pendulum/scene.js` exports one `drawScene(ctx, view, state)`. `PendulumCanvas.js` calls it every frame for the full bench (`view.showGuides: true`, its own `pxPerM`). The press-and-hold lens is **not** drawn inside the bench canvas — it's a separate small `<canvas>` in `PendulumLens.js`, positioned via `position:fixed` (escapes any ancestor's `overflow:hidden`, including the bench frame's) so it can extend past the bench's own edges — which matters, since a lens confined to the bench canvas gets clipped exactly where a student is likely to be reading, e.g. the angle plate's scale near the pivot at the top of the frame. `PendulumCanvas` never draws the lens itself; on a hold it only writes into two refs owned by `PendulumLab.js` — `sceneStateRef` (the same state object passed to its own `drawScene` call, refreshed every frame) and `lensRef` (`{active, clientX, clientY, worldX, worldY, pxPerM}`, viewport coordinates for CSS positioning plus the lens's own view transform) — and `PendulumLens` reads both every rAF frame and calls `drawScene` itself with that different view. Same function, two independent callers, zero duplicated drawing logic. `state.visible.{scale,anglePlate,photogate}` gates whether each is drawn at all — check the same flags in `PendulumCanvas`'s hit-testing so an invisible tool can't still be grabbed. The lens paints its own background *under* the scene afterwards (`destination-over`), because `drawScene` starts with a `clearRect`; a fill painted first is wiped, and the full-scale bench then shows through every gap. World space is meters with the origin at a fixed point (the pendulum pivot); every object's position is stored in those world coordinates, and each caller supplies its own `{ originX, originY, pxPerM }` to project world → canvas pixels. When a simulation needs a "zoomed" or "magnified" view of the same scene, extend `drawScene` and pass a different `view` — never duplicate the drawing logic into a second component/canvas.

The draggable bench object (the photogate) lives in a ref owned by the parent (`PendulumLab.js`), not React state — nothing outside the canvas needs to react to it, so mutating `ref.current` from `PendulumCanvas`'s pointer handlers and reading it every rAF frame avoids needless re-renders. Reading a fixed scale is a press-and-hold (`HOLD_DELAY_MS`/`HOLD_MOVE_CANCEL_PX` in `PendulumCanvas.js`, one `pendingHold` state for both the scale and the plate) rather than a mode switch the student has to know about. The photogate has no fine scale, so it skips the hold gesture entirely — grabbing it is always a plain drag.

Physics that depends on a draggable bench object's position (the photogate's beam) reads it straight from that object's ref inside the fixed-step accumulator — see `photogateRef`/`photogateVisible` in `usePendulumPhysics.js`. The beam is treated as a fixed point at a given angle from the pivot; "the string crosses the beam" reduces to the same interpolated angle-crossing technique used for turning points and the old fixed-position photogate, just against that point's angle instead of a hardcoded one, and gated on the beam being within the string's current reach.

### Circuit bench (grid, placement, persistent charge)

`components/CircuitBench.js` / `CircuitCanvas.js`, on top of `lib/circuits/model.mjs`. Grid intersections are the solver's nodes (a node id here — `"row,col"` — literally *is* the id `stepCircuit` sees, no translation layer); every two-terminal component occupies the edge between two adjacent nodes, and its orientation (horizontal/vertical) falls straight out of which edge it's on, so there's no separate rotate state. `lib/circuits/grid.js` is the pure geometry (`buildEdges`, `nearestEdge`); `lib/circuits/scene.js` is the pure per-symbol draw functions, shared verbatim between a placed component and its ghost preview.

- **Placement is arm-then-place, not drag-and-drop.** Tap an inventory card to arm it; a ghost then tracks the pointer to the nearest edge (dimmed/red if that edge is already occupied). Mouse users get this for free from real hover (`pointermove` fires without a button down), so a single click after hovering commits. Touch has no hover, so the same rule — *"does this release land on the edge that was already ghosted before this gesture began"* — degrades gracefully into a two-tap flow: the first tap has nothing to match against yet (just previews), the second tap on the same edge matches and commits. `CircuitCanvas` implements this with one rule (`wasGhostEdge` captured on `pointerdown`, compared on `pointerup`), not two separate code paths for mouse vs. touch.
- **Every inventory slot is a numbered physical instance** (`expandInventory` in `CircuitBench.js`), not a fungible count — two capacitors of the same value are two independent objects with independent charge histories. This is what makes "remove a charged capacitor, it keeps its charge in stock, place it back down elsewhere" fall out for free: the solver's persistent per-id state (see `model.mjs`) simply doesn't get touched by whether an id currently appears in the elements array a given tick, and instance identity is stable across arm/place/remove/undo.
- **Switch toggle, meter range, and capacitor discharge are experiment operations, not build actions** — none of them push an undo entry, only place/remove do. A placed switch is disambiguated with the same hold-delay/move-cancel pattern as the pendulum bench's press-and-hold (`HOLD_DELAY_MS`/`HOLD_MOVE_CANCEL_PX` in `CircuitCanvas.js`): a quick tap toggles it, a press-and-hold removes it — since a plain tap on any other placed component already means "remove." A meter's range lives in the placed component's own state (`comp.range`) exactly like a switch's `closed`, and resets to that type's default range on every fresh placement rather than persisting per-instance — switches here already reset on placement rather than remembering their old position, so range follows the same convention for consistency.
- **Solving is continuous**, via `useCircuitPhysics` — same wall-clock fixed-step accumulator as `usePendulumPhysics.js`, and for the same reason: a capacitor mid-charge is a real-time transient, so it must keep running off-screen/backgrounded while `CircuitCanvas`'s `requestAnimationFrame` render loop pauses normally. Nothing here is gated behind `prefers-reduced-motion` either, for the same reason the pendulum's swing isn't: a live meter reading and the placement ghost are the experiment's content and direct manipulation, not decorative animation.
- **The ammeter goes in series and is modeled as its own named shunt resistance**, not an ideal branch-current unknown — the solver is plain nodal analysis (see `model.mjs`'s header), so an ammeter is stamped exactly like a resistor of `el.shuntOhms`, and its reading is recovered afterward as ΔV/shuntOhms (`ammeterReading`). `shuntOhms` is a real property of the inventory item/placed component (e.g. `data/circuitsInventory.js`), not a buried constant — the point being a real ammeter's small non-zero resistance is a systematic error a later experiment might want to use deliberately, not just hide. Contrast the voltmeter (`type: 'meter'`), which taps two nodes without joining them (infinite impedance, no stamp at all) since it sits in parallel, not in series.
- **Voltmeter/ammeter readings are ranged, not auto-scaled** (`VOLT_RANGES`/`AMP_RANGES` in `lib/circuits/scene.js`): the student picks mV/V or µA/mA (Meters panel in `CircuitBench.js`), and the reading always displays in that range's own unit at that range's own fixed resolution — never a unit picked to make the number look nice. A value beyond the selected range's max reads `OL` (drawn in the danger color, not the reading color) instead of a number, exactly like a real meter that needs re-ranging. This doubles as the noise floor: every range's resolution (1e-4 V finest, 1e-7 A finest) sits five-plus orders of magnitude above the solver's GMIN leak (~1e-13 A for a node at a few volts — see `GMIN` in `model.mjs`), so leakage always rounds to a clean zero rather than a meaningless tiny decimal — no separate floor constant needed once ranges exist.
- **The board has no ground/earth component.** `stepCircuit` needs *some* reference node, so `CircuitBench` always passes a fixed sentinel (`'__ground__'`) that's never a real grid intersection — it just picks up model.mjs's GMIN leak like every other node. Only voltage *differences* (what a voltmeter reads) are physical, so which node this constant names is arbitrary and invisible to the student.
- **A meter on a section with no path to any source reads a dash, not a number.** GMIN keeps a fully isolated node's voltage numerically well-defined (that's the whole point of GMIN — see above), but that value is a numerical accident of an arbitrary regularization, not a measurement: two open switches isolating a voltmeter-tapped section from both the source and the rest of the circuit can read a confident-looking but meaningless value (e.g. 13.92 V from a 6 V source). `stepCircuit` runs a *second*, separate union-find (`connUf` in `model.mjs`, distinct from the one used for MNA node-identity reduction) that also unions across resistors/capacitors/vsources/the ammeter's own shunt — real conducting paths, just not same-potential ones — and returns `floatingNodes`: every node whose group contains no voltage-source terminal. `CircuitCanvas` checks a placed voltmeter/ammeter's two nodes against it and draws `---` (muted, not the danger color — this isn't an out-of-range error) instead of computing a reading. Deliberately a *second* union-find rather than extending the first: merging a resistor's two ends for MNA purposes would be wrong (they're genuinely at different potentials), but excluding resistors/capacitors from the *reachability* check would false-positive on any ordinary series circuit whose junctions aren't independently wire-tied to a source (see the regression case in `scripts/circuits-verify.mjs`'s Test 5).
- **The board persists across a part switch — it's not per-part state.** `CircuitsExperiment.js` renders one `CircuitBench` as `ExperimentWorkspace`'s `Bench`, and `Bench` is never re-mounted when the part pill switches (see `ExperimentWorkspace.js`: `<Bench dataTable={dataTable} />` sits outside the per-part table/plot instances — `dataTable` itself changes with the part, but that's a prop update on the same stable `Bench` reference, not a remount). Placed components and every capacitor's charge — real React/solver state, not persisted to storage — survive a part switch the same way they survive a tab switch on mobile. This is deliberate for the circuits experiment specifically: Part B's whole framing is bringing back the capacitor characterized in Part A, still charged, without rebuilding.
- **A voltage-dependent capacitor's charge is the integral of C(U), never capacitanceFn(U)*U.** `stepCircuit` still uses the same trapezoidal-with-backward-Euler-restart companion model as a fixed capacitor, linearized each step around the previous step's own voltage (`vPrev`) — "evaluate C at the current voltage" means at that linearization point, re-read fresh every step, not cached from further back. What's persisted in `state.capacitorCharge` is real charge either way, so recovering `vPrev` from it means inverting the integral (`invertCharge`, safeguarded Newton/bisection, using `capacitanceFn` itself as the derivative) — there's no shortcut through "divide by C" once C isn't constant. A thermistor (`thermistorResistance`, the standard B-parameter equation) is the easy version of the same idea: no history at all, just re-evaluate R from `el.temperature` every step, exactly like a resistor. Neither is wired into the bench/inventory yet — verified independently in `scripts/circuits-nonlinear-verify.mjs` by recovering C(U) from simulated meter-style samples via I/(dU/dt), the same method a student would use, specifically to know an experiment built on this is soluble (and where a fixed sampling interval stops being able to resolve it — near the rail a capacitor charges toward, not near where C(U) itself peaks, a real and easy-to-get-backwards distinction) before any UI exists.

## Notes

- Dependency versions in `package.json` are floors (`^`), not pins — bump deliberately, don't assume the installed version is exactly what's declared.
- Content for simulations/papers pages is currently stubbed ("Nothing here yet...") — building out `simulations/[slug]/page.js` and `papers/[slug]/page.js` content is expected future work, not a bug.
