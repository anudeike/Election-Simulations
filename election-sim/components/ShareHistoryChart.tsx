'use client';

import { useRef, useEffect, useCallback } from 'react';

export interface SharePoint {
  red: number;
  blue: number;
}

interface ShareHistoryChartProps {
  /** History of red % and blue % per timestep (0–100). */
  history: SharePoint[];
  width: number;
  height: number;
}

export function ShareHistoryChart({ history, width, height }: ShareHistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    if (!canvasRef.current || history.length === 0) return;

    const canvas = canvasRef.current;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    const pad = { left: 36, right: 8, top: 8, bottom: 24 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    const maxT = Math.max(0, history.length - 1);

    const x = (t: number) => pad.left + (t / Math.max(1, maxT)) * chartW;
    const yRed = (p: number) => pad.top + chartH - (p / 100) * chartH;
    const yBlue = (p: number) => pad.top + chartH - (p / 100) * chartH;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let p = 0; p <= 100; p += 25) {
      const y = pad.top + chartH - (p / 100) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
    }

    // Y-axis label
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('100%', pad.left - 4, pad.top + 10);
    ctx.fillText('50%', pad.left - 4, pad.top + chartH / 2 + 4);
    ctx.fillText('0%', pad.left - 4, pad.top + chartH + 4);

    // Red line
    ctx.strokeStyle = 'rgb(220, 38, 38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const px = x(i);
      const py = yRed(history[i].red);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Blue line
    ctx.strokeStyle = 'rgb(37, 99, 235)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const px = x(i);
      const py = yBlue(history[i].blue);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // X-axis: timestep
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('0', x(0), height - 6);
    if (maxT > 0) {
      ctx.fillText(String(maxT), x(maxT), height - 6);
    }
  }, [history, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (history.length === 0) {
    return (
      <div
        className="rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-sm"
        style={{ width, height }}
      >
        Run simulation to see red/blue % over time
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 overflow-hidden">
      <div className="px-2 pt-1 flex gap-4 text-xs">
        <span className="text-red-400">— Red %</span>
        <span className="text-blue-400">— Blue %</span>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />
      <div className="px-2 pb-1 text-xs text-slate-400 text-center">Timestep</div>
    </div>
  );
}
