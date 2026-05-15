/**
 * dFlow Router — Intelligent Model Routing for Deep Clawd
 *
 * Routes each OODA phase to the optimal DeepSeek model:
 *
 *   OBSERVE  → deepseek-v4-flash (data gathering, no deep reasoning)
 *   ORIENT   → deepseek-v4-pro  (pattern matching, requires thinking)
 *   DECIDE   → deepseek-v4-pro  (decision quality critical, max effort)
 *   ACT      → deepseek-v4-flash (fast execution formatting)
 *   REFLECT  → deepseek-v4-pro  (post-session consolidation)
 *
 * dFlow modes:
 *   conservative — flash for everything except DECIDE (capital preservation)
 *   balanced     — standard routing above
 *   aggro        — pro+max for both ORIENT and DECIDE (max alpha)
 *
 * This routing is the "dFlow" innovation: treating the OODA loop as a
 * heterogeneous compute graph where each node has different cost/quality
 * requirements. Flash handles IO-bound phases; Pro handles reasoning-bound.
 *
 * Cost example for one full OODA tick (balanced mode):
 *   OBSERVE:  ~500 tokens @ flash rate  = $0.00007
 *   ORIENT:   ~1,500 tokens @ pro rate  = $0.00065
 *   DECIDE:   ~800 tokens @ pro rate    = $0.00035
 *   ACT:      ~200 tokens @ flash rate  = $0.00003
 *   Total:    ~$0.00110/tick
 *   vs. all-pro:                         ~$0.00348/tick  (3.2× cheaper)
 */

import type { OODAPhase, DFlowMode, DFlowDecision, DeepSeekModel } from "./types.js";

// ─── Routing table ────────────────────────────────────────────────────────────

type RoutingTable = Record<
  DFlowMode,
  Record<OODAPhase, DFlowDecision>
>;

const ROUTING: RoutingTable = {
  conservative: {
    observe:  { model: "deepseek-v4-flash", effort: "high", thinking: false,  rationale: "IO phase — flash is sufficient" },
    orient:   { model: "deepseek-v4-flash", effort: "high", thinking: false,  rationale: "conservative: flash orient to save cost" },
    decide:   { model: "deepseek-v4-pro",   effort: "high", thinking: true,   rationale: "decision quality is non-negotiable" },
    act:      { model: "deepseek-v4-flash", effort: "high", thinking: false,  rationale: "formatting only — flash is faster" },
    reflect:  { model: "deepseek-v4-pro",   effort: "high", thinking: true,   rationale: "consolidation benefits from deep reasoning" },
  },
  balanced: {
    observe:  { model: "deepseek-v4-flash", effort: "high", thinking: false,  rationale: "IO phase — flash sufficient" },
    orient:   { model: "deepseek-v4-pro",   effort: "high", thinking: true,   rationale: "pattern recognition requires deep reasoning" },
    decide:   { model: "deepseek-v4-pro",   effort: "max",  thinking: true,   rationale: "max quality for capital allocation decisions" },
    act:      { model: "deepseek-v4-flash", effort: "high", thinking: false,  rationale: "execution formatting — flash sufficient" },
    reflect:  { model: "deepseek-v4-pro",   effort: "high", thinking: true,   rationale: "reflection benefits from thinking mode" },
  },
  aggro: {
    observe:  { model: "deepseek-v4-pro",   effort: "high", thinking: true,   rationale: "aggro: pro even for observe to catch micro-signals" },
    orient:   { model: "deepseek-v4-pro",   effort: "max",  thinking: true,   rationale: "aggro: max effort orient for edge" },
    decide:   { model: "deepseek-v4-pro",   effort: "max",  thinking: true,   rationale: "aggro: max quality decision regardless of cost" },
    act:      { model: "deepseek-v4-pro",   effort: "high", thinking: true,   rationale: "aggro: pro for execution precision" },
    reflect:  { model: "deepseek-v4-pro",   effort: "max",  thinking: true,   rationale: "aggro: max consolidation for next cycle" },
  },
};

// ─── Cost estimates ($ per 1M tokens) ─────────────────────────────────────────

const COST_PER_1M: Record<DeepSeekModel, { input: number; output: number; cacheHit: number }> = {
  "deepseek-v4-flash": { input: 0.14, output: 0.28, cacheHit: 0.0028 },
  "deepseek-v4-pro":   { input: 0.435, output: 0.87, cacheHit: 0.003625 },
};

// ─── dFlow Router ─────────────────────────────────────────────────────────────

export class DFlowRouter {
  private readonly mode: DFlowMode;
  private tickCosts: number[] = [];

  constructor(mode: DFlowMode = "balanced") {
    this.mode = mode;
  }

  /** Select model + effort for a given OODA phase */
  route(phase: OODAPhase): DFlowDecision {
    return ROUTING[this.mode][phase];
  }

  /** Estimate cost in USD for a call given token counts */
  estimateCost(
    model: DeepSeekModel,
    inputTokens: number,
    outputTokens: number,
    cacheHit = false,
  ): number {
    const rates = COST_PER_1M[model];
    const inputRate = cacheHit ? rates.cacheHit : rates.input;
    return (inputTokens * inputRate + outputTokens * rates.output) / 1_000_000;
  }

  /** Record tick cost for session analytics */
  recordTickCost(usd: number): void {
    this.tickCosts.push(usd);
  }

  /** Session cost analytics */
  costReport(): {
    totalUSD: string;
    avgPerTick: string;
    ticks: number;
    projectedDaily: string;
    mode: DFlowMode;
  } {
    const total = this.tickCosts.reduce((a, b) => a + b, 0);
    const avg = this.tickCosts.length > 0 ? total / this.tickCosts.length : 0;
    const ticksPerDay = 86_400_000 / 3_000; // assuming 3s tick sleep
    return {
      totalUSD: total.toFixed(6),
      avgPerTick: avg.toFixed(6),
      ticks: this.tickCosts.length,
      projectedDaily: (avg * ticksPerDay).toFixed(4),
      mode: this.mode,
    };
  }

  /** Full routing plan for a complete OODA tick */
  tickPlan(): Record<OODAPhase, DFlowDecision> {
    const phases: OODAPhase[] = ["observe", "orient", "decide", "act"];
    return Object.fromEntries(
      phases.map(p => [p, this.route(p)])
    ) as Record<OODAPhase, DFlowDecision>;
  }

  /** Human-readable routing summary */
  summary(): string {
    const plan = this.tickPlan();
    const lines = [`dFlow Routing Plan (mode: ${this.mode})`];
    for (const [phase, dec] of Object.entries(plan)) {
      lines.push(`  ${phase.padEnd(8)} → ${dec.model.padEnd(20)} effort=${dec.effort} thinking=${dec.thinking}`);
    }
    return lines.join("\n");
  }
}
