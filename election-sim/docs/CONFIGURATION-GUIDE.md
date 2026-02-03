# Configuration Guide

This document explains all simulation parameters and update functions in the Opinion Dynamics & District Elections Simulator.

---

## How the simulation works

- **Grid**: Each cell has one agent with a **belief** in the range **[-50, 50]**.
- **Voting**: At every timestep, agents vote **red** if belief ≥ 0, **blue** if belief < 0.
- **Districts**: The grid is divided into fixed districts. Each district’s winner is the majority color (red/blue); ties show as purple.
- **Update**: Each timestep, every agent updates their belief based on their **neighbors** and the chosen **update function**. Optional **influencer events** can add additional influence from rare radical actors. Beliefs are then clamped to [-50, 50].

---

## Update functions

All update functions use the same pipeline:

1. Compute the **neighbor mean** \(m_i\) (average belief of active neighbors).
2. Compute **distance** \(d_i = |b_i - m_i|\) (how far the agent’s belief is from that mean).
3. Compute **susceptibility** \(s_i \in [0, 1]\) from the chosen formula (below).
4. Optionally apply **extremity stubbornness** (see section below).
5. Compute **backlash** term (if enabled) and **influencer** term (if enabled).
6. Update: \(b_i^{new} = b_i + s_i \cdot \Delta_i^{local} + \Delta_i^{influencer}\) (local influence plus optional influencer influence).
7. Optional **step noise** can be added; then clamp to [-50, 50].

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

## Belief momentum

When **enabled**, agents accumulate **velocity** (momentum) instead of updating beliefs directly. Beliefs exhibit inertia, overshoot, and oscillations.

**Update model** (each timestep):

1. **Velocity**: \(v_i^{new} = \lambda v_i + \Delta_i\) (where \(\Delta_i\) is the susceptibility-scaled influence from neighbors, backlash, etc.).
2. **Damping** (optional): Reduce velocity when \(|b_i|\) is small (near center) or large (near extremes).
3. **Clamp velocity**: \(v_i^{new} \in [-v_{max}, v_{max}]\).
4. **Belief**: \(b_i^{new} = b_i + v_i^{new}\); then clamp to [-50, 50].

### Parameters

- **Enable**: Toggle momentum on/off. When off, the update uses the standard direct formula.
- **Momentum retention λ** (0–1): Fraction of current velocity carried to the next step. Default 0.7. Higher λ → more inertia, slower decay of motion. λ = 0 → no momentum (instant response). λ = 1 → velocity never decays on its own (only capped by max velocity).
- **Max velocity** (0–10): Configurable cap on velocity magnitude. Prevents runaway growth when λ is high. Default 2. Beliefs can change by at most this much per step from velocity alone.
- **Damping near center** (0–1): When \(|b_i| < 15\), multiply velocity by \((1 - \text{damping})\). 0 = no effect. Higher values slow agents near the center (moderate beliefs). Use to reduce oscillation around 0.
- **Damping near extremes** (0–1): When \(|b_i| > 35\), multiply velocity by \((1 - \text{damping})\). Prevents runaway polarization; extremists slow down as they approach ±50.

**Batch metrics** (when momentum enabled): Average velocity magnitude over time, oscillation count (sign changes in mean belief derivative), and time to stabilization (first timestep when max|v| < 0.01 for 5 consecutive steps).

---

## Influencer events

When **enabled**, rare **influencer events** spawn stochastically. Influencers represent radical actors whose ideas can spread beyond immediate neighbors, producing sudden ideological cascades and polarization spikes.

**Conceptual model**: An influencer is a time-limited event at a grid cell that emits a **message** (radical belief value). Agents within a noisy spatial reach can be influenced. The update becomes: \(b_i^{new} = b_i + \Delta_i^{local} + \Delta_i^{influencer}\).

### Spawn logic

- **Spawn rate** (0.0001–0.01): Probability per timestep that an influencer spawns. Default 0.0005. Very small values keep events rare.
- **Homogeneity bias**: Influencers are more likely to appear in **ideologically uniform** regions. For candidate cell \(i\), let \(S_i\) = fraction of neighbors with the same sign as \(b_i\) (0 = all disagree, 1 = all agree). Spawn weight ∝ \(\max(0, S_i - s_{min})^\gamma\).
  - **Homogeneity threshold** \(s_{min}\) (0.5–1): Minimum uniformity for a cell to be a spawn candidate. If \(S_i < s_{min}\), the cell has zero spawn weight and cannot be chosen. Default 0.85 means only cells where **at least 85%** of neighbors share the cell’s sign (red or blue) can spawn. Higher \(s_{min}\) → only very uniform “echo chambers” qualify; lower \(s_{min}\) → mixed regions can spawn too.
  - **Homogeneity sharpness** γ (1–5): Exponent in the spawn weight. Controls how much more likely **very** uniform regions are vs. barely-qualifying ones. With γ = 1 (linear), a cell at 95% agreement gets 2× the weight of one at 90% (when \(s_{min} = 0.85\)). With γ = 3, that same 95% cell gets **8×** the weight of 90%. Higher γ → spawns concentrate heavily in the most uniform regions; lower γ → more even spread across all qualifying cells.
- **Oppositional constraint**: The influencer’s message is **opposite in sign** to the local mean and has **radical magnitude** in [radicalMin, radicalMax].
  - **Radical min** (0–50): Minimum message magnitude. Default 35.
  - **Radical max** (0–50): Maximum message magnitude. Default 50.

### Reach model

Influence spreads with **spatial radius** plus **stochastic leakage** (so ideas can occasionally reach distant agents).

- **Reach radius R** (3–20): Base scale for distance decay. Default 8.
- **Leak probability ε** (0–0.05): Global chance that any agent hears the message regardless of distance. Default 0.01. Allows “platform amplification” effects.
- **Distance metric**: **Euclidean** (straight-line) or **Chebyshev** (max of Δx, Δy). Affects how reach is computed on the grid.

**Reach probability**: \(P(\text{influenced}) = e^{-d/R} + \varepsilon\) (clamped to 1).

**Influence weight** (if influenced): \(w_i = e^{-d/R}\), multiplied by decay amplitude.

### Influence effect (persuasion vs. backlash)

For each influenced agent \(i\) with belief \(b_i\) and message \(M\):

- If \(\text{sign}(b_i) \neq \text{sign}(M)\) **and** \(|M - b_i| > \text{backlashThreshold}\): **Reactance backlash** — \(\Delta_i^{inf} = +\beta \cdot w_i \cdot \text{sign}(b_i)\) (agent doubles down).
- Else: **Persuasion** — \(\Delta_i^{inf} = \alpha \cdot w_i \cdot (M - b_i)\) (agent moves toward message).

Parameters:

- **Influence strength α** (0–1): Persuasion rate. Default 0.3.
- **Backlash strength β** (0–2): How strongly agents react against opposing messages. Default 1.
- **Backlash threshold** (10–50): \(|M - b_i|\) must exceed this to trigger backlash. Default 20.

### Lifetime and decay

Influencers are temporary. Each has a **TTL** (time-to-live) in timesteps. Default 20.

- **Decay type**:
  - **None**: Full strength until TTL expires.
  - **Linear**: Amplitude \(a(t) = 1 - t/\text{TTL}\).
  - **Exponential**: \(a(t) = e^{-t/\tau}\) with \(\tau = \text{TTL} / \text{decayRate}\).
- **Decay rate** (0.5–5): For exponential only. Higher = faster decay. Default 1.

### Visual indicators

- **Yellow flash**: When an influencer is active, the **origin cell** and all **affected cells** (those receiving influence) flash yellow. The flash fades over 2–3 steps.
- **Toast notification**: When an influencer spawns, a notification appears above the canvas (“Influencer spawned!”) and auto-dismisses after 3 seconds.

### Batch metrics (when influencers enabled)

- **Influencer events**: Average number of spawns per run.
- **Avg reach size**: Average number of agents influenced per influencer event.
- **District flips**: Average number of district winner changes during the run.
- **Belief variance (end)**: Average final belief variance across runs.

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
| Momentum           | When enabled, beliefs accumulate velocity; inertia and overshoot. |
| Momentum retention λ | Fraction of velocity retained each step (0–1). |
| Max velocity       | Cap on velocity magnitude (0–10); prevents runaway growth. |
| Damping near center | Reduces velocity when \|b\| < 15 (0–1). |
| Damping near extremes | Reduces velocity when \|b\| > 35; prevents runaway polarization. |
| Influencer events  | When enabled, rare radical actors spawn and influence agents beyond neighbors. |
| Spawn rate         | Probability per timestep that an influencer spawns (0.0001–0.01). |
| Homogeneity threshold | Min fraction of same-sign neighbors for spawn; 0.85 = at least 85% agreement. Higher = only echo chambers qualify. |
| Homogeneity sharpness | Exponent γ in spawn weight; higher = spawns concentrate in most uniform regions; lower = more even spread. |
| Radical min/max    | Message magnitude range (0–50). |
| Reach radius       | Distance scale R for influence decay (3–20). |
| Leak probability   | Global chance to hear message regardless of distance (0–0.05). |
| Distance metric    | Euclidean or Chebyshev for reach. |
| Influence strength α | Persuasion rate (0–1). |
| Backlash strength β | Reactance strength (0–2). |
| Backlash threshold | \|M − b_i\| must exceed this to trigger backlash (10–50). |
| TTL               | Influencer lifetime in timesteps. |
| Decay type        | None, linear, or exponential. |
| Decay rate        | For exponential: τ = TTL / decayRate. |
| Step noise         | Random jitter added each step (0 = off). |
| Neighborhood       | 4 or 8 neighbors per cell. |
| Initial beliefs    | How the grid is initialized (uniform, normal, bimodal, or Perlin). |
| Perlin detail      | (When Perlin) 1 = smooth, 20 = very detailed. |
| Districts          | Number and shape of fixed districts. |
| Seed               | Makes the run reproducible when set. |
