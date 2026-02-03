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

/** Belief momentum: inertia and overshoot in belief change. */
export interface MomentumConfig {
  enabled: boolean;
  /** λ ∈ [0, 1]: fraction of velocity retained each step. */
  retention: number;
  /** Max velocity magnitude (configurable cap). */
  maxVelocity: number;
  /** Optional damping: reduces velocity in certain belief zones. */
  damping?: {
    /** Multiplier (0–1) when |b| < 15: v *= (1 - nearCenter). */
    nearCenter?: number;
    /** Multiplier (0–1) when |b| > 35: v *= (1 - nearExtremes). */
    nearExtremes?: number;
  };
}

/** Influencer events: rare, radical actors with noisy spatial reach. */
export interface InfluencerConfig {
  enabled: boolean;
  /** Base spawn probability per timestep (e.g. 0.0001–0.001). */
  spawnRate: number;
  /** Homogeneity threshold s_min ∈ [0.5, 1]; spawn bias toward uniform regions. */
  homogeneityThreshold: number;
  /** Homogeneity sharpness γ ∈ [1, 5]. */
  homogeneitySharpness: number;
  /** Message magnitude range (radical). */
  radicalMin: number;
  radicalMax: number;
  /** Base reach radius R ∈ [3, 20]. */
  reachRadius: number;
  /** Global leak probability ε ∈ [0, 0.05]. */
  reachLeakProbability: number;
  /** Distance metric for reach. */
  distanceMetric: 'euclidean' | 'chebyshev';
  /** Persuasion strength α ∈ [0, 1]. */
  influenceStrength: number;
  /** Backlash strength β ∈ [0, 2]. */
  backlashStrength: number;
  /** Backlash threshold (10–50); |M - b_i| > this triggers reactance. */
  backlashThreshold: number;
  /** Time-to-live (timesteps). */
  ttl: number;
  /** Decay type. */
  decayType: 'none' | 'linear' | 'exp';
  /** For exp: τ = ttl / decayRate; higher = faster decay. */
  decayRate: number;
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
  /** Belief momentum (inertia, overshoot). */
  momentumConfig: MomentumConfig;
  /** Influencer events (rare, radical actors). */
  influencerConfig: InfluencerConfig;
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
  /** Mean of beliefs at t=0 (for polarization vs. initial). */
  initialBeliefMean: number;
  /** Std dev of beliefs at t=0 (for polarization vs. initial). */
  initialBeliefStd: number;
  /** Belief velocity (momentum) per agent; parallel to beliefs. */
  velocity: Float32Array;
  /** Active influencer events (mutable; managed by update). */
  activeInfluencers: InfluencerEvent[];
  /** Count of influencer spawns this run (for batch metrics). */
  influencerSpawnCount: number;
  /** Total agent-steps influenced this run (for batch metrics). */
  influencerTotalInfluenced: number;
  /** Cells to flash yellow (influencer origins + affected). Updated each step. */
  lastInfluencerFlashCells: number[];
  /** Timestep when lastInfluencerFlashCells was set (for fade). */
  lastInfluencerFlashTimestep: number;
  /** True when an influencer spawned this step (for UI notification). */
  influencerSpawnedThisStep: boolean;
}

/** Active influencer event at runtime. */
export interface InfluencerEvent {
  /** Origin cell x. */
  originX: number;
  /** Origin cell y. */
  originY: number;
  /** Message (radical belief value). */
  message: number;
  /** Age in timesteps (0 = just spawned). */
  age: number;
  /** Time-to-live. */
  ttl: number;
  /** Decay type. */
  decayType: 'none' | 'linear' | 'exp';
  /** For exp decay: τ = ttl / decayRate. */
  decayRate: number;
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

/** Default momentum config (disabled). */
export const DEFAULT_MOMENTUM: MomentumConfig = {
  enabled: false,
  retention: 0.7,
  maxVelocity: 2,
  damping: { nearCenter: 0, nearExtremes: 0 },
};

/** Default influencer config (disabled). */
export const DEFAULT_INFLUENCER: InfluencerConfig = {
  enabled: false,
  spawnRate: 0.0005,
  homogeneityThreshold: 0.85,
  homogeneitySharpness: 3,
  radicalMin: 35,
  radicalMax: 50,
  reachRadius: 8,
  reachLeakProbability: 0.01,
  distanceMetric: 'euclidean',
  influenceStrength: 0.3,
  backlashStrength: 1,
  backlashThreshold: 20,
  ttl: 20,
  decayType: 'linear',
  decayRate: 1,
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
  momentumConfig: DEFAULT_MOMENTUM,
  influencerConfig: DEFAULT_INFLUENCER,
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
