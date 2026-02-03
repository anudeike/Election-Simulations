'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { SimState } from '@/lib/sim/types';
import type { GridViewMode } from '@/lib/sim/types';

interface SimulationCanvasProps {
  state: SimState | null;
  viewMode: GridViewMode;
  cellSize: number;
}

/** Belief [-50, 50] -> RGB blue -> white -> red */
function beliefToRgb(belief: number): { r: number; g: number; b: number } {
  const t = (belief + 50) / 100;
  if (t <= 0.5) {
    return { r: t * 2 * 255, g: t * 2 * 255, b: 255 };
  }
  return { r: 255, g: (1 - t) * 2 * 255, b: (1 - t) * 2 * 255 };
}

/** District winner: 1=red, -1=blue, 0=purple */
function winnerToRgb(w: number, alpha: number): string {
  if (w === 1) return `rgba(220, 38, 38, ${alpha})`;
  if (w === -1) return `rgba(37, 99, 235, ${alpha})`;
  return `rgba(147, 51, 234, ${alpha})`;
}

export function SimulationCanvas({ state, viewMode, cellSize }: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    if (!state || !canvasRef.current) return;
    const { width, height } = state.config;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelW = width * cellSize;
    const pixelH = height * cellSize;
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }

    const { beliefs, districtId, districtWinners, activeMask, borderSegments, lastInfluencerFlashCells, lastInfluencerFlashTimestep } = state;

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, pixelW, pixelH);

    if (viewMode === 'belief' || viewMode === 'combined') {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (!activeMask[idx]) continue;
          const { r, g, b } = beliefToRgb(beliefs[idx]);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    if (viewMode === 'district' || viewMode === 'combined') {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (!activeMask[idx]) continue;
          const d = districtId[idx];
          if (d < 0) continue;
          const w = districtWinners[d];
          ctx.fillStyle = winnerToRgb(w, viewMode === 'combined' ? 0.4 : 0.85);
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    if (viewMode === 'belief' && borderSegments.length > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < borderSegments.length; i += 4) {
        const x0 = borderSegments[i] * cellSize;
        const y0 = borderSegments[i + 1] * cellSize;
        const x1 = borderSegments[i + 2] * cellSize;
        const y1 = borderSegments[i + 3] * cellSize;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }

    if (viewMode === 'district' || viewMode === 'combined') {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1;
      for (let i = 0; i < borderSegments.length; i += 4) {
        const x0 = borderSegments[i] * cellSize;
        const y0 = borderSegments[i + 1] * cellSize;
        const x1 = borderSegments[i + 2] * cellSize;
        const y1 = borderSegments[i + 3] * cellSize;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }

    if (lastInfluencerFlashCells.length > 0 && lastInfluencerFlashTimestep >= 0) {
      const age = state.timestep - lastInfluencerFlashTimestep;
      if (age <= 2) {
        const opacity = 1 - age / 3;
        ctx.fillStyle = `rgba(250, 204, 21, ${opacity * 0.6})`;
        for (const idx of lastInfluencerFlashCells) {
          if (!activeMask[idx]) continue;
          const x = (idx % width) * cellSize;
          const y = Math.floor(idx / width) * cellSize;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }
  }, [state, viewMode, cellSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (!state) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 min-h-[400px] text-slate-400">
        Configure and press Start
      </div>
    );
  }

  const { width, height } = state.config;
  const pixelW = width * cellSize;
  const pixelH = height * cellSize;

  return (
    <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
      <canvas
        ref={canvasRef}
        width={pixelW}
        height={pixelH}
        className="block max-w-full max-h-[70vh]"
        style={{ width: pixelW, height: pixelH, maxWidth: '100%', maxHeight: '70vh' }}
      />
    </div>
  );
}
