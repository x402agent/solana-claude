#!/usr/bin/env node
// Second-pass fix for camelCase identifiers that were mangled by the initial
// `Sperax` → `solana-clawd` rebrand. Converts `solana-clawd<Suffix>` tokens
// (and similar) back into valid PascalCase identifiers `SolanaClawd<Suffix>`.
//
// Run: node scripts/fix-camelcase-identifiers.mjs

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SWEEP_DIRS = ['src', 'api', 'docs', 'public', 'packages', 'locales', 'scripts', 'templates', '.well-known', '.github'];
const SWEEP_FILES = ['README.md', 'README.zh-CN.md', 'package.json', 'AGENTS.md', 'CHANGELOG.md', 'CITATION.cff', 'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'GEMINI.md', 'humans.txt', 'llms.txt', 'llms-full.txt', 'meta.json', 'plugin-template.json', 'schema.json', 'SECURITY.md', 'tsconfig.json', 'vercel.json', 'pnpm-workspace.yaml'];

const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.pdf', '.lock', '.woff', '.woff2', '.ttf', '.eot']);
const SKIP_DIR_PARTS = new Set(['node_modules', '.git', 'dist', 'build', '.vercel', '.next', '.turbo']);

// Fix `solana-clawd<Word>` (camelCase junction) → `SolanaClawd<Word>`
// We only match when followed by an uppercase letter or digit so we do not
// accidentally rewrite ordinary prose or valid hyphenated names like
// `solana-clawd-terminal`.
const CAMEL_JUNCTION = /solana-clawd(?=[A-Z0-9])/g;

// Fix the leading-lowercase camelCase compounds:
//   `createSolanaClawdXxx` → `createSolanaClawdXxx`
// These come from `createSperaxXxx`. We match common prefixes.
const LOWER_JUNCTION = /\b(create|get|set|use|new|init|make|build|is|has)solana-clawd(?=[A-Z0-9])/g;

// Known Sperax-derived host/URL fragments that became invalid after replacement.
// e.g. `solana-clawd.vercel.app` (from SperaxOS.vercel.app) → pick a canonical
// solana-clawd host. We target the lowercase compound explicitly.
const HOST_FIXES = [
  [/solana-clawdos\.vercel\.app/g, 'solana-clawd.vercel.app'],
  [/SolanaClawdOs/g, 'SolanaClawdOs'],
  [/SolanaClawdOS/g, 'SolanaClawdOS'],
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

function fixContent(content) {
  let next = content;
  for (const [pattern, replacement] of HOST_FIXES) {
    next = next.replace(pattern, replacement);
  }
  next = next.replace(LOWER_JUNCTION, (_, verb) => `${verb}SolanaClawd`);
  next = next.replace(CAMEL_JUNCTION, 'SolanaClawd');
  return next;
}

async function main() {
  const files = [];
  for (const d of SWEEP_DIRS) await walk(join(ROOT, d), files);
  for (const f of SWEEP_FILES) {
    try {
      await (await import('node:fs/promises')).stat(join(ROOT, f));
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
    const next = fixContent(content);
    if (next !== content) {
      await writeFile(file, next, 'utf8');
      changed += 1;
    }
  }
  console.log(`Fixed camelCase identifiers in ${changed} files (scanned ${files.length})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
