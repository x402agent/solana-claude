/**
 * SKILL.md Parser
 *
 * Parses SKILL.md files with YAML frontmatter + Markdown body
 * into structured skill definitions.
 * Follows the SKILL.md convention (OpenClaw/Anthropic format).
 */

import type { SkillFrontmatter, Skill, SkillSource } from "../types.js";

/**
 * Parse a SKILL.md file content into frontmatter + body.
 * Handles YAML frontmatter delimited by --- markers.
 */
export function parseSkillMd(
  content: string,
  filePath: string,
  source: SkillSource = "builtin",
): Skill | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("---")) {
    // No frontmatter -- treat entire content as instructions
    // with a name derived from the directory
    const name = extractNameFromPath(filePath);
    return {
      name,
      description: "",
      autoActivate: true,
      instructions: trimmed,
      source,
      path: filePath,
      enabled: true,
      installedAt: new Date().toISOString(),
    };
  }

  // Find the closing ---
  const endIndex = trimmed.indexOf("---", 3);
  if (endIndex === -1) {
    return null;
  }

  const frontmatterRaw = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 3).trim();

  // Parse YAML frontmatter manually (avoid requiring gray-matter at runtime)
  const frontmatter = parseYamlFrontmatter(frontmatterRaw);
  if (!frontmatter) {
    return null;
  }

  return {
    name: frontmatter.name || extractNameFromPath(filePath),
    description: frontmatter.description || "",
    autoActivate: frontmatter["auto-activate"] !== false,
    requires: frontmatter.requires,
    instructions: body,
    source,
    path: filePath,
    enabled: true,
    installedAt: new Date().toISOString(),
  };
}

/**
 * Parse simple YAML frontmatter without a full YAML parser.
 * Handles the subset used by SKILL.md files.
 */
function parseYamlFrontmatter(raw: string): SkillFrontmatter | null {
  try {
    const result: Record<string, any> = {};
    const lines = raw.split("\n");
    let currentKey = "";
    let inList = false;
    let listKey = "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;

      // Check for list items
      if (trimmedLine.startsWith("- ") && inList) {
        const value = trimmedLine.slice(2).trim().replace(/^["']|["']$/g, "");
        if (!result[listKey]) result[listKey] = [];
        if (Array.isArray(result[listKey])) {
          result[listKey].push(value);
        }
        continue;
      }

      // Check for key: value
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex === -1) continue;

      const key = trimmedLine.slice(0, colonIndex).trim();
      const value = trimmedLine.slice(colonIndex + 1).trim();

      if (key === "requires") {
        result.requires = {};
        currentKey = "requires";
        inList = false;
        continue;
      }

      if (currentKey === "requires" && line.startsWith("  ")) {
        // Nested under requires
        const nestedKey = key.trim();
        if (!value || value === "") {
          // Start of list
          inList = true;
          listKey = `requires.${nestedKey}`;
          if (!result.requires) result.requires = {};
          result.requires[nestedKey] = [];
        } else {
          // Inline list: [item1, item2]
          if (value.startsWith("[") && value.endsWith("]")) {
            const items = value
              .slice(1, -1)
              .split(",")
              .map((s) => s.trim().replace(/^["']|["']$/g, ""));
            if (!result.requires) result.requires = {};
            result.requires[nestedKey] = items;
          }
        }
        continue;
      }

      inList = false;
      currentKey = key;

      if (!value) continue;

      // Parse value
      if (value === "true") {
        result[key] = true;
      } else if (value === "false") {
        result[key] = false;
      } else {
        result[key] = value.replace(/^["']|["']$/g, "");
      }
    }

    return result as SkillFrontmatter;
  } catch {
    return null;
  }
}

function extractNameFromPath(filePath: string): string {
  // Extract skill name from path like ~/.automaton/skills/web-scraper/SKILL.md
  const parts = filePath.split("/");
  const skillMdIndex = parts.findIndex(
    (p) => p.toLowerCase() === "skill.md",
  );
  if (skillMdIndex > 0) {
    return parts[skillMdIndex - 1];
  }
  return parts[parts.length - 1].replace(/\.md$/i, "");
}
