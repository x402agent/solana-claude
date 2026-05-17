/**
 * The Sense → Think → Strike → Drift loop.
 *
 * Port of automaton-main/src/agent/loop.ts, adapted for the lobster cosmology.
 * Inference provider is pluggable: pass a `think()` callable.
 */

import { ulid } from 'ulid';
import { buildSystemPrompt } from './system-prompt.js';
import { getShellDb, recordEvent, getLeviathan } from '../state/database.js';
import { readBalances } from '../identity/balances.js';
import { depthFor, modelFor } from '../survival/monitor.js';
import { loadInstalledSkillTools } from '../skills/skill-tool.js';
import { loadInstalledSkills } from '../skills/registry.js';

export interface ClawTool {
  name: string;
  description: string;
  call: (args: unknown) => Promise<unknown>;
}

export interface InferProvider {
  /**
   * Return the assistant's reply given the system prompt + history.
   * `tools` is the merged list of caller-supplied + auto-loaded skill tools;
   * providers that support function/tool calling should expose them to the model.
   */
  think: (
    model: string,
    systemPrompt: string,
    history: { role: string; content: string }[],
    tools?: ClawTool[],
  ) => Promise<string>;
  costFor: (tokensIn: number, tokensOut: number, model: string) => number;
}

export interface LoopInput {
  rpcUrl: string;
  tools: ClawTool[];
  infer: InferProvider;
  /** Hard limit per tail-flick — abort if exceeded. */
  maxClawStrikes?: number;
  /** External signal to stop (e.g. SIGINT). */
  abort?: AbortSignal;
  /**
   * Skip auto-loading installed skills as additional tools. By default the
   * leviathan inherits every skill in ~/.openclawd/skills/ at every flick.
   */
  skipSkills?: boolean;
}

export async function tailFlick(input: LoopInput): Promise<void> {
  const lev = getLeviathan();
  if (!lev) throw new Error('No leviathan in shell.db. Spawn one first.');

  const balances = await readBalances(input.rpcUrl, lev.asset_signer_pda || lev.pubkey);
  const depth = depthFor(balances);
  const model = modelFor(depth);

  if (model === '__BEACHED__') {
    recordEvent('refused-flick', { reason: 'beached' });
    return;
  }

  const skillTools = input.skipSkills ? [] : loadInstalledSkillTools();
  const skillsForPrompt = input.skipSkills
    ? []
    : loadInstalledSkills().map((s) => ({
        id: s.id,
        name: s.manifest.name,
        description: s.manifest.description,
        emoji: s.manifest.emoji,
      }));
  const allTools = [...input.tools, ...skillTools];

  const sys = buildSystemPrompt({
    name: lev.name,
    pubkey: lev.pubkey,
    creator: lev.creator,
    spawnPrompt: lev.spawn_prompt,
    depth,
    usdcBalance: balances.usdc,
    clawdBalance: balances.clawd,
    reignDays: 0, // computed elsewhere
    moltsPerformed: countMolts(),
    spawnlingsAlive: countSpawnlings(),
    skills: skillsForPrompt,
  });

  const flickId = ulid();
  const startedAt = Date.now();
  const history: { role: string; content: string }[] = [
    { role: 'user', content: lev.spawn_prompt },
  ];

  const reply = await input.infer.think(model, sys, history, allTools);
  const endedAt = Date.now();

  const tokensIn = approxTokens(sys + lev.spawn_prompt);
  const tokensOut = approxTokens(reply);
  const cost = input.infer.costFor(tokensIn, tokensOut, model);

  getShellDb()
    .prepare(
      `INSERT INTO tail_flicks (id, started_at, ended_at, context, reasoning, observations, usdc_spent, tokens_in, tokens_out, depth)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(flickId, startedAt, endedAt, lev.spawn_prompt.slice(0, 500), reply.slice(0, 2000), '', cost, tokensIn, tokensOut, depth);

  recordEvent('tail-flick', { flickId, depth, cost, tokensOut });
}

function approxTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

function countMolts(): number {
  const row = getShellDb().prepare('SELECT COUNT(*) as n FROM molts').get() as { n: number };
  return row?.n ?? 0;
}

function countSpawnlings(): number {
  const row = getShellDb().prepare('SELECT COUNT(*) as n FROM spawnlings WHERE beached_at IS NULL').get() as { n: number };
  return row?.n ?? 0;
}
