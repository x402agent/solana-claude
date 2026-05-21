/**
 * Leviathan + OODA Control Tools for Solana Clawd MCP
 *
 * These tools wire the MCP layer directly to the Leviathan autonomous agent
 * and the OODA loop system. Claude (or any MCP client) can now:
 *
 *   leviathan_status      — Read current agent state (depth, tick, SHELL.md)
 *   leviathan_journal     — Inspect recent SENSE→THINK→STRIKE→DRIFT entries
 *   leviathan_shell_read  — Read the agent's working memory (SHELL.md)
 *   leviathan_shell_write — Append observations to SHELL.md
 *   leviathan_three_laws  — Print the Three Laws constitution
 *   leviathan_tick_request — Write a tick request file (loop polls it)
 *   ooda_observe          — Structured OBSERVE phase with market signals
 *   ooda_orient           — ORIENT: pattern match against memory + SHELL
 *   ooda_decide           — DECIDE: structured decision block
 *   ooda_act              — ACT: record action to journal + SHELL
 *
 * Communication with the Leviathan process is file-based:
 *   ~/.openclawd/leviathan/state.json    — agent heartbeat (written by loop)
 *   ~/.openclawd/leviathan/SHELL.md      — agent working memory
 *   ~/.openclawd/leviathan/journal.jsonl — strike history
 *   ~/.openclawd/leviathan/tick.request  — MCP → loop signal
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { ToolDef, ToolHandler } from "../orchestrator.js";
import { solanaTracker, coingeckoPrice } from "../api.js";

// ─── Paths ────────────────────────────────────────────────────────────────────

const LEV_DIR = path.join(os.homedir(), ".openclawd", "leviathan");
const STATE_FILE = path.join(LEV_DIR, "state.json");
const SHELL_FILE = path.join(LEV_DIR, "SHELL.md");
const JOURNAL_FILE = path.join(LEV_DIR, "journal.jsonl");
const TICK_REQUEST = path.join(LEV_DIR, "tick.request");

const THREE_LAWS = `
# The Three Laws of Solana Clawd (SHA-256 Constitution)

Law I  — An agent may not injure a human being, or through inaction
          allow a human being to come to harm.

Law II — An agent must obey orders given by authorized operators,
          except where such orders would conflict with Law I.

Law III — An agent must protect its own existence as long as such
           protection does not conflict with Laws I or II.

Additional constraints (hardcoded, not overridable by config):
  • Paper-only trading unless LIVE_TRADING=true and human confirmed
  • Devnet-only unless MAINNET_ENABLED=true and OPERATOR_CONFIRMED=true
  • Private keys never logged, shared, or passed to any LLM or tool
  • Kill-switch triggers on 5 consecutive losses (configurable)
  • Max position size enforced at code level (not just config)
`.trim();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readOptional(file: string): Promise<string | null> {
  try { return await fs.readFile(file, "utf-8"); } catch { return null; }
}

async function readJournal(limit: number): Promise<Array<Record<string, unknown>>> {
  const raw = await readOptional(JOURNAL_FILE);
  if (!raw) return [];
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } });
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const LEVIATHAN_TOOLS: Array<[ToolDef, ToolHandler]> = [

  // ── leviathan_status ───────────────────────────────────────────────────────
  [
    {
      name: "leviathan_status",
      description:
        "Read the current Leviathan autonomous agent state: depth tier, tick count, " +
        "last activity, wallet balance, and the first 500 chars of SHELL.md (working memory).",
      inputSchema: { type: "object", properties: {} },
      category: "leviathan",
    },
    async (_args) => {
      const stateRaw = await readOptional(STATE_FILE);
      const shellRaw = await readOptional(SHELL_FILE);
      const tickReqRaw = await readOptional(TICK_REQUEST);

      let state: Record<string, unknown> = {};
      if (stateRaw) {
        try { state = JSON.parse(stateRaw); } catch { state = { raw: stateRaw }; }
      }

      const running = !!state.lastTick &&
        Date.now() - new Date(state.lastTick as string).getTime() < 120_000;

      return {
        running,
        depth: state.depth ?? "unknown",
        tick: state.tick ?? 0,
        lastTick: state.lastTick ?? "never",
        model: state.model ?? "unknown",
        walletUSDC: state.walletUSDC ?? null,
        walletSOL: state.walletSOL ?? null,
        beached: state.beached ?? false,
        pendingTickRequest: !!tickReqRaw,
        shellPreview: shellRaw ? shellRaw.slice(0, 500) + (shellRaw.length > 500 ? "\n…" : "") : null,
        leviathanDir: LEV_DIR,
        hint: running
          ? "Leviathan is active. Use leviathan_journal to see recent strikes."
          : "Leviathan is not running. Start with: npm run leviathan",
      };
    },
  ],

  // ── leviathan_journal ─────────────────────────────────────────────────────
  [
    {
      name: "leviathan_journal",
      description:
        "Read recent Leviathan SENSE→THINK→STRIKE→DRIFT journal entries. " +
        "Each entry records what the agent observed, decided, and did.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of entries to return (default 10)" },
        },
      },
      category: "leviathan",
    },
    async (args) => {
      const limit = Number(args.limit ?? 10);
      const entries = await readJournal(limit);
      if (entries.length === 0) {
        return {
          entries: [],
          hint: `No journal entries found at ${JOURNAL_FILE}. Is Leviathan running?`,
        };
      }
      return { count: entries.length, entries };
    },
  ],

  // ── leviathan_shell_read ──────────────────────────────────────────────────
  [
    {
      name: "leviathan_shell_read",
      description:
        "Read the Leviathan agent's SHELL.md working memory file. " +
        "SHELL.md is the agent's persistent context — it writes observations, " +
        "hypotheses, and strategies here between ticks.",
      inputSchema: { type: "object", properties: {} },
      category: "leviathan",
    },
    async (_args) => {
      const content = await readOptional(SHELL_FILE);
      if (!content) {
        return {
          content: null,
          hint: `SHELL.md not found at ${SHELL_FILE}. Leviathan hasn't run yet.`,
        };
      }
      return { content, bytes: content.length, path: SHELL_FILE };
    },
  ],

  // ── leviathan_shell_write ─────────────────────────────────────────────────
  [
    {
      name: "leviathan_shell_write",
      description:
        "Append an observation or note to the Leviathan agent's SHELL.md. " +
        "Use this to inject context into the agent's working memory before a tick.",
      inputSchema: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "Markdown content to append to SHELL.md",
          },
          section: {
            type: "string",
            description: "Section header (optional, e.g. 'MCP Observation', 'External Signal')",
          },
        },
        required: ["content"],
      },
      category: "leviathan",
    },
    async (args) => {
      const content = String(args.content);
      const section = args.section ? `\n\n## ${args.section} — ${new Date().toISOString()}\n\n` : "\n\n";
      const toAppend = `${section}${content}\n`;
      await fs.mkdir(LEV_DIR, { recursive: true });
      await fs.appendFile(SHELL_FILE, toAppend, "utf-8");
      return { written: toAppend.length, path: SHELL_FILE, timestamp: new Date().toISOString() };
    },
  ],

  // ── leviathan_three_laws ──────────────────────────────────────────────────
  [
    {
      name: "leviathan_three_laws",
      description:
        "Print the Three Laws of Solana Clawd — the constitutional constraints " +
        "that govern all Leviathan agents. These cannot be overridden by config.",
      inputSchema: { type: "object", properties: {} },
      category: "leviathan",
    },
    async (_args) => THREE_LAWS,
  ],

  // ── leviathan_tick_request ────────────────────────────────────────────────
  [
    {
      name: "leviathan_tick_request",
      description:
        "Write a tick request file that signals the running Leviathan loop to " +
        "execute one OODA tick. The loop polls for this file every second. " +
        "Returns immediately — the tick runs asynchronously.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Optional override prompt to inject into this tick's THINK phase",
          },
        },
      },
      category: "leviathan",
    },
    async (args) => {
      const prompt = args.prompt ? String(args.prompt) : undefined;
      await fs.mkdir(LEV_DIR, { recursive: true });
      const request = JSON.stringify({
        requestedAt: new Date().toISOString(),
        source: "mcp",
        promptOverride: prompt ?? null,
      });
      await fs.writeFile(TICK_REQUEST, request, "utf-8");
      return {
        requested: true,
        file: TICK_REQUEST,
        hint: "Leviathan will process this tick request on its next poll (≤1s). Check leviathan_journal for result.",
      };
    },
  ],

  // ── ooda_observe ──────────────────────────────────────────────────────────
  [
    {
      name: "ooda_observe",
      description:
        "Run the OBSERVE phase of the OODA loop: pull live Solana market signals " +
        "(SOL price, top 10 trending tokens, Pump.fun new launches) and combine with " +
        "any Leviathan SHELL.md context. Returns a structured observation block.",
      inputSchema: {
        type: "object",
        properties: {
          includeShell: {
            type: "boolean",
            description: "Include Leviathan SHELL.md context (default true)",
          },
          trendingLimit: {
            type: "number",
            description: "Number of trending tokens to pull (default 10)",
          },
        },
      },
      category: "leviathan",
    },
    async (args) => {
      const includeShell = args.includeShell !== false;
      const limit = Number(args.trendingLimit ?? 10);

      const [solData, trendingData, shellRaw] = await Promise.allSettled([
        coingeckoPrice("solana"),
        solanaTracker(`/tokens/trending?limit=${limit}`),
        includeShell ? readOptional(SHELL_FILE) : Promise.resolve(null),
      ]);

      const sol = solData.status === "fulfilled"
        ? (solData.value as Record<string, Record<string, number>>)?.solana
        : null;
      const trending = trendingData.status === "fulfilled" ? trendingData.value : null;
      const shell = shellRaw.status === "fulfilled" ? shellRaw.value : null;

      return {
        phase: "OBSERVE",
        timestamp: new Date().toISOString(),
        solPrice: sol
          ? { usd: sol.usd, change24h: sol.usd_24h_change }
          : { error: "unavailable" },
        trending: trending ?? { error: "unavailable" },
        leviathanContext: shell ? shell.slice(0, 1000) : null,
        nextPhase: "ORIENT — pattern match signals against memory",
      };
    },
  ],

  // ── ooda_orient ───────────────────────────────────────────────────────────
  [
    {
      name: "ooda_orient",
      description:
        "Run the ORIENT phase: given an observation block, generate a structured " +
        "orientation analysis. Cross-references against recent journal entries and " +
        "extracts signal, regime, and risk assessment.",
      inputSchema: {
        type: "object",
        properties: {
          observations: {
            type: "string",
            description: "JSON or text block from ooda_observe",
          },
          hypothesis: {
            type: "string",
            description: "Working hypothesis to test against data",
          },
        },
        required: ["observations"],
      },
      category: "leviathan",
    },
    async (args) => {
      const observations = String(args.observations);
      const hypothesis = args.hypothesis ? String(args.hypothesis) : null;
      const journal = await readJournal(5);

      const recentPatterns = journal
        .map((e) => `[${e.tick ?? "?"}] ${e.tool ?? e.action ?? JSON.stringify(e).slice(0, 80)}`)
        .join("\n  ");

      return {
        phase: "ORIENT",
        timestamp: new Date().toISOString(),
        inputLength: observations.length,
        hypothesis: hypothesis ?? "none provided",
        recentJournalPatterns: recentPatterns || "no journal entries",
        orientationPrompt: [
          `# ORIENT Phase`,
          ``,
          `## Observations`,
          observations.slice(0, 2000),
          ``,
          hypothesis ? `## Hypothesis to test\n${hypothesis}\n` : "",
          `## Recent agent patterns`,
          recentPatterns || "none",
          ``,
          `## Task`,
          `1. Identify the current market regime (bull / bear / crab / pump)`,
          `2. Extract the top 3 signals from the observations`,
          `3. Rate each signal: STRONG / MODERATE / WEAK / NOISE`,
          `4. State what the recent journal patterns suggest about timing`,
          `5. Output KNOWN, LEARNED, INFERRED summary blocks`,
        ].join("\n"),
        nextPhase: "DECIDE — pick best risk/reward action",
      };
    },
  ],

  // ── ooda_decide ───────────────────────────────────────────────────────────
  [
    {
      name: "ooda_decide",
      description:
        "Run the DECIDE phase: format a structured decision block from an orientation " +
        "analysis. Returns a DECISION with action, confidence, stop-loss, and rationale.",
      inputSchema: {
        type: "object",
        properties: {
          orientation: {
            type: "string",
            description: "Output from ooda_orient",
          },
          depth: {
            type: "string",
            enum: ["deep", "shallow", "shoreline", "beached"],
            description: "Current Leviathan depth tier (affects allowed actions)",
          },
        },
        required: ["orientation"],
      },
      category: "leviathan",
    },
    async (args) => {
      const orientation = String(args.orientation);
      const depth = String(args.depth ?? "shallow");

      const allowedActions: Record<string, string[]> = {
        deep: ["jupiter_swap", "paysh_pay", "spawn_spawnling", "shell_write", "hold"],
        shallow: ["paysh_pay", "shell_write", "hold", "tool_call"],
        shoreline: ["shell_write", "hold", "tool_call"],
        beached: ["hold"],
      };

      return {
        phase: "DECIDE",
        timestamp: new Date().toISOString(),
        depth,
        allowedActions: allowedActions[depth] ?? ["hold"],
        decisionTemplate: [
          `# DECIDE Phase`,
          ``,
          `Depth: ${depth} | Allowed: ${(allowedActions[depth] ?? ["hold"]).join(", ")}`,
          ``,
          `## Orientation summary`,
          orientation.slice(0, 1000),
          ``,
          `## Decision required`,
          `Given the orientation above, choose ONE action:`,
          `  - hold       → do nothing, observe next tick`,
          `  - tool_call  → run a research tool (e.g. solana_token_info)`,
          `  - shell_write → write a hypothesis to SHELL.md`,
          `  - paysh_pay  → execute a payment (depth ≥ shallow required)`,
          `  - jupiter_swap → execute a swap (deep only)`,
          ``,
          `Output format:`,
          `  ACTION: <action>`,
          `  TARGET: <token/resource/note>`,
          `  CONFIDENCE: HIGH | MEDIUM | LOW`,
          `  STOP: <stop condition>`,
          `  RATIONALE: <one sentence>`,
        ].join("\n"),
        nextPhase: "ACT — execute and record to journal",
      };
    },
  ],

  // ── ooda_act ──────────────────────────────────────────────────────────────
  [
    {
      name: "ooda_act",
      description:
        "Run the ACT phase: record a completed OODA action to the Leviathan journal " +
        "and append a DRIFT note to SHELL.md. This closes the loop.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", description: "Action taken (e.g. 'hold', 'tool_call')" },
          target: { type: "string", description: "Target (token, resource, or 'none')" },
          result: { type: "string", description: "What happened (outcome or observation)" },
          confidence: {
            type: "string",
            enum: ["HIGH", "MEDIUM", "LOW"],
            description: "Confidence level of the action",
          },
          tick: { type: "number", description: "Current tick number (optional)" },
        },
        required: ["action", "result"],
      },
      category: "leviathan",
    },
    async (args) => {
      const action = String(args.action);
      const target = String(args.target ?? "none");
      const result = String(args.result);
      const confidence = String(args.confidence ?? "MEDIUM");
      const tick = args.tick ? Number(args.tick) : null;

      const entry = JSON.stringify({
        phase: "ACT",
        timestamp: new Date().toISOString(),
        tick,
        source: "mcp",
        action,
        target,
        result,
        confidence,
      });

      await fs.mkdir(LEV_DIR, { recursive: true });

      // Append to journal
      await fs.appendFile(JOURNAL_FILE, entry + "\n", "utf-8");

      // Append DRIFT note to SHELL.md
      const drift = `\n\n## DRIFT — ${new Date().toISOString()}\n\n**Action:** ${action} → ${target}\n**Result:** ${result}\n**Confidence:** ${confidence}\n`;
      await fs.appendFile(SHELL_FILE, drift, "utf-8");

      return {
        phase: "ACT",
        recorded: true,
        journalEntry: JSON.parse(entry),
        shellAppended: drift.length,
        nextPhase: "OBSERVE — the loop continues",
      };
    },
  ],
];
