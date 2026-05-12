#!/usr/bin/env node
/**
 * Generate skills/catalog.json from all SKILL.md files in the skills/ directory.
 *
 * Usage: node scripts/generate-skills-catalog.js
 *
 * Scans skills/ for SKILL.md files, parses YAML frontmatter,
 * categorizes each skill, and outputs a JSON manifest used by
 * the web catalog (web/skills/index.html) and the skill registry.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, '..', 'skills');
const OUTPUT = path.join(SKILLS_DIR, 'catalog.json');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { yaml: null, body: content };
  return { yaml: match[1], body: match[2] };
}

function extractMeta(yamlBlock) {
  const meta = {};
  if (!yamlBlock) return meta;

  const nameMatch = yamlBlock.match(/^name:\s*(.+)$/m);
  const descMatch = yamlBlock.match(/^description:\s*['"]?(.+?)['"]?\s*$/m);
  const versionMatch = yamlBlock.match(/^version:\s*(.+)$/m);
  if (nameMatch) meta.name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
  if (descMatch) meta.description = descMatch[1].trim().replace(/^['"]|['"]$/g, '');
  if (versionMatch) meta.version = versionMatch[1].trim();

  // Try JSON-style metadata
  const metaJsonMatch = yamlBlock.match(/metadata:\s*(\{[\s\S]*?\})/);
  if (metaJsonMatch) {
    try {
      const m = JSON.parse(metaJsonMatch[1].replace(/'/g, '"'));
      if (m.solanaos?.emoji) meta.emoji = m.solanaos.emoji;
    } catch {}
  }
  // Try YAML-style emoji
  if (!meta.emoji) {
    const emojiMatch = yamlBlock.match(/emoji:\s*['"]?([^'"\n]+)/);
    if (emojiMatch) meta.emoji = emojiMatch[1].trim();
  }

  return meta;
}

function categorize(slug) {
  if (/^pump-|^pumpfun/.test(slug)) return 'Pump.fun / Token Launch';
  if (/solana|seeker|qedgen|oracle/.test(slug)) return 'Solana / Blockchain';
  if (/discord|slack|imsg|bluebubbles|himalaya|voice-call/.test(slug)) return 'Communication';
  if (/apple|bear-notes|notion|obsidian|things|trello|ordercli|session-logs|1password/.test(slug)) return 'Productivity';
  if (/coding-agent|swarm|gemini|openai-image|openai-whisper|e2b|cua|skill-creator|sag|model-usage/.test(slug)) return 'AI / Agents';
  if (/gif|video|camsnap|canvas|songsee|sonoscli|spotify|sherpa|peekaboo/.test(slug)) return 'Media';
  if (/gateway|healthcheck|tmux|eightctl|blucli|nano-banana|openhue/.test(slug)) return 'DevOps / Infrastructure';
  if (/browse|blogwatcher|xurl|pdf|summarize|gog|goplaces|weather|wacli|nano-pdf|mcporter/.test(slug)) return 'Web / Research';
  if (/openclaw|clawhub/.test(slug)) return 'Clawd Ecosystem';
  return 'Other';
}

const results = [];
const seen = new Set();

for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
  let filePath;
  let slug;
  if (entry.isDirectory()) {
    filePath = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!fs.existsSync(filePath)) continue;
    slug = entry.name;
  } else if (entry.name.endsWith('.md') && entry.name !== 'catalog.json') {
    slug = entry.name.replace('.md', '');
    // Skip loose .md files if a directory version exists (directory takes priority)
    if (fs.existsSync(path.join(SKILLS_DIR, slug, 'SKILL.md'))) continue;
    filePath = path.join(SKILLS_DIR, entry.name);
  } else continue;

  // Deduplicate by slug
  if (seen.has(slug)) continue;
  seen.add(slug);

  const content = fs.readFileSync(filePath, 'utf8');
  const { yaml, body } = parseFrontmatter(content);
  const meta = extractMeta(yaml);

  if (!meta.name) {
    const heading = body.match(/^#\s+(.+)$/m);
    meta.name = heading ? heading[1].trim() : slug;
  }

  if (!meta.description) {
    const firstPara = body.replace(/^#.+\n+/, '').split(/\n\n/)[0]?.trim() || '';
    meta.description = firstPara.substring(0, 200);
  }

  results.push({
    slug,
    name: meta.name,
    description: meta.description,
    ...(meta.version && { version: meta.version }),
    ...(meta.emoji && { emoji: meta.emoji }),
    category: categorize(slug),
  });
}

results.sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug));

fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
console.log(`Generated ${results.length} skills -> ${OUTPUT}`);
