## PRD, Opinion Dynamics + District Elections Simulator

### 1) Product summary

Build a browser based, interactive simulation that models **opinion dynamics on a 2D grid** and computes **district based election outcomes** at each timestep.

Each grid cell contains exactly one agent with a belief value b∈[−50,50]b \in [-50, 50]b∈[−50,50]. At each timestep, beliefs update using a configurable **update function** based on neighbor beliefs (Von Neumann, optional Moore). After every timestep, we update a **histogram of beliefs** (descriptive distribution, no trimming). Also at every timestep, we run a **red vs blue election** by districts that are fixed at time step 0, contiguous, compact, and roughly equal population.

The app must run fully in the browser, be easy to host, and feel responsive for up to 5000 agents.

---

### 2) Goals

- Interactive simulation in the browser with clear visuals:
    
    - Grid belief map (blue to red gradient).
        
    - District boundaries overlay.
        
    - District election coloring overlay.
        
    - Live updating histogram of beliefs each timestep.
        
- Configurable parameters before simulation start:
    
    - Grid size (agent count 100 to 5000).
        
    - Neighborhood type (Von Neumann, Moore).
        
    - Update rule parameters (start with neighbor average).
        
    - Initial belief distribution options.
        
    - Number of districts.
        
    - Districting algorithm (must produce contiguous, compact, near equal pop).
        
    - Timestep speed, step count, stop conditions.
        
- Deterministic runs optional via seed.
    
- Simple voting rule: belief >= 0 votes Red, else Blue.
    
- District outcomes computed every timestep.
    

---

### 3) Non goals

- No user accounts.
    
- No persistence, no backend database.
    
- No turnout model, no abstention, no intensity.
    
- No outlier trimming, no Overton window calculation beyond the histogram display.
    

---

### 4) Definitions and requirements

#### 4.1 Agents and grid

- One agent per cell.
    
- Belief range is clamped to [-50, 50] after each update.
    
- Grid dimensions chosen from desired agent count, typically square or near square:
    
    - Let `N = agentCount`.
        
    - Compute `width = floor(sqrt(N))`, `height = ceil(N / width)`.
        
    - Use exactly `N` cells, either:
        
        - Option A, fill `width * height` and treat extra cells as inactive (avoid this if possible).
            
        - Option B (preferred), choose width and height such that `width * height == N` when feasible, otherwise allow the smallest rectangle >= N and mark inactive cells, do not count inactive cells in districts.
            
    - To keep districts contiguous and compact, prefer `width * height == N` when user chooses common sizes. Provide presets, 10x10, 20x20, 50x50, etc.
        

#### 4.2 Neighborhoods

- Von Neumann, up, down, left, right.
    
- Moore, Von Neumann plus diagonals.
    
- Boundary behavior:
    
    - Start with **clamped edges** (neighbors off grid are ignored).
        
    - Optional later, torus wrap.
        

#### 4.3 Update function

For v1, implement:

- **Neighbor average update**:
    
    - `newBelief = (selfWeight * selfBelief + sum(neighborBeliefs)) / (selfWeight + neighborCount)`
        
    - `selfWeight` configurable, default 0 (pure neighbor average) or 1 (include self).
        
- Add optional noise:
    
    - `newBelief += randomUniform(-noise, noise)` with noise default 0.
        
- Clamp to [-50, 50].
    

Architecture must allow adding more update rules later without refactoring:

- “bounded confidence” averaging, only neighbors within epsilon.
    
- polarization repulsion factor.
    
- stubborn agents.
    

#### 4.4 Elections

- At every timestep, each agent votes:
    
    - if belief >= 0 then red else blue.
        
- District boundaries are fixed at timestep 0 and never change.
    
- Each district’s color is majority winner:
    
    - ties can default to “purple” or pick a deterministic tie breaker, for v1 use purple.
        

#### 4.5 Districting, contiguous, compact, equal population

Districting must output `districtId` per active cell, satisfying:

- Contiguous regions, 4 connected adjacency is sufficient.
    
- Compactness, prefer blob like shapes, minimize perimeter, avoid spindly regions.
    
- Equal population, district sizes differ by at most 1 cell if possible.
    

Implement two methods, with one as the default:

**Method A, Rectangular partition (default, simplest, compact, contiguous)**

- If grid is a full rectangle with all active cells, divide into a grid of rectangles.
    
- Given `D` districts, choose `rows` and `cols` such that `rows * cols >= D` and aspect ratio close to grid aspect ratio.
    
- Slice the grid into `rows x cols` rectangles with near equal cell counts, assign district ids in scan order until D used.
    
- This is compact, contiguous, and balanced, and is a strong baseline.
    

**Method B, Seeded region growing with compactness heuristic (optional, for irregular active cells)**

- Works even if some cells inactive.
    
- Steps:
    
    1. Pick `D` seeds spaced out using farthest point sampling on active cells.
        
    2. Grow each district by repeatedly adding frontier cells until target size reached.
        
    3. Use a scoring function for candidate frontier cells:
        
        - minimize increase in perimeter,
            
        - minimize distance from district centroid,
            
        - maintain contiguity always,
            
        - avoid leaving isolated holes.
            
    4. When some districts fill early, remaining cells fill remaining districts.
        
    5. Validate contiguity, if broken, rerun with different seed order.
        
- This is more complex but produces “realistic” districts.
    

For v1, Method A is sufficient if we ensure the grid is a full rectangle with all cells active. Keep Method B scaffolded behind a feature flag.

---

### 5) UX and UI

#### 5.1 Layout

Single page app with:

- Left panel, configuration form (locked while running).
    
- Main panel, simulation visuals:
    
    - Grid view canvas with belief colors.
        
    - District boundary overlay.
        
    - Toggle for “belief view” vs “district outcome view” vs “combined overlay”.
        
- Right or bottom panel:
    
    - Histogram that updates each timestep.
        
    - Small stats, timestep, mean, median, red share, blue share, district seat counts.
        

#### 5.2 Controls

Pre run configuration (editable):

- Agent count, 100 to 5000.
    
- Grid preset dropdown, 10x10, 20x20, 30x30, 40x40, 50x50, custom width, height with validation to keep N within range.
    
- Neighborhood, Von Neumann or Moore.
    
- Update rule:
    
    - rule type dropdown (v1 only “neighbor average”)
        
    - selfWeight slider (0 to 2, default 1)
        
    - noise slider (0 to 5, default 0)
        
- Initial beliefs:
    
    - Uniform random [-50, 50]
        
    - Normal(0, sigma) clamped
        
    - Bimodal, two normals around +/- mu
        
    - Spatial clusters, perlin noise or quadrant offsets (optional)
        
- Districts:
    
    - district count D (2 to N/10 reasonable cap)
        
    - districting method, Rectangular or Region growing (if implemented)
        
- Run:
    
    - steps per second (1 to 60)
        
    - steps per frame (1 to 10)
        
    - max timesteps optional
        
    - seed optional
        

Runtime controls:

- Start, Pause, Resume, Step once, Reset.
    

---

### 6) Technical plan

#### 6.1 Stack

- Next.js (App Router) + TypeScript.
    
- Pure client side simulation, no backend routes needed.
    
- Rendering:
    
    - Use HTML Canvas 2D for grid rendering.
        
    - Use a second canvas overlay for district boundaries, or draw boundaries on same canvas.
        
- Histogram:
    
    - Use a lightweight chart approach:
        
        - Option A, custom canvas histogram.
            
        - Option B, D3 for SVG, but keep it simple.
            
- Styling:
    
    - Tailwind + shadcn/ui for controls.
        

#### 6.2 Data structures

Use typed arrays for performance:

- `beliefs: Float32Array` length `cellCount`.
    
- `nextBeliefs: Float32Array` for double buffering.
    
- `districtId: Int32Array` length `cellCount`.
    
- `activeMask: Uint8Array` if supporting inactive cells, otherwise omit.
    
- `voteRed: Uint8Array` optional, or compute on the fly.
    
- Histogram bins:
    
    - `binCount` configurable, default 50 or 101.
        
    - `bins: Uint32Array`.
        

Indexing:

- `idx = y * width + x`
    

#### 6.3 Core algorithms

Update step pseudocode:

- For each cell:
    
    - gather neighbor indices depending on neighborhood type.
        
    - compute average with selfWeight.
        
    - apply noise if enabled using seeded RNG.
        
    - clamp to [-50, 50]
        
    - write into `nextBeliefs[idx]`
        
- Swap buffers.
    

Election step:

- For each cell:
    
    - `isRed = beliefs[idx] >= 0`
        
    - accumulate per district counts:
        
        - `districtRedCounts[d]++` else `districtBlueCounts[d]++`
            
- Determine district winner color.
    

Histogram step:

- Clear bins.
    
- For each belief:
    
    - map belief to bin index:
        
        - `t = (belief + 50) / 100`
            
        - `bin = floor(t * binCount)` clamp 0..binCount-1
            
    - bins[bin]++
        
- Render histogram.
    

District boundaries overlay:

- For each cell, compare districtId with right neighbor and down neighbor, draw border lines where different.
    
- Cache this overlay because districts never change.
    

#### 6.4 Color mapping

Belief color:

- Map -50 to blue, 0 to white, +50 to red.
    
- Use a simple lerp in RGB, or HSL interpolation for smoother gradient.  
    District outcome overlay:
    
- District winner red or blue, optionally with alpha overlay.
    
- Ties purple.
    

#### 6.5 Simulation loop

- Use `requestAnimationFrame` for rendering.
    
- Accumulate time and run `stepsPerSecond` timesteps.
    
- Support stepping multiple timesteps per frame.
    
- Keep simulation deterministic when seed provided:
    
    - Implement seeded PRNG, mulberry32 or xorshift32.
        

---

### 7) File and module structure

- `app/page.tsx`, main page layout.
    
- `components/ConfigPanel.tsx`, all pre run config controls.
    
- `components/SimulationCanvas.tsx`, grid rendering and overlay toggles.
    
- `components/Histogram.tsx`, histogram rendering.
    
- `lib/sim/types.ts`, types for config and sim state.
    
- `lib/sim/init.ts`, initialize beliefs, districts, buffers.
    
- `lib/sim/update.ts`, update rule implementations.
    
- `lib/sim/election.ts`, district vote aggregation and winners.
    
- `lib/sim/histogram.ts`, binning logic.
    
- `lib/sim/districting/rectangular.ts`, default districting.
    
- `lib/sim/districting/regionGrow.ts`, optional.
    
- `lib/rng.ts`, seeded RNG utilities.
    

---

### 8) Acceptance criteria

- User can configure a run, start it, see:
    
    - belief grid updating each timestep,
        
    - histogram updating each timestep,
        
    - district winners updating each timestep,
        
    - district boundaries remain fixed from initialization.
        
- Neighborhood toggle changes dynamics.
    
- Agent counts between 100 and 5000 run smoothly on a typical laptop.
    
- Districts are contiguous and compact, at least via rectangular partition baseline.
    
- Reset returns to initial state and allows changing config.
    

---

### 9) Implementation notes for Cursor

- Generate the project as a Next.js app with TypeScript, Tailwind, and shadcn/ui.
    
- Prefer small, testable functions in `lib/sim`.
    
- Add minimal unit tests for:
    
    - neighbor indexing,
        
    - clamp behavior,
        
    - histogram binning,
        
    - rectangular districting size balance.
        
- Do not add backend APIs.
    
- Ensure the config is locked once “Start” pressed, only reset unlocks it.
    

---

## Cursor build prompt (copy and paste as the instruction to generate the code)

You are building a Next.js (App Router) TypeScript web app for an interactive agent based political opinion simulation.

Core requirements:

- One agent per grid cell, belief float in [-50, 50].
    
- Neighborhood options, Von Neumann and Moore.
    
- Update rule v1, neighbor average with configurable selfWeight (default 1) and optional noise (default 0). Use double buffering Float32Array, clamp results to [-50, 50].
    
- Each timestep:
    
    - update beliefs,
        
    - compute histogram of beliefs (no trimming, purely descriptive),
        
    - compute district election results with simple vote rule, belief >= 0 is Red else Blue.
        
- Districts are computed once at time step 0 and never change.
    
- Districting must produce contiguous and compact districts with near equal population. Implement Rectangular partition as the default. Scaffold a region growing method behind a flag if time.
    
- Visualization:
    
    - Canvas grid view of beliefs with blue to white to red gradient.
        
    - District boundaries overlay drawn once and cached.
        
    - Toggle between belief view and district outcome view, or show both.
        
    - Histogram chart that updates each timestep.
        
    - Stats, timestep, mean, median, red share, blue share, seat counts.
        
- Interactivity:
    
    - All simulation parameters are configured before run. Once running, lock config until Reset.
        
    - Provide Start, Pause, Resume, Step, Reset.
        
    - Agent count configurable 100 to 5000, also grid presets 10x10, 20x20, 50x50 and custom width and height validation.
        
    - District count configurable with validation.
        
    - Seed optional for deterministic runs, implement seeded PRNG (mulberry32).
        
- Tech constraints:
    
    - Use typed arrays, avoid heavy libraries for performance.
        
    - Keep code modular in lib/sim with pure functions.
        
    - Use Tailwind and shadcn/ui for UI controls.
        

Deliverables:

- Complete runnable Next.js app code.
    
- Clear module structure: app/page.tsx, components for ConfigPanel, SimulationCanvas, Histogram, and lib/sim modules for init, update, election, histogram, districting.
    
- Add a small set of unit tests for histogram binning and rectangular districting size balance.