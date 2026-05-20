#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const topLevel = [
  '.claude',
  '.wrangler',
  'agents',
  'apps',
  'automation',
  'beepboop',
  'chess',
  'chrome-extension',
  'clawd-cloud-os',
  'clawdcli',
  'clawdrouter',
  'data',
  'deep-clawd',
  'docs',
  'email-worker',
  'examples',
  'formal_verification',
  'gateway',
  'leviathan',
  'llm_oracle',
  'llm-wiki-tang',
  'MCP',
  'MemeBRain',
  'moltbook-agent',
  'node_modules',
  'ooda',
  'openclawd',
  'openclawd-framework',
  'openShell',
  'packages',
  'pinocchio',
  'plugin.delivery',
  'programs',
  'pump-fun',
  'scripts',
  'sdk',
  'skills',
  'solana-mcp-official-main',
  'solana-python-agent',
  'tailclawd',
  'tui',
  'vulcan-cli-master',
  'x402',
];

const generatedNames = new Set([
  'node_modules',
  'target',
  'dist',
  '.next',
  '.turbo',
  '.cache',
  '.wrangler',
  'build',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.lake',
  '.venv',
  'venv',
]);

function sh(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      ...options,
    }).trim();
  } catch {
    return '';
  }
}

function sizeOf(relPath) {
  return sh('du', ['-sh', relPath]).split(/\s+/)[0] || 'missing';
}

function trackedCount(relPath) {
  const out = sh('git', ['ls-files', relPath]);
  return out ? out.split('\n').filter(Boolean).length : 0;
}

function referenceCount(relPath) {
  const targets = ['package.json', 'README.md', 'STARTHERE.md', 'docs', 'scripts', 'automation', '.github'];
  const existingTargets = targets.filter((target) => existsSync(path.join(repoRoot, target)));
  if (!existingTargets.length) return 0;
  const out = sh('rg', ['-n', '--fixed-strings', relPath, ...existingTargets]);
  return out ? out.split('\n').filter(Boolean).length : 0;
}

function findGenerated(relPath) {
  const root = path.join(repoRoot, relPath);
  if (!existsSync(root) || !statSync(root).isDirectory()) return [];
  const out = sh('find', [
    relPath,
    '-path',
    `${relPath}/.git`,
    '-prune',
    '-o',
    '-type',
    'd',
    '(',
    ...Array.from(generatedNames).flatMap((name, index) => (
      index === 0 ? ['-name', name] : ['-o', '-name', name]
    )),
    ')',
    '-prune',
    '-print',
  ]);
  return out ? out.split('\n').filter(Boolean) : [];
}

function classify(relPath, tracked, refs, generated) {
  if (relPath === 'node_modules') return 'delete-regenerable';
  if (relPath === '.wrangler') return 'delete-regenerable';
  if (relPath === '.claude') return 'local-config-review';
  if (['automation', 'beepboop', 'clawdrouter', 'gateway', 'leviathan', 'MCP', 'sdk', 'scripts', 'tui', 'x402', 'skills', 'docs'].includes(relPath)) {
    return 'keep-active';
  }
  if (['llm_oracle', 'openclawd', 'openclawd-framework', 'programs', 'vulcan-cli-master'].includes(relPath)) {
    return 'keep-source-clean-generated';
  }
  if (tracked === 0 && refs === 0) return 'delete-candidate';
  if (tracked < 10 && refs === 0 && generated.length === 0) return 'archive-candidate';
  if (generated.length > 0) return 'review-generated';
  return 'review-source';
}

const rows = topLevel
  .filter((relPath) => existsSync(path.join(repoRoot, relPath)))
  .map((relPath) => {
    const generated = findGenerated(relPath);
    const tracked = trackedCount(relPath);
    const refs = referenceCount(relPath);
    return {
      path: relPath,
      size: sizeOf(relPath),
      tracked,
      refs,
      generatedCount: generated.length,
      classification: classify(relPath, tracked, refs, generated),
      generated: generated.slice(0, 8),
    };
  });

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log('| Path | Size | Tracked | Refs | Generated Dirs | Classification |');
  console.log('| --- | ---: | ---: | ---: | ---: | --- |');
  for (const row of rows) {
    console.log(`| \`${row.path}\` | ${row.size} | ${row.tracked} | ${row.refs} | ${row.generatedCount} | ${row.classification} |`);
  }
}
