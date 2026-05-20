/**
 * clawd — SDK Explorer Screen
 *
 * Shows live status of all OpenClawd monorepo packages, wallet vault contents,
 * environment variables, and SDK constants (program IDs, mint addresses).
 *
 * Keys: [tab] cycle section  [b/Esc] back to menu
 */

import chalk from 'chalk';
import {
  loadPackageInfo,
  readVaultInfo,
  probeEnv,
  CLAWD_MINT,
  CLAWD_PROTOCOL_PROGRAM,
  DBC_PROGRAM,
  USDC_MINT,
  TOKEN_2022_PROGRAM,
  type PackageInfo,
  type VaultInfo,
  type EnvProbe,
} from '../sdk.js';

// ─── Display helpers ──────────────────────────────────────────────────────────

const W = 110;

function clr(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

function box(title: string, lines: string[]): string[] {
  const inner = W - 2;
  const titleFmt = ` ${chalk.cyanBright.bold(title)} `;
  const titleLen = title.length + 2;
  const left = Math.floor((inner - titleLen) / 2);
  const right = inner - titleLen - left;
  const top = chalk.cyan('╔') + chalk.cyan('═'.repeat(left)) + titleFmt + chalk.cyan('═'.repeat(right)) + chalk.cyan('╗');
  const bot = chalk.cyan('╚') + chalk.cyan('═'.repeat(inner)) + chalk.cyan('╝');
  const out = [top];
  for (const l of lines) {
    const vis = l.replace(/\x1b\[[0-9;]*m/g, '').length;
    const pad = Math.max(0, inner - 1 - vis);
    out.push(chalk.cyan('║') + ' ' + l + ' '.repeat(pad) + chalk.cyan('║'));
  }
  out.push(bot);
  return out;
}

function row(label: string, value: string, labelW = 24): string {
  return chalk.gray(label.padEnd(labelW)) + chalk.white(value);
}

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + '…' + addr.slice(-6);
}

// ─── Section renderers ────────────────────────────────────────────────────────

function renderPackages(pkgs: PackageInfo[]): string[] {
  const lines: string[] = [];
  lines.push(chalk.gray('  Name                              Ver      Dist   Binaries'));
  lines.push(chalk.gray('  ' + '─'.repeat(76)));
  for (const p of pkgs) {
    const icon = p.status === 'ok' ? chalk.green('●') : p.status === 'no-dist' ? chalk.yellow('◐') : chalk.red('○');
    const name = p.name.slice(0, 34).padEnd(34);
    const ver  = p.version.padEnd(8);
    const dist = p.hasDist ? chalk.green('YES  ') : chalk.red(' NO  ');
    const bins = p.binaries.slice(0, 3).join(', ');
    lines.push(`  ${icon} ${chalk.white(name)} ${chalk.yellow(ver)} ${dist} ${chalk.gray(bins)}`);
  }
  return box('OPENCLAWD PACKAGES', lines);
}

function renderConstants(): string[] {
  const lines = [
    row('$CLAWD mint',          CLAWD_MINT),
    row('CLAWD Protocol',       shortAddr(CLAWD_PROTOCOL_PROGRAM)),
    row('DBC Program',          shortAddr(DBC_PROGRAM)),
    row('USDC mint',            shortAddr(USDC_MINT)),
    row('Token-2022 Program',   shortAddr(TOKEN_2022_PROGRAM)),
    '',
    chalk.gray('  ─── Curve Math ─────────────────────────────────────────'),
    row('MIN_FEE_BPS',  '25  (0.25%)'),
    row('MAX_FEE_BPS',  '9900  (99%)'),
    row('BOT_THRESHOLD','Score ≥ 80 → classified as bot'),
    row('CONVICTION',   'time × amount × consistency'),
    '',
    chalk.gray('  ─── Token Standards ─────────────────────────────────────'),
    row('SPL Token',    'Standard transfers'),
    row('Token-2022',   'Transfer hooks, confidential, fee-on-transfer'),
    row('pToken',       'Transfer-hook-gated programmable token'),
  ];
  return box('SDK CONSTANTS & ADDRESSES', lines);
}

function renderVault(vault: VaultInfo): string[] {
  const lines: string[] = [];
  if (!vault.available) {
    lines.push(chalk.red(`  Vault unavailable: ${vault.error ?? 'unknown error'}`));
    lines.push(chalk.gray(`  Path: ${vault.path}`));
    lines.push('');
    lines.push(chalk.gray('  To create a vault:'));
    lines.push(chalk.white('    npx agentwallet keygen --label my-wallet --chain solana'));
    lines.push('');
    lines.push(chalk.gray('  Or set VAULT_PASSPHRASE + use the clawd fund command.'));
  } else {
    lines.push(row('Vault path', vault.path));
    lines.push(row('Wallets found', String(vault.wallets.length)));
    lines.push('');
    if (vault.wallets.length === 0) {
      lines.push(chalk.yellow('  No wallets in vault — run: agentwallet keygen'));
    } else {
      lines.push(chalk.gray('  Label                  Chain    Address                        Status'));
      lines.push(chalk.gray('  ' + '─'.repeat(72)));
      for (const w of vault.wallets.slice(0, 10)) {
        const icon   = w.paused ? chalk.red('⏸') : chalk.green('▶');
        const label  = w.label.slice(0, 22).padEnd(22);
        const chain  = w.chainType.padEnd(8);
        const addr   = shortAddr(w.address);
        lines.push(`  ${icon} ${chalk.white(label)} ${chalk.cyan(chain)} ${chalk.yellow(addr)}`);
      }
      if (vault.wallets.length > 10) {
        lines.push(chalk.gray(`  … and ${vault.wallets.length - 10} more`));
      }
    }
  }
  return box('AGENTWALLET VAULT', lines);
}

function renderEnv(probes: EnvProbe[]): string[] {
  const lines: string[] = [];
  lines.push(chalk.gray('  Variable                   Status   Preview / Value'));
  lines.push(chalk.gray('  ' + '─'.repeat(72)));
  for (const p of probes) {
    const icon    = p.set ? chalk.green('✔') : chalk.red('✘');
    const key     = p.key.padEnd(26);
    const status  = p.set ? chalk.green('SET  ') : chalk.red('UNSET');
    const preview = p.preview ? chalk.gray(p.preview) : '';
    lines.push(`  ${icon} ${chalk.white(key)} ${status}  ${preview}`);
  }
  return box('ENVIRONMENT', lines);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Section = 'packages' | 'constants' | 'vault' | 'env';
const SECTIONS: Section[] = ['packages', 'constants', 'vault', 'env'];
const SECTION_LABELS: Record<Section, string> = {
  packages:  '[1] Packages',
  constants: '[2] Constants',
  vault:     '[3] Vault',
  env:       '[4] Env',
};

function enableRaw(): void {
  process.stdout.write('\x1b[?25l');
  if (process.stdin.setRawMode) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
}

function disableRaw(): void {
  process.stdout.write('\x1b[?25h');
  if (process.stdin.setRawMode) process.stdin.setRawMode(false);
}

function renderScreen(
  section: Section,
  pkgs: PackageInfo[],
  vault: VaultInfo,
  probes: EnvProbe[],
  loading: boolean,
): void {
  clr();

  // Header
  const logo = chalk.hex('#ff00ff').bold(' ██████╗██╗      █████╗ ██╗    ██╗██████╗ ');
  process.stdout.write(logo + '\n');
  process.stdout.write(chalk.cyanBright.bold(' OPENCLAWD SDK EXPLORER') + chalk.gray('  — monorepo packages · vault · constants · env') + '\n');
  process.stdout.write(chalk.cyan('─'.repeat(W)) + '\n');

  // Tab bar
  const tabs = SECTIONS.map(s =>
    s === section
      ? chalk.bgCyan.black.bold(` ${SECTION_LABELS[s]} `)
      : chalk.gray(` ${SECTION_LABELS[s]} `),
  ).join(chalk.gray(' │ '));
  process.stdout.write('  ' + tabs + '\n');
  process.stdout.write(chalk.cyan('─'.repeat(W)) + '\n');
  process.stdout.write('\n');

  if (loading) {
    process.stdout.write(chalk.yellow('  Loading…') + '\n');
    return;
  }

  let sectionLines: string[] = [];
  if (section === 'packages')  sectionLines = renderPackages(pkgs);
  if (section === 'constants') sectionLines = renderConstants();
  if (section === 'vault')     sectionLines = renderVault(vault);
  if (section === 'env')       sectionLines = renderEnv(probes);

  for (const l of sectionLines) {
    process.stdout.write(l + '\n');
  }

  process.stdout.write('\n');
  process.stdout.write(
    chalk.gray('  [Tab / 1-4] switch  [b/Esc] back  [q] quit') + '\n',
  );
}

export async function runSDK(): Promise<void> {
  let section: Section = 'packages';
  let pkgs: PackageInfo[] = [];
  let vault: VaultInfo = { available: false, path: '', wallets: [] };
  let probes: EnvProbe[] = [];
  let loading = true;

  enableRaw();
  renderScreen(section, pkgs, vault, probes, loading);

  // Load all data async
  Promise.all([loadPackageInfo(), readVaultInfo(), Promise.resolve(probeEnv())]).then(([p, v, e]) => {
    pkgs = p;
    vault = v;
    probes = e;
    loading = false;
    renderScreen(section, pkgs, vault, probes, false);
  }).catch(() => {
    loading = false;
    renderScreen(section, pkgs, vault, probes, false);
  });

  return new Promise<void>(resolve => {
    const cleanup = (): void => {
      disableRaw();
      process.stdin.off('data', onData);
      resolve();
    };

    const onData = (data: Buffer | string): void => {
      const key = typeof data === 'string' ? data : data.toString();

      if (key === 'b' || key === 'B' || key === '\x1b') { cleanup(); return; }
      if (key === 'q' || key === 'Q' || key === '\x03') { cleanup(); process.exit(0); }

      if (key === '\t') {
        const idx = SECTIONS.indexOf(section);
        section = SECTIONS[(idx + 1) % SECTIONS.length]!;
      }
      if (key === '1') section = 'packages';
      if (key === '2') section = 'constants';
      if (key === '3') section = 'vault';
      if (key === '4') section = 'env';

      renderScreen(section, pkgs, vault, probes, loading);
    };

    process.stdin.on('data', onData);
  });
}
