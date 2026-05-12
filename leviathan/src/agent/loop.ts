/**
 * leviathan/src/agent/loop.ts — SENSE → THINK → STRIKE → DRIFT
 *
 * The core tail-flick loop powered by Anthropic Claude via the
 * Anthropic ACP (Agent Control Protocol) / claude-code SDK.
 *
 * Each tick:
 *   1. SENSE  — Build observations (balances, SHELL.md, history)
 *   2. THINK  — Call Claude with fresh system prompt (no history)
 *   3. STRIKE — Execute the tool Claude chose
 *   4. DRIFT  — Observe result, update SHELL.md, journal the tick
 *
 * The depth tier gates model choice and tool surface.
 * The Three Laws are injected into every system prompt.
 * No private keys in this file — signing is handled by the identity module.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Tool, MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import { buildSystemPrompt, buildShorelinePrompt } from './system-prompt.js';
import { computeDepth, selectModel, isActionAllowed, formatDepth } from '../survival.js';
import { assertConstitutionIntact } from '../three-laws.js';
import type { ClawState, ClawStrike, TailFlickEvent } from '../types.js';
import { TOOLS } from './tools.js';

export interface TailFlickResult {
  tick: number;
  strike: ClawStrike;
  depthChanged: boolean;
  beached: boolean;
  newShellMd?: string;
  event: TailFlickEvent;
}

/**
 * Run one tail-flick (one OODA tick of the leviathan).
 * Returns the result — caller persists to shell.db + journals.
 */
export async function tailFlick(
  state: ClawState,
  spawnPrompt: string,
  client: Anthropic,
  strikeHistory: ClawStrike[],
): Promise<TailFlickResult> {
  const tick = state.tickCount + 1;
  const now = new Date().toISOString();

  // Assert constitution is intact before every tick
  assertConstitutionIntact(state.identity.constitutionHash);

  // Compute current depth
  const newDepth = computeDepth(state.usdcBalance);
  const depthChanged = newDepth !== state.depth;
  const beached = newDepth === 'beached';

  const emit = (detail?: unknown): TailFlickEvent => ({
    event: 'pulse',
    tick,
    now,
    depth: newDepth,
    usdcBalance: state.usdcBalance,
    detail,
  });

  if (beached) {
    const strike: ClawStrike = {
      id: `strike-${tick}`,
      tick,
      action: 'beach',
      success: true,
      timestamp: now,
    };
    return {
      tick,
      strike,
      depthChanged,
      beached: true,
      event: { ...emit(), event: 'beach' },
    };
  }

  // Build per-tick observations for user message
  const historyBlock = strikeHistory.slice(-3).map((s, i) =>
    `Strike ${i + 1}: action=${s.action} tool=${s.tool ?? 'none'} ` +
    `success=${s.success} output=${JSON.stringify(s.output ?? '').slice(0, 120)}`,
  ).join('\n');

  const userMessage = [
    `Tick: ${tick}`,
    `Depth: ${formatDepth(newDepth, state.usdcBalance)}`,
    `Balances: USDC=$${state.usdcBalance.toFixed(4)} SOL=${state.solBalance.toFixed(4)} CLAWD=${state.clawdBalance.toFixed(0)}`,
    `Open trades: ${state.openTrades}`,
    `Spawnlings: ${state.spawnlings.length}`,
    '',
    'Recent strikes:',
    historyBlock || '(none yet)',
    '',
    'Choose your next action. Call exactly one tool.',
  ].join('\n');

  // Build system prompt (shoreline gets condensed version to save tokens)
  const systemPrompt = newDepth === 'shoreline'
    ? buildShorelinePrompt(state)
    : buildSystemPrompt(state, spawnPrompt);

  const model = selectModel(newDepth);
  if (!model) throw new Error('beached — no model available');

  // Filter tools to depth-allowed surface
  const allowedTools: Tool[] = TOOLS.filter(t =>
    isActionAllowed(newDepth, t.name as string) || t.name === 'hold',
  );

  // ── THINK (Claude API call — fresh context, no conversation history) ─────────
  const messages: MessageParam[] = [{ role: 'user', content: userMessage }];

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    tools: allowedTools,
    messages,
    // ACP: stop when Claude picks a tool (one strike per tick)
    tool_choice: { type: 'auto' },
  });

  // ── STRIKE ────────────────────────────────────────────────────────────────
  const toolUse = response.content.find(b => b.type === 'tool_use');
  const textBlock = response.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined;

  let strike: ClawStrike;

  if (!toolUse || toolUse.type !== 'tool_use') {
    // Claude returned text only — treat as hold
    strike = {
      id: `strike-${tick}`,
      tick,
      action: 'hold',
      success: true,
      output: textBlock?.text?.slice(0, 200),
      timestamp: now,
    };
  } else {
    // Execute the chosen tool
    const toolResult = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>, state, newDepth);
    strike = {
      id: `strike-${tick}`,
      tick,
      action: mapToolToAction(toolUse.name),
      tool: toolUse.name,
      input: toolUse.input,
      output: toolResult.output,
      costUsdc: toolResult.costUsdc,
      success: toolResult.success,
      timestamp: now,
    };
  }

  // ── DRIFT ────────────────────────────────────────────────────────────────
  // Update SHELL.md if shell_write was called
  const newShellMd = strike.tool === 'shell_write'
    ? String((strike.input as { content?: string })?.content ?? state.shellMd)
    : undefined;

  return {
    tick,
    strike,
    depthChanged,
    beached: false,
    newShellMd,
    event: emit(strike),
  };
}

// ─── Tool executor ────────────────────────────────────────────────────────────

interface ToolResult {
  output: unknown;
  success: boolean;
  costUsdc?: number;
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  state: ClawState,
  depth: string,
): Promise<ToolResult> {
  switch (name) {
    case 'solana_balance': {
      const address = String(input['address'] ?? state.identity.pubkey);
      try {
        const rpc = process.env['SOLANA_RPC_URL'] ?? 'https://api.devnet.solana.com';
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
        });
        const data = (await res.json()) as { result?: { value?: number } };
        return { output: { sol: (data.result?.value ?? 0) / 1e9, address }, success: true };
      } catch (e) {
        return { output: String(e), success: false };
      }
    }

    case 'jupiter_quote': {
      const { inputMint, outputMint, amount } = input as { inputMint: string; outputMint: string; amount: string };
      try {
        const url = `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        return { output: await res.json(), success: res.ok };
      } catch (e) {
        return { output: String(e), success: false };
      }
    }

    case 'ooda_signal': {
      // Import and run one OODA tick deterministically
      const { deterministicDecision } = await import('../../ooda/claude-decision.js').catch(() => ({ deterministicDecision: null }));
      if (!deterministicDecision) return { output: 'ooda module not available', success: false };
      const signal = deterministicDecision({
        tick: state.tickCount,
        now: new Date().toISOString(),
        mode: 'paper',
        network: 'devnet',
        candles: [],
        book: { positions: [], cash_lamports: Math.round(state.usdcBalance * 1e6) },
        last_decisions: [],
      });
      return { output: signal, success: true };
    }

    case 'a2a_task': {
      const { agentUrl, skill, message } = input as { agentUrl: string; skill: string; message: string };
      const { A2AClient } = await import('../../x402/a2a-agent.js').catch(() => ({ A2AClient: null }));
      if (!A2AClient) return { output: 'a2a module not available', success: false };
      try {
        const client = new A2AClient({ agentUrl, autoPay: false, maxAmountUsdc: 0.5, timeoutMs: 10_000 });
        const card = await client.discover();
        return { output: { agent: card.name, skills: card.skills.map(s => s.id) }, success: true };
      } catch (e) {
        return { output: String(e), success: false };
      }
    }

    case 'shell_write': {
      const content = String(input['content'] ?? '');
      if (!content.trim()) return { output: 'empty content — shell not updated', success: false };
      return { output: { updated: true, length: content.length }, success: true };
    }

    case 'percolator_list_markets': {
      // Call Percolator CLI (if installed via @openclawdsolana/percolator)
      try {
        const { execa } = await import('execa');
        const result = await execa('percolator', ['list-markets', '--json'], { timeout: 10_000 });
        return { output: result.stdout, success: true };
      } catch (e) {
        return { output: `percolator not installed: ${String(e).slice(0, 100)}`, success: false };
      }
    }

    case 'hold':
      return { output: 'holding', success: true };

    default:
      return { output: `unknown tool: ${name}`, success: false };
  }
}

function mapToolToAction(toolName: string): ClawStrike['action'] {
  if (toolName === 'spawn_spawnling') return 'spawn';
  if (toolName === 'shell_write') return 'molt';
  if (toolName === 'hold') return 'hold';
  if (toolName.includes('jupiter_swap') || toolName.includes('paysh')) return 'transfer';
  return 'tool_call';
}
