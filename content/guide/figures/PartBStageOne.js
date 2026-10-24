// Fig. 5.1 — Stage one of the Part B worked example
// (content/guide/worked-examples.js, 'two-stage-fits'):
// T against x for set 1, with the second pass's best, steepest and shallowest
// lines through the five points up to 22° (T = 1.42015 + 0.3635x, 1.41970 +
// 0.3998x, 1.42075 + 0.3271x); 26–35° drawn hollow.
//
// Every coordinate here is a reading or a line from
// scripts/worked-example-partb.mjs, like the tables in the prose. Don't
// hand-edit it: if the data or the analysis change, regenerate the figure
// from the script's output. Converted from docs/partb-stage-one.svg with the
// placeholders mapped to --trace and --font-mono, as in QuadratureCuboid;
// colours sit in the style block (plain value first, var() second) because
// var() doesn't resolve in SVG presentation attributes. currentColor is set
// to --chalk so the data reads white against the trace-blue lines (the
// figure box itself sets --trace). Classes are prefixed pbf- because an
// inline SVG's <style> applies to the whole page.
export default function PartBStageOne() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 580 390"
      role="img"
      aria-labelledby="s1t s1d"
      style={{ color: 'var(--chalk)' }}
    >
      <title id="s1t">Stage one: T against sin squared of half the release angle</title>
      <desc id="s1d">Eight measured periods plotted against x. A best line and the steepest and shallowest lines that still pass through every error bar are drawn through the five points below 22 degrees; the three points above it lie above the line, showing the curvature that makes them unusable.</desc>

      <style>{`
        .pbf-grid   { stroke: currentColor; stroke-opacity: .13; stroke-width: 1; }
        .pbf-frame  { fill: none; stroke: currentColor; stroke-opacity: .34; stroke-width: 1.2; }
        .pbf-tick   { font-family: var(--font-mono, "IBM Plex Mono"), ui-monospace, monospace;
                     font-size: 11px; fill: currentColor; fill-opacity: .72; }
        .pbf-axis   { font-family: var(--font-mono, "IBM Plex Mono"), ui-monospace, monospace;
                     font-size: 12px; fill: currentColor; fill-opacity: .85; }
        .pbf-key    { font-family: var(--font-mono, "IBM Plex Mono"), ui-monospace, monospace;
                     font-size: 11px; fill: currentColor; fill-opacity: .8; }

        .pbf-bar    { stroke: currentColor; stroke-opacity: .6; stroke-width: 1.1; }
        .pbf-dot    { fill: currentColor; fill-opacity: .95; stroke: none; }
        .pbf-out    { stroke-opacity: .3; stroke-dasharray: 2 2; }
        .pbf-dot-out{ fill: none; stroke: currentColor; stroke-opacity: .5; stroke-width: 1.3; }

        .pbf-best   { stroke: #4EC5FF; stroke: var(--trace, #4EC5FF);
                     stroke-width: 2.2; fill: none; }
        .pbf-edge   { stroke: #4EC5FF; stroke: var(--trace, #4EC5FF);
                     stroke-opacity: .55; stroke-width: 1.4; stroke-dasharray: 6 4; fill: none; }
      `}</style>

      <line className="pbf-grid" x1="76" y1="22" x2="76" y2="332" />
      <text className="pbf-tick" x="76" y="352" textAnchor="middle">0.00</text>
      <line className="pbf-grid" x1="174.37" y1="22" x2="174.37" y2="332" />
      <text className="pbf-tick" x="174.37" y="352" textAnchor="middle">0.02</text>
      <line className="pbf-grid" x1="272.73" y1="22" x2="272.73" y2="332" />
      <text className="pbf-tick" x="272.73" y="352" textAnchor="middle">0.04</text>
      <line className="pbf-grid" x1="371.1" y1="22" x2="371.1" y2="332" />
      <text className="pbf-tick" x="371.1" y="352" textAnchor="middle">0.06</text>
      <line className="pbf-grid" x1="469.47" y1="22" x2="469.47" y2="332" />
      <text className="pbf-tick" x="469.47" y="352" textAnchor="middle">0.08</text>
      <line className="pbf-grid" x1="76" y1="316.1" x2="558" y2="316.1" />
      <text className="pbf-tick" x="66" y="320.1" textAnchor="end">1.42</text>
      <line className="pbf-grid" x1="76" y1="236.62" x2="558" y2="236.62" />
      <text className="pbf-tick" x="66" y="240.62" textAnchor="end">1.43</text>
      <line className="pbf-grid" x1="76" y1="157.13" x2="558" y2="157.13" />
      <text className="pbf-tick" x="66" y="161.13" textAnchor="end">1.44</text>
      <line className="pbf-grid" x1="76" y1="77.64" x2="558" y2="77.64" />
      <text className="pbf-tick" x="66" y="81.64" textAnchor="end">1.45</text>
      <rect className="pbf-frame" x="76" y="22" width="482" height="310" />
      <text className="pbf-axis" x="317" y="374" textAnchor="middle">x = sin²(φ₀/2)</text>
      <text className="pbf-axis" x="18" y="177" textAnchor="middle" transform="rotate(-90 18 177)">T (s)</text>
      <line className="pbf-edge" x1="76" y1="310.14" x2="558" y2="55.34" />
      <line className="pbf-edge" x1="76" y1="318.49" x2="534.87" y2="22" />
      <line className="pbf-best" x1="76" y1="314.91" x2="558" y2="31.75" />
      <line className="pbf-bar" x1="91.74" y1="303.38" x2="96.95" y2="303.38" />
      <line className="pbf-bar" x1="91.74" y1="300.38" x2="91.74" y2="306.38" />
      <line className="pbf-bar" x1="96.95" y1="300.38" x2="96.95" y2="306.38" />
      <line className="pbf-bar" x1="94.35" y1="301.79" x2="94.35" y2="304.97" />
      <line className="pbf-bar" x1="91.35" y1="301.79" x2="97.35" y2="301.79" />
      <line className="pbf-bar" x1="91.35" y1="304.97" x2="97.35" y2="304.97" />
      <circle className="pbf-dot" cx="94.35" cy="303.38" r="3.4" />
      <line className="pbf-bar" x1="109.64" y1="293.85" x2="117.12" y2="293.85" />
      <line className="pbf-bar" x1="109.64" y1="290.85" x2="109.64" y2="296.85" />
      <line className="pbf-bar" x1="117.12" y1="290.85" x2="117.12" y2="296.85" />
      <line className="pbf-bar" x1="113.38" y1="292.26" x2="113.38" y2="295.44" />
      <line className="pbf-bar" x1="110.38" y1="292.26" x2="116.38" y2="292.26" />
      <line className="pbf-bar" x1="110.38" y1="295.44" x2="116.38" y2="295.44" />
      <circle className="pbf-dot" cx="113.38" cy="293.85" r="3.4" />
      <line className="pbf-bar" x1="143.82" y1="271.59" x2="154.25" y2="271.59" />
      <line className="pbf-bar" x1="143.82" y1="268.59" x2="143.82" y2="274.59" />
      <line className="pbf-bar" x1="154.25" y1="268.59" x2="154.25" y2="274.59" />
      <line className="pbf-bar" x1="149.04" y1="270" x2="149.04" y2="273.18" />
      <line className="pbf-bar" x1="146.04" y1="270" x2="152.04" y2="270" />
      <line className="pbf-bar" x1="146.04" y1="273.18" x2="152.04" y2="273.18" />
      <circle className="pbf-dot" cx="149.04" cy="271.59" r="3.4" />
      <line className="pbf-bar" x1="189.71" y1="244.56" x2="202.99" y2="244.56" />
      <line className="pbf-bar" x1="189.71" y1="241.56" x2="189.71" y2="247.56" />
      <line className="pbf-bar" x1="202.99" y1="241.56" x2="202.99" y2="247.56" />
      <line className="pbf-bar" x1="196.35" y1="242.97" x2="196.35" y2="246.15" />
      <line className="pbf-bar" x1="193.35" y1="242.97" x2="199.35" y2="242.97" />
      <line className="pbf-bar" x1="193.35" y1="246.15" x2="199.35" y2="246.15" />
      <circle className="pbf-dot" cx="196.35" cy="244.56" r="3.4" />
      <line className="pbf-bar" x1="247.06" y1="209.59" x2="263.09" y2="209.59" />
      <line className="pbf-bar" x1="247.06" y1="206.59" x2="247.06" y2="212.59" />
      <line className="pbf-bar" x1="263.09" y1="206.59" x2="263.09" y2="212.59" />
      <line className="pbf-bar" x1="255.08" y1="208" x2="255.08" y2="211.18" />
      <line className="pbf-bar" x1="252.08" y1="208" x2="258.08" y2="208" />
      <line className="pbf-bar" x1="252.08" y1="211.18" x2="258.08" y2="211.18" />
      <circle className="pbf-dot" cx="255.08" cy="209.59" r="3.4" />
      <line className="pbf-bar pbf-out" x1="315.48" y1="168.26" x2="334.26" y2="168.26" />
      <line className="pbf-bar pbf-out" x1="315.48" y1="165.26" x2="315.48" y2="171.26" />
      <line className="pbf-bar pbf-out" x1="334.26" y1="165.26" x2="334.26" y2="171.26" />
      <line className="pbf-bar pbf-out" x1="324.87" y1="166.67" x2="324.87" y2="169.85" />
      <line className="pbf-bar pbf-out" x1="321.87" y1="166.67" x2="327.87" y2="166.67" />
      <line className="pbf-bar pbf-out" x1="321.87" y1="169.85" x2="327.87" y2="169.85" />
      <circle className="pbf-dot pbf-dot-out" cx="324.87" cy="168.26" r="3.4" />
      <line className="pbf-bar pbf-out" x1="394.76" y1="117.38" x2="416.2" y2="117.38" />
      <line className="pbf-bar pbf-out" x1="394.76" y1="114.38" x2="394.76" y2="120.38" />
      <line className="pbf-bar pbf-out" x1="416.2" y1="114.38" x2="416.2" y2="120.38" />
      <line className="pbf-bar pbf-out" x1="405.48" y1="115.79" x2="405.48" y2="118.97" />
      <line className="pbf-bar pbf-out" x1="402.48" y1="115.79" x2="408.48" y2="115.79" />
      <line className="pbf-bar pbf-out" x1="402.48" y1="118.97" x2="408.48" y2="118.97" />
      <circle className="pbf-dot pbf-dot-out" cx="405.48" cy="117.38" r="3.4" />
      <line className="pbf-bar pbf-out" x1="508.42" y1="45.85" x2="533.01" y2="45.85" />
      <line className="pbf-bar pbf-out" x1="508.42" y1="42.85" x2="508.42" y2="48.85" />
      <line className="pbf-bar pbf-out" x1="533.01" y1="42.85" x2="533.01" y2="48.85" />
      <line className="pbf-bar pbf-out" x1="520.72" y1="44.26" x2="520.72" y2="47.44" />
      <line className="pbf-bar pbf-out" x1="517.72" y1="44.26" x2="523.72" y2="44.26" />
      <line className="pbf-bar pbf-out" x1="517.72" y1="47.44" x2="523.72" y2="47.44" />
      <circle className="pbf-dot pbf-dot-out" cx="520.72" cy="45.85" r="3.4" />
      <line className="pbf-best" x1="92" y1="46" x2="118" y2="46" />
      <text className="pbf-key" x="125" y="50">best line</text>
      <line className="pbf-edge" x1="92" y1="63" x2="118" y2="63" />
      <text className="pbf-key" x="125" y="67">steepest / shallowest</text>
      <text className="pbf-key" x="92" y="84">hollow: 26–35°, not used</text>
    </svg>
  );
}
