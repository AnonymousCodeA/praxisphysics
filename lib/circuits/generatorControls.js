// Pure helpers for a placed generator's own controls — the frequency
// dial's decade/coarse/fine combination and its display formatting — kept
// separate from lib/circuits/model.mjs (which only ever sees the single
// already-combined frequency value) and from CircuitBench.js (which owns
// the placed component state these compute from, the same way
// lib/circuits/scene.js's VOLT_RANGES sits next to CircuitBench's meter
// range state rather than inside it).

export const GENERATOR_WAVEFORMS = ['sine', 'square', 'triangle'];
export const DEFAULT_GENERATOR_WAVEFORM = 'sine';

export const DEFAULT_GENERATOR_AMPLITUDE_PKPK = 5; // volts
export const GENERATOR_AMPLITUDE_PKPK_MAX = 20; // volts
export const GENERATOR_AMPLITUDE_PKPK_STEP = 0.1;

// A real bench generator's frequency dial: a decade range switch plus a
// coarse knob spanning that decade's own 1x-10x span, and a fine vernier
// trimming a small amount on top of the coarse setting for continuous
// coverage rather than only the coarse knob's own step size.
export const GENERATOR_DECADES = [10, 100, 1000, 10000, 100000];
export const DEFAULT_GENERATOR_DECADE = 100;
export const GENERATOR_COARSE_MIN = 1;
export const GENERATOR_COARSE_MAX = 10;
export const GENERATOR_COARSE_STEP = 0.1;
export const DEFAULT_GENERATOR_COARSE = 1;
export const GENERATOR_FINE_RANGE = 0.05; // +- multiplier trim
export const GENERATOR_FINE_STEP = 0.001;
export const DEFAULT_GENERATOR_FINE = 0;

// Combines the three dials into one exact frequency (Hz). Clamped so a
// fine-trim doesn't push the result out of the coarse knob's own 1x-10x
// span — the two decades either side already cover that range themselves.
export function generatorFrequency(decade, coarse, fine) {
  const multiplier = Math.min(GENERATOR_COARSE_MAX, Math.max(GENERATOR_COARSE_MIN, coarse + fine));
  return decade * multiplier;
}

// "123 Hz" / "1.23 kHz"-style display — 3 significant figures, which is
// about what the coarse+fine dials can actually resolve.
export function formatFrequency(hz) {
  const [value, unit] = hz >= 1000 ? [hz / 1000, 'kHz'] : [hz, 'Hz'];
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${unit}`;
}
