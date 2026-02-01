# Opinion Dynamics & District Elections Simulator

A browser-based interactive simulation that models **opinion dynamics on a 2D grid** and computes **district-based election outcomes** at each timestep.

## Features

- **Grid simulation**: Each cell has one agent with belief in [-50, 50]. Beliefs update each timestep using a configurable neighbor-average rule (Von Neumann or Moore neighborhood).
- **District elections**: Fixed districts (rectangular partition). At each timestep, agents vote red (belief ≥ 0) or blue (belief < 0); district winner is majority (ties = purple).
- **Visualization**: Belief map (blue–white–red), district boundaries, district outcome overlay, live histogram, and stats (timestep, mean, median, red/blue share, seat counts).
- **Configuration**: Agent count (100–5000), grid presets, neighborhood type, self weight, noise, initial belief distribution, district count, steps/sec, seed for deterministic runs.

## How to run

### Prerequisites

- Node.js 18+
- npm (or pnpm/yarn)

### Install and start

```bash
cd election-sim
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm start
```

### Run tests

```bash
npm test
```

## Usage

1. **Configure** in the left panel: agent count (or grid preset), neighborhood, update rule (self weight, noise), initial beliefs, district count, steps/sec, optional seed.
2. **Start** to run the simulation. Config is locked until you **Reset**.
3. Use **Pause** / **Resume** / **Step** (one timestep) / **Reset**.
4. Toggle **View**: Belief (grid colors), District (election outcome), or Combined (both).
5. Adjust **Cell size** slider for zoom. Stats and histogram update each timestep.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Pure client-side simulation; typed arrays (Float32Array, Int32Array) for performance.
- Canvas 2D for grid and histogram.

## Project structure

- `app/page.tsx` – main page and simulation loop
- `components/ConfigPanel.tsx` – configuration form
- `components/SimulationCanvas.tsx` – grid rendering and overlay
- `components/Histogram.tsx` – belief histogram
- `lib/sim/types.ts` – config and state types
- `lib/sim/init.ts` – create state, init beliefs, districting
- `lib/sim/update.ts` – neighbor average update
- `lib/sim/election.ts` – district vote aggregation
- `lib/sim/histogram.ts` – binning and stats
- `lib/sim/districting/rectangular.ts` – rectangular partition
- `lib/rng.ts` – seeded PRNG (mulberry32)
