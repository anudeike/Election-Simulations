# Configuration Guide

This document explains all simulation parameters and update functions in the Opinion Dynamics & District Elections Simulator.

---

## How the simulation works

- **Grid**: Each cell has one agent with a **belief** in the range **[-50, 50]**.
- **Voting**: At every timestep, agents vote **red** if belief ≥ 0, **blue** if belief < 0.
- **Districts**: The grid is divided into fixed districts. Each district’s winner is the majority color (red/blue); ties show as purple.
- **Update**: Each timestep, every agent updates their belief based on their **neighbors** and the chosen **update function**. Beliefs are then clamped to [-50, 50].

---

## Update functions

All update functions use the same pipeline:

1. Compute the **neighbor mean** \(m_i\) (average belief of active neighbors).
2. Compute **distance** \(d_i = |b_i - m_i|\) (how far the agent’s belief is from that mean).
3. Compute **susceptibility** \(s_i \in [0, 1]\) from the chosen formula (below).
4. Optionally apply **extremity stubbornness** (see section below).
5. Update: \(b_i^{new} = b_i + s_i (m_i - b_i)\) (move a fraction \(s_i\) toward the mean).
6. Optional **step noise** can be added; then clamp to [-50, 50].

So: **higher susceptibility** → agent moves more toward neighbors; **lower** → agent stays put.

---

### 1. Pure average (α)

- **Formula**: \(s_i = \alpha\)
- **Parameter**: **Base rate α** (0–1). Default 1.
- **Meaning**: Susceptibility is constant. With α = 1, the agent fully adopts the neighbor mean each step (like diffusion). Lower α slows convergence.
- **Use**: Baseline comparison; fast convergence toward consensus.

---

### 2. Bounded confidence (ε)

- **Formula**: \(s_i = \alpha\) if \(d_i \le \varepsilon\), else \(s_i = 0\)
- **Parameters**:
  - **Base rate α** (0–1). Default 0.3.
  - **Confidence radius ε** (0–100). Default 15.
- **Meaning**: The agent only updates if the neighbor mean is within **ε** of their current belief. Beyond that, they ignore neighbors (\(s_i = 0\)).
- **Use**: Produces **opinion clusters**; different clusters can persist (polarization).

---

### 3. Exponential decay (τ)

- **Formula**: \(s_i = \alpha \cdot e^{-d_i / \tau}\)
- **Parameters**:
  - **Base rate α** (0–1). Default 0.4.
  - **Stubborn scale τ** (1–100). Default 15.
- **Meaning**: Susceptibility falls off smoothly as distance increases. Larger **τ** → influence extends farther; smaller **τ** → only very close opinions matter.
- **Use**: Smooth clustering without a hard cutoff; less brittle than bounded confidence.

---

### 4. Rational decay (τ, p) — recommended default

- **Formula**: \(s_i = \alpha / (1 + (d_i / \tau)^p)\)
- **Parameters**:
  - **Base rate α** (0–1). Default 0.4.
  - **Stubborn scale τ** (1–100). Default 20.
  - **Shape p** (1–6). Default 2.
- **Meaning**: At \(d_i = 0\), \(s_i = \alpha\). As distance grows, \(s_i\) drops. **τ** sets the distance scale; **p** controls how sharp the drop is (larger p = sharper).
- **Use**: Good balance of clustering and path dependence; stable and tunable.

---

### 5. Logistic gate (τ, k)

- **Formula**: \(s_i = \alpha / (1 + e^{k(d_i - \tau)})\)
- **Parameters**:
  - **Base rate α** (0–1). Default 0.4.
  - **Stubborn scale τ** (1–100). Default 15.
  - **Steepness k** (0.1–2). Default 0.5.
- **Meaning**: S-shaped transition. When \(d_i \ll \tau\), \(s_i \approx \alpha\); when \(d_i \gg \tau\), \(s_i \to 0\). **τ** is the “tolerance” distance; **k** controls how steep the switch is.
- **Use**: Strong local consensus with a rapid cutoff beyond the tolerance.

---

## Extremity-based stubbornness (β)

- **Applies to**: All update function modes.
- **Toggle**: Enable/disable.
- **Parameter**: **Extremity stubbornness β** (0–1). Default 0 (off).

**Formula**:

- Extremity: \(e_i = |b_i| / 50\) (0 at center, 1 at ±50).
- After computing \(s_i\) from the update function: \(s_i^{final} = s_i \cdot (1 - \beta e_i)\).

**Meaning**: Agents with more **extreme** beliefs (far from 0) are less susceptible. With β = 1, agents at ±50 don’t move; agents at 0 are unchanged. With β > 0, extremists resist change even when neighbors disagree.

**Use**: Slows convergence and can lock in polarization.

---

## Step noise

- **Range**: 0–5. Default 0.
- **Meaning**: Each timestep, after the susceptibility update, a random value in **[-noise, noise]** is added to the new belief before clamping. 0 = deterministic (with a fixed seed).
- **Use**: Adds randomness; can prevent perfectly frozen states.

---

## Backlash

When **enabled**, agents can **move away** from extreme opposing beliefs (repulsion) instead of toward neighbors. Backlash modifies the **direction** of influence; susceptibility still scales the **magnitude**. Final update: \(b_i^{new} = b_i + s_i \cdot \Delta_i\), where \(\Delta_i\) is the backlash-aware influence term.

### Trigger type and scope

- **Trigger type**: When does backlash activate?
  - **Gap**: \(|b_j - b_i| > T\) and opposite side (\(b_i \cdot b_j < 0\)). Parameter T ∈ [0, 100].
  - **Extremity**: \(|b_j| > R\) and opposite side. Parameter R ∈ [0, 50].
  - **Mean**: \(|m_i - b_i| > T\) and opposite side (\(b_i \cdot m_i < 0\)). Parameter T ∈ [0, 100].
- **Trigger scope**: **Per neighbor** — check each neighbor \(j\); each can contribute assimilative or repulsive. **Per agent** — one check per agent (e.g. “any neighbor satisfies” or “mean on opposite side”); then apply backlash to the whole update.

### Backlash modes

- **Piecewise**: If triggered, \(\Delta_{ij} = -\rho (b_j - b_i)\) (repulsion); else \(\Delta_{ij} = (b_j - b_i)\). Aggregate: \(\Delta_i = \eta \sum_j w_{ij} \Delta_{ij}\). Parameters: step size η (0–1), strength ρ (0–2).
- **Smooth (logistic)**: \(\Delta_{ij} = (1 - (1+\rho) g(d_{ij})) (b_j - b_i)\) with \(g(d) = 1/(1 + e^{-k(d-T)})\). Repulsion turns on smoothly. Parameters: η, ρ, threshold T, steepness k.
- **Identity push**: When triggered, \(\Delta_i = \eta_a (m_i - b_i) + \eta_b \cdot \text{sign}(b_i)\) — assimilation plus a push toward the agent’s current side. Parameters: assimilation rate η_a, backlash push η_b.

**Cap per step** (optional): Clamp \(|\Delta_i|\) so beliefs don’t jump too much in one step.

---

## Neighborhood

- **Von Neumann (4)**: Only up, down, left, right.
- **Moore (8)**: Von Neumann plus the four diagonals.

Edge cells only count neighbors that exist (no wrap). More neighbors (Moore) usually speeds up mixing.

---

## Initial beliefs

How agents’ beliefs are set at the start (before any update).

- **Uniform**: Each agent gets a random belief uniformly in [-50, 50].
- **Normal(0, σ)**: Each agent gets a draw from a normal distribution with mean 0 and standard deviation **σ** (clamped to [-50, 50]). **σ** is the “σ / spread” parameter.
- **Bimodal ±μ**: Two normals centered at +μ and -μ; each agent is assigned to one center at random. **μ** (or “σ / spread”) controls how far apart the two peaks are.
- **Spatial (Perlin)**: Beliefs are set from **2D Perlin noise** over the grid, then scaled to [-50, 50]. Creates spatial clusters (smooth regions of similar belief).
  - **Detail (1–20)**: Higher = finer spatial variation (more “detail”); lower = smoother, larger blobs. Default 10.

With a **seed** set, initial beliefs are deterministic (including Perlin).

---

## Districts and districting

- **District count**: Number of districts (e.g. 4). Sizes are kept as equal as possible (differ by at most 1 cell).
- **Districting method**: **Rectangular** divides the grid into a sub-grid of rectangles (contiguous, compact, balanced). Region growing is scaffolded for future use.

District boundaries are **fixed** at the start and do not change during the run. Only the **outcome** (red/blue/purple) per district updates each timestep.

---

## Run controls (single run)

- **Steps/sec**: How many timesteps are advanced per second (1–60).
- **Steps per frame**: Max timesteps per animation frame (1–10). Higher = faster but less smooth animation.
- **Max timesteps**: Optional cap (0 = no limit).
- **Seed**: Optional integer. When set, the whole run (including initial beliefs and any noise) is **deterministic**: same seed → same result.

---

## Batch run

- **Number of runs (X)**: How many independent simulations to run (e.g. 10).
- **Timesteps per run (Y)**: How many steps each run lasts (e.g. 100).

Each run uses the **same** configuration but a **different** seed (derived from the base seed or an offset). The chart shows **mean** red % and mean blue % over time across runs, with a shaded band for ±1 standard deviation when there are 2+ runs.

---

## Summary table

| Setting            | What it does |
|--------------------|--------------|
| Update function    | How much agents move toward neighbor mean; can depend on distance (and extremity). |
| Base rate α        | Maximum susceptibility (0–1). |
| Confidence radius ε| (Bounded confidence) Max distance to neighbor mean for any update. |
| Stubborn scale τ   | (Exponential/Rational/Logistic) Distance scale for decay. |
| Shape p            | (Rational) Sharpness of decay (1–6). |
| Steepness k        | (Logistic) Sharpness of S-curve (0.1–2). |
| Extremity β        | Reduces susceptibility for extreme beliefs (0 = off). |
| Backlash           | When enabled, agents move away from extreme opposing beliefs (repulsion). |
| Trigger type       | Gap, extremity, or mean; threshold T or R. |
| Trigger scope      | Per neighbor (check each j) or per agent (one check per agent). |
| Backlash mode      | Piecewise, smooth (logistic), or identity push. |
| Backlash strength ρ| Repulsion strength (0–2). |
| Step noise         | Random jitter added each step (0 = off). |
| Neighborhood       | 4 or 8 neighbors per cell. |
| Initial beliefs    | How the grid is initialized (uniform, normal, bimodal, or Perlin). |
| Perlin detail      | (When Perlin) 1 = smooth, 20 = very detailed. |
| Districts          | Number and shape of fixed districts. |
| Seed               | Makes the run reproducible when set. |
