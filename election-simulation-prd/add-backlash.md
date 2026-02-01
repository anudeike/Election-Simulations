Feature PRD: Backlash-Based Opinion Update Functions

## 1. Feature Summary

Introduce a **backlash mechanism** into the opinion update system such that agents may **move further in their current ideological direction** when exposed to beliefs that are sufficiently extreme in the opposite direction.

This feature expands the existing update-function framework and applies uniformly to:

- **Single interactive simulations**
    
- **Batch simulations**
    

Backlash behavior is configurable per run and immutable during execution.

---

## 2. Motivation

Current susceptibility-based update functions allow agents to resist persuasion but still assume influence is always attractive (toward neighbors).

In real belief systems:

- Exposure to extreme opposing views often causes **reactance**, not moderation.
    
- Individuals can radicalize when they perceive ideological threat.
    
- Polarization emerges even in locally mixed neighborhoods.
    

Backlash dynamics are required to:

- Prevent universal convergence.
    
- Produce asymmetric polarization.
    
- Create persistent, ideologically homogeneous districts.
    

---

## 3. Design Principles

- Backlash should be **local**, triggered by nearby neighbors.
    
- Backlash must be **conditional**, not always active.
    
- The mechanism must be **parameterized and interpretable**.
    
- Backlash must compose cleanly with:
    
    - distance-based susceptibility,
        
    - extremity-based stubbornness,
        
    - batch execution.
        

---

## 4. Conceptual Model

For an agent iii with belief bib_ibi​:

1. Compute a local signal (neighbor mean or neighbor deltas).
    
2. Detect whether exposure crosses a **backlash trigger condition**.
    
3. If triggered:
    
    - apply a **repulsive influence**, pushing the agent further in the direction of sign(bi)\text{sign}(b_i)sign(bi​).
        
4. Otherwise:
    
    - fall back to normal assimilative update behavior.
        

---

## 5. Backlash Trigger Conditions

The user must be able to select how backlash is triggered.

### Trigger Types

#### 5.1 Gap-Based Trigger (default)

Backlash occurs when a neighbor’s belief differs too much from the agent’s.

Condition:

∣bj−bi∣>T∧bi⋅bj<0|b_j - b_i| > T \quad \land \quad b_i \cdot b_j < 0∣bj​−bi​∣>T∧bi​⋅bj​<0

Parameter:

- `backlashGapThreshold (T)` ∈ [0,100]
    

---

#### 5.2 Extremity-Based Trigger

Backlash occurs when a neighbor is ideologically extreme on the opposite side.

Condition:

∣bj∣>R∧bi⋅bj<0|b_j| > R \quad \land \quad b_i \cdot b_j < 0∣bj​∣>R∧bi​⋅bj​<0

Parameter:

- `backlashExtremityThreshold (R)` ∈ [0,50]
    

---

#### 5.3 Mean-Based Trigger

Backlash occurs when the **local mean opinion** is too far opposite.

Condition:

∣mi−bi∣>T∧bi⋅mi<0|m_i - b_i| > T \quad \land \quad b_i \cdot m_i < 0∣mi​−bi​∣>T∧bi​⋅mi​<0

Parameter:

- `backlashMeanThreshold (T)`
    

---

## 6. Backlash Update Function Modes

### 6.1 Mode A: Piecewise Assimilation vs Repulsion (Core Mode)

**Definition**

For each neighbor jjj:

Δij={−ρ(bj−bi)if backlash triggered(bj−bi)otherwise\Delta_{ij} = \begin{cases} -\rho (b_j - b_i) & \text{if backlash triggered} \\ (b_j - b_i) & \text{otherwise} \end{cases}Δij​={−ρ(bj​−bi​)(bj​−bi​)​if backlash triggeredotherwise​

Aggregate update:

binew=bi+η∑jwijΔijb_i^{new} = b_i + \eta \sum_j w_{ij} \Delta_{ij}binew​=bi​+ηj∑​wij​Δij​

**Parameters**

- `stepSize (η)` ∈ [0,1]
    
- `backlashStrength (ρ)` ∈ [0,2]
    
- `triggerThreshold (T or R)`
    

**Behavior**

- Normal social influence under mild disagreement.
    
- Active repulsion under extreme opposition.
    
- Produces sharp ideological boundaries.
    

---

### 6.2 Mode B: Smooth Backlash (Logistic Repulsion)

Backlash turns on smoothly rather than abruptly.

Gate function:

g(d)=11+e−k(d−T)g(d) = \frac{1}{1 + e^{-k(d - T)}}g(d)=1+e−k(d−T)1​

Signed influence:

Δij=(1−(1+ρ)g(dij))(bj−bi)\Delta_{ij} = (1 - (1 + \rho) g(d_{ij})) (b_j - b_i)Δij​=(1−(1+ρ)g(dij​))(bj​−bi​)

**Parameters**

- `backlashThreshold (T)`
    
- `backlashStrength (ρ)`
    
- `backlashSteepness (k)`
    
- `stepSize (η)`
    

**Behavior**

- More realistic transitions.
    
- Avoids brittle phase jumps.
    

---

### 6.3 Mode C: Identity Reinforcement Push

Instead of repelling away from neighbors, backlash pushes **toward the agent’s current identity**.

Condition:

- Backlash trigger satisfied.
    

Update:

binew=bi+ηa(mi−bi)+ηb⋅sign(bi)b_i^{new} = b_i + \eta_a(m_i - b_i) + \eta_b \cdot \text{sign}(b_i)binew​=bi​+ηa​(mi​−bi​)+ηb​⋅sign(bi​)

**Parameters**

- `assimilationRate (η_a)`
    
- `backlashPush (η_b)`
    
- `backlashThreshold`
    

**Behavior**

- Preserves identity narratives.
    
- Strong radicalization under threat.
    

---

## 7. Interaction with Existing Susceptibility

Backlash modifies **direction**, susceptibility modifies **magnitude**.

Final update:

binew=bi+si⋅Δib_i^{new} = b_i + s_i \cdot \Delta_ibinew​=bi​+si​⋅Δi​

Where:

- sis_isi​ comes from existing susceptibility functions.
    
- Backlash affects only the sign and structure of Δi\Delta_iΔi​.
    

This ensures:

- Extremists still update slowly.
    
- When they do update, backlash can dominate.
    

---

## 8. Configuration Model

`type BacklashConfig = {   enabled: boolean    triggerType: "gap" | "extremity" | "mean"    threshold: number    mode: "piecewise" | "smooth" | "identity_push"    strength: number    steepness?: number // smooth mode only    capPerStep?: number // optional safety clamp }`

---

## 9. UI Requirements

Pre-run configuration only.

- Toggle: Enable Backlash
    
- Dropdown: Backlash Trigger Type
    
- Slider: Threshold
    
- Dropdown: Backlash Mode
    
- Slider: Backlash Strength
    
- Optional: Smoothness / Steepness
    

Show contextual tooltips explaining:

- “Backlash causes agents to move _away_ from extreme opposing beliefs.”
    

---

## 10. Batch Run Integration

- Batch runs must accept identical `BacklashConfig`.
    
- Backlash must be applied identically in batch and single runs.
    
- Batch metrics should record:
    
    - final polarization,
        
    - number of districts flipping,
        
    - time to stabilization.
        

Rendering is disabled during batch runs.

---

## 11. Acceptance Criteria

- Backlash can be enabled or disabled per run.
    
- Threshold clearly controls when repulsion activates.
    
- Moderate disagreement still assimilates.
    
- Extreme opposition produces visible polarization.
    
- District outcomes differ significantly from non-backlash runs.
    
- Behavior is deterministic with fixed seed.
    
- Beliefs remain bounded.
    

---

## 12. Non-Goals (Explicit)

- No mid-run parameter changes.
    
- No learning or memory of past backlash.
    
- No agent heterogeneity beyond belief value.
    
- No ideological identity groups (yet).
    

---

## 13. Notes for Cursor Implementation

- Implement backlash as a **layer** inside the update step.
    
- Do not duplicate update loops.
    
- Use strategy functions for backlash modes.
    
- Add unit tests for:
    
    - trigger correctness,
        
    - sign inversion,
        
    - clamping behavior.