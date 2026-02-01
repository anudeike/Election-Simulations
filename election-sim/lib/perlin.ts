/**
 * 2D Perlin-like noise with seeded permutation for deterministic spatial belief init.
 * Returns values in approximately [-1, 1]. Detail (scale) controls frequency:
 * higher detail = finer variation; lower detail = smoother, larger blobs.
 */

const PERM_SIZE = 256;

function buildPermutation(seed: number): Uint8Array {
  const perm = new Uint8Array(PERM_SIZE * 2);
  for (let i = 0; i < PERM_SIZE; i++) perm[i] = i;
  // Simple seeded shuffle (mulberry32-style)
  let s = seed >>> 0;
  for (let i = PERM_SIZE - 1; i > 0; i--) {
    s = (s + 0x6d2b79f5) >>> 0;
    const j = (s % (i + 1)) >>> 0;
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < PERM_SIZE; i++) perm[PERM_SIZE + i] = perm[i];
  return perm;
}

function grad2(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v) * 2;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

export function createPerlinNoise(seed: number) {
  const perm = buildPermutation(seed);

  return function noise(x: number, y: number): number {
    const X = Math.floor(x) & (PERM_SIZE - 1);
    const Y = Math.floor(y) & (PERM_SIZE - 1);
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];

    return lerp(
      lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u),
      lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u),
      v
    );
  };
}

/**
 * Detail 1–20: higher = more spatial detail (finer variation).
 * Scale maps detail to frequency: detail 1 -> smooth, detail 20 -> very detailed.
 */
export function perlinDetailToScale(detail: number): number {
  const d = Math.max(1, Math.min(20, detail));
  return 0.08 + (d / 20) * 1.92; // ~0.08 to 2
}
