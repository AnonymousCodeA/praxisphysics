// KaTeX maths for page content: <M> inline, <Eq> display. react-katex calls
// katex.renderToString during render, so on a Server Component page the
// maths is plain HTML by the time it ships — no maths JS on the client, only
// the stylesheet and whichever KaTeX fonts the glyphs on the page actually
// use. The stylesheet is imported here rather than in the root layout so it
// only goes out with pages that render maths.
//
// Write TeX with String.raw so backslashes survive and JSX braces don't
// collide with TeX braces: <M>{String.raw`\frac{\Delta g}{g}`}</M>.
//
// Bad TeX throws instead of rendering KaTeX's red error text: the guide is
// statically built, so a typo fails `next build` rather than shipping.
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

function rethrow(error) {
  throw error;
}

export function M({ children }) {
  return <InlineMath math={children} renderError={rethrow} />;
}

// Wrapped so a long equation scrolls sideways on a phone instead of pushing
// the whole page wider than the screen. `id` makes the equation linkable.
export function Eq({ children, id }) {
  return (
    <div className="maths-display" id={id}>
      <BlockMath math={children} renderError={rethrow} />
    </div>
  );
}
