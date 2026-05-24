export interface SolanaClawdRegistryAgent {
  createdAt?: string;
  identifier: string;
  meta: {
    avatar?: string;
    [key: string]: unknown;
  };
}

export interface SolanaClawdRegistryCatalogEntry {
  title: string;
  description: string;
  tags: string[];
  category: string;
}

export interface SolanaClawdRegistryOptions {
  host?: string;
  generatedAt?: string;
  clawdMint?: string;
}

export interface SolanaClawdRegistrationDocument {
  schemaVersion: "erc-8004-agent-registration-v1";
  protocol: "metaplex-agent-registry";
  name: string;
  description: string;
  image: string;
  external_url: string;
  active: true;
  createdAt?: string | null;
  updatedAt: string;
  tags: string[];
  categories: string[];
  owner: {
    organization: "OpenClawd";
    website: string;
    token: {
      symbol: "CLAWD";
      chain: "solana";
      mint: string;
    };
  };
  services: Array<{
    id: string;
    type: "catalog" | "chat" | "mcp";
    endpoint: string;
  }>;
}

const DEFAULT_HOST = "https://x402.wtf";
const DEFAULT_CLAWD_MINT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";

export function createRegistrationDocument(
  agent: SolanaClawdRegistryAgent,
  catalogEntry: SolanaClawdRegistryCatalogEntry,
  options: SolanaClawdRegistryOptions = {},
): SolanaClawdRegistrationDocument {
  const host = trimTrailingSlash(options.host ?? DEFAULT_HOST);
  const encodedId = encodeURIComponent(agent.identifier);
  const image =
    typeof agent.meta.avatar === "string" && agent.meta.avatar.startsWith("http")
      ? agent.meta.avatar
      : `${host}/nich.jpg`;

  return {
    schemaVersion: "erc-8004-agent-registration-v1",
    protocol: "metaplex-agent-registry",
    name: catalogEntry.title,
    description: catalogEntry.description,
    image,
    external_url: `${host}/agents/${encodedId}`,
    active: true,
    createdAt: agent.createdAt ?? null,
    updatedAt: options.generatedAt ?? new Date().toISOString(),
    tags: catalogEntry.tags,
    categories: [catalogEntry.category],
    owner: {
      organization: "OpenClawd",
      website: host,
      token: {
        symbol: "CLAWD",
        chain: "solana",
        mint: options.clawdMint ?? DEFAULT_CLAWD_MINT,
      },
    },
    services: [
      {
        id: "catalog",
        type: "catalog",
        endpoint: `${host}/api/agents/catalog/${encodedId}.json`,
      },
      {
        id: "chat",
        type: "chat",
        endpoint: `${host}/agents/chat?agent=${encodedId}`,
      },
      {
        id: "mcp",
        type: "mcp",
        endpoint: `${host}/api/agents/catalog/${encodedId}.json`,
      },
    ],
  };
}

export function createRegistryBatch(
  entries: Array<{
    agent: SolanaClawdRegistryAgent;
    catalogEntry: SolanaClawdRegistryCatalogEntry;
  }>,
  options: SolanaClawdRegistryOptions = {},
): SolanaClawdRegistrationDocument[] {
  return entries.map(({ agent, catalogEntry }) =>
    createRegistrationDocument(agent, catalogEntry, options),
  );
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

// ---------- Google A2A (agent-to-agent) registration ----------

export interface GoogleA2ASkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  examples?: string[];
}

// Google's Agent-to-Agent (A2A) Agent Card. Publish at
// `${host}/.well-known/agent.json` or register with a Google A2A registry.
export interface GoogleAgentCard {
  protocolVersion: "0.2.0";
  name: string;
  description: string;
  url: string;
  version: string;
  provider: {
    organization: "OpenClawd";
    url: string;
  };
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: GoogleA2ASkill[];
  documentationUrl: string;
  preferredTransport: "JSONRPC";
  _meta: {
    chain: "solana";
    token: { symbol: "CLAWD"; mint: string };
    catalog: string;
    registration: string;
  };
}

export interface GoogleAgentCardOptions extends SolanaClawdRegistryOptions {
  version?: string;
}

export function createGoogleAgentCard(
  agent: SolanaClawdRegistryAgent,
  catalogEntry: SolanaClawdRegistryCatalogEntry,
  options: GoogleAgentCardOptions = {},
): GoogleAgentCard {
  const host = trimTrailingSlash(options.host ?? DEFAULT_HOST);
  const encodedId = encodeURIComponent(agent.identifier);

  return {
    protocolVersion: "0.2.0",
    name: catalogEntry.title,
    description: catalogEntry.description,
    url: `${host}/api/agents/a2a/${encodedId}`,
    version: options.version ?? "1.0.0",
    provider: {
      organization: "OpenClawd",
      url: host,
    },
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["text/plain", "application/json"],
    skills: [
      {
        id: agent.identifier,
        name: catalogEntry.title,
        description: catalogEntry.description,
        tags: catalogEntry.tags,
      },
    ],
    documentationUrl: `${host}/agents/${encodedId}`,
    preferredTransport: "JSONRPC",
    _meta: {
      chain: "solana",
      token: { symbol: "CLAWD", mint: options.clawdMint ?? DEFAULT_CLAWD_MINT },
      catalog: `${host}/api/agents/catalog/${encodedId}.json`,
      registration: `${host}/api/agents/registry/${encodedId}.json`,
    },
  };
}
