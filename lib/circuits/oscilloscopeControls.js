// Pure helpers for the oscilloscope: the 1-2-5 stepped timebase/volts-per-
// div option lists, their display formatting, and the auto-set estimate —
// same role as lib/circuits/generatorControls.js, kept out of
// components/Oscilloscope.js so the numeric/formatting logic can be read
// (and eventually unit-tested) independent of the React component.

export const SCOPE_DIVISIONS_X = 10;
export const SCOPE_DIVISIONS_Y = 8;
export const SCOPE_DISPLAY_SAMPLES = 600; // horizontal resolution of the trace
export const SCOPE_REFRESH_MS = 200; // ~5 Hz — "a few times a second," and
// deliberately its own slow interval rather than piggybacking on
// useCircuitPhysics's 20ms/50Hz accumulator, so a capture (which internally
// steps the solver hundreds of times over a short window — see
// captureWaveform) never competes with the bench's own real-time solve.

// A real scope's dial: a decade-independent 1-2-5 sequence spanning a wide
// enough range for both edges of the generator's own 10Hz-100kHz span.
function build125Sequence(min, max) {
  const out = [];
  let magnitude = 10 ** Math.floor(Math.log10(min));
  while (magnitude <= max * 1.0001) {
    for (const mult of [1, 2, 5]) {
      const v = magnitude * mult;
      if (v >= min * 0.9999 && v <= max * 1.0001) out.push(v);
    }
    magnitude *= 10;
  }
  return out;
}

export const TIME_PER_DIV_OPTIONS = build125Sequence(1e-6, 0.2); // 1us/div .. 200ms/div
export const DEFAULT_TIME_PER_DIV = 1e-3; // 1ms/div

export const VOLTS_PER_DIV_OPTIONS = build125Sequence(0.01, 10); // 10mV/div .. 10V/div
export const DEFAULT_VOLTS_PER_DIV = 1; // 1V/div

export const VERTICAL_POSITION_MIN = -SCOPE_DIVISIONS_Y / 2;
export const VERTICAL_POSITION_MAX = SCOPE_DIVISIONS_Y / 2;
export const VERTICAL_POSITION_STEP = 0.1;
export const DEFAULT_VERTICAL_POSITION = 0;

// DC passes the signal as captured; AC blocks the mean (a display-only
// high-pass approximation — subtracting the captured window's own mean —
// not a real capacitor in the signal path, since this is a read, not
// another element in the circuit); GND disconnects the input entirely and
// shows a flat line at the channel's own zero, exactly at its POSITION
// offset — the standard way to find where a channel's zero actually sits
// on screen. See applyCoupling.
export const COUPLING_OPTIONS = ['DC', 'AC', 'GND'];
export const DEFAULT_COUPLING = 'DC';

export const TRIGGER_SLOPES = ['rising', 'falling'];
export const DEFAULT_TRIGGER_SLOPE = 'rising';
export const DEFAULT_TRIGGER_SOURCE = 'ch1';
export const DEFAULT_TRIGGER_LEVEL = 0; // volts

// Applied in useOscilloscope, once, right after a capture — both the
// trigger search and the displayed trace see the SAME coupled samples,
// same as a real scope's vertical amplifier feeding its own trigger
// comparator downstream of the coupling switch.
export function applyCoupling(values, coupling) {
  if (coupling === 'GND') return values.map(() => 0);
  if (coupling === 'AC') {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.map((v) => v - mean);
  }
  return values;
}

// Nearest option on a LOG scale — right for both timebase and volts/div,
// which both span decades, so "nearest" should mean nearest by ratio, not
// by raw difference (an absolute-distance nearest would always pick the
// largest option on a wide range).
export function nearestOption(target, options) {
  let best = options[0];
  let bestDist = Infinity;
  for (const o of options) {
    const d = Math.abs(Math.log(o) - Math.log(target));
    if (d < bestDist) {
      bestDist = d;
      best = o;
    }
  }
  return best;
}

// Trims a value that's exactly 1/2/5 * 10^k (every option in the lists
// above is) down to a clean short decimal, e.g. 2e-6/1e-6 -> "2", not
// "1.9999999999999998" — toPrecision absorbs the float noise those exact
// powers of ten can otherwise pick up from division.
function trimNumber(v) {
  return Number(v.toPrecision(4)).toString();
}

function formatWithUnit(value, units) {
  for (const u of units) {
    if (value >= u.mult * 0.9999) return `${trimNumber(value / u.mult)} ${u.suffix}`;
  }
  const smallest = units[units.length - 1];
  return `${trimNumber(value / smallest.mult)} ${smallest.suffix}`;
}

export function formatTimePerDiv(seconds) {
  return formatWithUnit(seconds, [
    { mult: 1, suffix: 's' },
    { mult: 1e-3, suffix: 'ms' },
    { mult: 1e-6, suffix: 'µs' },
  ]);
}

const VOLT_UNITS = [
  { mult: 1, suffix: 'V' },
  { mult: 1e-3, suffix: 'mV' },
];

export function formatVoltsPerDiv(volts) {
  return formatWithUnit(volts, VOLT_UNITS);
}

// Signed, unlike formatVoltsPerDiv (volts/div is never negative) — for a
// trigger level, which is a real voltage measured off the trace's own
// zero and can sit above or below it.
export function formatVoltage(volts) {
  if (volts === 0) return '0 V';
  const sign = volts < 0 ? '-' : '';
  return sign + formatWithUnit(Math.abs(volts), VOLT_UNITS);
}

// Peak-to-peak of a captured trace — the same raw-sample method Test 1 in
// scripts/circuits-generator-verify.mjs uses, here driving AUTO's gain
// framing instead of a correctness check.
export function peakToPeak(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max > min ? max - min : 0;
}

// Frequency from zero-crossing spacing — same method as the verify
// scripts' RLC ringing tests, reused here for AUTO's timebase framing.
// Returns null when there aren't at least two crossings to space (a DC
// level, or a signal too slow for the current window to show a cycle of).
export function estimateFrequencyHz(time, values) {
  const crossings = [];
  for (let i = 1; i < values.length; i++) {
    const v0 = values[i - 1];
    const v1 = values[i];
    if ((v0 <= 0 && v1 > 0) || (v0 >= 0 && v1 < 0)) {
      const frac = v0 / (v0 - v1);
      crossings.push(time[i - 1] + frac * (time[i] - time[i - 1]));
    }
  }
  if (crossings.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < crossings.length; i++) gaps.push(crossings[i] - crossings[i - 1]);
  const meanHalfPeriod = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const period = 2 * meanHalfPeriod;
  return period > 0 ? 1 / period : null;
}

// AUTO: reads the most recent capture and picks a timebase (from channel 1
// if present, else channel 2 — the same preference order triggering uses)
// showing a few cycles across the screen, and a volts/div per channel
// giving each trace a healthy vertical swing without clipping. Pure, given
// a capture — the component owns applying the result and resetting
// vertical position.
export function autoFrame({ time, traces }) {
  const primaryKey = traces.ch1 ? 'ch1' : traces.ch2 ? 'ch2' : null;
  let timePerDiv = DEFAULT_TIME_PER_DIV;
  if (primaryKey) {
    const freq = estimateFrequencyHz(time, traces[primaryKey]);
    if (freq) {
      const targetWindow = 3 / freq; // aim to show ~3 cycles across the screen
      timePerDiv = nearestOption(targetWindow / SCOPE_DIVISIONS_X, TIME_PER_DIV_OPTIONS);
    }
  }

  const voltsPerDiv = {};
  for (const ch of ['ch1', 'ch2']) {
    const tr = traces[ch];
    if (!tr) continue;
    const pp = peakToPeak(tr);
    const target = pp > 0 ? pp / 6 : DEFAULT_VOLTS_PER_DIV; // ~6 divisions of vertical swing
    voltsPerDiv[ch] = nearestOption(target, VOLTS_PER_DIV_OPTIONS);
  }

  return { timePerDiv, voltsPerDiv };
}

// The scope screen is a deliberate exception to the app's two-tone palette
// (see docs/conventions.md) — green phosphor on black, the way a real scope looks —
// scoped to the scope screen only, the same way Plot.js's LINE_COLORS is
// scoped to saved plot lines. A second, distinct hue for channel 2 (rather
// than a second shade of green) keeps the two traces unambiguous even for
// a colorblind reader, echoing real dual-trace scopes that pair green with
// amber.
export const SCOPE_BG = '#020402';
export const SCOPE_GRATICULE = 'rgba(51,255,102,.18)';
export const SCOPE_GRATICULE_BRIGHT = 'rgba(51,255,102,.4)';
export const SCOPE_CH1_COLOR = '#33FF66';
export const SCOPE_CH2_COLOR = '#FFB454';
