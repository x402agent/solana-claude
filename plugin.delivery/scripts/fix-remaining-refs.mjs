#!/usr/bin/env node
// Final-pass cleanup: fix uppercase SOLANA-CLAWD and lingering `solana-clawd`
// fragments left by prior passes.
//
// Run: node scripts/fix-remaining-refs.mjs

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SWEEP_DIRS = ['src', 'api', 'docs', 'public', 'packages', 'locales', 'scripts', 'templates', '.well-known', '.github'];
const SWEEP_FILES = ['README.md', 'README.zh-CN.md', 'package.json', 'AGENTS.md', 'CHANGELOG.md', 'CITATION.cff', 'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'GEMINI.md', 'humans.txt', 'llms.txt', 'llms-full.txt', 'meta.json', 'plugin-template.json', 'schema.json', 'SECURITY.md', 'tsconfig.json', 'vercel.json', 'pnpm-workspace.yaml'];

const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.pdf', '.lock', '.woff', '.woff2', '.ttf', '.eot']);
const SKIP_DIR_PARTS = new Set(['node_modules', '.git', 'dist', 'build', '.vercel', '.next', '.turbo']);

const REPLACEMENTS = [
  // uppercase literal in ASCII art / headers
  [/SOLANA-CLAWD/g, 'SOLANA-CLAWD'],
  // URL schemes and event-type prefixes
  [/solana-clawd:\/\//g, 'solana-clawd://'],
  [/solana-clawd:([a-z])/g, 'solana-clawd:$1'],
  // plugin index package name
  [/solana-clawd-plugins/g, 'solana-clawd-plugins'],
  [/solana-clawd-plugin/g, 'solana-clawd-plugin'],
  // standalone lowercase "os" fragments (anchor refs, prose)
  [/solana-clawd/g, 'solana-clawd'],
];

async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const skip = full.split('/').some((p) => SKIP_DIR_PARTS.has(p));
    if (skip) continue;
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (entry.isFile()) {
      const ext = '.' + (entry.name.split('.').pop() ?? '');
      if (SKIP_EXT.has(ext)) continue;
      out.push(full);
    }
  }
}

async function main() {
  const files = [];
  for (const d of SWEEP_DIRS) await walk(join(ROOT, d), files);
  for (const f of SWEEP_FILES) {
    try {
      await stat(join(ROOT, f));
      files.push(join(ROOT, f));
    } catch {}
  }

  let changed = 0;
  for (const file of files) {
    let content;
    try {
      content = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    let next = content;
    for (const [pattern, replacement] of REPLACEMENTS) {
      next = next.replace(pattern, replacement);
    }
    if (next !== content) {
      await writeFile(file, next, 'utf8');
      changed += 1;
    }
  }
  console.log(`Final pass: fixed ${changed} files (scanned ${files.length})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
