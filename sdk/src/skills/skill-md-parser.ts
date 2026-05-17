/**
 * Minimal SKILL.md frontmatter parser.
 *
 * Skills ship a Markdown file with a YAML-ish frontmatter block describing
 * the skill identity, requirements, and install hints. We only need a tiny
 * subset to wire skills into the leviathan's tool surface, so this parser
 * deliberately avoids pulling in a full YAML dependency.
 *
 *   ---
 *   name: clawd-code-skill
 *   description: Control Clawd Code via MCP protocol.
 *   homepage: https://...
 *   metadata: { "openclawd": { "emoji": "🤖", "requires": { "bins": ["node"] } } }
 *   ---
 */

import { readFileSync } from 'node:fs';

export interface SkillFrontmatter {
  name: string;
  description: string;
  homepage?: string;
  emoji?: string;
  requiresBins?: string[];
  requiresEnv?: string[];
  raw: Record<string, string>;
}

export function parseSkillMd(filepath: string): SkillFrontmatter | null {
  const text = readFileSync(filepath, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const raw: Record<string, string> = {};
  const lines = match[1].split('\n');
  let key: string | null = null;
  let value = '';
  let depth = 0;

  for (const line of lines) {
    if (depth === 0 && /^[a-zA-Z_][\w-]*\s*:/.test(line)) {
      if (key) raw[key] = value.trim();
      const colon = line.indexOf(':');
      key = line.slice(0, colon).trim();
      value = line.slice(colon + 1);
    } else if (key) {
      value += `\n${line}`;
    }
    depth += (line.match(/[{[]/g) || []).length;
    depth -= (line.match(/[}\]]/g) || []).length;
  }
  if (key) raw[key] = value.trim();

  let emoji: string | undefined;
  let requiresBins: string[] | undefined;
  let requiresEnv: string[] | undefined;
  if (raw.metadata) {
    try {
      type SkillMeta = {
        emoji?: string;
        requires?: { bins?: string[]; env?: string[] };
      };
      const meta = JSON.parse(raw.metadata.replace(/'/g, '"')) as {
        openclawd?: SkillMeta;
        solanaos?: SkillMeta;
      };
      // Accept either `openclawd` (canonical) or `solanaos` (legacy upstream
      // skills vendored from openclawd/solanaos). New skills should use
      // `openclawd`. Both produce identical behaviour at runtime.
      const so = meta.openclawd ?? meta.solanaos;
      if (so) {
        emoji = so.emoji;
        requiresBins = so.requires?.bins;
        requiresEnv = so.requires?.env;
      }
    } catch {
      /* tolerate malformed metadata blocks */
    }
  }

  if (!raw.name || !raw.description) return null;

  return {
    name: raw.name.replace(/^['"]|['"]$/g, ''),
    description: raw.description.replace(/^['"]|['"]$/g, ''),
    homepage: raw.homepage,
    emoji,
    requiresBins,
    requiresEnv,
    raw,
  };
}
