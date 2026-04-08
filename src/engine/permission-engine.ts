/**
 * SolanaOS Permission Engine
 *
 * Adapted from Clawd Code's src/hooks/toolPermission/ system.
 *
 * Resolves permission actions (allow/deny/ask) for tool invocations using
 * a priority-ordered list of wildcard pattern rules. Rules are checked
 * denial-first (deny > ask > allow > default).
 *
 * Extension: SolanaOS adds trade-amount thresholds and sim-mode gates
 * as first-class permission dimensions.
 *
 * Pattern syntax examples:
 *   "trading.buy(*)"         → matches any buy call
 *   "trading.buy(BONK)"      → matches BONK buy only
 *   "bash(git *)"            → matches any git bash call
 *   "memory.write(*)"        → matches all memory writes
 *   "solana.*"               → matches all solana namespace tools
 */

import { PermissionAction, PermissionLevel, PermissionRule, ToolContext } from "./tool-base.js";

// ─────────────────────────────────────────────────────────────────────────────
// Pattern Matching (glob-style)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a glob pattern to a RegExp.
 * Supports * (any sequence) and ? (single char).
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex specials (except * ?)
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

export function matchPattern(pattern: string, subject: string): boolean {
  return patternToRegex(pattern).test(subject);
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a normalized "tool invocation string" for pattern matching.
 * Format: "tool.name(arg1, arg2)" or just "tool.name"
 *
 * Examples:
 *   "trading.buy(BONK, 0.1)"
 *   "memory.recall(risk tolerance)"
 *   "bash(git status)"
 */
export function buildInvocationString(toolName: string, args?: Record<string, unknown>): string {
  if (!args || Object.keys(args).length === 0) return toolName;
  const argStr = Object.values(args)
    .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v ?? "")))
    .join(", ");
  return `${toolName}(${argStr})`;
}

/**
 * Priority: deny > ask > allow.
 * First matching rule wins within each priority tier.
 * Falls back to default for the permission level.
 */
export function resolvePermission(
  toolName: string,
  permissionLevel: PermissionLevel,
  args: Record<string, unknown> | undefined,
  rules: PermissionRule[],
  ctx: PermissionResolutionContext,
): PermissionAction {
  const invocation = buildInvocationString(toolName, args);

  // In sim mode, trade tools are automatically allowed
  if (ctx.simMode && permissionLevel === "trade") {
    return "allow";
  }

  // Filter rules by sim-only flag
  const applicable = rules.filter((r) => !r.simOnly || ctx.simMode);

  // Check deny first
  for (const rule of applicable) {
    if (rule.action === "deny" && matchPattern(rule.pattern, invocation)) {
      return "deny";
    }
  }

  // Then ask
  for (const rule of applicable) {
    if (rule.action === "ask" && matchPattern(rule.pattern, invocation)) {
      return "ask";
    }
  }

  // Then allow
  for (const rule of applicable) {
    if (rule.action === "allow" && matchPattern(rule.pattern, invocation)) {
      return "allow";
    }
  }

  // Default by permission level
  return defaultAction(permissionLevel, ctx);
}

export interface PermissionResolutionContext {
  simMode: boolean;
  surface: ToolContext["surface"];
  /** If true, all safe/write tools are auto-allowed (for trusted environments) */
  bypassPermissions?: boolean;
  /** If true, only plan-mode actions are allowed (no actual execution) */
  planMode?: boolean;
}

function defaultAction(level: PermissionLevel, ctx: PermissionResolutionContext): PermissionAction {
  if (ctx.bypassPermissions) return "allow";
  if (ctx.planMode && (level === "execute" || level === "trade")) return "deny";

  switch (level) {
    case "safe":
      return "allow";
    case "write":
      // Auto-allow writes from trusted surfaces
      return ctx.surface === "cli" || ctx.surface === "api" ? "allow" : "ask";
    case "execute":
      return "ask";
    case "trade":
      return "ask";
    default:
      return "ask";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade Amount Threshold Checks
// ─────────────────────────────────────────────────────────────────────────────

export interface TradeThresholds {
  /** Max SOL per spot trade without explicit ask */
  maxSpotSolNoAsk: number;
  /** Max USD notional for perps without explicit ask */
  maxPerpUsdNoAsk: number;
}

export const DEFAULT_TRADE_THRESHOLDS: TradeThresholds = {
  maxSpotSolNoAsk: 0.1,
  maxPerpUsdNoAsk: 50,
};

export function checkTradeThreshold(
  amountSol: number | undefined,
  usdNotional: number | undefined,
  thresholds: TradeThresholds = DEFAULT_TRADE_THRESHOLDS,
): PermissionAction {
  if (amountSol !== undefined && amountSol > thresholds.maxSpotSolNoAsk) {
    return "ask";
  }
  if (usdNotional !== undefined && usdNotional > thresholds.maxPerpUsdNoAsk) {
    return "ask";
  }
  return "allow";
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission Engine class
// ─────────────────────────────────────────────────────────────────────────────

export class PermissionEngine {
  private rules: PermissionRule[];
  private thresholds: TradeThresholds;

  constructor(rules: PermissionRule[] = [], thresholds: TradeThresholds = DEFAULT_TRADE_THRESHOLDS) {
    this.rules = rules;
    this.thresholds = thresholds;
  }

  addRule(rule: PermissionRule): this {
    this.rules.push(rule);
    return this;
  }

  addRules(rules: PermissionRule[]): this {
    this.rules.push(...rules);
    return this;
  }

  resolve(
    toolName: string,
    permissionLevel: PermissionLevel,
    args: Record<string, unknown> | undefined,
    ctx: PermissionResolutionContext,
  ): PermissionAction {
    return resolvePermission(toolName, permissionLevel, args, this.rules, ctx);
  }

  getRules(): PermissionRule[] {
    return [...this.rules];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset rule sets
// ─────────────────────────────────────────────────────────────────────────────

/** Safe default rules — always allow read-only Solana data, always ask for trades */
export const SAFE_DEFAULTS: PermissionRule[] = [
  { pattern: "solana.*", action: "allow" },
  { pattern: "memory.recall(*)", action: "allow" },
  { pattern: "memory.search(*)", action: "allow" },
  { pattern: "trading.*", action: "ask" },
  { pattern: "bash(*)", action: "ask" },
  { pattern: "pageagent.*", action: "ask" },
];

/** Dev/trusted environment — auto-allow everything except trade */
export const TRUSTED_DEV_RULES: PermissionRule[] = [
  { pattern: "trading.*", action: "ask" },
  { pattern: "*", action: "allow" },
];

/** YOLO mode — bypass all except deny list */
export const YOLO_RULES: PermissionRule[] = [
  { pattern: "*", action: "allow" },
];
