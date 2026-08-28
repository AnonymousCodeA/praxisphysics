# Praxis

Physics Lab, Simulated. Free interactive physics for students.

## Running it

    npm install
    npm run dev

Then open http://localhost:3000

## Deploying

Push to GitHub, then import the repo at vercel.com. No configuration needed —
Vercel detects Next.js and builds it. Every push to `main` deploys.

## Layout

    app/
      layout.js              fonts, metadata, header/footer/background
      page.js                homepage
      globals.css            all styling, CSS variables at the top
      icon.svg               favicon (the gyroscope mark)
      opengraph-image.js     share card, generated at build time
      simulations/[slug]/    one page per category
      papers/[slug]/         one page per collection
    components/
      Header.js
      Footer.js
      FieldBackground.js     cursor charge field, warps the page grid
      DiffractionGrating.js  the hero simulation
      Figures.js             line drawings for the category cards
    data/
      simulations.js         categories, and simulations within them
      papers.js              paper collections

## Adding a simulation

1. Add it to the right category array in `data/simulations.js`.
2. Build the canvas as a client component, following `DiffractionGrating.js`:
   a ref to the canvas, all drawing inside a `useEffect`, and cancel the
   animation frame on cleanup.
3. Stop work when it is off-screen. `DiffractionGrating.js` uses an
   IntersectionObserver for this. On a phone with metered data and a small
   battery it matters.

## Notes

- Fonts are self-hosted through `next/font`, not fetched from Google at runtime.
- The background field runs only on devices with a real cursor, and never under
  `prefers-reduced-motion`.
- Dependency versions are floors, not pins. Bump them when you set up.
