'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { SimState } from '@/lib/sim/types';

interface HistogramProps {
  state: SimState | null;
  width: number;
  height: number;
}

export function Histogram({ state, width, height }: HistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    if (!state || !canvasRef.current) return;
    const { histogramBins, config } = state;
    const binCount = config.histogramBins;
    const maxCount = Math.max(1, ...Array.from(histogramBins));

    const canvas = canvasRef.current;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    const pad = 4;
    const chartW = width - pad * 2;
    const chartH = height - pad * 2;
    const barW = Math.max(1, chartW / binCount - 1);

    for (let i = 0; i < binCount; i++) {
      const count = histogramBins[i];
      const barH = (count / maxCount) * chartH;
      const x = pad + (i / binCount) * chartW;
      const y = pad + chartH - barH;
      const t = i / (binCount - 1);
      const r = Math.round(t * 255);
      const b = Math.round((1 - t) * 255);
      ctx.fillStyle = `rgb(${r}, ${(r + b) / 2}, ${b})`;
      ctx.fillRect(x, y, barW, Math.max(0, barH));
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, chartW, chartH);
  }, [state, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (!state) {
    return (
      <div className="rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400" style={{ width, height }}>
        —
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg border border-slate-700 block"
    />
  );
}
