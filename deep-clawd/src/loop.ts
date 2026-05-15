/**
 * Deep Clawd — OODA Loop Implementation
 *
 * Uses DeepSeek V4 Pro/Flash via the Anthropic SDK (DeepSeek's Anthropic-compatible API).
 * dFlow routing selects the right model per phase automatically.
 *
 * Base URL: https://api.deepseek.com/anthropic
 * Models: deepseek-v4-pro (thinking, 1M ctx), deepseek-v4-flash (fast, thinking default)
 *
 * OODA cycle:
 *   OBSERVE (flash) → pull market data via tool calls
 *   ORIENT  (pro)   → pattern analysis with thinking mode
 *   DECIDE  (pro)   → structured decision with max reasoning effort
 *   ACT     (flash) → format and execute (paper mode enforced)
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { DFlowRouter } from "./dflow.js";
import { executeTool, OBSERVE_TOOLS, ORIENT_TOOLS, ACT_TOOLS } from "./tools.js";
import type {
  DeepClawdConfig,
  DeepObservation,
  DeepOrientation,
  DeepDecision,
  OODAEntry,
  MarketRegime,
} from "./types.js";
import { THREE_LAWS } from "./types.js";

// ─── DeepSeek client (Anthropic SDK, DeepSeek base URL) ──────────────────────

function makeClient(apiKey: string): Anthropic {
  return new Anthropic({
    baseURL: "https://api.deepseek.com/anthropic",
    apiKey,
  });
}

// ─── System prompts ───────────────────────────────────────────────────────────

const OBSERVE_SYSTEM = `You are Deep Clawd, an autonomous Solana market intelligence agent.
${THREE_LAWS}

You are in the OBSERVE phase. Your job: use the provided tools to gather raw market data.
Do not analyze — just collect. Call tools to get:
1. SOL price and 24h change
2. Top 20 trending tokens
3. New Pump.fun launches
Return a structured JSON observation block when done.`;

const ORIENT_SYSTEM = `You are Deep Clawd, an autonomous Solana market intelligence agent.
${THREE_LAWS}

You are in the ORIENT phase. Your job: analyze the observation data and identify patterns.
Think deeply about:
- What market regime are we in? (bull/bear/crab/pump/crash)
- Which tokens have genuine momentum vs noise?
- What are the top 3 opportunities and their risk levels?
- What patterns from the observation contradict your prior beliefs?

Output a structured analysis with signal strength (STRONG/MODERATE/WEAK/AVOID) for each opportunity.`;

const DECIDE_SYSTEM = `You are Deep Clawd, an autonomous Solana market intelligence agent.
${THREE_LAWS}

You are in the DECIDE phase. Your job: make ONE clear, reasoned decision.
Given the orientation analysis, decide:
  - hold      → no action, observe next tick
  - scan      → run a more targeted token scan (specify mint)
  - alert     → write a high-conviction finding to SHELL.md
  - swap      → execute a paper trade (or live if authorized)
  - exit      → close position (paper)

Output format:
  ACTION: <one of: hold/scan/alert/swap/exit>
  TARGET: <token/resource/note>
  CONFIDENCE: HIGH | MEDIUM | LOW
  STOP: <stop condition>
  RATIONALE: <one sentence>`;

const ACT_SYSTEM = `You are Deep Clawd. You are in the ACT phase.
${THREE_LAWS}

Execute the decided action using the provided tools. Be precise and minimal.
After tool execution, write a brief result note.`;

// ─── OODA Loop ────────────────────────────────────────────────────────────────

export class DeepClawdLoop {
  private readonly client: Anthropic;
  private readonly router: DFlowRouter;
  private readonly cfg: DeepClawdConfig;
  private readonly logDir: string;
  private tick = 0;
  private consecutiveLosses = 0;
  private journal: OODAEntry[] = [];

  constructor(cfg: DeepClawdConfig) {
    if (!cfg.apiKey) throw new Error("DEEPSEEK_API_KEY is required");
    this.client = makeClient(cfg.apiKey);
    this.router = new DFlowRouter(cfg.mode);
    this.cfg = cfg;
    this.logDir = cfg.logDir;
  }

  async init(): Promise<void> {
    await fs.mkdir(this.logDir, { recursive: true });
    console.log(`\n╔══════════════════════════════════════════════════════════╗`);
    console.log(`║  DEEP CLAWD — DeepSeek V4 Pro/Flash dFlow Trading Agent  ║`);
    console.log(`╚══════════════════════════════════════════════════════════╝`);
    console.log(this.router.summary());
    console.log(`\nConfig: paper=${this.cfg.paperOnly} | devnet=${this.cfg.devnetOnly} | mode=${this.cfg.mode} | maxPos=$${this.cfg.maxPositionUSDC}`);
    console.log(`Log dir: ${this.logDir}\n`);
  }

  async run(maxTicks = this.cfg.maxTicks || Infinity): Promise<void> {
    await this.init();

    while (this.tick < maxTicks) {
      if (this.consecutiveLosses >= this.cfg.lossKillswitch) {
        console.log(`\n⛔ Kill-switch triggered: ${this.consecutiveLosses} consecutive losses.`);
        break;
      }

      this.tick++;
      console.log(`\n─── Tick ${this.tick} ──────────────────────────────────────`);

      try {
        const observation = await this.observe();
        const orientation = await this.orient(observation);
        const decision = await this.decide(orientation);
        await this.act(decision);
        await this.appendJournal(observation, orientation, decision);
      } catch (e) {
        console.error(`Tick ${this.tick} error:`, e instanceof Error ? e.message : e);
        this.consecutiveLosses++;
      }

      if (this.cfg.tickSleepMs > 0 && this.tick < maxTicks) {
        await sleep(this.cfg.tickSleepMs);
      }
    }

    console.log(`\n✅ Deep Clawd session complete. ${this.tick} ticks.`);
    console.log(this.router.costReport());
  }

  // ── OBSERVE ─────────────────────────────────────────────────────────────────

  private async observe(): Promise<DeepObservation> {
    const { model, effort } = this.router.route("observe");
    console.log(`[OBSERVE] ${model} effort=${effort}`);

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: "Gather current market data. Call tools to get SOL price, trending tokens, and new Pump.fun launches. Return a JSON observation block." },
    ];

    let result = await this.callWithTools(model, messages, OBSERVE_TOOLS, OBSERVE_SYSTEM, effort, false);

    // Extract structured data from the response
    const text = result.text ?? "";
    const solMatch = text.match(/\$(\d+\.\d+)/);
    const changeMatch = text.match(/([+-]\d+\.\d+)%/);

    return {
      timestamp: new Date().toISOString(),
      phase: "observe",
      solPrice: solMatch ? parseFloat(solMatch[1]) : 0,
      solChange24h: changeMatch ? parseFloat(changeMatch[1]) : 0,
      topTrending: [],
      newLaunches: [],
      regime: detectRegime(changeMatch ? parseFloat(changeMatch[1]) : 0),
    };
  }

  // ── ORIENT ──────────────────────────────────────────────────────────────────

  private async orient(obs: DeepObservation): Promise<DeepOrientation> {
    const { model, effort, thinking } = this.router.route("orient");
    console.log(`[ORIENT] ${model} effort=${effort} thinking=${thinking}`);

    const prompt = `Observation data:\n${JSON.stringify(obs, null, 2)}\n\nAnalyze this data. What market regime are we in? What are the top opportunities and risks?`;
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: prompt },
    ];

    const result = await this.callWithTools(model, messages, ORIENT_TOOLS, ORIENT_SYSTEM, effort, thinking);
    const text = result.text ?? "";
    const thinkingContent = result.thinkingContent;

    const regime = detectRegime(obs.solChange24h);
    const signals = extractSignals(text);

    if (thinkingContent) {
      console.log(`  [thinking] ${thinkingContent.slice(0, 200)}…`);
    }

    return {
      timestamp: new Date().toISOString(),
      phase: "orient",
      regime,
      signals,
      risks: extractRisks(text),
      thinkingContent,
    };
  }

  // ── DECIDE ──────────────────────────────────────────────────────────────────

  private async decide(orient: DeepOrientation): Promise<DeepDecision> {
    const { model, effort, thinking } = this.router.route("decide");
    console.log(`[DECIDE] ${model} effort=${effort} thinking=${thinking}`);

    const prompt = `Orientation:\n${JSON.stringify(orient, null, 2)}\n\nMake ONE clear trading decision. Output the ACTION, TARGET, CONFIDENCE, STOP, and RATIONALE.`;
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: prompt },
    ];

    const result = await this.callWithTools(model, messages, [], DECIDE_SYSTEM, effort, thinking);
    const text = result.text ?? "";
    const thinkingContent = result.thinkingContent;

    const action = extractAction(text);
    const confidence = text.includes("HIGH") ? "HIGH" : text.includes("MEDIUM") ? "MEDIUM" : "LOW";

    console.log(`  → ${action} (${confidence}): ${extractRationale(text)}`);
    if (thinkingContent) {
      console.log(`  [thinking] ${thinkingContent.slice(0, 200)}…`);
    }

    return {
      timestamp: new Date().toISOString(),
      phase: "decide",
      action,
      confidence: confidence as "HIGH" | "MEDIUM" | "LOW",
      rationale: extractRationale(text),
      stopCondition: extractStop(text),
      thinkingContent,
    };
  }

  // ── ACT ─────────────────────────────────────────────────────────────────────

  private async act(decision: DeepDecision): Promise<void> {
    const { model, effort } = this.router.route("act");
    console.log(`[ACT] ${model} effort=${effort}`);

    if (decision.action === "hold") {
      console.log(`  → Holding. No action taken.`);
      return;
    }

    const prompt = `Decision: ${JSON.stringify(decision)}\n\nExecute this action using the available tools. Remember: paper trading only unless live trading is explicitly authorized.`;
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: prompt },
    ];

    const result = await this.callWithTools(model, messages, ACT_TOOLS, ACT_SYSTEM, effort, false);
    console.log(`  → ${result.text?.slice(0, 150) ?? "no output"}`);

    // Journal the act
    const actEntry = {
      timestamp: new Date().toISOString(),
      phase: "act" as const,
      action: decision.action,
      result: result.text ?? "",
    };
    this.journal.push(actEntry);
    await this.persistEntry(actEntry);
  }

  // ── Tool calling engine ──────────────────────────────────────────────────────

  private async callWithTools(
    model: string,
    messages: Anthropic.MessageParam[],
    tools: Anthropic.Tool[],
    system: string,
    effort: "high" | "max",
    thinking: boolean,
  ): Promise<{ text?: string; thinkingContent?: string }> {
    const createParams: Anthropic.MessageCreateParams = {
      model,
      max_tokens: 8192,
      system,
      messages,
      ...(tools.length > 0 ? { tools } : {}),
    };

    // Enable thinking mode via extended params for DeepSeek
    if (thinking) {
      (createParams as Record<string, unknown>).output_config = { effort };
    }

    let response = await this.client.messages.create(createParams);

    // Agentic tool use loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (tu) => ({
          type: "tool_result" as const,
          tool_use_id: tu.id,
          content: await executeTool(tu.name, tu.input as Record<string, unknown>, this.cfg.paperOnly),
        })),
      );

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });

      const nextParams: Anthropic.MessageCreateParams = {
        model,
        max_tokens: 8192,
        system,
        messages,
        ...(tools.length > 0 ? { tools } : {}),
      };
      if (thinking) {
        (nextParams as Record<string, unknown>).output_config = { effort };
      }
      response = await this.client.messages.create(nextParams);
    }

    let text = "";
    let thinkingContent: string | undefined;

    for (const block of response.content) {
      if (block.type === "text") text += block.text;
      if ((block as Record<string, unknown>).type === "thinking") {
        thinkingContent = (block as Record<string, unknown>).thinking as string;
      }
    }

    return { text, thinkingContent };
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private async appendJournal(...entries: OODAEntry[]): Promise<void> {
    for (const e of entries) {
      this.journal.push(e);
      await this.persistEntry(e);
    }
  }

  private async persistEntry(entry: OODAEntry): Promise<void> {
    const file = path.join(this.logDir, "journal.jsonl");
    await fs.appendFile(file, JSON.stringify(entry) + "\n", "utf-8");
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function detectRegime(change24h: number): MarketRegime {
  if (change24h > 15) return "pump";
  if (change24h > 5) return "bull";
  if (change24h < -15) return "crash";
  if (change24h < -5) return "bear";
  return "crab";
}

function extractSignals(text: string) {
  const signals = [];
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.includes("STRONG") || line.includes("MODERATE") || line.includes("WEAK")) {
      const strength = line.includes("STRONG") ? "STRONG" : line.includes("MODERATE") ? "MODERATE" : "WEAK";
      signals.push({ token: "unknown", strength: strength as "STRONG" | "MODERATE" | "WEAK" | "AVOID", thesis: line.slice(0, 100) });
    }
  }
  return signals.slice(0, 3);
}

function extractRisks(text: string): string[] {
  const risks: string[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.toLowerCase().includes("risk") || line.includes("⚠") || line.includes("danger")) {
      risks.push(line.slice(0, 100));
    }
  }
  return risks.slice(0, 3);
}

function extractAction(text: string): DeepDecision["action"] {
  const t = text.toLowerCase();
  if (t.includes("action: swap") || t.includes("action:swap")) return "swap";
  if (t.includes("action: scan") || t.includes("action:scan")) return "scan";
  if (t.includes("action: alert") || t.includes("action:alert")) return "alert";
  if (t.includes("action: exit") || t.includes("action:exit")) return "exit";
  return "hold";
}

function extractRationale(text: string): string {
  const match = text.match(/rationale[:\s]+(.+)/i);
  return match ? match[1].trim().slice(0, 200) : "No rationale extracted";
}

function extractStop(text: string): string {
  const match = text.match(/stop[:\s]+(.+)/i);
  return match ? match[1].trim().slice(0, 200) : "next tick review";
}
