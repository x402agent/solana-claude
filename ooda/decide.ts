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
import { mkdirSync, readFileSync as readFileSyncFs, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import type { Decision } from "./journal.ts";
import type { LoopState } from "./loop.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RALPH_MD = join(ROOT, "ooda", "ralph.md");
const JOURNAL_DIR = join(ROOT, "ooda", "journal");
const OPENAI_SESSION_FILE = join(JOURNAL_DIR, "openai-goblin-session.json");

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
  goblinMode?: boolean;
  background?: boolean;
  computerUse?: boolean;
}

interface OpenAISessionState {
  previous_response_id?: string;
  conversation_id?: string;
  last_model?: string;
  updated_at?: string;
}

function loadOpenAISessionState(): OpenAISessionState {
  try {
    return JSON.parse(readFileSyncFs(OPENAI_SESSION_FILE, "utf8")) as OpenAISessionState;
  } catch {
    return {};
  }
}

function saveOpenAISessionState(state: OpenAISessionState): void {
  mkdirSync(JOURNAL_DIR, { recursive: true });
  writeFileSync(OPENAI_SESSION_FILE, JSON.stringify(state, null, 2) + "\n", "utf8");
}

function ruleBasedGoblinDecision(state: LoopState, caps: Record<string, unknown>): Decision {
  const base = ruleBasedDecision(state, caps);
  const darkDefi = (state as LoopState & { extras?: Record<string, unknown> }).extras?.dark_defi as
    | { tier?: string; confidence?: number; type?: string }
    | undefined;

  if (base.action === "open") {
    const cap = Number(caps.max_position_size_lamports ?? 1_000_000);
    base.size_lamports = Math.min(cap, 800_000);
    base.aggression = "goblin";
    base.goblin_mode = true;
    base.confidence = darkDefi?.confidence ?? 0.66;
    base.thesis = darkDefi ? `Goblin momentum with ${darkDefi.tier ?? "unknown"} ${darkDefi.type ?? "signal"}` : "Goblin momentum breakout";
    base.computer_use_plan = [
      "Refresh market dashboard and top movers",
      "Scan pump.fun board for fresh runners",
      "Check order-book imbalance before next tick",
    ];
    return base;
  }

  return {
    ...base,
    aggression: "goblin",
    goblin_mode: true,
    confidence: 0.51,
    computer_use_plan: [
      "Refresh market dashboard and top movers",
      "Watch for velocity spike or whale activity",
    ],
  };
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

function buildOpenAIPrompt(state: LoopState, opts: DecideOptions): string {
  const promptTemplate = loadPromptTemplate();
  const observationsBlock = buildObservationsBlock(state, {
    ...(opts.extras ?? {}),
    autonomy_mode: "paper-auto",
    computer_use_enabled: opts.computerUse ?? false,
    goblin_mode: opts.goblinMode ?? false,
  });

  const modeBlock = opts.goblinMode
    ? `
## GOBLIN MODE

Goblin mode is enabled. Trade like a fast, feral Solana scalp operator, but stay inside harness safety.

- Bias toward fast momentum, runner continuation, and whale-following setups.
- Still respect paper mode, devnet, one position, and kill-switch constraints.
- If the setup is weak, hold. Goblin mode means aggressive selection, not reckless action.
- Include:
  - "confidence": number from 0 to 1
  - "aggression": "goblin"
  - "goblin_mode": true
  - "thesis": short string
  - "computer_use_plan": array of 2-4 short terminal/browser/operator actions for the next tick
`
    : `
## ORCHESTRATION

Include a short "computer_use_plan" array with 1-3 operator actions that a browser or terminal agent could perform next tick.
`;

  return (
    promptTemplate.replace(
      /# OBSERVATIONS[\s\S]*/,
      `# OBSERVATIONS\n\n\`\`\`json\n${observationsBlock}\n\`\`\``
    ) +
    "\n" +
    modeBlock
  );
}

async function createOpenAIResponse(
  payload: Record<string, unknown>,
  apiKey: string
): Promise<Record<string, unknown>> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`OpenAI create failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

async function retrieveOpenAIResponse(responseId: string, apiKey: string): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.openai.com/v1/responses/${responseId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAI retrieve failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

function extractOutputText(payload: Record<string, unknown>): string {
  const outputText = payload.output_text;
  if (typeof outputText === "string" && outputText.trim()) return outputText.trim();

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? ((item as { content?: unknown[] }).content as unknown[])
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }

  throw new Error("OpenAI response did not include output_text");
}

export async function openaiDecision(state: LoopState, opts: DecideOptions): Promise<Decision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[decide] OPENAI_API_KEY not set — using fallback");
    return opts.goblinMode ? ruleBasedGoblinDecision(state, opts.caps) : ruleBasedDecision(state, opts.caps);
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-5.5";
  const session = loadOpenAISessionState();
  const input = buildOpenAIPrompt(state, opts);

  const payload: Record<string, unknown> = {
    model,
    input: [
      {
        role: "user",
        content: input,
      },
    ],
    prompt_cache_key: opts.goblinMode ? "solana-clawd-goblin-mode-v1" : "solana-clawd-ooda-v1",
    context_management: [{ type: "compaction", compact_threshold: 120000 }],
    text: { format: { type: "json_object" } },
    store: opts.background ? true : false,
    previous_response_id: session.previous_response_id ?? undefined,
    background: opts.background ?? false,
  };

  try {
    let response = await createOpenAIResponse(payload, apiKey);
    let status = typeof response.status === "string" ? response.status : "completed";

    while (status === "queued" || status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const id = response.id;
      if (typeof id !== "string") break;
      response = await retrieveOpenAIResponse(id, apiKey);
      status = typeof response.status === "string" ? response.status : "completed";
    }

    const responseId = typeof response.id === "string" ? response.id : undefined;
    saveOpenAISessionState({
      previous_response_id: responseId,
      conversation_id: typeof response.conversation === "string" ? response.conversation : session.conversation_id,
      last_model: model,
      updated_at: new Date().toISOString(),
    });

    const raw = extractOutputText(response);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`no JSON in OpenAI response: ${raw.slice(0, 200)}`);
    return JSON.parse(jsonMatch[0]) as Decision;
  } catch (err) {
    console.error("[decide] OpenAI call failed, using fallback:", err);
    return opts.goblinMode ? ruleBasedGoblinDecision(state, opts.caps) : ruleBasedDecision(state, opts.caps);
  }
}
