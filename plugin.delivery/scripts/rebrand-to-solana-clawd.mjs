#!/usr/bin/env node
// Rebrand plugin.delivery from legacy SperaxOS/nirholas references to solana-clawd.
// - Applies CLAWD theming to every src/*.json plugin entry
// - Sweeps text files replacing legacy ownership/branding strings
// Idempotent: safe to re-run.
//
// Run: node scripts/rebrand-to-solana-clawd.mjs

import { readdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'src');

// Keep bounded so we do not touch node_modules or binary assets.
const SWEEP_DIRS = [
  'src',
  'api',
  'docs',
  'public',
  'packages',
  'locales',
  'scripts',
  'templates',
  '.well-known',
  '.github',
];

const SWEEP_FILES = [
  'README.md',
  'README.zh-CN.md',
  'package.json',
  'AGENTS.md',
  'CHANGELOG.md',
  'CITATION.cff',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'GEMINI.md',
  'humans.txt',
  'llms.txt',
  'llms-full.txt',
  'meta.json',
  'plugin-template.json',
  'schema.json',
  'SECURITY.md',
  'tsconfig.json',
  'vercel.json',
  'pnpm-workspace.yaml',
];

const SKIP_EXT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.pdf',
  '.lock',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
]);

const SKIP_DIR_PARTS = new Set(['node_modules', '.git', 'dist', 'build', '.vercel', '.next', '.turbo']);
const SELF_SCRIPT = join(ROOT, 'scripts', 'rebrand-to-solana-clawd.mjs');

// Ordered replacements: most specific first.
const TEXT_REPLACEMENTS = [
  [/SPERAXOS_PLUGIN_COMPLETE_GUIDE/g, 'SOLANA_CLAWD_PLUGIN_COMPLETE_GUIDE'],

  [
    /https:\/\/github\.com\/(?:nirholas\/plugin\.delivery|nicholasxuu\/pump-fun-sdk)(\.git)?/g,
    'https://github.com/x402agent/solana-clawd$1',
  ],

  [/https:\/\/github\.com\/solana-clawd\/[a-zA-Z0-9_.\/-]+/g, 'https://github.com/x402agent/solana-clawd'],
  [/https:\/\/github\.com\/solana-clawd\b/g, 'https://github.com/x402agent/solana-clawd'],

  [/https:\/\/github\.com\/YOUR_USERNAME\/plugin\.delivery\.git/g, 'https://github.com/x402agent/solana-clawd.git'],
  [/https:\/\/github\.com\/OWNER\/REPO/g, 'https://github.com/x402agent/solana-clawd'],

  [/github\.com\/(?:nirholas|nicholasxuu|sperax|solana-clawd)\/[a-zA-Z0-9_.-]+/g, 'github.com/x402agent/solana-clawd'],

  [/nicholasxuu/g, 'x402agent'],
  [/nirholas/g, 'x402agent'],
  [/SperaxOS/g, 'solana-clawd'],
  [/Sperax\s*<contact@sperax\.io>/g, 'solana-clawd <contact@solanaos.net>'],
  [/contact@sperax\.io/g, 'contact@solanaos.net'],
  [/sperax\.io/g, 'solanaos.net'],
  [/@sperax\//g, '@solana-clawd/'],
  [/\bSperax\b/g, 'solana-clawd'],
  [/\bsperax\b/g, 'solana-clawd'],
];

// ---------- Phase 1: plugin JSON theming ----------

const CLAWD_TAGS = ['clawd', 'solana-clawd'];

function themePluginEntry(entry) {
  entry.author = 'solana-clawd';
  entry.homepage = 'https://github.com/x402agent/solana-clawd';

  entry.meta = entry.meta ?? {};
  const tags = Array.isArray(entry.meta.tags) ? [...entry.meta.tags] : [];
  for (const tag of CLAWD_TAGS) {
    if (!tags.includes(tag)) tags.push(tag);
  }
  entry.meta.tags = tags;

  if (typeof entry.meta.description === 'string' && !entry.meta.description.startsWith('[solana-clawd]')) {
    entry.meta.description = `[solana-clawd] ${entry.meta.description} — consumed by CLAWD agents (Scanner/OODA/Analyst) and gated by the CLAWD permission engine.`;
  }

  return entry;
}

async function phaseOnePluginTheming() {
  const files = (await readdir(SRC_DIR))
    .filter((name) => name.endsWith('.json'))
    .map((name) => join(SRC_DIR, name));

  let themed = 0;
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const entry = JSON.parse(raw);
    themePluginEntry(entry);
    await writeFile(file, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
    themed += 1;
  }

  console.log(`Phase 1: themed ${themed} plugin entries in src/`);
}

// ---------- Phase 2: text sweep ----------

function shouldSkipPath(path) {
  if (path === SELF_SCRIPT) return true;

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

  for (const file of SWEEP_FILES) {
    const full = join(ROOT, file);
    try {
      await stat(full);
      if (!shouldSkipPath(full)) files.push(full);
    } catch {
      // Missing file — skip.
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

// ---------- Phase 3: rename docs ----------

async function phaseThreeRenames() {
  const docs = join(ROOT, 'docs');
  let renamed = 0;

  try {
    const entries = await readdir(docs);
    for (const name of entries) {
      if (name.includes('SPERAXOS')) {
        const next = name.replace(/SPERAXOS/g, 'SOLANA_CLAWD');
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
