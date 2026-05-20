/**
 * ooda/claude-decision.ts — Claude as the OODA decision function
 *
 * This is the LLM-in-the-loop adapter described in the Ralph README:
 *   "You can pass any Callable[[State, dict], dict] to run_loop to swap in
 *    a model call. Whatever you pass must still produce a decision that
 *    passes validate_decision."
 *
 * Design: Fresh context per tick. No conversation history. No memory.
 * The per-tick prompt (RALPH.md) + observations → one JSON decision.
 *
 * Sponsor: Anthropic / Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { State, Candle } from './state.js';
import type { TickEntry } from './journal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RALPH_PATH = join(__dirname, 'RALPH.md');

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
  }
  return _client;
}

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
 * This mirrors the Python harness: read the file fresh each tick so
 * any in-flight edits to RALPH.md take effect immediately.
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
 * Call Claude once with the fresh per-tick prompt.
 * Returns the raw parsed JSON (validation happens in validate.ts).
 *
 * Model choice: claude-haiku-4-5 — fast, cheap, sufficient for a
 * one-JSON-object decision. Override with OODA_MODEL env var.
 */
export async function claudeDecision(obs: Observations): Promise<unknown> {
  const client = getClient();
  const model = process.env['OODA_MODEL'] ?? 'claude-haiku-4-5-20251001';
  const prompt = buildPrompt(obs);

  const msg = await client.messages.create({
    model,
    max_tokens: 256,
    system: [
      'You are a single tick of an OODA trading loop.',
      'You MUST respond with ONLY a single JSON object matching one of the three shapes.',
      'No markdown. No explanation. No preamble. Just the JSON object.',
      'If uncertain, return {"action":"hold","reason":"<one sentence>"}.',
    ].join(' '),
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  // Strip any accidental markdown fences
  const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();

  // Extract the first JSON object in the response
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Claude returned no JSON object: ${text.slice(0, 200)}`);

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
