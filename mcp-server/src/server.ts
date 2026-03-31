/**
 * solana-claude MCP Server
 *
 * Standalone — calls public Solana APIs directly.
 * NO private key, NO wallet, NO paid API required for basic usage.
 *
 * Data sources (all free / public):
 *   - SolanaTracker API (free tier, no key needed for basic endpoints)
 *   - Helius RPC + DAS + Enhanced Transactions + Webhooks (HELIUS_API_KEY, free at helius.dev)
 *   - CoinGecko simple price (no key needed)
 *   - Jupiter price API (no key)
 *   - Public Solana mainnet RPC (fallback)
 *
 * Tools: 37 (15 original + 8 Helius + 6 services: x402, autoDream, session, prompts + 8 Pump.fun)
 * Resources: 4 (README, soul, skills, tools)
 * Prompts: 5
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SRC_ROOT = path.resolve(REPO_ROOT, "src");

// ─────────────────────────────────────────────────────────────────────────────
// Free public API helpers
// ─────────────────────────────────────────────────────────────────────────────

const HELIUS_KEY = process.env.HELIUS_API_KEY ?? "";
const HELIUS_RPC =
  process.env.HELIUS_RPC_URL ??
  (HELIUS_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`
    : "https://api.mainnet-beta.solana.com");
const HELIUS_API_BASE = "https://api-mainnet.helius-rpc.com";

/** SolanaTracker free public API — no key needed for basic endpoints */
async function solanaTracker(path: string): Promise<unknown> {
  const res = await fetch(`https://data.solanatracker.io${path}`, {
    headers: {
      Accept: "application/json",
      "x-api-key": process.env.SOLANA_TRACKER_API_KEY ?? "",
    },
  });
  if (!res.ok) throw new Error(`SolanaTracker ${path} → ${res.status}`);
  return res.json();
}

/** CoinGecko simple price (no key, generous free tier) */
async function coingeckoPrice(ids: string): Promise<unknown> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`CoinGecko → ${res.status}`);
  return res.json();
}

/** Jupiter price API (no key, very fast) */
async function jupiterPrice(mint: string): Promise<unknown> {
  const res = await fetch(
    `https://api.jup.ag/price/v2?ids=${mint}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Jupiter price → ${res.status}`);
  return res.json();
}

/** Helius JSON-RPC (uses HELIUS_RPC_URL or auto-built from HELIUS_API_KEY) */
async function heliusRPC(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json() as { result?: unknown; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

/**
 * Helius REST API — Enhanced Transactions, DAS, Webhooks
 * Requires HELIUS_API_KEY for most endpoints.
 */
async function heliusREST(endpoint: string, opts?: { method?: string; body?: unknown }): Promise<unknown> {
  if (!HELIUS_KEY) throw new Error("HELIUS_API_KEY not set. Get a free key at https://helius.dev");
  const url = `${HELIUS_API_BASE}${endpoint}${endpoint.includes("?") ? "&" : "?"}api-key=${HELIUS_KEY}`;
  const res = await fetch(url, {
    method: opts?.method ?? "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Helius REST ${endpoint} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function readFileText(abs: string): Promise<string | null> {
  try { return await fs.readFile(abs, "utf-8"); } catch { return null; }
}

function safePath(root: string, rel: string): string | null {
  const resolved = path.resolve(root, rel);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory storage (no database needed)
// ─────────────────────────────────────────────────────────────────────────────

const _memory: Array<{ tier: string; content: string; timestamp: string }> = [];
const _tasks: Array<{ id: string; type: string; description: string; status: string; createdAt: string }> = [];
let _taskCounter = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Server factory
// ─────────────────────────────────────────────────────────────────────────────

export function createServer(): Server {
  const server = new Server(
    { name: "solana-claude", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  // ── Resources ─────────────────────────────────────────────────────────────

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: "solana-claude://readme", name: "README", description: "solana-claude documentation", mimeType: "text/markdown" },
      { uri: "solana-claude://soul", name: "SOUL.md", description: "Agent identity and operating principles", mimeType: "text/markdown" },
      { uri: "solana-claude://skills", name: "Skills", description: "Available agent skills", mimeType: "application/json" },
      { uri: "solana-claude://tools", name: "Source Tools", description: "TypeScript tool source listing", mimeType: "application/json" },
    ],
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [
      { uriTemplate: "solana-claude://source/{path}", name: "Source file", description: "Read a src/ file", mimeType: "text/plain" },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (req: { params: { uri: string } }) => {
    const { uri } = req.params;
    if (uri === "solana-claude://readme") {
      const text = (await readFileText(path.join(REPO_ROOT, "README.md"))) ?? "README.md not found.";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (uri === "solana-claude://soul") {
      const text = (await readFileText(path.join(REPO_ROOT, "SOUL.md"))) ?? "No SOUL.md found — create one to give your agent an identity!";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (uri === "solana-claude://skills") {
      let skills: string[] = [];
      try {
        const entries = await fs.readdir(path.join(REPO_ROOT, "skills"), { withFileTypes: true });
        skills = entries.map(e => e.name);
      } catch { /**/ }
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ skills }, null, 2) }] };
    }
    if (uri === "solana-claude://tools") {
      let tools: string[] = [];
      try {
        const entries = await fs.readdir(path.join(SRC_ROOT, "engine"), { withFileTypes: true });
        tools = entries.map(e => e.name);
      } catch { /**/ }
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ tools }, null, 2) }] };
    }
    if (uri.startsWith("solana-claude://source/")) {
      const rel = uri.slice("solana-claude://source/".length);
      const abs = safePath(SRC_ROOT, rel);
      if (!abs) throw new Error("Invalid path");
      const text = await readFileText(abs);
      if (!text) throw new Error(`Not found: ${rel}`);
      return { contents: [{ uri, mimeType: "text/plain", text }] };
    }
    throw new Error(`Unknown resource: ${uri}`);
  });

  // ── Tools ─────────────────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "solana_price",
        description: "Get live price and 24h change for a Solana token. Accepts mint address or common symbols (SOL, BONK, JUP, etc.)",
        inputSchema: { type: "object" as const, properties: { token: { type: "string", description: "Token mint address or symbol (SOL, BONK, WIF, JUP…)" } }, required: ["token"] },
      },
      {
        name: "solana_trending",
        description: "Get trending Solana tokens right now — sorted by volume/momentum",
        inputSchema: { type: "object" as const, properties: { limit: { type: "number", description: "Number of results (default 10, max 50)" } } },
      },
      {
        name: "solana_token_info",
        description: "Get token metadata, security analysis, and on-chain info for a mint address",
        inputSchema: { type: "object" as const, properties: { mint: { type: "string", description: "Token mint address" } }, required: ["mint"] },
      },
      {
        name: "solana_wallet_pnl",
        description: "Get PnL, trade history, and performance for any public Solana wallet — no private key needed",
        inputSchema: { type: "object" as const, properties: { wallet: { type: "string", description: "Solana wallet address (public key)" } }, required: ["wallet"] },
      },
      {
        name: "solana_search",
        description: "Search for Solana tokens by name or symbol",
        inputSchema: { type: "object" as const, properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] },
      },
      {
        name: "solana_top_traders",
        description: "Get top traders for a specific token — useful for tracking smart money",
        inputSchema: { type: "object" as const, properties: { mint: { type: "string" }, limit: { type: "number" } }, required: ["mint"] },
      },
      {
        name: "solana_wallet_tokens",
        description: "Get all token balances for a wallet (no private key — fully public)",
        inputSchema: { type: "object" as const, properties: { wallet: { type: "string" } }, required: ["wallet"] },
      },
      {
        name: "agent_spawn",
        description: "Spawn a research or analysis agent task",
        inputSchema: { type: "object" as const, properties: { type: { type: "string", enum: ["research", "analysis", "ooda", "scanner", "dream"] }, description: { type: "string" }, prompt: { type: "string" } }, required: ["type", "description", "prompt"] },
      },
      {
        name: "agent_list",
        description: "List active agent tasks",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "agent_stop",
        description: "Stop an agent task by ID",
        inputSchema: { type: "object" as const, properties: { taskId: { type: "string" } }, required: ["taskId"] },
      },
      {
        name: "memory_recall",
        description: "Recall facts from the agent's persistent memory",
        inputSchema: { type: "object" as const, properties: { query: { type: "string" }, tier: { type: "string", enum: ["KNOWN", "LEARNED", "INFERRED", "all"] } }, required: ["query"] },
      },
      {
        name: "memory_write",
        description: "Write a fact to the agent's persistent memory",
        inputSchema: { type: "object" as const, properties: { content: { type: "string" }, tier: { type: "string", enum: ["LEARNED", "INFERRED"] } }, required: ["content"] },
      },
      {
        name: "skill_list",
        description: "List available solana-claude skills",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "skill_read",
        description: "Read the contents of a skill file",
        inputSchema: { type: "object" as const, properties: { skillName: { type: "string" } }, required: ["skillName"] },
      },
      {
        name: "sol_price",
        description: "Quick SOL price in USD via CoinGecko (no API key, always works)",
        inputSchema: { type: "object" as const, properties: {} },
      },

      // ── Helius onchain tools (requires HELIUS_API_KEY — free at helius.dev) ──
      {
        name: "helius_account_info",
        description: "Get detailed account info for any Solana address via Helius RPC. Works with or without HELIUS_API_KEY (uses public RPC as fallback).",
        inputSchema: { type: "object" as const, properties: { pubkey: { type: "string", description: "Solana account address" } }, required: ["pubkey"] },
      },
      {
        name: "helius_balance",
        description: "Get SOL balance (in SOL, not lamports) for any wallet address",
        inputSchema: { type: "object" as const, properties: { wallet: { type: "string" } }, required: ["wallet"] },
      },
      {
        name: "helius_transactions",
        description: "Get enhanced, human-readable transaction history for any Solana address. Returns parsed descriptions, token transfers, NFT events. Requires HELIUS_API_KEY.",
        inputSchema: { type: "object" as const, properties: {
          address: { type: "string", description: "Wallet or program address" },
          limit: { type: "number", description: "Number of transactions (default 10, max 100)" },
          type: { type: "string", description: "Filter by type: SWAP, NFT_SALE, TRANSFER, etc." },
        }, required: ["address"] },
      },
      {
        name: "helius_priority_fee",
        description: "Get real-time priority fee estimate for Solana transactions. Returns min/low/medium/high/veryHigh/recommended levels in microLamports. Use 'recommended' for Helius staked connections.",
        inputSchema: { type: "object" as const, properties: {
          accountKeys: { type: "array", items: { type: "string" }, description: "Account addresses involved in the transaction (for targeted fee estimate)" },
        } },
      },
      {
        name: "helius_das_asset",
        description: "Get Digital Asset Standard (DAS) metadata for any NFT or token mint. Returns full metadata, creators, royalties, collection info. Requires HELIUS_API_KEY.",
        inputSchema: { type: "object" as const, properties: { mint: { type: "string", description: "Token or NFT mint address" } }, required: ["mint"] },
      },
      {
        name: "helius_webhook_create",
        description: "Create a Helius webhook to receive real-time notifications when specific addresses transact. Your server receives POST requests. Requires HELIUS_API_KEY.",
        inputSchema: { type: "object" as const, properties: {
          webhookURL: { type: "string", description: "Your server URL that will receive POST notifications" },
          accountAddresses: { type: "array", items: { type: "string" }, description: "Solana addresses to watch (up to 100,000 per webhook)" },
          transactionTypes: { type: "array", items: { type: "string" }, description: "Types to listen for: Any, SWAP, NFT_SALE, TRANSFER, etc. Use ['Any'] for all." },
          webhookType: { type: "string", enum: ["enhanced", "raw", "discord"], description: "enhanced = parsed data, raw = raw logs, discord = Discord embed" },
        }, required: ["webhookURL", "accountAddresses", "transactionTypes"] },
      },
      {
        name: "helius_webhook_list",
        description: "List all active Helius webhooks on your account. Requires HELIUS_API_KEY.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "helius_listener_setup",
        description: "Get ready-to-use TypeScript code for setting up real-time Solana onchain event listeners using HeliusListener from solana-claude. Covers accountSubscribe, transactionSubscribe, logsSubscribe, slotSubscribe.",
        inputSchema: { type: "object" as const, properties: {
          subscriptionType: { type: "string", enum: ["account", "transaction", "logs", "slot", "signature", "program", "webhook"], description: "Type of listener to generate code for" },
          address: { type: "string", description: "Address to watch (for account/program subscriptions)" },
        }, required: ["subscriptionType"] },
      },

      // ── x402 Payment Protocol (Solana USDC) ─────────────────────────────
      {
        name: "x402_status",
        description: "Check x402 micropayment protocol status. Shows wallet config, spend limits, current network (Solana USDC primary). Adapted from Claude Code x402 service.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "x402_payment_history",
        description: "Show persistent x402 payment history from ~/.config/solana-claude/x402-payments.jsonl. Lists payments with amounts, networks, timestamps.",
        inputSchema: { type: "object" as const, properties: {} },
      },

      // ── autoDream — memory consolidation ────────────────────────────────
      {
        name: "dream_status",
        description: "Show autoDream memory consolidation status: OODA cycle gates, time gates, config. Explains how INFERRED signals get promoted to LEARNED.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "dream_run",
        description: "Generate a manual Dream memory consolidation prompt. Instructs Claude to group INFERRED signals and promote to LEARNED. Adapted from Claude Code's autoDream service.",
        inputSchema: { type: "object" as const, properties: {} },
      },

      // ── Session memory & prompt suggestions ──────────────────────────────
      {
        name: "session_summary",
        description: "Show persistent session history from ~/.config/solana-claude/sessions/. Lists sessions with tool call counts, timestamps, and summaries.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "prompt_suggestions",
        description: "Get context-aware suggested next prompts for Solana research, onchain monitoring, agent fleet, memory, and x402 payments. Adapted from Claude Code PromptSuggestion service.",
        inputSchema: { type: "object" as const, properties: {} },
      },

      // ── Pump.fun bonding curve + AMM tools ────────────────────────────────
      {
        name: "pump_token_scan",
        description: "Comprehensive Pump.fun token scan: bonding curve state, graduation progress, signal score, and flags (LP locked, creator sold, whale risk, cashback, mayhem mode). Best for evaluating pre-graduate tokens.",
        inputSchema: { type: "object" as const, properties: { mint: { type: "string", description: "Token mint address" } }, required: ["mint"] },
      },
      {
        name: "pump_buy_quote",
        description: "Simulate a buy on Pump.fun bonding curve — get fee breakdown and net amount for a given SOL input.",
        inputSchema: { type: "object" as const, properties: { mint: { type: "string" }, sol_amount: { type: "number", description: "SOL to spend" }, creator_fee_bps: { type: "number", description: "Creator fee in basis points (0 if no fee)" } }, required: ["mint", "sol_amount"] },
      },
      {
        name: "pump_sell_quote",
        description: "Simulate a sell on Pump.fun bonding curve — get SOL output estimate and fee breakdown for a given token amount.",
        inputSchema: { type: "object" as const, properties: { mint: { type: "string" }, token_amount: { type: "number", description: "Tokens to sell (whole tokens)" }, creator_fee_bps: { type: "number" } }, required: ["mint", "token_amount"] },
      },
      {
        name: "pump_graduation",
        description: "Get graduation progress for a Pump.fun token: % bonded, SOL accumulated, milestone thresholds, and whether it graduated to PumpSwap AMM.",
        inputSchema: { type: "object" as const, properties: { mint: { type: "string" } }, required: ["mint"] },
      },
      {
        name: "pump_market_cap",
        description: "Calculate Pump.fun token market cap in SOL and USD. Returns current price per token and bonding curve spot price.",
        inputSchema: { type: "object" as const, properties: { mint: { type: "string" } }, required: ["mint"] },
      },
      {
        name: "pump_top_tokens",
        description: "Get top Pump.fun tokens by volume, market cap, or graduation rate. Quick market overview.",
        inputSchema: { type: "object" as const, properties: { sort_by: { type: "string", enum: ["volume", "market_cap", "new", "graduating"], description: "Sort order" }, limit: { type: "number", description: "Number of results (default 10)" } } },
      },
      {
        name: "pump_new_tokens",
        description: "Get the most recently launched Pump.fun tokens. Useful for OODA observe phase and sniping new launches.",
        inputSchema: { type: "object" as const, properties: { limit: { type: "number", description: "Number of tokens (default 20, max 50)" } } },
      },
      {
        name: "pump_cashback_info",
        description: "Explain Pump.fun cashback mechanics — UserVolumeAccumulator PDAs, unclaimed cashback balance, and how to claim for a specific token.",
        inputSchema: { type: "object" as const, properties: { mint: { type: "string", description: "Token mint (optional — if omitted returns general cashback docs)" } } },
      },
    ],
  }));

  server.setRequestHandler(
    CallToolRequestSchema,
    async (req: { params: { name: string; arguments?: Record<string, unknown> } }) => {
      const { name, arguments: args } = req.params;
      const a = (args ?? {}) as Record<string, unknown>;
      const text = (t: unknown) => ({ content: [{ type: "text" as const, text: typeof t === "string" ? t : JSON.stringify(t, null, 2) }] });

      try {
        switch (name) {

          // ── Solana data (public APIs) ──────────────────────────────────────

          case "sol_price": {
            const data = await coingeckoPrice("solana");
            const sol = (data as Record<string, unknown>)["solana"] as Record<string, number>;
            return text(`SOL: $${sol.usd.toFixed(4)} (${sol.usd_24h_change > 0 ? "+" : ""}${sol.usd_24h_change?.toFixed(2)}% 24h)`);
          }

          case "solana_price": {
            const token = String(a.token ?? "SOL").trim();
            // Try Jupiter price API first (works for mints)
            const isMint = token.length >= 32;
            if (isMint) {
              try {
                const data = await jupiterPrice(token) as { data: Record<string, { price: string }> };
                const entry = data?.data?.[token];
                if (entry) return text({ mint: token, price_usd: parseFloat(entry.price), source: "Jupiter" });
              } catch { /* fall through to SolanaTracker */ }
            }
            // CoinGecko for major symbols
            const symbolMap: Record<string, string> = {
              SOL: "solana", BONK: "bonk", JUP: "jupiter-exchange-solana",
              WIF: "dogwifcoin", PENGU: "pudgy-penguins", POPCAT: "popcat",
            };
            const cgId = symbolMap[token.toUpperCase()];
            if (cgId) {
              const data = await coingeckoPrice(cgId);
              const entry = (data as Record<string, Record<string, number>>)[cgId];
              return text({ symbol: token.toUpperCase(), price_usd: entry?.usd, change_24h: entry?.usd_24h_change, source: "CoinGecko" });
            }
            // SolanaTracker fallback
            const st = await solanaTracker(`/search?query=${encodeURIComponent(token)}&limit=1`) as { tokens?: Array<{ price?: number; mint?: string; symbol?: string }> };
            const t0 = st.tokens?.[0];
            if (t0) return text({ symbol: t0.symbol, mint: t0.mint, price_usd: t0.price, source: "SolanaTracker" });
            return text(`No price found for: ${token}`);
          }

          case "solana_trending": {
            const limit = Number(a.limit ?? 10);
            const data = await solanaTracker(`/tokens/trending?limit=${Math.min(limit, 50)}`);
            return text(data);
          }

          case "solana_token_info": {
            const mint = String(a.mint);
            const [tracker, price] = await Promise.allSettled([
              solanaTracker(`/tokens/${mint}`),
              jupiterPrice(mint),
            ]);
            return text({
              tracker: tracker.status === "fulfilled" ? tracker.value : null,
              price: price.status === "fulfilled" ? price.value : null,
            });
          }

          case "solana_wallet_pnl": {
            const wallet = String(a.wallet);
            const data = await solanaTracker(`/pnl/${wallet}`);
            return text(data);
          }

          case "solana_search": {
            const query = String(a.query);
            const limit = Number(a.limit ?? 10);
            const data = await solanaTracker(`/search?query=${encodeURIComponent(query)}&limit=${limit}`);
            return text(data);
          }

          case "solana_top_traders": {
            const mint = String(a.mint);
            const limit = Number(a.limit ?? 10);
            const data = await solanaTracker(`/tokens/${mint}/top-traders?limit=${limit}`);
            return text(data);
          }

          case "solana_wallet_tokens": {
            const wallet = String(a.wallet);
            // Use Helius DAS or public RPC
            const result = await heliusRPC("getTokenAccountsByOwner", [
              wallet,
              { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
              { encoding: "jsonParsed" },
            ]);
            return text(result);
          }

          // ── Agent fleet (in-memory) ────────────────────────────────────────

          case "agent_spawn": {
            const task = {
              id: `task-${++_taskCounter}`,
              type: String(a.type ?? "research"),
              description: String(a.description ?? ""),
              prompt: String(a.prompt ?? ""),
              status: "running",
              createdAt: new Date().toISOString(),
            };
            _tasks.push(task);
            return text({ message: `Agent spawned: ${task.id}`, task });
          }

          case "agent_list": {
            return text({ tasks: _tasks, count: _tasks.length });
          }

          case "agent_stop": {
            const taskId = String(a.taskId);
            const task = _tasks.find(t => t.id === taskId);
            if (!task) return text(`Task not found: ${taskId}`);
            task.status = "stopped";
            return text({ message: `Stopped ${taskId}`, task });
          }

          // ── Memory (in-process, persists for MCP session duration) ────────

          case "memory_recall": {
            const query = String(a.query).toLowerCase();
            const tier = String(a.tier ?? "all");
            const matches = _memory.filter(m =>
              (tier === "all" || m.tier === tier) &&
              m.content.toLowerCase().includes(query)
            );
            return text({ query, tier, matches, total: matches.length });
          }

          case "memory_write": {
            const entry = {
              tier: String(a.tier ?? "INFERRED"),
              content: String(a.content),
              timestamp: new Date().toISOString(),
            };
            _memory.push(entry);
            return text({ message: "Memory written", entry });
          }

          // ── Skills ────────────────────────────────────────────────────────

          case "skill_list": {
            let skills: string[] = [];
            try {
              const entries = await fs.readdir(path.join(REPO_ROOT, "skills"), { withFileTypes: true });
              skills = entries.map(e => e.name);
            } catch { skills = []; }
            return text({ skills, hint: "Use skill_read to see a skill's contents" });
          }

          case "skill_read": {
            const skillName = String(a.skillName);
            const candidates = [
              path.join(REPO_ROOT, "skills", `${skillName}.md`),
              path.join(REPO_ROOT, "skills", skillName, "SKILL.md"),
              path.join(REPO_ROOT, "skills", skillName, "README.md"),
            ];
            for (const p of candidates) {
              const content = await readFileText(p);
              if (content) return text(content);
            }
            return text(`Skill not found: ${skillName}`);
          }

          // ── Helius onchain tools ───────────────────────────────────────────

          case "helius_account_info": {
            const pubkey = String(a.pubkey);
            const result = await heliusRPC("getAccountInfo", [pubkey, { encoding: "jsonParsed", commitment: "confirmed" }]);
            return text(result);
          }

          case "helius_balance": {
            const wallet = String(a.wallet);
            const lamports = await heliusRPC("getBalance", [wallet, { commitment: "confirmed" }]) as number;
            return text({ wallet, sol: lamports / 1e9, lamports });
          }

          case "helius_transactions": {
            const address = String(a.address);
            const limit = Number(a.limit ?? 10);
            const type = a.type ? String(a.type) : undefined;
            const params = new URLSearchParams({
              limit: String(Math.min(limit, 100)),
              ...(type ? { type } : {}),
            });
            const data = await heliusREST(`/v0/addresses/${encodeURIComponent(address)}/transactions?${params}`);
            return text(data);
          }

          case "helius_priority_fee": {
            const accountKeys = (a.accountKeys as string[] | undefined) ?? [];
            const payload: Record<string, unknown> = {
              options: { includeAllPriorityFeeLevels: true, recommended: true },
            };
            if (accountKeys.length > 0) payload.accountKeys = accountKeys;
            const result = await heliusRPC("getPriorityFeeEstimate", [payload]) as {
              priorityFeeEstimate: number;
              priorityFeeLevels?: Record<string, number>;
            };
            const levels = result.priorityFeeLevels ?? {};
            return text({
              recommended_microLamports: result.priorityFeeEstimate,
              levels,
              hint: "Use 'recommended' for Helius staked connections. 1 SOL = 1,000,000,000 lamports. 1 microLamport = 0.000001 lamports.",
              docs: "https://docs.helius.dev/solana-rpc-nodes/priority-fee-api",
            });
          }

          case "helius_das_asset": {
            const mint = String(a.mint);
            const result = await heliusRPC("getAsset", [{ id: mint }]);
            return text(result);
          }

          case "helius_webhook_create": {
            const webhookConfig = {
              webhookURL: String(a.webhookURL),
              accountAddresses: (a.accountAddresses as string[]) ?? [],
              transactionTypes: (a.transactionTypes as string[]) ?? ["Any"],
              webhookType: String(a.webhookType ?? "enhanced"),
            };
            const result = await heliusREST("/v0/webhooks", { method: "POST", body: webhookConfig });
            return text({
              success: true,
              webhook: result,
              hint: "Your server at webhookURL will now receive POST requests when the watched addresses transact.",
              docs: "https://docs.helius.dev/data-streaming-event-listening/webhooks",
            });
          }

          case "helius_webhook_list": {
            const result = await heliusREST("/v0/webhooks");
            return text(result);
          }

          case "helius_listener_setup": {
            const sub = String(a.subscriptionType ?? "transaction");
            const addr = a.address ? String(a.address) : "YOUR_ADDRESS_HERE";
            const snippets: Record<string, string> = {
              account: `// Real-time account change listener (standard WebSocket)
import { HeliusListener } from "./src/helius/index.js";

const listener = new HeliusListener({ apiKey: process.env.HELIUS_API_KEY! });
await listener.connect();

const sub = await listener.subscribeAccount(
  "${addr}",
  (data) => {
    console.log("Balance:", data.account.lamports / 1e9, "SOL");
    console.log("Slot:", data.context.slot);
  }
);

// Cleanup
// sub.unsubscribe();
// listener.disconnect();`,

              transaction: `// Real-time transaction stream — Helius Enhanced WebSocket
import { HeliusListener } from "./src/helius/index.js";

const listener = new HeliusListener({ apiKey: process.env.HELIUS_API_KEY! });
await listener.connect();

const sub = await listener.subscribeTransaction(
  {
    accountInclude: ["${addr}"],
    vote: false,
    failed: false,
  },
  (tx) => {
    console.log("Tx:", tx.signature, "slot:", tx.slot);
  }
);

// Also listen via EventEmitter:
listener.on("transaction", (tx) => console.log("event:", tx));`,

              logs: `// Real-time program log subscription
import { HeliusListener } from "./src/helius/index.js";

const listener = new HeliusListener({ apiKey: process.env.HELIUS_API_KEY! });
await listener.connect();

// Watch a specific program's logs
await listener.subscribeLogs(
  { filter: { mentions: ["${addr}"] } },
  (log) => {
    console.log("Sig:", log.signature);
    console.log("Logs:", log.logs);
    console.log("Err:", log.err);
  }
);

// Or watch ALL transactions (high volume!):
// await listener.subscribeLogs({ filter: "all" }, handler);`,

              slot: `// Slot heartbeat — fires every ~400ms on Solana mainnet
import { HeliusListener } from "./src/helius/index.js";

const listener = new HeliusListener({ apiKey: process.env.HELIUS_API_KEY! });
await listener.connect();

await listener.subscribeSlot((slot) => {
  console.log("Slot:", slot.slot, "Parent:", slot.parent, "Root:", slot.root);
});`,

              signature: `// Wait for a specific transaction to confirm
import { HeliusListener } from "./src/helius/index.js";

const listener = new HeliusListener({ apiKey: process.env.HELIUS_API_KEY! });
await listener.connect();

await listener.subscribeSignature(
  "TRANSACTION_SIGNATURE_HERE",
  (err) => {
    if (err) console.error("Tx failed:", err);
    else console.log("✓ Transaction confirmed!");
  }
);`,

              program: `// Watch all accounts owned by a program (e.g. Raydium AMM)
import { HeliusListener } from "./src/helius/index.js";

const RAYDIUM_AMM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

const listener = new HeliusListener({ apiKey: process.env.HELIUS_API_KEY! });
await listener.connect();

await listener.subscribeProgram(
  RAYDIUM_AMM,
  (data) => console.log("Pool updated:", data)
);`,

              webhook: `// Create a Helius webhook for server-side event handling
// Use the helius_webhook_create MCP tool, or via API:
curl -X POST "https://api-mainnet.helius-rpc.com/v0/webhooks?api-key=YOUR_HELIUS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhookURL": "https://your-server.com/webhook/helius",
    "transactionTypes": ["Any"],
    "accountAddresses": ["${addr}"],
    "webhookType": "enhanced"
  }'

// Handle webhook POSTs in Express:
import { createWebhookRouter } from "./src/helius/index.js";
import { EventEmitter } from "node:events";

const emitter = new EventEmitter();
app.use("/webhook/helius", createWebhookRouter(emitter));
emitter.on("event", (e) => console.log(e.type, e.signature, e.description));`,
            };

            const code = snippets[sub] ?? snippets.transaction;
            return text(
              `## Helius ${sub} Listener\n\nDocs: https://docs.helius.dev/data-streaming-event-listening/overview\n\n\`\`\`typescript\n${code}\n\`\`\`\n\nHeliusListener auto-reconnects with exponential backoff and pings every 30s to keep the connection alive.`
            );
          }

          // ── x402 Payment Tools ──────────────────────────────────────────
          case "x402_status": {
            const enabled = !!process.env.X402_SVM_PRIVATE_KEY;
            const network = process.env.X402_NETWORK ?? "solana";
            const maxReq = parseFloat(process.env.X402_MAX_PER_REQUEST_USD ?? "0.10");
            const maxSess = parseFloat(process.env.X402_MAX_SESSION_USD ?? "5.00");
            return text(
              [`x402 Payment Protocol — Solana USDC Edition`,
               ``,
               `Status:    ${enabled ? "✅ enabled" : "⚠️  disabled (set X402_SVM_PRIVATE_KEY)"}`,
               `Network:   ${network}`,
               `Max/req:   $${maxReq.toFixed(2)} USDC`,
               `Max/sess:  $${maxSess.toFixed(2)} USDC`,
               ``,
               `How it works:`,
               `  1. Agent requests a paid API endpoint`,
               `  2. Server returns HTTP 402 + PAYMENT-REQUIRED header`,
               `  3. x402 client signs Solana USDC transfer (@x402/svm)`,
               `  4. Agent retries with X-Payment header`,
               `  5. Server verifies via facilitator → returns data`,
               ``,
               `Enable: set X402_SVM_PRIVATE_KEY=<base58-keypair>`,
               `Demo:   npx tsx examples/x402-solana.ts --server`,
               `Docs:   https://github.com/coinbase/x402`,
              ].join("\n")
            );
          }

          case "x402_payment_history": {
            // Load from persistent JSONL log
            const logPath = require("path").join(
              require("os").homedir(), ".config", "solana-claude", "x402-payments.jsonl"
            );
            let history: Array<Record<string, unknown>> = [];
            try {
              const raw = await fs.readFile(logPath, "utf-8");
              history = raw.trim().split("\n").filter(Boolean)
                .slice(-20).map(l => JSON.parse(l));
            } catch { /* no payments yet */ }
            if (history.length === 0) {
              return text("No x402 payments recorded yet. Enable with X402_SVM_PRIVATE_KEY.");
            }
            const total = history.reduce((s, p) => s + ((p.amountUSD as number) ?? 0), 0);
            const lines = [
              `x402 Payment History (last ${history.length})`,
              `Total: $${total.toFixed(6)} USDC`,
              ``,
              ...history.map(p =>
                `[${new Date(p.timestamp as number).toLocaleString()}] $${(p.amountUSD as number).toFixed(6)} ${p.token} on ${p.network} — ${p.description ?? p.resource}`
              ),
            ];
            return text(lines.join("\n"));
          }

          // ── autoDream Tools ──────────────────────────────────────────────
          case "dream_status": {
            const minCycles = parseInt(process.env.DREAM_MIN_CYCLES ?? "5", 10);
            const minHours = parseFloat(process.env.DREAM_MIN_HOURS ?? "6");
            return text(
              [`autoDream Memory Consolidation`,
               ``,
               `Config:`,
               `  Min OODA cycles before dream: ${minCycles}`,
               `  Min hours between dreams:     ${minHours}h`,
               `  Enabled:                      ${process.env.DREAM_ENABLED !== "false" ? "yes" : "no"}`,
               ``,
               `What autoDream does:`,
               `  1. Waits until ${minCycles} OODA cycles have run`,
               `  2. Groups related INFERRED signals by keyword clusters`,
               `  3. Promotes clusters with 2+ corroborating signals → LEARNED`,
               `  4. Writes consolidated LEARNED fact to memory`,
               ``,
               `Override: DREAM_MIN_CYCLES=3 DREAM_MIN_HOURS=1 (faster consolidation)`,
               `Disable:  DREAM_ENABLED=false`,
              ].join("\n")
            );
          }

          case "dream_run": {
            // Direct dream invocation — builds consolidation prompt
            const prompt = [
              `# Manual Memory Consolidation`,
              ``,
              `Please consolidate the agent memory by:`,
              `1. Calling memory_recall with tier="INFERRED" to get all signals`,
              `2. Grouping related signals`,
              `3. For clusters of 2+ signals, calling memory_write with tier="LEARNED"`,
              `4. Write a summary conclusion to memory_write tier="LEARNED"`,
              ``,
              `Focus on Solana-relevant patterns: price action, wallet archetypes,`,
              `smart money moves, market regime signals.`,
            ].join("\n");
            return text(prompt);
          }

          // ── Session & Prompt Tools ───────────────────────────────────────
          case "session_summary": {
            const sessDir = require("path").join(
              require("os").homedir(), ".config", "solana-claude", "sessions"
            );
            let sessions: Array<Record<string, unknown>> = [];
            try {
              const files = await fs.readdir(sessDir);
              sessions = (await Promise.all(
                files.filter(f => f.endsWith(".json")).slice(-10).map(async f => {
                  try {
                    const raw = await fs.readFile(require("path").join(sessDir, f), "utf-8");
                    return JSON.parse(raw);
                  } catch { return null; }
                })
              )).filter(Boolean);
            } catch { /* no sessions */ }
            if (sessions.length === 0) {
              return text("No sessions recorded yet. Sessions are saved after tool calls.");
            }
            const lines = [
              `Session History (${sessions.length} sessions)`,
              ``,
              ...sessions.sort((a, b) => (b.lastActiveAt as number) - (a.lastActiveAt as number))
                .map(s => [
                  `Session: ${s.sessionId}`,
                  `  Started:    ${new Date(s.startedAt as number).toLocaleString()}`,
                  `  Last active: ${new Date(s.lastActiveAt as number).toLocaleString()}`,
                  `  Tool calls:  ${s.toolCallCount}`,
                  `  Compacted:   ${s.isCompacted ? "yes" : "no"}`,
                  s.summary ? `  Summary: ${(s.summary as string).slice(0, 100)}...` : "",
                ].filter(Boolean).join("\n")),
            ];
            return text(lines.join("\n"));
          }

          case "prompt_suggestions": {
            const suggestions = [
              `## Suggested Next Prompts`,
              ``,
              `### 🔍 Research`,
              `- "What are the top 5 trending tokens with >40% 24h change?"`,
              `- "Research BONK security score, smart money activity, and signal strength"`,
              `- "Check wallet [address] PnL and current holdings"`,
              ``,
              `### 📡 Onchain Monitor`,
              `- "Set up a real-time listener for wallet [address]"`,
              `- "Generate code to watch Raydium AMM for large swaps"`,
              `- "Create a Helius webhook for [mint] token transfers"`,
              ``,
              `### 🤖 Agent Fleet`,
              `- "Spawn the Scanner agent to monitor trending tokens"`,
              `- "Run a full OODA trading cycle"`,
              `- "Spawn the Analyst agent to research [token]"`,
              `- "Run Dream memory consolidation"`,
              ``,
              `### 💾 Memory`,
              `- "What do I know about [token] from memory?"`,
              `- "Show all LEARNED patterns in memory"`,
              `- "Write this finding to memory: [fact]"`,
              ``,
              `### 💳 x402 Payments`,
              `- "How do I enable x402 Solana micropayments?"`,
              `- "Show my x402 payment history"`,
              `- "What APIs support x402 payment protocol?"`,
            ].join("\n");
            return text(suggestions);
          }

          // ── Pump.fun bonding curve + AMM tools ─────────────────────────────

          case "pump_token_scan": {
            const mint = String(a.mint);
            const [trackerRes, priceRes] = await Promise.allSettled([
              solanaTracker(`/tokens/${mint}`) as Promise<Record<string, unknown>>,
              coingeckoPrice("solana") as Promise<Record<string, unknown>>,
            ]);
            const tracker = trackerRes.status === "fulfilled" ? trackerRes.value as Record<string, unknown> : null;
            const solPriceUSD: number = priceRes.status === "fulfilled"
              ? ((priceRes.value as Record<string, Record<string, number>>)?.solana?.usd ?? 0)
              : 0;
            if (!tracker) return text(`No Pump.fun data found for mint: ${mint}`);

            const isGraduated = Boolean(tracker.poolAddress || tracker.migratedToAMM);
            const progressPct = Number(tracker.bondingCurveProgress ?? 0);
            const progressBps = Math.round(progressPct * 100);
            const mcapSOL = Number(tracker.marketCap ?? 0);
            const vol24h = Number(tracker.volume24h ?? 0);
            const top10 = Number(tracker.top10HolderPercent ?? 0);
            const holderCount = Number(tracker.holderCount ?? 0);

            let score = 50;
            const reasons: string[] = [];
            const risks: string[] = [];
            if (isGraduated) { score += 10; reasons.push("LP locked (graduated)"); }
            if (tracker.creatorSold) { score -= 20; risks.push("Creator sold ⚠️"); }
            if (top10 > 50) { score -= 15; risks.push(`Whale risk: top10=${top10.toFixed(0)}%`); }
            if (progressBps >= 6000 && progressBps <= 9000) { score += 15; reasons.push(`Pre-grad sweet spot ${progressPct.toFixed(1)}%`); }
            if (vol24h > 1_000_000) { score += 10; reasons.push(`Vol $${(vol24h/1e6).toFixed(2)}M`); }
            if (holderCount > 1000) { score += 5; reasons.push(`${holderCount.toLocaleString()} holders`); }
            if (tracker.isCashbackCoin) { score += 3; reasons.push("Cashback enabled"); }
            score = Math.min(100, Math.max(0, score));
            const strength = score >= 75 ? "STRONG" : score >= 55 ? "MODERATE" : score >= 35 ? "WEAK" : "AVOID";

            const filled = Math.min(10, Math.round(progressBps / 1000));
            const bar = "█".repeat(filled) + "░".repeat(10 - filled);

            const output = [
              `## ${tracker.symbol ?? "??"} — ${tracker.name ?? "Unknown"}`,
              `Mint: \`${mint}\``,
              `Status: ${isGraduated ? "🎓 Graduated → PumpSwap AMM" : "📈 Bonding curve"}`,
              ``,
              `### Bonding Curve`,
              `Progress: ${bar} ${progressPct.toFixed(1)}%`,
              `Market Cap: $${(mcapSOL * solPriceUSD).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${mcapSOL.toFixed(2)} SOL)`,
              `Volume 24h: $${vol24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              `Holders: ${holderCount.toLocaleString()} | Top 10: ${top10.toFixed(1)}%`,
              ``,
              `### Signal: **${strength}** (${score}/100)`,
              reasons.length ? `✅ ${reasons.join(" | ")}` : "",
              risks.length ? `⚠️ ${risks.join(" | ")}` : "",
              ``,
              `### Flags`,
              `Cashback: ${tracker.isCashbackCoin ? "✅" : "❌"} | Mayhem: ${tracker.isMayhemMode ? "⚡" : "❌"} | Creator sold: ${tracker.creatorSold ? "🚨" : "✅"}`,
            ].filter(Boolean).join("\n");
            return text(output);
          }

          case "pump_buy_quote": {
            const mint = String(a.mint);
            const solAmount = Number(a.sol_amount ?? 0);
            const creatorFeeBps = Number(a.creator_fee_bps ?? 0);
            if (solAmount <= 0) return text("sol_amount must be > 0");
            let tracker: Record<string, unknown> | null = null;
            try { tracker = await solanaTracker(`/tokens/${mint}`) as Record<string, unknown>; } catch { /* ok */ }
            const solIn = BigInt(Math.round(solAmount * 1e9));
            const FEE_BPS = 100n, BPS_D = 10_000n;
            const creatorBps = BigInt(creatorFeeBps);
            const totalFeeBps = FEE_BPS + creatorBps;
            const inputNet = ((solIn - 1n) * BPS_D) / (totalFeeBps + BPS_D);
            const protocolFee = (inputNet * FEE_BPS + BPS_D - 1n) / BPS_D;
            const creatorFee = creatorBps > 0n ? (inputNet * creatorBps + BPS_D - 1n) / BPS_D : 0n;
            return text([
              `## 🛒 Buy Quote — ${tracker?.symbol ?? mint.slice(0, 8)}`,
              ``,
              `**Input:** ${solAmount} SOL`,
              `**Net into curve:** ${(Number(inputNet) / 1e9).toFixed(6)} SOL`,
              `**Protocol fee (1%):** ${(Number(protocolFee) / 1e9).toFixed(6)} SOL`,
              `**Creator fee (${creatorFeeBps}bps):** ${(Number(creatorFee) / 1e9).toFixed(6)} SOL`,
              `**Total fees:** ${(Number(protocolFee + creatorFee) / 1e9).toFixed(6)} SOL`,
              ``,
              `_For exact token output: use @pump-fun/pump-sdk with live on-chain reserves._`,
            ].join("\n"));
          }

          case "pump_sell_quote": {
            const mint = String(a.mint);
            const tokenAmount = Number(a.token_amount ?? 0);
            const creatorFeeBps = Number(a.creator_fee_bps ?? 0);
            if (tokenAmount <= 0) return text("token_amount must be > 0");
            let tracker: Record<string, unknown> | null = null;
            try { tracker = await solanaTracker(`/tokens/${mint}`) as Record<string, unknown>; } catch { /* ok */ }
            const price = Number(tracker?.price ?? 0);
            const estGross = price > 0 ? `$${(price * tokenAmount).toFixed(4)}` : "N/A";
            return text([
              `## 💰 Sell Quote — ${tracker?.symbol ?? mint.slice(0, 8)}`,
              `Amount: ${tokenAmount.toLocaleString()} tokens`,
              ``,
              `**Protocol fee:** 1.00% of gross SOL out`,
              `**Creator fee:** ${(creatorFeeBps / 100).toFixed(2)}%`,
              `**Total fee rate:** ${(1 + creatorFeeBps / 100).toFixed(2)}%`,
              ``,
              `Current price: ${price > 0 ? `$${price.toFixed(8)}` : "N/A"}`,
              `Estimated gross: ${estGross}`,
              ``,
              `_For exact amount: use @pump-fun/pump-sdk with live reserves._`,
            ].join("\n"));
          }

          case "pump_graduation": {
            const mint = String(a.mint);
            let tracker: Record<string, unknown> | null = null;
            try { tracker = await solanaTracker(`/tokens/${mint}`) as Record<string, unknown>; } catch { /* ok */ }
            if (!tracker) return text(`No data for ${mint}`);
            const isGraduated = Boolean(tracker.poolAddress || tracker.migratedToAMM);
            const progressPct = Number(tracker.bondingCurveProgress ?? 0);
            const filled = Math.min(10, Math.round(progressPct / 10));
            const bar = "█".repeat(filled) + "░".repeat(10 - filled);
            return text([
              `## 🎓 Graduation Progress — ${tracker.symbol ?? mint.slice(0, 8)}`,
              ``,
              `Status: ${isGraduated ? "✅ **Graduated** — trading on PumpSwap AMM" : "⏳ On bonding curve"}`,
              `Progress: ${bar} **${progressPct.toFixed(2)}%**`,
              isGraduated ? `Pool: \`${tracker.poolAddress ?? "N/A"}\`` : `Remaining: ~${(85 - Number(tracker.realSolReserves ?? 0) / 1e9).toFixed(2)} SOL to graduation`,
              ``,
              `**Milestone guide:**`,
              `  < 20%  — Early entry, high risk/reward`,
              `  60–90% — Pre-grad sweet spot 🎯`,
              `  > 90%  — Near graduation, vol spike expected`,
              `  100%   — Graduated → liquidity migrated to PumpSwap`,
            ].join("\n"));
          }

          case "pump_market_cap": {
            const mint = String(a.mint);
            const [trackerRes, solPriceRes] = await Promise.allSettled([
              solanaTracker(`/tokens/${mint}`) as Promise<Record<string, unknown>>,
              coingeckoPrice("solana") as Promise<Record<string, unknown>>,
            ]);
            const tracker = trackerRes.status === "fulfilled" ? trackerRes.value as Record<string, unknown> : null;
            const solPrice = solPriceRes.status === "fulfilled"
              ? ((solPriceRes.value as Record<string, Record<string, number>>)?.solana?.usd ?? 0)
              : 0;
            if (!tracker) return text(`No data for ${mint}`);
            const mcapSOL = Number(tracker.marketCap ?? 0);
            const price = Number(tracker.price ?? 0);
            const poolAddress = String(tracker.poolAddress ?? "");
            return text([
              `## 📊 Market Cap — ${tracker.symbol ?? mint.slice(0, 8)}`,
              ``,
              `**Market Cap:** $${(mcapSOL * solPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD | ${mcapSOL.toFixed(2)} SOL`,
              `**Token Price:** $${price.toFixed(8)} USD`,
              `**SOL Price:** $${solPrice.toFixed(2)}`,
              poolAddress ? `**Pool (AMM):** \`${poolAddress}\`` : `**Venue:** Bonding curve (pre-graduation)`,
              ``,
              `_Formula: marketCap = virtualSolReserves × totalSupply / virtualTokenReserves_`,
            ].join("\n"));
          }

          case "pump_top_tokens": {
            const limit = Math.min(Number(a.limit ?? 10), 50);
            const sortBy = String(a.sort_by ?? "volume");
            let data: unknown;
            try {
              data = await solanaTracker(`/tokens/pump?sort=${sortBy}&limit=${limit}`);
            } catch {
              data = await solanaTracker(`/tokens/trending?limit=${limit}`);
            }
            return text(data);
          }

          case "pump_new_tokens": {
            const limit = Math.min(Number(a.limit ?? 20), 50);
            let data: unknown;
            try {
              const res = await fetch(`https://pump.fun/api/coins/new?limit=${limit}`, {
                headers: { Accept: "application/json", "User-Agent": "solana-claude/1.0" },
              });
              data = res.ok ? await res.json() : await solanaTracker(`/tokens/latest?limit=${limit}`);
            } catch {
              data = await solanaTracker(`/tokens/latest?limit=${limit}`);
            }
            return text(data);
          }

          case "pump_cashback_info": {
            const mint = String(a.mint ?? "");
            const docs = [
              `## 💰 Pump.fun Cashback Mechanics`,
              ``,
              `Cashback redirects the creator fee back to traders. Enabled on tokens created with **isCashbackEnabled: true**.`,
              ``,
              `### Instruction Changes`,
              `- **Bonding curve buy**: No change — cashback automatic`,
              `- **Bonding curve sell**: Add UserVolumeAccumulator PDA at remaining_accounts[0] (writable)`,
              `- **PumpSwap buy**: Add WSOL ATA of UserVolumeAccumulator (AMM program) at remaining_accounts[0]`,
              `- **PumpSwap sell**: Add WSOL ATA at [0], UserVolumeAccumulator at [1]`,
              ``,
              `### PDA Seeds`,
              `\`\`\`typescript`,
              `// Use PUMP_PROGRAM_ADDRESS for bonding curve, PUMP_AMM_PROGRAM_ADDRESS for AMM`,
              `const [pda] = await getProgramDerivedAddress({`,
              `  programAddress: PUMP_PROGRAM_ADDRESS,`,
              `  seeds: [utf8Encoder.encode("user_volume_accumulator"), addressEncoder.encode(wallet)]`,
              `});`,
              `\`\`\``,
              ``,
              `### Reading Unclaimed`,
              `- **Bonding curve**: lamports of UserVolumeAccumulator − rent_exempt_min`,
              `- **PumpSwap**: WSOL token balance of WSOL ATA of UserVolumeAccumulator (AMM program)`,
              ``,
              `### Claiming`,
              `- Bonding curve: \`claim_cashback\` instruction → native lamports to user`,
              `- PumpSwap: \`claim_cashback\` → WSOL from ATA to user's WSOL ATA`,
            ].join("\n");
            if (mint) {
              let tracker: Record<string, unknown> | null = null;
              try { tracker = await solanaTracker(`/tokens/${mint}`) as Record<string, unknown>; } catch { /* ok */ }
              const enabled = tracker?.isCashbackCoin ? "✅ YES" : "❌ NO (standard creator fee)";
              return text(`### Cashback for ${tracker?.symbol ?? mint.slice(0, 8)}\nEnabled: ${enabled}\n\n---\n\n${docs}`);
            }
            return text(docs);
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (err) {
        return text(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // ── Prompts ───────────────────────────────────────────────────────────────

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      { name: "solana_overview", description: "Overview of solana-claude capabilities" },
      { name: "trade_research", description: "Research a token for a trade decision", arguments: [{ name: "token", description: "Token symbol or mint", required: true }] },
      { name: "ooda_loop", description: "Run an OODA cycle: Observe → Orient → Decide → Act" },
      { name: "market_scan", description: "Scan trending tokens and surface high-signal opportunities" },
      { name: "wallet_analysis", description: "Analyze a wallet's performance and holdings", arguments: [{ name: "wallet", description: "Solana wallet address", required: true }] },
      { name: "pump_scan", description: "Scan Pump.fun for high-signal new token launches and bonding curve plays" },
      { name: "pump_ooda", description: "Full OODA loop focused on Pump.fun bonding curve opportunities", arguments: [{ name: "mint", description: "Token mint to evaluate (optional)", required: false }] },
    ],
  }));

  server.setRequestHandler(
    GetPromptRequestSchema,
    async (req: { params: { name: string; arguments?: Record<string, string> } }) => {
      const { name, arguments: args } = req.params;
      const msg = (text: string) => ({
        description: name,
        messages: [{ role: "user" as const, content: { type: "text" as const, text } }],
      });

      switch (name) {
        case "solana_overview":
          return msg(`You are solana-claude, an autonomous Solana research and trading assistant.\n\nYou have access to these tools:\n- solana_price: live token prices\n- solana_trending: trending tokens\n- solana_token_info: token metadata and security\n- solana_wallet_pnl: any wallet's PnL\n- solana_search: token discovery\n- solana_top_traders: smart money tracking\n- solana_wallet_tokens: wallet holdings\n- sol_price: quick SOL price\n- memory_recall/write: persistent memory across turns\n- agent_spawn/list/stop: background analysis tasks\n- skill_list/read: available skills\n\nAll tools work without a private key or wallet. Start by checking sol_price and solana_trending to orient yourself.`);

        case "trade_research": {
          const token = args?.token ?? "SOL";
          return msg(`Research ${token} for a potential trade. Use these tools in order:\n\n1. solana_price — get current price and 24h change\n2. solana_token_info — get security score and metadata (use mint if you have it)\n3. solana_trending — check if it's trending\n4. solana_top_traders — see who's buying/selling\n5. memory_recall — check for any LEARNED patterns about this token\n\nAfter gathering data, summarize:\n- KNOWN: current price, volume, change\n- LEARNED: any patterns from memory\n- INFERRED: your signal assessment\n- DECISION: buy/wait/avoid + risk level (low/medium/high)\n- ACTION: if entering, suggested position size and stop`);
        }

        case "ooda_loop":
          return msg(`Run a full OODA loop for Solana market intelligence:\n\n**OBSERVE**\n- sol_price: SOL current price\n- solana_trending: what's moving right now\n- memory_recall query="recent" tier="KNOWN": any fresh data in memory\n\n**ORIENT**\n- For top 3 trending tokens, run solana_token_info\n- memory_recall query="pattern" tier="LEARNED": what patterns apply?\n- Cross-reference with INFERRED signals from memory\n\n**DECIDE**\n- Which tokens have the best risk/reward?\n- What's your conviction level (low/medium/high)?\n- Time horizon: scalp / swing / hold?\n\n**ACT**\n- memory_write your top INFERRED signals for the next loop\n- agent_spawn type="scanner" if you want ongoing monitoring\n- Report your top 1-3 opportunities with rationale`);

        case "market_scan":
          return msg(`Scan the Solana market for high-signal opportunities:\n\n1. Get sol_price for market context\n2. Get solana_trending with limit=20\n3. For tokens with >50% 24h change, run solana_token_info\n4. Flag tokens that:\n   - Have security score > 80\n   - Have volume > $500K\n   - Are NOT in a rug pattern (check token_info liquidity locked)\n5. Summarize top 5 opportunities with:\n   - Token name, mint, price, change\n   - Security score\n   - Why it's interesting\n   - Risk level`);

        case "wallet_analysis": {
          const wallet = args?.wallet ?? "(no wallet provided)";
          return msg(`Analyze this Solana wallet: ${wallet}\n\n1. solana_wallet_pnl — overall PnL, wins/losses\n2. solana_wallet_tokens — current holdings\n3. For major holdings, run solana_price to get current values\n4. memory_recall query="${wallet.slice(0,8)}" — any prior analysis in memory\n\nSummarize:\n- Total PnL (realized + unrealized)\n- Win rate\n- Largest positions\n- Best and worst trades\n- Pattern: what does this wallet trade? (memecoins, DeFi, NFTs?)\n- memory_write any notable patterns you discover`);
        }

        case "pump_scan":
          return msg(`You are a Pump.fun degen analyst. Run an OBSERVE scan for alpha.\n\n1. pump_new_tokens limit=20 — what just launched?\n2. pump_top_tokens sort_by=graduating limit=10 — what's near 100%?\n3. pump_top_tokens sort_by=volume limit=10 — what's moving?\n4. sol_price — market context\n\nFor each token that looks interesting:\n- pump_token_scan mint=<mint> — full signal score and flags\n- pump_graduation mint=<mint> — how close to graduation?\n\n## Output Format\n\nFor each token of interest:\n- **Signal:** [STRONG/MODERATE/WEAK]\n- **Mint:** \`...\`\n- **Thesis:** (one sentence)\n- **Risk:** (one sentence)\n\n**Top pick:** [symbol] — [reason]\n\nEnd with: memory_write your top INFERRED signal`);

        case "pump_ooda": {
          const mint = args?.mint;
          if (mint) {
            return msg(`OODA loop on Pump.fun token: \`${mint}\`\n\n**OBSERVE**\n- pump_token_scan mint=${mint}\n- pump_graduation mint=${mint}\n- pump_market_cap mint=${mint}\n- sol_price\n\n**ORIENT**\n- pump_buy_quote mint=${mint} sol_amount=0.1\n- pump_sell_quote mint=${mint} token_amount=100000\n- pump_cashback_info mint=${mint}\n- memory_recall query=${mint.slice(0, 8)}\n\n**DECIDE**\n- Signal: STRONG / MODERATE / WEAK / AVOID\n- Is this a graduation play? Pre-grad entry? Exit setup?\n- Risk factors: whale concentration? Creator still holding?\n\n**ACT**\n- memory_write your INFERRED signal with score and reasoning\n- If STRONG: propose entry size (% of portfolio) + stop loss\n- If AVOID: document why for future reference`);
          }
          return msg(`Full Pump.fun OODA loop — no specific token.\n\n**OBSERVE**\n- pump_new_tokens limit=30\n- pump_top_tokens sort_by=graduating\n- sol_price\n\n**ORIENT**\nFor top 3 promising new tokens:\n- pump_token_scan\n- pump_graduation\n\n**DECIDE**\nRank by signal score. Identify:\n1. Best pre-grad play (60-90% bonded, strong signal)\n2. Best new launch (fresh, low mcap, creator holding)\n3. Avoid list (rugs, whales, low volume)\n\n**ACT**\n- memory_write top signals with scoring rationale\n- Report top 3 findings with entry thesis`);
        }

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    },
  );

  return server;
}

export async function validateSrcRoot(): Promise<void> {
  try {
    await fs.access(SRC_ROOT);
  } catch {
    console.warn(`⚠ src/ directory not found at ${SRC_ROOT}`);
  }
}
