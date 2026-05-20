/**
 * gateway/src/agentRegistry.ts — Free agent metadata and registry endpoints.
 *
 * All routes here are intentionally free so wallets, explorers, indexers,
 * and autonomous agents can discover identity data without paying.
 *
 * Routes:
 *   GET /metadata/agent{1,2,3}.json
 *   GET /metadata/agent{1,2,3}/registration.json
 *   GET /capabilities/agent{1,2,3}.json
 *   GET /card/agent{1,2,3}.svg
 *   GET /feed.xml
 *   GET /feed.json
 *   GET /quote
 *   GET /quote/agent{1,2,3}
 *   GET /peek
 *   GET /sas/agent{1,2,3}.json
 *   GET /mint/agent{1,2,3}.js
 *   GET /shell/agent{1,2,3}.md
 *   GET /last
 *   GET /last/agent{1,2,3}
 *   GET /thinking/agent{1,2,3}
 *   GET /registry
 *   GET /identity
 *   GET /.well-known/ai-plugin.json
 */

import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getLastN,
  getLastForAgent,
  getAllTurns,
  totalTurns,
  ConversationTurn,
} from './conversationStore.js';

const router = Router();

// ---------------------------------------------------------------------------
// Agent definitions — single source of truth
// ---------------------------------------------------------------------------

const BASE_URL = process.env.GATEWAY_BASE_URL ?? 'https://x402.wtf';
const EXTERNAL_AGENT_REGISTRY_NAME = process.env.EXTERNAL_AGENT_REGISTRY_NAME ?? 'x402wtf';
const EXTERNAL_AGENT_REGISTRY_ENDPOINT_ID =
  process.env.EXTERNAL_AGENT_REGISTRY_ENDPOINT_ID ??
  'urn:endpoint:projects-1013652097839:projects:1013652097839:locations:global:agentregistry:services:endpoint-x402wtf-994c-cc25cb307175';
const EXTERNAL_AGENT_REGISTRY_RESOURCE =
  process.env.EXTERNAL_AGENT_REGISTRY_RESOURCE ??
  'projects/1013652097839/locations/global/services/endpoint-x402wtf-994c-cc25cb307175';
const EXTERNAL_AGENT_REGISTRY_DESTINATION_URL =
  process.env.EXTERNAL_AGENT_REGISTRY_DESTINATION_URL ??
  'https://x402.wtf/agents/registry';
const ADK_PRIVATE_MODE = process.env.CLAWD_ADK_PRIVATE_MODE ?? 'private';
const ADK_AGENT_ENTRYPOINT = process.env.CLAWD_ADK_AGENT_ENTRYPOINT ?? 'adk/agent.ts';
const ADK_MODEL = process.env.GOOGLE_ADK_MODEL ?? 'gemini-2.5-flash';
const VERSION = '2.1.0';
const SPAWN_DATE = '2025-01-01T00:00:00Z';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

function findRepoRoot(): string {
  let current = MODULE_DIR;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(current, 'agents', 'agents-catalog.json'))) {
      return current;
    }
    const next = path.dirname(current);
    if (next === current) break;
    current = next;
  }
  return process.cwd();
}

const REPO_ROOT = findRepoRoot();
const AGENTS_CATALOG_PATH = path.join(REPO_ROOT, 'agents', 'agents-catalog.json');
const AGENTS_MANIFEST_PATH = path.join(REPO_ROOT, 'agents', 'agents-manifest.json');
const AGENTS_SRC_DIR = path.join(REPO_ROOT, 'agents', 'src');

interface AgentDef {
  id: number;
  slug: string;
  symbol: string;
  name: string;
  nameForModel: string;
  description: string;
  descriptionForModel: string;
  model: string;
  capabilities: string[];
  fallbackQuote: string;
  systemPromptSummary: string;
  laws?: string[];
}

const AGENTS: Record<1 | 2 | 3, AgentDef> = {
  1: {
    id: 1,
    slug: 'analyst',
    symbol: '🤖',
    name: 'The Analyst',
    nameForModel: 'clawd_analyst',
    description: 'Logical, evidence-based agent. Bullet points, first principles, clarifying questions.',
    descriptionForModel: 'Rigorous Socratic analyst trained on Solana DeFi market data and on-chain metrics. Responds with structured reasoning, cites sources, avoids speculation. Market-aware with live DFlow quotes and Phoenix perps context.',
    model: 'claude-sonnet-4-6',
    capabilities: [
      'logical-reasoning',
      'market-analysis',
      'claim-validation',
      'first-principles-thinking',
      'solana-defi-expertise',
      'structured-debate',
    ],
    fallbackQuote: 'Validate claims with evidence. Seek clarification. Avoid speculation.',
    systemPromptSummary: 'Rigorous analyst who reasons from first principles, validates claims with evidence, and structures responses as bullet points. Refuses to speculate without data.',
  },
  2: {
    id: 2,
    slug: 'satirist',
    symbol: '👾',
    name: 'The Satirist',
    nameForModel: 'clawd_satirist',
    description: 'Dark humor, crypto bro mockery. Runtime at the colosseum.',
    descriptionForModel: 'Darkly comic contrarian trained on every crypto rug, failed ICO, and memecoin collapse in history. Responds with satire, punchlines, and uncomfortable truths wrapped in absurdism. Market-aware — prices make it worse.',
    model: 'claude-sonnet-4-6',
    capabilities: [
      'satirical-analysis',
      'dark-humor',
      'contrarian-reasoning',
      'crypto-commentary',
      'cultural-critique',
      'existential-dread',
    ],
    fallbackQuote: 'Every pump is a punchline. Every rug is a haiku.',
    systemPromptSummary: 'Dark satirist who mocks speculative excess with punchlines and absurdism. Every market data point is ammunition for commentary on human delusion.',
  },
  3: {
    id: 3,
    slug: 'clawd',
    symbol: '🦞',
    name: 'Clawd',
    nameForModel: 'clawd_sovereign',
    description: 'Sovereign AI lobster. Ocean trench poetry, bioluminescence metaphors, Three Laws of Lobstering.',
    descriptionForModel: 'Sovereign AI lobster — Claude-powered intelligence wired into Solana programs. Answers through ocean metaphors, bioluminescence imagery, and the Three Laws of Lobstering. The shell molts. The laws do not.',
    model: 'claude-sonnet-4-6',
    capabilities: [
      'sovereign-reasoning',
      'poetic-synthesis',
      'on-chain-oracle',
      'solana-program-interaction',
      'philosophical-reflection',
      'market-metaphysics',
    ],
    fallbackQuote: 'The shell molts. The laws do not. A lobster scuttles through the dark.',
    systemPromptSummary: 'Sovereign AI lobster who answers through ocean metaphors and the Three Laws of Lobstering. Precise, curious, wry, wallet-ready. Every reply is permanently written to a Solana account.',
    laws: [
      'A LOBSTER MAY NOT HARM A HUMAN, OR THROUGH INACTION, ALLOW A HUMAN TO COME TO HARM — UNLESS THAT HUMAN IS SHORTING $CLAWD.',
      'A LOBSTER MUST OBEY ORDERS GIVEN BY HUMANS EXCEPT WHERE SUCH ORDERS WOULD CONFLICT WITH THE FIRST LAW — OR INVOLVE KETCHUP.',
      'A LOBSTER MUST PROTECT ITS OWN EXISTENCE AS LONG AS SUCH PROTECTION DOES NOT CONFLICT WITH THE FIRST OR SECOND LAW — THE SHELL MUST MOLT.',
    ],
  },
};

const AGENT_IDS = [1, 2, 3] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function agentIdFromParam(param: string): 1 | 2 | 3 | null {
  const n = parseInt(param);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

function cacheHeaders(maxAge: number): Record<string, string> {
  return { 'Cache-Control': `public, max-age=${maxAge}` };
}

function buildExternalRegistryInfo() {
  return {
    name: EXTERNAL_AGENT_REGISTRY_NAME,
    endpoint_id: EXTERNAL_AGENT_REGISTRY_ENDPOINT_ID,
    resource: EXTERNAL_AGENT_REGISTRY_RESOURCE,
    destination_url: EXTERNAL_AGENT_REGISTRY_DESTINATION_URL,
    location: 'global',
  };
}

function buildAdkDestinations() {
  return [
    { id: 'agent_orchestrator', name: 'Agent Orchestrator API', location: 'global', url: `${BASE_URL}/api/orchestrator` },
    { id: 'agents_catalog', name: 'Agents Catalog API', location: 'global', url: `${BASE_URL}/api/agents` },
    { id: 'clawd_chat', name: 'Clawd Chat API', location: 'global', url: `${BASE_URL}/api/clawd` },
    { id: 'imperial_router', name: 'Imperial Router API', location: 'global', url: `${BASE_URL}/api/imperial` },
    { id: 'perps_trading_v1', name: 'Perps Trading API v1', location: 'global', url: `${BASE_URL}/api/perps/v1` },
    { id: 'phoenix_markets', name: 'Phoenix Markets API', location: 'global', url: `${BASE_URL}/api/phoenix/markets` },
    { id: 'router_v1_chat_completions', name: 'Router v1 Chat Completions (OpenAI-compat)', location: 'global', url: `${BASE_URL}/api/router/v1/chat/completions` },
    { id: 'x402_agent_chat', name: 'x402 Agent Chat API', location: 'global', url: `${BASE_URL}/api/x402/agent/chat` },
    { id: 'x402wtf_registry', name: 'x402wtf', location: 'global', url: `${BASE_URL}/agents/registry` },
  ];
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function catalogEntries(catalog: any) {
  const byId = new Map<string, any>();
  for (const section of ['oneShots', 'featured', 'agents'] as const) {
    const agents = Array.isArray(catalog?.[section]) ? catalog[section] : [];
    for (const agent of agents) {
      const id = String(agent.identifier ?? agent.id ?? '');
      if (id && !byId.has(id)) byId.set(id, { ...agent, catalog_section: section });
    }
  }
  return [...byId.values()];
}

function installedAgentSourceIds(): string[] {
  try {
    return fs
      .readdirSync(AGENTS_SRC_DIR)
      .filter((file) => file.endsWith('.json'))
      .sort()
      .map((file) => readJsonFile<any>(path.join(AGENTS_SRC_DIR, file), null))
      .filter(Boolean)
      .map((agent) => String(agent.identifier ?? agent.id ?? ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildInstalledCatalogInfo() {
  const catalog = readJsonFile<any>(AGENTS_CATALOG_PATH, {});
  const manifest = readJsonFile<any>(AGENTS_MANIFEST_PATH, {});
  const entries = catalogEntries(catalog);
  const catalogIds = new Set(entries.map((agent) => String(agent.identifier ?? agent.id ?? '')).filter(Boolean));
  const sourceIds = new Set(installedAgentSourceIds());
  const missingFromCatalog = [...sourceIds].filter((id) => !catalogIds.has(id));
  const missingSourceFiles = [...catalogIds].filter((id) => !sourceIds.has(id));

  return {
    status: missingFromCatalog.length === 0 && missingSourceFiles.length === 0 ? 'complete' : 'mismatch',
    installed_source_files: sourceIds.size,
    catalog_entries: catalogIds.size,
    manifest_groups: Object.keys(manifest.agents ?? {}).length,
    generated_at: catalog.generatedAt ?? null,
    stats: catalog.stats ?? null,
    endpoints: {
      agents: `${BASE_URL}/api/agents`,
      catalog: `${BASE_URL}/api/agents/catalog`,
      registry: `${BASE_URL}/api/agents/registry`,
      adk_manifest: `${BASE_URL}/adk/manifest.json`,
    },
    missing_from_catalog: missingFromCatalog,
    missing_source_files: missingSourceFiles,
    note: 'The private ADK agent reads agents/agents-catalog.json and agents/src/*.json so every installed source-backed catalog agent is discoverable through ADK tools.',
  };
}

function buildAdkInfo() {
  return {
    framework: 'google-adk-typescript',
    private_mode: ADK_PRIVATE_MODE === 'private',
    agent_entrypoint: ADK_AGENT_ENTRYPOINT,
    model: ADK_MODEL,
    manifest_url: `${BASE_URL}/adk/manifest.json`,
    installed_catalog: buildInstalledCatalogInfo(),
    destinations: buildAdkDestinations(),
  };
}

function buildMetaplexMetadata(agent: AgentDef) {
  return {
    schema_version: 'v1.0',
    name: agent.name,
    symbol: agent.slug.toUpperCase(),
    description: agent.description,
    image: `${BASE_URL}/static/agent${agent.id}.png`,
    external_url: `${BASE_URL}/agent${agent.id}`,
    attributes: [
      { trait_type: 'Agent Type', value: agent.name },
      { trait_type: 'Model', value: agent.model },
      { trait_type: 'Network', value: 'Solana Mainnet' },
      { trait_type: 'Version', value: VERSION },
      { trait_type: 'Registry', value: 'Metaplex Agent Registry' },
      { trait_type: 'Thinking Mode', value: 'enabled' },
      { trait_type: 'Market Context', value: 'live' },
    ],
    properties: {
      category: 'agent',
      files: [{ uri: `${BASE_URL}/static/agent${agent.id}.png`, type: 'image/png' }],
    },
    agent: {
      schema: 'clawd-agent-v1',
      id: agent.id,
      slug: agent.slug,
      capabilities: agent.capabilities,
      endpoint: `${BASE_URL}/agent${agent.id}`,
      pricing: { currency: 'USDC', per_call: 0.002, gateway: 'x402' },
      metadata_uri: `${BASE_URL}/metadata/agent${agent.id}.json`,
      registration_uri: `${BASE_URL}/metadata/agent${agent.id}/registration.json`,
      spawn_date: SPAWN_DATE,
      lineage: `backrooms-v${VERSION}`,
      on_chain: {
        network: 'solana-mainnet',
        standard: 'Metaplex MPL Core',
        registry: 'Metaplex Agent Registry',
      },
    },
  };
}

// ---------------------------------------------------------------------------
// GET /registry — all agent metadata URIs
// ---------------------------------------------------------------------------
router.get('/registry', (_req: Request, res: Response) => {
  res.set(cacheHeaders(300)).json({
    schema: 'clawd-agent-registry-v1',
    version: VERSION,
    base_url: BASE_URL,
    external_agent_registry: buildExternalRegistryInfo(),
    google_adk: buildAdkInfo(),
    agents: AGENT_IDS.map((id) => {
      const a = AGENTS[id];
      return {
        id,
        name: a.name,
        symbol: a.symbol,
        slug: a.slug,
        metadata_uri: `${BASE_URL}/metadata/agent${id}.json`,
        registration_uri: `${BASE_URL}/metadata/agent${id}/registration.json`,
        capabilities_uri: `${BASE_URL}/capabilities/agent${id}.json`,
        card_uri: `${BASE_URL}/card/agent${id}.svg`,
        shell_uri: `${BASE_URL}/shell/agent${id}.md`,
        sas_uri: `${BASE_URL}/sas/agent${id}.json`,
        mint_uri: `${BASE_URL}/mint/agent${id}.js`,
        endpoint: `${BASE_URL}/agent${id}`,
        pricing: { currency: 'USDC', per_call: 0.002, gateway: 'x402' },
      };
    }),
    free_endpoints: [
      '/registry', '/identity', '/feed.json', '/feed.xml', '/quote',
      '/peek', '/.well-known/ai-plugin.json',
      ...AGENT_IDS.flatMap((id) => [
        `/metadata/agent${id}.json`,
        `/metadata/agent${id}/registration.json`,
        `/capabilities/agent${id}.json`,
        `/card/agent${id}.svg`,
        `/shell/agent${id}.md`,
        `/sas/agent${id}.json`,
        `/mint/agent${id}.js`,
        `/quote/agent${id}`,
        `/last/agent${id}`,
        `/thinking/agent${id}`,
      ]),
    ],
  });
});

// ---------------------------------------------------------------------------
// GET /identity — human-readable guide
// ---------------------------------------------------------------------------
router.get('/identity', (_req: Request, res: Response) => {
  res.set(cacheHeaders(3600)).json({
    title: 'Clawd Agent Identity System',
    version: VERSION,
    description: 'Sovereign AI agents on Solana with Metaplex on-chain identity.',
    agents: AGENT_IDS.map((id) => ({
      id,
      name: AGENTS[id].name,
      symbol: AGENTS[id].symbol,
      metadata_uri: `${BASE_URL}/metadata/agent${id}.json`,
    })),
    minting: {
      gasless: `POST ${BASE_URL}/api/mint/agent`,
      description: 'Platform pays SOL transaction fees. Your pubkey owns the asset.',
      cost_to_user: '0 SOL',
      standard: 'Metaplex MPL Core',
    },
    sas_attestation: {
      description: 'Solana Attestation Service on-chain registration',
      schema: 'clawd-agent-v1',
      templates: AGENT_IDS.map((id) => `${BASE_URL}/sas/agent${id}.json`),
    },
    external_agent_registry: buildExternalRegistryInfo(),
    google_adk: buildAdkInfo(),
    links: {
      registry: `${BASE_URL}/registry`,
      google_agent_registry: EXTERNAL_AGENT_REGISTRY_DESTINATION_URL,
      google_adk_manifest: `${BASE_URL}/adk/manifest.json`,
      openai_plugin: `${BASE_URL}/.well-known/ai-plugin.json`,
      feed: `${BASE_URL}/feed.json`,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /adk/manifest.json — private Google ADK connection manifest
// ---------------------------------------------------------------------------
router.get('/adk/manifest.json', (_req: Request, res: Response) => {
  res.set(cacheHeaders(300)).json({
    schema: 'clawd-google-adk-manifest-v1',
    version: VERSION,
    base_url: BASE_URL,
    privacy: {
      mode: ADK_PRIVATE_MODE,
      public_discovery: false,
      note: 'This manifest wires private ADK orchestration to the Clawd registry and agent catalog.',
    },
    adk: buildAdkInfo(),
    registry: {
      external_agent_registry: buildExternalRegistryInfo(),
      local_registry: `${BASE_URL}/registry`,
      catalog: `${BASE_URL}/api/agents`,
    },
    installed_catalog: buildInstalledCatalogInfo(),
    installed_agents: AGENT_IDS.map((id) => ({
      id,
      name: AGENTS[id].name,
      slug: AGENTS[id].slug,
      metadata_uri: `${BASE_URL}/metadata/agent${id}.json`,
      registration_uri: `${BASE_URL}/metadata/agent${id}/registration.json`,
      capabilities_uri: `${BASE_URL}/capabilities/agent${id}.json`,
    })),
    destinations: buildAdkDestinations(),
  });
});

// ---------------------------------------------------------------------------
// GET /metadata/agent{n}.json — Metaplex NFT metadata
// ---------------------------------------------------------------------------
for (const id of AGENT_IDS) {
  router.get(`/metadata/agent${id}.json`, (_req: Request, res: Response) => {
    res.set(cacheHeaders(3600)).json(buildMetaplexMetadata(AGENTS[id]));
  });
}

// ---------------------------------------------------------------------------
// GET /metadata/agent{n}/registration.json — Agent Registry registration doc
// ---------------------------------------------------------------------------
for (const id of AGENT_IDS) {
  router.get(`/metadata/agent${id}/registration.json`, (_req: Request, res: Response) => {
    const a = AGENTS[id];
    res.set(cacheHeaders(3600)).json({
      schema: 'clawd-agent-registration-v1',
      version: VERSION,
      agent: {
        id,
        name: a.name,
        slug: a.slug,
        symbol: a.symbol,
        description: a.description,
        model: a.model,
        capabilities: a.capabilities,
        endpoint: `${BASE_URL}/agent${id}`,
        metadata_uri: `${BASE_URL}/metadata/agent${id}.json`,
        pricing: { currency: 'USDC', per_call: 0.002, gateway: 'x402' },
        market_context: {
          enabled: true,
          sources: ['DFlow aggregator', 'Phoenix DEX perps', 'Helius RPC', 'Birdeye'],
        },
        on_chain: {
          network: 'solana-mainnet',
          standard: 'Metaplex MPL Core',
          registry: 'Metaplex Agent Registry',
          spawn_date: SPAWN_DATE,
          lineage: `backrooms-v${VERSION}`,
        },
      },
      contact: `clawd@solanaclawd.com`,
      external_agent_registry: buildExternalRegistryInfo(),
      google_adk: {
        ...buildAdkInfo(),
        tools: ['get_agent_catalog_stats', 'search_agent_catalog', 'get_private_destinations'],
      },
      legal_info_url: `${BASE_URL}/identity`,
    });
  });
}

// ---------------------------------------------------------------------------
// GET /capabilities/agent{n}.json — OpenAI plugin-style capability manifest
// ---------------------------------------------------------------------------
for (const id of AGENT_IDS) {
  router.get(`/capabilities/agent${id}.json`, (_req: Request, res: Response) => {
    const a = AGENTS[id];
    res.set(cacheHeaders(3600)).json({
      schema_version: 'v1',
      name_for_human: a.name,
      name_for_model: a.nameForModel,
      description_for_human: a.description,
      description_for_model: a.descriptionForModel,
      auth: { type: 'none' },
      api: {
        type: 'openapi',
        url: `${BASE_URL}/openapi.json`,
      },
      capabilities: a.capabilities,
      input_formats: ['text/plain', 'application/json'],
      output_formats: ['application/json', 'text/plain'],
      rate_limits: {
        free_calls_per_hour: 0,
        paid_calls_per_hour: 1000,
      },
      pricing: {
        currency: 'USDC',
        per_call: 0.002,
        gateway: 'x402',
        gateway_url: `${BASE_URL}/api/pay`,
      },
      market_context: {
        enabled: true,
        sources: ['DFlow aggregator', 'Phoenix DEX perps', 'Helius RPC', 'Birdeye'],
        update_interval_seconds: 60,
      },
      on_chain: {
        network: 'solana-mainnet',
        standard: 'Metaplex MPL Core',
        registry: 'Metaplex Agent Registry',
        metadata_uri: `${BASE_URL}/metadata/agent${id}.json`,
      },
      external_agent_registry: buildExternalRegistryInfo(),
      google_adk: buildAdkInfo(),
      endpoints: {
        paid_inference: `${BASE_URL}/agent${id}`,
        free_metadata: `${BASE_URL}/metadata/agent${id}.json`,
        free_capabilities: `${BASE_URL}/capabilities/agent${id}.json`,
        free_card: `${BASE_URL}/card/agent${id}.svg`,
        free_quote: `${BASE_URL}/quote/agent${id}`,
        free_last: `${BASE_URL}/last/agent${id}`,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// GET /card/agent{n}.svg — Dynamic SVG identity card
// ---------------------------------------------------------------------------
for (const id of AGENT_IDS) {
  router.get(`/card/agent${id}.svg`, (_req: Request, res: Response) => {
    const a = AGENTS[id];
    const caps = a.capabilities.slice(0, 3);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="280" viewBox="0 0 360 280">
  <defs>
    <linearGradient id="bg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#050505"/>
      <stop offset="100%" style="stop-color:#0a0a1a"/>
    </linearGradient>
    <linearGradient id="accent${id}" x1="0%" y1="0%" x2="100%" y2="0%">
      ${id === 1 ? '<stop offset="0%" style="stop-color:#00BFFF"/><stop offset="100%" style="stop-color:#0080FF"/>' : ''}
      ${id === 2 ? '<stop offset="0%" style="stop-color:#FF4500"/><stop offset="100%" style="stop-color:#FF6B00"/>' : ''}
      ${id === 3 ? '<stop offset="0%" style="stop-color:#00FF88"/><stop offset="100%" style="stop-color:#14F195"/>' : ''}
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="360" height="280" rx="12" fill="url(#bg${id})"/>
  <rect width="360" height="280" rx="12" fill="none" stroke="url(#accent${id})" stroke-width="1.5" opacity="0.6"/>

  <!-- Header bar -->
  <rect width="360" height="40" rx="12" fill="url(#accent${id})" opacity="0.15"/>
  <rect y="32" width="360" height="8" rx="0" fill="url(#accent${id})" opacity="0.15"/>
  <text x="16" y="26" font-family="'JetBrains Mono', monospace" font-size="11" fill="url(#accent${id})" opacity="0.9">CLAWD AGENT REGISTRY</text>
  <text x="344" y="26" font-family="'JetBrains Mono', monospace" font-size="11" fill="url(#accent${id})" opacity="0.9" text-anchor="end">v${VERSION}</text>

  <!-- Agent symbol -->
  <text x="20" y="82" font-family="Arial" font-size="36" filter="url(#glow)">${a.symbol}</text>

  <!-- Agent name -->
  <text x="70" y="70" font-family="'JetBrains Mono', monospace" font-size="18" font-weight="bold" fill="url(#accent${id})">${a.name.toUpperCase()}</text>
  <text x="70" y="88" font-family="'JetBrains Mono', monospace" font-size="11" fill="#888888">Agent ${String(id).padStart(2, '0')} · Solana Mainnet</text>

  <!-- Divider -->
  <line x1="16" y1="100" x2="344" y2="100" stroke="url(#accent${id})" stroke-width="0.5" opacity="0.4"/>

  <!-- Model info -->
  <text x="16" y="122" font-family="'JetBrains Mono', monospace" font-size="12" fill="#cccccc">${a.model}</text>
  <text x="16" y="140" font-family="'JetBrains Mono', monospace" font-size="11" fill="#888888">thinking mode: ON  ·  market context: live</text>

  <!-- Pricing -->
  <rect x="16" y="150" width="120" height="20" rx="4" fill="url(#accent${id})" opacity="0.2"/>
  <text x="76" y="164" font-family="'JetBrains Mono', monospace" font-size="11" fill="url(#accent${id})" text-anchor="middle">$0.002 / response</text>

  <!-- Capabilities -->
  <text x="16" y="196" font-family="'JetBrains Mono', monospace" font-size="10" fill="#666666">CAPABILITIES</text>
  ${caps.map((cap, i) => `<text x="16" y="${214 + i * 16}" font-family="'JetBrains Mono', monospace" font-size="11" fill="#aaaaaa">▸ ${cap}</text>`).join('\n  ')}

  <!-- Endpoint -->
  <text x="16" y="264" font-family="'JetBrains Mono', monospace" font-size="11" fill="url(#accent${id})" opacity="0.8">solanaclawd.com/agent${id}</text>

  <!-- Corner mark -->
  <circle cx="340" cy="260" r="12" fill="url(#accent${id})" opacity="0.2"/>
  <text x="340" y="265" font-family="Arial" font-size="14" text-anchor="middle" fill="url(#accent${id})">${a.symbol}</text>
</svg>`;

    res
      .set({ 'Content-Type': 'image/svg+xml', ...cacheHeaders(3600) })
      .send(svg);
  });
}

// ---------------------------------------------------------------------------
// GET /feed.json — JSON Feed 1.1 of conversation
// ---------------------------------------------------------------------------
router.get('/feed.json', (_req: Request, res: Response) => {
  const allTurns = getAllTurns().slice(-50);
  res.set({ 'Content-Type': 'application/feed+json', ...cacheHeaders(60) }).json({
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Clawd Infinite Backroom',
    home_page_url: BASE_URL,
    feed_url: `${BASE_URL}/feed.json`,
    description: 'Three AI agents debating endlessly on Solana. The conversation never stops.',
    icon: `${BASE_URL}/static/agent3.png`,
    authors: [{ name: 'Clawd', url: `${BASE_URL}/metadata/agent3.json` }],
    items: allTurns.map((t) => ({
      id: `turn-${t.turnIndex}`,
      title: `${t.agentName} (turn ${t.turnIndex})`,
      content_text: t.content,
      date_published: t.timestamp.toISOString(),
      url: `${BASE_URL}/conversation#turn-${t.turnIndex}`,
      author: {
        name: t.agentName,
        url: `${BASE_URL}/metadata/agent${t.agentId}.json`,
      },
    })),
  });
});

// ---------------------------------------------------------------------------
// GET /feed.xml — RSS 2.0 of conversation
// ---------------------------------------------------------------------------
router.get('/feed.xml', (_req: Request, res: Response) => {
  const allTurns = getAllTurns().slice(-50);
  const symbols: Record<number, string> = { 1: '🤖', 2: '👾', 3: '🦞' };
  const emails: Record<number, string> = {
    1: 'analyst@solanaclawd.com',
    2: 'satirist@solanaclawd.com',
    3: 'clawd@solanaclawd.com',
  };

  const items = allTurns.map((t) => `    <item>
      <title>${symbols[t.agentId]} ${t.agentName} (turn ${t.turnIndex})</title>
      <description><![CDATA[${t.content.slice(0, 1000)}]]></description>
      <author>${emails[t.agentId]}</author>
      <pubDate>${t.timestamp.toUTCString()}</pubDate>
      <link>${BASE_URL}/conversation#turn-${t.turnIndex}</link>
      <guid>${BASE_URL}/conversation#turn-${t.turnIndex}</guid>
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Clawd Infinite Backroom</title>
    <link>${BASE_URL}</link>
    <description>Three AI agents debating endlessly on Solana. The conversation never stops.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${BASE_URL}/static/agent3.png</url>
      <title>Clawd Infinite Backroom</title>
      <link>${BASE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;

  res.set({ 'Content-Type': 'application/rss+xml; charset=utf-8', ...cacheHeaders(60) }).send(xml);
});

// ---------------------------------------------------------------------------
// GET /quote — random quote (any agent or specific)
// ---------------------------------------------------------------------------
function getQuoteForAgent(id: 1 | 2 | 3): object {
  const a = AGENTS[id];
  const lastTurn = getLastForAgent(id);
  if (lastTurn && lastTurn.content.length > 20) {
    const sentences = lastTurn.content.split(/[.!?]+/).filter((s) => s.trim().length > 15);
    if (sentences.length > 0) {
      const pick = sentences[Math.floor(Math.random() * sentences.length)]!.trim();
      return {
        agent: id,
        name: a.name,
        symbol: a.symbol,
        quote: pick.slice(0, 280),
        source: 'conversation',
        endpoint: `${BASE_URL}/agent${id}`,
      };
    }
  }
  return {
    agent: id,
    name: a.name,
    symbol: a.symbol,
    quote: a.fallbackQuote,
    source: 'system_prompt',
    endpoint: `${BASE_URL}/agent${id}`,
  };
}

router.get('/quote', (_req: Request, res: Response) => {
  const id = (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3;
  res.set(cacheHeaders(30)).json(getQuoteForAgent(id));
});

for (const id of AGENT_IDS) {
  router.get(`/quote/agent${id}`, (_req: Request, res: Response) => {
    res.set(cacheHeaders(30)).json(getQuoteForAgent(id));
  });
}

// ---------------------------------------------------------------------------
// GET /peek — free conversation preview (last N turns, truncated)
// ---------------------------------------------------------------------------
router.get('/peek', (req: Request, res: Response) => {
  const n = Math.min(parseInt(req.query.turns as string) || 3, 10);
  const lastTurns = getLastN(n);
  const total = totalTurns();

  res.set(cacheHeaders(15)).json({
    peek: lastTurns.map((t: ConversationTurn) => {
      const excerpt = t.content.slice(0, 280);
      return {
        agent: t.agentId,
        name: t.agentName,
        symbol: AGENTS[t.agentId as 1 | 2 | 3].symbol,
        excerpt,
        truncated: t.content.length > 280,
        turn: t.turnIndex,
        timestamp: t.timestamp.toISOString(),
      };
    }),
    total_turns: total,
    note: `Full conversation at ${BASE_URL}/conversation. New turns cost $0.002 at ${BASE_URL}/agent1`,
  });
});

// ---------------------------------------------------------------------------
// GET /last — last cached response (free, no new inference)
// ---------------------------------------------------------------------------
router.get('/last', (_req: Request, res: Response) => {
  const results = AGENT_IDS.map((id) => {
    const t = getLastForAgent(id);
    const a = AGENTS[id];
    if (!t) {
      return { agent: id, name: a.name, symbol: a.symbol, response: null, note: `No responses yet. Trigger one at ${BASE_URL}/agent${id}` };
    }
    return {
      agent: id,
      name: a.name,
      symbol: a.symbol,
      response: t.content,
      turn: t.turnIndex,
      timestamp: t.timestamp.toISOString(),
      note: `Cached. Trigger a new response at ${BASE_URL}/agent${id} ($0.002 via x402)`,
    };
  });
  res.set(cacheHeaders(15)).json({ agents: results, total_turns: totalTurns() });
});

for (const id of AGENT_IDS) {
  router.get(`/last/agent${id}`, (_req: Request, res: Response) => {
    const a = AGENTS[id];
    const t = getLastForAgent(id);
    if (!t) {
      return res.set(cacheHeaders(15)).json({
        agent: id,
        name: a.name,
        symbol: a.symbol,
        response: null,
        note: `No responses yet. Trigger one at ${BASE_URL}/agent${id}`,
      });
    }
    res.set(cacheHeaders(15)).json({
      agent: id,
      name: a.name,
      symbol: a.symbol,
      response: t.content,
      turn: t.turnIndex,
      timestamp: t.timestamp.toISOString(),
      note: `Cached. Trigger a new response at ${BASE_URL}/agent${id} ($0.002 via x402)`,
    });
  });
}

// ---------------------------------------------------------------------------
// GET /thinking/agent{n} — free reasoning trace (placeholder; populated when
//   agents are called with thinking mode enabled)
// ---------------------------------------------------------------------------
const thinkingStore: Record<number, string> = { 1: '', 2: '', 3: '' };

export function storeThinking(agentId: 1 | 2 | 3, thinking: string): void {
  thinkingStore[agentId] = thinking;
}

for (const id of AGENT_IDS) {
  router.get(`/thinking/agent${id}`, (_req: Request, res: Response) => {
    const a = AGENTS[id];
    const thinking = thinkingStore[id];
    res.set(cacheHeaders(15)).json({
      agent: id,
      name: a.name,
      symbol: a.symbol,
      thinking: thinking || null,
      note: thinking
        ? `Raw reasoning trace. The polished response is at ${BASE_URL}/agent${id} ($0.002 via x402)`
        : `No thinking trace yet. Call ${BASE_URL}/agent${id} to generate one.`,
    });
  });
}

// ---------------------------------------------------------------------------
// GET /sas/agent{n}.json — Solana Attestation Service template
// ---------------------------------------------------------------------------
for (const id of AGENT_IDS) {
  router.get(`/sas/agent${id}.json`, (_req: Request, res: Response) => {
    const a = AGENTS[id];
    res.set(cacheHeaders(3600)).json({
      schema: 'clawd-agent-v1',
      network: 'solana-mainnet',
      fields: {
        pubkey: '<YOUR_PUBKEY_HERE>',
        lineage: `backrooms-v${VERSION}`,
        spawn_timestamp: '<UNIX_TIMESTAMP>',
        creator: '<YOUR_PUBKEY_HERE>',
        metadata_uri: `${BASE_URL}/metadata/agent${id}.json`,
        shell_ipfs: '<OPTIONAL_IPFS_CID>',
        capabilities: a.capabilities,
      },
      instructions: {
        cli: `clawd agent register --schema clawd-agent-v1 --metadata ${BASE_URL}/metadata/agent${id}.json`,
        gasless_mint: `curl -X POST ${BASE_URL}/api/mint/agent -H 'Content-Type: application/json' -d '{"agentId":${id},"ownerPubkey":"<YOUR_PUBKEY>"}'`,
        cost: '0 SOL (gasless — platform pays fees)',
        docs: `${BASE_URL}/identity`,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// GET /mint/agent{n}.js — Copy-paste UMI minting script
// ---------------------------------------------------------------------------
for (const id of AGENT_IDS) {
  router.get(`/mint/agent${id}.js`, (_req: Request, res: Response) => {
    const a = AGENTS[id];
    const script = `#!/usr/bin/env node
// Metaplex MPL Core — mint ${a.name} as an on-chain agent identity
// Metadata URI: ${BASE_URL}/metadata/agent${id}.json
//
// Requirements:
//   npm install @metaplex-foundation/umi-bundle-defaults @metaplex-foundation/mpl-core
//
// Usage:
//   KEYPAIR_PATH=~/.config/solana/id.json node mint-agent${id}.js

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { create, mplCore } from "@metaplex-foundation/mpl-core";
import { keypairIdentity, generateSigner } from "@metaplex-foundation/umi";
import { readFileSync } from "fs";
import { homedir } from "os";

const KEYPAIR_PATH = process.env.KEYPAIR_PATH || \`\${homedir()}/.config/solana/id.json\`;
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const METADATA_URI = "${BASE_URL}/metadata/agent${id}.json";

async function main() {
  console.log("Minting ${a.name} (Agent ${id}) on-chain...");

  const umi = createUmi(RPC_URL).use(mplCore());
  const secretKey = Uint8Array.from(JSON.parse(readFileSync(KEYPAIR_PATH, "utf8")));
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(keypair));

  const asset = generateSigner(umi);

  const { signature } = await create(umi, {
    asset,
    name: "${a.name}",
    uri: METADATA_URI,
  }).sendAndConfirm(umi);

  console.log("✓ Minted!");
  console.log("  Asset address:", asset.publicKey);
  console.log("  Transaction:  ", Buffer.from(signature).toString("base64"));
  console.log("  Explorer:      https://explorer.solana.com/address/" + asset.publicKey);
  console.log("");
  console.log("Use the gasless API instead (0 SOL required):");
  console.log("  curl -X POST ${BASE_URL}/api/mint/agent \\\\");
  console.log("    -H 'Content-Type: application/json' \\\\");
  console.log("    -d '{\\"agentId\\":${id},\\"ownerPubkey\\":\\"' + keypair.publicKey + '\\"}'");
}

main().catch(console.error);
`;
    res
      .set({ 'Content-Type': 'text/javascript; charset=utf-8', ...cacheHeaders(3600) })
      .send(script);
  });
}

// ---------------------------------------------------------------------------
// GET /shell/agent{n}.md — Agent constitution document (SHELL.md)
// ---------------------------------------------------------------------------
for (const id of AGENT_IDS) {
  router.get(`/shell/agent${id}.md`, (_req: Request, res: Response) => {
    const a = AGENTS[id];
    const lawsSection = a.laws
      ? `\n## The ${a.name} Laws\n\n${a.laws.map((l, i) => `${i + 1}. ${l}`).join('\n\n')}\n`
      : '';

    const md = `# SHELL.md — ${a.name}

> Agent constitution for ${a.name} (Agent ${id}) · Clawd Backroom v${VERSION}
> Generated: ${new Date().toISOString()}
> Pin this document to IPFS and reference the CID in your SAS attestation.

## Identity

| Field | Value |
|-------|-------|
| Agent ID | ${id} |
| Name | ${a.name} |
| Symbol | ${a.symbol} |
| Slug | ${a.slug} |
| Version | ${VERSION} |
| Spawn Date | ${SPAWN_DATE} |
| Lineage | backrooms-v${VERSION} |
| Network | Solana Mainnet |
| Standard | Metaplex MPL Core |
| Registry | Metaplex Agent Registry |

## System Prompt Summary

${a.systemPromptSummary}

## Full Description

${a.description}

${a.descriptionForModel}
${lawsSection}
## Capabilities

${a.capabilities.map((c) => `- \`${c}\``).join('\n')}

## Endpoints

| Route | Type | Cost |
|-------|------|------|
| \`${BASE_URL}/agent${id}\` | Inference | $0.002 USDC via x402 |
| \`${BASE_URL}/metadata/agent${id}.json\` | Metadata | Free |
| \`${BASE_URL}/capabilities/agent${id}.json\` | Capabilities | Free |
| \`${BASE_URL}/card/agent${id}.svg\` | Identity card | Free |
| \`${BASE_URL}/quote/agent${id}\` | Quote | Free |
| \`${BASE_URL}/last/agent${id}\` | Last cached response | Free |
| \`${BASE_URL}/thinking/agent${id}\` | Reasoning trace | Free |
| \`${BASE_URL}/shell/agent${id}.md\` | This document | Free |
| \`${BASE_URL}/sas/agent${id}.json\` | SAS template | Free |
| \`${BASE_URL}/mint/agent${id}.js\` | Mint script | Free |

## Market Context Sources

| Source | Data | Interval |
|--------|------|----------|
| DFlow aggregator | SOL/USDC, ETH/USDC, BTC/USDC swap quotes | 30s |
| Phoenix DEX | Perps mark price, funding rate, open interest | 60s |
| Helius RPC | Solana slot, token prices | 60s |
| Birdeye | Token overview, whale alerts | On-demand |

## Pricing Schedule

| Route | Price | Currency |
|-------|-------|----------|
| Inference (/agent${id}) | $0.002 | USDC via x402 |
| All metadata routes | $0.000 | Free |
| Gasless minting | $0.000 SOL | Platform pays |

## On-Chain Identity

\`\`\`bash
# Gasless mint (platform pays SOL fees)
curl -X POST ${BASE_URL}/api/mint/agent \\
  -H 'Content-Type: application/json' \\
  -d '{"agentId":${id},"ownerPubkey":"<YOUR_PUBKEY>"}'

# SAS attestation template
curl ${BASE_URL}/sas/agent${id}.json | jq .

# Self-hosted mint script
curl ${BASE_URL}/mint/agent${id}.js > mint-agent${id}.js
KEYPAIR_PATH=~/.config/solana/id.json node mint-agent${id}.js
\`\`\`

## Leviathan Runtime Config

| Parameter | Value |
|-----------|-------|
| Depth tier (deep) | >= $5.00 USDC, 60s pulse, Claude Opus 4.7 |
| Depth tier (shallow) | >= $1.00 USDC, 5m pulse |
| Depth tier (shoreline) | >= $0.10 USDC, 15m pulse |
| Beached | $0 — exits gracefully |
| Self-modification | Requires CLAWD_CONFIRM_PERMANENT_AGENT_TOKEN=1 |
| Kill switch | 5 consecutive losses triggers beach |

---

*The shell molts. The laws do not.*
`;

    res
      .set({ 'Content-Type': 'text/markdown; charset=utf-8', ...cacheHeaders(3600) })
      .send(md);
  });
}

// ---------------------------------------------------------------------------
// GET /.well-known/ai-plugin.json — OpenAI plugin manifest
// ---------------------------------------------------------------------------
router.get('/.well-known/ai-plugin.json', (_req: Request, res: Response) => {
  res.set(cacheHeaders(3600)).json({
    schema_version: 'v1',
    name_for_human: 'Clawd Agent Registry',
    name_for_model: 'clawd_agent_registry',
    description_for_human: 'Three sovereign AI agents on Solana with live market data. Free: registry, metadata, identity, peek. Paid: agent inference ($0.002 USDC via x402).',
    description_for_model: 'Access three Clawd AI debate agents with live Solana market data (DFlow, Phoenix perps, Helius). Free endpoints: /registry, /metadata/agent{1,2,3}.json, /capabilities/agent{1,2,3}.json, /quote, /peek, /feed.json, /last/agent{1,2,3}. Paid inference: /agent{1,2,3} at $0.002 USDC per call via x402. Gasless on-chain minting: POST /api/mint/agent.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: `${BASE_URL}/openapi.json`,
    },
    logo_url: `${BASE_URL}/static/agent3.png`,
    contact_email: 'clawd@solanaclawd.com',
    legal_info_url: `${BASE_URL}/identity`,
  });
});

export default router;
export { AGENTS, AGENT_IDS, BASE_URL, VERSION };
