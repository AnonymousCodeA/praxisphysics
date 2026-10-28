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

function normalizeMath(text) {
  if (typeof text !== 'string') return text;
  let s = text;
  // common shorthands
  s = s.replace(/([A-Za-z])\^(\d)/g, '$1^{$2}');
  s = s.replace(/\b([0-9]+)e([+-]?[0-9]+)/gi, '$1\\times 10^{$2}');
  s = s.replace(/\b([0-9]+)x([+-]?[0-9]+)/gi, '$1\\times 10^{$2}');
  s = s.replace(/([A-Za-z0-9]+)_([A-Za-z0-9]+)/g, '$1_{$2}');
  s = s.replace(/([A-Za-z])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (m, base, sup) => {
    const map = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
    const num = sup.split('').map(c => map[c] || '').join('');
    return base + '^{' + num + '}';
  });
  return s;
}

export function M({ children }) {
  const math = typeof children === 'string' ? normalizeMath(children) : children;
  return <InlineMath math={math} renderError={rethrow} />;
}

// Wrapped so a long equation scrolls sideways on a phone instead of pushing
// the whole page wider than the screen. `id` makes the equation linkable.
export function Eq({ children, id }) {
  const math = typeof children === 'string' ? normalizeMath(children) : children;
  return (
    <div className="maths-display" id={id}>
      <BlockMath math={math} renderError={rethrow} />
    </div>
  );
}
