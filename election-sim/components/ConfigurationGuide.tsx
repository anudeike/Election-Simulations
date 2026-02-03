'use client';

export function ConfigurationGuide() {
  return (
    <article className="max-w-3xl mx-auto p-6 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 text-sm leading-relaxed overflow-y-auto max-h-[calc(100vh-12rem)]">
      <h2 className="text-xl font-bold text-slate-100 mb-4">Configuration Guide</h2>
      <p className="mb-4">
        This guide explains all simulation parameters and update functions in the Opinion Dynamics & District Elections Simulator.
      </p>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">How the simulation works</h3>
        <ul className="list-disc pl-5 space-y-1 mb-4">
          <li><strong>Grid</strong>: Each cell has one agent with a <strong>belief</strong> in [-50, 50].</li>
          <li><strong>Voting</strong>: Each timestep, agents vote <strong>red</strong> if belief ≥ 0, <strong>blue</strong> if belief &lt; 0.</li>
          <li><strong>Districts</strong>: The grid is divided into fixed districts. Each district’s winner is the majority color (red/blue); ties show as purple.</li>
          <li><strong>Update</strong>: Each timestep, every agent updates their belief based on <strong>neighbors</strong> and the chosen <strong>update function</strong>. Optional <strong>influencer events</strong> can add influence from rare radical actors. Beliefs are clamped to [-50, 50].</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Update functions (pipeline)</h3>
        <p className="mb-2">All update functions use the same steps:</p>
        <ol className="list-decimal pl-5 space-y-1 mb-4">
          <li>Compute the <strong>neighbor mean</strong> m (average belief of active neighbors).</li>
          <li>Compute <strong>distance</strong> d = |b − m|.</li>
          <li>Compute <strong>susceptibility</strong> s ∈ [0, 1] from the chosen formula.</li>
          <li>Optionally apply <strong>extremity stubbornness</strong>.</li>
          <li>Compute <strong>backlash</strong> and <strong>influencer</strong> terms (if enabled).</li>
          <li>Update: b_new = b + s·Δ_local + Δ_influencer; then optional noise; then clamp to [-50, 50].</li>
        </ol>
        <p>Higher susceptibility → agent moves more toward neighbors; lower → agent resists change.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">1. Pure average (α)</h3>
        <p><strong>Formula</strong>: s = α</p>
        <p><strong>Parameter</strong>: Base rate α (0–1). Default 1.</p>
        <p className="mt-1">Susceptibility is constant. With α = 1, the agent fully adopts the neighbor mean each step (like diffusion). Lower α slows convergence. Use for baseline comparison.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">2. Bounded confidence (ε)</h3>
        <p><strong>Formula</strong>: s = α if d ≤ ε, else s = 0</p>
        <p><strong>Parameters</strong>: Base rate α (0–1), Confidence radius ε (0–100). Defaults 0.3, 15.</p>
        <p className="mt-1">The agent only updates if the neighbor mean is within ε of their current belief. Beyond that, they ignore neighbors. Produces <strong>opinion clusters</strong>; different clusters can persist (polarization).</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">3. Exponential decay (τ)</h3>
        <p><strong>Formula</strong>: s = α · e^(−d/τ)</p>
        <p><strong>Parameters</strong>: Base rate α, Stubborn scale τ (1–100). Defaults 0.4, 15.</p>
        <p className="mt-1">Susceptibility falls off smoothly as distance increases. Larger τ → influence extends farther; smaller τ → only very close opinions matter. Smooth clustering without a hard cutoff.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">4. Rational decay (τ, p) — recommended</h3>
        <p><strong>Formula</strong>: s = α / (1 + (d/τ)^p)</p>
        <p><strong>Parameters</strong>: Base rate α, Stubborn scale τ (1–100), Shape p (1–6). Defaults 0.4, 20, 2.</p>
        <p className="mt-1">At d = 0, s = α. As distance grows, s drops. τ sets the distance scale; p controls sharpness (larger p = sharper drop). Good balance of clustering and path dependence.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">5. Logistic gate (τ, k)</h3>
        <p><strong>Formula</strong>: s = α / (1 + e^(k(d − τ)))</p>
        <p><strong>Parameters</strong>: Base rate α, Stubborn scale τ (1–100), Steepness k (0.1–2). Defaults 0.4, 15, 0.5.</p>
        <p className="mt-1">S-shaped transition: when d ≪ τ, s ≈ α; when d ≫ τ, s → 0. τ is the “tolerance” distance; k controls how steep the switch is. Strong local consensus with rapid cutoff beyond tolerance.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Extremity-based stubbornness (β)</h3>
        <p className="mb-2">Applies to all update modes. Toggle + parameter β (0–1). Default 0 (off).</p>
        <p className="mb-2"><strong>Formula</strong>: extremity e = |b|/50; then s_final = s · (1 − β·e).</p>
        <p>Agents with more extreme beliefs (far from 0) are less susceptible. With β = 1, agents at ±50 don’t move. Slows convergence and can lock in polarization.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Step noise</h3>
        <p>Range 0–5. Default 0. Each timestep, after the update, a random value in [-noise, noise] is added before clamping. 0 = deterministic (with a fixed seed).</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Backlash</h3>
        <p className="mb-2">When enabled, agents can move <strong>away</strong> from extreme opposing beliefs (repulsion). Backlash changes the <strong>direction</strong> of influence; susceptibility still scales the <strong>magnitude</strong>. Final update: b_new = b + s·Δ.</p>
        <p className="mb-2"><strong>Trigger type</strong>: Gap (|b_j − b_i| &gt; T, opposite side), Extremity (|b_j| &gt; R, opposite side), or Mean (|m − b| &gt; T, opposite side). <strong>Trigger scope</strong>: Per neighbor (check each neighbor j) or Per agent (one check per agent).</p>
        <p className="mb-2"><strong>Modes</strong>: Piecewise (if triggered Δ = −ρ(pull), else Δ = pull), Smooth (logistic repulsion), Identity push (Δ = η_a(m − b) + η_b·sign(b) when triggered). Parameters: strength ρ (0–2), step size η (0–1), optional steepness k, cap per step.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Belief momentum</h3>
        <p className="mb-2">When enabled, agents accumulate <strong>velocity</strong> (momentum) instead of updating beliefs directly. Beliefs exhibit inertia, overshoot, and oscillations. <strong>Enable</strong>: Toggle on/off.</p>
        <p className="mb-2"><strong>Momentum retention λ</strong> (0–1): Fraction of current velocity carried to the next step. Default 0.7. Higher λ → more inertia, slower decay. λ = 0 → instant response. λ = 1 → velocity never decays (only capped by max velocity).</p>
        <p className="mb-2"><strong>Max velocity</strong> (0–10): Configurable cap on velocity magnitude. Prevents runaway growth when λ is high. Default 2. Beliefs can change by at most this much per step from velocity alone.</p>
        <p className="mb-2"><strong>Damping near center</strong> (0–1): When |b| &lt; 15, multiply velocity by (1 − damping). 0 = no effect. Higher values slow agents near the center; use to reduce oscillation around 0.</p>
        <p className="mb-2"><strong>Damping near extremes</strong> (0–1): When |b| &gt; 35, multiply velocity by (1 − damping). Prevents runaway polarization; extremists slow down as they approach ±50.</p>
        <p className="mb-2"><strong>Batch metrics</strong> (when momentum enabled): Average velocity magnitude over time, oscillation count (sign changes in mean belief derivative), time to stabilization (first t when max|v| &lt; 0.01 for 5 consecutive steps).</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Influencer events</h3>
        <p className="mb-2">When enabled, rare <strong>influencer events</strong> spawn stochastically. Influencers represent radical actors whose ideas can spread beyond immediate neighbors, producing sudden ideological cascades and polarization spikes.</p>
        <p className="mb-2"><strong>Spawn</strong>: Probability per timestep (0.0001–0.01). Default 0.0005. Influencers are more likely in <strong>ideologically uniform</strong> regions. <strong>Homogeneity threshold</strong> (0.5–1): Minimum fraction of neighbors that must share the cell’s sign for it to be a spawn candidate; default 0.85 = at least 85% agreement. Higher = only “echo chambers” qualify. <strong>Homogeneity sharpness</strong> γ (1–5): Exponent in spawn weight; higher γ = spawns concentrate in the most uniform regions; lower γ = more even spread across qualifying cells. Message is <strong>opposite</strong> to local mean with radical magnitude (radical min/max 0–50).</p>
        <p className="mb-2"><strong>Reach</strong>: P(influenced) = e^(−d/R) + ε. Reach radius R (3–20), leak probability ε (0–0.05). Distance metric: Euclidean or Chebyshev. Weight w = e^(−d/R) × decay.</p>
        <p className="mb-2"><strong>Effect</strong>: If sign(b) ≠ sign(M) and |M − b| &gt; backlash threshold → <strong>backlash</strong> (Δ = +β·w·sign(b)). Else → <strong>persuasion</strong> (Δ = α·w·(M − b)). Influence strength α (0–1), backlash strength β (0–2), backlash threshold (10–50).</p>
        <p className="mb-2"><strong>Lifetime</strong>: TTL (timesteps). Decay: none, linear (a = 1 − t/TTL), or exponential (a = e^(−t/τ), τ = TTL/decayRate).</p>
        <p className="mb-2"><strong>Visual indicators</strong>: Yellow flash on origin and affected cells (fades over 2–3 steps). Toast notification when an influencer spawns (auto-dismisses after 3 seconds).</p>
        <p className="mb-2"><strong>Batch metrics</strong> (when influencers enabled): Influencer events count, avg reach size, district flips, belief variance (end).</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Neighborhood</h3>
        <p><strong>Von Neumann (4)</strong>: up, down, left, right. <strong>Moore (8)</strong>: plus the four diagonals. Edge cells only count neighbors that exist.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Initial beliefs</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Uniform</strong>: Random belief in [-50, 50].</li>
          <li><strong>Normal(0, σ)</strong>: Draw from normal with mean 0, std σ; clamp. σ = “σ / spread” param.</li>
          <li><strong>Bimodal ±μ</strong>: Two normals at +μ and −μ; each agent assigned to one at random.</li>
          <li><strong>Spatial (Perlin)</strong>: 2D Perlin noise over the grid, scaled to [-50, 50]. <strong>Detail (1–20)</strong>: higher = finer variation; lower = smoother blobs. With a seed, deterministic.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Districts</h3>
        <p>District count and method (Rectangular divides grid into rectangles; contiguous, compact, balanced). Boundaries are fixed at start; only the red/blue/purple outcome updates each timestep.</p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Run controls</h3>
        <p><strong>Single run</strong>: Steps/sec (1–60), Steps per frame (1–10), Max timesteps (0 = ∞), Seed (optional, for reproducibility).</p>
        <p className="mt-2"><strong>Batch run</strong>: Number of runs X, Timesteps per run Y. Same config run X times with different seeds; chart shows mean red/blue % over time and ±1 std band.</p>
      </section>

      <section className="mb-4">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Summary table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border border-slate-600 rounded">
            <thead>
              <tr className="bg-slate-700/80">
                <th className="p-2 border-b border-slate-600">Setting</th>
                <th className="p-2 border-b border-slate-600">What it does</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr><td className="p-2 border-b border-slate-600">Update function</td><td className="p-2 border-b border-slate-600">How much agents move toward neighbor mean; can depend on distance.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Base rate α</td><td className="p-2 border-b border-slate-600">Maximum susceptibility (0–1).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Confidence radius ε</td><td className="p-2 border-b border-slate-600">(Bounded confidence) Max distance for any update.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Stubborn scale τ</td><td className="p-2 border-b border-slate-600">(Exponential/Rational/Logistic) Distance scale for decay.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Shape p</td><td className="p-2 border-b border-slate-600">(Rational) Sharpness of decay (1–6).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Steepness k</td><td className="p-2 border-b border-slate-600">(Logistic) Sharpness of S-curve (0.1–2).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Extremity β</td><td className="p-2 border-b border-slate-600">Reduces susceptibility for extreme beliefs.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Backlash</td><td className="p-2 border-b border-slate-600">Repulsion from extreme opposing beliefs (toggle + trigger, scope, mode, strength).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Trigger scope</td><td className="p-2 border-b border-slate-600">Per neighbor (each j) or per agent (one check).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Momentum</td><td className="p-2 border-b border-slate-600">When enabled, beliefs accumulate velocity; inertia and overshoot.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Momentum retention λ</td><td className="p-2 border-b border-slate-600">Fraction of velocity retained each step (0–1).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Max velocity</td><td className="p-2 border-b border-slate-600">Cap on velocity magnitude (0–10); prevents runaway growth.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Damping near center</td><td className="p-2 border-b border-slate-600">Reduces velocity when |b| &lt; 15 (0–1).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Damping near extremes</td><td className="p-2 border-b border-slate-600">Reduces velocity when |b| &gt; 35; prevents runaway polarization.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Influencer events</td><td className="p-2 border-b border-slate-600">Rare radical actors spawn and influence agents beyond neighbors (toggle + spawn rate, homogeneity, reach, effect, decay).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Spawn rate</td><td className="p-2 border-b border-slate-600">Probability per timestep (0.0001–0.01).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Homogeneity threshold</td><td className="p-2 border-b border-slate-600">Min fraction of same-sign neighbors for spawn (0.5–1); higher = only echo chambers qualify.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Homogeneity sharpness γ</td><td className="p-2 border-b border-slate-600">Exponent in spawn weight (1–5); higher = concentrate in most uniform regions.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Reach radius / leak</td><td className="p-2 border-b border-slate-600">Distance scale R (3–20), global leak ε (0–0.05).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Influence α / backlash β</td><td className="p-2 border-b border-slate-600">Persuasion rate (0–1), reactance strength (0–2).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Step noise</td><td className="p-2 border-b border-slate-600">Random jitter each step (0 = off).</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Neighborhood</td><td className="p-2 border-b border-slate-600">4 or 8 neighbors per cell.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Initial beliefs</td><td className="p-2 border-b border-slate-600">Uniform, normal, bimodal, or Perlin.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Perlin detail</td><td className="p-2 border-b border-slate-600">(When Perlin) 1 = smooth, 20 = very detailed.</td></tr>
              <tr><td className="p-2 border-b border-slate-600">Districts</td><td className="p-2 border-b border-slate-600">Number and shape of fixed districts.</td></tr>
              <tr><td className="p-2">Seed</td><td className="p-2">Makes the run reproducible when set.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
