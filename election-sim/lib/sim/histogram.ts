import type { SimState } from './types';

const BELIEF_MIN = -50;
const BELIEF_MAX = 50;

/**
 * Map belief in [-50, 50] to bin index in [0, binCount-1].
 */
export function beliefToBin(belief: number, binCount: number): number {
  const t = (belief - BELIEF_MIN) / (BELIEF_MAX - BELIEF_MIN);
  const bin = Math.floor(t * binCount);
  return Math.max(0, Math.min(binCount - 1, bin));
}

/**
 * Compute histogram of beliefs (active cells only). Bins are descriptive, no trimming.
 */
export function computeHistogram(state: SimState): void {
  const { beliefs, activeMask, histogramBins, config } = state;
  const binCount = config.histogramBins;
  histogramBins.fill(0);

  for (let i = 0; i < beliefs.length; i++) {
    if (!activeMask[i]) continue;
    const bin = beliefToBin(beliefs[i], binCount);
    histogramBins[bin]++;
  }
}

/**
 * Compute mean and median from current beliefs (active only).
 */
export function beliefStats(beliefs: Float32Array, activeMask: Uint8Array): { mean: number; median: number } {
  const arr: number[] = [];
  let sum = 0;
  let count = 0;
  for (let i = 0; i < beliefs.length; i++) {
    if (!activeMask[i]) continue;
    arr.push(beliefs[i]);
    sum += beliefs[i];
    count++;
  }
  const mean = count > 0 ? sum / count : 0;
  if (arr.length === 0) return { mean: 0, median: 0 };
  arr.sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  const median = arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  return { mean, median };
}
