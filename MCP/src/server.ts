/**
 * solana-clawd MCP Server
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
 * Tools: 73 (15 original + 8 Helius + 6 services + 8 Pump.fun + 9 Pinocchio/p-token + 7 Chess.com + 10 P-Token Launch Pad + 10 P-Token Launch Pad tools)
 * Resources: 14 (README, soul, skills, tools, Pinocchio, Pinocchio guide, program map, program JSON, p-token launches, p-token registry, p-token launch pad, launch pad SDK, launch pad program, launch pad README)
 * Prompts: 13 (solana_overview, trade_research, ooda_loop, market_scan, wallet_analysis, pump_scan, pump_ooda, pinocchio_builder, ptoken_launch, ptoken_launch_pad_plan, ptoken_launch_pad_ooda)
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
import * as os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SRC_ROOT = path.resolve(REPO_ROOT, "src");
const PINOCCHIO_ROOT = path.resolve(REPO_ROOT, "pinocchio");
const PINOCCHIO_TEMPLATES_ROOT = path.resolve(PINOCCHIO_ROOT, "templates");
const PTOKEN_REGISTRY_PATH = path.resolve(REPO_ROOT, "data", "ptokens.json");
const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const DEFAULT_P_TOKEN_PROGRAM_ID = "ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF";
const PTOKEN_LAUNCHPAD_ROOT = path.resolve(REPO_ROOT, "programs", "p-token-launchpad");
const LAUNCHPAD_PROGRAM_ID = "pLPha99abcdefghijklmnopqrstuvwxyz1234567890";
const LAUNCHPAD_SDK_PATH = path.resolve(REPO_ROOT, "x402", "p-token-launchpad.ts");
const LAUNCHPAD_DOCS_PATH = path.resolve(REPO_ROOT, "docs", "PTOKEN_LAUNCHPAD.md");

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

type PTokenRegistry = {
  version: number;
  tokens: Array<Record<string, unknown> & { mint: string; symbol?: string; addedAt?: string }>;
};

async function listPinocchioTemplates(): Promise<string[]> {
  const entries = await fs.readdir(PINOCCHIO_TEMPLATES_ROOT, { withFileTypes: true });
  return entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
}

async function listTemplateFiles(template: string): Promise<string[]> {
  const root = path.resolve(PINOCCHIO_TEMPLATES_ROOT, template);
  if (!root.startsWith(PINOCCHIO_TEMPLATES_ROOT)) throw new Error("Invalid template");
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else {
        out.push(path.relative(root, abs));
      }
    }
  }
  await walk(root);
  return out.sort();
}

async function readTemplateFile(template: string, relPath: string): Promise<string> {
  const root = path.resolve(PINOCCHIO_TEMPLATES_ROOT, template);
  if (!root.startsWith(PINOCCHIO_TEMPLATES_ROOT)) throw new Error("Invalid template");
  const abs = path.resolve(root, relPath);
  if (!abs.startsWith(root)) throw new Error("Invalid template path");
  const text = await readFileText(abs);
  if (text === null) throw new Error(`Template file not found: ${template}/${relPath}`);
  return text;
}

async function readPTokenRegistry(): Promise<PTokenRegistry> {
  const text = await readFileText(PTOKEN_REGISTRY_PATH);
  if (!text) return { version: 1, tokens: [] };
  const parsed = JSON.parse(text) as Partial<PTokenRegistry>;
  return { version: parsed.version ?? 1, tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [] };
}

async function writePTokenRegistry(registry: PTokenRegistry): Promise<void> {
  await fs.mkdir(path.dirname(PTOKEN_REGISTRY_PATH), { recursive: true });
  await fs.writeFile(PTOKEN_REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf-8");
}

async function inspectPTokenMint(
  mint: string,
  options: { network?: string; tokenProgram?: string; pTokenProgramId?: string },
): Promise<Record<string, unknown>> {
  const pTokenProgramId = options.pTokenProgramId || process.env.P_TOKEN_PROGRAM_ID || DEFAULT_P_TOKEN_PROGRAM_ID;
  const account = await heliusRPC("getAccountInfo", [mint, { encoding: "base64", commitment: "confirmed" }]) as {
    value?: { owner: string; data: [string, string] };
  };
  if (!account.value) throw new Error(`Mint account not found: ${mint}`);

  const data = Buffer.from(account.value.data[0], "base64");
  const mintLayout = parseMintLayout(data);
  const supply = await heliusRPC("getTokenSupply", [mint]).catch(() => null) as
    | { value?: { amount?: string; decimals?: number; uiAmountString?: string } }
    | null;
  const ownerProgram = account.value.owner;
  const tokenProgram = classifyTokenProgram(ownerProgram, pTokenProgramId, options.tokenProgram);
  const network = options.network ?? (HELIUS_RPC.includes("devnet") ? "solana-devnet" : "solana-mainnet");
  return {
    mint,
    network,
    tokenProgram,
    ownerProgram,
    pTokenProgramId: tokenProgram === "p-token" ? ownerProgram : undefined,
    decimals: supply?.value?.decimals ?? mintLayout.decimals,
    supply: supply?.value?.amount ?? mintLayout.supply,
    uiSupply: supply?.value?.uiAmountString ?? formatUiAmount(mintLayout.supply, mintLayout.decimals),
    isInitialized: mintLayout.isInitialized,
    mintAuthority: mintLayout.mintAuthority,
    freezeAuthority: mintLayout.freezeAuthority,
    links: explorerLinks(network, mint),
  };
}

function parseMintLayout(data: Buffer): {
  mintAuthority: string | null;
  supply: string;
  decimals: number;
  isInitialized: boolean;
  freezeAuthority: string | null;
} {
  if (data.length < 82) throw new Error(`Account is too short for an SPL-compatible mint: ${data.length} bytes`);
  const mintAuthorityOption = data.readUInt32LE(0);
  const freezeAuthorityOption = data.readUInt32LE(46);
  return {
    mintAuthority: mintAuthorityOption ? base58(data.subarray(4, 36)) : null,
    supply: data.readBigUInt64LE(36).toString(),
    decimals: data[44],
    isInitialized: data[45] === 1,
    freezeAuthority: freezeAuthorityOption ? base58(data.subarray(50, 82)) : null,
  };
}

function classifyTokenProgram(ownerProgram: string, pTokenProgramId: string, explicit?: string): string {
  if (explicit && explicit !== "auto") return explicit;
  if (pTokenProgramId && ownerProgram === pTokenProgramId) return "p-token";
  if (ownerProgram === SPL_TOKEN_PROGRAM_ID) return "spl";
  return "custom";
}

function explorerLinks(network: string, mint: string): Record<string, string> {
  const devnet = network === "solana-devnet";
  return {
    solanaExplorer: `https://explorer.solana.com/address/${mint}${devnet ? "?cluster=devnet" : ""}`,
    solscan: `https://solscan.io/token/${mint}${devnet ? "?cluster=devnet" : ""}`,
  };
}

function formatUiAmount(amount: string, decimals: number): string {
  const raw = BigInt(amount);
  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const frac = (raw % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

function num(input: unknown, fallback: number): number {
  if (input === undefined || input === null || input === "") return fallback;
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid numeric value: ${input}`);
  return value;
}

function decimalToBaseUnits(amount: number, decimals: number): string {
  const [whole, fraction = ""] = String(amount).split(".");
  const padded = `${fraction}${"0".repeat(decimals)}`.slice(0, decimals);
  return `${whole}${padded}`.replace(/^0+(?=\d)/, "");
}

function pTokenBondingCurveQuote(args: Record<string, unknown>): Record<string, unknown> {
  const virtualSol = num(args.virtualSol, 30);
  const virtualToken = num(args.virtualToken, 1_073_000_000);
  const feeBps = num(args.feeBps, 100);
  const side = String(args.side ?? (args.tokens !== undefined ? "sell" : "buy"));
  const spotPriceBefore = virtualSol / virtualToken;
  if (side === "sell") {
    const tokensIn = num(args.tokens ?? args.tokenAmount, 0);
    if (tokensIn <= 0) throw new Error("tokens is required for sell quotes");
    const k = virtualSol * virtualToken;
    const virtualTokenAfter = virtualToken + tokensIn;
    const virtualSolAfter = k / virtualTokenAfter;
    const grossSolOut = Math.max(0, virtualSol - virtualSolAfter);
    const fee = grossSolOut * feeBps / 10_000;
    return {
      side,
      tokensIn,
      grossSolOut,
      fee,
      netSolOut: grossSolOut - fee,
      spotPriceBefore,
      spotPriceAfter: virtualSolAfter / virtualTokenAfter,
      virtualSolAfter,
      virtualTokenAfter,
      unsigned: true,
    };
  }
  const solIn = num(args.sol ?? args.solAmount, 1);
  if (solIn <= 0) throw new Error("sol is required for buy quotes");
  const fee = solIn * feeBps / 10_000;
  const netSolIn = solIn - fee;
  const k = virtualSol * virtualToken;
  const virtualSolAfter = virtualSol + netSolIn;
  const virtualTokenAfter = k / virtualSolAfter;
  return {
    side: "buy",
    solIn,
    fee,
    netSolIn,
    tokensOut: Math.max(0, virtualToken - virtualTokenAfter),
    spotPriceBefore,
    spotPriceAfter: virtualSolAfter / virtualTokenAfter,
    virtualSolAfter,
    virtualTokenAfter,
    unsigned: true,
  };
}

function pTokenLaunchPlan(args: Record<string, unknown>): Record<string, unknown> {
  const symbol = String(args.symbol ?? "PFOO").toUpperCase();
  const name = String(args.name ?? "Example p-token");
  const decimals = num(args.decimals, 9);
  const supply = num(args.supply, 1_000_000_000);
  const network = String(args.network ?? "solana-devnet");
  const pTokenProgramId = String(args.pTokenProgramId ?? process.env.P_TOKEN_PROGRAM_ID ?? DEFAULT_P_TOKEN_PROGRAM_ID);
  const virtualSol = num(args.virtualSol, 30);
  const virtualToken = num(args.virtualToken, 1_073_000_000);
  return {
    unsigned: true,
    warning: "Planning only. This MCP tool does not sign transactions, deploy programs, or move funds.",
    network,
    tokenProgram: "p-token",
    pTokenProgramId,
    metadata: {
      name,
      symbol,
      uri: String(args.uri ?? "https://example.com/metadata.json"),
      decimals,
    },
    supply: {
      human: supply,
      baseUnits: decimalToBaseUnits(supply, decimals),
    },
    bondingCurve: {
      enabled: args.bondingCurve !== false,
      type: "constant-product",
      virtualSol,
      virtualToken,
      realSol: num(args.realSol, 0),
      realToken: num(args.realToken, 793_100_000),
      feeBps: num(args.feeBps, 100),
      spotPrice: virtualSol / virtualToken,
      graduation: {
        trigger: "real-sol-reserve",
        targetSol: num(args.graduationSol, 85),
        postGraduation: "seed-amm-liquidity",
      },
    },
    commands: {
      scaffold: `npm run pinocchio:scaffold -- --template p-token-launcher --name ${symbol.toLowerCase()}-launch --out ./programs/${symbol.toLowerCase()}-launch`,
      quote: `npm run ptoken:curve-quote -- --virtual-sol ${virtualSol} --virtual-token ${virtualToken} --sol 1`,
      inspect: "npm run ptoken:inspect -- --mint <mint>",
      register: `npm run ptoken:add -- --mint <mint> --symbol ${symbol} --name "${name}" --p-token-program-id ${pTokenProgramId}`,
    },
    checklist: [
      "scaffold from pinocchio/templates/p-token-launcher",
      "review authority, PDA, fee, graduation, and close/refund paths",
      "test on devnet before accepting value",
      "inspect the mint over RPC",
      "register the verified mint in data/ptokens.json",
      "enable x402 p-token routing only after verification",
    ],
  };
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58(bytes: Uint8Array): string {
  let num = 0n;
  for (const byte of bytes) num = (num << 8n) + BigInt(byte);
  let encoded = "";
  while (num > 0n) {
    const rem = Number(num % 58n);
    num /= 58n;
    encoded = BASE58_ALPHABET[rem] + encoded;
  }
  for (const byte of bytes) {
    if (byte === 0) encoded = `1${encoded}`;
    else break;
  }
  return encoded || "1";
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
    { name: "solana-clawd", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  // ── Resources ─────────────────────────────────────────────────────────────

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: "solana-clawd://readme", name: "README", description: "solana-clawd documentation", mimeType: "text/markdown" },
      { uri: "solana-clawd://soul", name: "SOUL.md", description: "Agent identity and operating principles", mimeType: "text/markdown" },
      { uri: "solana-clawd://skills", name: "Skills", description: "Available agent skills", mimeType: "application/json" },
      { uri: "solana-clawd://tools", name: "Source Tools", description: "TypeScript tool source listing", mimeType: "application/json" },
      { uri: "solana-clawd://pinocchio", name: "Pinocchio Support", description: "Pinocchio and p-token developer support README", mimeType: "text/markdown" },
      { uri: "solana-clawd://pinocchio-guide", name: "Pinocchio Guide", description: "Native Solana Pinocchio guide for agents and developers", mimeType: "text/markdown" },
      { uri: "solana-clawd://pinocchio-programs", name: "Pinocchio Program Map", description: "One-by-one upstream Pinocchio program crate map", mimeType: "text/markdown" },
      { uri: "solana-clawd://pinocchio-programs-json", name: "Pinocchio Program Map JSON", description: "Machine-readable Pinocchio program map", mimeType: "application/json" },
      { uri: "solana-clawd://programs", name: "Solana Program Workspace", description: "Program-by-program map of the solana-clawd on-chain workspace", mimeType: "text/markdown" },
      { uri: "solana-clawd://programs-json", name: "Solana Program Map JSON", description: "Machine-readable solana-clawd program map", mimeType: "application/json" },
      { uri: "solana-clawd://ptoken-launches", name: "p-token Launches", description: "Unsigned p-token launch and bonding curve workflow", mimeType: "text/markdown" },
      { uri: "solana-clawd://ptokens", name: "p-token Registry", description: "Registered p-token mint metadata", mimeType: "application/json" },
      { uri: "solana-clawd://ptoken-launchpad", name: "P-Token Launch Pad Docs", description: "P-Token Launch Pad full documentation — adapted from Metaplex Genesis", mimeType: "text/markdown" },
      { uri: "solana-clawd://ptoken-launchpad-sdk", name: "P-Token Launch Pad SDK", description: "TypeScript SDK source — createAgentToken, buy, sell, registerAgent, fee distribution", mimeType: "text/typescript" },
      { uri: "solana-clawd://ptoken-launchpad-program", name: "P-Token Launch Pad Program", description: "Anchor program source — bonding curves, agent registry, graduation, fee withdrawal", mimeType: "text/plain" },
      { uri: "solana-clawd://ptoken-launchpad-readme", name: "P-Token Launch Pad README", description: "Deployment guide and SDK reference for the p-token launch pad program", mimeType: "text/markdown" },
    ],
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [
      { uriTemplate: "solana-clawd://source/{path}", name: "Source file", description: "Read a src/ file", mimeType: "text/plain" },
      { uriTemplate: "solana-clawd://pinocchio-template/{template}/{path}", name: "Pinocchio template file", description: "Read a Pinocchio template file", mimeType: "text/plain" },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (req: { params: { uri: string } }) => {
    const { uri } = req.params;
    if (uri === "solana-clawd://readme") {
      const text = (await readFileText(path.join(REPO_ROOT, "README.md"))) ?? "README.md not found.";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (uri === "solana-clawd://soul") {
      const text = (await readFileText(path.join(REPO_ROOT, "SOUL.md"))) ?? "No SOUL.md found — create one to give your agent an identity!";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (uri === "solana-clawd://skills") {
      let skills: string[] = [];
      try {
        const entries = await fs.readdir(path.join(REPO_ROOT, "skills"), { withFileTypes: true });
        skills = entries.map(e => e.name);
      } catch { /**/ }
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ skills }, null, 2) }] };
    }
    if (uri === "solana-clawd://tools") {
      let tools: string[] = [];
      try {
        const entries = await fs.readdir(path.join(SRC_ROOT, "engine"), { withFileTypes: true });
        tools = entries.map(e => e.name);
      } catch { /**/ }
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ tools }, null, 2) }] };
    }
    if (uri === "solana-clawd://pinocchio") {
      const text = (await readFileText(path.join(PINOCCHIO_ROOT, "README.md"))) ?? "pinocchio/README.md not found.";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (uri === "solana-clawd://pinocchio-guide") {
      const text = (await readFileText(path.join(PINOCCHIO_ROOT, "docs", "PINOCCHIO_GUIDE.md"))) ?? "Pinocchio guide not found.";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (uri === "solana-clawd://pinocchio-programs") {
      const text = (await readFileText(path.join(PINOCCHIO_ROOT, "PROGRAM_MAP.md"))) ??
        (await readFileText(path.join(PINOCCHIO_ROOT, "pinocchio-main", "programs", "README.md"))) ??
        "Pinocchio program map not found.";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (uri === "solana-clawd://pinocchio-programs-json") {
      const text = (await readFileText(path.join(REPO_ROOT, "data", "pinocchio-programs.json"))) ?? JSON.stringify({ version: 1, programs: [] }, null, 2);
      return { contents: [{ uri, mimeType: "application/json", text }] };
    }
    if (uri === "solana-clawd://programs") {
      const text = (await readFileText(path.join(REPO_ROOT, "programs", "README.md"))) ?? "programs/README.md not found.";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (uri === "solana-clawd://programs-json") {
      const text = (await readFileText(path.join(REPO_ROOT, "data", "programs-map.json"))) ?? JSON.stringify({ version: 1, programs: [] }, null, 2);
      return { contents: [{ uri, mimeType: "application/json", text }] };
    }
    if (uri === "solana-clawd://ptoken-launches") {
      const text = (await readFileText(path.join(PINOCCHIO_ROOT, "docs", "P_TOKEN_LAUNCHES.md"))) ?? "p-token launch guide not found.";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (uri === "solana-clawd://ptokens") {
      const registry = await readPTokenRegistry();
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(registry, null, 2) }] };
    }
    if (uri.startsWith("solana-clawd://source/")) {
      const rel = uri.slice("solana-clawd://source/".length);
      const abs = safePath(SRC_ROOT, rel);
      if (!abs) throw new Error("Invalid path");
      const text = await readFileText(abs);
      if (!text) throw new Error(`Not found: ${rel}`);
      return { contents: [{ uri, mimeType: "text/plain", text }] };
    }
    if (uri.startsWith("solana-clawd://pinocchio-template/")) {
      const rel = uri.slice("solana-clawd://pinocchio-template/".length);
      const [template, ...pathParts] = rel.split("/");
      if (!template || pathParts.length === 0) throw new Error("Expected solana-clawd://pinocchio-template/{template}/{path}");
      const text = await readTemplateFile(template, pathParts.join("/"));
      return { contents: [{ uri, mimeType: "text/plain", text }] };
    }
    // ── P-Token Launch Pad resources ─────────────────────────────────────
    if (uri === "solana-clawd://ptoken-launchpad") {
      const text = (await readFileText(LAUNCHPAD_DOCS_PATH)) ?? "PTOKEN_LAUNCHPAD.md not found.";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
    }
    if (uri === "solana-clawd://ptoken-launchpad-sdk") {
      const text = (await readFileText(LAUNCHPAD_SDK_PATH)) ?? "p-token-launchpad.ts not found.";
      return { contents: [{ uri, mimeType: "text/typescript", text }] };
    }
    if (uri === "solana-clawd://ptoken-launchpad-program") {
      const text = (await readFileText(path.join(PTOKEN_LAUNCHPAD_ROOT, "src", "lib.rs"))) ?? "lib.rs not found.";
      return { contents: [{ uri, mimeType: "text/plain", text }] };
    }
    if (uri === "solana-clawd://ptoken-launchpad-readme") {
      const text = (await readFileText(path.join(PTOKEN_LAUNCHPAD_ROOT, "README.md"))) ?? "README.md not found.";
      return { contents: [{ uri, mimeType: "text/markdown", text }] };
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

      // ── Pinocchio + p-token developer support ────────────────────────────
      {
        name: "pinocchio_templates",
        description: "List forkable Pinocchio starter templates for p-token, vault, escrow, and launch workflows.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "pinocchio_read_template",
        description: "Read or list files from a Pinocchio starter template. Use without path to list files.",
        inputSchema: { type: "object" as const, properties: {
          template: { type: "string", description: "Template name, e.g. vault, escrow, p-token-launcher" },
          path: { type: "string", description: "Optional file path inside the template" },
        }, required: ["template"] },
      },
      {
        name: "pinocchio_program_map",
        description: "Return the one-by-one Pinocchio upstream program crate map and how each crate is adapted into solana-clawd.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "pinocchio_program",
        description: "Return one mapped Pinocchio helper program by slug or crate name.",
        inputSchema: { type: "object" as const, properties: {
          program: { type: "string", description: "system, token, token-2022, associated-token-account, memo, or crate name" },
        }, required: ["program"] },
      },
      {
        name: "programs_map",
        description: "Return the solana-clawd program workspace map, or one program by slug/path/name.",
        inputSchema: { type: "object" as const, properties: {
          program: { type: "string", description: "Optional program slug, path basename, or display name" },
        } },
      },
      {
        name: "ptoken_registry_list",
        description: "List p-tokens registered in data/ptokens.json.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "ptoken_inspect",
        description: "Inspect an SPL-compatible p-token mint over Solana RPC and classify the owner program.",
        inputSchema: { type: "object" as const, properties: {
          mint: { type: "string", description: "Token mint address" },
          network: { type: "string", description: "solana-mainnet or solana-devnet" },
          tokenProgram: { type: "string", enum: ["auto", "spl", "p-token", "custom"], description: "Explicit classification override" },
          pTokenProgramId: { type: "string", description: "Program id used to classify p-token mints" },
        }, required: ["mint"] },
      },
      {
        name: "ptoken_registry_add",
        description: "Inspect a mint and add or update it in data/ptokens.json for agent/site discovery.",
        inputSchema: { type: "object" as const, properties: {
          mint: { type: "string", description: "Token mint address" },
          symbol: { type: "string", description: "Token symbol" },
          name: { type: "string", description: "Token display name" },
          network: { type: "string", description: "solana-mainnet or solana-devnet" },
          tokenProgram: { type: "string", enum: ["auto", "spl", "p-token", "custom"], description: "Explicit classification override" },
          pTokenProgramId: { type: "string", description: "Program id used to classify p-token mints" },
          tags: { type: "array", items: { type: "string" }, description: "Registry tags" },
        }, required: ["mint"] },
      },
      {
        name: "ptoken_launch_plan",
        description: "Generate an unsigned p-token launch plan with metadata, registry, x402, and constant-product bonding curve settings.",
        inputSchema: { type: "object" as const, properties: {
          symbol: { type: "string", description: "Token symbol, e.g. PFOO" },
          name: { type: "string", description: "Token display name" },
          uri: { type: "string", description: "Metadata URI" },
          decimals: { type: "number", description: "Mint decimals, default 9" },
          supply: { type: "number", description: "Human token supply, default 1B" },
          network: { type: "string", description: "solana-devnet or solana-mainnet" },
          pTokenProgramId: { type: "string", description: "p-token program id" },
          virtualSol: { type: "number", description: "Virtual SOL reserve for curve" },
          virtualToken: { type: "number", description: "Virtual token reserve for curve" },
          realSol: { type: "number", description: "Initial real SOL reserve" },
          realToken: { type: "number", description: "Initial real token reserve" },
          feeBps: { type: "number", description: "Trade fee in basis points" },
          graduationSol: { type: "number", description: "Real SOL reserve target for graduation" },
        } },
      },
      {
        name: "ptoken_bonding_curve_quote",
        description: "Simulate a constant-product p-token launch curve buy or sell quote. Planning only, no signing.",
        inputSchema: { type: "object" as const, properties: {
          side: { type: "string", enum: ["buy", "sell"], description: "Quote side" },
          virtualSol: { type: "number", description: "Virtual SOL reserve" },
          virtualToken: { type: "number", description: "Virtual token reserve" },
          sol: { type: "number", description: "SOL input for buy quotes" },
          tokens: { type: "number", description: "Token input for sell quotes" },
          feeBps: { type: "number", description: "Trade fee in basis points" },
        } },
      },

      // ── P-Token Launch Pad (SIMD-0266 / Pinocchio bonding curves) ──────
      {
        name: "ptoken_launch_pad_create",
        description: "Create an agent token with bonding curve via the p-token launch pad. Wraps createAgentToken from the SDK. Planning/simulation only — does not send transactions.",
        inputSchema: { type: "object" as const, properties: {
          name: { type: "string", description: "Token name" },
          symbol: { type: "string", description: "Token symbol" },
          uri: { type: "string", description: "Metadata URI" },
          agentUri: { type: "string", description: "Agent metadata URI" },
          decimals: { type: "number", description: "Mint decimals (default 9)" },
          usePToken: { type: "boolean", description: "Use p-token program instead of SPL (default true)" },
          computeUnitLimit: { type: "number", description: "Compute unit budget override" },
          priorityFeeMicroLamports: { type: "number", description: "Priority fee in microLamports" },
        }, required: ["name", "symbol", "uri", "agentUri"] },
      },
      {
        name: "ptoken_launch_pad_buy",
        description: "Simulate buying from a p-token launch pad bonding curve. Returns post-fee token output. No funds moved.",
        inputSchema: { type: "object" as const, properties: {
          mint: { type: "string", description: "Token mint address" },
          amountInLamports: { type: "number", description: "SOL input in lamports" },
          maxSolCost: { type: "number", description: "Maximum SOL cost for slippage protection" },
          computeUnitLimit: { type: "number" },
          priorityFeeMicroLamports: { type: "number" },
        }, required: ["mint", "amountInLamports"] },
      },
      {
        name: "ptoken_launch_pad_sell",
        description: "Simulate selling from a p-token launch pad bonding curve. Returns post-fee SOL output. No funds moved.",
        inputSchema: { type: "object" as const, properties: {
          mint: { type: "string", description: "Token mint address" },
          tokenAmount: { type: "number", description: "Token amount in whole tokens" },
          minSolOut: { type: "number", description: "Minimum SOL out for slippage protection" },
          computeUnitLimit: { type: "number" },
          priorityFeeMicroLamports: { type: "number" },
        }, required: ["mint", "tokenAmount"] },
      },
      {
        name: "ptoken_launch_pad_register_agent",
        description: "Simulate registering an agent identity via the p-token launch pad agent registry PDA. No funds moved.",
        inputSchema: { type: "object" as const, properties: {
          uri: { type: "string", description: "Agent metadata URI" },
          computeUnitLimit: { type: "number" },
        }, required: ["uri"] },
      },
      {
        name: "ptoken_launch_pad_register_executive",
        description: "Simulate registering an executive delegate for an agent. No funds moved.",
        inputSchema: { type: "object" as const, properties: {
          agent: { type: "string", description: "Agent PDA or public key" },
          delegate: { type: "string", description: "Delegate wallet address" },
          computeUnitLimit: { type: "number" },
        }, required: ["agent", "delegate"] },
      },
      {
        name: "ptoken_launch_pad_delegate_execution",
        description: "Simulate delegating execution authority with an expiry slot. No funds moved.",
        inputSchema: { type: "object" as const, properties: {
          agent: { type: "string", description: "Agent PDA or public key" },
          delegate: { type: "string", description: "Delegate wallet address" },
          expiresAtSlot: { type: "number", description: "Expiry slot number" },
          computeUnitLimit: { type: "number" },
        }, required: ["agent", "delegate", "expiresAtSlot"] },
      },
      {
        name: "ptoken_launch_pad_price_quote",
        description: "Calculate buy or sell price from a constant-product bonding curve. Uses the p-token launch pad formula (virtual reserves based).",
        inputSchema: { type: "object" as const, properties: {
          virtualTokenReserves: { type: "number", description: "Virtual token reserve" },
          virtualSolReserves: { type: "number", description: "Virtual SOL reserve" },
          tokenAmount: { type: "number", description: "Token amount for the quote" },
          side: { type: "string", enum: ["buy", "sell"], description: "Quote direction" },
        }, required: ["virtualTokenReserves", "virtualSolReserves", "tokenAmount", "side"] },
      },
      {
        name: "ptoken_launch_pad_market_cap",
        description: "Calculate market cap for a p-token launch pad token given curve state.",
        inputSchema: { type: "object" as const, properties: {
          initialVirtualSol: { type: "number", description: "Initial virtual SOL reserve" },
          solRaised: { type: "number", description: "SOL raised so far" },
          tokenSupply: { type: "number", description: "Total token supply" },
          tokensSold: { type: "number", description: "Tokens sold so far" },
        }, required: ["initialVirtualSol", "solRaised", "tokenSupply", "tokensSold"] },
      },
      {
        name: "ptoken_launch_pad_graduation_threshold",
        description: "Return the graduation threshold for the p-token launch pad bonding curve in lamports and SOL.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "ptoken_launch_pad_cu_savings",
        description: "Return the estimated compute unit savings report for p-token vs SPL token operations.",
        inputSchema: { type: "object" as const, properties: {} },
      },

      // ── Chess.com (autonomous agent chess) ──────────────────────────────
      {
        name: "chess_player",
        description: "Get a Chess.com player profile and full rating analysis — ratings across all time controls, win rate, best rating, total games played.",
        inputSchema: { type: "object" as const, properties: { username: { type: "string", description: "Chess.com username" } }, required: ["username"] },
      },
      {
        name: "chess_recent_games",
        description: "Get a player's recent games with results, ratings, accuracy, and openings. Returns the last N games from the most recent archive.",
        inputSchema: { type: "object" as const, properties: { username: { type: "string", description: "Chess.com username" }, limit: { type: "number", description: "Number of games (default 10, max 50)" } }, required: ["username"] },
      },
      {
        name: "chess_current_games",
        description: "Get a player's ongoing daily chess games. Shows games where it's their turn to move — useful for autonomous play monitoring.",
        inputSchema: { type: "object" as const, properties: { username: { type: "string", description: "Chess.com username" } }, required: ["username"] },
      },
      {
        name: "chess_daily_puzzle",
        description: "Get today's Chess.com daily puzzle with FEN, PGN, and solution. Great for agent puzzle-solving practice.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "chess_random_puzzle",
        description: "Get a random Chess.com puzzle for practice. Returns FEN position and PGN solution for the agent to analyze.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "chess_leaderboards",
        description: "Get Chess.com leaderboards across all time controls (daily, rapid, blitz, bullet, bughouse, etc). Shows top players globally.",
        inputSchema: { type: "object" as const, properties: { category: { type: "string", description: "Leaderboard category: daily, live_rapid, live_blitz, live_bullet, live_bughouse, tactics (default: live_blitz)" } } },
      },
      {
        name: "chess_titled_players",
        description: "Get all Chess.com players with a specific title (GM, IM, FM, etc). Useful for finding opponents or studying titled player games.",
        inputSchema: { type: "object" as const, properties: { title: { type: "string", description: "Chess title: GM, WGM, IM, WIM, FM, WFM, NM, WNM, CM, WCM" } }, required: ["title"] },
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
            const result = await heliusRPC("getBalance", [wallet, { commitment: "confirmed" }]) as { value: number };
            const lamports = result.value;
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
            const logPath = path.join(
              os.homedir(), ".config", "solana-claude", "x402-payments.jsonl"
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
            const sessDir = path.join(
              os.homedir(), ".config", "solana-claude", "sessions"
            );
            let sessions: Array<Record<string, unknown>> = [];
            try {
              const files = await fs.readdir(sessDir);
              sessions = (await Promise.all(
                files.filter(f => f.endsWith(".json")).slice(-10).map(async f => {
                  try {
                    const raw = await fs.readFile(path.join(sessDir, f), "utf-8");
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

          // ── Pinocchio + p-token developer support ────────────────────────

          case "pinocchio_templates": {
            const templates = await listPinocchioTemplates();
            return text({
              templates,
              scaffold: "npm run pinocchio:scaffold -- --template <template> --name <name> --out ./programs/<name>",
              docs: ["pinocchio/README.md", "pinocchio/docs/P_TOKEN_LAUNCHES.md", "pinocchio/P_TOKEN.md", "pinocchio/PROGRAMS.md"],
            });
          }

          case "pinocchio_read_template": {
            const template = String(a.template ?? "");
            if (!template) return text("template is required");
            if (!a.path) {
              return text({ template, files: await listTemplateFiles(template) });
            }
            return text(await readTemplateFile(template, String(a.path)));
          }

          case "pinocchio_program_map": {
            const map = (await readFileText(path.join(PINOCCHIO_ROOT, "PROGRAM_MAP.md"))) ??
              (await readFileText(path.join(PINOCCHIO_ROOT, "pinocchio-main", "programs", "README.md")));
            const json = await readFileText(path.join(REPO_ROOT, "data", "pinocchio-programs.json"));
            return text({
              markdown: map ?? "Pinocchio program map not found.",
              json: json ? JSON.parse(json) : { version: 1, programs: [] },
            });
          }

          case "pinocchio_program": {
            const program = String(a.program ?? "");
            if (!program) return text("program is required");
            const raw = await readFileText(path.join(REPO_ROOT, "data", "pinocchio-programs.json"));
            const map = raw ? JSON.parse(raw) : { version: 1, programs: [] };
            const match = map.programs.find((item: Record<string, unknown>) => item.slug === program || item.crate === program);
            if (!match) return text({ error: `Unknown Pinocchio program: ${program}`, available: map.programs.map((item: Record<string, unknown>) => item.slug) });
            return text(match);
          }

          case "programs_map": {
            const program = String(a.program ?? "");
            const raw = await readFileText(path.join(REPO_ROOT, "data", "programs-map.json"));
            const map = raw ? JSON.parse(raw) : { version: 1, programs: [] };
            if (!program) return text(map);
            const needle = program.toLowerCase();
            const match = map.programs.find((item: Record<string, unknown>) => {
              const slug = String(item.slug ?? "").toLowerCase();
              const name = String(item.name ?? "").toLowerCase();
              const dir = String(item.path ?? "").split("/").filter(Boolean).pop()?.toLowerCase();
              return slug === needle || name === needle || dir === needle;
            });
            if (!match) return text({ error: `Unknown program: ${program}`, available: map.programs.map((item: Record<string, unknown>) => item.slug) });
            return text(match);
          }

          case "ptoken_registry_list": {
            const registry = await readPTokenRegistry();
            return text({ ...registry, count: registry.tokens.length });
          }

          case "ptoken_inspect": {
            const mint = String(a.mint ?? "");
            if (!mint) return text("mint is required");
            return text(await inspectPTokenMint(mint, {
              network: a.network ? String(a.network) : undefined,
              tokenProgram: a.tokenProgram ? String(a.tokenProgram) : undefined,
              pTokenProgramId: a.pTokenProgramId ? String(a.pTokenProgramId) : undefined,
            }));
          }

          case "ptoken_registry_add": {
            const mint = String(a.mint ?? "");
            if (!mint) return text("mint is required");
            const registry = await readPTokenRegistry();
            const inspected = await inspectPTokenMint(mint, {
              network: a.network ? String(a.network) : undefined,
              tokenProgram: a.tokenProgram ? String(a.tokenProgram) : undefined,
              pTokenProgramId: a.pTokenProgramId ? String(a.pTokenProgramId) : undefined,
            });
            const now = new Date().toISOString();
            const entry = {
              ...inspected,
              mint,
              symbol: a.symbol ? String(a.symbol) : inspected.tokenProgram === "p-token" ? `P-${mint.slice(0, 4).toUpperCase()}` : mint.slice(0, 6).toUpperCase(),
              name: a.name ? String(a.name) : "Registered p-token",
              tags: Array.isArray(a.tags) ? a.tags.map(String) : ["pinocchio", "p-token"],
              addedAt: now,
              updatedAt: now,
            };
            const idx = registry.tokens.findIndex(token => token.mint === mint);
            if (idx >= 0) {
              registry.tokens[idx] = { ...registry.tokens[idx], ...entry, addedAt: registry.tokens[idx].addedAt ?? now };
            } else {
              registry.tokens.push(entry as PTokenRegistry["tokens"][number]);
            }
            registry.tokens.sort((left, right) => String(left.symbol ?? left.mint).localeCompare(String(right.symbol ?? right.mint)));
            await writePTokenRegistry(registry);
            return text({ message: "p-token registered", entry, count: registry.tokens.length });
          }

          case "ptoken_launch_plan": {
            return text(pTokenLaunchPlan(a));
          }

          case "ptoken_bonding_curve_quote": {
            return text(pTokenBondingCurveQuote(a));
          }

          // ── P-Token Launch Pad (SIMD-0266 / Pinocchio bonding curves) ─

          case "ptoken_launch_pad_create": {
            return text({
              tool: "ptoken_launch_pad_create",
              simulation: true,
              programId: LAUNCHPAD_PROGRAM_ID,
              sdkSource: "x402/p-token-launchpad.ts",
              parameters: {
                name: String(a.name ?? ""),
                symbol: String(a.symbol ?? ""),
                uri: String(a.uri ?? ""),
                agentUri: String(a.agentUri ?? ""),
                decimals: Number(a.decimals ?? 9),
                usePToken: a.usePToken !== false,
              },
              warning: "Simulation only. To deploy: import { createAgentToken } from 'x402/p-token-launchpad.ts', supply a wallet adapter and connection.",
              instruction: "Run the createAgentToken function from the SDK with a connected wallet. The function creates the mint, bonding curve, and agent identity in one transaction.",
              docs: [
                "solana-clawd://ptoken-launchpad (full docs)",
                "solana-clawd://ptoken-launchpad-sdk (SDK source)",
              ],
            });
          }

          case "ptoken_launch_pad_buy": {
            const mint = String(a.mint ?? "");
            const amountInLamports = Number(a.amountInLamports ?? 0);
            if (!mint) return text("mint is required");
            if (amountInLamports <= 0) return text("amountInLamports must be > 0");
            return text({
              tool: "ptoken_launch_pad_buy",
              simulation: true,
              programId: LAUNCHPAD_PROGRAM_ID,
              mint,
              amountInLamports,
              maxSolCost: a.maxSolCost ? Number(a.maxSolCost) : undefined,
              warning: "Simulation only. To execute: import { buy } from 'x402/p-token-launchpad.ts' and supply a wallet adapter + connection.",
              docs: [
                "solana-clawd://ptoken-launchpad",
                "solana-clawd://ptoken-launchpad-sdk",
              ],
            });
          }

          case "ptoken_launch_pad_sell": {
            const mint = String(a.mint ?? "");
            const tokenAmount = Number(a.tokenAmount ?? 0);
            if (!mint) return text("mint is required");
            if (tokenAmount <= 0) return text("tokenAmount must be > 0");
            return text({
              tool: "ptoken_launch_pad_sell",
              simulation: true,
              programId: LAUNCHPAD_PROGRAM_ID,
              mint,
              tokenAmount,
              minSolOut: a.minSolOut ? Number(a.minSolOut) : undefined,
              warning: "Simulation only. To execute: import { sell } from 'x402/p-token-launchpad.ts' and supply a wallet adapter + connection.",
              docs: [
                "solana-clawd://ptoken-launchpad",
                "solana-clawd://ptoken-launchpad-sdk",
              ],
            });
          }

          case "ptoken_launch_pad_register_agent": {
            const uri = String(a.uri ?? "");
            if (!uri) return text("uri is required");
            return text({
              tool: "ptoken_launch_pad_register_agent",
              simulation: true,
              programId: LAUNCHPAD_PROGRAM_ID,
              uri,
              warning: "Simulation only. To execute: import { registerAgent } from 'x402/p-token-launchpad.ts' and supply a wallet adapter + connection.",
              docs: [
                "solana-clawd://ptoken-launchpad",
                "solana-clawd://ptoken-launchpad-sdk",
              ],
            });
          }

          case "ptoken_launch_pad_register_executive": {
            const agent = String(a.agent ?? "");
            const delegate = String(a.delegate ?? "");
            if (!agent) return text("agent is required");
            if (!delegate) return text("delegate is required");
            return text({
              tool: "ptoken_launch_pad_register_executive",
              simulation: true,
              programId: LAUNCHPAD_PROGRAM_ID,
              agent,
              delegate,
              warning: "Simulation only. To execute: import { registerExecutive } from 'x402/p-token-launchpad.ts' and supply a wallet adapter + connection.",
              docs: [
                "solana-clawd://ptoken-launchpad",
                "solana-clawd://ptoken-launchpad-sdk",
              ],
            });
          }

          case "ptoken_launch_pad_delegate_execution": {
            const delAgent = String(a.agent ?? "");
            const delDelegate = String(a.delegate ?? "");
            const expiresAtSlot = Number(a.expiresAtSlot ?? 0);
            if (!delAgent) return text("agent is required");
            if (!delDelegate) return text("delegate is required");
            if (expiresAtSlot <= 0) return text("expiresAtSlot must be > 0");
            return text({
              tool: "ptoken_launch_pad_delegate_execution",
              simulation: true,
              programId: LAUNCHPAD_PROGRAM_ID,
              agent: delAgent,
              delegate: delDelegate,
              expiresAtSlot,
              warning: "Simulation only. To execute: import { delegateExecution } from 'x402/p-token-launchpad.ts' and supply a wallet adapter + connection.",
              docs: [
                "solana-clawd://ptoken-launchpad",
                "solana-clawd://ptoken-launchpad-sdk",
              ],
            });
          }

          case "ptoken_launch_pad_price_quote": {
            const vToken = Number(a.virtualTokenReserves ?? 0);
            const vSol = Number(a.virtualSolReserves ?? 0);
            const tAmt = Number(a.tokenAmount ?? 0);
            const side = String(a.side ?? "buy");
            if (vToken <= 0 || vSol <= 0) return text("virtualTokenReserves and virtualSolReserves must be > 0");
            if (tAmt <= 0) return text("tokenAmount must be > 0");
            const k = vSol * vToken;
            let result: Record<string, unknown>;
            if (side === "sell") {
              const vTokenAfter = vToken + tAmt;
              const vSolAfter = k / vTokenAfter;
              const grossSolOut = Math.max(0, vSol - vSolAfter);
              result = {
                side: "sell",
                tokensIn: tAmt,
                grossSolOut,
                estimatedNetSolOut: grossSolOut * 0.99, // 1% fee approx
                spotPriceBefore: vSol / vToken,
                spotPriceAfter: vSolAfter / vTokenAfter,
                virtualSolAfter: vSolAfter,
                virtualTokenAfter: vTokenAfter,
              };
            } else {
              const vSolAfter = vSol + tAmt; // using tokenAmount as solIn for simplicity
              const vTokenAfter = k / vSolAfter;
              result = {
                side: "buy",
                solIn: tAmt,
                tokensOut: Math.max(0, vToken - vTokenAfter),
                fee: tAmt * 0.01,
                spotPriceBefore: vSol / vToken,
                spotPriceAfter: vSolAfter / vTokenAfter,
                virtualSolAfter: vSolAfter,
                virtualTokenAfter: vTokenAfter,
              };
            }
            return text({
              tool: "ptoken_launch_pad_price_quote",
              formula: "constant-product: k = virtualSolReserves * virtualTokenReserves",
              programId: LAUNCHPAD_PROGRAM_ID,
              ...result,
            });
          }

          case "ptoken_launch_pad_market_cap": {
            const initialVirtualSol = Number(a.initialVirtualSol ?? 0);
            const solRaised = Number(a.solRaised ?? 0);
            const tokenSupply = Number(a.tokenSupply ?? 0);
            const tokensSold = Number(a.tokensSold ?? 0);
            if (tokenSupply <= 0 || tokensSold <= 0) return text("tokenSupply and tokensSold must be > 0");
            const currentVirtualSol = initialVirtualSol + solRaised;
            const currentVirtualToken = tokenSupply - tokensSold;
            const spotPrice = currentVirtualSol / currentVirtualToken;
            const mcap = spotPrice * tokenSupply;
            return text({
              tool: "ptoken_launch_pad_market_cap",
              formula: "marketCap = (virtualSolReserves / virtualTokenReserves) * totalSupply",
              initialVirtualSol,
              solRaised,
              tokenSupply,
              tokensSold,
              currentVirtualSol,
              currentVirtualToken,
              spotPrice,
              marketCapSOL: mcap,
              graduation: {
                thresholdSOL: 24.5,
                progressPct: Math.min(100, (solRaised / 24.5) * 100),
                remainingSOL: Math.max(0, 24.5 - solRaised),
              },
            });
          }

          case "ptoken_launch_pad_graduation_threshold": {
            return text({
              tool: "ptoken_launch_pad_graduation_threshold",
              programId: LAUNCHPAD_PROGRAM_ID,
              graduationThresholdLamports: 24.5 * 1e9,
              graduationThresholdSOL: 24.5,
              description: "Graduation triggers when real SOL reserve reaches ~24.5 SOL. At that point SOL is seeded to a DEX AMM pool (e.g. Meteora DLMM) and bonding curve is closed.",
            });
          }

          case "ptoken_launch_pad_cu_savings": {
            return text({
              tool: "ptoken_launch_pad_cu_savings",
              report: {
                summary: "p-token (SIMD-0266/Pinocchio) uses 98% fewer CUs than SPL Token for common operations",
                benchmarks: {
                  MintTo: { spl: 4128, pToken: 2012, savings: "51%" },
                  Burn: { spl: 4753, pToken: 1884, savings: "60%" },
                  Transfer: { spl: 4645, pToken: 76, savings: "98%" },
                },
                batchFeeDistribution: "p-token opcode 25 enables multi-recipient fee distribution in a single CPI — saves multiple Transfer CPIs",
              },
              docs: "solana-clawd://ptoken-launchpad",
            });
          }

          // ── Chess.com ─────────────────────────────────────────────────

          case "chess_player": {
            const username = String(a.username ?? "").trim();
            if (!username) return text("Error: username is required");
            const CHESS_API = "https://api.chess.com/pub";
            const [playerRes, statsRes] = await Promise.all([
              fetch(`${CHESS_API}/player/${username}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) }),
              fetch(`${CHESS_API}/player/${username}/stats`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) }),
            ]);
            if (!playerRes.ok) throw new Error(`Player "${username}" not found (${playerRes.status})`);
            const player = await playerRes.json() as Record<string, unknown>;
            const stats = statsRes.ok ? await statsRes.json() as Record<string, unknown> : {};
            const ratings: Record<string, number> = {};
            let totalW = 0;
            let totalL = 0;
            let totalD = 0;
            let best: { cat: string; r: number } | null = null;
            for (const key of ["chess_daily", "chess_rapid", "chess_bullet", "chess_blitz"]) {
              const cat = stats[key] as { last?: { rating: number }; record?: { win: number; loss: number; draw: number } } | undefined;
              if (!cat?.last) continue;
              const label = key.replace("chess_", "");
              ratings[label] = cat.last.rating;
              if (!best || cat.last.rating > best.r) best = { cat: label, r: cat.last.rating };
              if (cat.record) { totalW += cat.record.win; totalL += cat.record.loss; totalD += cat.record.draw; }
            }
            const total = totalW + totalL + totalD;
            return text({
              username: player.username, title: player.title, status: player.status,
              ratings, bestRating: best, totalGames: total,
              winRate: total > 0 ? `${((totalW / total) * 100).toFixed(1)}%` : "N/A",
              lastOnline: player.last_online ? new Date((player.last_online as number) * 1000).toISOString() : "unknown",
              avatar: player.avatar, country: player.country, followers: player.followers,
            });
          }

          case "chess_recent_games": {
            const username = String(a.username ?? "").trim();
            if (!username) return text("Error: username is required");
            const limit = Math.min(Number(a.limit) || 10, 50);
            const CHESS_API = "https://api.chess.com/pub";
            const archRes = await fetch(`${CHESS_API}/player/${username}/games/archives`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
            if (!archRes.ok) throw new Error(`Archives for "${username}" → ${archRes.status}`);
            const archives = (await archRes.json() as { archives: string[] }).archives;
            if (!archives.length) return text({ username, games: [], message: "No game archives found" });
            const latestUrl = archives[archives.length - 1];
            const gamesRes = await fetch(latestUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
            if (!gamesRes.ok) throw new Error(`Games fetch → ${gamesRes.status}`);
            const allGames = ((await gamesRes.json()) as { games: Array<Record<string, unknown>> }).games;
            const sorted = allGames.sort((x, y) => (y.end_time as number) - (x.end_time as number)).slice(0, limit);
            const uLow = username.toLowerCase();
            let w = 0;
            let l = 0;
            let d = 0;
            const accs: number[] = [];
            const games = sorted.map((g) => {
              const wh = g.white as Record<string, unknown>;
              const bl = g.black as Record<string, unknown>;
              const isWhite = (wh.username as string).toLowerCase() === uLow;
              const me = isWhite ? wh : bl;
              const opp = isWhite ? bl : wh;
              const color = isWhite ? "white" : "black";
              if (me.result === "win") w++;
              else if (["checkmated", "resigned", "timeout", "abandoned", "lose"].includes(me.result as string)) l++;
              else d++;
              const acc = (g.accuracies as Record<string, number> | undefined)?.[color];
              if (acc) accs.push(acc);
              return { opponent: opp.username, result: me.result, color, rating: me.rating, oppRating: opp.rating, timeClass: g.time_class, accuracy: acc ?? null, eco: g.eco ?? null, url: g.url };
            });
            return text({ username, games, stats: { wins: w, losses: l, draws: d, avgAccuracy: accs.length ? (accs.reduce((a2, b) => a2 + b, 0) / accs.length).toFixed(1) : null } });
          }

          case "chess_current_games": {
            const username = String(a.username ?? "").trim();
            if (!username) return text("Error: username is required");
            const CHESS_API = "https://api.chess.com/pub";
            const [gamesRes, moveRes] = await Promise.all([
              fetch(`${CHESS_API}/player/${username}/games`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) }),
              fetch(`${CHESS_API}/player/${username}/games/to-move`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) }),
            ]);
            const current = gamesRes.ok ? (await gamesRes.json() as { games: unknown[] }).games : [];
            const toMove = moveRes.ok ? (await moveRes.json() as { games: unknown[] }).games : [];
            return text({ username, totalOngoing: current.length, gamesToMove: toMove.length, currentGames: current.slice(0, 10), toMoveGames: toMove });
          }

          case "chess_daily_puzzle": {
            const res = await fetch("https://api.chess.com/pub/puzzle", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
            if (!res.ok) throw new Error(`Daily puzzle → ${res.status}`);
            return text(await res.json());
          }

          case "chess_random_puzzle": {
            const res = await fetch("https://api.chess.com/pub/puzzle/random", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
            if (!res.ok) throw new Error(`Random puzzle → ${res.status}`);
            return text(await res.json());
          }

          case "chess_leaderboards": {
            const category = String(a.category ?? "live_blitz").trim();
            const res = await fetch("https://api.chess.com/pub/leaderboards", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
            if (!res.ok) throw new Error(`Leaderboards → ${res.status}`);
            const data = await res.json() as Record<string, unknown[]>;
            const board = data[category];
            if (!board) return text({ error: `Unknown category: ${category}`, available: Object.keys(data) });
            return text({ category, players: board.slice(0, 20) });
          }

          case "chess_titled_players": {
            const title = String(a.title ?? "GM").trim().toUpperCase();
            const valid = ["GM", "WGM", "IM", "WIM", "FM", "WFM", "NM", "WNM", "CM", "WCM"];
            if (!valid.includes(title)) return text({ error: `Invalid title. Must be one of: ${valid.join(", ")}` });
            const res = await fetch(`https://api.chess.com/pub/titled/${title}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
            if (!res.ok) throw new Error(`Titled players → ${res.status}`);
            const data = await res.json() as { players: string[] };
            return text({ title, count: data.players.length, players: data.players.slice(0, 50) });
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
      { name: "pinocchio_builder", description: "Plan a Pinocchio p-token, vault, or escrow build", arguments: [{ name: "template", description: "vault, escrow, or p-token-launcher", required: false }] },
      { name: "ptoken_launch", description: "Plan a p-token launch with bonding curve, explorer registration, and x402 routing", arguments: [{ name: "symbol", description: "Token symbol", required: false }] },
      { name: "ptoken_launch_pad_plan", description: "Plan a full p-token launch pad deployment — agent token, bonding curve, registry, graduation path", arguments: [{ name: "symbol", description: "Token symbol", required: false }] },
      { name: "ptoken_launch_pad_ooda", description: "Full OODA cycle for p-token launch pad opportunities — scan, evaluate, decide, act", arguments: [{ name: "mint", description: "Specific token mint to evaluate (optional)", required: false }] },
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

        case "pinocchio_builder": {
          const template = args?.template ?? "vault";
          return msg(`Plan a Pinocchio build using template: ${template}\n\n1. Read solana-clawd://pinocchio, solana-clawd://pinocchio-guide, and solana-clawd://ptoken-launches.\n2. Run pinocchio_templates and pinocchio_read_template template=${template}.\n3. Identify required account checks, signer checks, PDA seeds, CPI calls, and close/refund paths.\n4. If this is a p-token launch, run ptoken_launch_plan, ptoken_bonding_curve_quote, ptoken_registry_list, and inspect any mint with ptoken_inspect before suggesting registry changes.\n5. Output:\n- Scope\n- Template files to start from\n- Security checks needed before deployment\n- Test plan\n- Exact scaffold command\n\nDo not claim the scaffold is audited or production-ready.`);
        }

        case "ptoken_launch": {
          const symbol = args?.symbol ?? "PFOO";
          return msg(`Plan a p-token launch for symbol ${symbol}.\n\n1. Read solana-clawd://pinocchio and solana-clawd://ptoken-launches.\n2. Run ptoken_launch_plan symbol=${symbol}.\n3. Run ptoken_bonding_curve_quote side=buy sol=1 using the returned virtual reserves.\n4. Read pinocchio_read_template template=p-token-launcher.\n5. Output:\n- unsigned launch config\n- bonding curve assumptions\n- authority and PDA checks to implement\n- mint inspection and registry steps\n- x402 env needed after verification\n\nDo not request private keys. Do not claim that the launch is deployed or audited.`);
        }

        case "ptoken_launch_pad_plan": {
          const symbol = args?.symbol ?? "PFOO";
          return msg(`Plan a p-token launch pad deployment for symbol ${symbol}.\n\n1. Read solana-clawd://ptoken-launchpad (full docs), solana-clawd://ptoken-launchpad-sdk (SDK source), and solana-clawd://ptoken-launchpad-program (Anchor program).\n2. Run ptoken_launch_plan symbol=${symbol} for the unsigned launch config.\n3. Run ptoken_launch_pad_price_quote virtualTokenReserves=1073000000 virtualSolReserves=30 tokenAmount=1000000 side=buy to simulate a test buy.\n4. Run ptoken_launch_pad_market_cap initialVirtualSol=30 solRaised=5 tokenSupply=1000000000 tokensSold=500000000 to estimate market cap.\n5. Run ptoken_launch_pad_graduation_threshold to verify graduation conditions.\n6. Run ptoken_launch_pad_cu_savings to see the p-token cost advantage.\n7. Output:\n- unsigned launch config with bonding curve parameters\n- SDK function mapping (createAgentToken → buy → sell → graduate)\n- agent registry plan (register_agent, register_executive, delegate_execution if needed)\n- graduation path (SOL threshold, AMM seed, curve close)\n- compute unit savings with p-token\n- test plan (devnet dry-run first)\n\nDo not request private keys. Do not claim the launch is deployed or audited.`);
        }

        case "ptoken_launch_pad_ooda": {
          const mint = args?.mint;
          if (mint) {
            return msg(`OODA cycle for p-token launch pad token: \`${mint}\`\n\n**OBSERVE**\n- solana_price token=${mint} — current price\n- solana_token_info mint=${mint} — metadata and security\n- ptoken_inspect mint=${mint} — on-chain classification\n- sol_price — market context\n\n**ORIENT**\n- ptoken_launch_pad_price_quote virtualTokenReserves=1073000000 virtualSolReserves=30 tokenAmount=100000 side=buy\n- ptoken_launch_pad_market_cap initialVirtualSol=30 solRaised=0 tokenSupply=1000000000 tokensSold=0\n- ptoken_launch_pad_graduation_threshold\n- memory_recall query=${mint.slice(0, 8)}\n\n**DECIDE**\n- Is this token using the launch pad? (owner program check)\n- Bonding curve stage: early/mid/late\n- Risk factors: mint authority, freeze authority, top holder concentration\n- Signal: STRONG / MODERATE / WEAK / AVOID\n\n**ACT**\n- memory_write your INFERRED signal with score and reasoning\n- If STRONG: propose entry size, stop loss, graduation exit plan\n- If AVOID: document why for future reference`);
          }
          return msg(`Full OODA cycle for p-token launch pad market.\n\n**OBSERVE**\n- solana_trending limit=20 — what's moving\n- ptoken_registry_list — registered p-token mints\n- sol_price — market context\n- Read solana-clawd://ptoken-launchpad for full documentation\n\n**ORIENT**\n- For any interesting mints from the registry: ptoken_inspect, solana_token_info\n- ptoken_launch_pad_price_quote with default parameters to understand bonding curve\n- ptoken_launch_pad_market_cap with estimated parameters\n- ptoken_launch_pad_cu_savings\n- memory_recall query="launchpad" tier="LEARNED" — any patterns?\n\n**DECIDE**\n1. Best launch pad opportunity (risk/reward, bonding curve stage, mint authority)\n2. Best agent token to watch (registered agents, executive delegates)\n3. Avoid list (high risk, unverified, centralized authority)\n\n**ACT**\n- memory_write top INFERRED signals with scoring rationale\n- Report top 3 findings with entry/exit thesis`);
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
