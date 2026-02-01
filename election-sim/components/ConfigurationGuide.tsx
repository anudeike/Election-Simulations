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
          <li><strong>Update</strong>: Each timestep, every agent updates their belief based on <strong>neighbors</strong> and the chosen <strong>update function</strong>. Beliefs are clamped to [-50, 50].</li>
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
          <li>Update: b_new = b + s(m − b); then optional noise; then clamp to [-50, 50].</li>
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
