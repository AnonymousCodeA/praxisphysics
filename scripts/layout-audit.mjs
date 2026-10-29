// Layout audit: renders the pendulum (Part A, stopwatch running, pendulum
// swinging) and circuits problem 2 (Part A thermistor divider, voltmeter
// placed, heater on) at four viewport sizes. Saves a viewport screenshot
// (the fold) and a full-page screenshot of each, and prints element
// geometry so "what's above the fold" and "can the apparatus and the
// instrument be seen together" are measured, not eyeballed.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';

// Usage (against a running server — `npm run build && npm run start`, or
// `npm run dev`):
//   node scripts/layout-audit.mjs [--base http://localhost:3000] [--sizes 1920x1080,1440x900,1280x800,390x844]
//        [--out scripts/audit-output/layout] [--json scripts/audit-output/layout-audit.json]
//        [--edge <path to msedge/chrome>]
// Drives a headless Chromium (Edge by default on Windows; --edge or
// $AUDIT_BROWSER for anything else) over the DevTools protocol — no
// Playwright dependency. Screenshots go to --out, which is gitignored;
// compare the JSON with scripts/layout-audit.baseline.json, and copy a new run
// over the baseline once a layout change is deliberate.
const { values: opt } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:3000' },
    sizes: { type: 'string', default: '1920x1080,1440x900,1280x800,390x844' },
    out: { type: 'string', default: 'scripts/audit-output/layout' },
    json: { type: 'string', default: 'scripts/audit-output/layout-audit.json' },
    edge: { type: 'string', default: process.env.AUDIT_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' },
  },
});
const edge = opt.edge;
const profile = mkdtempSync(join(tmpdir(), 'praxis-audit-'));
const base = opt.base;
const outDir = opt.out;
const outJson = opt.json;
const ONLY = opt.sizes.split(',');
mkdirSync(dirname(outJson), { recursive: true });

mkdirSync(outDir, { recursive: true });
const proc = spawn(edge, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9339', `--user-data-dir=${profile}`, '--window-size=1920,1080', 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t; for (let i = 0; i < 50; i++) { try { t = await (await fetch('http://127.0.0.1:9339/json')).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(t.find((x) => x.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const errs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception?.description || e) + " | PAGE ERRS: " +JSON.stringify(errs).slice(0, 3000)); return r.result.result.value; };
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const hover = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });

const SIZES = [
  { w: 1920, h: 1080, mobile: false },
  { w: 1440, h: 900, mobile: false },
  { w: 1280, h: 800, mobile: false },
  { w: 390, h: 844, mobile: true },
].filter((s) => ONLY.includes(`${s.w}x${s.h}`));

// Page-coordinate rect of every element we care about, plus viewport size.
const GEOM = (sels) => `(() => {
  const out = { vw: innerWidth, vh: innerHeight, docH: document.documentElement.scrollHeight };
  for (const [k, s] of Object.entries(${JSON.stringify(sels)})) {
    const e = document.querySelector(s);
    if (!e) { out[k] = null; continue; }
    const r = e.getBoundingClientRect();
    out[k] = r.width === 0 && r.height === 0 ? 'hidden' : { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), w: Math.round(r.width) };
  }
  return out;
})()`;

async function setSize(s) {
  await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: s.mobile ? 2 : 1, mobile: s.mobile });
}
async function open(path) {
  await send('Page.navigate', { url: base + path });
  await sleep(2500);
  await ev(`Object.keys(localStorage).filter(k => k.startsWith('praxis:')).forEach(k => localStorage.removeItem(k))`);
  await send('Page.reload');
  await sleep(3500);
}
async function shots(name) {
  await ev(`window.scrollTo({ top: 0, behavior: 'instant' })`);
  await sleep(400);
  let r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(r.result.data, 'base64'));
  r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: await ev(`({ x: 0, y: 0, width: innerWidth, height: document.documentElement.scrollHeight, scale: 1 })`) });
  writeFileSync(join(outDir, `${name}-full.png`), Buffer.from(r.result.data, 'base64'));
  await setSizeAgain();
}
let current;
async function setSizeAgain() { await setSize(current); } // full-page capture can disturb the override
const clickText = (sel, txt) => ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find(b => b.textContent.trim() === ${JSON.stringify(txt)}); if (!b) throw new Error('no ' + ${JSON.stringify(txt)}); b.click(); })()`);

const results = {};

const PENDULUM_SELS = {
  header: 'header',
  workspace: '.pendulum-workspace',
  problem: '[data-pane="problem"]',
  task: '.pendulum-task',
  answer: '.answer-box',
  table: '[data-pane="data"] .pendulum-table-box',
  canvas: '#pendulum-canvas',
  controls: '.pendulum-controls',
  hint: '.bench-hint, .pendulum-frame .hint',
  pinned: '.bench-pinned',
  menu: '.instrument-menu',
  stopwatch: '.instrument-panels .instrument',
  stopwatchRead: '.instrument-panels .instrument .instrument-read',
  photogate: '.instrument-panels .instrument:nth-child(2)',
  plot: '.pendulum-plot',
  plotCanvas: '.plot-canvas',
};

const CIRCUIT_SELS = {
  header: 'header',
  workspace: '.pendulum-workspace',
  problem: '[data-pane="problem"]',
  table: '[data-pane="data"] .pendulum-table-box',
  canvas: '#circuit-canvas',
  hint: '.bench-hint, .circuit-frame .hint',
  pinned: '.bench-pinned',
  toolbar: '.circuit-toolbar',
  inventory: '.circuit-inventory',
  heater: '.circuit-heater',
  heaterTemp: '.circuit-heater-temp',
  meters: '.circuit-meters',
  plot: '.pendulum-plot',
  plotCanvas: '.plot-canvas',
};

// The student's own move: from the top of the page, scroll a reading into
// view (block 'nearest', which is what scrolling down until it appears
// amounts to), then check what is *actually* visible — inside the viewport,
// below the sticky header, and not covered by anything (a pinned panel
// included), sampled with elementFromPoint at five points per element.
const RESET_SCROLL = `(() => { document.querySelectorAll('.pendulum-col-right').forEach((e) => (e.scrollTop = 0)); window.scrollTo({ top: 0, behavior: 'instant' }); })()`;
const VISIBLE = (sels) => `(() => {
  const head = document.querySelector('header').getBoundingClientRect().bottom;
  const out = {};
  for (const [k, s] of Object.entries(${JSON.stringify(sels)})) {
    const e = document.querySelector(s);
    if (!e) { out[k] = null; continue; }
    const r = e.getBoundingClientRect();
    if (r.height === 0) { out[k] = 'hidden'; continue; }
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    const pts = [[cx, r.top + 2], [cx, r.bottom - 2], [r.left + 2, cy], [r.right - 2, cy], [cx, cy]];
    const clear = pts.every(([x, y]) => { const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)); });
    // 1.5px of slack: scrollIntoView rounds scrollTop to whole pixels, which
    // can leave a fractional edge just past the viewport.
    out[k] = r.top >= head - 1.5 && r.bottom <= innerHeight + 1.5 && clear;
    out[k + '@'] = [Math.round(r.top), Math.round(r.bottom)];
  }
  // Where the pinned region ends, and the window left beneath it.
  const pin = [...document.querySelectorAll('.bench-pinned, .scope-pinned')].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0).pop();
  out['pinned@'] = pin ? [Math.round(pin.top), Math.round(pin.bottom)] : null;
  out['view@'] = [Math.round(head), innerHeight];
  const col = document.querySelector('.pendulum-col-right');
  out.scroll = { page: Math.round(scrollY), max: document.documentElement.scrollHeight - innerHeight, col: col ? Math.round(col.scrollTop) : null, colMax: col ? col.scrollHeight - col.clientHeight : null };
  return out;
})()`;
// The student scrolls the page down to the bench first (so a sticky bench
// column, if there is one, is pinned), then scrolls on until the reading
// appears. The dev server's floating badge is removed so it can't count as
// covering a panel near the bottom-left corner.
// The same reading straight from page load, with no deliberate scroll to the
// bench first: scrollIntoView scrolls whatever ancestors it must (the bench
// column, then the page). This is what the title/lede height decides.
async function fromLoad(target, sels) {
  await ev(RESET_SCROLL);
  await ev(`document.querySelectorAll('nextjs-portal').forEach((e) => e.remove())`);
  await sleep(150);
  await ev(`document.querySelector(${JSON.stringify(target)}).scrollIntoView({ block: 'nearest', behavior: 'instant' })`);
  await sleep(250);
  return ev(VISIBLE(sels));
}
// A student who has read the bench's how-to strip dismisses it; measure
// the bench as they then use it. No-op where there's no dismissible strip.
const dismissHint = () => ev(`(() => { const b = document.querySelector('.bench-hint button'); if (!b) return false; b.click(); return true; })()`);
// Dismiss whichever instrument note card is showing (the one just placed).
// Records the open popover first: which side, whether it's wholly on screen
// below the header, and whether it touches the pinned apparatus.
const dismissNote = () => ev(`(() => {
  const pop = document.querySelector('.instrument-popover');
  if (!pop) return { present: false };
  const r = pop.getBoundingClientRect();
  const head = document.querySelector('header').getBoundingClientRect().bottom;
  const pin = document.querySelector('.bench-pinned').getBoundingClientRect();
  const out = {
    present: true, side: pop.dataset.side, visible: getComputedStyle(pop).visibility,
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)],
    pinned: [Math.round(pin.left), Math.round(pin.top), Math.round(pin.right), Math.round(pin.bottom)],
    onScreen: r.left >= 0 && r.right <= document.documentElement.clientWidth && r.top >= head && r.bottom <= innerHeight,
    overlapsApparatus: r.left < pin.right && r.right > pin.left && r.top < pin.bottom && r.bottom > pin.top,
    scrollY: Math.round(scrollY),
  };
  pop.querySelector('button').click();
  return out;
})()`);
async function reach(target, sels) {
  await ev(RESET_SCROLL);
  await ev(`document.querySelectorAll('nextjs-portal').forEach((e) => e.remove())`);
  await ev(`(() => { const w = document.querySelector('.pendulum-workspace') || document.querySelector('.circuit-bench'); const head = document.querySelector('header').getBoundingClientRect().bottom; window.scrollTo({ top: w.getBoundingClientRect().top + scrollY - head, behavior: 'instant' }); })()`);
  await sleep(150);
  await ev(`document.querySelector(${JSON.stringify(target)}).scrollIntoView({ block: 'nearest', behavior: 'instant' })`);
  await sleep(150);
  // scrollIntoView can leave the page a few px short of pinning a
  // scrolling bench column; finish the page scroll as a student would.
  await ev(`(() => { const c = document.querySelector('.pendulum-col-right'); if (!c || getComputedStyle(c).overflowY !== 'auto') return; const head = document.querySelector('header').getBoundingClientRect().bottom; const want = document.querySelector('.pendulum-workspace').getBoundingClientRect().top + scrollY - head; if (scrollY < want) window.scrollTo({ top: want, behavior: 'instant' }); })()`);
  await sleep(250);
  return ev(VISIBLE(sels));
}

for (const s of SIZES) {
  current = s;
  const tag = `${s.w}x${s.h}`;
  await setSize(s);

  // ---------- pendulum ----------
  await open('/simulations/pendulum');
  if (s.mobile) await clickText('.pendulum-tabs button', 'SIMULATION');
  await sleep(300);
  const pBefore = await ev(GEOM(PENDULUM_SELS));
  const pHintDismissed = await dismissHint();
  await sleep(200);
  await clickText('.instrument-menu button', 'STOPWATCH');
  await sleep(300);
  // First placement shows the instrument's note card; measure that, then
  // dismiss it as a student who has read it would.
  const pStopwatchFirstUse = await ev(GEOM(PENDULUM_SELS));
  const pStopwatchCard = await dismissNote();
  await sleep(200);
  const pWithStopwatch = await ev(GEOM(PENDULUM_SELS));
  // Pull the bob out to ~15° and release, then start the stopwatch.
  await ev(`document.getElementById('pendulum-canvas').scrollIntoView({ block: 'center', behavior: 'instant' })`);
  await sleep(300);
  const g = await ev(`(() => { const r = document.getElementById('pendulum-canvas').getBoundingClientRect(); const pxPerM = Math.min(r.height * 0.86 / 0.55, r.width * 0.86 / 0.5); return { x: r.left + r.width / 2, y: r.top + r.height * 0.1, pxPerM }; })()`);
  const L = 0.37;
  const at = (deg) => ({ x: g.x + L * g.pxPerM * Math.sin((deg * Math.PI) / 180), y: g.y + L * g.pxPerM * Math.cos((deg * Math.PI) / 180) });
  let p = at(0);
  await mouse('mouseMoved', p.x, p.y); await mouse('mousePressed', p.x, p.y);
  for (let d = 2; d <= 16; d += 2) { p = at(d); await mouse('mouseMoved', p.x, p.y); await sleep(20); }
  await mouse('mouseReleased', p.x, p.y);
  await clickText('.pendulum-controls button', 'RELEASE');
  await clickText('.instrument-panels button', 'START');
  await sleep(1200);
  const pActive = await ev(GEOM(PENDULUM_SELS));
  const pAtFold = await ev(VISIBLE({ canvas: '#pendulum-canvas', stopwatchRead: '.instrument-panels .instrument .instrument-read', stopwatch: '.instrument-panels .instrument' }));
  const pReach = {
    toStopwatchRead: await reach('.instrument-panels .instrument .instrument-read', { canvas: '#pendulum-canvas', stopwatchRead: '.instrument-panels .instrument .instrument-read' }),
    toStopwatch: await reach('.instrument-panels .instrument', { canvas: '#pendulum-canvas', stopwatch: '.instrument-panels .instrument' }),
    toPlot: await reach('.plot-canvas', { canvas: '#pendulum-canvas', plotCanvas: '.plot-canvas' }),
    // The plot as the thing in use: is the whole block (selectors, canvas,
    // line buttons) on screen once it's scrolled to?
    toPlotWhole: await reach('.pendulum-plot', { plot: '.pendulum-plot', plotCanvas: '.plot-canvas' }),
    fromLoadToStopwatch: await fromLoad('.instrument-panels .instrument', { canvas: '#pendulum-canvas', stopwatch: '.instrument-panels .instrument' }),
  };
  // Phone: the table and plot now live in the DATA tab, not under the bench.
  if (s.mobile) {
    await clickText('.pendulum-tabs button', 'DATA'); await sleep(300);
    pReach.dataTab = { geom: await ev(GEOM(PENDULUM_SELS)), toTable: await reach('.pendulum-table-box', { table: '.pendulum-table-box' }), toPlotWhole: await reach('.pendulum-plot', { plot: '.pendulum-plot', plotCanvas: '.plot-canvas' }) };
    await clickText('.pendulum-tabs button', 'SIMULATION'); await sleep(300);
  }
  await ev(RESET_SCROLL);
  await shots(`pendulum-${tag}`);
  // A second instrument with its own panel.
  await clickText('.instrument-menu button', 'PHOTOGATE');
  await sleep(300);
  const pPhotogateFirstUse = await ev(GEOM(PENDULUM_SELS));
  const pPhotogateCard = await dismissNote();
  await sleep(200);
  const pTwo = await ev(GEOM(PENDULUM_SELS));
  const pReachTwo = await reach('.instrument-panels .instrument:nth-child(2)', { canvas: '#pendulum-canvas', stopwatch: '.instrument-panels .instrument', photogate: '.instrument-panels .instrument:nth-child(2)' });
  results[`pendulum-${tag}`] = { hintDismissed: pHintDismissed, before: pBefore, withStopwatch: pWithStopwatch, active: pActive, withPhotogateToo: pTwo, firstUse: { stopwatchCard: pStopwatchCard, stopwatch: pStopwatchFirstUse.stopwatch, photogateCard: pPhotogateCard, photogate: pPhotogateFirstUse.photogate }, atFold: pAtFold, reach: { ...pReach, toPhotogateWithStopwatch: pReachTwo } };

  // ---------- circuits problem 2, Part A ----------
  await open('/simulations/circuits-nonlinear');
  if (s.mobile) await clickText('.pendulum-tabs button', 'SIMULATION');
  await sleep(300);
  const cBefore = await ev(GEOM(CIRCUIT_SELS));
  const cHintDismissed = await dismissHint();
  await sleep(200);
  // Divider: battery left, 10k top-left, thermistor top-right, wires back
  // along the bottom; voltmeter across the thermistor via a row above.
  const ROWS = 6, COLS = 9;
  const place = async (label, ra, ca, rb, cb) => {
    await ev(`(() => { const l = [...document.querySelectorAll('.circuit-card-label')].find(e => e.textContent.trim() === ${JSON.stringify(label)}); if (!l) throw new Error('no card ${label}'); const b = l.closest('button'); if (!b.classList.contains('armed')) b.click(); })()`);
    await ev(`document.getElementById('circuit-canvas').scrollIntoView({ block: 'center', behavior: 'instant' })`);
    await sleep(150);
    const c = await ev(`(() => { const r = document.getElementById('circuit-canvas').getBoundingClientRect(); const cell = Math.min(r.width * 0.82 / ${COLS - 1}, r.height * 0.82 / ${ROWS - 1}); return { x0: r.left + (r.width - cell * ${COLS - 1}) / 2, y0: r.top + (r.height - cell * ${ROWS - 1}) / 2, cell }; })()`);
    const x = c.x0 + ((ca + cb) / 2) * c.cell;
    const y = c.y0 + ((ra + rb) / 2) * c.cell;
    await hover(x - 3, y - 3); await sleep(40);
    await hover(x, y); await sleep(60);
    await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y);
    await sleep(120);
  };
  await place('+9V', 2, 1, 3, 1);
  await place('10kΩ', 2, 1, 2, 2);
  await place('THERMISTOR', 2, 2, 2, 3);
  await place('WIRE', 2, 3, 3, 3);
  await place('WIRE', 3, 3, 3, 2);
  await place('WIRE', 3, 2, 3, 1);
  await place('WIRE', 1, 2, 2, 2);
  await place('WIRE', 1, 3, 2, 3);
  await place('V', 1, 2, 1, 3);
  const placedCount = await ev(`document.querySelectorAll('.circuit-meters li').length`);
  await clickText('.circuit-heater button', 'ON');
  await sleep(2500);
  const cActive = await ev(GEOM(CIRCUIT_SELS));
  cActive.metersListed = placedCount;
  cActive.heaterReading = await ev(`document.querySelector('.circuit-heater-temp')?.textContent`);
  const C_SELS = { canvas: '#circuit-canvas', heaterTemp: '.circuit-heater-temp', heater: '.circuit-heater', meters: '.circuit-meters' };
  const cAtFold = await ev(VISIBLE(C_SELS));
  const cReach = {
    toHeaterTemp: await reach('.circuit-heater-temp', C_SELS),
    toHeater: await reach('.circuit-heater', C_SELS),
    toMeters: await reach('.circuit-meters', C_SELS),
    toPlot: await reach('.plot-canvas', { canvas: '#circuit-canvas', plotCanvas: '.plot-canvas' }),
    toPlotWhole: await reach('.pendulum-plot', { plot: '.pendulum-plot', plotCanvas: '.plot-canvas' }),
    fromLoadToHeater: await fromLoad('.circuit-heater', C_SELS),
  };
  if (s.mobile) {
    await clickText('.pendulum-tabs button', 'DATA'); await sleep(300);
    cReach.dataTab = { geom: await ev(GEOM(CIRCUIT_SELS)), toTable: await reach('.pendulum-table-box', { table: '.pendulum-table-box' }), toPlotWhole: await reach('.pendulum-plot', { plot: '.pendulum-plot', plotCanvas: '.plot-canvas' }) };
    await clickText('.pendulum-tabs button', 'SIMULATION'); await sleep(300);
  }
  await ev(RESET_SCROLL);
  await shots(`circuits-thermistor-${tag}`);
  // A second voltmeter, across the 10k.
  await place('WIRE', 1, 1, 2, 1);
  await place('V', 1, 1, 1, 2);
  const cTwo = await ev(GEOM(CIRCUIT_SELS));
  cTwo.metersListed = await ev(`document.querySelectorAll('.circuit-meters li').length`);
  results[`circuits-thermistor-${tag}`] = { hintDismissed: cHintDismissed, before: cBefore, active: cActive, withSecondVoltmeter: cTwo, atFold: cAtFold, reach: cReach };

  // ---------- circuit builder: oscilloscope expanded ----------
  await open('/simulations/circuit-builder');
  await dismissHint();
  await clickText('.circuit-presets button', 'SERIES RLC');
  await sleep(400);
  const bCollapsed = await ev(GEOM({ canvas: '#circuit-canvas', scope: '.circuit-scope', generators: '.circuit-generators' }));
  await clickText('.circuit-scope button', 'OPEN SCOPE');
  await sleep(800);
  const B_SELS = { canvas: '#circuit-canvas', inventory: '.circuit-inventory', scopeScreen: '.scope-canvas', scopeClose: '.circuit-scope-header button', scopeControls: '.circuit-scope-controls', generators: '.circuit-generators' };
  const bExpanded = await ev(GEOM(B_SELS));
  const bAtFold = await ev(VISIBLE(B_SELS));
  const bReach = {
    toScopeControls: await reach('.circuit-scope-controls', B_SELS),
    toGenerators: await reach('.circuit-generators', B_SELS),
  };
  bExpanded.scopeDrawn = await ev(`(() => { const c = document.querySelector('.scope-canvas'); if (!c) return null; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 1; i < d.length; i += 4) if (d[i] > 120) lit++; return { w: c.width, h: c.height, litPx: lit }; })()`);
  await ev(RESET_SCROLL);
  await shots(`builder-scope-${tag}`);
  await clickText('.circuit-scope-header button', 'CLOSE');
  await sleep(400);
  const bClosed = await ev(GEOM({ canvas: '#circuit-canvas', inventory: '.circuit-inventory', scope: '.circuit-scope' }));
  results[`builder-scope-${tag}`] = { collapsed: bCollapsed, expanded: bExpanded, atFold: bAtFold, reach: bReach, closedAgain: bClosed };
}

writeFileSync(outJson, JSON.stringify({ results, errs }, null, 1));
console.log(JSON.stringify({ errs, keys: Object.keys(results) }));
ws.close(); proc.kill();
