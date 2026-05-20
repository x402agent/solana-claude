#!/usr/bin/env node
/**
 * ooda/loop.ts — Dark Ralph OODA Loop Harness
 *
 * TypeScript port of the clawd-operator agent/loop.py.
 * Paper-trading, devnet-only, stdlib-Node implementation of the
 * "Dark Ralph" adaptation of Geoffrey Huntley's Ralph harness.
 *
 * Safety contract (all enforced in code):
 *   - mode: paper only (rejects anything else in RALPH.md)
 *   - network: devnet only
 *   - mainnet RPC URLs rejected at startup
 *   - no key handling anywhere in this file
 *   - position size capped per tick (from frontmatter)
 *   - one position at a time
 *   - kill-switch after N consecutive losses
 *   - every decision is journalled (append-only)
 *
 * Usage:
 *   npx tsx ooda/loop.ts --ticks 50 --sleep 0
 *   npx tsx ooda/loop.ts --ticks 200 --sleep 0.4 --tui
 *   npx tsx ooda/loop.ts --ticks 100 --sleep 0.25 --llm
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { createState, openPosition, closePosition, unrealisedPnl } from './state.js';
import type { State, Candle } from './state.js';
import { SynthObserver, rejectMainnet } from './observe.js';
import { validate, parseRalphConfig } from './validate.js';
import type { RalphConfig, Decision } from './validate.js';
import { appendTick, readLastEntries } from './journal.js';
import type { TickEntry } from './journal.js';
import { deterministicDecision, claudeDecision } from './claude-decision.js';
import type { Observations } from './claude-decision.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CLI flags ────────────────────────────────────────────────────────────────

const { values: flags } = parseArgs({
  options: {
    ticks:          { type: 'string',  default: '50' },
    sleep:          { type: 'string',  default: '0.25' },
    seed:           { type: 'string',  default: '42' },
    'commit-every': { type: 'string',  default: '0' },
    tui:            { type: 'boolean', default: false },
    llm:            { type: 'boolean', default: false },
    mode:           { type: 'string',  default: 'paper' },
    goblin:         { type: 'boolean', default: false },  // 👺 GOBLIN MODE
    'perps-oi':     { type: 'boolean', default: false },
    'perps-symbol': { type: 'string',  default: 'SOL-PERP' },
    'perps-signal-mode': { type: 'string', default: 'paper' },
    'perps-oi-mock': { type: 'boolean', default: false },
  },
  strict: false,
});

const GOBLIN_MODE  = flags['goblin'] as boolean;
// Goblin mode: load goblin.md instead of RALPH.md, use tighter sleep, more ticks default
const RALPH_FILE   = GOBLIN_MODE ? 'goblin.md' : 'RALPH.md';
const TICKS        = parseInt(flags['ticks'] as string, 10) || (GOBLIN_MODE ? 100 : 50);
const SLEEP_MS     = GOBLIN_MODE ? 0 : Math.round(parseFloat(flags['sleep'] as string) * 1000);
const SEED         = parseInt(flags['seed'] as string, 10);
const COMMIT_EVERY = parseInt(flags['commit-every'] as string, 10);
const TUI_MODE     = flags['tui'] as boolean;
const USE_LLM      = flags['llm'] as boolean || GOBLIN_MODE;  // goblin always uses LLM when key available
const USE_PERPS_OI = flags['perps-oi'] as boolean;
const PERPS_SYMBOL = flags['perps-symbol'] as string;
const PERPS_SIGNAL_MODE = flags['perps-signal-mode'] as string;
const PERPS_OI_MOCK = flags['perps-oi-mock'] as boolean;

// ─── Emit helpers ─────────────────────────────────────────────────────────────

function emit(obj: unknown): void {
  if (TUI_MODE) {
    // Structured JSONL on stdout for tui.ts to consume
    process.stdout.write(JSON.stringify(obj) + '\n');
  }
}

function log(msg: string): void {
  if (!TUI_MODE) process.stderr.write(msg + '\n');
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

type OiSignal = {
  symbol: string;
  regime: string;
  side: 'long' | 'short' | 'flat';
  score: number;
  confidence: number;
  market: {
    markPrice: number;
    openInterestUsd: number;
    openInterestDeltaPct: number;
    priceDeltaPct: number;
  };
  gates: { executable: boolean; reason?: string };
  action: { stopReason?: string };
};

function signalToDecision(signal: OiSignal, state: State): unknown {
  const reason = `perps OI ${signal.regime} score=${Math.round(signal.score)} conf=${signal.confidence.toFixed(2)}`;
  const current = state.book.positions[0];

  if (!signal.gates.executable || signal.side === 'flat' || signal.confidence < 0.25) {
    return { action: 'hold', reason: signal.action.stopReason || signal.gates.reason || reason };
  }
  if (!current) {
    return {
      action: 'open',
      side: signal.side,
      size_lamports: 250_000,
      reason,
    };
  }
  if (current.side !== signal.side && signal.confidence >= 0.4) {
    return {
      action: 'close',
      position_id: current.id,
      reason: `perps OI flipped ${current.side}->${signal.side}; ${reason}`,
    };
  }
  return { action: 'hold', reason };
}

async function readPerpsOiSignal(previous?: {
  ts: number;
  symbol: string;
  markPrice: number;
  openInterestUsd: number;
}): Promise<OiSignal | undefined> {
  if (!USE_PERPS_OI) return undefined;
  try {
    const mod = await import('../perps/clawd-agents-perps/src/signals/oi-core.ts');
    return await mod.buildClawdOiCoreSignal({
      symbol: PERPS_SYMBOL,
      previous,
      mode: PERPS_SIGNAL_MODE,
      mock: PERPS_OI_MOCK,
    });
  } catch (error) {
    log(`[perps-oi] unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return {
      symbol: PERPS_SYMBOL,
      regime: 'DATA_INVALID',
      side: 'flat',
      score: 0,
      confidence: 0,
      market: { markPrice: 0, openInterestUsd: 0, openInterestDeltaPct: 0, priceDeltaPct: 0 },
      gates: { executable: false, reason: 'perps-oi-unavailable' },
      action: { stopReason: 'perps-oi-unavailable' },
    };
  }
}

// ─── Commit journal to git ────────────────────────────────────────────────────

async function commitJournal(tick: number): Promise<void> {
  if (COMMIT_EVERY <= 0 || tick % COMMIT_EVERY !== 0) return;
  const { execa } = await import('execa');
  try {
    await execa('git', ['add', 'ooda/journal/ticks.jsonl'], { cwd: join(__dirname, '..') });
    await execa('git', ['commit', '-m', `ooda: journal tick ${tick}`], { cwd: join(__dirname, '..') });
    log(`[git] committed journal at tick ${tick}`);
  } catch { /* git may not be available */ }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function runLoop(): Promise<void> {
  // Read + validate RALPH.md (or goblin.md) config
  const ralphPath = join(__dirname, RALPH_FILE);
  const ralphContent = readFileSync(ralphPath, 'utf8');
  const config: RalphConfig = parseRalphConfig(ralphContent);

  if (GOBLIN_MODE) {
    log(`\n👺 GOBLIN MODE ACTIVATED — clawd-operator harness`);
    log(`   https://github.com/x402agent/clawd-operator`);
    log(`   max_pos=${config.max_position_size_lamports} killswitch=${config.loss_killswitch_consecutive} dark_defi=armed\n`);
  } else {
    log(`[ralph] mode=${config.mode} network=${config.network}`);
    log(`[ralph] max_pos=${config.max_position_size_lamports} killswitch=${config.loss_killswitch_consecutive}`);
  }

  // Reject mainnet
  const rpcUrl = process.env['SOLANA_RPC_URL'] ?? 'https://api.devnet.solana.com';
  rejectMainnet(rpcUrl);

  const state: State = createState();
  const observer = new SynthObserver(SEED, 150_000, 20);
  let previousOiTick: { ts: number; symbol: string; markPrice: number; openInterestUsd: number } | undefined;

  log(`[ralph] starting ${TICKS} ticks, sleep=${SLEEP_MS}ms, llm=${USE_LLM}, goblin=${GOBLIN_MODE}, perps_oi=${USE_PERPS_OI}`);
  if (TUI_MODE) {
    emit({ event: 'start', ticks: TICKS, config, goblin: GOBLIN_MODE, perps_oi: USE_PERPS_OI, perps_symbol: PERPS_SYMBOL });
  }

  for (let tick = 1; tick <= TICKS; tick++) {
    state.tick = tick;
    const now = new Date();

    // ── OBSERVE ──────────────────────────────────────────────────────────────
    const candles = observer.tick(now);
    const currentPrice = candles[candles.length - 1]!.c;
    const lastDecisions = readLastEntries(3);
    const perpsOiSignal = await readPerpsOiSignal(previousOiTick);
    if (perpsOiSignal?.market.markPrice && perpsOiSignal.market.openInterestUsd) {
      previousOiTick = {
        ts: Date.now(),
        symbol: perpsOiSignal.symbol,
        markPrice: perpsOiSignal.market.markPrice,
        openInterestUsd: perpsOiSignal.market.openInterestUsd,
      };
    }

    const obs: Observations = {
      tick,
      now: now.toISOString(),
      mode: 'paper',
      network: 'devnet',
      candles: candles.slice(-10),  // send last 10 to model
      perps_oi_signal: perpsOiSignal,
      book: {
        positions: state.book.positions,
        cash_lamports: state.book.cash_lamports,
      },
      last_decisions: lastDecisions,
    };

    // ── ORIENT / DECIDE ──────────────────────────────────────────────────────
    let rawDecision: unknown;
    try {
      if (USE_LLM && process.env['ANTHROPIC_API_KEY']) {
        rawDecision = await claudeDecision(obs);
      } else if (perpsOiSignal) {
        rawDecision = signalToDecision(perpsOiSignal, state);
      } else {
        rawDecision = deterministicDecision(obs);
      }
    } catch (err) {
      rawDecision = { action: 'hold', reason: `decision error: ${String(err).slice(0, 100)}` };
    }

    // ── VALIDATE ─────────────────────────────────────────────────────────────
    const validation = validate(rawDecision, config, state.book);
    const decision: Decision = validation.decision;

    // ── ACT ───────────────────────────────────────────────────────────────────
    let outcome: TickEntry['outcome'] = 'applied';
    let pnl: number | undefined;

    if (!validation.ok) {
      outcome = 'rejected';
      log(`[tick ${tick}] REJECTED: ${validation.violation}`);
    } else if (decision.action === 'open') {
      openPosition(state, decision.side, decision.size_lamports, currentPrice);
      log(`[tick ${tick}] OPEN ${decision.side} ${decision.size_lamports} @ ${currentPrice}`);
    } else if (decision.action === 'close') {
      pnl = closePosition(state, decision.position_id, currentPrice);
      log(`[tick ${tick}] CLOSE ${decision.position_id} pnl=${pnl}`);
    } else {
      log(`[tick ${tick}] HOLD — ${decision.reason}`);
    }

    // ── Kill-switch ────────────────────────────────────────────────────────
    if (state.consecutive_losses >= config.loss_killswitch_consecutive) {
      const killEntry: TickEntry = {
        tick,
        now: now.toISOString(),
        candles_last3: candles.slice(-3),
        book_snapshot: { ...state.book },
        decision,
        outcome: 'killswitch',
        event: `killswitch: ${state.consecutive_losses} consecutive losses`,
        total_pnl_lamports: state.total_pnl_lamports,
        consecutive_losses: state.consecutive_losses,
      };
      appendTick(killEntry);
      emit({ event: 'killswitch', tick, consecutive_losses: state.consecutive_losses, goblin: GOBLIN_MODE });
      if (GOBLIN_MODE) {
        log(`\n👺 GOBLIN KILLSWITCH: ${state.consecutive_losses} consecutive losses — even goblins respect the laws\n`);
      } else {
        log(`[ralph] KILLSWITCH: ${state.consecutive_losses} consecutive losses — halting`);
      }
      process.exit(1);
    }

    // ── Journal ───────────────────────────────────────────────────────────────
    const entry: TickEntry = {
      tick,
      now: now.toISOString(),
      candles_last3: candles.slice(-3),
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
    };
    appendTick(entry);

    // ── TUI emit ──────────────────────────────────────────────────────────────
    emit({
      event: 'tick',
      tick,
      now: now.toISOString(),
      price: currentPrice,
      decision,
      outcome,
      pnl,
      total_pnl_lamports: state.total_pnl_lamports,
      cash_lamports: state.book.cash_lamports,
      positions: state.book.positions.length,
      consecutive_losses: state.consecutive_losses,
      perps_oi_signal: perpsOiSignal,
    });

    // ── Commit journal ─────────────────────────────────────────────────────
    await commitJournal(tick);

    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }

  // ── Final summary ──────────────────────────────────────────────────────────
  const summary = {
    event: 'done',
    ticks: TICKS,
    total_pnl_lamports: state.total_pnl_lamports,
    total_trades: state.total_trades,
    final_cash_lamports: state.book.cash_lamports,
    open_positions: state.book.positions.length,
    consecutive_losses: state.consecutive_losses,
  };
  emit(summary);
  if (GOBLIN_MODE) {
    log(`\n👺 GOBLIN DONE. pnl=${state.total_pnl_lamports} trades=${state.total_trades} cash=${state.book.cash_lamports}`);
    log(`   The goblin rests. The laws held. The paper gains are real in spirit.\n`);
  } else {
    log(`\n[ralph] done. pnl=${state.total_pnl_lamports} trades=${state.total_trades} cash=${state.book.cash_lamports}`);
  }
}

runLoop().catch(err => {
  process.stderr.write(`[ralph] fatal: ${String(err)}\n`);
  process.exit(1);
});
