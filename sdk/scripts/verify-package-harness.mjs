#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const requiredPackages = [
  { name: '@openclawdsolana/clawd-tui', bins: ['hermes', 'clawd-tui', 'clawd-agent', 'clawd-agent-mint'] },
  { name: '@openclawdsolana/clawd', bins: ['clawd', 'clawd-code', 'clawd-leviathan'] },
  { name: '@openclawdsolana/clawd-sdk', exports: ['CLAWD_MINT_MAINNET', 'launchToken', 'deriveVaultPda'] },
  { name: '@openclawdsolana/clawd-standalone', bins: ['clawd-standalone'] },
  { name: 'x402.wtf', bins: ['x402.wtf', 'x402-terminal'] },
  { name: '@openclawdsolana/clawd-wallet' },
  { name: 'clawd-automaton', bins: ['automaton', 'clawd-automaton'] },
  { name: 'x402agent-nanoclawd-cli', bins: ['nanoclawd'] },
  { name: '@openclawdsolana/clawd-perps', bins: ['clawd-perps'] },
];

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

for (const pkg of requiredPackages) {
  const declared = manifest.dependencies?.[pkg.name] ?? manifest.devDependencies?.[pkg.name];
  if (!declared) {
    failures.push(`${pkg.name} is not declared in sdk/package.json`);
    continue;
  }

  const pkgJsonPath = join(root, 'node_modules', pkg.name, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    failures.push(`${pkg.name} is declared but not installed`);
    continue;
  }

  const installed = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  console.log(`ok ${pkg.name}@${installed.version} declared=${declared}`);

  for (const bin of pkg.bins ?? []) {
    const binPath = join(root, 'node_modules', '.bin', bin);
    if (!existsSync(binPath)) {
      failures.push(`${pkg.name} bin ${bin} is missing at ${binPath}`);
    }
  }
}

const sdk = await import('@openclawdsolana/clawd-sdk');
const sdkExports = requiredPackages.find((pkg) => pkg.name === '@openclawdsolana/clawd-sdk').exports;
for (const symbol of sdkExports) {
  if (!(symbol in sdk)) {
    failures.push(`@openclawdsolana/clawd-sdk export ${symbol} is missing`);
  }
}

if (failures.length) {
  console.error('\nPackage harness verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ok package harness verified');
