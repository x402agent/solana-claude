/**
 * automation/runtime.ts — Leviathan runtime builder
 *
 * Orchestrates the full solana-clawd stack:
 *   1. Verify environment (Node 20+, npm, optional Rust/Python)
 *   2. Install deps
 *   3. Build TypeScript dist
 *   4. Spawn Leviathan identity (if not already spawned)
 *   5. Optionally start brain, MCP, and HERMES
 */

import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';

const GREEN  = chalk.hex('#14F195');
const PURPLE = chalk.hex('#9945FF');
const DIM    = chalk.dim;

export interface RuntimeOptions {
  install?: boolean;
  build?: boolean;
  spawn?: boolean;
  brain?: boolean;
  mcp?: boolean;
  hermes?: boolean;
  run?: boolean;
  quiet?: boolean;
}

function ok(msg: string)   { console.log(`  ${GREEN('✓')} ${msg}`); }
function warn(msg: string) { console.log(`  ${chalk.yellow('!')} ${msg}`); }
function step(msg: string) { console.log(`\n${chalk.bold(PURPLE('▶'))} ${chalk.bold(msg)}`); }

function run(cmd: string, opts: { silent?: boolean } = {}): boolean {
  try {
    execSync(cmd, {
      stdio: opts.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
    });
    return true;
  } catch {
    return false;
  }
}

function nodeVersion(): number {
  return Number(process.versions.node.split('.')[0]);
}

export async function buildRuntime(opts: RuntimeOptions = {}): Promise<void> {
  const {
    install = true,
    build   = true,
    spawn   = false,
    brain   = false,
    mcp     = false,
    hermes  = false,
    run: doRun = false,
    quiet   = false,
  } = opts;

  if (!quiet) {
    console.log(chalk.bold(PURPLE('\n  LEVIATHAN RUNTIME  ::  automation/runtime.ts')));
    console.log(DIM('  curl -fsSL https://solanaclawd.com/leviathan.sh | sh\n'));
  }

  // ── Environment ────────────────────────────────────────────────────────────
  step('Environment check');
  if (nodeVersion() < 20) {
    console.error(chalk.red(`✗ Node >= 20 required (current: ${process.version})`));
    process.exit(1);
  }
  ok(`Node ${process.version}`);

  const repoRoot = join(import.meta.dirname, '..');

  // ── Install ────────────────────────────────────────────────────────────────
  if (install) {
    step('npm install');
    if (run('npm install --silent', { silent: true })) ok('Dependencies installed');
    else warn('npm install had warnings — check output');
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  if (build) {
    step('Build TypeScript');
    if (run('npm run build', { silent: quiet })) ok('dist/ compiled');
    else warn('Build step failed — run npm run build manually');
  }

  // ── Spawn identity ─────────────────────────────────────────────────────────
  if (spawn) {
    const idFile = join(repoRoot, '.leviathan', 'identity.json');
    if (existsSync(idFile)) {
      ok('Leviathan identity already exists (skip --spawn)');
    } else {
      step('Spawn Leviathan identity');
      run('npm run leviathan:spawn');
    }
  }

  // ── Brain ──────────────────────────────────────────────────────────────────
  if (brain) {
    step('Initialize Clawd memory (MemeBRain)');
    if (!run('npm run brain:init', { silent: quiet })) {
      warn('brain:init skipped — Python / mnemosyne not installed');
    } else {
      ok('Memory substrate ready');
    }
  }

  // ── MCP ────────────────────────────────────────────────────────────────────
  if (mcp) {
    step('Start MCP server');
    const child = spawn('npm', ['run', 'mcp:start'], {
      detached: true,
      stdio: 'ignore',
      cwd: repoRoot,
    });
    child.unref();
    ok(`MCP server started (PID ${child.pid})`);
  }

  // ── HERMES / run ──────────────────────────────────────────────────────────
  if (hermes) {
    step('Launch HERMES x402 terminal');
    run('npm run hermes');
  } else if (doRun) {
    step('Start Leviathan OODA loop');
    run('npm run leviathan');
  }

  ok(`Runtime ready  ::  ${GREEN('solanaclawd.com')}`);
}
