# Guide content

One file per section, each exporting `intro` (JSX or `null`) and `bodies`, an
object keyed by the subsection ids in `data/guide.js`. Those ids are the
deep-link contract with experiment hints; add or rename them there, not here.

```js
import { M, Eq } from '@/components/Maths';
import Fig from '@/components/Fig';

export const bodies = {
  'combining-uncertainties': (
    <>
      <p>
        When a result is a product or quotient, add the fractional uncertainties.
        For <M>{String.raw`g = 4\pi^2 L / T^2`}</M>:
      </p>
      <Eq>{String.raw`\frac{\Delta g}{g} = \frac{\Delta L}{L} + 2\,\frac{\Delta T}{T}`}</Eq>
      <Fig num="2.1" caption="Error bars on a single point.">
        <svg viewBox="0 0 400 200">…</svg>
      </Fig>
    </>
  ),
};
```

- **Maths**: `<M>` inline, `<Eq>` display. Write TeX inside `String.raw\`…\``.
  Invalid TeX fails the build on purpose.
- **Headings inside a subsection**: plain `<h3>` (and `<h4>` for a small label).
  Give an `<h3>` an `id` if a hint should be able to link to it.
- **Figures**: `<Fig num caption id>` around an inline SVG or `<img>`. Drawings
  use `currentColor` / `var(--trace)` so they sit in the site palette. A drawing
  too big to sit in the prose goes in `content/guide/figures/` as a component
  (`QuadratureCuboid.js`) imported by the section file — inline JSX, not an
  `.svg` behind an `<img>`, which couldn't inherit `currentColor` or the CSS
  variables. Prefix its class names and ids (`qc-…`): a `<style>` block inside
  an inline SVG applies to the whole page.
- **Tables**: wrap in `<div className="guide-table">` so they scroll sideways
  on a phone instead of widening the page.
- **Asides**: `<aside>` for a boxed note ("A common mistake…").
- **Cross-links**: `guideHref(slug, id)` from `data/guide.js`, never a
  hand-written `#anchor`, so a stale link fails the build.
