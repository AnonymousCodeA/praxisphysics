// A figure in guide prose: any drawing (inline SVG, an <img>, a small
// canvas) with a numbered caption beneath it. Named Fig rather than Figure
// to stay distinct from components/Figures.js's card drawings. `num` is
// given explicitly (e.g. "4.2") rather than auto-counted, so a figure's
// number doesn't shift when another is added above it and prose can refer
// to it by number; `id` makes it linkable.
export default function Fig({ num, caption, id, children }) {
  return (
    <figure className="guide-fig" id={id}>
      <div className="guide-fig-body">{children}</div>
      {(num || caption) && (
        <figcaption>
          {num && <span className="guide-fig-num">FIG. {num}</span>}
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
