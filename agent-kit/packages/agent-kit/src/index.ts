import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export type JsonObject = Record<string, unknown>;

export interface SolanaClawdAgent {
  author?: string;
  config: {
    systemRole: string;
    openingMessage?: string;
    openingQuestions?: string[];
    [key: string]: unknown;
  };
  createdAt?: string;
  homepage?: string;
  identifier: string;
  meta: {
    avatar?: string;
    category?: string;
    description?: string;
    tags?: string[];
    title?: string;
    [key: string]: unknown;
  };
  schemaVersion?: number;
  tokenUsage?: number;
  solana?: {
    capabilities?: string[];
    metaplexSkills?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SolanaClawdCatalogEntry {
  identifier: string;
  title: string;
  description: string;
  avatar: string;
  tags: string[];
  category: string;
  author: string;
  capabilities: string[];
  metaplexSkills: string[];
  deploy: {
    json: string;
    chat: string;
    mint: string;
    mcp: string;
    registration: string;
  };
  [key: string]: unknown;
}

export interface SolanaClawdRuntimeProfile {
  agent: SolanaClawdAgent;
  catalogEntry?: SolanaClawdCatalogEntry;
  templates: {
    base: JsonObject;
    full: JsonObject;
    attested: JsonObject;
  };
  manifest?: JsonObject;
}

export interface SolanaClawdAgentKitOptions {
  agentsDir?: string;
}

const DEFAULT_AGENT_DIR = "../agents";
const REQUIRED_TEMPLATE_FILES = {
  base: "agent-template.json",
  full: "agent-template-full.json",
  attested: "agent-template-attested.json",
} as const;

export class SolanaClawdAgentKit {
  readonly agentsDir: string;
  readonly srcDir: string;

  constructor(options: SolanaClawdAgentKitOptions = {}) {
    this.agentsDir = resolve(
      options.agentsDir ??
        process.env.SOLANA_CLAWD_AGENTS_DIR ??
        DEFAULT_AGENT_DIR,
    );
    this.srcDir = join(this.agentsDir, "src");
  }

  listAgents(): SolanaClawdAgent[] {
    this.assertAgentsDir();

    return readdirSync(this.srcDir)
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file) => this.readAgentFile(file));
  }

  loadAgent(identifier: string): SolanaClawdAgent {
    const filename = identifier.endsWith(".json")
      ? identifier
      : `${identifier}.json`;
    return this.readAgentFile(filename);
  }

  loadCatalog(): JsonObject {
    return this.readJson(join(this.agentsDir, "agents-catalog.json"));
  }

  loadManifest(): JsonObject {
    return this.readJson(join(this.agentsDir, "agents-manifest.json"));
  }

  loadTemplates(): SolanaClawdRuntimeProfile["templates"] {
    return {
      base: this.readJson(join(this.agentsDir, REQUIRED_TEMPLATE_FILES.base)),
      full: this.readJson(join(this.agentsDir, REQUIRED_TEMPLATE_FILES.full)),
      attested: this.readJson(
        join(this.agentsDir, REQUIRED_TEMPLATE_FILES.attested),
      ),
    };
  }

  createRuntimeProfile(identifier: string): SolanaClawdRuntimeProfile {
    const agent = this.loadAgent(identifier);
    const catalogEntry = this.findCatalogEntry(agent.identifier);

    return {
      agent,
      catalogEntry,
      templates: this.loadTemplates(),
      manifest: this.loadManifest(),
    };
  }

  toCatalogEntry(agent: SolanaClawdAgent): SolanaClawdCatalogEntry {
    const id = agent.identifier;
    const tags = agent.meta.tags ?? [];
    const capabilities = agent.solana?.capabilities ?? [];
    const metaplexSkills =
      agent.solana?.metaplexSkills ??
      deriveMetaplexSkills(capabilities, tags);

    return {
      identifier: id,
      title: agent.meta.title ?? id,
      description: agent.meta.description ?? "",
      avatar: agent.meta.avatar ?? "SC",
      tags,
      category: agent.meta.category ?? "defi",
      author: agent.author ?? "solana-clawd",
      createdAt: agent.createdAt ?? null,
      openingMessage: agent.config.openingMessage ?? null,
      openingQuestions: agent.config.openingQuestions ?? [],
      tokenUsage: agent.tokenUsage ?? null,
      capabilities,
      metaplexSkills,
      deploy: {
        json: `/api/agents/catalog/${encodeURIComponent(id)}.json`,
        chat: `/agents/chat?agent=${encodeURIComponent(id)}`,
        mint: `/agents/mint?template=${encodeURIComponent(id)}`,
        mcp: `/api/agents/catalog/${encodeURIComponent(id)}.json`,
        registration: `/api/agents/registry/${encodeURIComponent(id)}.json`,
      },
    };
  }

  assertSolanaClawdAgent(agent: SolanaClawdAgent): void {
    const tags = agent.meta.tags ?? [];
    const id = agent.identifier.toLowerCase();
    const owned =
      id.includes("solana") ||
      id.includes("clawd") ||
      tags.includes("solana") ||
      tags.includes("clawd") ||
      tags.includes("solana-clawd") ||
      agent.author === "solana-clawd" ||
      agent.author === "x402agent";

    if (!owned) {
      throw new Error(
        `Agent ${agent.identifier} is not marked as Solana Clawd owned.`,
      );
    }
  }

  private findCatalogEntry(
    identifier: string,
  ): SolanaClawdCatalogEntry | undefined {
    const catalog = this.loadCatalog();
    const agents = catalog.agents;
    if (!Array.isArray(agents)) return undefined;
    return agents.find(
      (entry): entry is SolanaClawdCatalogEntry =>
        isObject(entry) && entry.identifier === identifier,
    );
  }

  private readAgentFile(filename: string): SolanaClawdAgent {
    const agent = this.readJson(join(this.srcDir, filename));
    if (!isSolanaClawdAgent(agent)) {
      throw new Error(`${filename} is not a valid Solana Clawd agent file.`);
    }
    this.assertSolanaClawdAgent(agent);
    return agent;
  }

  private readJson(filePath: string): JsonObject {
    if (!existsSync(filePath)) {
      throw new Error(`Missing required Solana Clawd file: ${filePath}`);
    }
    try {
      return JSON.parse(readFileSync(filePath, "utf8")) as JsonObject;
    } catch (error) {
      const name = basename(filePath);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse ${name}: ${message}`);
    }
  }

  private assertAgentsDir(): void {
    if (!existsSync(this.srcDir)) {
      throw new Error(`Missing Solana Clawd agents src directory: ${this.srcDir}`);
    }
  }
}

export function deriveMetaplexSkills(
  capabilities: string[],
  tags: string[],
): string[] {
  const skills = new Set<string>();
  const has = (value: string) =>
    capabilities.includes(value) || tags.includes(value);

  if (has("metaplex-mint-agent") || has("metaplex-register-identity")) {
    skills.add("agent-registry");
  }
  if (
    has("metaplex-launch-token-genesis") ||
    has("metaplex-launch-bonding-curve") ||
    tags.includes("genesis")
  ) {
    skills.add("genesis");
  }
  if (has("metaplex-mint-core-nft") || tags.includes("mpl-core")) {
    skills.add("core");
  }
  if (has("metaplex-token-metadata")) {
    skills.add("token-metadata");
  }
  if (
    has("metaplex-mint-cnft") ||
    tags.includes("bubblegum") ||
    tags.includes("cnft")
  ) {
    skills.add("bubblegum");
  }
  if (has("metaplex-deploy-candy-machine") || tags.includes("candy-machine")) {
    skills.add("candy-machine");
  }

  return Array.from(skills);
}

function isSolanaClawdAgent(value: JsonObject): value is SolanaClawdAgent {
  return (
    typeof value.identifier === "string" &&
    isObject(value.config) &&
    typeof value.config.systemRole === "string" &&
    isObject(value.meta)
  );
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
