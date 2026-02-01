/** Update function mode config (discriminated union). */
export type UpdateFunctionConfig =
  | { type: 'average'; baseRate: number }
  | { type: 'bounded_confidence'; baseRate: number; confidenceRadius: number }
  | { type: 'exponential_decay'; baseRate: number; stubbornScale: number }
  | { type: 'rational_decay'; baseRate: number; stubbornScale: number; shape: number }
  | { type: 'logistic'; baseRate: number; stubbornScale: number; steepness: number };

/** Extremity-based stubbornness (applies to all update modes). */
export interface ExtremityConfig {
  enabled: boolean;
  extremityStubbornness: number; // β ∈ [0, 1]
}

/** Backlash: repulsion when exposed to extreme opposing beliefs. */
export interface BacklashConfig {
  enabled: boolean;
  /** When to trigger: gap (|b_j - b_i| > T), extremity (|b_j| > R), or mean (|m_i - b_i| > T). */
  triggerType: 'gap' | 'extremity' | 'mean';
  /** Threshold T or R (0–100 for gap/mean, 0–50 for extremity). */
  threshold: number;
  /** Evaluate trigger per neighbor (Δ_ij per j) or once per agent (single Δ_i). */
  triggerScope: 'per_neighbor' | 'per_agent';
  /** How to apply repulsion: piecewise, smooth (logistic), or identity_push. */
  mode: 'piecewise' | 'smooth' | 'identity_push';
  /** Repulsion strength ρ ∈ [0, 2]. */
  strength: number;
  /** Step size η ∈ [0, 1] (piecewise/smooth). */
  stepSize: number;
  /** Logistic steepness k (smooth mode only). */
  steepness?: number;
  /** Assimilation rate η_a (identity_push). */
  assimilationRate?: number;
  /** Backlash push η_b (identity_push). */
  backlashPush?: number;
  /** Optional max change per step (safety clamp). */
  capPerStep?: number;
}

/** Simulation configuration (locked once run starts). */
export interface SimConfig {
  /** Total agent count (100–5000). */
  agentCount: number;
  /** Grid width (cells). */
  width: number;
  /** Grid height (cells). */
  height: number;
  /** Neighborhood: 'von-neumann' (4) or 'moore' (8). */
  neighborhood: 'von-neumann' | 'moore';
  /** Update function (mode + params). */
  updateFunction: UpdateFunctionConfig;
  /** Extremity-based stubbornness. */
  extremityConfig: ExtremityConfig;
  /** Backlash (repulsion from extreme opposition). */
  backlashConfig: BacklashConfig;
  /** Optional noise added each step [-noise, noise] (0 = off). */
  noise: number;
  /** Initial belief distribution. */
  initialBeliefs: 'uniform' | 'normal' | 'bimodal' | 'perlin';
  /** For normal/bimodal: sigma/spread; for perlin: detail 1–20. */
  initialBeliefParam: number;
  /** Perlin detail (1–20), only when initialBeliefs === 'perlin'. */
  perlinDetail?: number;
  /** Number of districts (2 to N/10). */
  districtCount: number;
  /** Districting method. */
  districtingMethod: 'rectangular' | 'region-growing';
  /** Steps per second (1–60). */
  stepsPerSecond: number;
  /** Steps per frame (1–10). */
  stepsPerFrame: number;
  /** Max timesteps (0 = unlimited). */
  maxTimesteps: number;
  /** Optional seed for deterministic runs. */
  seed: number | null;
  /** Histogram bin count (e.g. 50 or 101). */
  histogramBins: number;
}

/** Runtime simulation state. */
export interface SimState {
  config: SimConfig;
  /** Current timestep (0 = initial). */
  timestep: number;
  /** Beliefs (double-buffered; this is the "current" buffer). */
  beliefs: Float32Array;
  /** Next beliefs (write buffer). */
  nextBeliefs: Float32Array;
  /** District id per cell (-1 = inactive). */
  districtId: Int32Array;
  /** Active cell mask (1 = active, 0 = inactive). */
  activeMask: Uint8Array;
  /** Histogram bins (count per bin). */
  histogramBins: Uint32Array;
  /** Red vote count per district. */
  districtRedCounts: Int32Array;
  /** Blue vote count per district. */
  districtBlueCounts: Int32Array;
  /** District winner: 1 = red, -1 = blue, 0 = tie (purple). */
  districtWinners: Int8Array;
  /** Cached border segments for overlay [x0,y0,x1,y1,...]. */
  borderSegments: number[];
}

/** View mode for the grid. */
export type GridViewMode = 'belief' | 'district' | 'combined';

/** Default update function (rational decay as recommended). */
export const DEFAULT_UPDATE_FUNCTION: UpdateFunctionConfig = {
  type: 'rational_decay',
  baseRate: 0.4,
  stubbornScale: 20,
  shape: 2,
};

/** Default extremity config (disabled). */
export const DEFAULT_EXTREMITY: ExtremityConfig = {
  enabled: false,
  extremityStubbornness: 0,
};

/** Default backlash config (disabled). */
export const DEFAULT_BACKLASH: BacklashConfig = {
  enabled: false,
  triggerType: 'gap',
  threshold: 20,
  triggerScope: 'per_neighbor',
  mode: 'piecewise',
  strength: 1,
  stepSize: 0.3,
  steepness: 0.5,
  assimilationRate: 0.2,
  backlashPush: 2,
  capPerStep: 10,
};

/** Initial config defaults. */
export const DEFAULT_CONFIG: Partial<SimConfig> = {
  agentCount: 400,
  neighborhood: 'von-neumann',
  updateFunction: DEFAULT_UPDATE_FUNCTION,
  extremityConfig: DEFAULT_EXTREMITY,
  backlashConfig: DEFAULT_BACKLASH,
  noise: 0,
  initialBeliefs: 'uniform',
  initialBeliefParam: 15,
  perlinDetail: 10,
  districtCount: 4,
  districtingMethod: 'rectangular',
  stepsPerSecond: 4,
  stepsPerFrame: 1,
  maxTimesteps: 0,
  seed: null,
  histogramBins: 51,
};
