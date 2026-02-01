'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { SharePoint } from '@/components/ShareHistoryChart';

interface BatchShareChartProps {
  /** Per-run share history; each run has one point per timestep. */
  runHistories: SharePoint[][];
  width: number;
  height: number;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  const variance = arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function BatchShareChart({ runHistories, width, height }: BatchShareChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    if (!canvasRef.current || runHistories.length === 0) return;

    const numTimesteps = Math.min(...runHistories.map((h) => h.length));
    if (numTimesteps === 0) return;

    const meanRed: number[] = [];
    const meanBlue: number[] = [];
    const stdRed: number[] = [];
    const stdBlue: number[] = [];

    for (let t = 0; t < numTimesteps; t++) {
      const reds = runHistories.map((h) => h[t].red);
      const blues = runHistories.map((h) => h[t].blue);
      meanRed.push(mean(reds));
      meanBlue.push(mean(blues));
      stdRed.push(std(reds));
      stdBlue.push(std(blues));
    }

    const canvas = canvasRef.current;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    const pad = { left: 40, right: 8, top: 8, bottom: 28 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const maxT = numTimesteps - 1;

    const x = (t: number) => pad.left + (t / Math.max(1, maxT)) * chartW;
    const yPct = (p: number) => pad.top + chartH - (p / 100) * chartH;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let p = 0; p <= 100; p += 25) {
      const y = yPct(p);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
    }

    // Y-axis
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('100%', pad.left - 4, pad.top + 10);
    ctx.fillText('50%', pad.left - 4, pad.top + chartH / 2 + 4);
    ctx.fillText('0%', pad.left - 4, pad.top + chartH + 4);

    // Red band (mean ± std)
    if (runHistories.length > 1 && stdRed.some((s) => s > 0)) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.2)';
      ctx.beginPath();
      for (let i = 0; i < numTimesteps; i++) {
        const px = x(i);
        const top = yPct(Math.min(100, meanRed[i] + stdRed[i]));
        if (i === 0) ctx.moveTo(px, top);
        else ctx.lineTo(px, top);
      }
      for (let i = numTimesteps - 1; i >= 0; i--) {
        const px = x(i);
        const bot = yPct(Math.max(0, meanRed[i] - stdRed[i]));
        ctx.lineTo(px, bot);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Blue band (mean ± std)
    if (runHistories.length > 1 && stdBlue.some((s) => s > 0)) {
      ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
      ctx.beginPath();
      for (let i = 0; i < numTimesteps; i++) {
        const px = x(i);
        const top = yPct(Math.min(100, meanBlue[i] + stdBlue[i]));
        if (i === 0) ctx.moveTo(px, top);
        else ctx.lineTo(px, top);
      }
      for (let i = numTimesteps - 1; i >= 0; i--) {
        const px = x(i);
        const bot = yPct(Math.max(0, meanBlue[i] - stdBlue[i]));
        ctx.lineTo(px, bot);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Mean red line
    ctx.strokeStyle = 'rgb(220, 38, 38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < numTimesteps; i++) {
      const px = x(i);
      const py = yPct(meanRed[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Mean blue line
    ctx.strokeStyle = 'rgb(37, 99, 235)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < numTimesteps; i++) {
      const px = x(i);
      const py = yPct(meanBlue[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // X-axis
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('0', x(0), height - 6);
    if (maxT > 0) ctx.fillText(String(maxT), x(maxT), height - 6);
  }, [runHistories, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (runHistories.length === 0) {
    return (
      <div
        className="rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm"
        style={{ width, height }}
      >
        Run a batch to see mean red/blue % over time
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
      <div className="px-2 pt-1 flex gap-4 text-xs flex-wrap">
        <span className="text-red-400">— Mean red %</span>
        <span className="text-blue-400">— Mean blue %</span>
        {runHistories.length > 1 && (
          <span className="text-slate-400">Shaded: ±1 std across {runHistories.length} runs</span>
        )}
      </div>
      <canvas ref={canvasRef} width={width} height={height} className="block" />
      <div className="px-2 pb-1 text-xs text-slate-400 text-center">Timestep</div>
    </div>
  );
}
