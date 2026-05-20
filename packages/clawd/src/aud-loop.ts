/**
 * AUD Loop — Algorithmic Utility Delta
 *
 * Scores every candidate AI action route against the current state of the art
 * baseline (raw prompt→model→answer) and weights the delta by the number of
 * people/agents the action would affect.
 *
 * Formula:
 *   AUD = (N × F × V × A × E × T) / (C × L × R × O)
 *
 *   N = reach (people/agents affected)
 *   F = frequency (actions per unit time, normalized 0–1)
 *   V = verifiability gain vs baseline
 *   A = autonomy gain (agent can act without human loop)
 *   E = economic execution gain (settlement efficiency)
 *   T = trust / auditability gain
 *   C = cost (normalized; higher = worse)
 *   L = latency (normalized; higher = worse)
 *   R = risk (0–1; higher = worse)
 *   O = opacity (1 = fully opaque, 0 = fully transparent)
 *
 * The SOTA baseline is the zero point:
 *   prompt → model → answer, unverified, unsettled, unattested
 *
 * ClawdRouter uses AUD to choose the route that maximizes verified action
 * utility per dollar per second per unit of risk.
 */

export type AudRouteMode =
  | "fast"       // cheapest good answer
  | "deep"       // best reasoning
  | "private"    // local/TEE/encrypted preferred
  | "verified"   // only attested models/tools
  | "economic"   // maximize ROI
  | "trading"    // minimize latency + maximize execution probability
  | "court";     // maximum audit trail

export type AudInputFactors = {
  /** Number of people or agents this action affects (raw count, e.g. 1 for a single user, 1e9 for a global model output). */
  reach: number;
  /** Actions per day this route type is called (normalized 0–1 by saturation: >10k/day = 1). */
  frequency: number;
  /** Verifiability gain vs baseline (0 = no improvement, 1 = fully verifiable receipt + attestation). */
  verifiability: number;
  /** Autonomy gain (0 = human must approve every step, 1 = fully autonomous action allowed). */
  autonomy: number;
  /** Economic execution gain (0 = no settlement, 1 = atomic on-chain settlement with near-zero slippage). */
  economicGain: number;
  /** Trust / auditability gain (0 = zero audit trail, 1 = full SAS attestation + memory journal + receipt). */
  trustGain: number;
  /** Cost multiplier, normalized 0–1 (0 = free, 1 = prohibitively expensive). */
  cost: number;
  /** Latency multiplier, normalized 0–1 (0 = instant, 1 = too slow to matter). */
  latency: number;
  /** Risk score 0–1 (0 = provably safe, 1 = maximum risk). */
  risk: number;
  /** Opacity score 0–1 (0 = fully transparent, 1 = completely opaque black box). */
  opacity: number;
};

export type AudResult = {
  /** Raw AUD score — higher is better. */
  score: number;
  /** AUD normalized 0–100 for display. */
  scoreNormalized: number;
  /** Delta vs SOTA baseline (positive = Clawd route is better). */
  deltaVsBaseline: number;
  /** Weighted by reach — the "how many people does this improve things for" number. */
  reachWeightedDelta: number;
  /** Breakdown of numerator and denominator terms. */
  breakdown: {
    numerator: number;
    denominator: number;
    reachTerm: number;
    verifiabilityTerm: number;
    costTerm: number;
    riskTerm: number;
  };
  /** The recommended ClawdRouter mode for this action. */
  recommendedMode: AudRouteMode;
  /** Human-readable summary of what the score means. */
  summary: string;
};

/** Baseline AUD for raw prompt→model→answer (the SOTA zero point). */
const BASELINE_AUD = computeRawAud({
  reach: 1,
  frequency: 0.5,
  verifiability: 0,
  autonomy: 0.3,
  economicGain: 0,
  trustGain: 0,
  cost: 0.15,
  latency: 0.1,
  risk: 0.2,
  opacity: 0.9,
});

function computeRawAud(f: AudInputFactors): number {
  const reachLog = Math.log10(Math.max(f.reach, 1)) + 1; // log-scale reach to prevent domination
  const numerator = reachLog * f.frequency * (1 + f.verifiability) * (1 + f.autonomy) * (1 + f.economicGain) * (1 + f.trustGain);
  const denominator = Math.max(f.cost, 0.001) * Math.max(f.latency, 0.001) * Math.max(f.risk, 0.001) * Math.max(f.opacity, 0.001);
  return numerator / denominator;
}

function pickMode(f: AudInputFactors): AudRouteMode {
  if (f.risk > 0.6) return "court";
  if (f.opacity < 0.2 && f.verifiability > 0.8) return "verified";
  if (f.latency < 0.15 && f.economicGain > 0.5) return "trading";
  if (f.cost < 0.1 && f.latency < 0.2) return "fast";
  if (f.trustGain > 0.7 && f.verifiability > 0.6) return "deep";
  if (f.economicGain > 0.6) return "economic";
  if (f.opacity < 0.15) return "private";
  return "fast";
}

function summarize(score: number, delta: number, reachWeighted: number, mode: AudRouteMode): string {
  const sign = delta >= 0 ? "+" : "";
  const quality = score > 500 ? "exceptional" : score > 100 ? "strong" : score > 20 ? "moderate" : "weak";
  return (
    `AUD ${quality} (${score.toFixed(1)}). ` +
    `Delta vs SOTA baseline: ${sign}${delta.toFixed(1)}. ` +
    `Reach-weighted delta: ${reachWeighted.toFixed(0)} utility units. ` +
    `Recommended route mode: ${mode}.`
  );
}

/**
 * Compute the Algorithmic Utility Delta for a candidate action route.
 *
 * @example
 * const result = computeAud({
 *   reach: 50_000,          // affects 50k users
 *   frequency: 0.8,         // called ~8k times/day
 *   verifiability: 0.9,     // near-full receipt + attestation
 *   autonomy: 0.6,          // semi-autonomous
 *   economicGain: 0.85,     // atomic on-chain settlement
 *   trustGain: 0.8,         // full audit trail
 *   cost: 0.05,             // cheap route
 *   latency: 0.1,           // fast
 *   risk: 0.15,             // low risk
 *   opacity: 0.05,          // nearly fully transparent
 * });
 * // result.recommendedMode === "verified"
 * // result.deltaVsBaseline >> 0
 */
export function computeAud(factors: AudInputFactors): AudResult {
  const rawScore = computeRawAud(factors);
  const delta = rawScore - BASELINE_AUD;
  const reachWeightedDelta = delta * Math.log10(Math.max(factors.reach, 1) + 1);
  const normalized = Math.min(100, (rawScore / (BASELINE_AUD * 10)) * 100);
  const mode = pickMode(factors);

  const reachLog = Math.log10(Math.max(factors.reach, 1)) + 1;
  const numerator = reachLog * factors.frequency * (1 + factors.verifiability) * (1 + factors.autonomy) * (1 + factors.economicGain) * (1 + factors.trustGain);
  const denominator = Math.max(factors.cost, 0.001) * Math.max(factors.latency, 0.001) * Math.max(factors.risk, 0.001) * Math.max(factors.opacity, 0.001);

  return {
    score: rawScore,
    scoreNormalized: normalized,
    deltaVsBaseline: delta,
    reachWeightedDelta,
    breakdown: {
      numerator,
      denominator,
      reachTerm: reachLog,
      verifiabilityTerm: 1 + factors.verifiability,
      costTerm: factors.cost,
      riskTerm: factors.risk,
    },
    recommendedMode: mode,
    summary: summarize(rawScore, delta, reachWeightedDelta, mode),
  };
}

/**
 * Score a set of candidate routes and return them ranked best-first.
 * Use this to let ClawdRouter pick the highest-AUD path for a given action.
 */
export function rankRoutes(
  candidates: Array<{ label: string; factors: AudInputFactors }>,
): Array<{ label: string; result: AudResult }> {
  return candidates
    .map(({ label, factors }) => ({ label, result: computeAud(factors) }))
    .sort((a, b) => b.result.score - a.result.score);
}

/**
 * Pre-built factor profiles for common Clawd action types.
 * These are starting points — override any field to tune for your context.
 */
export const AUD_PROFILES: Record<string, AudInputFactors> = {
  /** Raw LLM answer — the SOTA baseline. */
  sota_baseline: {
    reach: 1, frequency: 0.5, verifiability: 0, autonomy: 0.3,
    economicGain: 0, trustGain: 0, cost: 0.15, latency: 0.1, risk: 0.2, opacity: 0.9,
  },

  /** Clawd verified action: attested receipt, SAS, memory journal, x402 settlement. */
  clawd_verified_action: {
    reach: 1, frequency: 0.7, verifiability: 0.9, autonomy: 0.7,
    economicGain: 0.8, trustGain: 0.85, cost: 0.08, latency: 0.15, risk: 0.1, opacity: 0.05,
  },

  /** Perps trade route: Phoenix + Imperial, paper-first, OI signal gated, attested. */
  clawd_perps_trade: {
    reach: 1, frequency: 0.9, verifiability: 0.85, autonomy: 0.75,
    economicGain: 0.9, trustGain: 0.8, cost: 0.05, latency: 0.05, risk: 0.25, opacity: 0.1,
  },

  /** MCP tool call with receipt middleware and x402 metering. */
  clawd_mcp_tool: {
    reach: 1, frequency: 0.8, verifiability: 0.75, autonomy: 0.8,
    economicGain: 0.6, trustGain: 0.7, cost: 0.06, latency: 0.1, risk: 0.1, opacity: 0.1,
  },

  /** Global AI output (e.g. search summary reaching 2.5B users). */
  global_ai_output: {
    reach: 2_500_000_000, frequency: 1, verifiability: 0, autonomy: 0.1,
    economicGain: 0, trustGain: 0.05, cost: 0.3, latency: 0.05, risk: 0.4, opacity: 0.85,
  },

  /** Clawd global output with full harness (same reach, Clawd rails). */
  clawd_global_harness: {
    reach: 2_500_000_000, frequency: 1, verifiability: 0.8, autonomy: 0.5,
    economicGain: 0.7, trustGain: 0.75, cost: 0.1, latency: 0.08, risk: 0.15, opacity: 0.1,
  },
};
