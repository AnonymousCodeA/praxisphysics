// Fig. 2.1 — errors adding in quadrature as a tip-to-tail vector sum along
// the edges of a cuboid. Inline (not an <img>) so it picks up currentColor,
// --trace and the guide's --font-italic. The colours in the style block are
// declared twice on purpose: the plain value is the fallback, the var() line
// wins where custom properties resolve — var() works only in a style block,
// not in SVG presentation attributes.
export default function QuadratureCuboid() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="40 78 395 292"
      role="img"
      aria-labelledby="qc-title qc-desc"
    >
      <title id="qc-title">Errors adding in quadrature as a tip-to-tail vector sum</title>
      <desc id="qc-desc">
        Three mutually perpendicular arrows for the scaled errors in L, P and T are laid tip to tail
        along the edges of a cuboid. The arrow closing the chain, from the start of the first to the
        tip of the last, is the error in Q, equal to the square root of the sum of the squares of the
        three.
      </desc>

      <style>{`
        .qc-edge   { fill: none; stroke: currentColor; stroke-opacity: .42; stroke-width: 1.6; }
        .qc-ghost  { fill: none; stroke: currentColor; stroke-opacity: .2;  stroke-width: 1.3; stroke-dasharray: 5 5; }

        .qc-vec    { fill: none; stroke: currentColor; stroke-opacity: .9; stroke-width: 2.2; }

        .qc-build  { fill: none;
                     stroke: #4EC5FF;
                     stroke: var(--trace, #4EC5FF);
                     stroke-opacity: .45; stroke-width: 1.5; stroke-dasharray: 4 4; }

        .qc-square { fill: none;
                     stroke: #4EC5FF;
                     stroke: var(--trace, #4EC5FF);
                     stroke-opacity: .6; stroke-width: 1.3; }

        .qc-main   { fill: none;
                     stroke: #4EC5FF;
                     stroke: var(--trace, #4EC5FF);
                     stroke-width: 2.8; }

        .qc-dot, .qc-head { stroke: none;
                     fill: #4EC5FF;
                     fill: var(--trace, #4EC5FF); }

        .qc-head-v { stroke: none; fill: currentColor; fill-opacity: .9; }

        .qc-radical { fill: none; stroke: currentColor; stroke-opacity: .85;
                      stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }

        .qc-label  { font-family: var(--font-italic, var(--font-sans, sans-serif));
                     font-style: italic; font-size: 15px;
                     fill: currentColor; fill-opacity: .9; }

        .qc-result { font-family: var(--font-italic, var(--font-sans, sans-serif));
                     font-style: italic; font-size: 17px;
                     fill: #4EC5FF;
                     fill: var(--trace, #4EC5FF); }

        .qc-eq     { font-family: var(--font-italic, var(--font-sans, sans-serif));
                     font-style: italic; font-size: 16px;
                     fill: currentColor; fill-opacity: .85; }

        .qc-edge, .qc-ghost, .qc-vec, .qc-build, .qc-square, .qc-main {
          stroke-linecap: round; stroke-linejoin: round;
        }
      `}</style>

      <defs>
        <marker
          id="qc-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path className="qc-head" d="M0,0 L10,5 L0,10 Z" />
        </marker>
        <marker
          id="qc-arrow-v"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5.5"
          markerHeight="5.5"
          orient="auto-start-reverse"
        >
          <path className="qc-head-v" d="M0,0 L10,5 L0,10 Z" />
        </marker>
      </defs>

      {/* the cuboid, held back so the vectors read as the subject */}
      <path className="qc-ghost" d="M90,300 L175,238" />
      <path className="qc-ghost" d="M175,238 L365,238" />
      <path className="qc-ghost" d="M175,238 L175,108" />
      <path className="qc-edge" d="M90,300 L280,300 L280,170 L90,170 Z" />
      <path className="qc-edge" d="M90,170 L175,108 L365,108 L280,170" />
      <path className="qc-edge" d="M280,300 L365,238 L365,108" />

      {/* after the first two hops: the top-face diagonal, at right angles to the third */}
      <path className="qc-build" d="M90,170 L365,108" />
      <path className="qc-square" d="M353.3,110.6 L353.3,122.6 L365,120" />

      {/* the three errors, tip to tail */}
      <path className="qc-vec" d="M90,170 L172.6,109.8" markerEnd="url(#qc-arrow-v)" />
      <path className="qc-vec" d="M175,108 L362,108" markerEnd="url(#qc-arrow-v)" />
      <path className="qc-vec" d="M365,108 L365,235" markerEnd="url(#qc-arrow-v)" />

      {/* the resultant */}
      <path className="qc-main" d="M90,170 L361,237" markerEnd="url(#qc-arrow)" />
      <circle className="qc-dot" cx="90" cy="170" r="4" />

      <text className="qc-label" x="124" y="131" textAnchor="end">
        cΔL
      </text>
      <text className="qc-label" x="268" y="100" textAnchor="middle">
        aΔP
      </text>
      <text className="qc-label" x="376" y="177" textAnchor="start">
        bΔT
      </text>
      <text className="qc-result" x="245" y="231" textAnchor="middle">
        ΔQ
      </text>

      {/* what the resultant is equal to */}
      <g transform="translate(119.5,345)">
        <text className="qc-result" x="0" y="0">
          ΔQ
        </text>
        <text className="qc-eq" x="28" y="0">
          =
        </text>
        <path className="qc-radical" d="M44,-7 L48.5,-2.5 L54,4 L61,-20 L231,-20" />
        <text className="qc-eq" x="65" y="0" textLength="164" lengthAdjust="spacingAndGlyphs">
          (aΔP)<tspan dy="-6" fontSize="11">2</tspan>
          <tspan dy="6"> + (bΔT)</tspan>
          <tspan dy="-6" fontSize="11">2</tspan>
          <tspan dy="6"> + (cΔL)</tspan>
          <tspan dy="-6" fontSize="11">2</tspan>
        </text>
      </g>
    </svg>
  );
}
