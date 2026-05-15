/**
 * Deep Clawd — Solana Trading Tool Definitions
 *
 * These are the tools available to the DeepSeek agent during its OODA loop.
 * All tools are read-only or paper-only by default (Three Laws enforced).
 * The `jupiter_swap` tool requires LIVE_TRADING=true AND OPERATOR_CONFIRMED=true.
 *
 * Tools use the same public APIs as the MCP server (SolanaTracker, CoinGecko,
 * Jupiter, Helius) — no private keys involved at the tool layer.
 */

import type Anthropic from "@anthropic-ai/sdk";

export type SolanaTool = Anthropic.Tool;

// ─── Market data tools (always available, read-only) ─────────────────────────

export const OBSERVE_TOOLS: SolanaTool[] = [
  {
    name: "sol_price",
    description: "Get current SOL price in USD with 24h change via CoinGecko",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "trending_tokens",
    description: "Top 20 trending Solana tokens by volume/momentum via SolanaTracker",
    input_schema: {
      type: "object" as const,
      properties: { limit: { type: "number", description: "Number of results (default 20)" } },
    },
  },
  {
    name: "new_launches",
    description: "Most recently launched Pump.fun tokens — sniping intelligence",
    input_schema: {
      type: "object" as const,
      properties: { limit: { type: "number", description: "Number of tokens (default 20)" } },
    },
  },
  {
    name: "token_info",
    description: "Token metadata, security score, and price for a specific mint",
    input_schema: {
      type: "object" as const,
      properties: { mint: { type: "string", description: "Token mint address" } },
      required: ["mint"],
    },
  },
  {
    name: "pump_scan",
    description: "Full Pump.fun token scan: bonding curve progress, signal score, flags",
    input_schema: {
      type: "object" as const,
      properties: { mint: { type: "string", description: "Token mint address" } },
      required: ["mint"],
    },
  },
];

// ─── Analysis tools (orient phase) ───────────────────────────────────────────

export const ORIENT_TOOLS: SolanaTool[] = [
  {
    name: "wallet_pnl",
    description: "Get PnL and trade history for a wallet — track smart money",
    input_schema: {
      type: "object" as const,
      properties: { wallet: { type: "string", description: "Solana wallet address" } },
      required: ["wallet"],
    },
  },
  {
    name: "top_traders",
    description: "Top traders for a specific token — who is buying/selling smart money?",
    input_schema: {
      type: "object" as const,
      properties: {
        mint: { type: "string", description: "Token mint" },
        limit: { type: "number", description: "Number of traders (default 10)" },
      },
      required: ["mint"],
    },
  },
  {
    name: "helius_transactions",
    description: "Enhanced parsed transaction history for any address",
    input_schema: {
      type: "object" as const,
      properties: {
        address: { type: "string" },
        limit: { type: "number", description: "Max 50" },
      },
      required: ["address"],
    },
  },
  {
    name: "priority_fee",
    description: "Current Solana priority fee estimate in microLamports by tier",
    input_schema: { type: "object" as const, properties: {} },
  },
];

// ─── Execution tools (act phase — paper-only enforced) ────────────────────────

export const ACT_TOOLS: SolanaTool[] = [
  {
    name: "paper_swap",
    description:
      "PAPER TRADE ONLY: Simulate a Jupiter swap without executing on-chain. " +
      "Returns estimated output, price impact, and fee. Safe for all environments.",
    input_schema: {
      type: "object" as const,
      properties: {
        inputMint: { type: "string", description: "Input token mint" },
        outputMint: { type: "string", description: "Output token mint" },
        amountLamports: { type: "number", description: "Input amount in lamports/base units" },
        slippageBps: { type: "number", description: "Slippage tolerance in basis points (default 50)" },
      },
      required: ["inputMint", "outputMint", "amountLamports"],
    },
  },
  {
    name: "jupiter_swap",
    description:
      "LIVE SWAP: Execute a Jupiter swap on-chain. " +
      "REQUIRES: LIVE_TRADING=true AND OPERATOR_CONFIRMED=true in environment. " +
      "Paper trades if those flags are not set — never silently executes live.",
    input_schema: {
      type: "object" as const,
      properties: {
        inputMint: { type: "string" },
        outputMint: { type: "string" },
        amountLamports: { type: "number" },
        slippageBps: { type: "number" },
        reason: { type: "string", description: "Trading rationale — required for audit log" },
      },
      required: ["inputMint", "outputMint", "amountLamports", "reason"],
    },
  },
  {
    name: "write_shell",
    description: "Write an observation or hypothesis to the agent's SHELL.md working memory",
    input_schema: {
      type: "object" as const,
      properties: {
        content: { type: "string", description: "Markdown content to append" },
        section: { type: "string", description: "Section header" },
      },
      required: ["content"],
    },
  },
  {
    name: "x402_pay",
    description:
      "Pay for a resource using x402 + p-token. Cheap: p-token TransferChecked costs only 105 CU " +
      "(vs 6,200 CU for SPL Token — 98% cheaper).",
    input_schema: {
      type: "object" as const,
      properties: {
        resourceUrl: { type: "string", description: "x402-enabled API endpoint to call" },
        maxUSDC: { type: "number", description: "Max USDC to spend (default 0.01)" },
      },
      required: ["resourceUrl"],
    },
  },
];

// ─── All tools combined ───────────────────────────────────────────────────────

export const ALL_TOOLS: SolanaTool[] = [
  ...OBSERVE_TOOLS,
  ...ORIENT_TOOLS,
  ...ACT_TOOLS,
];

// ─── Tool executor ────────────────────────────────────────────────────────────

const HELIUS_KEY = () => process.env.HELIUS_API_KEY ?? "";
const HELIUS_RPC = () =>
  HELIUS_KEY()
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY()}`
    : "https://api.mainnet-beta.solana.com";

async function fetchJSON(url: string, opts?: RequestInit): Promise<unknown> {
  const r = await fetch(url, { headers: { Accept: "application/json" }, ...opts, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`${url} → ${r.status}: ${r.statusText}`);
  return r.json();
}

async function heliusRPC(method: string, params: unknown[]): Promise<unknown> {
  const r = await fetch(HELIUS_RPC(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const d = (await r.json()) as { result?: unknown; error?: { message: string } };
  if (d.error) throw new Error(d.error.message);
  return d.result;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  paperOnly: boolean,
): Promise<string> {
  try {
    switch (name) {
      case "sol_price": {
        const d = await fetchJSON("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true") as Record<string, Record<string, number>>;
        const sol = d.solana;
        return `SOL: $${sol.usd.toFixed(4)} (${sol.usd_24h_change > 0 ? "+" : ""}${sol.usd_24h_change?.toFixed(2)}% 24h)`;
      }

      case "trending_tokens": {
        const limit = Number(input.limit ?? 20);
        const d = await fetchJSON(`https://data.solanatracker.io/tokens/trending?limit=${Math.min(limit, 50)}`, { headers: { Accept: "application/json", "x-api-key": process.env.SOLANA_TRACKER_API_KEY ?? "" } });
        return JSON.stringify(d, null, 2);
      }

      case "new_launches": {
        const limit = Number(input.limit ?? 20);
        try {
          const d = await fetchJSON(`https://pump.fun/api/coins/new?limit=${limit}`);
          return JSON.stringify(d, null, 2);
        } catch {
          const d = await fetchJSON(`https://data.solanatracker.io/tokens/latest?limit=${limit}`, { headers: { Accept: "application/json", "x-api-key": process.env.SOLANA_TRACKER_API_KEY ?? "" } });
          return JSON.stringify(d, null, 2);
        }
      }

      case "token_info": {
        const mint = String(input.mint);
        const [tracker, price] = await Promise.allSettled([
          fetchJSON(`https://data.solanatracker.io/tokens/${mint}`, { headers: { "x-api-key": process.env.SOLANA_TRACKER_API_KEY ?? "" } }),
          fetchJSON(`https://api.jup.ag/price/v2?ids=${mint}`),
        ]);
        return JSON.stringify({
          tracker: tracker.status === "fulfilled" ? tracker.value : null,
          price: price.status === "fulfilled" ? price.value : null,
        }, null, 2);
      }

      case "pump_scan": {
        const mint = String(input.mint);
        const d = await fetchJSON(`https://data.solanatracker.io/tokens/${mint}`, { headers: { "x-api-key": process.env.SOLANA_TRACKER_API_KEY ?? "" } }) as Record<string, unknown>;
        const prog = Number(d.bondingCurveProgress ?? 0);
        const bar = "█".repeat(Math.min(10, Math.round(prog / 10))) + "░".repeat(10 - Math.min(10, Math.round(prog / 10)));
        return `${d.symbol} — Pump Scan\nProgress: ${bar} ${prog.toFixed(1)}%\nGraduated: ${Boolean(d.poolAddress) ? "✅ Yes" : "❌ No"}\nCreator sold: ${d.creatorSold ? "⚠️ Yes" : "✅ No"}\nCashback: ${d.isCashbackCoin ? "✅" : "❌"}`;
      }

      case "wallet_pnl": {
        const d = await fetchJSON(`https://data.solanatracker.io/pnl/${input.wallet}`, { headers: { "x-api-key": process.env.SOLANA_TRACKER_API_KEY ?? "" } });
        return JSON.stringify(d, null, 2);
      }

      case "top_traders": {
        const d = await fetchJSON(`https://data.solanatracker.io/tokens/${input.mint}/top-traders?limit=${input.limit ?? 10}`, { headers: { "x-api-key": process.env.SOLANA_TRACKER_API_KEY ?? "" } });
        return JSON.stringify(d, null, 2);
      }

      case "helius_transactions": {
        if (!HELIUS_KEY()) return "HELIUS_API_KEY not set";
        const d = await fetchJSON(`https://api-mainnet.helius-rpc.com/v0/addresses/${input.address}/transactions?limit=${input.limit ?? 10}&api-key=${HELIUS_KEY()}`);
        return JSON.stringify(d, null, 2);
      }

      case "priority_fee": {
        const d = await heliusRPC("getPriorityFeeEstimate", [{ options: { includeAllPriorityFeeLevels: true, recommended: true } }]) as { priorityFeeEstimate: number; priorityFeeLevels?: Record<string, number> };
        return `Priority fee: ${d.priorityFeeEstimate} µlamports/CU (recommended)\nLevels: ${JSON.stringify(d.priorityFeeLevels ?? {})}`;
      }

      case "paper_swap": {
        // Always paper — return Jupiter quote
        const quote = await fetchJSON(
          `https://quote-api.jup.ag/v6/quote?inputMint=${input.inputMint}&outputMint=${input.outputMint}&amount=${input.amountLamports}&slippageBps=${input.slippageBps ?? 50}`
        ) as Record<string, unknown>;
        return `[PAPER TRADE]\nInput: ${input.amountLamports} → Output: ${quote.outAmount}\nPrice impact: ${quote.priceImpactPct}%\nRoute: ${JSON.stringify(quote.routePlan ?? "direct")}`;
      }

      case "jupiter_swap": {
        if (paperOnly || process.env.LIVE_TRADING !== "true" || process.env.OPERATOR_CONFIRMED !== "true") {
          // Fall back to paper
          const quote = await fetchJSON(
            `https://quote-api.jup.ag/v6/quote?inputMint=${input.inputMint}&outputMint=${input.outputMint}&amount=${input.amountLamports}&slippageBps=${input.slippageBps ?? 50}`
          ) as Record<string, unknown>;
          return `[PAPER TRADE — live trading not enabled]\nReason: ${input.reason}\nQuoted output: ${quote.outAmount}\nTo enable live trading: LIVE_TRADING=true OPERATOR_CONFIRMED=true`;
        }
        // Live trading path — requires wallet integration (not implemented here for safety)
        return "[LIVE SWAP] Wallet integration required — set up keypair in wallet.ts";
      }

      case "write_shell": {
        const { writeFile, mkdir } = await import("node:fs/promises");
        const { join, homedir } = await import("node:path");
        const dir = join(homedir(), ".openclawd", "deep-clawd");
        await mkdir(dir, { recursive: true });
        const section = input.section ? `\n\n## ${input.section} — ${new Date().toISOString()}\n\n` : "\n\n";
        await writeFile(join(dir, "SHELL.md"), `${section}${input.content}\n`, { flag: "a" });
        return `Written to SHELL.md: ${String(input.content).slice(0, 80)}…`;
      }

      case "x402_pay": {
        const url = String(input.resourceUrl);
        const maxUSDC = Number(input.maxUSDC ?? 0.01);
        // Paper: just show what would happen
        return `[x402 PAY — PAPER]\nResource: ${url}\nMax: $${maxUSDC} USDC\nP-token: 105 CU vs SPL 6,200 CU (98% cheaper)\nTo execute: wire X402_SVM_PRIVATE_KEY + x402 client SDK`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (e) {
    return `Tool error [${name}]: ${e instanceof Error ? e.message : String(e)}`;
  }
}
