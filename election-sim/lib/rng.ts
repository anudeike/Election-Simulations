/**
 * Seeded PRNG (mulberry32) for deterministic runs.
 * Returns a function that yields uint32 in [0, 0xffffffff].
 */
export function createSeededRng(seed: number): () => number {
  return function mulberry32(): number {
    seed = (seed + 0x6d2b79f5) | 0; // 32-bit multiply
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/** Uniform float in [0, 1). */
export function randomUniform(rng: () => number): number {
  return rng() / 0x100000000;
}

/** Uniform float in [min, max). */
export function randomInRange(rng: () => number, min: number, max: number): number {
  return min + randomUniform(rng) * (max - min);
}

/** Box-Muller for normal(0,1); call twice per pair or cache. */
export function randomNormal(rng: () => number): number {
  const u1 = randomUniform(rng) || 1e-10;
  const u2 = randomUniform(rng);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
