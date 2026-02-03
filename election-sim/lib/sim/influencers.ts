import type { SimState, InfluencerConfig, InfluencerEvent } from './types';
import { getNeighborIndices } from './update';
import { randomUniform, randomInRange } from '../rng';

/**
 * Compute distance from (x1,y1) to (x2,y2) using the configured metric.
 */
function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  metric: 'euclidean' | 'chebyshev'
): number {
  if (metric === 'chebyshev') {
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  }
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Homogeneity score: fraction of neighbors with same sign as cell i.
 * S_i = #{j : sign(b_j) = sign(b_i)} / |N(i)|
 */
function homogeneityScore(
  idx: number,
  beliefs: Float32Array,
  activeMask: Uint8Array,
  neighbors: number[]
): number {
  const bi = beliefs[idx];
  const signBi = bi >= 0 ? 1 : -1;
  let sameSign = 0;
  let count = 0;
  for (const ni of neighbors) {
    if (!activeMask[ni]) continue;
    count++;
    const signBj = beliefs[ni] >= 0 ? 1 : -1;
    if (signBj === signBi) sameSign++;
  }
  return count > 0 ? sameSign / count : 0;
}

/**
 * Decay amplitude at age t.
 * Linear: a(t) = 1 - t/ttl
 * Exp: a(t) = e^(-t/τ), τ = ttl / decayRate
 */
function decayAmplitude(age: number, ttl: number, decayType: 'none' | 'linear' | 'exp', decayRate: number): number {
  if (decayType === 'none') return 1;
  if (decayType === 'linear') return Math.max(0, 1 - age / ttl);
  const τ = ttl / Math.max(0.1, decayRate);
  return Math.exp(-age / τ);
}

/**
 * Try to spawn an influencer. Returns new InfluencerEvent or null.
 * Spawn probability: baseRate * sum over candidates of max(0, S_i - s_min)^γ, normalized.
 */
export function trySpawnInfluencer(state: SimState, rng: () => number): InfluencerEvent | null {
  const { config, beliefs, activeMask } = state;
  const ic = config.influencerConfig;
  if (!ic.enabled) return null;

  const { width, height, neighborhood } = config;
  const n = beliefs.length;

  // Build candidate cells (active only) with homogeneity scores and spawn weights
  const candidates: { idx: number; x: number; y: number; weight: number }[] = [];
  let totalWeight = 0;
  const sMin = Math.max(0.5, Math.min(1, ic.homogeneityThreshold));
  const γ = Math.max(1, Math.min(5, ic.homogeneitySharpness));

  for (let idx = 0; idx < n; idx++) {
    if (!activeMask[idx]) continue;
    const neighbors = getNeighborIndices(idx, width, height, neighborhood);
    const Si = homogeneityScore(idx, beliefs, activeMask, neighbors);
    const raw = Math.max(0, Si - sMin);
    const weight = Math.pow(raw, γ);
    if (weight > 0) {
      const x = idx % width;
      const y = Math.floor(idx / width);
      candidates.push({ idx, x, y, weight });
      totalWeight += weight;
    }
  }

  if (candidates.length === 0 || totalWeight <= 0) return null;

  // Roll for spawn: baseRate chance per timestep, scaled by homogeneity distribution
  if (randomUniform(rng) >= ic.spawnRate) return null;

  // Pick candidate weighted by homogeneity
  let r = randomUniform(rng) * totalWeight;
  let chosen: (typeof candidates)[0] | null = null;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) {
      chosen = c;
      break;
    }
  }
  if (!chosen) chosen = candidates[candidates.length - 1];

  // Local mean at spawn cell
  const neighbors = getNeighborIndices(chosen.idx, width, height, neighborhood);
  let sum = 0;
  let count = 0;
  for (const ni of neighbors) {
    if (activeMask[ni]) {
      sum += beliefs[ni];
      count++;
    }
  }
  const mi = count > 0 ? sum / count : beliefs[chosen.idx];

  // Message: opposite sign, radical magnitude
  const signMi = mi >= 0 ? 1 : -1;
  const radMin = Math.max(0, Math.min(50, ic.radicalMin));
  const radMax = Math.max(radMin, Math.min(50, ic.radicalMax));
  const magnitude = randomInRange(rng, radMin, radMax);
  const message = -signMi * magnitude;

  return {
    originX: chosen.x,
    originY: chosen.y,
    message,
    age: 0,
    ttl: Math.max(1, ic.ttl),
    decayType: ic.decayType,
    decayRate: Math.max(0.1, ic.decayRate),
  };
}

/**
 * Compute influencer delta for a single agent from all active influencers.
 * P(influenced) = e^(-d/R) + ε; if influenced, weight w_i = e^(-d/R).
 * Effect: backlash if sign(b_i) != sign(M) and |M - b_i| > threshold, else persuasion.
 */
function computeAgentInfluencerDelta(
  idx: number,
  bi: number,
  state: SimState,
  rng: () => number
): number {
  const { config, beliefs, activeMask, activeInfluencers } = state;
  const ic = config.influencerConfig;
  if (!ic.enabled || activeInfluencers.length === 0) return 0;

  const width = config.width;
  const x = idx % width;
  const y = Math.floor(idx / width);
  const R = Math.max(1, ic.reachRadius);
  const ε = Math.max(0, Math.min(0.05, ic.reachLeakProbability));
  const α = Math.max(0, Math.min(1, ic.influenceStrength));
  const β = Math.max(0, Math.min(2, ic.backlashStrength));
  const backlashThresh = Math.max(10, Math.min(50, ic.backlashThreshold));

  let totalDelta = 0;

  for (const inf of activeInfluencers) {
    const d = distance(x, y, inf.originX, inf.originY, ic.distanceMetric);
    const decay = decayAmplitude(inf.age, inf.ttl, inf.decayType, inf.decayRate);
    if (decay <= 0) continue;

    const pInfluenced = Math.min(1, Math.exp(-d / R) + ε);
    if (randomUniform(rng) > pInfluenced) continue;

    const w = Math.exp(-d / R) * decay;
    const M = inf.message;

    const signBi = bi >= 0 ? 1 : bi < 0 ? -1 : 0;
    const signM = M >= 0 ? 1 : M < 0 ? -1 : 0;
    const oppositeSide = signBi !== 0 && signM !== 0 && signBi !== signM;
    const gapLarge = Math.abs(M - bi) > backlashThresh;

    if (oppositeSide && gapLarge) {
      totalDelta += β * w * signBi;
    } else {
      totalDelta += α * w * (M - bi);
    }
  }

  return totalDelta;
}

/**
 * Age influencers and remove expired ones. Mutates state.activeInfluencers.
 */
export function ageInfluencers(state: SimState): void {
  const ic = state.config.influencerConfig;
  if (!ic.enabled) return;

  state.activeInfluencers = state.activeInfluencers.filter((inf) => {
    inf.age++;
    return inf.age < inf.ttl;
  });
}

export interface InfluencerDeltasResult {
  deltas: Float32Array;
  /** Number of agents that received non-zero influencer delta this step. */
  influencedCount: number;
  /** Indices of cells that received influencer influence (for flash overlay). */
  affectedIndices: number[];
}

/**
 * Compute influencer deltas for all agents. Returns null if disabled.
 * Caller adds deltas to the local update.
 */
export function computeInfluencerDeltas(state: SimState, rng: () => number): InfluencerDeltasResult | null {
  const { config, beliefs, activeMask } = state;
  if (!config.influencerConfig.enabled) return null;

  const n = beliefs.length;
  const deltas = new Float32Array(n);
  const affectedIndices: number[] = [];
  let influencedCount = 0;

  for (let idx = 0; idx < n; idx++) {
    if (!activeMask[idx]) continue;
    const d = computeAgentInfluencerDelta(idx, beliefs[idx], state, rng);
    deltas[idx] = d;
    if (d !== 0) {
      influencedCount++;
      affectedIndices.push(idx);
    }
  }

  return { deltas, influencedCount, affectedIndices };
}
