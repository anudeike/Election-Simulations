# Feature PRD: Configurable Opinion Update Functions (Single + Batch Runs)

## 1. Feature Summary

Add a **configurable opinion update function framework** that allows users to select and parameterize how agents update beliefs based on neighbors.

This feature applies identically to:

- **Single simulations**, interactive visual runs.
    
- **Batch simulations**, repeated runs with identical configuration and aggregated outcomes.
    

The goal is to move beyond pure averaging (which trivially converges) and allow **state-dependent susceptibility**, where agents with more extreme or distant opinions are less likely to change.

---

## 2. Motivation

The current update rule is equivalent to diffusion and converges rapidly to consensus near zero.

To study polarization, clustering, path dependence, and district-level effects, the update rule must:

- Reduce susceptibility as belief distance increases.
    
- Optionally reduce susceptibility for agents with extreme beliefs.
    
- Support multiple functional forms to compare dynamics.
    
- Be configurable per run, but immutable during execution.
    

---

## 3. Scope

### In Scope

- Multiple selectable update function modes.
    
- Parameterized susceptibility functions.
    
- Optional extremity-based stubbornness.
    
- Works for:
    
    - Single run simulations.
        
    - Batch runs (Monte Carlo style).
        
- Deterministic under fixed seed.
    

### Out of Scope

- Dynamic update function switching mid-run.
    
- Learning or adaptation of parameters over time.
    
- Social identity or repulsion dynamics (future work).
    

---

## 4. User Experience

### 4.1 Configuration (Pre-Run Only)

The user must select an **Update Function Mode** before starting a run or batch.

UI Elements:

- Dropdown: `Update Function Type`
    
- Parameter sliders or numeric inputs that change based on selection.
    
- Tooltip explanations for each parameter.
    

Once the simulation starts, update function parameters are **locked** until reset.

---

## 5. Update Function Architecture

### 5.1 Common Structure

All update functions share the same high-level structure:

1. Compute neighbor aggregate mim_imi​ (mean of neighbors).
    
2. Compute distance from local opinion:
    
    di=∣bi−mi∣d_i = |b_i - m_i|di​=∣bi​−mi​∣
3. Compute susceptibility si∈[0,1]s_i \in [0,1]si​∈[0,1].
    
4. Update belief:
    
    binew=bi+si(mi−bi)b_i^{new} = b_i + s_i (m_i - b_i)binew​=bi​+si​(mi​−bi​)
5. Clamp to belief bounds [-50, 50].
    

This guarantees numerical stability and bounded updates.

---

## 6. Supported Update Function Modes

### 6.1 Mode 1: Pure Neighbor Averaging (Baseline)

**Purpose**: Baseline comparison, current behavior.

**Definition**:

si=αs_i = \alphasi​=α

**Parameters**:

- `baseRate (α)` ∈ [0,1], default 1.0
    

**Notes**:

- Equivalent to current MVP behavior.
    
- Expected to converge rapidly.
    

---

### 6.2 Mode 2: Hard Bounded Confidence (Cutoff)

Agents only update if neighbor opinions are within a confidence bound.

**Definition**:

si={αdi≤ε0di>εs_i = \begin{cases} \alpha & d_i \le \varepsilon \\ 0 & d_i > \varepsilon \end{cases}si​={α0​di​≤εdi​>ε​

**Parameters**:

- `baseRate (α)` ∈ [0,1], default 0.3
    
- `confidenceRadius (ε)` ∈ [0,100], default 15
    

**Expected Behavior**:

- Formation of stable opinion clusters.
    
- Long-term polarization possible.
    

---

### 6.3 Mode 3: Exponential Decay Susceptibility

Susceptibility decays smoothly with distance.

**Definition**:

si=α⋅e−di/τs_i = \alpha \cdot e^{-d_i / \tau}si​=α⋅e−di​/τ

**Parameters**:

- `baseRate (α)` ∈ [0,1], default 0.4
    
- `stubbornScale (τ)` ∈ [1,100], default 15
    

**Expected Behavior**:

- Smooth convergence with persistent tails.
    
- Less brittle than cutoff.
    

---

### 6.4 Mode 4: Rational (Polynomial) Decay Susceptibility (Recommended Default)

A smooth, controllable decay with adjustable sharpness.

**Definition**:

si=α1+(di/τ)ps_i = \frac{\alpha}{1 + (d_i / \tau)^p}si​=1+(di​/τ)pα​

**Parameters**:

- `baseRate (α)` ∈ [0,1], default 0.4
    
- `stubbornScale (τ)` ∈ [1,100], default 20
    
- `shape (p)` ∈ [1,6], default 2
    

**Expected Behavior**:

- Stable clusters.
    
- Strong path dependence.
    
- Good balance between realism and controllability.
    

---

### 6.5 Mode 5: Logistic Gate (S-Curve)

Sharp transition between influence and stubbornness.

**Definition**:

si=α1+ek(di−τ)s_i = \frac{\alpha}{1 + e^{k(d_i - \tau)}}si​=1+ek(di​−τ)α​

**Parameters**:

- `baseRate (α)` ∈ [0,1], default 0.4
    
- `stubbornScale (τ)` ∈ [1,100], default 15
    
- `steepness (k)` ∈ [0.1, 2], default 0.5
    

**Expected Behavior**:

- Strong local consensus.
    
- Rapid cutoff beyond tolerance threshold.
    

---

## 7. Optional Extremity-Based Stubbornness (Applies to All Modes)

Agents with more extreme beliefs are less susceptible overall.

**Extremity Measure**:

ei=∣bi∣50e_i = \frac{|b_i|}{50}ei​=50∣bi​∣​

**Modifier**:

sifinal=si⋅(1−βei)s_i^{final} = s_i \cdot (1 - \beta e_i)sifinal​=si​⋅(1−βei​)

**Parameters**:

- `extremityStubbornness (β)` ∈ [0,1], default 0 (disabled)
    

**Notes**:

- When enabled, extremists resist change even in moderate neighborhoods.
    
- Can dramatically slow convergence and lock polarization.
    

---

## 8. Batch Run Integration

### 8.1 Batch Configuration

Batch runs reuse the **exact same update configuration** as single runs.

Batch config includes:

- Update function type.
    
- All relevant parameters.
    
- Random seed strategy:
    
    - fixed seed (deterministic batch),
        
    - or seed offset per run.
        

### 8.2 Batch Outputs (Minimum)

For each batch:

- Final belief distribution summary:
    
    - mean, variance, skew.
        
- Final district seat counts.
    
- Time to stabilization (optional metric).
    
- Optional snapshots at selected timesteps.
    

Batch runs do **not** require rendering each timestep.

---

## 9. Data Model Additions

### 9.1 Update Function Config

`type UpdateFunctionConfig =   | {       type: "average"       baseRate: number     }   | {       type: "bounded_confidence"       baseRate: number       confidenceRadius: number     }   | {       type: "exponential_decay"       baseRate: number       stubbornScale: number     }   | {       type: "rational_decay"       baseRate: number       stubbornScale: number       shape: number     }   | {       type: "logistic"       baseRate: number       stubbornScale: number       steepness: number     }  type ExtremityConfig = {   enabled: boolean   extremityStubbornness: number }`

---

## 10. Acceptance Criteria

- User can select any update function before running.
    
- Parameter UI updates dynamically based on function type.
    
- Extremity-based stubbornness can be toggled independently.
    
- Single runs visibly diverge from trivial consensus under non-average modes.
    
- Batch runs execute correctly using the same logic without rendering.
    
- Results are deterministic with fixed seeds.
    
- No update function causes beliefs to exceed bounds.