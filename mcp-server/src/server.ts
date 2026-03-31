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
 * Tools: 23 (15 original + 8 Helius onchain tools)
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
