// Deterministic per-session randomness for instrument systematics (zero
// offsets etc). The seed is drawn once and cached in sessionStorage, so a
// given instrument's offset is fixed across reloads within a session but
// changes in a new tab/session — never redrawn per measurement.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SEED_KEY = 'praxis:session-seed';

function getSessionSeed() {
  if (typeof window === 'undefined') return 0;
  let stored = window.sessionStorage.getItem(SEED_KEY);
  if (!stored) {
    stored = String((Math.random() * 0xffffffff) >>> 0);
    window.sessionStorage.setItem(SEED_KEY, stored);
  }
  return Number(stored) >>> 0;
}

// A draw in [0, 1), stable for the session for a given key.
export function sessionRandom(key) {
  const seed = getSessionSeed();
  const rng = mulberry32((seed ^ hashString(key)) >>> 0);
  return rng();
}

// A draw uniformly in [min, max), stable for the session for a given key.
export function sessionUniform(key, min, max) {
  return min + sessionRandom(key) * (max - min);
}
