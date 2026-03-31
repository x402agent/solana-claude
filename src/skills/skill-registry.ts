/**
 * SolanaOS Skill Loader & Registry
 *
 * Adapted from Claude Code's src/skills/ (loadSkillsDir.ts, bundledSkills.ts, mcpSkillBuilders.ts)
 *
 * Loads SKILL.md files from:
 *  1. `skills/` directory (bundled skills shipped with repo)
 *  2. `~/.nanosolana/skills/` (user-installed skills)
 *  3. NanoHub registry (seeker.solanaos.net/api/skills) — remote discovery
 *
 * Each SKILL.md file has YAML frontmatter + markdown body. The loader parses
 * the frontmatter for metadata and exposes the body as the skill's system prompt.
 *
 * The registry uses the same search/tag/capability patterns as Claude Code's
 * internal skill system but wired to the public NanoHub skill marketplace.
 */

import * as fs from "fs/promises";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Skill types
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillMeta {
  /** Unique skill identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Semantic version */
  version?: string;
  /** Author / publisher */
  author?: string;
  /** Searchable tags */
  tags?: string[];
  /** Tool names this skill requires */
  requiredTools?: string[];
  /** Permission level required */
  permissionLevel?: "safe" | "write" | "execute" | "trade";
  /** Whether this skill is enabled */
  enabled?: boolean;
  /** NanoHub registry ID (if sourced from Hub) */
  hubId?: string;
  /** Source URL (NanoHub or GitHub) */
  sourceUrl?: string;
}

export interface Skill {
  meta: SkillMeta;
  /** Full markdown body of the SKILL.md (the actual skill prompt) */
  prompt: string;
  /** Source file path (undefined for remote/runtime-built skills) */
  filePath?: string;
  /** Source: "bundled" | "user" | "nanohub" */
  source: "bundled" | "user" | "nanohub";
}

// ─────────────────────────────────────────────────────────────────────────────
// Frontmatter parser (minimal YAML subset)
// Adapted from Claude Code's skill loading pattern
// ─────────────────────────────────────────────────────────────────────────────

function parseFrontmatter(content: string): { meta: Partial<SkillMeta>; body: string } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    // No frontmatter — try to extract name from first heading
    const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    return { meta: { name: heading ?? "unnamed", description: "" }, body: content };
  }

  const [, yamlBlock, body] = fmMatch;
  const meta: Partial<SkillMeta> = {};

  for (const line of yamlBlock.split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    const trimmed = value.trim().replace(/^['"]|['"]$/g, "");

    switch (key) {
      case "name": meta.name = trimmed; break;
      case "description": meta.description = trimmed; break;
      case "version": meta.version = trimmed; break;
      case "author": meta.author = trimmed; break;
      case "permission": meta.permissionLevel = trimmed as SkillMeta["permissionLevel"]; break;
      case "enabled": meta.enabled = trimmed !== "false"; break;
      case "hub_id": meta.hubId = trimmed; break;
      case "source_url": meta.sourceUrl = trimmed; break;
      case "tags": {
        // Support: tags: trading, solana, research
        meta.tags = trimmed.split(",").map((t) => t.trim()).filter(Boolean);
        break;
      }
      case "required_tools": {
        meta.requiredTools = trimmed.split(",").map((t) => t.trim()).filter(Boolean);
        break;
      }
    }
  }

  return { meta, body: body.trim() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Skill Loader
// ─────────────────────────────────────────────────────────────────────────────

export async function loadSkillFromFile(filePath: string, source: Skill["source"] = "bundled"): Promise<Skill | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const { meta, body } = parseFrontmatter(content);

    if (!meta.name) {
      // Derive name from filename
      meta.name = path.basename(filePath, ".md").toLowerCase().replace(/\s+/g, "-");
    }

    if (meta.enabled === false) return null;

    return {
      meta: {
        name: meta.name,
        description: meta.description ?? "",
        version: meta.version,
        author: meta.author,
        tags: meta.tags ?? [],
        requiredTools: meta.requiredTools ?? [],
        permissionLevel: meta.permissionLevel ?? "safe",
        enabled: meta.enabled ?? true,
        hubId: meta.hubId,
        sourceUrl: meta.sourceUrl,
      },
      prompt: body,
      filePath,
      source,
    };
  } catch {
    return null;
  }
}

export async function loadSkillsDir(
  dir: string,
  source: Skill["source"] = "bundled",
): Promise<Skill[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const skills: Skill[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.match(/\.md$/i)) {
        const skill = await loadSkillFromFile(path.join(dir, entry.name), source);
        if (skill) skills.push(skill);
      } else if (entry.isDirectory()) {
        // Check for SKILL.md inside subdirectory
        const innerPath = path.join(dir, entry.name, "SKILL.md");
        const skill = await loadSkillFromFile(innerPath, source).catch(() => null);
        if (skill) skills.push(skill);
      }
    }

    return skills;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NanoHub Remote Skill builder
// Adapted from Claude Code's mcpSkillBuilders.ts (MCP → Skill conversion)
// ─────────────────────────────────────────────────────────────────────────────

export interface NanoHubSkillEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
  author: string;
  version: string;
  skillMdUrl: string;
  permissionLevel?: string;
}

export async function buildSkillFromNanoHub(entry: NanoHubSkillEntry): Promise<Skill | null> {
  try {
    const res = await fetch(entry.skillMdUrl);
    if (!res.ok) return null;
    const content = await res.text();
    const { body } = parseFrontmatter(content);

    return {
      meta: {
        name: entry.name,
        description: entry.description,
        version: entry.version,
        author: entry.author,
        tags: entry.tags,
        hubId: entry.id,
        sourceUrl: entry.skillMdUrl,
        permissionLevel: (entry.permissionLevel as SkillMeta["permissionLevel"]) ?? "safe",
      },
      prompt: body,
      source: "nanohub",
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Skill Registry
// ─────────────────────────────────────────────────────────────────────────────

export class SkillRegistry {
  private skills = new Map<string, Skill>();

  register(skill: Skill): this {
    this.skills.set(skill.meta.name, skill);
    return this;
  }

  registerAll(skills: Skill[]): this {
    for (const s of skills) this.register(s);
    return this;
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  all(): Skill[] {
    return Array.from(this.skills.values());
  }

  search(query: string): Skill[] {
    const q = query.toLowerCase();
    return this.all().filter(
      (s) =>
        s.meta.name.toLowerCase().includes(q) ||
        s.meta.description.toLowerCase().includes(q) ||
        s.meta.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }

  byTag(tag: string): Skill[] {
    return this.all().filter((s) => s.meta.tags?.includes(tag));
  }

  /** Format skill list for LLM context injection (skills command) */
  toLLMContext(): string {
    const lines = this.all().map((s) =>
      `- **${s.meta.name}**: ${s.meta.description}${s.meta.tags?.length ? ` [${s.meta.tags.join(", ")}]` : ""}`,
    );
    return `## Available Skills\n\n${lines.join("\n")}`;
  }

  /** Get skill prompt for injection into LLM system prompt */
  getPrompt(name: string): string | undefined {
    return this.skills.get(name)?.prompt;
  }

  size(): number {
    return this.skills.size;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap: load all skills from standard locations
// ─────────────────────────────────────────────────────────────────────────────

export async function bootstrapSkillRegistry(opts: {
  repoSkillsDir?: string;    // e.g. "skills/"
  userSkillsDir?: string;    // e.g. "~/.nanosolana/skills/"
  nanoHubEntries?: NanoHubSkillEntry[];
}): Promise<SkillRegistry> {
  const registry = new SkillRegistry();

  // 1. Bundled repo skills
  if (opts.repoSkillsDir) {
    const repoSkills = await loadSkillsDir(opts.repoSkillsDir, "bundled");
    registry.registerAll(repoSkills);
  }

  // 2. User-installed skills
  if (opts.userSkillsDir) {
    const expanded = opts.userSkillsDir.replace(/^~/, process.env.HOME ?? "~");
    const userSkills = await loadSkillsDir(expanded, "user");
    registry.registerAll(userSkills);
  }

  // 3. NanoHub remote skills
  if (opts.nanoHubEntries?.length) {
    const remoteSkills = await Promise.all(
      opts.nanoHubEntries.map((e) => buildSkillFromNanoHub(e)),
    );
    registry.registerAll(remoteSkills.filter(Boolean) as Skill[]);
  }

  return registry;
}
