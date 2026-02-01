'use client';

import { useRef, useEffect, useCallback } from 'react';

interface BatchDiffHistogramProps {
  /** Values to bin (e.g. red − blue agent or seat counts per run). */
  values: number[];
  title: string;
  /** Bar fill color (e.g. red for agents, blue for seats). */
  barColor: string;
  width: number;
  height: number;
}

function buildBins(values: number[]): { bins: Map<number, number>; min: number; max: number } {
  if (values.length === 0) return { bins: new Map(), min: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const bins = new Map<number, number>();
  for (let v = min; v <= max; v++) bins.set(v, 0);
  for (const v of values) bins.set(v, (bins.get(v) ?? 0) + 1);
  return { bins, min, max };
}

export function BatchDiffHistogram({ values, title, barColor, width, height }: BatchDiffHistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    const pad = { left: 36, right: 16, top: 20, bottom: 28 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    const { bins, min, max } = buildBins(values);
    const binCount = Math.max(1, max - min + 1);
    const maxFreq = values.length === 0 ? 1 : Math.max(1, ...Array.from(bins.values()));

    const barW = Math.max(1, (chartW / binCount) - 1);
    const zeroX = min <= 0 && max >= 0 ? pad.left + ((0 - min) / (max - min || 1)) * chartW : pad.left;

    // Zero line
    if (min <= 0 && max >= 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(zeroX, pad.top);
      ctx.lineTo(zeroX, pad.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Y-axis label (max count)
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(maxFreq), pad.left - 4, pad.top + 12);

    for (let v = min; v <= max; v++) {
      const count = bins.get(v) ?? 0;
      const barH = (count / maxFreq) * chartH;
      const x = pad.left + ((v - min) / (max - min || 1)) * chartW;
      const y = pad.top + chartH - barH;
      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, barW, Math.max(0, barH));
    }

    // X-axis labels (sample so they don't overlap)
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    const labelStep = binCount <= 16 ? 1 : Math.max(1, Math.ceil(binCount / 12));
    for (let v = min; v <= max; v += labelStep) {
      const x = pad.left + ((v - min) / (max - min || 1)) * chartW + barW / 2;
      ctx.fillText(String(v), x, height - 8);
    }
  }, [values, title, barColor, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (values.length === 0) {
    return (
      <div
        className="rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm"
        style={{ width, height }}
      >
        Run a batch to see {title}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
      <div className="px-2 pt-2 text-sm font-medium text-slate-200">{title}</div>
      <canvas ref={canvasRef} width={width} height={height} className="block" />
      <div className="px-2 pb-1 text-xs text-slate-400 text-center">Red − Blue</div>
    </div>
  );
}
