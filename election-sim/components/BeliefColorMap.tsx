'use client';

/**
 * Color map legend: belief [-50, 50] → blue → white → red.
 * Matches the gradient used in SimulationCanvas.
 */
export function BeliefColorMap() {
  const width = 280;
  const height = 24;
  const labelY = height + 16;

  return (
    <div className="rounded-lg bg-slate-800/80 border border-slate-700 p-3 inline-block">
      <div className="text-xs text-slate-300 mb-2 font-medium">Belief color map</div>
      <svg width={width} height={height + 24} className="block">
        <defs>
          <linearGradient id="belief-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(0, 0, 255)" />
            <stop offset="50%" stopColor="rgb(255, 255, 255)" />
            <stop offset="100%" stopColor="rgb(255, 0, 0)" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={width} height={height} fill="url(#belief-gradient)" rx={2} />
        <text x={0} y={labelY} fill="rgb(148, 163, 184)" className="text-xs" textAnchor="start">−50</text>
        <text x={width / 2} y={labelY} fill="rgb(148, 163, 184)" className="text-xs" textAnchor="middle">0</text>
        <text x={width} y={labelY} fill="rgb(148, 163, 184)" className="text-xs" textAnchor="end">+50</text>
      </svg>
      <div className="flex justify-between text-xs text-slate-400 mt-0.5">
        <span>blue (blue vote)</span>
        <span>white</span>
        <span>red (red vote)</span>
      </div>
      <p className="text-xs text-slate-500 mt-1">Belief &lt; 0 → blue; belief ≥ 0 → red. Color = numeric belief in [−50, 50].</p>
    </div>
  );
}
