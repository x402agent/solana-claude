/**
 * MCP Orchestrator — Tool Registry & Pay-Per-Use Dispatch
 *
 * The architectural centrepiece of Solana Clawd MCP v2.
 *
 * Every tool is a `ToolDef` datum — description, schema, category, optional
 * cost in micro-USDC, and a handler. The Orchestrator owns the registry and
 * the per-session billing ledger. Premium tools (leviathan_tick,
 * market_signal, etc.) deduct from the session's USDC budget before running.
 *
 * Payment is tracked locally for now; the ledger is written to
 * ~/.config/solana-claude/x402-payments.jsonl and can be settled on-chain
 * via pay.solanaclawd.com at session end.
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
  | "market";

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
}

export class SessionMeter {
  private spent = 0;
  private log: BillingEntry[] = [];
  readonly maxMicro: number;

  constructor(maxUSDC = parseFloat(process.env.X402_MAX_SESSION_USD ?? "5")) {
    this.maxMicro = Math.round(maxUSDC * 1_000_000);
  }

  remainingBudget(): number {
    return this.maxMicro - this.spent;
  }

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
    };
  }

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

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class Orchestrator {
  private readonly defs = new Map<string, ToolDef>();
  private readonly handlers = new Map<string, ToolHandler>();

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
            `Increase X402_MAX_SESSION_USD or check x402_billing_status.`,
        );
      }
      meter.charge(def.cost, name);
    }

    return handler(args);
  }
}
