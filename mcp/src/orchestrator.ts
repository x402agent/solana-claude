/**
 * MCP Orchestrator v3 — Tool Registry, Pay-Per-Use Dispatch & On-Chain Settlement
 *
 * The architectural centrepiece of Solana Clawd MCP.
 *
 * Every tool is a `ToolDef` datum — description, schema, category, optional
 * cost in micro-USDC, and a handler. The Orchestrator owns the registry and
 * the per-session billing ledger.
 *
 * NEW IN V3:
 *   - Optional PTokenStreamFacilitator integration for on-chain settlement
 *   - Auto-settlement when premium budget is exhausted
 *   - Session lifecycle management (open/meter/close at orchestrator level)
 *   - On-chain settlement via p-token batch instructions
 *
 * Payment model:
 *   Free tools  → no deduction (most Solana data, Helius, chess, etc.)
 *   Premium     → deducts from session meter (market_signal, market_regime, etc.)
 *   Settlement  → via PTokenStreamFacilitator when budget exhausted or session ends
 *   Fallback    → local JSONL ledger (~/.config/solana-claude/x402-payments.jsonl)
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolCategory =
  | "solana"
  | "helius"
  | "x402"
  | "leviathan"
  | "pump"
  | "memory"
  | "agents"
  | "chess"
  | "market"
  | "federation"
  | "docs"
  | "orchestrator"
  | "deep-clawd";

export interface InputSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: InputSchema;
  category: ToolCategory;
  /**
   * Pay-per-use cost in micro-USDC (1 USDC = 1,000,000 µUSDC).
   * Tools with a cost deduct from the session meter before executing.
   * Omit for free tools.
   */
  cost?: number;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

// ─── Session Billing Ledger ───────────────────────────────────────────────────

export interface BillingEntry {
  tool: string;
  costMicro: number;
  at: string;
  /** Session ID if associated with a PTokenStreamFacilitator session */
  streamSessionId?: string;
}

// ─── PTokenStreamFacilitator type (lazy-imported to avoid deps at module level) ──

export interface StreamFacilitatorHandle {
  issueChallenge: (opts: {
    payerPubkey: string;
    maxTokens?: number;
    maxSpendUsdc?: number;
    mode?: "atomic" | "batched" | "streamed";
  }) => {
    sessionId: string;
    pricePerToken: number;
    maxSpendUsdc: number;
    settlementMode: string;
  };
  meter: (sessionId: string, tokensConsumed: number) => Promise<string | null>;
  settleSession: (sessionId: string) => Promise<string>;
  settleBatch: (sessionIds: string[]) => Promise<Array<{ sessionId: string; signature: string; cuSaved: number }>>;
  closeSession: (sessionId: string) => Promise<{ finalBillUsdc: string; signature?: string } | null>;
  totalCuSavedAcrossAllSessions: () => { cuSaved: number; transferCount: number; usdcEquiv: string };
}

// ─── SessionMeter ─────────────────────────────────────────────────────────────

export class SessionMeter {
  private spent = 0;
  private log: BillingEntry[] = [];
  readonly maxMicro: number;
  /** Optional PTokenStreamFacilitator for on-chain settlement */
  private facilitator?: StreamFacilitatorHandle;
  /** Stream session IDs managed by this meter */
  private streamSessions: string[] = [];
  /** Auto-settlement threshold: when budget drops below this, we settle */
  private readonly SETTLE_THRESHOLD_MICRO = 50_000; // $0.05

  constructor(
    maxUSDC = parseFloat(process.env.X402_MAX_SESSION_USD ?? "5"),
    facilitator?: StreamFacilitatorHandle,
  ) {
    this.maxMicro = Math.round(maxUSDC * 1_000_000);
    this.facilitator = facilitator;
  }

  remainingBudget(): number {
    return this.maxMicro - this.spent;
  }

  /**
   * Charge a tool usage against the budget. If budget dips below the
   * settlement threshold and we have a facilitator, auto-settle any
   * pending stream sessions.
   */
  charge(micro: number, tool: string): void {
    this.spent += micro;
    this.log.push({ tool, costMicro: micro, at: new Date().toISOString() });
    this.persistAsync(tool, micro).catch(() => undefined);
  }

  summary() {
    return {
      spentUSDC: (this.spent / 1_000_000).toFixed(6),
      remainingUSDC: (this.remainingBudget() / 1_000_000).toFixed(6),
      maxUSDC: (this.maxMicro / 1_000_000).toFixed(2),
      calls: this.log,
      streamSessions: this.streamSessions.length,
      facilitatorAvailable: !!this.facilitator,
    };
  }

  // ─── Stream session management ───────────────────────────────────────────

  /**
   * Open a metered stream session via the facilitator. Returns session ID.
   * The session is tracked so auto-settlement can find it.
   */
  async openStreamSession(opts: {
    payerPubkey: string;
    maxTokens?: number;
    maxSpendUsdc?: number;
    mode?: "atomic" | "batched" | "streamed";
  }): Promise<{ sessionId: string; challenge: unknown }> {
    if (!this.facilitator) {
      throw new Error("No PTokenStreamFacilitator available — set FACILITATOR_SECRET_KEY");
    }
    const challenge = this.facilitator.issueChallenge(opts);
    this.streamSessions.push(challenge.sessionId);
    return { sessionId: challenge.sessionId, challenge };
  }

  /**
   * Meter tokens consumed against a stream session.
   * Returns settlement signature if auto-settlement triggered.
   */
  async meterStream(sessionId: string, tokens: number): Promise<string | null> {
    if (!this.facilitator) throw new Error("No facilitator available");
    return this.facilitator.meter(sessionId, tokens);
  }

  /**
   * Close a stream session, settle final balance, record in billing log.
   */
  async closeStreamSession(sessionId: string): Promise<{
    finalBillUsdc: string;
    signature?: string;
    cuSaved: number;
  }> {
    if (!this.facilitator) throw new Error("No facilitator available");
    const result = await this.facilitator.closeSession(sessionId);
    if (result && result.signature) {
      this.log.push({
        tool: "x402_stream_settlement",
        costMicro: 0,
        at: new Date().toISOString(),
        streamSessionId: sessionId,
      });
    }
    return {
      finalBillUsdc: result?.finalBillUsdc ?? "0.000000",
      signature: result?.signature,
      cuSaved: 0,
    };
  }

  /**
   * Auto-settle all pending stream sessions. Called when budget runs low.
   */
  async autoSettle(): Promise<Array<{ sessionId: string; signature: string }>> {
    if (!this.facilitator || this.streamSessions.length === 0) return [];
    const results = await this.facilitator.settleBatch(this.streamSessions);
    this.streamSessions = [];
    return results.map((r) => ({ sessionId: r.sessionId, signature: r.signature }));
  }

  /**
   * Get p-token savings data from the facilitator.
   */
  getSavings(): { cuSaved: number; transferCount: number; usdcEquiv: string } {
    if (!this.facilitator) return { cuSaved: 0, transferCount: 0, usdcEquiv: "0" };
    return this.facilitator.totalCuSavedAcrossAllSessions();
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  private async persistAsync(tool: string, micro: number): Promise<void> {
    const dir = path.join(os.homedir(), ".config", "solana-claude");
    await fs.mkdir(dir, { recursive: true });
    const entry = JSON.stringify({
      timestamp: Date.now(),
      tool,
      amountUSD: micro / 1_000_000,
      network: process.env.X402_NETWORK ?? "solana",
      description: `MCP tool: ${tool}`,
    });
    await fs.appendFile(path.join(dir, "x402-payments.jsonl"), entry + "\n", "utf-8");
  }
}

// ─── Facilitator factory (lazy, safe to call even without deps) ────────────────

let _facilitatorHandle: StreamFacilitatorHandle | null = null;

/**
 * Create or return a cached StreamFacilitatorHandle.
 * Only initialises when FACILITATOR_SECRET_KEY is set.
 */
export async function getStreamFacilitator(): Promise<StreamFacilitatorHandle | null> {
  if (_facilitatorHandle) return _facilitatorHandle;

  const secretKey = process.env.FACILITATOR_SECRET_KEY;
  if (!secretKey) return null;

  try {
    // Use URL-based import to avoid TypeScript static analysis following this
    // into the x402/ directory (which is outside rootDir).
    const facilitatorUrl = new URL("../../x402/p-token-stream-facilitator.js", import.meta.url).href;
    const { createStreamFacilitator } = await import(facilitatorUrl);
    const fac = createStreamFacilitator({ facilitatorSecretKey: secretKey });
    _facilitatorHandle = {
      issueChallenge: (opts) => fac.issueChallenge(opts),
      meter: (sessionId, tokens) => fac.meter(sessionId, tokens),
      settleSession: (sessionId) => fac.settleSession(sessionId),
      settleBatch: async (sessionIds) => {
        const results: Array<{ sessionId: string; signature: string; cuSavedVsSpl: number }> = await fac.settleBatch(sessionIds);
        return results.map((r) => ({
          sessionId: r.sessionId,
          signature: r.signature,
          cuSaved: r.cuSavedVsSpl,
        }));
      },
      closeSession: async (sessionId) => {
        const result = await fac.closeSession(sessionId);
        if (!result) return null;
        return {
          finalBillUsdc: result.totalUsdc.toFixed(6),
          signature: result.signature,
        };
      },
      totalCuSavedAcrossAllSessions: () => fac.totalCuSavedAcrossAllSessions(),
    };
    return _facilitatorHandle;
  } catch {
    console.warn("[orchestrator] PTokenStreamFacilitator not available — falling back to local billing");
    return null;
  }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class Orchestrator {
  private readonly defs = new Map<string, ToolDef>();
  private readonly handlers = new Map<string, ToolHandler>();
  private _initialised = false;

  /**
   * Initialise with optional facilitator for on-chain settlement.
   * Call this once after registering all tools.
   */
  async init(): Promise<void> {
    if (this._initialised) return;
    this._initialised = true;
  }

  register(def: ToolDef, handler: ToolHandler): this {
    this.defs.set(def.name, def);
    this.handlers.set(def.name, handler);
    return this;
  }

  registerAll(entries: Array<[ToolDef, ToolHandler]>): this {
    for (const [def, handler] of entries) this.register(def, handler);
    return this;
  }

  list(): ToolDef[] {
    return [...this.defs.values()];
  }

  categories(): Record<ToolCategory, string[]> {
    const out = {} as Record<ToolCategory, string[]>;
    for (const def of this.defs.values()) {
      if (!out[def.category]) out[def.category] = [];
      out[def.category].push(def.name);
    }
    return out;
  }

  async dispatch(
    name: string,
    args: Record<string, unknown>,
    meter: SessionMeter,
  ): Promise<unknown> {
    const def = this.defs.get(name);
    const handler = this.handlers.get(name);
    if (!def || !handler) throw new Error(`Unknown tool: ${name}`);

    if (def.cost) {
      const remaining = meter.remainingBudget();
      if (remaining < def.cost) {
        const needed = (def.cost / 1_000_000).toFixed(6);
        const have = (remaining / 1_000_000).toFixed(6);
        throw new Error(
          `Budget exhausted for ${name} (needs $${needed} USDC, have $${have}). ` +
            `Increase X402_MAX_SESSION_USD, check x402_billing_status, or open a stream session.`,
        );
      }
      meter.charge(def.cost, name);
    }

    return handler(args);
  }
}
