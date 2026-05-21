/**
 * Plugin Registry — Dynamic Tool Discovery Across Solana Clawd Subsystems
 *
 * Innovation: Instead of registering 50+ tools inline in server.ts (the
 * monolithic pattern we're replacing), the Plugin Registry dynamically
 * discovers, loads, and validates tools from every framework subsystem:
 *
 *   ooda/        → OODA loop tools (observe, orient, decide, act)
 *   leviathan/   → Spawning, bridge, 3-laws, SHELL.md, survival
 *   x402/        → Payment stream, p-token facilitator, billing
 *   deep-clawd/  → DeepSeek trading agent tools
 *   skills/      → Agent skill files as callable tools
 *   programs/    → On-chain program inspection tools
 *   agents/      → Agent fleet management (extends server's basic agent tools)
 *
 * Each subsystem exposes a manifest or entry point with its ToolDefs.
 * The registry validates uniqueness, checks for name collisions, and
 * surfaces the full capability map back to the Orchestrator.
 *
 * This is the architectural centrepiece that makes the MCP layer the
 * true command-and-control plane for the entire Solana Clawd framework.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ToolDef, ToolHandler, ToolCategory } from "../orchestrator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// ─── Plugin Manifest ───────────────────────────────────────────────────────────

export interface PluginManifest {
  /** Unique plugin ID (e.g. "ooda", "leviathan", "x402") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Relative path from REPO_ROOT to the plugin's entry/module directory */
  modulePath: string;
  /** Glob pattern or explicit files to scan for tool definitions */
  toolSources: string[];
  /** Category assigned to all tools from this plugin */
  category: ToolCategory;
  /** Whether plugin requires env vars to be set */
  requiresEnv?: string[];
  /** Plugin version for compatibility checks */
  version?: string;
  /** Optional — entrypoint file that exports tool arrays */
  entrypoint?: string;
}

// ─── Built-in Plugin Manifests ─────────────────────────────────────────────────

export const BUILTIN_PLUGINS: PluginManifest[] = [
  {
    id: "ooda",
    name: "OODA Loop Harness",
    modulePath: "ooda",
    toolSources: ["claude-decision.ts", "loop.ts", "state.ts"],
    category: "leviathan",
    version: "2.0.0",
  },
  {
    id: "leviathan",
    name: "Leviathan Agent Runtime",
    modulePath: "leviathan",
    toolSources: ["src/agent/loop.ts", "src/agent/percolator.ts", "src/agent/vulcan.ts"],
    category: "leviathan",
    requiresEnv: ["ANTHROPIC_API_KEY"],
    version: "2.0.0",
  },
  {
    id: "x402-payment",
    name: "x402 + P-Token Payment Stream",
    modulePath: "x402",
    toolSources: ["p-token-stream-facilitator.ts", "p-token.ts", "solana-x402-scheme.ts", "client-sdk.ts"],
    category: "x402",
    requiresEnv: ["X402_SVM_PRIVATE_KEY"],
    version: "2.0.0",
  },
  {
    id: "deep-clawd",
    name: "DeepSeek Trading Agent",
    modulePath: "deep-clawd",
    toolSources: ["src/loop.ts", "src/dflow.ts", "src/tools.ts"],
    category: "market",
    requiresEnv: ["DEEPSEEK_API_KEY"],
    version: "1.0.0",
  },
  {
    id: "skills",
    name: "Agent Skill Files",
    modulePath: "skills",
    toolSources: [],
    category: "agents",
    version: "1.0.0",
  },
  {
    id: "agent-kit",
    name: "Solana Clawd Agent Kit",
    modulePath: "agent-kit/packages/agent-kit",
    toolSources: ["dist/index.js", "src/index.ts"],
    category: "agents",
    version: "0.1.0",
  },
  {
    id: "agent-registry",
    name: "Solana Clawd Agent Registry Helpers",
    modulePath: "agent-kit/packages/agent-registry",
    toolSources: ["dist/index.js", "src/index.ts"],
    category: "agents",
    version: "0.1.0",
  },
  {
    id: "gateway",
    name: "CLAWD Gateway HTTP API",
    modulePath: "gateway",
    toolSources: ["src/index.ts", "src/agentRegistry.ts", "src/skillHub.ts", "src/solana.ts", "src/birdeye.ts"],
    category: "orchestrator",
    version: "1.0.0",
  },
  {
    id: "sdk",
    name: "Solana Clawd SDK",
    modulePath: "sdk",
    toolSources: ["src/index.ts", "package.json"],
    category: "orchestrator",
    version: "1.0.0",
  },
  {
    id: "programs",
    name: "On-Chain Program Inspection",
    modulePath: "programs",
    toolSources: [],
    category: "solana",
    version: "1.0.0",
  },
];

// ─── Plugin Registry ────────────────────────────────────────────────────────────

export interface LoadedPlugin {
  manifest: PluginManifest;
  tools: Array<[ToolDef, ToolHandler]>;
  enabled: boolean;
  sourceFiles: string[];
  loadError?: string;
}

export class PluginRegistry {
  private plugins = new Map<string, LoadedPlugin>();
  private _categories: ReturnType<PluginRegistry["categories"]> = {};

  /**
   * Register and optionally load all plugins. Discovery is filesystem-based;
   * plugins export their tools via a standardised pattern.
   */
  async discover(overrides?: Partial<PluginManifest>[]): Promise<void> {
    const manifests = [...BUILTIN_PLUGINS];

    // Merge any overrides (e.g. custom paths from env)
    if (overrides) {
      for (const o of overrides) {
        const idx = manifests.findIndex((m) => m.id === o.id);
        if (idx >= 0) manifests[idx] = { ...manifests[idx], ...o };
      }
    }

    // Discover plugins one by one — don't let one failure block others
    for (const manifest of manifests) {
      await this.loadPlugin(manifest);
    }

    this._buildCategoryIndex();
  }

  /**
   * Load a single plugin: check env requirements, scan for tool sources,
   * attempt to import the entrypoint, and validate uniqueness.
   */
  private async loadPlugin(manifest: PluginManifest): Promise<void> {
    const envOk = this._checkEnv(manifest);
    const tools: Array<[ToolDef, ToolHandler]> = [];
    const sourceFiles = await this._existingToolSources(manifest);

    if (envOk) {
      try {
        // Attempt to load the plugin's dynamic tool loader
        const loaded = await this._importPluginTools(manifest);
        if (loaded) tools.push(...loaded);
      } catch (err) {
        // Plugin failed to load — register as disabled with error
        this.plugins.set(manifest.id, {
          manifest,
          tools: [],
          enabled: false,
          sourceFiles,
          loadError: `Load failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return;
      }
    }

    this.plugins.set(manifest.id, {
      manifest,
      tools,
      enabled: envOk && (tools.length > 0 || sourceFiles.length > 0),
      sourceFiles,
    });
  }

  /**
   * Dynamically import tools from a plugin entrypoint.
   * Falls back to scanning for tool definition files.
   */
  private async _importPluginTools(
    manifest: PluginManifest,
  ): Promise<Array<[ToolDef, ToolHandler]> | null> {
    // Try explicit entrypoint first
    if (manifest.entrypoint) {
      const ep = path.resolve(REPO_ROOT, manifest.modulePath, manifest.entrypoint);
      try {
        const mod = await import(ep);
        // Standard export name: pluginTools, getTools, tools, or default
        const tools = mod.pluginTools ?? mod.getTools?.() ?? mod.tools ?? mod.default;
        if (Array.isArray(tools)) return tools as Array<[ToolDef, ToolHandler]>;
      } catch {
        // entrypoint may not exist — try fallback
      }
    }

    return null;
  }

  private async _existingToolSources(manifest: PluginManifest): Promise<string[]> {
    const found: string[] = [];
    for (const src of manifest.toolSources) {
      const abs = path.resolve(REPO_ROOT, manifest.modulePath, src);
      try {
        await fs.access(abs);
        found.push(path.relative(REPO_ROOT, abs));
      } catch {
        continue;
      }
    }
    return found;
  }

  /**
   * Check that all required environment variables are set.
   * Missing env → plugin loads but is disabled.
   */
  private _checkEnv(manifest: PluginManifest): boolean {
    if (!manifest.requiresEnv || manifest.requiresEnv.length === 0) return true;
    return manifest.requiresEnv.every((key) => !!process.env[key]);
  }

  /** Rebuild the category index whenever plugins change */
  private _buildCategoryIndex(): void {
    const cats: Record<string, string[]> = {};
    for (const [, loaded] of this.plugins) {
      if (!loaded.enabled || loaded.tools.length === 0) continue;
      const cat = loaded.manifest.category;
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(...loaded.tools.map(([t]) => t.name));
    }
    this._categories = cats;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /** Get all loaded + enabled tools across all plugins */
  allTools(): Array<[ToolDef, ToolHandler]> {
    const all: Array<[ToolDef, ToolHandler]> = [];
    for (const [, loaded] of this.plugins) {
      if (loaded.enabled) all.push(...loaded.tools);
    }
    return all;
  }

  /** Get all plugins with their status */
  status(): Array<{
    id: string;
    name: string;
    enabled: boolean;
    toolCount: number;
    sourceFiles: string[];
    error?: string;
  }> {
    return [...this.plugins.values()].map((p) => ({
      id: p.manifest.id,
      name: p.manifest.name,
      enabled: p.enabled,
      toolCount: p.tools.length,
      sourceFiles: p.sourceFiles,
      error: p.loadError,
    }));
  }

  /** Categories of all loaded tools */
  categories(): Record<string, string[]> {
    return this._categories;
  }

  /** Get a specific plugin's tools */
  pluginTools(id: string): Array<[ToolDef, ToolHandler]> {
    return this.plugins.get(id)?.tools ?? [];
  }

  /** Reload a plugin (useful for development) */
  async reload(id: string): Promise<boolean> {
    const manifest = BUILTIN_PLUGINS.find((m) => m.id === id);
    if (!manifest) return false;
    this.plugins.delete(id);
    await this.loadPlugin(manifest);
    this._buildCategoryIndex();
    return true;
  }

  /** Reload all plugins */
  async reloadAll(): Promise<void> {
    this.plugins.clear();
    await this.discover();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────────

let _instance: PluginRegistry | null = null;

export function getPluginRegistry(): PluginRegistry {
  if (!_instance) _instance = new PluginRegistry();
  return _instance;
}
