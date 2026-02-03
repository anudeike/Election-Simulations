'use client';

import { useRef } from 'react';
import type { SimConfig, UpdateFunctionConfig, ExtremityConfig, BacklashConfig, MomentumConfig, InfluencerConfig } from '@/lib/sim/types';
import { gridDimensions } from '@/lib/sim/init';
import { parseAndValidateConfig, downloadConfig } from '@/lib/sim/configIO';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleSaveConfig = () => {
    downloadConfig(config);
  };

  const handleUploadConfig = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== 'string') {
        alert('Unable to parse configuration: file could not be read.');
        return;
      }
      const parsed = parseAndValidateConfig(text);
      if (parsed === null) {
        alert('Unable to parse configuration: invalid or malformed JSON.');
        return;
      }
      onChange(parsed);
    };
    reader.onerror = () => {
      alert('Unable to parse configuration: file could not be read.');
    };
    reader.readAsText(file);
  };

  return (
    <div className={cn('flex flex-col gap-4 w-72 p-4 rounded-lg bg-slate-800/80 border border-slate-700', disabled && 'opacity-70 pointer-events-none')}>
      <h2 className="text-lg font-semibold text-slate-100">Configuration</h2>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSaveConfig}
          disabled={disabled}
          className="flex-1 px-3 py-1.5 rounded text-sm bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50"
        >
          Save config
        </button>
        <button
          type="button"
          onClick={handleUploadConfig}
          disabled={disabled}
          className="flex-1 px-3 py-1.5 rounded text-sm bg-slate-600 text-slate-200 hover:bg-slate-500 disabled:opacity-50"
        >
          Upload config
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

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
        <label className="block text-sm text-slate-300 mb-1">Influencer events</label>
        <label className="flex items-center gap-2 text-sm text-slate-300" title="Influencers represent rare, high-impact ideological shocks.">
          <input
            type="checkbox"
            checked={config.influencerConfig.enabled}
            onChange={(e) => update({ influencerConfig: { ...config.influencerConfig, enabled: e.target.checked } })}
            className="rounded"
          />
          Enable
        </label>
        <p className="text-xs text-slate-400 mt-0.5">Rare radical actors with noisy spatial reach. Leak probability allows ideas to spread beyond local neighborhoods.</p>
      </div>
      {config.influencerConfig.enabled && (
        <>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Spawn rate (0.0001–0.01)</label>
            <input
              type="number"
              min={0.0001}
              max={0.01}
              step={0.0001}
              value={config.influencerConfig.spawnRate}
              onChange={(e) =>
                update({
                  influencerConfig: {
                    ...config.influencerConfig,
                    spawnRate: Math.max(0.0001, Math.min(0.01, +e.target.value || 0.0005)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Homogeneity threshold (0.5–1)</label>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={config.influencerConfig.homogeneityThreshold}
              onChange={(e) =>
                update({ influencerConfig: { ...config.influencerConfig, homogeneityThreshold: +e.target.value } })
              }
              className="w-full"
            />
            <span className="text-xs text-slate-400">{config.influencerConfig.homogeneityThreshold}</span>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Homogeneity sharpness γ (1–5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={config.influencerConfig.homogeneitySharpness}
              onChange={(e) =>
                update({
                  influencerConfig: {
                    ...config.influencerConfig,
                    homogeneitySharpness: Math.max(1, Math.min(5, +e.target.value || 3)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Radical min (0–50)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={config.influencerConfig.radicalMin}
              onChange={(e) =>
                update({
                  influencerConfig: {
                    ...config.influencerConfig,
                    radicalMin: Math.max(0, Math.min(50, +e.target.value || 35)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Radical max (0–50)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={config.influencerConfig.radicalMax}
              onChange={(e) =>
                update({
                  influencerConfig: {
                    ...config.influencerConfig,
                    radicalMax: Math.max(0, Math.min(50, +e.target.value || 50)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Reach radius (3–20)</label>
            <input
              type="number"
              min={3}
              max={20}
              value={config.influencerConfig.reachRadius}
              onChange={(e) =>
                update({
                  influencerConfig: {
                    ...config.influencerConfig,
                    reachRadius: Math.max(3, Math.min(20, +e.target.value || 8)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Leak probability (0–0.05)</label>
            <input
              type="number"
              min={0}
              max={0.05}
              step={0.005}
              value={config.influencerConfig.reachLeakProbability}
              onChange={(e) =>
                update({
                  influencerConfig: {
                    ...config.influencerConfig,
                    reachLeakProbability: Math.max(0, Math.min(0.05, +e.target.value || 0.01)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
            <p className="text-xs text-slate-400 mt-0.5">Allows ideas to spread beyond local neighborhoods.</p>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Distance metric</label>
            <select
              value={config.influencerConfig.distanceMetric}
              onChange={(e) =>
                update({
                  influencerConfig: {
                    ...config.influencerConfig,
                    distanceMetric: e.target.value as InfluencerConfig['distanceMetric'],
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            >
              <option value="euclidean">Euclidean</option>
              <option value="chebyshev">Chebyshev</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Influence strength α (0–1)</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.influencerConfig.influenceStrength}
              onChange={(e) =>
                update({ influencerConfig: { ...config.influencerConfig, influenceStrength: +e.target.value } })
              }
              className="w-full"
            />
            <span className="text-xs text-slate-400">{config.influencerConfig.influenceStrength}</span>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Backlash strength β (0–2)</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={config.influencerConfig.backlashStrength}
              onChange={(e) =>
                update({ influencerConfig: { ...config.influencerConfig, backlashStrength: +e.target.value } })
              }
              className="w-full"
            />
            <span className="text-xs text-slate-400">{config.influencerConfig.backlashStrength}</span>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Backlash threshold (10–50)</label>
            <input
              type="number"
              min={10}
              max={50}
              value={config.influencerConfig.backlashThreshold}
              onChange={(e) =>
                update({
                  influencerConfig: {
                    ...config.influencerConfig,
                    backlashThreshold: Math.max(10, Math.min(50, +e.target.value || 20)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">TTL (timesteps)</label>
            <input
              type="number"
              min={1}
              max={200}
              value={config.influencerConfig.ttl}
              onChange={(e) =>
                update({
                  influencerConfig: {
                    ...config.influencerConfig,
                    ttl: Math.max(1, Math.min(200, +e.target.value || 20)),
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Decay type</label>
            <select
              value={config.influencerConfig.decayType}
              onChange={(e) =>
                update({
                  influencerConfig: {
                    ...config.influencerConfig,
                    decayType: e.target.value as InfluencerConfig['decayType'],
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            >
              <option value="none">None</option>
              <option value="linear">Linear</option>
              <option value="exp">Exponential</option>
            </select>
          </div>
          {config.influencerConfig.decayType === 'exp' && (
            <div>
              <label className="block text-sm text-slate-300 mb-1">Decay rate (0.5–5)</label>
              <input
                type="number"
                min={0.5}
                max={5}
                step={0.1}
                value={config.influencerConfig.decayRate}
                onChange={(e) =>
                  update({
                    influencerConfig: {
                      ...config.influencerConfig,
                      decayRate: Math.max(0.5, Math.min(5, +e.target.value || 1)),
                    },
                  })
                }
                className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
              />
              <p className="text-xs text-slate-400 mt-0.5">Higher = faster decay. τ = ttl / decayRate.</p>
            </div>
          )}
        </>
      )}

      <div>
        <label className="block text-sm text-slate-300 mb-1">Belief momentum</label>
        <label className="flex items-center gap-2 text-sm text-slate-300" title="Momentum causes beliefs to continue changing even after influence weakens.">
          <input
            type="checkbox"
            checked={config.momentumConfig.enabled}
            onChange={(e) => update({ momentumConfig: { ...config.momentumConfig, enabled: e.target.checked } })}
            className="rounded"
          />
          Enable
        </label>
      </div>
      {config.momentumConfig.enabled && (
        <>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Momentum retention λ (0–1)</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.momentumConfig.retention}
              onChange={(e) => update({ momentumConfig: { ...config.momentumConfig, retention: +e.target.value } })}
              className="w-full"
            />
            <span className="text-xs text-slate-400">{config.momentumConfig.retention}</span>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Max velocity (0–10)</label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={config.momentumConfig.maxVelocity}
              onChange={(e) => update({ momentumConfig: { ...config.momentumConfig, maxVelocity: Math.max(0, Math.min(10, +e.target.value || 2)) } })}
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Damping near center (0–1)</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={config.momentumConfig.damping?.nearCenter ?? 0}
              onChange={(e) =>
                update({
                  momentumConfig: {
                    ...config.momentumConfig,
                    damping: {
                      ...config.momentumConfig.damping,
                      nearCenter: Math.max(0, Math.min(1, +e.target.value || 0)),
                    },
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
            <p className="text-xs text-slate-400 mt-0.5">Reduces velocity when |b| &lt; 15.</p>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Damping near extremes (0–1)</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={config.momentumConfig.damping?.nearExtremes ?? 0}
              onChange={(e) =>
                update({
                  momentumConfig: {
                    ...config.momentumConfig,
                    damping: {
                      ...config.momentumConfig.damping,
                      nearExtremes: Math.max(0, Math.min(1, +e.target.value || 0)),
                    },
                  },
                })
              }
              className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
            />
            <p className="text-xs text-slate-400 mt-0.5">Reduces velocity when |b| &gt; 35; prevents runaway polarization.</p>
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
        <label className="block text-sm text-slate-300 mb-1">Steps/sec (1–540)</label>
        <input
          type="number"
          min={1}
          max={540}
          value={config.stepsPerSecond}
          onChange={(e) => update({ stepsPerSecond: Math.max(1, Math.min(540, +e.target.value || 4)) })}
          className="w-full px-2 py-1 rounded bg-slate-700 text-slate-100 border border-slate-600"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Steps per frame (1–270)</label>
        <input
          type="number"
          min={1}
          max={270}
          value={config.stepsPerFrame}
          onChange={(e) => update({ stepsPerFrame: Math.max(1, Math.min(270, +e.target.value || 1)) })}
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
