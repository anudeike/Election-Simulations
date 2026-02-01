'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfigPanel } from '@/components/ConfigPanel';
import { SimulationCanvas } from '@/components/SimulationCanvas';
import { Histogram } from '@/components/Histogram';
import { ShareHistoryChart, type SharePoint } from '@/components/ShareHistoryChart';
import { BatchShareChart } from '@/components/BatchShareChart';
import { BatchEndDiffChart } from '@/components/BatchEndDiffChart';
import { BatchDiffHistogram } from '@/components/BatchDiffHistogram';
import { ConfigurationGuide } from '@/components/ConfigurationGuide';
import { BeliefColorMap } from '@/components/BeliefColorMap';
import type { SimConfig, SimState, GridViewMode } from '@/lib/sim/types';
import { runOneSimulation, type BatchRunEndStats } from '@/lib/sim/runBatch';
import { DEFAULT_CONFIG, DEFAULT_UPDATE_FUNCTION, DEFAULT_EXTREMITY, DEFAULT_BACKLASH } from '@/lib/sim/types';
import { createSimState, gridDimensions } from '@/lib/sim/init';
import { stepUpdate } from '@/lib/sim/update';
import { runElection } from '@/lib/sim/election';
import { computeHistogram, beliefStats } from '@/lib/sim/histogram';
import { createSeededRng } from '@/lib/rng';

const INITIAL_CONFIG: SimConfig = {
  agentCount: 400,
  width: 20,
  height: 20,
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

export default function Home() {
  const [config, setConfig] = useState<SimConfig>(() => {
    const c = { ...INITIAL_CONFIG, ...DEFAULT_CONFIG };
    const { width, height } = gridDimensions(c.agentCount);
    return { ...c, width, height };
  });

  const [mode, setMode] = useState<'single' | 'batch' | 'guide'>('single');
  const [state, setState] = useState<SimState | null>(null);
  const [shareHistory, setShareHistory] = useState<SharePoint[]>([]);
  const [running, setRunning] = useState(false);
  const [viewMode, setViewMode] = useState<GridViewMode>('belief');
  const [cellSize, setCellSize] = useState(12);

  const [batchNumRuns, setBatchNumRuns] = useState(10);
  const [batchTimesteps, setBatchTimesteps] = useState(100);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ currentRun: number; totalRuns: number } | null>(null);
  const [batchResults, setBatchResults] = useState<SharePoint[][]>([]);
  const [batchEndStats, setBatchEndStats] = useState<BatchRunEndStats[]>([]);
  const batchAbortRef = useRef(false);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumRef = useRef<number>(0);
  const rngRef = useRef<() => number>(() => Math.random() * 0x100000000);

  const getRedShare = useCallback((s: SimState) => {
    let red = 0;
    let total = 0;
    for (let i = 0; i < s.beliefs.length; i++) {
      if (!s.activeMask[i]) continue;
      total++;
      if (s.beliefs[i] >= 0) red++;
    }
    return total > 0 ? (red / total) * 100 : 0;
  }, []);

  const runOneStep = useCallback(
    (s: SimState) => {
      stepUpdate(s, rngRef.current);
      computeHistogram(s);
      runElection(s);
      s.timestep++;
      const red = getRedShare(s);
      setShareHistory((prev) => [...prev, { red, blue: 100 - red }]);
      setState({ ...s });
    },
    [getRedShare]
  );

  const startSim = useCallback(() => {
    const cfg = { ...config };
    const { width, height } = (() => {
      const w = Math.max(1, Math.floor(Math.sqrt(cfg.agentCount)));
      const h = Math.ceil(cfg.agentCount / w);
      return { width: w, height: h };
    })();
    cfg.width = width;
    cfg.height = height;
    setConfig(cfg);
    const s = createSimState(cfg);
    rngRef.current = cfg.seed != null ? createSeededRng(cfg.seed) : () => Math.random() * 0x100000000;
    computeHistogram(s);
    runElection(s);
    const red = (() => {
      let r = 0;
      let total = 0;
      for (let i = 0; i < s.beliefs.length; i++) {
        if (!s.activeMask[i]) continue;
        total++;
        if (s.beliefs[i] >= 0) r++;
      }
      return total > 0 ? (r / total) * 100 : 0;
    })();
    setShareHistory([{ red, blue: 100 - red }]);
    setState(s);
    setRunning(true);
  }, [config]);

  const resetSim = useCallback(() => {
    setRunning(false);
    setState(null);
    setShareHistory([]);
    lastTimeRef.current = 0;
    accumRef.current = 0;
  }, []);

  const runBatch = useCallback(() => {
    const cfg = { ...config };
    const { width, height } = (() => {
      const w = Math.max(1, Math.floor(Math.sqrt(cfg.agentCount)));
      const h = Math.ceil(cfg.agentCount / w);
      return { width: w, height: h };
    })();
    cfg.width = width;
    cfg.height = height;
    setConfig(cfg);
    setBatchRunning(true);
    setBatchProgress({ currentRun: 0, totalRuns: batchNumRuns });
    setBatchResults([]);
    setBatchEndStats([]);
    batchAbortRef.current = false;

    const runHistories: SharePoint[][] = [];
    const endStats: BatchRunEndStats[] = [];
    let runIndex = 0;

    const runNext = () => {
      if (batchAbortRef.current || runIndex >= batchNumRuns) {
        setBatchRunning(false);
        setBatchProgress(null);
        setBatchResults([...runHistories]);
        setBatchEndStats([...endStats]);
        return;
      }
      setBatchProgress({ currentRun: runIndex + 1, totalRuns: batchNumRuns });
      const result = runOneSimulation(cfg, batchTimesteps, runIndex);
      runHistories.push(result.history);
      endStats.push({
        agentDiff: result.agentDiff,
        seatDiff: result.seatDiff,
        mean: result.mean,
        median: result.median,
        redShare: result.redShare,
        blueShare: result.blueShare,
        redSeats: result.redSeats,
        blueSeats: result.blueSeats,
        tieSeats: result.tieSeats,
      });
      setBatchResults([...runHistories]);
      setBatchEndStats([...endStats]);
      runIndex++;
      setTimeout(runNext, 0);
    };
    setTimeout(runNext, 0);
  }, [config, batchNumRuns, batchTimesteps]);

  const cancelBatch = useCallback(() => {
    batchAbortRef.current = true;
  }, []);

  const stateRef = useRef<SimState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    if (!running) return;

    const tick = (now: number) => {
      const s = stateRef.current;
      if (!s) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (lastTimeRef.current === 0) lastTimeRef.current = now;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      accumRef.current += dt * s.config.stepsPerSecond;

      let steps = Math.floor(accumRef.current);
      const maxSteps = s.config.stepsPerFrame;
      steps = Math.min(steps, maxSteps);
      accumRef.current -= steps;

      for (let i = 0; i < steps; i++) {
        if (s.config.maxTimesteps > 0 && s.timestep >= s.config.maxTimesteps) {
          setRunning(false);
          break;
        }
        runOneStep(s);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, runOneStep]);

  const redShare = state ? getRedShare(state) : 0;
  const blueShare = state ? 100 - redShare : 0;
  const redSeats = state ? Array.from(state.districtWinners).filter((w) => w === 1).length : 0;
  const blueSeats = state ? Array.from(state.districtWinners).filter((w) => w === -1).length : 0;
  const tieSeats = state ? Array.from(state.districtWinners).filter((w) => w === 0).length : 0;
  const stats = state ? beliefStats(state.beliefs, state.activeMask) : { mean: 0, median: 0 };

  return (
    <div className="min-h-screen p-4 flex flex-col">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-100">
          Opinion Dynamics & District Elections Simulator
        </h1>
      </header>

      <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2">
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`px-4 py-2 rounded-t text-sm font-medium ${
            mode === 'single' ? 'bg-slate-700 text-slate-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          Single run
        </button>
        <button
          type="button"
          onClick={() => setMode('batch')}
          className={`px-4 py-2 rounded-t text-sm font-medium ${
            mode === 'batch' ? 'bg-slate-700 text-slate-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          Batch run
        </button>
        <button
          type="button"
          onClick={() => setMode('guide')}
          className={`px-4 py-2 rounded-t text-sm font-medium ${
            mode === 'guide' ? 'bg-slate-700 text-slate-100' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          Guide
        </button>
      </div>

      {mode === 'guide' ? (
        <div className="flex-1">
          <ConfigurationGuide />
        </div>
      ) : (
      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        <aside>
          <ConfigPanel config={config} onChange={setConfig} disabled={running || batchRunning} />
          {mode === 'single' && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startSim}
                disabled={running}
                className="px-4 py-2 rounded bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-500"
              >
                Start
              </button>
              <button
                type="button"
                onClick={() => setRunning(false)}
                disabled={!running}
                className="px-4 py-2 rounded bg-amber-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-500"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={() => setRunning(true)}
                disabled={running || !state}
                className="px-4 py-2 rounded bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={() => state && runOneStep(state)}
                disabled={!state || running}
                className="px-4 py-2 rounded bg-slate-600 text-white font-medium disabled:opacity-50 hover:bg-slate-500"
              >
                Step
              </button>
              <button
                type="button"
                onClick={resetSim}
                className="px-4 py-2 rounded bg-slate-600 text-white font-medium hover:bg-slate-500"
              >
                Reset
              </button>
            </div>
          )}
          {mode === 'batch' && (
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Number of runs (X)</label>
                <input
                  type="number"
                  min={2}
                  max={200}
                  value={batchNumRuns}
                  onChange={(e) => setBatchNumRuns(Math.max(2, Math.min(200, +e.target.value || 10)))}
                  disabled={batchRunning}
                  className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Timesteps per run (Y)</label>
                <input
                  type="number"
                  min={10}
                  max={2000}
                  value={batchTimesteps}
                  onChange={(e) => setBatchTimesteps(Math.max(10, Math.min(2000, +e.target.value || 100)))}
                  disabled={batchRunning}
                  className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600 disabled:opacity-60"
                />
              </div>
              <p className="text-xs text-slate-400">
                Same config run X times for Y steps each. Each run gets a different seed (deterministic but varied).
              </p>
              <button
                type="button"
                onClick={runBatch}
                disabled={batchRunning}
                className="px-4 py-2 rounded bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-500"
              >
                Run batch
              </button>
              {batchRunning && (
                <button
                  type="button"
                  onClick={cancelBatch}
                  className="px-4 py-2 rounded bg-amber-600 text-white font-medium hover:bg-amber-500"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col gap-4 min-w-0">
          {mode === 'single' && (
            <>
              <div className="flex gap-2 items-center">
                <span className="text-slate-300 text-sm">View:</span>
                {(['belief', 'district', 'combined'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setViewMode(m)}
                    className={`px-3 py-1 rounded text-sm capitalize ${
                      viewMode === m ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                    }`}
                  >
                    {m}
                  </button>
                ))}
                <span className="text-slate-400 text-sm ml-2">Cell size:</span>
                <input
                  type="range"
                  min={4}
                  max={24}
                  value={cellSize}
                  onChange={(e) => setCellSize(+e.target.value)}
                  className="w-24"
                />
                <span className="text-slate-400 text-sm">{cellSize}</span>
              </div>

              <SimulationCanvas state={state} viewMode={viewMode} cellSize={cellSize} />

              <BeliefColorMap />

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="rounded-lg bg-slate-800/80 border border-slate-700 p-4 min-w-[280px]">
                  <h3 className="text-sm font-semibold text-slate-200 mb-2">Stats</h3>
                  <dl className="grid grid-cols-2 gap-1 text-sm">
                    <dt className="text-slate-400">Timestep</dt>
                    <dd className="text-slate-100">{state?.timestep ?? '—'}</dd>
                    <dt className="text-slate-400">Mean</dt>
                    <dd className="text-slate-100">{state ? stats.mean.toFixed(2) : '—'}</dd>
                    <dt className="text-slate-400">Median</dt>
                    <dd className="text-slate-100">{state ? stats.median.toFixed(2) : '—'}</dd>
                    <dt className="text-slate-400">Red share</dt>
                    <dd className="text-red-400">{state ? `${redShare.toFixed(1)}%` : '—'}</dd>
                    <dt className="text-slate-400">Blue share</dt>
                    <dd className="text-blue-400">{state ? `${blueShare.toFixed(1)}%` : '—'}</dd>
                    <dt className="text-slate-400">Red seats</dt>
                    <dd className="text-red-400">{state ? redSeats : '—'}</dd>
                    <dt className="text-slate-400">Blue seats</dt>
                    <dd className="text-blue-400">{state ? blueSeats : '—'}</dd>
                    <dt className="text-slate-400">Ties</dt>
                    <dd className="text-purple-400">{state ? tieSeats : '—'}</dd>
                  </dl>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-200 mb-2">Belief histogram</h3>
                  <Histogram state={state} width={400} height={160} />
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Red / Blue % over time</h3>
                <ShareHistoryChart history={shareHistory} width={500} height={220} />
              </div>
            </>
          )}

          {mode === 'batch' && (
            <>
              {batchProgress && (
                <div className="rounded-lg bg-slate-800 border border-slate-700 p-3 text-slate-200 text-sm">
                  Running simulation {batchProgress.currentRun} of {batchProgress.totalRuns}…
                </div>
              )}
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">
                  Mean red / blue % over time ({batchResults.length} runs)
                </h3>
                <BatchShareChart runHistories={batchResults} width={560} height={280} />
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">
                  End-of-run Red − Blue (agents & seats) per run
                </h3>
                <BatchEndDiffChart endDiffs={batchEndStats} width={560} height={240} />
              </div>
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-2">
                    Histogram: Red − Blue agents (end of run)
                  </h3>
                  <BatchDiffHistogram
                    values={batchEndStats.map((d) => d.agentDiff)}
                    title="Distribution of agent difference across runs"
                    barColor="rgba(220, 38, 38, 0.8)"
                    width={400}
                    height={220}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-2">
                    Histogram: Red − Blue seats (end of run)
                  </h3>
                  <BatchDiffHistogram
                    values={batchEndStats.map((d) => d.seatDiff)}
                    title="Distribution of seat difference across runs"
                    barColor="rgba(37, 99, 235, 0.8)"
                    width={400}
                    height={220}
                  />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      )}
    </div>
  );
}
