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
data/
  simulations.js         categories[] (fixed 6: mechanics, thermodynamics, electromagnetism,
                          waves-optics, modern-physics, mixed-bag) + simulations{} keyed by
                          category slug — add a sim by pushing into the right array
  papers.js               collections[] for past-paper archives
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

## Notes

- Dependency versions in `package.json` are floors (`^`), not pins — bump deliberately, don't assume the installed version is exactly what's declared.
- Content for simulations/papers pages is currently stubbed ("Nothing here yet...") — building out `simulations/[slug]/page.js` and `papers/[slug]/page.js` content is expected future work, not a bug.
