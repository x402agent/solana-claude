import { readFile, readdir } from "node:fs/promises";
import { join, basename } from "node:path";

export interface VulcanCatalogCommand {
  name: string;
  command: string;
  group: string;
  description: string;
  auth_required: boolean;
  dangerous: boolean;
  parameters: Array<Record<string, unknown>>;
  example?: string;
}

export interface VulcanToolCatalog {
  schema_version: string;
  cli_version: string;
  description: string;
  groups: Record<string, string>;
  commands: VulcanCatalogCommand[];
}

export interface VulcanMcpConfig {
  mcpServers?: Record<string, { command: string; args?: string[] }>;
}

export interface VulcanSkillEntry {
  name: string;
  path: string;
  category: "vulcan" | "clawd" | "other";
}

export interface VulcanCatalogSummary {
  cliVersion: string;
  groupCount: number;
  commandCount: number;
  dangerousCommands: number;
  groups: Array<{ name: string; description: string; commandCount: number }>;
  mcpServer?: { command: string; args: string[] };
  skills: VulcanSkillEntry[];
}

async function readJsonFile<T>(path: string): Promise<T> {
  const text = await readFile(path, "utf8");
  return JSON.parse(text) as T;
}

export async function loadVulcanToolCatalog(repoRoot: string): Promise<VulcanToolCatalog> {
  return readJsonFile<VulcanToolCatalog>(
    join(repoRoot, "vulcan-cli-master", "agents", "tool-catalog.json"),
  );
}

export async function loadVulcanMcpConfig(repoRoot: string): Promise<VulcanMcpConfig> {
  return readJsonFile<VulcanMcpConfig>(join(repoRoot, "vulcan-cli-master", ".mcp.json"));
}

async function enumerateSkills(repoRoot: string): Promise<VulcanSkillEntry[]> {
  const skillsRoot = join(repoRoot, "skills");
  try {
    const entries = await readdir(skillsRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const name = basename(entry.name);
        const category: VulcanSkillEntry["category"] = name.startsWith("vulcan")
          ? "vulcan"
          : name.startsWith("clawd")
            ? "clawd"
            : "other";
        return { name, path: join(skillsRoot, name, "SKILL.md"), category };
      });
  } catch {
    return [];
  }
}

export async function summarizeVulcanCatalog(repoRoot: string): Promise<VulcanCatalogSummary> {
  const [catalog, mcp, skills] = await Promise.all([
    loadVulcanToolCatalog(repoRoot),
    loadVulcanMcpConfig(repoRoot),
    enumerateSkills(repoRoot),
  ]);

  const groups = Object.entries(catalog.groups).map(([name, description]) => ({
    name,
    description,
    commandCount: catalog.commands.filter((command) => command.group === name).length,
  }));

  const dangerousCommands = catalog.commands.filter((command) => command.dangerous).length;
  const mcpServer = mcp.mcpServers?.vulcan;

  return {
    cliVersion: catalog.cli_version,
    groupCount: groups.length,
    commandCount: catalog.commands.length,
    dangerousCommands,
    groups,
    skills,
    ...(mcpServer
      ? { mcpServer: { command: mcpServer.command, args: mcpServer.args ?? [] } }
      : {}),
  };
}
