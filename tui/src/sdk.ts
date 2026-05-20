/**
 * OpenClawd SDK Introspection
 *
 * Reads package metadata from the monorepo packages without importing them
 * at runtime (avoids dependency resolution issues). Also probes the
 * agentwallet vault directory for wallet addresses.
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Known SDK constants (inline to avoid circular deps) ─────────────────────

export const CLAWD_MINT = '8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump';
export const CLAWD_PROTOCOL_PROGRAM = 'CLAWDpRoToCoLv1pRoGRaM111111111111111111111';
export const DBC_PROGRAM = 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

// ─── Package registry ─────────────────────────────────────────────────────────

export interface PackageInfo {
  alias: string;
  name: string;
  version: string;
  description: string;
  status: 'ok' | 'missing' | 'no-dist';
  hasDist: boolean;
  binaries: string[];
  path: string;
}

const TUI_SRC_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TUI_SRC_DIR, '../..');

const PACKAGE_DIRS: Record<string, string> = {
  clawd: 'packages/clawd',
  'clawd-sdk': 'packages/clawd-sdk',
  'clawd-perps': 'packages/clawd-perps',
  'clawd-wallet': 'packages/clawd-wallet',
  agentwallet: 'packages/agentwallet',
  'cli-standalone': 'packages/cli-standalone',
  'x402-client': 'x402/sdk',
};

const SDK_NPM_PACKAGES = [
  '@openclawdsolana/clawd-tui',
  '@openclawdsolana/clawd',
  '@openclawdsolana/clawd-sdk',
  '@openclawdsolana/clawd-standalone',
  'x402.wtf',
  '@openclawdsolana/clawd-wallet',
  'clawd-automaton',
  'x402agent-nanoclawd-cli',
  '@openclawdsolana/clawd-perps',
];

async function loadLocalPackage(alias: string, dir: string): Promise<PackageInfo> {
  const pkgDir = join(REPO_ROOT, dir);
  const pkgJson = join(pkgDir, 'package.json');
  const missing: PackageInfo = { alias, name: alias, version: '-', description: 'not found', status: 'missing', hasDist: false, binaries: [], path: pkgDir };
  if (!existsSync(pkgJson)) return missing;
  try {
    const raw = JSON.parse(await readFile(pkgJson, 'utf8')) as { name?: string; version?: string; description?: string; bin?: Record<string, string> };
    const hasDist = existsSync(join(pkgDir, 'dist'));
    return { alias, name: raw.name ?? alias, version: raw.version ?? '?', description: (raw.description ?? '').slice(0, 72), status: hasDist ? 'ok' : 'no-dist', hasDist, binaries: raw.bin ? Object.keys(raw.bin) : [], path: pkgDir };
  } catch {
    return { ...missing, version: '?', description: 'read error' };
  }
}

async function loadNpmPackage(name: string): Promise<PackageInfo> {
  const pkgDir = join(REPO_ROOT, 'sdk', 'node_modules', name);
  const pkgJson = join(pkgDir, 'package.json');
  const alias = `npm:${name}`;
  const missing: PackageInfo = { alias, name, version: '-', description: 'not installed in sdk/node_modules', status: 'missing', hasDist: false, binaries: [], path: pkgDir };
  if (!existsSync(pkgJson)) return missing;
  try {
    const raw = JSON.parse(await readFile(pkgJson, 'utf8')) as { version?: string; description?: string; bin?: string | Record<string, string> };
    const hasDist = existsSync(join(pkgDir, 'dist'));
    const binaries = typeof raw.bin === 'string' ? [name.split('/').pop() ?? name] : Object.keys(raw.bin ?? {});
    const binTargets = typeof raw.bin === 'string' ? [raw.bin] : Object.values(raw.bin ?? {});
    const hasBinTargets = binTargets.length > 0 && binTargets.every(t => existsSync(join(pkgDir, t)));
    return { alias, name, version: raw.version ?? '?', description: (raw.description ?? 'sdk npm dependency').slice(0, 72), status: hasDist || binaries.length === 0 || hasBinTargets ? 'ok' : 'no-dist', hasDist, binaries, path: pkgDir };
  } catch {
    return { ...missing, version: '?', description: 'read error' };
  }
}

export async function loadPackageInfo(): Promise<PackageInfo[]> {
  const local = await Promise.all(Object.entries(PACKAGE_DIRS).map(([alias, dir]) => loadLocalPackage(alias, dir)));
  const npm = await Promise.all(SDK_NPM_PACKAGES.map(name => loadNpmPackage(name)));
  return [...local, ...npm];
}

// ─── Wallet vault reader ──────────────────────────────────────────────────────

export interface VaultWallet {
  id: string;
  label: string;
  chainType: string;
  address: string;
  paused: boolean;
  createdAt: string;
}

export interface VaultInfo {
  available: boolean;
  path: string;
  wallets: VaultWallet[];
  error?: string;
}

export async function readVaultInfo(): Promise<VaultInfo> {
  const vaultPath = process.env.VAULT_PATH ?? join(homedir(), '.agentwallet', 'vault');

  if (!existsSync(vaultPath)) {
    return { available: false, path: vaultPath, wallets: [], error: 'Vault directory not found' };
  }

  try {
    const files = await readdir(vaultPath);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');
    const wallets: VaultWallet[] = [];

    for (const file of jsonFiles.slice(0, 20)) {
      try {
        const raw = JSON.parse(await readFile(join(vaultPath, file), 'utf8')) as {
          id?: string;
          label?: string;
          chainType?: string;
          address?: string;
          paused?: boolean;
          createdAt?: string;
        };
        if (raw.address) {
          wallets.push({
            id: raw.id ?? file,
            label: raw.label ?? 'unnamed',
            chainType: raw.chainType ?? 'solana',
            address: raw.address,
            paused: raw.paused ?? false,
            createdAt: raw.createdAt ?? '',
          });
        }
      } catch {
        // skip malformed entries
      }
    }

    return { available: true, path: vaultPath, wallets };
  } catch (e) {
    return { available: false, path: vaultPath, wallets: [], error: String(e) };
  }
}

// ─── Env variable probe ───────────────────────────────────────────────────────

export interface EnvProbe {
  key: string;
  label: string;
  set: boolean;
  preview?: string;
}

export function probeEnv(): EnvProbe[] {
  const vars: Array<[string, string]> = [
    ['SOLANA_RPC_URL',        'RPC endpoint'],
    ['HELIUS_API_KEY',        'Helius API key'],
    ['CLAWD_PERPS_WALLET',    'Perps wallet key'],
    ['CLAWD_PERPS_API_URL',   'Perps API URL'],
    ['VAULT_PASSPHRASE',      'Vault passphrase'],
    ['OPENAI_API_KEY',        'OpenAI API key'],
    ['ANTHROPIC_API_KEY',     'Anthropic API key'],
    ['OPENROUTER_API_KEY',    'OpenRouter API key'],
    ['OPENROUTER_MODEL',      'OpenRouter model (e.g. x-ai/grok-build-0.1)'],
    ['LIVE_TRADING',          'Live trading flag'],
    ['OPERATOR_CONFIRMED',    'Operator confirmed'],
    ['BAGS_API_KEY',          'Bags.fm API key'],
    ['TELEGRAM_BOT_TOKEN',    'Telegram bot token'],
    ['X402_DEV_KEY',          'x402 developer key'],
    ['X402_API_KEY',          'x402 API key'],
  ];

  return vars.map(([key, label]) => {
    const val = process.env[key];
    const set = val !== undefined && val !== '';
    let preview: string | undefined;
    if (set && val) {
      if (key.toLowerCase().includes('key') || key.toLowerCase().includes('passphrase') || key.toLowerCase().includes('wallet')) {
        preview = `${val.slice(0, 4)}…${val.slice(-4)}`;
      } else {
        preview = `${val.slice(0, 24)}${val.length > 24 ? '…' : ''}`;
      }
    }
    return { key, label, set, preview };
  });
}

export function shortAddress(address: string, edge = 6): string {
  if (address.length <= edge * 2 + 1) return address;
  return `${address.slice(0, edge)}...${address.slice(-edge)}`;
}
