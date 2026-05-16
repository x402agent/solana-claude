#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { createState, openPosition, closePosition, unrealisedPnl } from "./state.js";
import type { State } from "./state.js";
import { SynthObserver, rejectMainnet } from "./observe.js";
import { validate, parseRalphConfig } from "./validate.js";
import type { RalphConfig, Decision } from "./validate.js";
import { appendTick, clearJournal, readLastEntries } from "./journal.js";
import type { TickEntry } from "./journal.js";
import { claudeDecision, deterministicDecision } from "./claude-decision.js";
import type { Observations } from "./claude-decision.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { values: flags } = parseArgs({
  options: {
    ticks: { type: "string", default: "50" },
    sleep: { type: "string", default: "" },
    seed: { type: "string", default: "42" },
    "commit-every": { type: "string", default: "0" },
    tui: { type: "boolean", default: false },
    llm: { type: "boolean", default: false },
    goblin: { type: "boolean", default: false },
    fresh: { type: "boolean", default: false },
  },
  strict: false,
});

const GOBLIN_MODE = Boolean(flags["goblin"]);
const RALPH_FILE = GOBLIN_MODE ? "goblin.md" : "RALPH.md";
const CONFIG_PATH = join(__dirname, RALPH_FILE);
const CONFIG_PROMPT = readFileSync(CONFIG_PATH, "utf8");
const CONFIG: RalphConfig = parseRalphConfig(CONFIG_PROMPT);
const TICKS = Number.parseInt(String(flags["ticks"]), 10) || (GOBLIN_MODE ? 100 : 50);
const SLEEP_MS = String(flags["sleep"]).trim()
  ? Math.max(0, Math.round(Number.parseFloat(String(flags["sleep"])) * 1000))
  : CONFIG.tick_sleep_ms;
const SEED = Number.parseInt(String(flags["seed"]), 10) || 42;
const COMMIT_EVERY = Number.parseInt(String(flags["commit-every"]), 10) || 0;
const TUI_MODE = Boolean(flags["tui"]);
const USE_LLM = Boolean(flags["llm"]) || GOBLIN_MODE;

function emit(obj: unknown): void {
  if (TUI_MODE) process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function log(msg: string): void {
  if (!TUI_MODE) process.stderr.write(`${msg}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function commitJournal(tick: number): void {
  if (COMMIT_EVERY <= 0 || tick % COMMIT_EVERY !== 0) return;
  const cwd = join(__dirname, "../../..");
  spawnSync("git", ["add", "src/ooda/journal/ticks.jsonl"], { cwd, stdio: "ignore" });
  const result = spawnSync("git", ["commit", "-m", `ooda: journal tick ${tick}`], { cwd, stdio: "ignore" });
  if (result.status === 0) log(`[git] committed journal at tick ${tick}`);
}

function moltNote(tick: number, state: State): string | undefined {
  if (!CONFIG.goblin || tick % 5 !== 0) return undefined;
  const stance = state.total_pnl_lamports >= 0 ? "pressure rewarded aggression" : "chaos taxed the shell";
  return `molt ${tick / 5}: ${stance}; pnl=${state.total_pnl_lamports}; losses=${state.consecutive_losses}`;
}

async function runLoop(): Promise<void> {
  if (flags["fresh"]) clearJournal();

  const rpcUrl = process.env["SOLANA_RPC_URL"] ?? "https://api.devnet.solana.com";
  rejectMainnet(rpcUrl);

  if (CONFIG.mode !== "paper" || CONFIG.network !== "devnet") {
    throw new Error("[SAFETY] Goblin OODA supports paper/devnet only");
  }

  if (GOBLIN_MODE) {
    log("\nGOBLIN MODE ACTIVATED - paper/devnet only");
    log(`max_pos=${CONFIG.max_position_size_lamports} killswitch=${CONFIG.loss_killswitch_consecutive} dark_defi=${CONFIG.dark_defi_armed}\n`);
  } else {
    log(`[ralph] mode=${CONFIG.mode} network=${CONFIG.network}`);
  }

  const state = createState();
  const observer = new SynthObserver(SEED, 150_000, 20);
  log(`[ralph] starting ${TICKS} ticks, sleep=${SLEEP_MS}ms, llm=${USE_LLM}, goblin=${GOBLIN_MODE}`);
  emit({ event: "start", ticks: TICKS, config: CONFIG, goblin: GOBLIN_MODE });

  for (let tick = 1; tick <= TICKS; tick += 1) {
    state.tick = tick;
    const now = new Date();
    const observed = observer.tick(now);
    const candles = observed.candles;
    state.candles = candles;
    const currentPrice = candles.at(-1)!.c;

    const obs: Observations = {
      tick,
      now: now.toISOString(),
      mode: "paper",
      network: "devnet",
      candles: candles.slice(-10),
      whale_activity: observed.whale_activity,
      book: {
        positions: state.book.positions,
        cash_lamports: state.book.cash_lamports,
      },
      last_decisions: readLastEntries(3),
      config: {
        goblin: CONFIG.goblin,
        max_position_size_lamports: CONFIG.max_position_size_lamports,
        loss_killswitch_consecutive: CONFIG.loss_killswitch_consecutive,
        model: CONFIG.model,
      },
    };

    let rawDecision: unknown;
    try {
      rawDecision = USE_LLM ? await claudeDecision(obs, CONFIG_PROMPT) : deterministicDecision(obs);
    } catch (err) {
      rawDecision = { action: "hold", reason: `decision error: ${String(err).slice(0, 100)}` };
    }

    const validation = validate(rawDecision, CONFIG, state.book);
    const decision: Decision = validation.decision;
    let outcome: TickEntry["outcome"] = "applied";
    let pnl: number | undefined;

    if (!validation.ok) {
      outcome = "rejected";
      log(`[tick ${tick}] REJECTED: ${validation.violation}`);
    } else if (decision.action === "open") {
      openPosition(state, decision.side, decision.size_lamports, currentPrice);
      log(`[tick ${tick}] OPEN ${decision.side} ${decision.size_lamports} @ ${currentPrice}`);
    } else if (decision.action === "close") {
      pnl = closePosition(state, decision.position_id, currentPrice);
      log(`[tick ${tick}] CLOSE ${decision.position_id} pnl=${pnl}`);
    } else {
      log(`[tick ${tick}] HOLD - ${decision.reason}`);
    }

    if (state.consecutive_losses >= CONFIG.loss_killswitch_consecutive) {
      const killEntry: TickEntry = {
        tick,
        now: now.toISOString(),
        candles_last3: candles.slice(-3),
        whale_activity: observed.whale_activity,
        book_snapshot: { ...state.book },
        decision,
        outcome: "killswitch",
        event: `killswitch: ${state.consecutive_losses} consecutive losses`,
        total_pnl_lamports: state.total_pnl_lamports,
        consecutive_losses: state.consecutive_losses,
      };
      appendTick(killEntry);
      emit({ event: "killswitch", tick, consecutive_losses: state.consecutive_losses, goblin: GOBLIN_MODE });
      log(GOBLIN_MODE ? "GOBLIN KILLSWITCH - even goblins respect the laws" : "[ralph] KILLSWITCH - halting");
      process.exit(1);
    }

    const entry: TickEntry = {
      tick,
      now: now.toISOString(),
      candles_last3: candles.slice(-3),
      whale_activity: observed.whale_activity,
      book_snapshot: {
        positions: state.book.positions,
        cash_lamports: state.book.cash_lamports,
        unrealised_pnl: Math.round(unrealisedPnl(state, currentPrice)),
      },
      decision,
      outcome,
      violation: validation.violation,
      pnl_lamports: pnl,
      total_pnl_lamports: state.total_pnl_lamports,
      consecutive_losses: state.consecutive_losses,
      molt_note: moltNote(tick, state),
    };
    appendTick(entry);

    emit({
      event: "tick",
      tick,
      now: now.toISOString(),
      price: currentPrice,
      whale_activity: observed.whale_activity,
      decision,
      outcome,
      pnl,
      total_pnl_lamports: state.total_pnl_lamports,
      cash_lamports: state.book.cash_lamports,
      positions: state.book.positions.length,
      consecutive_losses: state.consecutive_losses,
      molt_note: entry.molt_note,
      goblin: GOBLIN_MODE,
    });

    commitJournal(tick);
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }

  const summary = {
    event: "done",
    ticks: TICKS,
    total_pnl_lamports: state.total_pnl_lamports,
    total_trades: state.total_trades,
    final_cash_lamports: state.book.cash_lamports,
    open_positions: state.book.positions.length,
    consecutive_losses: state.consecutive_losses,
    goblin: GOBLIN_MODE,
  };
  emit(summary);
  log(GOBLIN_MODE ? `\nGOBLIN DONE pnl=${state.total_pnl_lamports} trades=${state.total_trades}` : `\n[ralph] done pnl=${state.total_pnl_lamports} trades=${state.total_trades}`);
}

runLoop().catch((err) => {
  process.stderr.write(`[ralph] fatal: ${String(err)}\n`);
  process.exit(1);
});

