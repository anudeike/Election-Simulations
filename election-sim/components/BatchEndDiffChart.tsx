'use client';

import { useRef, useEffect, useCallback } from 'react';

export interface EndRunDiff {
  agentDiff: number;
  seatDiff: number;
}

interface BatchEndDiffChartProps {
  /** End-of-run red − blue diffs per run (agents and seats). */
  endDiffs: EndRunDiff[];
  width: number;
  height: number;
}

export function BatchEndDiffChart({ endDiffs, width, height }: BatchEndDiffChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    if (!canvasRef.current || endDiffs.length === 0) return;

    const canvas = canvasRef.current;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    const pad = { left: 44, right: 44, top: 12, bottom: 28 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const n = endDiffs.length;
    const maxRun = Math.max(1, n);

    const agentDiffs = endDiffs.map((d) => d.agentDiff);
    const seatDiffs = endDiffs.map((d) => d.seatDiff);
    const minAgent = Math.min(...agentDiffs, 0);
    const maxAgent = Math.max(...agentDiffs, 0);
    const minSeat = Math.min(...seatDiffs, 0);
    const maxSeat = Math.max(...seatDiffs, 0);
    const rangeAgent = maxAgent - minAgent || 1;
    const rangeSeat = maxSeat - minSeat || 1;

    const x = (runIdx: number) => pad.left + (runIdx / Math.max(1, maxRun - 1)) * chartW;
    const yAgent = (v: number) => pad.top + chartH - ((v - minAgent) / rangeAgent) * chartH;
    const ySeat = (v: number) => pad.top + chartH - ((v - minSeat) / rangeSeat) * chartH;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + chartH / 2);
    ctx.lineTo(pad.left + chartW, pad.top + chartH / 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(maxAgent)), pad.left - 4, pad.top + 10);
    ctx.fillText(String(Math.round(minAgent)), pad.left - 4, pad.top + chartH - 2);
    ctx.textAlign = 'left';
    ctx.fillText(String(maxSeat), pad.left + chartW + 4, pad.top + 10);
    ctx.fillText(String(minSeat), pad.left + chartW + 4, pad.top + chartH - 2);

    for (let i = 0; i < n; i++) {
      const px = x(i);
      const pyAgent = yAgent(agentDiffs[i]);
      const pySeat = ySeat(seatDiffs[i]);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.7)';
      ctx.beginPath();
      ctx.arc(px, pyAgent, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.7)';
      ctx.beginPath();
      ctx.arc(px, pySeat, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgb(220, 38, 38)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x(i);
      const py = yAgent(agentDiffs[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgb(37, 99, 235)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x(i);
      const py = ySeat(seatDiffs[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 8))) {
      ctx.fillText(String(i + 1), x(i), height - 8);
    }
  }, [endDiffs, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (endDiffs.length === 0) {
    return (
      <div
        className="rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm"
        style={{ width, height }}
      >
        Run a batch to see end-of-run Red − Blue (agents & seats)
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
      <div className="px-2 pt-1 flex gap-4 text-xs flex-wrap">
        <span className="text-red-400">— Red − Blue (agents)</span>
        <span className="text-blue-400">— Red − Blue (seats)</span>
      </div>
      <div className="text-xs text-slate-400 px-2">Left scale: agent diff. Right scale: seat diff.</div>
      <canvas ref={canvasRef} width={width} height={height} className="block" />
      <div className="px-2 pb-1 text-xs text-slate-400 text-center">Run #</div>
    </div>
  );
}
