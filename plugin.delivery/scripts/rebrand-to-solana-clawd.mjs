#!/usr/bin/env node
// Rebrands plugin.delivery from solana-clawd/x402agent/x402agent to solana-clawd.
// - Applies CLAWD theming to every src/*.json plugin entry
// - Sweeps all text files replacing legacy brand strings
// Idempotent: safe to re-run.
//
// Run: node scripts/rebrand-to-solana-clawd.mjs

import { readdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'src');

// Directories to scope the text sweep to. Keep it bounded so we do not touch
// node_modules or binary assets.
const SWEEP_DIRS = ['src', 'api', 'docs', 'public', 'packages', 'locales', 'scripts', 'templates', '.well-known', '.github'];
// Top-level individual files to also sweep.
const SWEEP_FILES = ['README.md', 'README.zh-CN.md', 'package.json', 'AGENTS.md', 'CHANGELOG.md', 'CITATION.cff', 'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'GEMINI.md', 'humans.txt', 'llms.txt', 'llms-full.txt', 'meta.json', 'plugin-template.json', 'schema.json', 'SECURITY.md', 'tsconfig.json', 'vercel.json', 'pnpm-workspace.yaml'];

const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.pdf', '.lock', '.woff', '.woff2', '.ttf', '.eot']);
const SKIP_DIR_PARTS = new Set(['node_modules', '.git', 'dist', 'build', '.vercel', '.next', '.turbo']);

// Replacement pairs — ordered: most specific first, then generic.
const TEXT_REPLACEMENTS = [
  [/SOLANA_CLAWD_PLUGIN_COMPLETE_GUIDE/g, 'SOLANA_CLAWD_PLUGIN_COMPLETE_GUIDE'],
  [/https:\/\/github\.com\/solana-clawd\/[a-zA-Z0-9_.\/-]+/g, 'https://github.com/x402agent/solana-clawd'],
  [/https:\/\/github\.com\/solana-clawd/g, 'https://github.com/x402agent/solana-clawd'],
  [/https:\/\/github\.com\/x402agent\/plugin\.delivery(\.git)?/g, 'https://github.com/x402agent/solana-clawd$1'],
  [/https:\/\/github\.com\/x402agent\/pump-fun-sdk(\.git)?/g, 'https://github.com/x402agent/solana-clawd$1'],
  [/https:\/\/github\.com\/YOUR_USERNAME\/plugin\.delivery\.git/g, 'https://github.com/x402agent/solana-clawd.git'],
  [/github\.com\/x402agent\/[a-zA-Z0-9_.-]+/g, 'github.com/x402agent/solana-clawd'],
  [/github\.com\/x402agent\/[a-zA-Z0-9_.-]+/g, 'github.com/x402agent/solana-clawd'],
  [/x402agent/g, 'x402agent'],
  [/x402agent/g, 'x402agent'],
  [/solana-clawd/g, 'solana-clawd'],
  [/solana-clawd\s*<contact@solana-clawd\.io>/g, 'solana-clawd <contact@solanaos.net>'],
  [/contact@solana-clawd\.io/g, 'contact@solanaos.net'],
  [/solana-clawd\.io/g, 'solanaos.net'],
  [/@solana-clawd\//g, '@solana-clawd/'],
  [/solana-clawd/g, 'solana-clawd'],
  [/solana-clawd/g, 'solana-clawd'],
];

// ---------- Phase 1: plugin JSON theming ----------

const CLAWD_TAGS = ['clawd', 'solana-clawd'];

function themePluginEntry(agent) {
  agent.author = 'solana-clawd';
  agent.homepage = 'https://github.com/x402agent/solana-clawd';

  agent.meta = agent.meta ?? {};
  const tags = Array.isArray(agent.meta.tags) ? [...agent.meta.tags] : [];
  for (const tag of CLAWD_TAGS) {
    if (!tags.includes(tag)) tags.push(tag);
  }
  agent.meta.tags = tags;

  if (typeof agent.meta.description === 'string' && !agent.meta.description.startsWith('[solana-clawd]')) {
    agent.meta.description = `[solana-clawd] ${agent.meta.description} — consumed by CLAWD agents (Scanner/OODA/Analyst) and gated by the CLAWD permission engine.`;
  }

  return agent;
}

async function phaseOnePluginTheming() {
  const files = (await readdir(SRC_DIR))
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(SRC_DIR, f));

  let themed = 0;
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const entry = JSON.parse(raw);
    themePluginEntry(entry);
    await writeFile(file, JSON.stringify(entry, null, 2) + '\n', 'utf8');
    themed += 1;
  }
  console.log(`Phase 1: themed ${themed} plugin entries in src/`);
}

// ---------- Phase 2: text sweep ----------

function shouldSkipPath(path) {
  for (const part of path.split('/')) {
    if (SKIP_DIR_PARTS.has(part)) return true;
  }
  for (const ext of SKIP_EXT) {
    if (path.endsWith(ext)) return true;
  }
  return false;
}

async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (shouldSkipPath(full)) continue;
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
}

function applyReplacements(content) {
  let next = content;
  for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

async function phaseTwoTextSweep() {
  const files = [];
  for (const dir of SWEEP_DIRS) {
    await walk(join(ROOT, dir), files);
  }
  for (const f of SWEEP_FILES) {
    try {
      await stat(join(ROOT, f));
      files.push(join(ROOT, f));
    } catch {
      // missing file — skip
    }
  }

  let changed = 0;
  let scanned = 0;
  for (const file of files) {
    scanned += 1;
    let content;
    try {
      content = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    const next = applyReplacements(content);
    if (next !== content) {
      await writeFile(file, next, 'utf8');
      changed += 1;
    }
  }
  console.log(`Phase 2: scanned ${scanned} files, rewrote ${changed}`);
}

// ---------- Phase 3: rename SOLANA-CLAWD_* docs ----------

async function phaseThreeRenames() {
  const docs = join(ROOT, 'docs');
  let renamed = 0;
  try {
    const entries = await readdir(docs);
    for (const name of entries) {
      if (name.includes('SOLANA-CLAWD')) {
        const next = name.replace(/SOLANA-CLAWD/g, 'SOLANA_CLAWD');
        await rename(join(docs, name), join(docs, next));
        renamed += 1;
      }
    }
  } catch {
    // docs dir missing
  }
  console.log(`Phase 3: renamed ${renamed} doc files`);
}

async function main() {
  await phaseOnePluginTheming();
  await phaseTwoTextSweep();
  await phaseThreeRenames();
  console.log('\nRebrand complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
