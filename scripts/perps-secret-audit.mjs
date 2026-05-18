import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, basename } from 'node:path';

const root = resolve(process.cwd(), 'Perps');

const forbiddenNames = new Set([
  '.env',
  'id.json',
  'wallet.json',
  'keypair.json',
]);

const forbiddenSuffixes = ['.pem', '.key', '-keypair.json'];
const suspiciousPatterns = [
  /PRIVATE_KEY\s*=/i,
  /SECRET_KEY\s*=/i,
  /MNEMONIC\s*=/i,
  /seed phrase/i,
  /Keypair\.fromSecretKey/,
  /bs58\.decode\(/,
];

const findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'target', '.git', 'dist', 'build'].includes(entry.name)) continue;
      walk(full);
      continue;
    }

    const rel = relative(process.cwd(), full);
    if (
      forbiddenNames.has(entry.name) ||
      forbiddenSuffixes.some((suffix) => entry.name.endsWith(suffix))
    ) {
      findings.push({ type: 'forbidden-file', path: rel });
      continue;
    }

    if (!/\.(ts|tsx|js|mjs|cjs|rs|md|toml|json|env|yaml|yml)$/i.test(entry.name)) continue;

    let text = '';
    try {
      if (statSync(full).size > 256_000) continue;
      text = readFileSync(full, 'utf8');
    } catch {
      continue;
    }

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        findings.push({ type: 'suspicious-content', path: rel, pattern: String(pattern) });
        break;
      }
    }
  }
}

if (statSync(root).isDirectory()) {
  walk(root);
}

if (findings.length === 0) {
  console.log('Perps secret audit: clean');
  process.exit(0);
}

const blocking = findings.filter((finding) => finding.type === 'forbidden-file');
const advisory = findings.filter((finding) => finding.type !== 'forbidden-file');

console.log('Perps secret audit findings:\n');
for (const finding of findings) {
  console.log(`- ${finding.type}: ${finding.path}${finding.pattern ? ` (${finding.pattern})` : ''}`);
}

if (blocking.length > 0) {
  process.exit(1);
}

console.log('\nPerps secret audit: no secret files detected. Advisory findings are code or docs that mention key handling.');
process.exit(0);
