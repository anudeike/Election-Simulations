'use client';

import { useRef, useEffect, useCallback } from 'react';

interface BatchVelocityChartProps {
  /** Per-run avg |velocity| history; each run has one value per timestep. */
  runHistories: number[][];
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

export function BatchVelocityChart({ runHistories, width, height }: BatchVelocityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const valid = runHistories.filter((h) => h.length > 0);
    if (!canvasRef.current || valid.length === 0) return;

    const numTimesteps = Math.min(...valid.map((h) => h.length));
    if (numTimesteps === 0) return;

    const meanV: number[] = [];
    const stdV: number[] = [];
    for (let t = 0; t < numTimesteps; t++) {
      const vals = valid.map((h) => h[t]);
      meanV.push(mean(vals));
      stdV.push(std(vals));
    }

    const maxVal = Math.max(0.01, ...meanV, ...meanV.map((m, i) => m + stdV[i]));

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
    const y = (v: number) => pad.top + chartH - (v / maxVal) * chartH;

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const vy = (i / 4) * maxVal;
      const yy = y(vy);
      ctx.beginPath();
      ctx.moveTo(pad.left, yy);
      ctx.lineTo(pad.left + chartW, yy);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(maxVal.toFixed(2), pad.left - 4, pad.top + 10);
    ctx.fillText('0', pad.left - 4, pad.top + chartH + 4);

    if (valid.length > 1 && stdV.some((s) => s > 0)) {
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.beginPath();
      for (let i = 0; i < numTimesteps; i++) {
        const px = x(i);
        const top = y(Math.min(maxVal, meanV[i] + stdV[i]));
        if (i === 0) ctx.moveTo(px, top);
        else ctx.lineTo(px, top);
      }
      for (let i = numTimesteps - 1; i >= 0; i--) {
        const px = x(i);
        const bot = y(Math.max(0, meanV[i] - stdV[i]));
        ctx.lineTo(px, bot);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = 'rgb(168, 85, 247)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < numTimesteps; i++) {
      const px = x(i);
      const py = y(meanV[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const t = Math.round((i / 4) * maxT);
      ctx.fillText(String(t), x(t), height - 8);
    }
  }, [runHistories, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  const valid = runHistories.filter((h) => h.length > 0);
  if (valid.length === 0) {
    return (
      <div
        className="rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm"
        style={{ width, height }}
      >
        Enable momentum and run a batch to see avg velocity magnitude over time
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
      <div className="px-2 pt-1 text-xs text-slate-400">
        Mean avg |velocity| over time ({valid.length} runs). Shaded band = ±1 std when 2+ runs.
      </div>
      <canvas ref={canvasRef} width={width} height={height} className="block" />
      <div className="px-2 pb-1 text-xs text-slate-400 text-center">Timestep</div>
    </div>
  );
}
