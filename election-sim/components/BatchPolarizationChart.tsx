'use client';

import { useRef, useEffect, useCallback } from 'react';

export interface PolarizationPoint {
  polarizedFromInitial: number;
  outliersFromCurrent: number;
}

interface BatchPolarizationChartProps {
  /** End-of-run polarization counts per run. */
  data: PolarizationPoint[];
  width: number;
  height: number;
}

export function BatchPolarizationChart({ data, width, height }: BatchPolarizationChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    const pad = { left: 44, right: 16, top: 12, bottom: 28 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const n = data.length;
    const maxRun = Math.max(1, n);

    const polarized = data.map((d) => d.polarizedFromInitial);
    const outliers = data.map((d) => d.outliersFromCurrent);
    const minVal = Math.min(0, ...polarized, ...outliers);
    const maxVal = Math.max(1, ...polarized, ...outliers);
    const range = maxVal - minVal || 1;

    const x = (runIdx: number) =>
      pad.left + (runIdx / Math.max(1, maxRun - 1)) * chartW;
    const y = (v: number) => pad.top + chartH - ((v - minVal) / range) * chartH;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + chartH / 2);
    ctx.lineTo(pad.left + chartW, pad.top + chartH / 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(maxVal)), pad.left - 4, pad.top + 10);
    ctx.fillText(String(Math.round(minVal)), pad.left - 4, pad.top + chartH - 2);

    for (let i = 0; i < n; i++) {
      const px = x(i);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.beginPath();
      ctx.arc(px, y(polarized[i]), 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(20, 184, 166, 0.8)';
      ctx.beginPath();
      ctx.arc(px, y(outliers[i]), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgb(245, 158, 11)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x(i);
      const py = y(polarized[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgb(20, 184, 166)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x(i);
      const py = y(outliers[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 8))) {
      ctx.fillText(String(i + 1), x(i), height - 8);
    }
  }, [data, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (data.length === 0) {
    return (
      <div
        className="rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm"
        style={{ width, height }}
      >
        Run a batch to see polarized & outlier counts per run
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
      <div className="px-2 pt-1 flex gap-4 text-xs flex-wrap">
        <span className="text-amber-400">— Polarized (vs. initial)</span>
        <span className="text-teal-400">— Outliers (vs. current)</span>
      </div>
      <div className="text-xs text-slate-400 px-2">
        Count of agents &gt;2σ from initial mean (amber) and from current mean (teal).
      </div>
      <canvas ref={canvasRef} width={width} height={height} className="block" />
      <div className="px-2 pb-1 text-xs text-slate-400 text-center">Run #</div>
    </div>
  );
}
