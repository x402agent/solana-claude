/**
 * ooda/claude-decision.ts — AI-powered OODA decision function
 *
 * Provider priority:
 *   1. DEEPSEEK_API_KEY  → deepseek-v4-flash (fast, cheap, thinking mode)
 *   2. OPENROUTER_API_KEY → configurable model
 *   3. ANTHROPIC_API_KEY  → Claude direct
 *
 * Design: Fresh context per tick. No conversation history.
 * The per-tick prompt (RALPH.md) + observations → one JSON decision.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import type { State, Candle } from './state.js';
import type { TickEntry } from './journal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RALPH_PATH = join(__dirname, 'RALPH.md');

// ── Provider resolution (lazy singleton) ─────────────────────────────────────

interface OodaClient {
  client: OpenAI;
  model: string;
  provider: string;
}

let _oodaClient: OodaClient | null = null;

function getOodaClient(): OodaClient {
  if (_oodaClient) return _oodaClient;

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const modelOverride = process.env.OODA_MODEL;

  if (deepseekKey) {
    _oodaClient = {
      client: new OpenAI({ apiKey: deepseekKey, baseURL: 'https://api.deepseek.com' }),
      model: modelOverride ?? 'deepseek-v4-flash',
      provider: 'deepseek',
    };
  } else if (openrouterKey) {
    _oodaClient = {
      client: new OpenAI({
        apiKey: openrouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: { 'HTTP-Referer': 'https://openclawd.com', 'X-Title': 'Solana Clawd OODA' },
      }),
      model: modelOverride ?? 'anthropic/claude-haiku-4-5',
      provider: 'openrouter',
    };
  } else if (anthropicKey) {
    // Anthropic via DeepSeek-compatible endpoint doesn't apply here — use OpenAI compat shim
    _oodaClient = {
      client: new OpenAI({ apiKey: anthropicKey, baseURL: 'https://api.anthropic.com/v1' }),
      model: modelOverride ?? 'claude-haiku-4-5-20251001',
      provider: 'anthropic',
    };
  } else {
    throw new Error('OODA loop requires DEEPSEEK_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY');
  }

  return _oodaClient;
}

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface Observations {
  tick: number;
  now: string;
  mode: 'paper';
  network: 'devnet';
  candles: Candle[];
  perps_oi_signal?: unknown;
  book: { positions: unknown[]; cash_lamports: number };
  last_decisions: TickEntry[];
}

/**
 * Build the per-tick prompt by injecting observations into RALPH.md.
 * Read fresh each tick so in-flight edits to RALPH.md take effect immediately.
 */
export function buildPrompt(obs: Observations): string {
  const ralph = readFileSync(RALPH_PATH, 'utf8');
  const obsBlock = `\`\`\`json\n${JSON.stringify(obs, null, 2)}\n\`\`\``;
  return ralph.replace(
    '<!-- harness will inject the observations JSON here, then invoke you -->',
    obsBlock,
  );
}

/**
 * AI decision call — one tick of the OODA loop.
 * Returns raw parsed JSON (validation in validate.ts).
 *
 * DeepSeek thinking mode is enabled when using deepseek-v4-pro.
 * Default deepseek-v4-flash is non-thinking for speed.
 */
export async function claudeDecision(obs: Observations): Promise<unknown> {
  const { client, model, provider } = getOodaClient();
  const prompt = buildPrompt(obs);

  const isThinkingModel = model.includes('pro') || model.includes('opus') || model.includes('reasoner');
  const extraBody = provider === 'deepseek' && isThinkingModel
    ? { thinking: { type: 'enabled' }, reasoning_effort: 'high' }
    : {};

  const response = await client.chat.completions.create({
    model,
    max_tokens: 512,
    messages: [
      {
        role: 'system',
        content: [
          'You are a single tick of an OODA trading loop on Solana.',
          'You MUST respond with ONLY a single JSON object matching one of the three shapes.',
          'No markdown. No explanation. No preamble. Just the JSON object.',
          'If uncertain, return {"action":"hold","reason":"<one sentence>"}.',
        ].join(' '),
      },
      { role: 'user', content: prompt },
    ],
    ...extraBody,
  } as Parameters<typeof client.chat.completions.create>[0]);

  const msg = response.choices[0]?.message;
  const text = msg?.content ?? '';

  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`AI returned no JSON object (${provider}/${model}): ${text.slice(0, 200)}`);

  return JSON.parse(match[0]);
}

/**
 * Deterministic fallback decision_fn (no API key needed).
 * Implements the v0 momentum rule from RALPH.md exactly.
 * Use this for testing the harness mechanics without an API key.
 */
export function deterministicDecision(obs: Observations): unknown {
  const { candles, book } = obs;
  if (candles.length < 3) return { action: 'hold', reason: 'fewer than 3 candles — insufficient data' };

  const last3 = candles.slice(-3);
  const closes = last3.map(c => c.c);
  const rising = closes[1]! > closes[0]! && closes[2]! > closes[1]!;
  const falling = closes[1]! < closes[0]! && closes[2]! < closes[1]!;

  if (book.positions.length === 0) {
    if (rising) return {
      action: 'open',
      side: 'long',
      size_lamports: 250_000,
      reason: '3 consecutive rising closes — opening long at 0.25x cap',
    };
    if (falling) return {
      action: 'open',
      side: 'short',
      size_lamports: 250_000,
      reason: '3 consecutive falling closes — opening short at 0.25x cap',
    };
    return { action: 'hold', reason: 'no clear momentum signal' };
  }

  // Check reversal (2 consecutive bars against position)
  const pos = book.positions[0] as { side: string; entry_price: number };
  const lastClose = closes[2]!;
  const prevClose = closes[1]!;
  const prevPrevClose = closes[0]!;

  if (pos.side === 'long') {
    if (lastClose < prevClose && prevClose < prevPrevClose) {
      return { action: 'close', position_id: (book.positions[0] as {id: string}).id, reason: '2 bars down against long — closing position' };
    }
  } else {
    if (lastClose > prevClose && prevClose > prevPrevClose) {
      return { action: 'close', position_id: (book.positions[0] as {id: string}).id, reason: '2 bars up against short — closing position' };
    }
  }

  return { action: 'hold', reason: 'position open, no reversal signal' };
}
