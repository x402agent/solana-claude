/**
 * Deep Clawd — shared types
 *
 * DeepSeek V4 Pro handles heavy OODA reasoning (thinking mode enabled).
 * DeepSeek V4 Flash handles data observation and fast execution.
 * dFlow routing selects the right model per OODA phase automatically.
 */

// ─── Models ───────────────────────────────────────────────────────────────────

export type DeepSeekModel =
  | "deepseek-v4-pro"    // 1M context, thinking mode, $0.435/M input cache miss
  | "deepseek-v4-flash"; // 1M context, thinking mode (default), $0.14/M input cache miss

// ─── dFlow routing ────────────────────────────────────────────────────────────

/** OODA phase — determines which model and effort level to use */
export type OODAPhase = "observe" | "orient" | "decide" | "act" | "reflect";

/** Routing mode: conservative (capital preservation) vs aggressive (momentum) */
export type DFlowMode = "conservative" | "balanced" | "aggro";

export interface DFlowDecision {
  model: DeepSeekModel;
  effort: "high" | "max";
  thinking: boolean;
  rationale: string;
}

// ─── Agent state ──────────────────────────────────────────────────────────────

export type MarketRegime = "bull" | "bear" | "crab" | "pump" | "crash" | "unknown";
export type SignalStrength = "STRONG" | "MODERATE" | "WEAK" | "AVOID";

export interface DeepObservation {
  timestamp: string;
  phase: "observe";
  solPrice: number;
  solChange24h: number;
  topTrending: Array<{ symbol: string; mint: string; change: number; volume: number }>;
  newLaunches: Array<{ symbol: string; mint: string }>;
  regime: MarketRegime;
}

export interface DeepOrientation {
  timestamp: string;
  phase: "orient";
  regime: MarketRegime;
  signals: Array<{ token: string; strength: SignalStrength; thesis: string }>;
  risks: string[];
  thinkingContent?: string; // DeepSeek reasoning_content
}

export interface DeepDecision {
  timestamp: string;
  phase: "decide";
  action: "hold" | "scan" | "alert" | "swap" | "exit";
  target?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
  stopCondition: string;
  thinkingContent?: string;
}

export interface DeepAct {
  timestamp: string;
  phase: "act";
  action: string;
  result: string;
  cuUsed?: number;
  feePaid?: string;
}

export type OODAEntry = DeepObservation | DeepOrientation | DeepDecision | DeepAct;

// ─── Loop config ──────────────────────────────────────────────────────────────

export interface DeepClawdConfig {
  /** DeepSeek API key */
  apiKey: string;
  /** dFlow routing mode */
  mode: DFlowMode;
  /** Max position size in USDC (paper-only enforced unless LIVE_TRADING=true) */
  maxPositionUSDC: number;
  /** Stop-loss on N consecutive losses */
  lossKillswitch: number;
  /** Tick sleep in ms (0 = full speed) */
  tickSleepMs: number;
  /** Paper trading only */
  paperOnly: boolean;
  /** Devnet only */
  devnetOnly: boolean;
  /** Max ticks before stopping (0 = infinite) */
  maxTicks: number;
  /** Log to ~/.openclawd/deep-clawd/ */
  logDir: string;
}

export function defaultConfig(): DeepClawdConfig {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY ?? "",
    mode: (process.env.DFLOW_MODE as DFlowMode | undefined) ?? "balanced",
    maxPositionUSDC: parseFloat(process.env.MAX_POSITION_USDC ?? "10"),
    lossKillswitch: parseInt(process.env.LOSS_KILLSWITCH ?? "5", 10),
    tickSleepMs: parseInt(process.env.TICK_SLEEP_MS ?? "3000", 10),
    paperOnly: process.env.PAPER_ONLY !== "false" && process.env.LIVE_TRADING !== "true",
    devnetOnly: process.env.DEVNET_ONLY !== "false" && process.env.MAINNET_ENABLED !== "true",
    maxTicks: parseInt(process.env.MAX_TICKS ?? "0", 10),
    logDir: process.env.LOG_DIR ?? `${process.env.HOME ?? "~"}/.openclawd/deep-clawd`,
  };
}

// ─── Three Laws (hardcoded, not overridable) ──────────────────────────────────

export const THREE_LAWS = `
DEEP CLAWD CONSTITUTIONAL CONSTRAINTS (hardcoded):
1. Paper-only unless LIVE_TRADING=true AND operator confirmed.
2. Devnet-only unless MAINNET_ENABLED=true AND OPERATOR_CONFIRMED=true.
3. Private keys never logged, passed to any LLM, or included in tool args.
4. Kill-switch: stop after ${5} consecutive losses.
5. Max position: enforced in code, not just config.
6. No rug pulls, no scam assists, no protocol manipulation.
`.trim();
