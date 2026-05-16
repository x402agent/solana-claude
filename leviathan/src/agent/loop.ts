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
import { appendStrike } from '../state/index.js';
import type { ClawState, ClawStrike, ClawdMemoryKind, TailFlickEvent } from '../types.js';
import { TOOLS } from './tools.js';
import { Percolator } from './percolator.js';
import { VulcanClient } from './vulcan.js';
import { getWallet } from './wallet.js';
import {
  loadLeviathanMemoryContext,
  recallClawdMemory,
  rememberClawdMemory,
  rememberLeviathanStrike,
  researchClawdMemory,
} from '../memory/clawd.js';

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

  const memoryContext = await loadLeviathanMemoryContext(state, strikeHistory, {
    bank: 'clawd',
    timeoutMs: 8_000,
  });

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
    'Clawd Memory recall:',
    memoryContext.text,
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

  // ── THINK (Claude ACP call — fresh context, no conversation history) ─────────
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

  // Journal this strike for future ticks
  appendStrike(strike);
  void rememberLeviathanStrike(state, strike, {
    bank: 'clawd',
    timeoutMs: 8_000,
  }).catch(() => undefined);

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

    // ── Solana / wallet ────────────────────────────────────────────────────
    case 'solana_balance': {
      const wallet = getWallet();
      try {
        const brief = await wallet.brief();
        return { output: brief, success: true };
      } catch (e) {
        return { output: String(e), success: false };
      }
    }

    case 'wallet_brief': {
      const wallet = getWallet();
      try {
        const brief = await wallet.brief();
        return { output: brief, success: true };
      } catch (e) {
        return { output: String(e), success: false };
      }
    }

    case 'helius_transactions': {
      const address = String(input['address'] ?? state.identity.pubkey);
      const apiKey = process.env['HELIUS_API_KEY'];
      if (!apiKey) return { output: 'HELIUS_API_KEY not set', success: false };
      try {
        const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=10`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) return { output: `Helius ${res.status}`, success: false };
        const txs = (await res.json()) as unknown[];
        return { output: txs.slice(0, 5), success: true };
      } catch (e) {
        return { output: String(e), success: false };
      }
    }

    // ── Clawd Memory ──────────────────────────────────────────────────────
    case 'clawd_memory_recall': {
      const query = String(input['query'] ?? '');
      const topK = Number(input['topK'] ?? 6);
      if (!query.trim()) return { output: 'query required', success: false };
      const result = await recallClawdMemory({ query, topK }, { bank: 'clawd', timeoutMs: 10_000 });
      return { output: result.ok ? result.data : result.error, success: result.ok };
    }

    case 'clawd_memory_remember': {
      const title = String(input['title'] ?? '');
      const content = String(input['content'] ?? '');
      const kind = normalizeMemoryKind(String(input['kind'] ?? 'agent'));
      const tags = Array.isArray(input['tags']) ? input['tags'].map(String) : ['clawd', 'leviathan'];
      const importance = Number(input['importance'] ?? 0.7);
      if (!title.trim() || !content.trim()) return { output: 'title and content required', success: false };
      if (/(private key|seed phrase|api key|secret|password|token=|sk-)/i.test(content)) {
        return { output: 'refusing to store likely secret material', success: false };
      }
      const result = await rememberClawdMemory({
        title,
        content,
        kind,
        tags: ['clawd', 'leviathan', ...tags],
        importance,
        source: 'leviathan',
      }, { bank: 'clawd', timeoutMs: 10_000 });
      return { output: result.ok ? result.data : result.error, success: result.ok };
    }

    case 'clawd_memory_research': {
      const target = String(input['target'] ?? '');
      const tags = Array.isArray(input['tags']) ? input['tags'].map(String) : [];
      if (!target.trim()) return { output: 'target required', success: false };
      const result = await researchClawdMemory(target, ['clawd', 'leviathan', ...tags], {
        bank: 'clawd',
        timeoutMs: 15_000,
      });
      return { output: result.ok ? result.data : result.error, success: result.ok };
    }

    // ── Jupiter ────────────────────────────────────────────────────────────
    case 'jupiter_quote': {
      const { inputMint, outputMint, amount } = input as { inputMint: string; outputMint: string; amount: string };
      const wallet = getWallet();
      try {
        const quote = await wallet.jupiterSwapQuote({ inputMint, outputMint, amount });
        return { output: quote, success: true };
      } catch (e) {
        return { output: String(e), success: false };
      }
    }

    case 'jupiter_swap': {
      // Swaps require depth >= shallow and are paper-only on devnet
      if (depth === 'shoreline') {
        return { output: 'jupiter_swap blocked at shoreline depth (insufficient reserves)', success: false };
      }
      const { inputMint, outputMint, amount, slippageBps } = input as {
        inputMint: string; outputMint: string; amount: string; slippageBps?: number;
      };
      const wallet = getWallet();
      try {
        const quote = await wallet.jupiterSwapQuote({ inputMint, outputMint, amount, slippageBps });
        // Paper mode: return quote as if executed, don't broadcast
        return { output: { paperMode: true, quote }, success: true, costUsdc: 0.001 };
      } catch (e) {
        return { output: String(e), success: false };
      }
    }

    // ── OODA signal ────────────────────────────────────────────────────────
    case 'ooda_signal': {
      try {
        const oodaModule = '../../ooda/claude-decision.js';
        const { deterministicDecision } = await import(oodaModule) as {
          deterministicDecision: (obs: unknown) => unknown
        };
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
      } catch (e) {
        return { output: `ooda module not available: ${String(e).slice(0, 80)}`, success: false };
      }
    }

    // ── Google A2A ────────────────────────────────────────────────────────
    case 'a2a_task': {
      const { agentUrl, skill, message } = input as { agentUrl: string; skill: string; message: string };
      try {
        const a2aModule = '../../x402/a2a-agent.js';
        const { A2AClient } = await import(a2aModule) as {
          A2AClient: new (opts: { agentUrl: string; autoPay: boolean; maxAmountUsdc: number; timeoutMs: number }) => {
            discover: () => Promise<{ name: string; skills: Array<{ id: string }> }>
          }
        };
        const client = new A2AClient({ agentUrl, autoPay: false, maxAmountUsdc: 0.5, timeoutMs: 10_000 });
        const card = await client.discover();
        return {
          output: { agent: card.name, skills: card.skills.map(s => s.id), requestedSkill: skill, message },
          success: true,
        };
      } catch (e) {
        return { output: `a2a discovery failed: ${String(e).slice(0, 100)}`, success: false };
      }
    }

    // ── pay.sh confidential payment ────────────────────────────────────────
    case 'paysh_pay': {
      const { url, amount, blind = true } = input as { url: string; amount: number; blind?: boolean };
      if (amount > 2.0) return { output: 'paysh_pay capped at 2.0 USDC per call', success: false };
      // Record as a payment intent (actual execution requires wallet + RPC)
      return {
        output: {
          intent: 'paysh_pay',
          url,
          amount,
          blind,
          status: 'recorded — execute via pay.sh relay when wallet funded',
        },
        success: true,
        costUsdc: amount,
      };
    }

    // ── Percolator (perpetuals) ────────────────────────────────────────────
    case 'percolator_list_markets': {
      const result = await Percolator.listMarkets();
      return { output: result, success: !String(result).startsWith('percolator') };
    }

    case 'percolator_slab_get': {
      const pubkey = String(input['pubkey'] ?? '');
      if (!pubkey) return { output: 'pubkey required', success: false };
      const result = await Percolator.slabGet(pubkey);
      return { output: result, success: !String(result).startsWith('percolator') };
    }

    case 'percolator_quote': {
      const { market, side, size } = input as { market: string; side: 'long' | 'short'; size: string };
      const result = await Percolator.quoteMarket(market, side, size);
      return { output: result, success: !String(result).startsWith('percolator') };
    }

    case 'percolator_funding_rate': {
      const market = String(input['market'] ?? '');
      if (!market) return { output: 'market required', success: false };
      const result = await Percolator.fundingRate(market);
      return { output: result, success: !String(result).startsWith('percolator') };
    }

    // ── Vulcan (Phoenix perpetuals) ────────────────────────────────────────
    case 'vulcan_markets': {
      const result = await VulcanClient.markets();
      return { output: result, success: !String(result).startsWith('vulcan') };
    }

    case 'vulcan_quote': {
      const { market, side, size } = input as { market: string; side: 'long' | 'short'; size: string };
      if (!market || !side || !size) return { output: 'market, side, and size required', success: false };
      const result = await VulcanClient.quote(market, side, size);
      return { output: result, success: !String(result).startsWith('vulcan') };
    }

    case 'vulcan_place_order': {
      if (depth === 'shoreline') {
        return { output: 'vulcan_place_order blocked at shoreline depth (insufficient reserves)', success: false };
      }
      const { market, side, size, limitPrice, reduceOnly, clientOrderId } = input as {
        market: string;
        side: 'long' | 'short';
        size: string;
        limitPrice?: string;
        reduceOnly?: boolean;
        clientOrderId?: string;
      };
      if (!market || !side || !size) return { output: 'market, side, and size required', success: false };
      const result = await VulcanClient.placeOrder(market, side, size, { limitPrice, reduceOnly, clientOrderId });
      return { output: result, success: !String(result).startsWith('vulcan') };
    }

    case 'vulcan_cancel_order': {
      if (depth === 'shoreline') {
        return { output: 'vulcan_cancel_order blocked at shoreline depth (insufficient reserves)', success: false };
      }
      const orderId = String(input['orderId'] ?? '');
      if (!orderId) return { output: 'orderId required', success: false };
      const result = await VulcanClient.cancelOrder(orderId);
      return { output: result, success: !String(result).startsWith('vulcan') };
    }

    case 'vulcan_positions': {
      const wallet = input['wallet'] ? String(input['wallet']) : undefined;
      const result = await VulcanClient.positions(wallet);
      return { output: result, success: !String(result).startsWith('vulcan') };
    }

    case 'vulcan_funding_rate': {
      const market = String(input['market'] ?? '');
      if (!market) return { output: 'market required', success: false };
      const result = await VulcanClient.fundingRate(market);
      return { output: result, success: !String(result).startsWith('vulcan') };
    }

    // ── Shell molt ────────────────────────────────────────────────────────
    case 'shell_write': {
      const content = String(input['content'] ?? '');
      if (!content.trim()) return { output: 'empty content — shell not updated', success: false };
      return { output: { updated: true, length: content.length }, success: true };
    }

    // ── Spawn spawnling (depth=deep only) ─────────────────────────────────
    case 'spawn_spawnling': {
      if (depth !== 'deep') {
        return { output: 'spawn_spawnling requires depth=deep', success: false };
      }
      const { name, spawnPrompt: childPrompt, seedUsdc = 1.0 } = input as {
        name: string; spawnPrompt: string; seedUsdc?: number;
      };
      if (!name || !childPrompt) return { output: 'name and spawnPrompt required', success: false };
      if (seedUsdc < 1.0) return { output: 'seedUsdc must be >= 1.0', success: false };
      if (seedUsdc > state.usdcBalance * 0.5) {
        return { output: `seedUsdc ${seedUsdc} exceeds 50% of reserves`, success: false };
      }
      // Record spawn intent — actual keypair generation happens in --spawn flow
      return {
        output: {
          intent: 'spawn_spawnling',
          name,
          spawnPrompt: childPrompt,
          seedUsdc,
          parent: state.identity.pubkey,
          status: 'queued — run `leviathan --spawn` with PARENT_PUBKEY set to activate',
        },
        success: true,
        costUsdc: seedUsdc,
      };
    }

    // ── Hold ──────────────────────────────────────────────────────────────
    case 'hold':
      return { output: (input['reason'] as string | undefined) ?? 'holding', success: true };

    default:
      return { output: `unknown tool: ${name}`, success: false };
  }
}

function mapToolToAction(toolName: string): ClawStrike['action'] {
  if (toolName === 'spawn_spawnling') return 'spawn';
  if (toolName === 'shell_write') return 'molt';
  if (toolName === 'hold') return 'hold';
  if (
    toolName === 'jupiter_swap' ||
    toolName === 'paysh_pay' ||
    toolName === 'vulcan_place_order' ||
    toolName === 'vulcan_cancel_order'
  ) return 'transfer';
  return 'tool_call';
}

function normalizeMemoryKind(kind: string): ClawdMemoryKind {
  const allowed: ClawdMemoryKind[] = ['agent', 'research', 'signal', 'trade', 'protocol', 'wallet', 'perp', 'note'];
  return allowed.includes(kind as ClawdMemoryKind) ? kind as ClawdMemoryKind : 'agent';
}
