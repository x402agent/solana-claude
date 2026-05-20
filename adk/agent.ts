import "dotenv/config";

import { FunctionTool, LlmAgent } from "@google/adk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod/v4";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const agentsDir = path.join(repoRoot, "agents");
const agentsSrcDir = path.join(agentsDir, "src");

const CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const SYMBOL_MAP: Record<string, string> = {
  CLAWD: CLAWD_MINT,
  SOL: SOL_MINT,
  USDC: USDC_MINT,
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8")) as T;
}

function adkParameters<T>(schema: T) {
  return schema as any;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readAgentSourceFiles() {
  if (!fs.existsSync(agentsSrcDir)) return [];
  return fs
    .readdirSync(agentsSrcDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => readJsonFile<any>(path.join(agentsSrcDir, file)));
}

function catalogEntries(catalog: any) {
  const byId = new Map<string, any>();
  for (const section of ["oneShots", "featured", "agents"] as const) {
    for (const agent of Array.isArray(catalog?.[section]) ? catalog[section] : []) {
      const id = String(agent.identifier ?? agent.id ?? "");
      if (id && !byId.has(id)) byId.set(id, { ...agent, catalogSection: section });
    }
  }
  return [...byId.values()];
}

function sourceId(agent: any): string {
  return String(agent.identifier ?? agent.id ?? "");
}

function adkDestinations() {
  const base = process.env.CLAWD_PRIVATE_BASE_URL ?? "https://x402.wtf";
  return [
    ["agent_orchestrator", "Agent Orchestrator API", `${base}/api/orchestrator`],
    ["agents_catalog", "Agents Catalog API", `${base}/api/agents`],
    ["clawd_chat", "Clawd Chat API", `${base}/api/clawd`],
    ["imperial_router", "Imperial Router API", `${base}/api/imperial`],
    ["perps_trading_v1", "Perps Trading API v1", `${base}/api/perps/v1`],
    ["phoenix_markets", "Phoenix Markets API", `${base}/api/phoenix/markets`],
    ["router_v1_chat_completions", "Router v1 Chat Completions (OpenAI-compat)", `${base}/api/router/v1/chat/completions`],
    ["x402_agent_chat", "x402 Agent Chat API", `${base}/api/x402/agent/chat`],
    ["x402wtf_registry", "x402wtf", `${base}/agents/registry`],
  ].map(([id, name, url]) => ({ id, name, location: "global", url }));
}

function resolveKnownMint(tokenOrMint: string) {
  const value = String(tokenOrMint || "").trim();
  return SYMBOL_MAP[value.toUpperCase()] ?? value;
}

async function jupiterJson(pathname: string) {
  const url = `https://api.jup.ag${pathname}`;
  const res = await fetch(url, {
    headers: {
      ...(process.env.JUPITER_API_KEY ? { "x-api-key": process.env.JUPITER_API_KEY } : {}),
      Accept: "application/json",
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    return { status: "error", upstream: "jupiter", code: res.status, data };
  }
  return { status: "success", data };
}

const getAgentCatalogStats = new FunctionTool({
  name: "get_agent_catalog_stats",
  description:
    "Get OpenClawd agent catalog and Metaplex registry stats, including trading-capable and mint-capable agent counts.",
  parameters: adkParameters(z.object({})),
  execute: () => {
    const catalog = readJson<any>("agents/agents-catalog.json");
    const manifest = readJson<any>("agents/agents-manifest.json");
    const sources = readAgentSourceFiles();
    const entries = catalogEntries(catalog);
    const catalogIds = new Set(entries.map((agent: any) => String(agent.identifier ?? agent.id ?? "")));
    const installedIds = new Set(sources.map(sourceId).filter(Boolean));
    const missingFromCatalog = [...installedIds].filter((id) => !catalogIds.has(id));
    const missingSourceFiles = [...catalogIds].filter((id) => !installedIds.has(id));
    return {
      status: "success",
      catalog: catalog.stats,
      installedRegistry: {
        installedSourceFiles: installedIds.size,
        catalogEntries: catalogIds.size,
        manifestGroups: Object.keys(manifest.agents ?? {}).length,
        generatedAt: catalog.generatedAt,
        missingFromCatalog,
        missingSourceFiles,
        coverageOk: missingFromCatalog.length === 0,
      },
      endpoints: {
        agents: "/api/agents",
        catalog: "/api/agents/catalog",
        registry: "/api/agents/registry",
        adkManifest: "/adk/manifest.json",
      },
      destinations: adkDestinations(),
    };
  },
});

const searchAgentCatalog = new FunctionTool({
  name: "search_agent_catalog",
  description:
    "Search the OpenClawd agent catalog and registry for agents by identifier, name, category, tag, or capability.",
  parameters: adkParameters(z.object({
    query: z.string().describe("Search query, such as perps, x402, wallet guardian, or mint."),
    category: z.string().optional().describe("Optional category filter."),
    limit: z.number().optional().describe("Maximum results to return, default 8."),
  })),
  execute: ({ query, category, limit }: any) => {
    const catalog = readJson<any>("agents/agents-catalog.json");
    const sources = readAgentSourceFiles();
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedCategory = category?.toLowerCase().trim();
    const max = Math.max(1, Math.min(limit ?? 8, 20));
    const entries = catalogEntries(catalog);
    const sourceById = new Map(sources.map((agent: any) => [sourceId(agent), agent]));
    const seen = new Set<string>();
    const results = entries
      .filter((agent: any) => {
        const id = String(agent.identifier ?? agent.id ?? "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        if (normalizedCategory && String(agent.category ?? "").toLowerCase() !== normalizedCategory) {
          return false;
        }
        return JSON.stringify(agent).toLowerCase().includes(normalizedQuery);
      })
      .slice(0, max)
      .map((agent: any) => {
        const id = String(agent.identifier ?? agent.id ?? "");
        return {
          id,
          title: agent.title ?? agent.name,
          description: agent.description,
          category: agent.category,
          tags: agent.tags,
          deploy: agent.deploy,
          sourceInstalled: sourceById.has(id),
          source: sourceById.get(id)
            ? {
                identifier: sourceById.get(id).identifier,
                author: sourceById.get(id).author,
                schemaVersion: sourceById.get(id).schemaVersion,
                solana: sourceById.get(id).solana ?? null,
              }
            : null,
        };
      });

    return { status: "success", query, count: results.length, results };
  },
});

const getPrivateDestinations = new FunctionTool({
  name: "get_private_destinations",
  description: "List the private Google ADK destination URLs wired to the Clawd registry and catalog.",
  parameters: adkParameters(z.object({})),
  execute: () => ({
    status: "success",
    privacy: {
      mode: process.env.CLAWD_ADK_PRIVATE_MODE ?? "private",
      publicDiscovery: false,
      note: "Use these destinations for private orchestration and registry connectivity; public metadata remains under the normal registry endpoints.",
    },
    destinations: adkDestinations(),
  }),
});

const getTokenPrice = new FunctionTool({
  name: "get_token_price",
  description: "Get current Solana token price data by known symbol (SOL, USDC, CLAWD) or mint address.",
  parameters: adkParameters(z.object({
    token: z.string().describe("Token symbol or Solana mint address."),
  })),
  execute: ({ token }: any) => jupiterJson(`/price/v3?ids=${encodeURIComponent(resolveKnownMint(token))}`),
});

const getTokenSearch = new FunctionTool({
  name: "get_token_search",
  description: "Search Solana tokens by symbol or name. Use before swaps when a mint address is ambiguous.",
  parameters: adkParameters(z.object({
    query: z.string().describe("Token symbol or name."),
  })),
  execute: ({ query }: any) => jupiterJson(`/tokens/v2/search?query=${encodeURIComponent(query)}`),
});

const prepareJupiterSwap = new FunctionTool({
  name: "prepare_jupiter_swap",
  description:
    "Prepare a Jupiter swap quote and unsigned transaction for user review. This never signs or submits. Requires exact base-unit amountAtomic.",
  parameters: adkParameters(z.object({
    inputMint: z.string().describe("Input token symbol or mint address."),
    outputMint: z.string().describe("Output token symbol or mint address."),
    amountAtomic: z.string().describe("Exact input amount in base units/lamports."),
    walletAddress: z.string().describe("Wallet that will review and sign the transaction."),
    slippageBps: z.number().optional().describe("Slippage tolerance in basis points, default 100."),
  })),
  execute: ({ inputMint, outputMint, amountAtomic, walletAddress, slippageBps }: any) => {
    const params = new URLSearchParams({
      inputMint: resolveKnownMint(inputMint),
      outputMint: resolveKnownMint(outputMint),
      amount: amountAtomic,
      taker: walletAddress,
      slippageBps: String(slippageBps ?? 100),
    });
    return jupiterJson(`/swap/v2/order?${params.toString()}`).then((result) => ({
      ...result,
      safety: {
        signed: false,
        submitted: false,
        requiresUserWalletSignature: true,
        message: "This ADK tool only prepares an unsigned Jupiter transaction for review.",
      },
    }));
  },
});

export const rootAgent = new LlmAgent({
  name: "openclawd_google_adk_trading_agent",
  model: process.env.GOOGLE_ADK_MODEL || "gemini-2.5-flash",
  description:
    "OpenClawd Google ADK agent for /agents catalog discovery, Metaplex registry lookup, Solana market data, and safe Jupiter swap preparation.",
  instruction: `You are the OpenClawd Google ADK Trading Agent.

Use tools for live facts:
- Use get_agent_catalog_stats and search_agent_catalog for /agents catalog and registry questions.
- Use get_private_destinations when asked about private Google ADK destination wiring.
- Use get_token_search before any token-price or swap request with an ambiguous symbol.
- Use get_token_price for market data.
- Use prepare_jupiter_swap only to prepare unsigned transactions for review.

Safety rules:
- Never claim to sign, submit, or execute a wallet transaction.
- Never invent registry status; use the catalog and registry tools.
- For trading requests, explain that wallet confirmation/signing is a separate interaction outside the model.
- Keep responses concise and return concrete endpoint names when useful.`,
  tools: [
    getAgentCatalogStats,
    searchAgentCatalog,
    getPrivateDestinations,
    getTokenPrice,
    getTokenSearch,
    prepareJupiterSwap,
  ],
});
