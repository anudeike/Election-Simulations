'use client';

import type { SimConfig, UpdateFunctionConfig, ExtremityConfig, BacklashConfig } from '@/lib/sim/types';
import { gridDimensions } from '@/lib/sim/init';
import { cn } from '@/lib/utils';

interface ConfigPanelProps {
  config: SimConfig;
  onChange: (config: SimConfig) => void;
  disabled: boolean;
}

const GRID_PRESETS = [
  { label: '10×10', w: 10, h: 10 },
  { label: '20×20', w: 20, h: 20 },
  { label: '30×30', w: 30, h: 30 },
  { label: '40×40', w: 40, h: 40 },
  { label: '50×50', w: 50, h: 50 },
  { label: 'Custom', w: 0, h: 0 },
];

export function ConfigPanel({ config, onChange, disabled }: ConfigPanelProps) {
  const { width, height } = gridDimensions(config.agentCount);
  const customPreset = GRID_PRESETS.find((p) => p.w === width && p.h === height) ?? GRID_PRESETS[GRID_PRESETS.length - 1];

  const update = (partial: Partial<SimConfig>) => {
    onChange({ ...config, ...partial });
  };

  const setPreset = (w: number, h: number) => {
    if (w > 0 && h > 0) {
      update({ agentCount: w * h });
    }
  };

  return (
    <div className={cn('flex flex-col gap-4 w-72 p-4 rounded-lg bg-slate-800/80 border border-slate-700', disabled && 'opacity-70 pointer-events-none')}>
      <h2 className="text-lg font-semibold text-slate-100">Configuration</h2>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Agent count (100–5000)</label>
        <input
          type="number"
          min={100}
          max={5000}
          value={config.agentCount}
          onChange={(e) => update({ agentCount: Math.max(100, Math.min(5000, +e.target.value || 100)) })}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Grid preset</label>
        <div className="flex flex-wrap gap-1">
          {GRID_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPreset(p.w, p.h)}
              className={cn(
                'px-2 py-1 rounded text-sm',
                p.w === width && p.h === height
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-1">Grid: {width}×{height}</p>
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Neighborhood</label>
        <select
          value={config.neighborhood}
          onChange={(e) => update({ neighborhood: e.target.value as SimConfig['neighborhood'] })}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        >
          <option value="von-neumann">Von Neumann (4)</option>
          <option value="moore">Moore (8)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Update function</label>
        <select
          value={config.updateFunction.type}
          onChange={(e) => {
            const t = e.target.value as UpdateFunctionConfig['type'];
            let u: UpdateFunctionConfig;
            if (t === 'average') u = { type: 'average', baseRate: 1 };
            else if (t === 'bounded_confidence') u = { type: 'bounded_confidence', baseRate: 0.3, confidenceRadius: 15 };
            else if (t === 'exponential_decay') u = { type: 'exponential_decay', baseRate: 0.4, stubbornScale: 15 };
            else if (t === 'rational_decay') u = { type: 'rational_decay', baseRate: 0.4, stubbornScale: 20, shape: 2 };
            else u = { type: 'logistic', baseRate: 0.4, stubbornScale: 15, steepness: 0.5 };
            update({ updateFunction: u });
          }}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        >
          <option value="average">Pure average (α)</option>
          <option value="bounded_confidence">Bounded confidence (ε)</option>
          <option value="exponential_decay">Exponential decay (τ)</option>
          <option value="rational_decay">Rational decay (τ, p)</option>
          <option value="logistic">Logistic gate (τ, k)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1">Base rate α (0–1)</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={config.updateFunction.baseRate}
          onChange={(e) => update({ updateFunction: { ...config.updateFunction, baseRate: +e.target.value } })}
          className="w-full"
        />
        <span className="text-xs text-slate-400">{config.updateFunction.baseRate}</span>
      </div>
      {config.updateFunction.type === 'bounded_confidence' && (
        <div>
          <label className="block text-sm text-slate-300 mb-1">Confidence radius ε (0–100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={config.updateFunction.confidenceRadius}
            onChange={(e) =>
              update({
                updateFunction: {
                  type: 'bounded_confidence',
                  baseRate: config.updateFunction.baseRate,
                  confidenceRadius: Math.max(0, Math.min(100, +e.target.value || 15)),
                },
              })
            }
            className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
          />
        </div>
      )}
      {(config.updateFunction.type === 'exponential_decay' || config.updateFunction.type === 'rational_decay' || config.updateFunction.type === 'logistic') && (
        <div>
          <label className="block text-sm text-slate-300 mb-1">Stubborn scale τ (1–100)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={'stubbornScale' in config.updateFunction ? config.updateFunction.stubbornScale : 15}
            onChange={(e) => {
              const τ = Math.max(1, Math.min(100, +e.target.value || 15));
              const u = config.updateFunction;
              if (u.type === 'exponential_decay') update({ updateFunction: { type: 'exponential_decay', baseRate: u.baseRate, stubbornScale: τ } });
              else if (u.type === 'rational_decay') update({ updateFunction: { type: 'rational_decay', baseRate: u.baseRate, stubbornScale: τ, shape: u.shape } });
              else if (u.type === 'logistic') update({ updateFunction: { type: 'logistic', baseRate: u.baseRate, stubbornScale: τ, steepness: u.steepness } });
            }}
            className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
          />
        </div>
      )}
      {config.updateFunction.type === 'rational_decay' && (() => {
        const u = config.updateFunction;
        return (
          <div>
            <label className="block text-sm text-slate-300 mb-1">Shape p (1–6)</label>
            <input
              type="number"
              min={1}
              max={6}
              value={u.shape}
              onChange={(e) =>
                update({
                  updateFunction: {
                    type: 'rational_decay',
                    baseRate: u.baseRate,
                    stubbornScale: u.stubbornScale,
                    shape: Math.max(1, Math.min(6, +e.target.value || 2)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
        );
      })()}
      {config.updateFunction.type === 'logistic' && (() => {
        const u = config.updateFunction;
        return (
          <div>
            <label className="block text-sm text-slate-300 mb-1">Steepness k (0.1–2)</label>
            <input
              type="number"
              min={0.1}
              max={2}
              step={0.1}
              value={u.steepness}
              onChange={(e) =>
                update({
                  updateFunction: {
                    type: 'logistic',
                    baseRate: u.baseRate,
                    stubbornScale: u.stubbornScale,
                    steepness: Math.max(0.1, Math.min(2, +e.target.value || 0.5)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
        );
      })()}
      <div>
        <label className="block text-sm text-slate-300 mb-1">Step noise (0–5)</label>
        <input
          type="range"
          min={0}
          max={5}
          step={0.1}
          value={config.noise}
          onChange={(e) => update({ noise: +e.target.value })}
          className="w-full"
        />
        <span className="text-xs text-slate-400">{config.noise}</span>
      </div>
      <div>
        <label className="block text-sm text-slate-300 mb-1">Extremity stubbornness</label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={config.extremityConfig.enabled}
            onChange={(e) => update({ extremityConfig: { ...config.extremityConfig, enabled: e.target.checked } })}
            className="rounded"
          />
          Enable (β)
        </label>
        {config.extremityConfig.enabled && (
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.extremityConfig.extremityStubbornness}
            onChange={(e) => update({ extremityConfig: { ...config.extremityConfig, extremityStubbornness: +e.target.value } })}
            className="w-full mt-1"
          />
        )}
        {config.extremityConfig.enabled && <span className="text-xs text-slate-400">{config.extremityConfig.extremityStubbornness}</span>}
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Backlash</label>
        <label className="flex items-center gap-2 text-sm text-slate-300" title="Backlash causes agents to move away from extreme opposing beliefs.">
          <input
            type="checkbox"
            checked={config.backlashConfig.enabled}
            onChange={(e) => update({ backlashConfig: { ...config.backlashConfig, enabled: e.target.checked } })}
            className="rounded"
          />
          Enable
        </label>
      </div>
      {config.backlashConfig.enabled && (
        <>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Trigger type</label>
            <select
              value={config.backlashConfig.triggerType}
              onChange={(e) => update({ backlashConfig: { ...config.backlashConfig, triggerType: e.target.value as BacklashConfig['triggerType'] } })}
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            >
              <option value="gap">Gap (|b_j − b_i| &gt; T)</option>
              <option value="extremity">Extremity (|b_j| &gt; R)</option>
              <option value="mean">Mean (|m_i − b_i| &gt; T)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Trigger scope</label>
            <select
              value={config.backlashConfig.triggerScope}
              onChange={(e) => update({ backlashConfig: { ...config.backlashConfig, triggerScope: e.target.value as BacklashConfig['triggerScope'] } })}
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            >
              <option value="per_neighbor">Per neighbor</option>
              <option value="per_agent">Per agent</option>
            </select>
            <p className="text-xs text-slate-400 mt-0.5">Per neighbor: check each j. Per agent: one check per agent.</p>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Threshold {config.backlashConfig.triggerType === 'extremity' ? 'R (0–50)' : 'T (0–100)'}
            </label>
            <input
              type="number"
              min={config.backlashConfig.triggerType === 'extremity' ? 0 : 0}
              max={config.backlashConfig.triggerType === 'extremity' ? 50 : 100}
              value={config.backlashConfig.threshold}
              onChange={(e) =>
                update({
                  backlashConfig: {
                    ...config.backlashConfig,
                    threshold: config.backlashConfig.triggerType === 'extremity'
                      ? Math.max(0, Math.min(50, +e.target.value || 15))
                      : Math.max(0, Math.min(100, +e.target.value || 20)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Backlash mode</label>
            <select
              value={config.backlashConfig.mode}
              onChange={(e) => update({ backlashConfig: { ...config.backlashConfig, mode: e.target.value as BacklashConfig['mode'] } })}
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            >
              <option value="piecewise">Piecewise (assimilation vs repulsion)</option>
              <option value="smooth">Smooth (logistic repulsion)</option>
              <option value="identity_push">Identity push</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Strength ρ (0–2)</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={config.backlashConfig.strength}
              onChange={(e) => update({ backlashConfig: { ...config.backlashConfig, strength: +e.target.value } })}
              className="w-full"
            />
            <span className="text-xs text-slate-400">{config.backlashConfig.strength}</span>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Step size η (0–1)</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.backlashConfig.stepSize}
              onChange={(e) => update({ backlashConfig: { ...config.backlashConfig, stepSize: +e.target.value } })}
              className="w-full"
            />
            <span className="text-xs text-slate-400">{config.backlashConfig.stepSize}</span>
          </div>
          {config.backlashConfig.mode === 'smooth' && (
            <div>
              <label className="block text-sm text-slate-300 mb-1">Steepness k (0.1–2)</label>
              <input
                type="number"
                min={0.1}
                max={2}
                step={0.1}
                value={config.backlashConfig.steepness ?? 0.5}
                onChange={(e) => update({ backlashConfig: { ...config.backlashConfig, steepness: Math.max(0.1, Math.min(2, +e.target.value || 0.5)) } })}
                className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
              />
            </div>
          )}
          {config.backlashConfig.mode === 'identity_push' && (
            <>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Assimilation rate η_a</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.backlashConfig.assimilationRate ?? 0.2}
                  onChange={(e) => update({ backlashConfig: { ...config.backlashConfig, assimilationRate: Math.max(0, Math.min(1, +e.target.value || 0.2)) } })}
                  className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Backlash push η_b</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={config.backlashConfig.backlashPush ?? 2}
                  onChange={(e) => update({ backlashConfig: { ...config.backlashConfig, backlashPush: Math.max(0, Math.min(10, +e.target.value || 2)) } })}
                  className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm text-slate-300 mb-1">Cap per step (0 = off)</label>
            <input
              type="number"
              min={0}
              max={20}
              value={config.backlashConfig.capPerStep ?? 0}
              onChange={(e) => update({ backlashConfig: { ...config.backlashConfig, capPerStep: Math.max(0, Math.min(20, +e.target.value || 0)) } })}
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm text-slate-300 mb-1">Initial beliefs</label>
        <select
          value={config.initialBeliefs}
          onChange={(e) => update({ initialBeliefs: e.target.value as SimConfig['initialBeliefs'] })}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        >
          <option value="uniform">Uniform [-50, 50]</option>
          <option value="normal">Normal(0, σ)</option>
          <option value="bimodal">Bimodal ±μ</option>
          <option value="perlin">Spatial (Perlin)</option>
        </select>
      </div>
      {(config.initialBeliefs === 'normal' || config.initialBeliefs === 'bimodal') && (
        <div>
          <label className="block text-sm text-slate-300 mb-1">σ / spread</label>
          <input
            type="number"
            min={1}
            max={50}
            value={config.initialBeliefParam}
            onChange={(e) => update({ initialBeliefParam: Math.max(1, Math.min(50, +e.target.value || 15)) })}
            className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
          />
        </div>
      )}
      {config.initialBeliefs === 'perlin' && (
        <div>
          <label className="block text-sm text-slate-300 mb-1">Detail (1–20, higher = finer)</label>
          <input
            type="number"
            min={1}
            max={20}
            value={config.perlinDetail ?? 10}
            onChange={(e) => update({ perlinDetail: Math.max(1, Math.min(20, +e.target.value || 10)) })}
            className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
          />
          <p className="text-xs text-slate-400 mt-1">Spatial variation: low = smooth blobs, high = detailed.</p>
        </div>
      )}

      <div>
        <label className="block text-sm text-slate-300 mb-1">Districts (2–{Math.max(2, Math.floor(config.agentCount / 10))})</label>
        <input
          type="number"
          min={2}
          max={Math.max(2, Math.floor(config.agentCount / 10))}
          value={config.districtCount}
          onChange={(e) => update({ districtCount: Math.max(2, Math.min(Math.floor(config.agentCount / 10), +e.target.value || 4)) })}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Districting</label>
        <select
          value={config.districtingMethod}
          onChange={(e) => update({ districtingMethod: e.target.value as SimConfig['districtingMethod'] })}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        >
          <option value="rectangular">Rectangular</option>
          <option value="region-growing">Region growing (scaffold)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Steps/sec (1–60)</label>
        <input
          type="number"
          min={1}
          max={60}
          value={config.stepsPerSecond}
          onChange={(e) => update({ stepsPerSecond: Math.max(1, Math.min(60, +e.target.value || 4)) })}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Steps per frame (1–10)</label>
        <input
          type="number"
          min={1}
          max={10}
          value={config.stepsPerFrame}
          onChange={(e) => update({ stepsPerFrame: Math.max(1, Math.min(10, +e.target.value || 1)) })}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Max timesteps (0 = ∞)</label>
        <input
          type="number"
          min={0}
          value={config.maxTimesteps}
          onChange={(e) => update({ maxTimesteps: Math.max(0, +e.target.value || 0) })}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Seed (optional, deterministic)</label>
        <input
          type="number"
          min={0}
          value={config.seed ?? ''}
          placeholder="random"
          onChange={(e) => update({ seed: e.target.value === '' ? null : Math.max(0, +e.target.value) })}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        />
      </div>
    </div>
  );
}
