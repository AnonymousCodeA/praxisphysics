// Rounds a true value to an instrument's display resolution.
export function quantize(value, resolution) {
  return Math.round(value / resolution) * resolution;
}
