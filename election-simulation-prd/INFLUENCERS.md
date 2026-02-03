# Feature PRD: Influencer Events with Noisy Spatial Reach

## 1. Feature Summary

Add **Influencer Events** to the simulation, representing rare, stochastic actors with radical opinions who exert **high-magnitude, non-local influence** over a population.

Influencers:

- Spawn randomly and rarely.
- Are more likely to appear in **locally homogeneous regions**.
- Hold **radical beliefs opposite** to their local environment.
- Influence agents beyond immediate neighbors via a **spatial radius with stochastic leakage**.
- Can polarize the population through persuasion and backlash.
- Are temporary events with decay.

This feature applies to:

- **Single interactive runs**
- **Batch simulations**

---

## 2. Design Goals

- Capture “ideas spreading like wildfire” without explicit network graphs.
- Avoid forcing users to choose between “local” vs “global” reach.
- Produce:
  - sudden ideological cascades,
  - polarization spikes,
  - district-level volatility.
- Compose cleanly with:
  - susceptibility,
  - backlash,
  - momentum,
  - elections.

---

## 3. Conceptual Model

An influencer is a **time-limited event** that emits a **message field** affecting agents within a noisy spatial reach.

At each timestep:

binew=bi+Δilocal+Δiinfluencerb_i^{new} = b_i + \Delta_i^{local} + \Delta_i^{influencer}binew​=bi​+Δilocal​+Δiinfluencer​

Influencer influence is treated as an **additional force**, not a replacement for local dynamics.

---

## 4. Influencer Spawn Logic

### 4.1 Rarity

Influencers spawn probabilistically per timestep.

Parameter:

- `baseInfluencerRate` (very small, e.g. 0.0001–0.001 per timestep)

---

### 4.2 Homogeneity Bias (Required)

Influencers are **more likely to appear in ideologically uniform regions**.

For candidate cell iii:

Let:

Si=#{j∈N(i):sign(bj)=sign(bi)}∣N(i)∣S_i = \frac{\#\{j \in N(i) : \text{sign}(b_j) = \text{sign}(b_i)\}}{|N(i)|}Si​=∣N(i)∣#{j∈N(i):sign(bj​)=sign(bi​)}​

Spawn probability modifier:

Pi∝max⁡(0,Si−smin)γP*i \propto \max(0, S_i - s*{min})^\gammaPi​∝max(0,Si​−smin​)γ

Parameters:

- `homogeneityThreshold (s_min)` ∈ [0.5, 1.0], default 0.85
- `homogeneitySharpness (γ)` ∈ [1, 5], default 3

---

### 4.3 Oppositional Constraint (Required)

When an influencer spawns:

- Compute local mean belief mim_imi​.
- Influencer message must be **opposite in sign** to mim_imi​.
- Message magnitude must be **radical**.

Message:

M=−sign(mi)⋅U(radicalMin,radicalMax)M = -\text{sign}(m_i) \cdot U(radicalMin, radicalMax)M=−sign(mi​)⋅U(radicalMin,radicalMax)

Defaults:

- `radicalMin = 35`
- `radicalMax = 50`

---

## 5. Influencer Reach Model (Key Design)

### 5.1 Core Idea

Influencer reach is **spatially radial**, but **probabilistic and noisy**, so:

- Most influence is local.
- Some influence “leaks” further.
- Rarely, distant agents are affected.

This avoids explicit reach-type selection.

---

### 5.2 Reach Probability

For agent iii at distance ddd from influencer origin:

P(influenced)=e−d/R+ϵP(\text{influenced}) = e^{-d / R} + \epsilonP(influenced)=e−d/R+ϵ

Where:

- RRR is the **base reach radius**.
- ϵ\epsilonϵ is a **global leak probability**.

Parameters:

- `reachRadius (R)` ∈ [3, 20], default 8
- `reachLeakProbability (ε)` ∈ [0, 0.05], default 0.01

Interpretation:

- Nearby agents almost always hear the message.
- Far agents sometimes hear it “via platform amplification.”

---

### 5.3 Influence Weight

If agent iii is influenced:

wi=e−d/Rw_i = e^{-d / R}wi​=e−d/R

Weight is multiplied into the influencer force.

---

## 6. Influence Effect (Polarization Logic)

### 6.1 Two-Mode Polarization (Default)

For influenced agent iii:

If:

- `sign(b_i) != sign(M)` AND
- `|M - b_i| > backlashThreshold`

Then **reactance backlash**:

Δiinf=+β⋅wi⋅sign(bi)\Delta_i^{inf} = +\beta \cdot w_i \cdot \text{sign}(b_i)Δiinf​=+β⋅wi​⋅sign(bi​)

Else **persuasion**:

Δiinf=α⋅wi⋅(M−bi)\Delta_i^{inf} = \alpha \cdot w_i \cdot (M - b_i)Δiinf​=α⋅wi​⋅(M−bi​)

Parameters:

- `influenceStrength (α)` ∈ [0,1]
- `backlashStrength (β)` ∈ [0,2]
- `backlashThreshold` ∈ [10, 50]

This creates **splitting behavior**, not simple convergence.

---

## 7. Event Lifetime and Decay

Influencers are temporary.

Parameters:

- `ttl` (timesteps), default 20
- `decayType`: none | linear | exponential
- `decayRate` (for exponential)

Amplitude multiplier over time:

- Linear: a(t)=1−t/ttla(t) = 1 - t/ttla(t)=1−t/ttl
- Exponential: a(t)=e−t/τa(t) = e^{-t/\tau}a(t)=e−t/τ

---

## 8. Integration with Existing Systems

### 8.1 Update Order (Per Timestep)

1. Compute local updates:

   - susceptibility,
   - backlash,
   - momentum.

2. Compute influencer deltas.
3. Sum forces.
4. Apply momentum (if enabled).
5. Clamp belief and velocity.

---

### 8.2 Batch Runs

- Influencer spawning uses the same RNG stream.
- Batch metrics must record:
  - number of influencer events,
  - average reach size,
  - belief variance over time,
  - district flips.

Rendering disabled.

---

## 9. Configuration Model

`type InfluencerConfig = {   enabled: boolean    spawnRate: number   homogeneityThreshold: number   homogeneitySharpness: number    radicalMin: number   radicalMax: number    reachRadius: number   reachLeakProbability: number    influenceStrength: number   backlashStrength: number   backlashThreshold: number    ttl: number   decayType: "none" | "linear" | "exp"   decayRate?: number }`

---

## 10. UI Requirements

Pre-run configuration only.

Controls:

- Toggle: Enable Influencers
- Sliders:
  - Spawn rate
  - Homogeneity threshold
  - Reach radius
  - Leak probability
  - Influence strength
  - Backlash threshold
  - TTL

Tooltips emphasize:

- “Influencers represent rare, high-impact ideological shocks.”
- “Leak probability allows ideas to spread beyond local neighborhoods.”

---

## 11. Acceptance Criteria

- Influencers spawn rarely and stochastically.
- Events are more frequent in ideologically uniform regions.
- Influencer beliefs are radical and opposite to surroundings.
- Influence spreads primarily locally, with occasional long-range effects.
- Exposure polarizes the population rather than homogenizing it.
- District outcomes show higher volatility compared to non-influencer runs.
- Feature is deterministic with fixed seed.
