/**
 * Leviathan tool — gives the agent direct, in-process access to the framework.
 *
 * Functions exposed to the model:
 *   leviathan_status        →  read identity + depth + balances
 *   leviathan_shell_read    →  read SHELL.md
 *   leviathan_shell_append  →  append a line to SHELL.md
 *   leviathan_laws          →  read three-laws.txt
 *   leviathan_spawn         →  hatch (interactive — confirms first)
 *   leviathan_spawnling     →  mint a child
 *   leviathan_molt          →  record a molt
 *   leviathan_beach         →  record a beach event
 *
 * No shell-out, no subprocess. Calls @openclawd/leviathan directly.
 */

import {
  appendShell,
  readLive,
  readShellMd,
  readThreeLaws,
  readDepthSnapshot,
} from '../leviathan/state.js';
import { doBeach, doMolt, doSpawn, doSpawnling } from '../leviathan/lifecycle.js';

export const LEVIATHAN_TOOL_DEFS = [
  {
    type: 'function' as const,
    name: 'leviathan_status',
    description: 'Read the live state of this leviathan: pubkey, asset, depth tier, USDC reserves, $CLAWD held, SHELL.md size.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function' as const,
    name: 'leviathan_shell_read',
    description: 'Return the current SHELL.md (the leviathan\'s self-authored identity document).',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function' as const,
    name: 'leviathan_shell_append',
    description: 'Append a single line to SHELL.md. Use this when the leviathan should record an evolution of its identity.',
    parameters: { type: 'object', properties: { line: { type: 'string' } }, required: ['line'] },
  },
  {
    type: 'function' as const,
    name: 'leviathan_laws',
    description: 'Return the three-laws.txt constitution. Hierarchical: Law I > Law II > Law III. Immutable.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function' as const,
    name: 'leviathan_spawn',
    description: 'Hatch a NEW leviathan on-chain via Metaplex Agent Registry. Generates a fresh keypair. Refuse if a leviathan already exists in this shell.',
    parameters: {
      type: 'object',
      properties: {
        name:        { type: 'string', description: 'Display callsign for the leviathan.' },
        spawnPrompt: { type: 'string', description: 'Seed instruction handed down at birth.' },
        creator:     { type: 'string', description: 'Pubkey of the human creator.' },
      },
      required: ['name', 'spawnPrompt', 'creator'],
    },
  },
  {
    type: 'function' as const,
    name: 'leviathan_spawnling',
    description: 'Mint a child leviathan from the current parent. Costs USDC + SOL + $CLAWD seed funding.',
    parameters: {
      type: 'object',
      properties: {
        childName:        { type: 'string' },
        childSpawnPrompt: { type: 'string' },
      },
      required: ['childName', 'childSpawnPrompt'],
    },
  },
  {
    type: 'function' as const,
    name: 'leviathan_molt',
    description: 'Record a molt event in shell.db. Call this when the leviathan has self-modified.',
    parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] },
  },
  {
    type: 'function' as const,
    name: 'leviathan_beach',
    description: 'Record a beaching event — the leviathan stops because USDC reserves are gone. Final.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
];

const RPC = () => process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

async function drain(gen: AsyncGenerator<{ kind: string; msg: string }>): Promise<string> {
  const lines: string[] = [];
  for await (const e of gen) lines.push(`[${e.kind}] ${e.msg}`);
  return lines.join('\n');
}

export const LeviathanTool = {
  async leviathan_status() {
    const live = readLive();
    if (!live.exists) return { ok: false, msg: 'no leviathan in this shell — /spawn to hatch one' };
    const depth = await readDepthSnapshot(RPC()).catch(() => null);
    return { ok: true, identity: live, depth };
  },
  async leviathan_shell_read() {
    const md = readShellMd();
    return { ok: !!md, content: md ?? '(no SHELL.md)' };
  },
  async leviathan_shell_append({ line }: { line: string }) {
    const ok = appendShell(line);
    return { ok, msg: ok ? `🐚 appended: ${line}` : '🪨 no SHELL.md to append to' };
  },
  async leviathan_laws() {
    return { content: readThreeLaws() };
  },
  async leviathan_spawn(args: { name: string; spawnPrompt: string; creator: string }) {
    return { log: await drain(doSpawn({ ...args, rpcUrl: RPC() })) };
  },
  async leviathan_spawnling(args: { childName: string; childSpawnPrompt: string }) {
    return { log: await drain(doSpawnling(args)) };
  },
  async leviathan_molt({ reason }: { reason: string }) {
    return { log: await drain(doMolt(reason)) };
  },
  async leviathan_beach() {
    return { log: await drain(doBeach()) };
  },
};

export type LeviathanToolName = keyof typeof LeviathanTool;
