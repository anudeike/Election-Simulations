import type { BacklashConfig } from './types';

/** Opposite side: b_i · b_j < 0 */
function oppositeSide(bi: number, bj: number): boolean {
  return bi * bj < 0;
}

/** Gate g(d) = 1 / (1 + e^{-k(d - T)}) */
function logisticGate(d: number, T: number, k: number): number {
  return 1 / (1 + Math.exp(-k * (d - T)));
}

// --- Trigger checks (per neighbor) ---

/** Gap: |b_j - b_i| > T and opposite side */
export function triggerGapPerNeighbor(bi: number, bj: number, T: number): boolean {
  return oppositeSide(bi, bj) && Math.abs(bj - bi) > T;
}

/** Extremity: |b_j| > R and opposite side */
export function triggerExtremityPerNeighbor(bi: number, bj: number, R: number): boolean {
  return oppositeSide(bi, bj) && Math.abs(bj) > R;
}

/** Mean: |m_i - b_i| > T and b_i · m_i < 0 (evaluated per agent, not per neighbor) */
export function triggerMeanPerAgent(bi: number, mi: number, T: number): boolean {
  return oppositeSide(bi, mi) && Math.abs(mi - bi) > T;
}

/** Per-agent trigger using "any neighbor": true if any neighbor satisfies the per-neighbor condition */
export function triggerPerAgentFromNeighbors(
  bi: number,
  neighborBeliefs: number[],
  config: BacklashConfig
): boolean {
  const { triggerType, threshold } = config;
  for (const bj of neighborBeliefs) {
    if (triggerType === 'gap' && triggerGapPerNeighbor(bi, bj, threshold)) return true;
    if (triggerType === 'extremity' && triggerExtremityPerNeighbor(bi, bj, threshold)) return true;
  }
  return false;
}

// --- Delta computation ---

/**
 * Per-neighbor delta (piecewise): Δ_ij = -ρ(b_j - b_i) if triggered, else (b_j - b_i).
 * Returns aggregate Δ_i = η * (1/count) * Σ_j Δ_ij.
 */
export function computeDeltaPerNeighborPiecewise(
  bi: number,
  neighborBeliefs: number[],
  config: BacklashConfig
): number {
  const { triggerType, threshold, strength: ρ, stepSize: η } = config;
  const count = neighborBeliefs.length;
  if (count === 0) return 0;
  let sum = 0;
  for (const bj of neighborBeliefs) {
    const pull = bj - bi;
    let triggered: boolean;
    if (triggerType === 'gap') triggered = triggerGapPerNeighbor(bi, bj, threshold);
    else if (triggerType === 'extremity') triggered = triggerExtremityPerNeighbor(bi, bj, threshold);
    else triggered = false; // mean not used per-neighbor
    sum += triggered ? -ρ * pull : pull;
  }
  return η * (sum / count);
}

/**
 * Per-neighbor delta (smooth): Δ_ij = (1 - (1+ρ) g(d_ij)) (b_j - b_i), d_ij = |b_j - b_i|.
 * Only apply repulsion when opposite side; otherwise assimilate.
 */
export function computeDeltaPerNeighborSmooth(
  bi: number,
  neighborBeliefs: number[],
  config: BacklashConfig
): number {
  const { triggerType, threshold, strength: ρ, stepSize: η, steepness: k = 0.5 } = config;
  const count = neighborBeliefs.length;
  if (count === 0) return 0;
  const K = Math.max(0.1, Math.min(2, k));
  let sum = 0;
  for (const bj of neighborBeliefs) {
    const pull = bj - bi;
    const d = Math.abs(bj - bi);
    if (!oppositeSide(bi, bj)) {
      sum += pull;
      continue;
    }
    const g = logisticGate(d, threshold, K);
    sum += (1 - (1 + ρ) * g) * pull;
  }
  return η * (sum / count);
}

/**
 * Per-agent delta (piecewise): one trigger; if triggered Δ_i = -ρ(m_i - b_i), else (m_i - b_i).
 */
export function computeDeltaPerAgentPiecewise(
  bi: number,
  mi: number,
  triggered: boolean,
  config: BacklashConfig
): number {
  const { strength: ρ, stepSize: η } = config;
  const pull = mi - bi;
  return η * (triggered ? -ρ * pull : pull);
}

/**
 * Per-agent delta (smooth): Δ_i = (1 - (1+ρ) g(d_i)) (m_i - b_i), d_i = |m_i - b_i|.
 * Only repulsion when opposite side.
 */
export function computeDeltaPerAgentSmooth(
  bi: number,
  mi: number,
  config: BacklashConfig
): number {
  const { strength: ρ, stepSize: η, steepness: k = 0.5 } = config;
  const pull = mi - bi;
  const d = Math.abs(mi - bi);
  const K = Math.max(0.1, Math.min(2, k));
  if (!oppositeSide(bi, mi)) return η * pull;
  const g = logisticGate(d, config.threshold, K);
  return η * (1 - (1 + ρ) * g) * pull;
}

/**
 * Per-agent delta (identity push): when triggered, Δ_i = η_a(m_i - b_i) + η_b·sign(b_i).
 */
export function computeDeltaPerAgentIdentityPush(
  bi: number,
  mi: number,
  triggered: boolean,
  config: BacklashConfig
): number {
  const ηa = config.assimilationRate ?? 0.2;
  const ηb = config.backlashPush ?? 2;
  if (!triggered) return ηa * (mi - bi);
  const signBi = bi > 0 ? 1 : bi < 0 ? -1 : 0;
  return ηa * (mi - bi) + ηb * signBi;
}

/**
 * Compute backlash-aware delta Δ_i for agent i.
 * Returns the value to use in b_i^new = b_i + s_i · Δ_i.
 * When backlash disabled, returns (m_i - b_i) so existing pipeline is unchanged.
 */
export function computeBacklashDelta(
  bi: number,
  mi: number,
  neighborBeliefs: number[],
  config: BacklashConfig
): number {
  if (!config.enabled || neighborBeliefs.length === 0) {
    return mi - bi;
  }

  const { triggerScope, mode, capPerStep } = config;
  let Δi: number;

  if (triggerScope === 'per_neighbor') {
    if (mode === 'piecewise') {
      Δi = computeDeltaPerNeighborPiecewise(bi, neighborBeliefs, config);
    } else if (mode === 'smooth') {
      Δi = computeDeltaPerNeighborSmooth(bi, neighborBeliefs, config);
    } else {
      // identity_push not defined per-neighbor; fall back to piecewise
      Δi = computeDeltaPerNeighborPiecewise(bi, neighborBeliefs, config);
    }
  } else {
    // per_agent
    const triggeredMean = triggerMeanPerAgent(bi, mi, config.threshold);
    const triggeredAny =
      config.triggerType === 'mean'
        ? triggeredMean
        : triggerPerAgentFromNeighbors(bi, neighborBeliefs, config);

    if (mode === 'piecewise') {
      Δi = computeDeltaPerAgentPiecewise(bi, mi, triggeredAny, config);
    } else if (mode === 'smooth') {
      Δi = computeDeltaPerAgentSmooth(bi, mi, config);
    } else {
      Δi = computeDeltaPerAgentIdentityPush(bi, mi, triggeredAny, config);
    }
  }

  if (capPerStep != null && capPerStep > 0) {
    const cap = Math.abs(capPerStep);
    if (Δi > cap) Δi = cap;
    if (Δi < -cap) Δi = -cap;
  }
  return Δi;
}
