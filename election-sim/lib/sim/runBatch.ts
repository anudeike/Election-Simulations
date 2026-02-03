import type { SimConfig, SimState } from './types';
import { createSimState } from './init';

export interface SharePoint {
  red: number;
  blue: number;
}
import { stepUpdate } from './update';
import { runElection } from './election';
import { computeHistogram, beliefStats, polarizationCount } from './histogram';
import { createSeededRng } from '../rng';

function getRedShare(s: SimState): number {
  let red = 0;
  let total = 0;
  for (let i = 0; i < s.beliefs.length; i++) {
    if (!s.activeMask[i]) continue;
    total++;
    if (s.beliefs[i] >= 0) red++;
  }
  return total > 0 ? (red / total) * 100 : 0;
}

export interface BatchRunEndStats {
  agentDiff: number;
  seatDiff: number;
  mean: number;
  median: number;
  redShare: number;
  blueShare: number;
  redSeats: number;
  blueSeats: number;
  tieSeats: number;
  /** Count of agents >2σ from initial mean at end of run. */
  polarizedFromInitial: number;
  /** Count of agents >2σ from current mean at end of run. */
  outliersFromCurrent: number;
  /** Average |velocity| per timestep (when momentum enabled). */
  avgVelocityMagnitudeHistory: number[];
  /** Count of sign changes in mean belief derivative (oscillations). */
  oscillationCount: number;
  /** First timestep when max|v| < 0.01 for 5 consecutive steps, or -1. */
  timeToStabilization: number;
  /** Influencer metrics (when influencers enabled). */
  influencerEventCount: number;
  /** Average agents influenced per influencer event. */
  influencerAvgReachSize: number;
  /** Belief variance at each timestep. */
  beliefVarianceHistory: number[];
  /** Number of district winner flips during run. */
  districtFlipCount: number;
}

function getEndOfRunStats(s: SimState): BatchRunEndStats {
  let redAgents = 0;
  let total = 0;
  for (let i = 0; i < s.beliefs.length; i++) {
    if (!s.activeMask[i]) continue;
    total++;
    if (s.beliefs[i] >= 0) redAgents++;
  }
  const blueAgents = total - redAgents;
  const agentDiff = redAgents - blueAgents;
  const redShare = total > 0 ? (redAgents / total) * 100 : 0;
  const blueShare = total > 0 ? (blueAgents / total) * 100 : 0;

  const { mean, median, std } = beliefStats(s.beliefs, s.activeMask);
  const polarizedFromInitial = polarizationCount(
    s.beliefs,
    s.activeMask,
    s.initialBeliefMean,
    s.initialBeliefStd,
    2
  );
  const outliersFromCurrent =
    std > 0 ? polarizationCount(s.beliefs, s.activeMask, mean, std, 2) : 0;

  let redSeats = 0;
  let blueSeats = 0;
  let tieSeats = 0;
  for (let d = 0; d < s.districtWinners.length; d++) {
    const w = s.districtWinners[d];
    if (w === 1) redSeats++;
    else if (w === -1) blueSeats++;
    else tieSeats++;
  }
  const seatDiff = redSeats - blueSeats;

  const influencerEventCount = s.influencerSpawnCount ?? 0;
  const influencerTotalInfluenced = s.influencerTotalInfluenced ?? 0;
  const influencerAvgReachSize =
    influencerEventCount > 0 ? influencerTotalInfluenced / influencerEventCount : 0;

  return {
    agentDiff,
    seatDiff,
    mean,
    median,
    redShare,
    blueShare,
    redSeats,
    blueSeats,
    tieSeats,
    polarizedFromInitial,
    outliersFromCurrent,
    avgVelocityMagnitudeHistory: [], // filled in runOneSimulation
    oscillationCount: 0,
    timeToStabilization: -1,
    influencerEventCount,
    influencerAvgReachSize,
    beliefVarianceHistory: [], // filled in runOneSimulation
    districtFlipCount: 0, // filled in runOneSimulation
  };
}

function avgVelocityMagnitude(s: SimState): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < s.velocity.length; i++) {
    if (!s.activeMask[i]) continue;
    sum += Math.abs(s.velocity[i]);
    count++;
  }
  return count > 0 ? sum / count : 0;
}

function maxVelocityMagnitude(s: SimState): number {
  let max = 0;
  for (let i = 0; i < s.velocity.length; i++) {
    if (!s.activeMask[i]) continue;
    const v = Math.abs(s.velocity[i]);
    if (v > max) max = v;
  }
  return max;
}

export interface BatchRunResult {
  history: SharePoint[];
  agentDiff: number;
  seatDiff: number;
  mean: number;
  median: number;
  redShare: number;
  blueShare: number;
  redSeats: number;
  blueSeats: number;
  tieSeats: number;
  polarizedFromInitial: number;
  outliersFromCurrent: number;
  avgVelocityMagnitudeHistory: number[];
  oscillationCount: number;
  timeToStabilization: number;
  influencerEventCount: number;
  influencerAvgReachSize: number;
  beliefVarianceHistory: number[];
  districtFlipCount: number;
}

/**
 * Run a single simulation for `numSteps` timesteps and return share history plus end-of-run red−blue diffs.
 */
export function runOneSimulation(
  config: SimConfig,
  numSteps: number,
  runIndex: number
): BatchRunResult {
  const w = config.width ?? Math.max(1, Math.floor(Math.sqrt(config.agentCount)));
  const h = config.height ?? Math.ceil(config.agentCount / w);
  const cfg: SimConfig = {
    ...config,
    width: w,
    height: h,
    maxTimesteps: 0,
    seed: config.seed != null ? config.seed + runIndex : 10000 + runIndex,
  };
  const s = createSimState(cfg);
  const rng = createSeededRng(cfg.seed!);
  const history: SharePoint[] = [];
  const avgVelocityMagnitudeHistory: number[] = [];
  const beliefVarianceHistory: number[] = [];
  const STAB_THRESHOLD = 0.01;
  const STAB_CONSECUTIVE = 5;
  let oscillationCount = 0;
  let timeToStabilization = -1;
  let prevMeanBelief: number | null = null;
  let prevMeanDirection = 0;
  let stableCount = 0;
  let districtFlipCount = 0;
  let prevDistrictWinners: Int8Array | null = null;

  const red0 = getRedShare(s);
  history.push({ red: red0, blue: 100 - red0 });
  if (cfg.momentumConfig.enabled) {
    avgVelocityMagnitudeHistory.push(avgVelocityMagnitude(s));
  }
  const { std: std0 } = beliefStats(s.beliefs, s.activeMask);
  beliefVarianceHistory.push(std0 * std0);

  for (let t = 0; t < numSteps - 1; t++) {
    stepUpdate(s, rng);
    computeHistogram(s);
    runElection(s);
    s.timestep++;
    const red = getRedShare(s);
    history.push({ red, blue: 100 - red });

    const { std } = beliefStats(s.beliefs, s.activeMask);
    beliefVarianceHistory.push(std * std);

    if (prevDistrictWinners) {
      for (let d = 0; d < s.districtWinners.length; d++) {
        if (s.districtWinners[d] !== prevDistrictWinners[d]) districtFlipCount++;
      }
    }
    prevDistrictWinners = new Int8Array(s.districtWinners);

    if (cfg.momentumConfig.enabled) {
      avgVelocityMagnitudeHistory.push(avgVelocityMagnitude(s));
      const maxV = maxVelocityMagnitude(s);
      if (maxV < STAB_THRESHOLD) {
        stableCount++;
        if (stableCount >= STAB_CONSECUTIVE && timeToStabilization < 0) {
          timeToStabilization = s.timestep;
        }
      } else {
        stableCount = 0;
      }
    }

    const { mean: meanBelief } = beliefStats(s.beliefs, s.activeMask);
    if (prevMeanBelief != null) {
      const dir = meanBelief > prevMeanBelief ? 1 : meanBelief < prevMeanBelief ? -1 : 0;
      if (dir !== 0 && prevMeanDirection !== 0 && dir !== prevMeanDirection) {
        oscillationCount++;
      }
      prevMeanDirection = dir !== 0 ? dir : prevMeanDirection;
    }
    prevMeanBelief = meanBelief;
  }

  const endStats = getEndOfRunStats(s);
  endStats.avgVelocityMagnitudeHistory = avgVelocityMagnitudeHistory;
  endStats.oscillationCount = oscillationCount;
  endStats.timeToStabilization = timeToStabilization;
  endStats.beliefVarianceHistory = beliefVarianceHistory;
  endStats.districtFlipCount = districtFlipCount;
  return { history, ...endStats };
}
