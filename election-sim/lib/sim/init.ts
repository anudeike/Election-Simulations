import type { SimConfig, SimState } from './types';
import { createSeededRng, randomInRange, randomNormal } from '../rng';
import { createPerlinNoise, perlinDetailToScale } from '../perlin';
import { rectangularDistricting } from './districting/rectangular';
import { computeBorderSegments } from './districting/borders';

const BELIEF_MIN = -50;
const BELIEF_MAX = 50;

function clampBelief(b: number): number {
  return Math.max(BELIEF_MIN, Math.min(BELIEF_MAX, b));
}

/**
 * Compute grid dimensions from agent count.
 * width = floor(sqrt(N)), height = ceil(N / width); use exactly N cells when possible.
 */
export function gridDimensions(agentCount: number): { width: number; height: number } {
  const width = Math.max(1, Math.floor(Math.sqrt(agentCount)));
  const height = Math.ceil(agentCount / width);
  return { width, height };
}

/**
 * Initialize beliefs from config (uniform, normal, bimodal, or perlin).
 */
function initBeliefs(
  beliefs: Float32Array,
  activeMask: Uint8Array,
  config: SimConfig,
  rng: () => number,
  width: number,
  height: number
): void {
  const n = beliefs.length;
  const { initialBeliefs, initialBeliefParam, perlinDetail } = config;

  if (initialBeliefs === 'perlin') {
    const detail = Math.max(1, Math.min(20, perlinDetail ?? initialBeliefParam ?? 10));
    const scale = perlinDetailToScale(detail);
    const seed = config.seed != null ? config.seed : (rng() >>> 0);
    const noise2d = createPerlinNoise(seed);
    for (let i = 0; i < n; i++) {
      if (!activeMask[i]) {
        beliefs[i] = 0;
        continue;
      }
      const x = i % width;
      const y = Math.floor(i / width);
      const v = noise2d(x * scale, y * scale);
      beliefs[i] = clampBelief(v * 50);
    }
    return;
  }

  for (let i = 0; i < n; i++) {
    if (!activeMask[i]) {
      beliefs[i] = 0;
      continue;
    }
    let b: number;
    if (initialBeliefs === 'uniform') {
      b = randomInRange(rng, BELIEF_MIN, BELIEF_MAX);
    } else if (initialBeliefs === 'normal') {
      const sigma = initialBeliefParam || 15;
      b = clampBelief(randomNormal(rng) * sigma);
    } else {
      const mu = initialBeliefParam || 25;
      const sign = rng() % 2 === 0 ? 1 : -1;
      b = clampBelief(sign * mu + randomNormal(rng) * (mu / 2));
    }
    beliefs[i] = b;
  }
}

/**
 * Create and initialize full simulation state from config.
 */
export function createSimState(config: SimConfig): SimState {
  const { width, height } = gridDimensions(config.agentCount);
  const cellCount = width * height;
  const activeMask = new Uint8Array(cellCount);
  for (let i = 0; i < cellCount; i++) {
    activeMask[i] = i < config.agentCount ? 1 : 0;
  }

  const rng = config.seed != null ? createSeededRng(config.seed) : () => Math.random() * 0x100000000;

  const beliefs = new Float32Array(cellCount);
  const nextBeliefs = new Float32Array(cellCount);
  initBeliefs(beliefs, activeMask, config, rng, width, height);
  nextBeliefs.set(beliefs);

  const districtId = new Int32Array(cellCount);
  rectangularDistricting(districtId, activeMask, width, height, config.districtCount);

  const numDistricts = config.districtCount;
  const districtRedCounts = new Int32Array(numDistricts);
  const districtBlueCounts = new Int32Array(numDistricts);
  const districtWinners = new Int8Array(numDistricts);

  const histogramBins = new Uint32Array(config.histogramBins);
  const borderSegments = computeBorderSegments(districtId, width, height);

  const state: SimState = {
    config: { ...config, width, height },
    timestep: 0,
    beliefs,
    nextBeliefs,
    districtId,
    activeMask,
    histogramBins,
    districtRedCounts,
    districtBlueCounts,
    districtWinners,
    borderSegments,
  };

  return state;
}
