import type { SimConfig, SimState } from './types';
import { createSimState } from './init';

export interface SharePoint {
  red: number;
  blue: number;
}
import { stepUpdate } from './update';
import { runElection } from './election';
import { computeHistogram, beliefStats } from './histogram';
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

  const { mean, median } = beliefStats(s.beliefs, s.activeMask);

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
  };
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

  const red0 = getRedShare(s);
  history.push({ red: red0, blue: 100 - red0 });

  for (let t = 0; t < numSteps - 1; t++) {
    stepUpdate(s, rng);
    computeHistogram(s);
    runElection(s);
    s.timestep++;
    const red = getRedShare(s);
    history.push({ red, blue: 100 - red });
  }

  const endStats = getEndOfRunStats(s);
  return { history, ...endStats };
}
