// Display-only rendering of the student's own table text: maths in column
// headers, scientific notation in cells. Nothing here changes what's stored
// — a header keeps its raw source (so it stays editable) and a cell keeps
// exactly what was typed (so parseFloat, the plot and the error bars read
// "1e2" as 100 as they always have).
//
// Headers get a deliberately tiny subset of TeX, written here rather than
// shipping KaTeX to the bench (the authored maths is KaTeX rendered on the
// server; student input can't be): _x and _{...}, ^x and ^{...}, and
// \alpha-style names for Greek letters. Nothing else — no fractions, no
// radicals, no nesting (a _ or ^ inside braces is literal text). Two
// departures from TeX, both for how students write units: an unbraced
// argument takes a signed run of digits, so s^-2 and x_12 work without
// braces, and a hyphen in a sub/superscript shows as a minus sign. As in
// TeX, one space after a Greek name is swallowed (\Delta t → Δt). An
// unknown \name is left as typed, space and all.
//
// One parse, three outputs: <LabelText> (markup for the table header),
// drawLabel (the plot's canvas axis titles) and foldLabel (plain text, for
// a <select> option, which can't hold markup).

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ',
  eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν',
  xi: 'ξ', omicron: 'ο', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ',
  // Both to U+03C6, the φ the table's symbol bar types.
  phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ',
  Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

// As in TeX, one space after a Greek name is swallowed, so \Delta t reads Δt.
const greekIn = (s) => s.replace(/\\([A-Za-z]+) ?/g, (m, name) => GREEK[name] ?? m);

// [{ text, pos: 'base' | 'sub' | 'sup' }], adjacent runs of one kind merged.
export function parseLabel(src) {
  const out = [];
  const push = (text, pos) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.pos === pos) last.text += text;
    else out.push({ text, pos });
  };
  // One base-level token at j: a known Greek name, or a single character.
  const token = (j) => {
    if (src[j] === '\\') {
      const name = /^[A-Za-z]+/.exec(src.slice(j + 1))?.[0];
      if (name && GREEK[name]) {
        const end = j + 1 + name.length;
        return [GREEK[name], src[end] === ' ' ? end + 1 : end];
      }
    }
    return [src[j], j + 1];
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if ((c === '_' || c === '^') && i + 1 < src.length) {
      let arg;
      let next;
      if (src[i + 1] === '{') {
        const close = src.indexOf('}', i + 2);
        const end = close === -1 ? src.length : close;
        arg = greekIn(src.slice(i + 2, end));
        next = close === -1 ? end : close + 1;
      } else {
        const digits = /^[+-]?\d+/.exec(src.slice(i + 1))?.[0];
        if (digits) [arg, next] = [digits, i + 1 + digits.length];
        else [arg, next] = token(i + 1);
      }
      push(arg.replace(/-/g, '−'), c === '_' ? 'sub' : 'sup');
      i = next;
    } else {
      const [t, next] = token(i);
      push(t, 'base');
      i = next;
    }
  }
  return out;
}

// True when the header renders differently from its source.
export function hasMarkup(src) {
  const segs = parseLabel(src);
  return !(segs.length === 0 || (segs.length === 1 && segs[0].pos === 'base' && segs[0].text === src));
}

export function LabelText({ src }) {
  return parseLabel(src).map((s, k) =>
    s.pos === 'sub' ? <sub key={k}>{s.text}</sub> : s.pos === 'sup' ? <sup key={k}>{s.text}</sup> : s.text
  );
}

// Unicode sub/superscript forms. A run folds only if every character has
// one; otherwise it's shown in source form (_{...}/^{...}) so a dropdown
// never pretends a subscript is base text.
const SUP = Object.fromEntries(
  [...'0123456789+−=()abcdefghijklmnoprstuvwxyz'].map((c, k) => [c, '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ'[k]])
);
const SUB = Object.fromEntries(
  [...'0123456789+−=()aehijklmnoprstuvx'].map((c, k) => [c, '₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ'[k]])
);

function foldRun(text, table, mark) {
  const chars = [...text];
  if (chars.every((c) => table[c])) return chars.map((c) => table[c]).join('');
  return `${mark}{${text}}`;
}

// The header as plain text, for a <select> option or an aria-label: T_0^2
// → T₀², \Delta t → Δ t, v_{max} → vₘₐₓ, T_{AB} → T_{AB}.
export function foldLabel(src) {
  return parseLabel(src)
    .map((s) => (s.pos === 'sub' ? foldRun(s.text, SUB, '_') : s.pos === 'sup' ? foldRun(s.text, SUP, '^') : s.text))
    .join('');
}

const SCRIPT_SCALE = 0.72;

// Draws a header centred on (x, y) (alphabetic baseline), in the given font,
// with sub/superscripts smaller and shifted — for canvas text, where there
// is no <sub>/<sup>. Works in a rotated frame (the y-axis title) unchanged.
export function drawLabel(ctx, src, x, y, sizePx, family) {
  const segs = parseLabel(src).map((s) => {
    const size = s.pos === 'base' ? sizePx : sizePx * SCRIPT_SCALE;
    ctx.font = `${size}px ${family}`;
    return { ...s, size, w: ctx.measureText(s.text).width };
  });
  let left = x - segs.reduce((sum, s) => sum + s.w, 0) / 2;
  ctx.textAlign = 'left';
  for (const s of segs) {
    ctx.font = `${s.size}px ${family}`;
    const dy = s.pos === 'sup' ? -0.4 * sizePx : s.pos === 'sub' ? 0.25 * sizePx : 0;
    ctx.fillText(s.text, left, y + dy);
    left += s.w;
  }
  ctx.font = `${sizePx}px ${family}`;
}

// A cell that is wholly a number with an exponent ("1e2", "-3.2E-4") →
// { mantissa, exp } for display as mantissa×10^exp, both as typed (a
// leading + dropped from the exponent). Anything else, null: it shows as is.
const SCI = /^\s*([+-]?(?:\d+\.?\d*|\.\d+))[eE]\+?(-?\d+)\s*$/;

export function sciParts(raw) {
  const m = SCI.exec(raw);
  return m ? { mantissa: m[1], exp: m[2].replace('-', '−') } : null;
}
