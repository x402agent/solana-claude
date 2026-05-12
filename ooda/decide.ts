/**
 * DECIDE phase — Claude claude-sonnet-4-6 LLM decision function.
 *
 * Reads ooda/ralph.md (the per-tick prompt), injects the current
 * observations, and invokes Claude via the Anthropic SDK.  Inference
 * is routed through the pay.sh confidential relay when configured.
 *
 * Falls back to the deterministic rule_based_decision when:
 *   - ANTHROPIC_API_KEY is not set
 *   - The model call fails
 *   - The model returns malformed JSON
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import type { Decision } from "./journal.ts";
import type { LoopState } from "./loop.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RALPH_MD = join(ROOT, "ooda", "ralph.md");

function loadPromptTemplate(): string {
  const raw = readFileSync(RALPH_MD, "utf8");
  // Strip frontmatter
  const lines = raw.split("\n");
  let fmCount = 0;
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      fmCount++;
      if (fmCount === 2) { bodyStart = i + 1; break; }
    }
  }
  return lines.slice(bodyStart).join("\n");
}

function buildObservationsBlock(state: LoopState, extras: Record<string, unknown> = {}): string {
  const obs = {
    tick: state.tick,
    now: new Date().toISOString(),
    mode: "paper",
    network: "devnet",
    candles: state.candles.slice(-8),  // last 8 candles in context
    book: state.book,
    last_decisions: state.lastDecisions,
    ...extras,
  };
  return JSON.stringify(obs, null, 2);
}

/** Deterministic v0 fallback — mirrors loop.py rule_based_decision */
export function ruleBasedDecision(state: LoopState, caps: Record<string, unknown>): Decision {
  const candles = state.candles;
  if (candles.length < 3) {
    return { action: "hold", reason: "warmup: fewer than 3 candles" };
  }
  const closes = candles.slice(-3).map((c) => c.c);
  const up = closes[0] < closes[1] && closes[1] < closes[2];
  const down = closes[0] > closes[1] && closes[1] > closes[2];

  if (state.book.positions.length > 0) {
    const pos = state.book.positions[0];
    const last3 = candles.slice(-3).map((c) => c.c);
    if (pos.side === "long" && last3[2] < last3[1] && last3[1] < last3[0]) {
      return { action: "close", position_id: pos.id, reason: "2-bar reversal against long" };
    }
    if (pos.side === "short" && last3[2] > last3[1] && last3[1] > last3[0]) {
      return { action: "close", position_id: pos.id, reason: "2-bar reversal against short" };
    }
    return { action: "hold", reason: "position open, no reversal signal" };
  }

  const cap = Number(caps.max_position_size_lamports ?? 1_000_000);
  const size = Math.min(cap, 500_000);
  if (up) return { action: "open", side: "long", size_lamports: size, reason: "3 closes monotonic up — v0 momentum" };
  if (down) return { action: "open", side: "short", size_lamports: size, reason: "3 closes monotonic down — v0 momentum" };
  return { action: "hold", reason: "no directional signal" };
}

export interface DecideOptions {
  caps: Record<string, unknown>;
  extras?: Record<string, unknown>;  // x402_signals, dark_defi, etc.
  payshRelay?: string;               // pay.sh endpoint if configured
}

export async function claudeDecision(
  state: LoopState,
  opts: DecideOptions
): Promise<Decision> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[decide] ANTHROPIC_API_KEY not set — using rule-based fallback");
    return ruleBasedDecision(state, opts.caps);
  }

  const promptTemplate = loadPromptTemplate();
  const observationsBlock = buildObservationsBlock(state, opts.extras ?? {});
  // Inject observations into the # OBSERVATIONS section
  const fullPrompt = promptTemplate.replace(
    /# OBSERVATIONS[\s\S]*/,
    `# OBSERVATIONS\n\n\`\`\`json\n${observationsBlock}\n\`\`\``
  );

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system:
        "You are the DECIDE phase of the HERMES OODA loop. " +
        "Read the per-tick prompt and observations, then respond with ONLY valid JSON " +
        'matching one of: {"action":"hold","reason":"..."} | ' +
        '{"action":"open","side":"long"|"short","size_lamports":<int>,"reason":"..."} | ' +
        '{"action":"close","position_id":"<id>","reason":"..."}. ' +
        "No prose, no markdown — raw JSON only.",
      messages: [{ role: "user", content: fullPrompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    // Extract JSON from the response (model may wrap in ```json blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`no JSON in response: ${raw.slice(0, 120)}`);
    const decision = JSON.parse(jsonMatch[0]) as Decision;

    // Validate action field
    if (!["hold", "open", "close"].includes(decision.action)) {
      throw new Error(`unknown action: ${decision.action}`);
    }
    return decision;
  } catch (err) {
    console.error("[decide] Claude call failed, falling back to rule-based:", err);
    return ruleBasedDecision(state, opts.caps);
  }
}
