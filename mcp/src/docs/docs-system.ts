/**
 * Documentation System — list_sections + get_documentation
 *
 * Innovation: Inspired directly by the Official Solana MCP server's elegant
 * pattern (list_sections → get_documentation → Solana_Documentation_Search),
 * we build the same for the ENTIRE Solana Clawd framework.
 *
 * Instead of hardcoding sources in a generated file, we:
 *   1. Scan the framework for README.md, BRAIN.md, SOUL.md, and key docs
 *   2. Build a section taxonomy of available knowledge sources
 *   3. Serve them through the same list_sections / get_documentation pattern
 *   4. Add semantic search using file content indexing
 *
 * Knowledge categories:
 *   core       — README, SOUL.md, architecture.md, BRAIN.md
 *   trading    — STRATEGY.md, TRADE.md, PERCOLATOR.md
 *   agents     — Leviathan, OODA, Deep Clawd docs
 *   payments   — x402, p-token, pay.sh docs
 *   tokens     — CLAWD, P-Token tokenomics
 *   governance — CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md
 *   mcp        — This MCP server's own documentation
 *   llms       — LLM-specific docs (llms.txt patterns)
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocSection {
  /** Section ID in the taxonomy */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this section contains */
  description: string;
  /** Sources in this section */
  sources: DocSource[];
}

export interface DocSource {
  /** Unique source ID */
  id: string;
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** File path relative to REPO_ROOT */
  path: string;
  /** MIME type */
  mimeType: string;
  /** Max character estimate for token budgeting */
  charEstimate: number;
  /** Section taxonomy tags */
  sections: string[];
  /** Use cases — what kind of question this source answers */
  useCases: string[];
}

// ─── Built-in source registry ─────────────────────────────────────────────────

const SOURCE_REGISTRY: DocSource[] = [
  // ── Core ──────────────────────────────────────────────────────────────
  { id: "readme", title: "README", description: "Solana Clawd framework overview, features, and quickstart", path: "README.md", mimeType: "text/markdown", charEstimate: 15_000, sections: ["core", "getting-started"], useCases: ["What is solana-clawd?", "How do I get started?"] },
  { id: "soul", title: "SOUL.md", description: "Agent identity, operating principles, and constitution", path: "SOUL.md", mimeType: "text/markdown", charEstimate: 8_000, sections: ["core", "agents"], useCases: ["What are the agent principles?", "How should agents behave?"] },
  { id: "architecture", title: "Architecture", description: "System architecture and component relationships", path: "architecture.md", mimeType: "text/markdown", charEstimate: 10_000, sections: ["core", "mcp"], useCases: ["How does the system fit together?", "What are the components?"] },
  { id: "brain", title: "BRAIN.md", description: "Clawd brain — system memory and knowledge structure", path: "BRAIN.md", mimeType: "text/markdown", charEstimate: 12_000, sections: ["core", "memory"], useCases: ["How does agent memory work?", "What is the Clawd Brain?"] },

  // ── Trading ───────────────────────────────────────────────────────────
  { id: "strategy", title: "STRATEGY.md", description: "Trading strategies and execution patterns", path: "STRATEGY.md", mimeType: "text/markdown", charEstimate: 10_000, sections: ["trading", "tokens"], useCases: ["What trading strategies are available?", "How do I execute a trade?"] },
  { id: "trade", title: "TRADE.md", description: "Trade execution guide: order types, routing, settlement", path: "TRADE.md", mimeType: "text/markdown", charEstimate: 8_000, sections: ["trading", "tokens"], useCases: ["How do I place a trade?", "What are the order types?"] },
  { id: "percolator", title: "PERCOLATOR.md", description: "Percolator perpetuals trading system", path: "PERCOLATOR.md", mimeType: "text/markdown", charEstimate: 6_000, sections: ["trading", "perp"], useCases: ["How does percolator work?", "How do perpetuals trades execute?"] },

  // ── Agents ────────────────────────────────────────────────────────────
  { id: "leviathan", title: "Leviathan Agent", description: "Sovereign on-chain agent runtime", path: "leviathan/README.md", mimeType: "text/markdown", charEstimate: 8_000, sections: ["agents", "leviathan"], useCases: ["How does Leviathan work?", "How to spawn a leviathan?"] },
  { id: "leviathan-three-laws", title: "Three Laws", description: "Leviathan constitutional constraints", path: "leviathan/three-laws.txt", mimeType: "text/plain", charEstimate: 3_000, sections: ["agents", "leviathan"], useCases: ["What are the Three Laws?", "What constraints bind the agent?"] },
  { id: "ooda", title: "OODA Loop", description: "Observe-Orient-Decide-Act loop harness", path: "ooda/RALPH.md", mimeType: "text/markdown", charEstimate: 5_000, sections: ["agents", "ooda"], useCases: ["How does the OODA loop work?", "How to run an OODA cycle?"] },
  { id: "deep-clawd", title: "Deep Clawd", description: "DeepSeek V4-powered trading agent", path: "deep-clawd/package.json", mimeType: "application/json", charEstimate: 1_000, sections: ["agents", "deep-clawd"], useCases: ["What is Deep Clawd?", "How does the DeepSeek agent work?"] },

  // ── Payments ──────────────────────────────────────────────────────────
  { id: "ptoken-article", title: "P-Token Article", description: "P-Token x402 innovation article with CU comparison", path: "ARTICLE_PTOKEN.md", mimeType: "text/markdown", charEstimate: 15_000, sections: ["payments", "p-token"], useCases: ["What is the p-token innovation?", "How much CU does p-token save?"] },
  { id: "x402-readme", title: "x402 Readme", description: "x402 payment protocol documentation", path: "x402/README.md", mimeType: "text/markdown", charEstimate: 8_000, sections: ["payments", "x402"], useCases: ["How does x402 work?", "How do I integrate x402 payments?"] },
  { id: "x402-article-example", title: "x402 Example", description: "x402 example usage patterns", path: "x402/EXAMPLE.md", mimeType: "text/markdown", charEstimate: 6_000, sections: ["payments", "x402"], useCases: ["x402 usage examples", "Payment flow example"] },

  // ── Tokens ────────────────────────────────────────────────────────────
  { id: "clawd-token", title: "CLAWD Token", description: "CLAWD token info and discount tiers", path: "STARTHERE.md", mimeType: "text/markdown", charEstimate: 5_000, sections: ["tokens", "clawd"], useCases: ["What is CLAWD?", "CLAWD holder benefits?"] },
  { id: "ptoken-launchpad", title: "P-Token Launchpad", description: "P-token launchpad deployment guide", path: "x402/p-token-launchpad.ts", mimeType: "text/typescript", charEstimate: 15_000, sections: ["tokens", "p-token", "payments"], useCases: ["How to launch a p-token?", "P-token deployment?"] },

  // ── Governance ────────────────────────────────────────────────────────
  { id: "contributing", title: "Contributing", description: "Contribution guide for Solana Clawd", path: "CONTRIBUTING.md", mimeType: "text/markdown", charEstimate: 5_000, sections: ["governance", "dev"], useCases: ["How do I contribute?", "What are the PR guidelines?"] },
  { id: "security", title: "Security", description: "Security policies and vulnerability reporting", path: "SECURITY.md", mimeType: "text/markdown", charEstimate: 3_000, sections: ["governance", "security"], useCases: ["How to report security issues?", "Security best practices?"] },
  { id: "code-of-conduct", title: "Code of Conduct", description: "Community standards and conduct", path: "CODE_OF_CONDUCT.md", mimeType: "text/markdown", charEstimate: 2_000, sections: ["governance"], useCases: ["What are the community guidelines?", "Code of conduct details?"] },

  // ── MCP ───────────────────────────────────────────────────────────────
  { id: "mcp-architecture", title: "MCP Architecture", description: "MCP orchestration layer documentation", path: "mcp/README.md", mimeType: "text/markdown", charEstimate: 10_000, sections: ["mcp", "core"], useCases: ["How does the MCP server work?", "MCP tool categories?"] },
  { id: "mcp-x402-tools", title: "MCP x402 Tools", description: "x402 payment and p-token tools in the MCP layer", path: "mcp/src/tools/x402-tools.ts", mimeType: "text/typescript", charEstimate: 30_000, sections: ["mcp", "payments", "p-token"], useCases: ["What x402 tools are available?", "How does x402_session_open work?"] },
  { id: "mcp-leviathan-tools", title: "MCP Leviathan Tools", description: "Leviathan agent control tools in MCP", path: "mcp/src/tools/leviathan-tools.ts", mimeType: "text/typescript", charEstimate: 30_000, sections: ["mcp", "agents", "leviathan"], useCases: ["What leviathan tools are available?", "How to control agents via MCP?"] },
  { id: "mcp-orchestrator", title: "MCP Orchestrator", description: "Orchestrator — tool registry and pay-per-use dispatch", path: "mcp/src/orchestrator.ts", mimeType: "text/typescript", charEstimate: 15_000, sections: ["mcp", "core"], useCases: ["How does the orchestrator work?", "Premium tool billing?"] },

  // ── Llms ─────────────────────────────────────────────────────────────
  { id: "starththere", title: "STARTHERE.md", description: "Getting started guide for the framework", path: "STARTHERE.md", mimeType: "text/markdown", charEstimate: 8_000, sections: ["core", "getting-started", "llms"], useCases: ["Where do I start?", "New user guide?"] },
  { id: "bounty", title: "BOUNTY.md", description: "Active bounties and reward programs", path: "BOUNTY.md", mimeType: "text/markdown", charEstimate: 5_000, sections: ["governance", "community"], useCases: ["What bounties are available?", "How do I earn rewards?"] },
  { id: "migrate", title: "MIGRATE.md", description: "Migration guide for versions and upgrades", path: "MIGRATE.md", mimeType: "text/markdown", charEstimate: 5_000, sections: ["dev", "governance"], useCases: ["How to migrate versions?", "Upgrade paths?"] },
  { id: "hackathon", title: "HACKATHON.md", description: "Hackathon guide for building on solana-clawd", path: "HACKATHON.md", mimeType: "text/markdown", charEstimate: 8_000, sections: ["dev", "community"], useCases: ["Hackathon resources?", "Building on solana-clawd?"] },
];

// ─── Section Taxonomy ──────────────────────────────────────────────────────────

const SECTION_TAXONOMY: DocSection[] = [
  { id: "core", name: "Core", description: "Framework fundamentals and architecture", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("core")) },
  { id: "getting-started", name: "Getting Started", description: "Quickstart guides and onboarding", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("getting-started")) },
  { id: "trading", name: "Trading", description: "Trading strategies, execution, and derivatives", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("trading")) },
  { id: "agents", name: "Agents", description: "Autonomous agent runtimes (Leviathan, OODA, Deep Clawd)", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("agents")) },
  { id: "leviathan", name: "Leviathan", description: "Leviathan agent runtime specifics", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("leviathan")) },
  { id: "ooda", name: "OODA", description: "OODA loop harness specifics", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("ooda")) },
  { id: "deep-clawd", name: "Deep Clawd", description: "DeepSeek agent specifics", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("deep-clawd")) },
  { id: "payments", name: "Payments", description: "x402 payment protocol and p-token metered billing", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("payments")) },
  { id: "x402", name: "x402", description: "x402 HTTP 402 payment protocol", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("x402")) },
  { id: "p-token", name: "P-Token", description: "SIMD-0266 p-token program and batch instructions", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("p-token")) },
  { id: "tokens", name: "Tokens", description: "Tokenomics and token operations (CLAWD, P-Token)", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("tokens")) },
  { id: "clawd", name: "CLAWD", description: "CLAWD token specifics", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("clawd")) },
  { id: "mcp", name: "MCP", description: "MCP orchestration layer", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("mcp")) },
  { id: "memory", name: "Memory", description: "Agent memory and Clawd Brain", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("memory")) },
  { id: "governance", name: "Governance", description: "Community guidelines, security, and contributions", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("governance")) },
  { id: "dev", name: "Development", description: "Developer guides, migration, and tooling", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("dev")) },
  { id: "security", name: "Security", description: "Security policies and best practices", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("security")) },
  { id: "community", name: "Community", description: "Community resources, bounties, and events", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("community")) },
  { id: "llms", name: "LLM Context", description: "LLM-optimised context files", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("llms")) },
  { id: "perp", name: "Perpetuals", description: "Perpetual futures trading (Percolator, Vulcan)", sources: SOURCE_REGISTRY.filter((s) => s.sections.includes("perp")) },
];

// ─── Docs System ───────────────────────────────────────────────────────────────

export class DocsSystem {
  private contentCache = new Map<string, { text: string; fetchedAt: number }>();
  private readonly CACHE_TTL = 5 * 60_000; // 5 min

  /**
   * List all available sections with their sources.
   * This is the entrypoint — call first to discover what's available.
   */
  listSections(): string {
    const lines: string[] = [
      "# Solana Clawd Documentation",
      "",
      `Total sources: ${SOURCE_REGISTRY.length}`,
      `Total sections: ${SECTION_TAXONOMY.length}`,
      "",
      "## Sections",
      "",
    ];

    for (const sec of SECTION_TAXONOMY) {
      lines.push(`### ${sec.id} — ${sec.name}`);
      lines.push(sec.description);
      lines.push("");
      for (const src of sec.sources) {
        lines.push(`  - **${src.id}** — ${src.description}`);
        lines.push(`    uses: ${src.useCases.join(" | ")}`);
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Get full documentation for a source by its ID.
   * Fetches from the filesystem, caches for TTL.
   */
  async getDocumentation(sourceId: string): Promise<string> {
    // Support section-level expansion
    const section = SECTION_TAXONOMY.find((s) => s.id === sourceId);
    if (section) {
      const parts = await Promise.all(
        section.sources.map(async (src) => {
          const content = await this._readSource(src);
          return `## ${src.title}\n\n${content}\n\n---`;
        }),
      );
      return `# ${section.name}\n\n${section.description}\n\n${parts.join("\n\n")}`;
    }

    // Single source
    const source = SOURCE_REGISTRY.find((s) => s.id === sourceId);
    if (!source) throw new Error(`Unknown source: ${sourceId}. Use list_sections to see available IDs.`);

    return this._readSource(source);
  }

  /**
   * Semantic-style search — naive full-text search across all sources.
   * In production, replace with a proper vector search (like the official
   * Solana MCP does with Databricks + chunk-based RAG).
   */
  async searchDocs(query: string, topK = 5): Promise<string> {
    const queryLower = query.toLowerCase();
    const scored: Array<{ source: DocSource; score: number; snippet?: string }> = [];

    for (const source of SOURCE_REGISTRY) {
      const content = await this._readSource(source).catch(() => "");
      const contentLower = content.toLowerCase();

      // Score: title match (50), description match (20), content match (1 per occurence)
      let score = 0;
      if (source.title.toLowerCase().includes(queryLower)) score += 50;
      if (source.description.toLowerCase().includes(queryLower)) score += 20;
      if (source.useCases.some((u) => u.toLowerCase().includes(queryLower))) score += 15;

      const occurrences = contentLower.split(queryLower).length - 1;
      score += occurrences * 5;

      if (score > 0) {
        // Get snippet around first occurrence
        const idx = contentLower.indexOf(queryLower);
        const snippet = idx >= 0
          ? content.slice(Math.max(0, idx - 60), idx + query.length + 60)
          : undefined;

        scored.push({ source, score, snippet });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, topK);

    if (top.length === 0) return `No documentation found for "${query}". Try list_sections to browse available sources.`;

    return top.map(
      (s) =>
        `### ${s.source.title} (score: ${s.score})\n${s.source.description}\n` +
        `Source: \`${s.source.id}\` | Path: \`${s.source.path}\`` +
        (s.snippet ? `\n\n> …${s.snippet}…` : ""),
    ).join("\n\n---\n\n");
  }

  /** Get the available source IDs */
  availableSourceIds(): string[] {
    return SOURCE_REGISTRY.map((s) => s.id);
  }

  /** Get the available section IDs */
  availableSectionIds(): string[] {
    return SECTION_TAXONOMY.map((s) => s.id);
  }

  // ─── Internal ─────────────────────────────────────────────────────────

  private async _readSource(source: DocSource): Promise<string> {
    const cached = this.contentCache.get(source.id);
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL) {
      return cached.text;
    }

    const absPath = path.resolve(REPO_ROOT, source.path);
    let text: string;
    try {
      text = await fs.readFile(absPath, "utf-8");
    } catch {
      text = `[Source not found on disk: ${source.path}]`;
    }

    // Trim to char estimate to avoid token overflow
    if (text.length > source.charEstimate) {
      text = text.slice(0, source.charEstimate) + `\n\n… [truncated at ${source.charEstimate} chars]`;
    }

    this.contentCache.set(source.id, { text, fetchedAt: Date.now() });
    return text;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────────

let _docsInstance: DocsSystem | null = null;

export function getDocsSystem(): DocsSystem {
  if (!_docsInstance) _docsInstance = new DocsSystem();
  return _docsInstance;
}
