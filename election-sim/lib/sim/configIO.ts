import type { SimConfig, UpdateFunctionConfig, ExtremityConfig, BacklashConfig, MomentumConfig } from './types';
import { gridDimensions } from './init';
import {
  DEFAULT_UPDATE_FUNCTION,
  DEFAULT_EXTREMITY,
  DEFAULT_BACKLASH,
  DEFAULT_MOMENTUM,
} from './types';

const UPDATE_TYPES = ['average', 'bounded_confidence', 'exponential_decay', 'rational_decay', 'logistic'] as const;
const NEIGHBORHOODS = ['von-neumann', 'moore'] as const;
const INITIAL_BELIEFS = ['uniform', 'normal', 'bimodal', 'perlin'] as const;
const DISTRICTING = ['rectangular', 'region-growing'] as const;
const TRIGGER_TYPES = ['gap', 'extremity', 'mean'] as const;
const TRIGGER_SCOPES = ['per_neighbor', 'per_agent'] as const;
const BACKLASH_MODES = ['piecewise', 'smooth', 'identity_push'] as const;

function isObject(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === 'object' && !Array.isArray(x);
}

function isNum(x: unknown): x is number {
  return typeof x === 'number' && !Number.isNaN(x);
}

function validateUpdateFunction(u: unknown): UpdateFunctionConfig | null {
  if (!isObject(u) || typeof u.type !== 'string') return null;
  const type = u.type as string;
  if (!UPDATE_TYPES.includes(type as (typeof UPDATE_TYPES)[number])) return null;
  const baseRate = isNum(u.baseRate) ? u.baseRate : 0.4;
  switch (type) {
    case 'average':
      return { type: 'average', baseRate };
    case 'bounded_confidence':
      return {
        type: 'bounded_confidence',
        baseRate,
        confidenceRadius: isNum(u.confidenceRadius) ? u.confidenceRadius : 15,
      };
    case 'exponential_decay':
      return {
        type: 'exponential_decay',
        baseRate,
        stubbornScale: isNum(u.stubbornScale) ? u.stubbornScale : 15,
      };
    case 'rational_decay':
      return {
        type: 'rational_decay',
        baseRate,
        stubbornScale: isNum(u.stubbornScale) ? u.stubbornScale : 20,
        shape: isNum(u.shape) ? u.shape : 2,
      };
    case 'logistic':
      return {
        type: 'logistic',
        baseRate,
        stubbornScale: isNum(u.stubbornScale) ? u.stubbornScale : 15,
        steepness: isNum(u.steepness) ? u.steepness : 0.5,
      };
    default:
      return null;
  }
}

function validateExtremityConfig(e: unknown): ExtremityConfig {
  if (!isObject(e)) return DEFAULT_EXTREMITY;
  return {
    enabled: e.enabled === true,
    extremityStubbornness: isNum(e.extremityStubbornness)
      ? Math.max(0, Math.min(1, e.extremityStubbornness))
      : 0,
  };
}

function validateBacklashConfig(b: unknown): BacklashConfig {
  if (!isObject(b)) return DEFAULT_BACKLASH;
  const cfg = { ...DEFAULT_BACKLASH };
  cfg.enabled = b.enabled === true;
  if (typeof b.triggerType === 'string' && TRIGGER_TYPES.includes(b.triggerType as (typeof TRIGGER_TYPES)[number])) {
    cfg.triggerType = b.triggerType as BacklashConfig['triggerType'];
  }
  if (typeof b.triggerScope === 'string' && TRIGGER_SCOPES.includes(b.triggerScope as (typeof TRIGGER_SCOPES)[number])) {
    cfg.triggerScope = b.triggerScope as BacklashConfig['triggerScope'];
  }
  if (isNum(b.threshold)) cfg.threshold = b.threshold;
  if (typeof b.mode === 'string' && BACKLASH_MODES.includes(b.mode as (typeof BACKLASH_MODES)[number])) {
    cfg.mode = b.mode as BacklashConfig['mode'];
  }
  if (isNum(b.strength)) cfg.strength = Math.max(0, Math.min(2, b.strength));
  if (isNum(b.stepSize)) cfg.stepSize = Math.max(0, Math.min(1, b.stepSize));
  if (isNum(b.steepness)) cfg.steepness = b.steepness;
  if (isNum(b.assimilationRate)) cfg.assimilationRate = b.assimilationRate;
  if (isNum(b.backlashPush)) cfg.backlashPush = b.backlashPush;
  if (isNum(b.capPerStep)) cfg.capPerStep = b.capPerStep;
  return cfg;
}

function validateMomentumConfig(m: unknown): MomentumConfig {
  if (!isObject(m)) return DEFAULT_MOMENTUM;
  const cfg = { ...DEFAULT_MOMENTUM };
  cfg.enabled = m.enabled === true;
  if (isNum(m.retention)) cfg.retention = Math.max(0, Math.min(1, m.retention));
  if (isNum(m.maxVelocity)) cfg.maxVelocity = Math.max(0, Math.min(10, m.maxVelocity));
  if (isObject(m.damping)) {
    cfg.damping = {
      nearCenter: isNum(m.damping.nearCenter) ? Math.max(0, Math.min(1, m.damping.nearCenter)) : 0,
      nearExtremes: isNum(m.damping.nearExtremes) ? Math.max(0, Math.min(1, m.damping.nearExtremes)) : 0,
    };
  }
  return cfg;
}

/**
 * Parse JSON string and validate as SimConfig. Returns null if invalid.
 */
export function parseAndValidateConfig(json: string): SimConfig | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isObject(raw)) return null;

  const agentCount = isNum(raw.agentCount) ? Math.max(100, Math.min(5000, raw.agentCount)) : 400;
  const { width, height } = gridDimensions(agentCount);

  const updateFunction = validateUpdateFunction(raw.updateFunction);
  if (!updateFunction) return null;

  const extremityConfig = validateExtremityConfig(raw.extremityConfig);
  const backlashConfig = validateBacklashConfig(raw.backlashConfig);
  const momentumConfig = validateMomentumConfig(raw.momentumConfig);

  const neighborhood =
    typeof raw.neighborhood === 'string' && NEIGHBORHOODS.includes(raw.neighborhood as (typeof NEIGHBORHOODS)[number])
      ? (raw.neighborhood as SimConfig['neighborhood'])
      : 'von-neumann';

  const initialBeliefs =
    typeof raw.initialBeliefs === 'string' && INITIAL_BELIEFS.includes(raw.initialBeliefs as (typeof INITIAL_BELIEFS)[number])
      ? (raw.initialBeliefs as SimConfig['initialBeliefs'])
      : 'uniform';

  const districtingMethod =
    typeof raw.districtingMethod === 'string' && DISTRICTING.includes(raw.districtingMethod as (typeof DISTRICTING)[number])
      ? (raw.districtingMethod as SimConfig['districtingMethod'])
      : 'rectangular';

  const districtCount = isNum(raw.districtCount)
    ? Math.max(2, Math.min(Math.floor(agentCount / 10), Math.round(raw.districtCount)))
    : 4;

  const config: SimConfig = {
    agentCount,
    width,
    height,
    neighborhood,
    updateFunction,
    extremityConfig,
    backlashConfig,
    momentumConfig,
    noise: isNum(raw.noise) ? Math.max(0, Math.min(5, raw.noise)) : 0,
    initialBeliefs,
    initialBeliefParam: isNum(raw.initialBeliefParam) ? Math.max(1, Math.min(50, raw.initialBeliefParam)) : 15,
    perlinDetail: isNum(raw.perlinDetail) ? Math.max(1, Math.min(20, raw.perlinDetail)) : 10,
    districtCount,
    districtingMethod,
    stepsPerSecond: isNum(raw.stepsPerSecond) ? Math.max(1, Math.min(540, raw.stepsPerSecond)) : 4,
    stepsPerFrame: isNum(raw.stepsPerFrame) ? Math.max(1, Math.min(270, raw.stepsPerFrame)) : 1,
    maxTimesteps: isNum(raw.maxTimesteps) ? Math.max(0, raw.maxTimesteps) : 0,
    seed: raw.seed === null || (isNum(raw.seed) && raw.seed >= 0) ? (raw.seed as number | null) : null,
    histogramBins: isNum(raw.histogramBins) ? Math.max(10, Math.min(201, Math.round(raw.histogramBins))) : 51,
  };
  return config;
}

/**
 * Serialize config to JSON string (excludes width/height for portability; they are derived from agentCount).
 */
export function serializeConfig(config: SimConfig): string {
  const { width: _w, height: _h, ...rest } = config;
  return JSON.stringify(rest, null, 2);
}

/**
 * Trigger download of config as JSON file.
 */
export function downloadConfig(config: SimConfig, filename = 'election-sim-config.json'): void {
  const json = serializeConfig(config);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
