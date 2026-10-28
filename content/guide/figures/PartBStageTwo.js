// Fig. 5.2 — Stage two of the Part B worked example
// (content/guide/worked-examples.js, 'two-stage-fits'):
// y = (T/T₀ − 1)/x against x for set 2 at T₀ = 1.42015 s, with the second
// pass's lines through the six points up to 60° (y = 0.247 + 0.179x, 0.224 +
// 0.309x, 0.274 + 0.049x); 70° and 77° drawn hollow.
//
// Every coordinate here is a reading or a line from
// scripts/worked-example-partb.mjs, like the tables in the prose. Don't
// hand-edit it: if the data or the analysis change, regenerate the figure
// from the script's output. Converted from docs/partb-stage-two.svg with the
// placeholders mapped to --trace and --font-mono, as in QuadratureCuboid;
// colours sit in the style block (plain value first, var() second) because
// var() doesn't resolve in SVG presentation attributes. currentColor is set
// to --chalk so the data reads white against the trace-blue lines (the
// figure box itself sets --trace). Classes are prefixed pbf- because an
// inline SVG's <style> applies to the whole page.
export default function PartBStageTwo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 580 390"
      role="img"
      aria-labelledby="s2t s2d"
      style={{ color: 'var(--chalk)' }}
    >
      <title id="s2t">Stage two: the reduced period ratio against x</title>
      <desc id="s2d">The same readings reduced to y, plotted against x. The intercept is alpha and the gradient is beta. Error bars shrink sharply with x. A best line and the steepest and shallowest lines are drawn through the six points up to 60 degrees; the 70 and 77 degree points lie above them.</desc>

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
      <text className="pbf-tick" x="76" y="352" textAnchor="middle">0.0</text>
      <line className="pbf-grid" x1="193.56" y1="22" x2="193.56" y2="332" />
      <text className="pbf-tick" x="193.56" y="352" textAnchor="middle">0.1</text>
      <line className="pbf-grid" x1="311.12" y1="22" x2="311.12" y2="332" />
      <text className="pbf-tick" x="311.12" y="352" textAnchor="middle">0.2</text>
      <line className="pbf-grid" x1="428.68" y1="22" x2="428.68" y2="332" />
      <text className="pbf-tick" x="428.68" y="352" textAnchor="middle">0.3</text>
      <line className="pbf-grid" x1="546.24" y1="22" x2="546.24" y2="332" />
      <text className="pbf-tick" x="546.24" y="352" textAnchor="middle">0.4</text>
      <line className="pbf-grid" x1="76" y1="317.58" x2="558" y2="317.58" />
      <text className="pbf-tick" x="66" y="321.58" textAnchor="end">0.15</text>
      <line className="pbf-grid" x1="76" y1="245.49" x2="558" y2="245.49" />
      <text className="pbf-tick" x="66" y="249.49" textAnchor="end">0.20</text>
      <line className="pbf-grid" x1="76" y1="173.4" x2="558" y2="173.4" />
      <text className="pbf-tick" x="66" y="177.4" textAnchor="end">0.25</text>
      <line className="pbf-grid" x1="76" y1="101.3" x2="558" y2="101.3" />
      <text className="pbf-tick" x="66" y="105.3" textAnchor="end">0.30</text>
      <line className="pbf-grid" x1="76" y1="29.21" x2="558" y2="29.21" />
      <text className="pbf-tick" x="66" y="33.21" textAnchor="end">0.35</text>
      <rect className="pbf-frame" x="76" y="22" width="482" height="310" />
      <text className="pbf-axis" x="317" y="374" textAnchor="middle">x = sin²(φ₀/2)</text>
      <text className="pbf-axis" x="18" y="177" textAnchor="middle" transform="rotate(-90 18 177)">y = (T/T₀ − 1) / x</text>
      <line className="pbf-edge" x1="76" y1="138.79" x2="558" y2="109.82" />
      <line className="pbf-edge" x1="76" y1="210.88" x2="558" y2="28.21" />
      <line className="pbf-best" x1="76" y1="177.72" x2="558" y2="71.9" />
      <line className="pbf-bar" x1="84.04" y1="179.85" x2="85.83" y2="179.85" />
      <line className="pbf-bar" x1="84.04" y1="176.85" x2="84.04" y2="182.85" />
      <line className="pbf-bar" x1="85.83" y1="176.85" x2="85.83" y2="182.85" />
      <line className="pbf-bar" x1="84.93" y1="50.81" x2="84.93" y2="308.89" />
      <line className="pbf-bar" x1="81.93" y1="50.81" x2="87.93" y2="50.81" />
      <line className="pbf-bar" x1="81.93" y1="308.89" x2="87.93" y2="308.89" />
      <circle className="pbf-dot" cx="84.93" cy="179.85" r="3.4" />
      <line className="pbf-bar" x1="109.69" y1="168.49" x2="113.2" y2="168.49" />
      <line className="pbf-bar" x1="109.69" y1="165.49" x2="109.69" y2="171.49" />
      <line className="pbf-bar" x1="113.2" y1="165.49" x2="113.2" y2="171.49" />
      <line className="pbf-bar" x1="111.44" y1="126.73" x2="111.44" y2="210.25" />
      <line className="pbf-bar" x1="108.44" y1="126.73" x2="114.44" y2="126.73" />
      <line className="pbf-bar" x1="108.44" y1="210.25" x2="114.44" y2="210.25" />
      <circle className="pbf-dot" cx="111.44" cy="168.49" r="3.4" />
      <line className="pbf-bar" x1="152.19" y1="157.24" x2="157.32" y2="157.24" />
      <line className="pbf-bar" x1="152.19" y1="154.24" x2="152.19" y2="160.24" />
      <line className="pbf-bar" x1="157.32" y1="154.24" x2="157.32" y2="160.24" />
      <line className="pbf-bar" x1="154.75" y1="134.24" x2="154.75" y2="180.24" />
      <line className="pbf-bar" x1="151.75" y1="134.24" x2="157.75" y2="134.24" />
      <line className="pbf-bar" x1="151.75" y1="180.24" x2="157.75" y2="180.24" />
      <circle className="pbf-dot" cx="154.75" cy="157.24" r="3.4" />
      <line className="pbf-bar" x1="210.23" y1="146.34" x2="216.81" y2="146.34" />
      <line className="pbf-bar" x1="210.23" y1="143.34" x2="210.23" y2="149.34" />
      <line className="pbf-bar" x1="216.81" y1="143.34" x2="216.81" y2="149.34" />
      <line className="pbf-bar" x1="213.52" y1="130.85" x2="213.52" y2="161.82" />
      <line className="pbf-bar" x1="210.52" y1="130.85" x2="216.52" y2="130.85" />
      <line className="pbf-bar" x1="210.52" y1="161.82" x2="216.52" y2="161.82" />
      <circle className="pbf-dot" cx="213.52" cy="146.34" r="3.4" />
      <line className="pbf-bar" x1="282.05" y1="132.26" x2="289.9" y2="132.26" />
      <line className="pbf-bar" x1="282.05" y1="129.26" x2="282.05" y2="135.26" />
      <line className="pbf-bar" x1="289.9" y1="129.26" x2="289.9" y2="135.26" />
      <line className="pbf-bar" x1="285.98" y1="120.63" x2="285.98" y2="143.89" />
      <line className="pbf-bar" x1="282.98" y1="120.63" x2="288.98" y2="120.63" />
      <line className="pbf-bar" x1="282.98" y1="143.89" x2="288.98" y2="143.89" />
      <circle className="pbf-dot" cx="285.98" cy="132.26" r="3.4" />
      <line className="pbf-bar" x1="365.46" y1="111.3" x2="374.35" y2="111.3" />
      <line className="pbf-bar" x1="365.46" y1="108.3" x2="365.46" y2="114.3" />
      <line className="pbf-bar" x1="374.35" y1="108.3" x2="374.35" y2="114.3" />
      <line className="pbf-bar" x1="369.9" y1="101.92" x2="369.9" y2="120.68" />
      <line className="pbf-bar" x1="366.9" y1="101.92" x2="372.9" y2="101.92" />
      <line className="pbf-bar" x1="366.9" y1="120.68" x2="372.9" y2="120.68" />
      <circle className="pbf-dot" cx="369.9" cy="111.3" r="3.4" />
      <line className="pbf-bar pbf-out" x1="457.94" y1="86.23" x2="467.58" y2="86.23" />
      <line className="pbf-bar pbf-out" x1="457.94" y1="83.23" x2="457.94" y2="89.23" />
      <line className="pbf-bar pbf-out" x1="467.58" y1="83.23" x2="467.58" y2="89.23" />
      <line className="pbf-bar pbf-out" x1="462.76" y1="78.33" x2="462.76" y2="94.12" />
      <line className="pbf-bar pbf-out" x1="459.76" y1="78.33" x2="465.76" y2="78.33" />
      <line className="pbf-bar pbf-out" x1="459.76" y1="94.12" x2="465.76" y2="94.12" />
      <circle className="pbf-dot pbf-dot-out" cx="462.76" cy="86.23" r="3.4" />
      <line className="pbf-bar pbf-out" x1="526.58" y1="64.23" x2="536.57" y2="64.23" />
      <line className="pbf-bar pbf-out" x1="526.58" y1="61.23" x2="526.58" y2="67.23" />
      <line className="pbf-bar pbf-out" x1="536.57" y1="61.23" x2="536.57" y2="67.23" />
      <line className="pbf-bar pbf-out" x1="531.57" y1="57.08" x2="531.57" y2="71.38" />
      <line className="pbf-bar pbf-out" x1="528.57" y1="57.08" x2="534.57" y2="57.08" />
      <line className="pbf-bar pbf-out" x1="528.57" y1="71.38" x2="534.57" y2="71.38" />
      <circle className="pbf-dot pbf-dot-out" cx="531.57" cy="64.23" r="3.4" />
      <line className="pbf-best" x1="92" y1="46" x2="118" y2="46" />
      <text className="pbf-key" x="125" y="50">best line</text>
      <line className="pbf-edge" x1="92" y1="63" x2="118" y2="63" />
      <text className="pbf-key" x="125" y="67">steepest / shallowest</text>
      <text className="pbf-key" x="92" y="84">hollow: 70° and 77°, not used</text>
    </svg>
  );
}
