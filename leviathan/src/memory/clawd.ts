/**
 * leviathan/src/memory/clawd.ts
 *
 * Bridge from the Leviathan runtime into Clawd Memory.
 * The source of truth is the Python ClawdBrain layer in ../MemeBRain.
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import type {
  ClawState,
  ClawdMemoryOptions,
  ClawdMemoryRecallInput,
  ClawdMemoryRememberInput,
} from '../types.js';

const execFileAsync = promisify(execFile);

export interface ClawdMemoryCommandResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  command: string[];
}

export interface LeviathanMemoryContext {
  query: string;
  text: string;
  raw?: unknown;
  available: boolean;
  error?: string;
}

function moduleDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

export function resolveClawdBrainRoot(opts: ClawdMemoryOptions = {}): string | null {
  const candidates = [
    opts.brainRoot,
    process.env['CLAWD_BRAIN_ROOT'],
    join(process.cwd(), 'MemeBRain'),
    join(process.cwd(), '..', 'MemeBRain'),
    join(process.cwd(), '..', '..', 'MemeBRain'),
    join(moduleDir(), '..', '..', '..', 'MemeBRain'),
    join(moduleDir(), '..', '..', '..', '..', 'MemeBRain'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const root = resolve(candidate);
    if (existsSync(join(root, 'mnemosyne', 'clawd_brain.py'))) return root;
  }

  return null;
}

async function runClawdBrain(args: string[], opts: ClawdMemoryOptions = {}): Promise<ClawdMemoryCommandResult> {
  const root = resolveClawdBrainRoot(opts);
  const command = ['-m', 'mnemosyne.clawd_brain', ...args];

  if (!root) {
    return { ok: false, error: 'MemeBRain root not found. Set CLAWD_BRAIN_ROOT.', command };
  }

  const pythonBin = opts.pythonBin ?? process.env['CLAWD_BRAIN_PYTHON'] ?? 'python3';
  const env = { ...process.env };
  if (opts.vault) env['CLAWD_BRAIN_VAULT'] = opts.vault;

  const bankArgs = opts.bank ? ['--bank', opts.bank] : [];
  const vaultArgs = opts.vault ? ['--vault', opts.vault] : [];
  const fullArgs = ['-m', 'mnemosyne.clawd_brain', ...bankArgs, ...vaultArgs, ...args];

  try {
    const { stdout } = await execFileAsync(pythonBin, fullArgs, {
      cwd: root,
      env,
      timeout: opts.timeoutMs ?? 12_000,
      maxBuffer: 1024 * 1024,
    });
    const text = stdout.trim();
    return { ok: true, data: text ? JSON.parse(text) : null, command: fullArgs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message, command: fullArgs };
  }
}

export async function initClawdMemory(opts: ClawdMemoryOptions = {}): Promise<ClawdMemoryCommandResult> {
  return runClawdBrain(['init'], opts);
}

export async function recallClawdMemory(
  input: ClawdMemoryRecallInput,
  opts: ClawdMemoryOptions = {},
): Promise<ClawdMemoryCommandResult> {
  return runClawdBrain(['recall', input.query, '--top-k', String(input.topK ?? 8)], opts);
}

export async function rememberClawdMemory(
  input: ClawdMemoryRememberInput,
  opts: ClawdMemoryOptions = {},
): Promise<ClawdMemoryCommandResult> {
  const args = [
    'remember',
    input.title,
    input.content,
    '--kind',
    input.kind ?? 'note',
    '--source',
    input.source ?? 'leviathan',
    '--importance',
    String(input.importance ?? 0.7),
  ];

  for (const tag of input.tags ?? []) args.push('--tag', tag);
  return runClawdBrain(args, opts);
}

export async function researchClawdMemory(
  target: string,
  tags: string[] = [],
  opts: ClawdMemoryOptions = {},
): Promise<ClawdMemoryCommandResult> {
  const args = ['research', target];
  for (const tag of tags) args.push('--tag', tag);
  return runClawdBrain(args, opts);
}

function compact(value: unknown, max = 1600): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function buildLeviathanMemoryQuery(state: ClawState, strikeHistory: unknown[]): string {
  const pieces = [
    state.identity.name,
    state.identity.pubkey,
    `depth ${state.depth}`,
    `shell v${state.identity.shellVersion}`,
    state.shellMd,
    compact(strikeHistory, 700),
  ];
  return pieces.join('\n');
}

export async function loadLeviathanMemoryContext(
  state: ClawState,
  strikeHistory: unknown[],
  opts: ClawdMemoryOptions = {},
): Promise<LeviathanMemoryContext> {
  const query = buildLeviathanMemoryQuery(state, strikeHistory);
  const result = await recallClawdMemory({ query, topK: 6 }, opts);

  if (!result.ok) {
    return {
      query,
      available: false,
      text: `Clawd Memory unavailable: ${result.error}`,
      error: result.error,
    };
  }

  return {
    query,
    raw: result.data,
    available: true,
    text: compact(result.data, 2400),
  };
}

export async function rememberLeviathanStrike(
  state: ClawState,
  strike: unknown,
  opts: ClawdMemoryOptions = {},
): Promise<ClawdMemoryCommandResult> {
  const title = `Leviathan Tick ${state.tickCount + 1} - ${state.identity.name}`;
  const content = [
    `Leviathan ${state.identity.name} (${state.identity.pubkey}) completed a tail-flick.`,
    `Depth: ${state.depth}`,
    `Shell version: ${state.identity.shellVersion}`,
    `Strike: ${compact(strike, 1800)}`,
  ].join('\n');

  return rememberClawdMemory({
    title,
    content,
    kind: 'agent',
    source: 'leviathan',
    tags: ['clawd', 'leviathan', 'tail-flick', state.depth],
    importance: 0.62,
  }, opts);
}
