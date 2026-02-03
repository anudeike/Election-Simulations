# Feature PRD: Identity / Belief Momentum

## 1. Feature Summary

Add **belief momentum** to the opinion update system so that agents exhibit **inertia and overshoot** in belief change.

Instead of beliefs responding instantaneously to social influence, agents accumulate **directional momentum**, causing:

- delayed response to persuasion,
- overshooting past local means,
- oscillations and hysteresis,
- stronger path dependence.

This feature applies to:

- **Single interactive runs**
- **Batch runs**

Momentum is configurable per run and immutable during execution.

---

## 2. Motivation

Current update functions, even with susceptibility and backlash, assume agents are _memoryless_, beliefs respond immediately to forces.

In reality:

- Beliefs have inertia.
- People continue “moving” ideologically even after influence weakens.
- Opinion shifts overshoot and correct slowly.
- Shocks have lingering effects.

Momentum introduces **temporal depth** to belief dynamics and dramatically increases complexity with minimal added state.

---

## 3. Design Principles

- Momentum must be **additive**, not replace existing update logic.
- Momentum must be **bounded** to preserve stability.
- Momentum should be **optional** and parameterized.
- Momentum must integrate with:
  - susceptibility,
  - backlash,
  - batch execution,
  - deterministic seeds.

---

## 4. Conceptual Model

Each agent iii has:

- belief bi∈[−50,50]b_i \in [-50, 50]bi​∈[−50,50]
- belief velocity (momentum) viv_ivi​

Momentum represents the _direction and persistence_ of belief change.

---

## 5. Update Model

### 5.1 Two-Step Update (Velocity + Position)

Each timestep:

1. **Update velocity** based on social forces:

vinew=λvi+Δiv_i^{new} = \lambda v_i + \Delta_ivinew​=λvi​+Δi​

2. **Update belief**:

binew=bi+vinewb_i^{new} = b_i + v_i^{new}binew​=bi​+vinew​

Where:

- λ∈[0,1]\lambda \in [0,1]λ∈[0,1] is the **momentum retention**
- Δi\Delta_iΔi​ is the net influence computed from:
  - assimilation,
  - backlash,
  - other enabled effects

Clamp:

- vinew∈[−vmax,vmax]v*i^{new} \in [-v*{max}, v\_{max}]vinew​∈[−vmax​,vmax​]
- binew∈[−50,50]b_i^{new} \in [-50, 50]binew​∈[−50,50]

---

## 6. Momentum Parameters

### Required Parameters

- `momentumEnabled` boolean
- `momentumRetention (λ)` ∈ [0, 1]
  - default 0.7
- `maxVelocity` ∈ [0, 10]
  - default 2.0

### Optional Parameters

- `velocityDampingNearCenter`
  - reduces velocity when |b| small
- `velocityDampingNearExtremes`
  - prevents runaway polarization

---

## 7. Interaction With Existing Update Components

Momentum does **not** change how influence is computed, only _how it accumulates_.

### 7.1 Interaction with Susceptibility

- Susceptibility scales the force Δi\Delta_iΔi​
- Momentum integrates the scaled force over time

Result:

- Extremists still change slowly,
- But once moving, they keep moving.

---

### 7.2 Interaction with Backlash

- Backlash modifies the **sign and direction** of Δi\Delta_iΔi​
- Momentum preserves backlash-induced shifts over multiple steps

Result:

- One extreme encounter can cause long-term radicalization.

---

### 7.3 Interaction with Elections

- Momentum carries post-election reinforcement forward
- District flips can lag behind belief change or overshoot

---

## 8. Configuration Model

`type MomentumConfig = {   enabled: boolean    retention: number        // λ   maxVelocity: number    damping?: {     nearCenter?: number    // optional multiplier     nearExtremes?: number   } }`

---

## 9. UI Requirements

Pre-run configuration only.

Controls:

- Toggle: Enable Belief Momentum
- Slider: Momentum Retention (λ)
- Slider: Max Velocity
- Optional advanced section:
  - Damping near center
  - Damping near extremes

Tooltips:

- “Momentum causes beliefs to continue changing even after influence weakens.”

---

## 10. Batch Run Integration

- Batch runs must initialize velocity arrays to zero.
- Momentum logic identical to single runs.
- Batch metrics should optionally record:
  - average velocity magnitude over time,
  - oscillation counts,
  - time to stabilization.

Rendering disabled during batch execution.

---

## 11. Acceptance Criteria

- Momentum can be toggled per run.
- With momentum enabled:
  - belief trajectories overshoot local means,
  - convergence slows or oscillates,
  - polarization persists longer.
- Momentum respects belief bounds.
- Runs are deterministic with fixed seed.
- No performance degradation at 5000 agents.

---

## 12. Non-Goals

- No agent-specific momentum parameters.
- No adaptive learning of momentum.
- No memory beyond velocity state.
- No mid-run configuration changes.

---

## 13. Implementation Notes (Cursor)

- Add `velocity: Float32Array` parallel to `beliefs`.
- Keep momentum logic inside update loop, not separate passes.
- Clamp velocity before applying to belief.
- Ensure velocity resets on simulation reset.
- Unit tests:
  - velocity decay with λ < 1,
  - clamping at extremes,
  - interaction with backlash sign changes.
