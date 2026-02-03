import type { SimConfig, SimState, UpdateFunctionConfig, ExtremityConfig, MomentumConfig } from './types';
import { computeBacklashDelta } from './backlash';
import { trySpawnInfluencer, ageInfluencers, computeInfluencerDeltas } from './influencers';
import { randomInRange } from '../rng';

const BELIEF_MIN = -50;
const BELIEF_MAX = 50;

function clampBelief(b: number): number {
  return Math.max(BELIEF_MIN, Math.min(BELIEF_MAX, b));
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Von Neumann: up, down, left, right. Moore: + diagonals.
 */
export function getNeighborIndices(
  idx: number,
  width: number,
  height: number,
  neighborhood: 'von-neumann' | 'moore'
): number[] {
  const x = idx % width;
  const y = Math.floor(idx / width);
  const out: number[] = [];
  const deltas: [number, number][] =
    neighborhood === 'von-neumann'
      ? [[0, -1], [0, 1], [-1, 0], [1, 0]]
      : [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dx, dy] of deltas) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) out.push(ny * width + nx);
  }
  return out;
}

/** Mode 1: s_i = α */
function susceptibilityAverage(di: number, u: Extract<UpdateFunctionConfig, { type: 'average' }>): number {
  return clamp01(u.baseRate);
}

/** Mode 2: s_i = α if d_i ≤ ε else 0 */
function susceptibilityBoundedConfidence(di: number, u: Extract<UpdateFunctionConfig, { type: 'bounded_confidence' }>): number {
  return di <= u.confidenceRadius ? clamp01(u.baseRate) : 0;
}

/** Mode 3: s_i = α · e^{-d_i/τ} */
function susceptibilityExponentialDecay(di: number, u: Extract<UpdateFunctionConfig, { type: 'exponential_decay' }>): number {
  const τ = Math.max(1, u.stubbornScale);
  return clamp01(u.baseRate * Math.exp(-di / τ));
}

/** Mode 4: s_i = α / (1 + (d_i/τ)^p) */
function susceptibilityRationalDecay(di: number, u: Extract<UpdateFunctionConfig, { type: 'rational_decay' }>): number {
  const τ = Math.max(1, u.stubbornScale);
  const p = Math.max(1, Math.min(6, u.shape));
  return clamp01(u.baseRate / (1 + Math.pow(di / τ, p)));
}

/** Mode 5: s_i = α / (1 + e^{k(d_i - τ)}) */
function susceptibilityLogistic(di: number, u: Extract<UpdateFunctionConfig, { type: 'logistic' }>): number {
  const τ = u.stubbornScale;
  const k = Math.max(0.1, Math.min(2, u.steepness));
  return clamp01(u.baseRate / (1 + Math.exp(k * (di - τ))));
}

function computeSusceptibility(di: number, u: UpdateFunctionConfig): number {
  switch (u.type) {
    case 'average':
      return susceptibilityAverage(di, u);
    case 'bounded_confidence':
      return susceptibilityBoundedConfidence(di, u);
    case 'exponential_decay':
      return susceptibilityExponentialDecay(di, u);
    case 'rational_decay':
      return susceptibilityRationalDecay(di, u);
    case 'logistic':
      return susceptibilityLogistic(di, u);
    default:
      return clamp01((u as { baseRate: number }).baseRate);
  }
}

/** Apply extremity modifier: s_final = s · (1 - β e_i), e_i = |b_i|/50 */
function applyExtremity(si: number, belief: number, ext: ExtremityConfig): number {
  if (!ext.enabled || ext.extremityStubbornness <= 0) return si;
  const ei = Math.abs(belief) / 50;
  const β = Math.max(0, Math.min(1, ext.extremityStubbornness));
  return clamp01(si * (1 - β * ei));
}

const CENTER_THRESHOLD = 15;
const EXTREME_THRESHOLD = 35;

function applyVelocityDamping(v: number, bi: number, mc: MomentumConfig): number {
  const d = mc.damping;
  if (!d) return v;
  let out = v;
  if (Math.abs(bi) < CENTER_THRESHOLD && (d.nearCenter ?? 0) > 0) {
    out *= 1 - Math.max(0, Math.min(1, d.nearCenter!));
  }
  if (Math.abs(bi) > EXTREME_THRESHOLD && (d.nearExtremes ?? 0) > 0) {
    out *= 1 - Math.max(0, Math.min(1, d.nearExtremes!));
  }
  return out;
}

/**
 * Common update pipeline: m_i, d_i, s_i, b_new = b_i + s_i(m_i - b_i), clamp.
 * With momentum: v_new = λv + s_i·Δ_i, damp, clamp v, b_new = b_i + v_new.
 * Optional noise after update; extremity applied to s_i.
 */
export function stepUpdate(state: SimState, rng: () => number): void {
  const { config, beliefs, nextBeliefs, activeMask, velocity } = state;
  const { width, height, neighborhood, updateFunction, extremityConfig, backlashConfig, momentumConfig, influencerConfig, noise } = config;
  const n = beliefs.length;
  const useMomentum = momentumConfig.enabled;
  const λ = Math.max(0, Math.min(1, momentumConfig.retention));
  const vMax = Math.max(0, Math.min(10, momentumConfig.maxVelocity));

  state.influencerSpawnedThisStep = false;
  if (influencerConfig.enabled) {
    ageInfluencers(state);
    const spawned = trySpawnInfluencer(state, rng);
    if (spawned) {
      state.activeInfluencers.push(spawned);
      state.influencerSpawnCount++;
      state.influencerSpawnedThisStep = true;
    }
  }

  const influencerResult = influencerConfig.enabled ? computeInfluencerDeltas(state, rng) : null;
  if (influencerResult) {
    state.influencerTotalInfluenced += influencerResult.influencedCount;
    const width = config.width;
    const flashCells = new Set(influencerResult.affectedIndices);
    for (const inf of state.activeInfluencers) {
      flashCells.add(inf.originY * width + inf.originX);
    }
    state.lastInfluencerFlashCells = Array.from(flashCells);
    state.lastInfluencerFlashTimestep = state.timestep;
  }

  for (let idx = 0; idx < n; idx++) {
    if (!activeMask[idx]) {
      nextBeliefs[idx] = beliefs[idx];
      if (useMomentum) velocity[idx] = 0;
      continue;
    }

    const neighbors = getNeighborIndices(idx, width, height, neighborhood);
    const neighborBeliefs: number[] = [];
    let sum = 0;
    for (const ni of neighbors) {
      if (activeMask[ni]) {
        neighborBeliefs.push(beliefs[ni]);
        sum += beliefs[ni];
      }
    }
    const count = neighborBeliefs.length;
    const mi = count > 0 ? sum / count : beliefs[idx];
    const bi = beliefs[idx];
    const di = Math.abs(bi - mi);
    let si = computeSusceptibility(di, updateFunction);
    si = applyExtremity(si, bi, extremityConfig);

    const Δi = computeBacklashDelta(bi, mi, neighborBeliefs, backlashConfig);
    let scaledΔ = si * Δi;
    if (influencerResult) scaledΔ += influencerResult.deltas[idx];

    let newBelief: number;
    if (useMomentum) {
      let vNew = λ * velocity[idx] + scaledΔ;
      vNew = applyVelocityDamping(vNew, bi, momentumConfig);
      vNew = Math.max(-vMax, Math.min(vMax, vNew));
      velocity[idx] = vNew;
      newBelief = bi + vNew;
    } else {
      newBelief = bi + scaledΔ;
    }
    if (noise > 0) newBelief += randomInRange(rng, -noise, noise);
    nextBeliefs[idx] = clampBelief(newBelief);
  }

  state.beliefs = nextBeliefs;
  state.nextBeliefs = beliefs;
}

/** @deprecated Use stepUpdate. Kept for backward compat during migration. */
export function stepNeighborAverage(state: SimState, rng: () => number): void {
  stepUpdate(state, rng);
}
