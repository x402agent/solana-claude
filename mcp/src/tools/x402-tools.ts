/**
 * x402 + P-Token Tool Suite for Solana Clawd MCP
 *
 * These tools expose the x402 payment protocol and p-token metered billing
 * directly to Claude and any MCP-connected agent:
 *
 *   x402_status              — Protocol config + p-token stats
 *   x402_payment_history     — Local JSONL payment log
 *   x402_billing_status      — Session spend meter
 *   x402_ptoken_stats        — CU savings report (all-time)
 *   x402_session_open        — Open a p-token metered stream session
 *   x402_session_meter       — Record tokens consumed in a session
 *   x402_session_close       — Close session → final bill
 *   x402_facilitator_ping    — Health check pay.solanaclawd.com
 *   clawd_holder_check       — CLAWD token holder status + discount tier
 *
 * The metered session model (open → meter → close) is the core innovation:
 * p-token's 98% CU reduction makes per-output-token billing viable for the
 * first time. Agents can pre-authorise a budget, stream inference, and pay
 * only for what they consume — to the token.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import type { ToolDef, ToolHandler, SessionMeter } from "../orchestrator.js";
import { heliusRPC } from "../api.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";
const FACILITATOR_URL =
  process.env.PAYSH_RELAY_URL ?? "https://pay.solanaclawd.com/relay/v1";
const P_TOKEN_PROGRAM_ID = "ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF";

// CU costs (from SIMD-0266 benchmark data)
const CU = {
  pToken: { transferChecked: 105, transfer: 76, approve: 124 },
  spl: { transferChecked: 6200, transfer: 4645, approve: 2904 },
};

// ─── In-memory stream session store ──────────────────────────────────────────

interface StreamSession {
  id: string;
  payerPubkey: string;
  pricePerTokenMicro: number;
  tokensConsumed: number;
  checkpoints: number;
  maxTokens: number;
  mode: "atomic" | "batched" | "streamed";
  openedAt: string;
  settled: boolean;
}

const _sessions = new Map<string, StreamSession>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readPaymentLog(): Promise<Array<Record<string, unknown>>> {
  const logPath = path.join(os.homedir(), ".config", "solana-claude", "x402-payments.jsonl");
  try {
    const raw = await fs.readFile(logPath, "utf-8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-50)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const X402_TOOLS: Array<[ToolDef, ToolHandler]> = [

  // ── x402_status ────────────────────────────────────────────────────────────
  [
    {
      name: "x402_status",
      description:
        "Full x402 payment protocol status: wallet config, p-token program, CU savings, " +
        "session budget, pay.solanaclawd.com facilitator, and CLAWD discount eligibility.",
      inputSchema: { type: "object", properties: {} },
      category: "x402",
    },
    async (_args) => {
      const enabled = !!process.env.X402_SVM_PRIVATE_KEY;
      const network = process.env.X402_NETWORK ?? "solana";
      const maxReq = parseFloat(process.env.X402_MAX_PER_REQUEST_USD ?? "0.10");
      const maxSess = parseFloat(process.env.X402_MAX_SESSION_USD ?? "5.00");
      const usePToken = process.env.USE_P_TOKEN !== "false";

      // Estimate savings for a typical x402 session (1,000 transfers)
      const typicalTx = 1_000;
      const splCost = ((typicalTx * CU.spl.transferChecked * 5_000) / 1e9).toFixed(4);
      const pCost = ((typicalTx * CU.pToken.transferChecked * 5_000) / 1e9).toFixed(4);

      return [
        `x402 + P-Token Payment Protocol — Solana Clawd Edition`,
        ``,
        `Wallet:       ${enabled ? "✅ configured (X402_SVM_PRIVATE_KEY)" : "⚠️  not set — read-only mode"}`,
        `Network:      ${network}`,
        `Max/request:  $${maxReq.toFixed(2)} USDC`,
        `Max/session:  $${maxSess.toFixed(2)} USDC`,
        `P-Token:      ${usePToken ? "✅ enabled" : "❌ disabled"} (${P_TOKEN_PROGRAM_ID})`,
        `Facilitator:  ${FACILITATOR_URL}`,
        `CLAWD token:  ${CLAWD_MINT}`,
        ``,
        `P-Token savings (${typicalTx.toLocaleString()} transfers @ 5k µlamports/CU):`,
        `  SPL Token:  ~${splCost} SOL in fees`,
        `  P-Token:    ~${pCost} SOL in fees  (98% cheaper)`,
        ``,
        `TransferChecked CU: ${CU.spl.transferChecked} (SPL) → ${CU.pToken.transferChecked} (p-token)`,
        ``,
        `Protocol flow:`,
        `  1. Resource returns HTTP 402 + PAYMENT-REQUIRED header`,
        `  2. Client signs p-token USDC transfer (105 CU, 12k CU budget)`,
        `  3. Retry with payment-signature header`,
        `  4. Facilitator verifies + broadcasts via pay.solanaclawd.com`,
        ``,
        `Metered billing: use x402_session_open → x402_session_meter → x402_session_close`,
      ].join("\n");
    },
  ],

  // ── x402_payment_history ───────────────────────────────────────────────────
  [
    {
      name: "x402_payment_history",
      description:
        "Show persistent x402 payment history from ~/.config/solana-claude/x402-payments.jsonl. " +
        "Includes MCP session charges, manual payments, and facilitator settlements.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of entries to show (default 20)" },
        },
      },
      category: "x402",
    },
    async (args) => {
      const limit = Number(args.limit ?? 20);
      const history = await readPaymentLog();
      if (history.length === 0) {
        return "No x402 payments recorded yet. Enable with X402_SVM_PRIVATE_KEY.";
      }
      const shown = history.slice(-limit);
      const total = shown.reduce((s, p) => s + ((p.amountUSD as number) ?? 0), 0);
      return [
        `x402 Payment History (last ${shown.length} of ${history.length})`,
        `Total shown: $${total.toFixed(6)} USDC`,
        ``,
        ...shown.map(
          (p) =>
            `[${new Date(p.timestamp as number).toLocaleString()}] ` +
            `$${((p.amountUSD as number) ?? 0).toFixed(6)} — ${p.description ?? p.tool ?? p.resource}`,
        ),
      ].join("\n");
    },
  ],

  // ── x402_billing_status ────────────────────────────────────────────────────
  [
    {
      name: "x402_billing_status",
      description:
        "Show current MCP session billing status: how much has been charged, " +
        "remaining budget, and which premium tools were used.",
      inputSchema: { type: "object", properties: {} },
      category: "x402",
    },
    async (_args, meter?: SessionMeter) => {
      if (!meter) return "Billing meter not available in this context.";
      const s = meter.summary();
      return [
        `MCP Session Billing`,
        ``,
        `Spent:     $${s.spentUSDC} USDC`,
        `Remaining: $${s.remainingUSDC} USDC`,
        `Budget:    $${s.maxUSDC} USDC (X402_MAX_SESSION_USD)`,
        ``,
        s.calls.length
          ? `Tool charges:\n${s.calls.map((c) => `  ${c.tool}: $${(c.costMicro / 1e6).toFixed(6)} @ ${c.at}`).join("\n")}`
          : "No charges yet this session.",
      ].join("\n");
    },
  ],

  // ── x402_ptoken_stats ─────────────────────────────────────────────────────
  [
    {
      name: "x402_ptoken_stats",
      description:
        "P-Token CU savings report: compute the total CU and fee savings across all " +
        "recorded x402 payments that used p-token. Shows real-time economic impact.",
      inputSchema: { type: "object", properties: {} },
      category: "x402",
    },
    async (_args) => {
      const history = await readPaymentLog();
      const count = history.length;
      // Each x402 p-token payment uses ~12k CU (vs ~200k SPL default)
      const cuSavedPerTx = 200_000 - 12_000;
      const totalCuSaved = count * cuSavedPerTx;
      const solSaved = (totalCuSaved * 5_000) / 1e15; // at 5k µlamports/CU
      const usdSaved = solSaved * 170; // ~$170/SOL estimate

      // transferChecked specifically
      const tcSaved = count * (CU.spl.transferChecked - CU.pToken.transferChecked);

      return [
        `P-Token x402 CU Savings Report`,
        ``,
        `Recorded payments: ${count.toLocaleString()}`,
        ``,
        `TransferChecked savings per tx:`,
        `  SPL:     ${CU.spl.transferChecked.toLocaleString()} CU`,
        `  P-Token: ${CU.pToken.transferChecked.toLocaleString()} CU`,
        `  Saved:   ${(CU.spl.transferChecked - CU.pToken.transferChecked).toLocaleString()} CU (98.3%)`,
        ``,
        `Full tx budget savings (200k → 12k CU):`,
        `  CU saved total:  ${totalCuSaved.toLocaleString()}`,
        `  SOL saved:       ~${solSaved.toFixed(6)} SOL`,
        `  USD saved:       ~$${usdSaved.toFixed(4)}`,
        ``,
        `TransferChecked CU saved: ${tcSaved.toLocaleString()}`,
        ``,
        `Program: ${P_TOKEN_PROGRAM_ID}`,
        `Ref:     https://solana.com/upgrades/p-token`,
      ].join("\n");
    },
  ],

  // ── x402_session_open ─────────────────────────────────────────────────────
  [
    {
      name: "x402_session_open",
      description:
        "Open a p-token metered stream session. Returns a sessionId and MeterChallenge " +
        "that the agent pre-authorises. Tokens consumed are billed via x402_session_meter " +
        "and settled at x402_session_close. This is the per-output-token billing model " +
        "made viable by p-token's 98% CU reduction.",
      inputSchema: {
        type: "object",
        properties: {
          payerPubkey: { type: "string", description: "Agent's Solana wallet public key" },
          pricePerToken: {
            type: "number",
            description: "Price per output token in micro-USDC (default: 100 = $0.0001/token)",
          },
          maxTokens: { type: "number", description: "Max tokens to consume (default: 1000)" },
          mode: {
            type: "string",
            enum: ["atomic", "batched", "streamed"],
            description: "Settlement mode (default: batched)",
          },
        },
        required: ["payerPubkey"],
      },
      category: "x402",
    },
    async (args) => {
      const payerPubkey = String(args.payerPubkey);
      const pricePerTokenMicro = Number(args.pricePerToken ?? 100);
      const maxTokens = Number(args.maxTokens ?? 1000);
      const mode = (args.mode as StreamSession["mode"]) ?? "batched";

      const id = randomUUID().replace(/-/g, "").slice(0, 16);
      const session: StreamSession = {
        id,
        payerPubkey,
        pricePerTokenMicro,
        tokensConsumed: 0,
        checkpoints: 0,
        maxTokens,
        mode,
        openedAt: new Date().toISOString(),
        settled: false,
      };
      _sessions.set(id, session);

      const maxSpendMicro = maxTokens * pricePerTokenMicro;

      return {
        sessionId: id,
        scheme: "metered",
        tokenProgram: P_TOKEN_PROGRAM_ID,
        pricePerToken: pricePerTokenMicro,
        pricePerTokenUSDC: (pricePerTokenMicro / 1_000_000).toFixed(6),
        maxTokens,
        maxSpendUSDC: (maxSpendMicro / 1_000_000).toFixed(6),
        settlementMode: mode,
        facilitatorUrl: `${FACILITATOR_URL}/stream`,
        cuPerSettlement: mode === "batched" ? "~1,050 CU (batch)" : "~12,000 CU",
        feeOverhead: mode === "batched" ? "~1%" : "~1%",
        openedAt: session.openedAt,
        hint: "Call x402_session_meter to record tokens. Call x402_session_close to settle.",
      };
    },
  ],

  // ── x402_session_meter ────────────────────────────────────────────────────
  [
    {
      name: "x402_session_meter",
      description:
        "Record tokens consumed against an open metered session. " +
        "Returns running total and cost. In streamed mode, triggers a settlement checkpoint " +
        "every 50 tokens.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "Session ID from x402_session_open" },
          tokens: { type: "number", description: "Number of tokens just consumed" },
        },
        required: ["sessionId", "tokens"],
      },
      category: "x402",
    },
    async (args) => {
      const sessionId = String(args.sessionId);
      const tokens = Number(args.tokens ?? 0);
      const session = _sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);
      if (session.settled) throw new Error(`Session ${sessionId} already settled`);

      session.tokensConsumed += tokens;
      const totalCost = session.tokensConsumed * session.pricePerTokenMicro;
      const checkpoint = session.mode === "streamed" && session.tokensConsumed % 50 === 0;
      if (checkpoint) session.checkpoints++;

      const remaining = session.maxTokens - session.tokensConsumed;
      const budgetPct = ((session.tokensConsumed / session.maxTokens) * 100).toFixed(1);

      return {
        sessionId,
        tokensConsumed: session.tokensConsumed,
        tokensRemaining: Math.max(0, remaining),
        budgetUsed: `${budgetPct}%`,
        costSoFar: (totalCost / 1_000_000).toFixed(6),
        costSoFarUSDC: `$${(totalCost / 1_000_000).toFixed(6)}`,
        checkpointTriggered: checkpoint,
        checkpoints: session.checkpoints,
        mode: session.mode,
      };
    },
  ],

  // ── x402_session_close ────────────────────────────────────────────────────
  [
    {
      name: "x402_session_close",
      description:
        "Close a metered stream session and compute the final bill. " +
        "Returns exact cost for tokens consumed — agents never overpay for unused authorisation.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "Session ID to close" },
        },
        required: ["sessionId"],
      },
      category: "x402",
    },
    async (args) => {
      const sessionId = String(args.sessionId);
      const session = _sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);
      if (session.settled) throw new Error(`Session ${sessionId} already settled`);

      session.settled = true;
      const totalCost = session.tokensConsumed * session.pricePerTokenMicro;
      const maxCost = session.maxTokens * session.pricePerTokenMicro;
      const savedMicro = maxCost - totalCost;
      const duration = Date.now() - new Date(session.openedAt).getTime();

      // p-token batch CU for settlement
      const cuUsed =
        session.mode === "batched"
          ? 1000 + session.tokensConsumed * CU.pToken.transferChecked
          : session.checkpoints * 12_000;
      const cuVsSpl = session.mode === "batched"
        ? session.tokensConsumed * CU.spl.transferChecked
        : session.checkpoints * 200_000;

      return {
        sessionId,
        settled: true,
        tokensConsumed: session.tokensConsumed,
        finalBillUSDC: (totalCost / 1_000_000).toFixed(6),
        savedVsMaxUSDC: (savedMicro / 1_000_000).toFixed(6),
        savingsPercent: maxCost > 0 ? ((savedMicro / maxCost) * 100).toFixed(1) : "0",
        settlementMode: session.mode,
        cuUsed,
        cuVsSplu: cuVsSpl,
        cuSaved: cuVsSpl - cuUsed,
        durationMs: duration,
        payer: session.payerPubkey,
        tokenProgram: P_TOKEN_PROGRAM_ID,
        facilitator: FACILITATOR_URL,
        hint: totalCost > 0
          ? `Settlement: ${session.mode === "batched" ? "batch" : "streamed"} via pay.solanaclawd.com`
          : "No tokens consumed — no charge.",
      };
    },
  ],

  // ── x402_facilitator_ping ─────────────────────────────────────────────────
  [
    {
      name: "x402_facilitator_ping",
      description:
        "Ping pay.solanaclawd.com to check relay health, current network, " +
        "and p-token support status.",
      inputSchema: { type: "object", properties: {} },
      category: "x402",
    },
    async (_args) => {
      const origin = FACILITATOR_URL.replace(/\/relay.*$/, "");
      let health: Record<string, unknown> = {};
      let latencyMs = 0;
      let ok = false;
      try {
        const t0 = Date.now();
        const res = await fetch(`${origin}/health`, {
          signal: AbortSignal.timeout(5_000),
        });
        latencyMs = Date.now() - t0;
        ok = res.ok;
        if (res.ok) health = (await res.json()) as Record<string, unknown>;
        else health = { status: res.status, text: res.statusText };
      } catch (e) {
        health = { error: e instanceof Error ? e.message : String(e) };
      }

      return {
        facilitator: origin,
        relayUrl: FACILITATOR_URL,
        healthy: ok,
        latencyMs,
        pTokenProgram: P_TOKEN_PROGRAM_ID,
        ...health,
      };
    },
  ],

  // ── clawd_holder_check ────────────────────────────────────────────────────
  [
    {
      name: "clawd_holder_check",
      description:
        "Check CLAWD token holder status for a wallet. Returns balance, " +
        "discount tier (Bronze/Silver/Gold/Platinum), and active x402 fee reduction. " +
        "Holders get reduced x402 facilitator fees.",
      inputSchema: {
        type: "object",
        properties: {
          wallet: { type: "string", description: "Solana wallet address to check" },
        },
        required: ["wallet"],
      },
      category: "x402",
    },
    async (args) => {
      const wallet = String(args.wallet);

      // Get SPL token accounts for the wallet filtered to CLAWD mint
      let clawdBalance = 0;
      try {
        const result = (await heliusRPC("getTokenAccountsByOwner", [
          wallet,
          { mint: CLAWD_MINT },
          { encoding: "jsonParsed" },
        ])) as { value: Array<{ account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }> };
        clawdBalance =
          result.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0;
      } catch {
        clawdBalance = 0;
      }

      // Tier thresholds (illustrative — adjust to match real discount tiers)
      let tier = "None";
      let discount = "0%";
      if (clawdBalance >= 1_000_000) { tier = "Platinum"; discount = "30%"; }
      else if (clawdBalance >= 100_000) { tier = "Gold"; discount = "20%"; }
      else if (clawdBalance >= 10_000) { tier = "Silver"; discount = "10%"; }
      else if (clawdBalance >= 1_000) { tier = "Bronze"; discount = "5%"; }

      return {
        wallet,
        clawdBalance: clawdBalance.toLocaleString(),
        clawdMint: CLAWD_MINT,
        holderTier: tier,
        x402Discount: discount,
        isHolder: clawdBalance >= 1_000,
        thresholds: {
          Bronze: "1,000 CLAWD → 5% off",
          Silver: "10,000 CLAWD → 10% off",
          Gold: "100,000 CLAWD → 20% off",
          Platinum: "1,000,000 CLAWD → 30% off",
        },
      };
    },
  ],
];

// ─── Facilitator-aware session handler wrapper ─────────────────────────────────

/**
 * Wrap a handler with facilitator delegation for stream session tools.
 * Overrides open/meter/close to call PTokenStreamFacilitator via the meter.
 */
function withFacilitator(
  handler: ToolHandler,
  toolName: string,
  meter: SessionMeter,
): ToolHandler {
  return async (args: Record<string, unknown>) => {
    switch (toolName) {
      case "x402_session_open": {
        const result = await meter.openStreamSession({
          payerPubkey: String(args.payerPubkey),
          maxTokens: Number(args.maxTokens ?? 1000),
          maxSpendUsdc: Number(args.pricePerToken ?? 100) * Number(args.maxTokens ?? 1000) / 1_000_000,
          mode: (args.mode as StreamSession["mode"]) ?? "batched",
        });
        return {
          sessionId: result.sessionId,
          scheme: "metered",
          tokenProgram: P_TOKEN_PROGRAM_ID,
          pricePerToken: Number(args.pricePerToken ?? 100),
          pricePerTokenUSDC: ((args.pricePerToken as number ?? 100) / 1_000_000).toFixed(6),
          maxTokens: Number(args.maxTokens ?? 1000),
          maxSpendUSDC: ((Number(args.maxTokens ?? 1000) * Number(args.pricePerToken ?? 100)) / 1_000_000).toFixed(6),
          settlementMode: (args.mode as string) ?? "batched",
          cuPerSettlement: "~1,050 CU (batch)",
          feeOverhead: "~1%",
          facilitatorUrl: FACILITATOR_URL,
          openedAt: new Date().toISOString(),
          facilitatorBacked: true,
          hint: "Call x402_session_meter to record tokens. Call x402_session_close to settle on-chain.",
        };
      }

      case "x402_session_meter": {
        const sessionId = String(args.sessionId);
        const tokens = Number(args.tokens ?? 0);
        const sig = await meter.meterStream(sessionId, tokens);
        const savings = meter.getSavings();
        return {
          sessionId,
          tokensConsumed: tokens,
          costSoFarUSDC: "$0.00",
          settlementTriggered: !!sig,
          settlementSignature: sig ?? undefined,
          facilitatorBacked: true,
          totalCuSavedByFacilitator: savings.cuSaved,
          hint: sig
            ? "Auto-settlement triggered — check signature for on-chain proof"
            : "Tokens metered. Call x402_session_close to settle.",
        };
      }

      case "x402_session_close": {
        const sessionId = String(args.sessionId);
        const result = await meter.closeStreamSession(sessionId);
        return {
          sessionId,
          settled: true,
          finalBillUSDC: result.finalBillUsdc,
          signature: result.signature,
          settlementMode: "batched",
          cuSaved: result.cuSaved,
          facilitatorBacked: true,
          facilitatorUrl: FACILITATOR_URL,
          hint: result.signature
            ? `Settled on-chain: ${result.signature}`
            : "Session closed — no balance to settle.",
        };
      }

      default:
        return handler(args);
    }
  };
}

// ─── enhanceX402WithFacilitator ─────────────────────────────────────────────────

/**
 * Enhance the x402 tool array with PTokenStreamFacilitator integration.
 *
 * Replaces the in-memory x402_session_open / x402_session_meter / x402_session_close
 * handlers with versions that delegate to the facilitator via SessionMeter.
 * Read-only tools (x402_status, x402_billing_status, etc.) are NOT touched.
 *
 * Call this BEFORE withMeter() so both wrappers compose:
 *   enhanceX402WithFacilitator(X402_TOOLS, meter, facilitator) → withMeter(...)
 *
 * The session definition is updated to show the facilitator-backed description.
 */
export function enhanceX402WithFacilitator(
  tools: Array<[ToolDef, ToolHandler]>,
  meter: SessionMeter,
  facilitator: import("../orchestrator.js").StreamFacilitatorHandle,
): Array<[ToolDef, ToolHandler]> {
  return tools.map(([def, handler]) => {
    let updatedDef = def;

    switch (def.name) {
      case "x402_session_open":
        updatedDef = {
          ...def,
          description:
            "Open a p-token metered stream session backed by PTokenStreamFacilitator. " +
            "Issues a METER challenge on-chain via pay.solanaclawd.com. " +
            "Tokens are billed via x402_session_meter and settled at x402_session_close. " +
            "P-token 98% CU reduction makes per-output-token billing viable.",
        };
        break;
      case "x402_session_meter":
        updatedDef = {
          ...def,
          description:
            "Record tokens consumed against a facilitator-backed stream session. " +
            "May trigger auto-settlement if batch threshold reached. " +
            "Returns on-chain settlement signature when applicable.",
        };
        break;
      case "x402_session_close":
        updatedDef = {
          ...def,
          description:
            "Close a facilitator-backed metered session and settle the final balance on-chain. " +
            "Returns the Solana transaction signature as payment proof. " +
            "Unused pre-authorisation is released — agent never overpays.",
        };
        break;
    }

    const enhancedHandler = withFacilitator(handler, def.name, meter);
    return [updatedDef, enhancedHandler];
  });
}

// Export handler lookup including meter injection
export function withMeter(
  tools: Array<[ToolDef, ToolHandler]>,
  meter: SessionMeter,
): Array<[ToolDef, ToolHandler]> {
  return tools.map(([def, handler]) => [
    def,
    // Inject meter as second argument for tools that need it
    async (args: Record<string, unknown>) => {
      if (def.name === "x402_billing_status") {
        return (handler as (a: Record<string, unknown>, m: SessionMeter) => Promise<unknown>)(
          args,
          meter,
        );
      }
      return handler(args);
    },
  ]);
}
