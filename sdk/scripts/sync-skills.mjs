#!/usr/bin/env node
/**
 * Sync the SDK-facing skill snapshot from the repository Skill Hub.
 *
 * The SDK ships a curated subset of directories plus the complete machine
 * catalogs. Do not copy local user skill directories or generated node_modules.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(sdkRoot, '..');
const srcSkills = path.join(repoRoot, 'skills');
const dstSkills = path.join(sdkRoot, 'skills');

const CURATED_SKILLS = [
  'magicblock',
  'imperial',
  'imperial-execution-modes',
  'imperial-grid-trading',
  'imperial-margin-operations',
  'imperial-market-intel',
  'imperial-portfolio-intel',
  'imperial-position-management',
  'imperial-risk-management',
  'imperial-skills-index',
  'imperial-tpsl-management',
  'imperial-trade-execution',
  'imperial-twap-execution',
  'oracle',
  'sherpa-onnx-tts',
  'skill-creator',
  'solana-clawd',
  'solana-clawd-agentic-commerce',
  'dflow-spot-trading',
  'dflow-phantom-connect',
  'phantom-wallet-mcp',
];

fs.mkdirSync(dstSkills, { recursive: true });

for (const file of ['catalog.json', 'index.json']) {
  fs.copyFileSync(path.join(srcSkills, file), path.join(dstSkills, file));
}

for (const slug of CURATED_SKILLS) {
  const src = path.join(srcSkills, slug);
  const dst = path.join(dstSkills, slug);
  if (!fs.existsSync(path.join(src, 'SKILL.md'))) {
    console.warn(`skip missing skill: ${slug}`);
    continue;
  }
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(src, dst, {
    recursive: true,
    dereference: true,
    filter: (entry) => !entry.includes(`${path.sep}node_modules${path.sep}`) && !entry.includes(`${path.sep}dist${path.sep}`),
  });
}

console.log(`Synced ${CURATED_SKILLS.length} SDK skills and catalogs to ${dstSkills}`);
