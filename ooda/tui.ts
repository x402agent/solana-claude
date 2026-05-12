#!/usr/bin/env node
/**
 * ooda/tui.ts — Dark ANSI TUI renderer for the OODA loop
 *
 * Reads JSONL from stdin (loop.ts --tui output) and renders a
 * live dark-themed dashboard. Pipe usage:
 *
 *   npx tsx ooda/loop.ts --ticks 200 --sleep 0.4 --tui | npx tsx ooda/tui.ts
 *
 * Also standalone-importable by the main hermes TUI.
 */

import { createInterface } from 'node:readline';
import chalk from 'chalk';

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const CLEAR = '\x1b[2J\x1b[H';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

// ─── State ────────────────────────────────────────────────────────────────────

interface TickEvent {
  event: 'tick' | 'start' | 'done' | 'killswitch';
  tick?: number;
  now?: string;
  price?: number;
  decision?: { action: string; reason: string; side?: string; size_lamports?: number; position_id?: string };
  outcome?: string;
  pnl?: number;
  total_pnl_lamports?: number;
  cash_lamports?: number;
  positions?: number;
  consecutive_losses?: number;
  ticks?: number;
}

interface DisplayState {
  lastTick: number;
  totalTicks: number;
  price: number;
  priceHistory: number[];
  lastDecision: TickEvent['decision'] | null;
  lastOutcome: string;
  totalPnl: number;
  cash: number;
  openPositions: number;
  consecutiveLosses: number;
  log: string[];
  done: boolean;
  killswitch: boolean;
}

const ds: DisplayState = {
  lastTick: 0,
  totalTicks: 0,
  price: 0,
  priceHistory: [],
  lastDecision: null,
  lastOutcome: '',
  totalPnl: 0,
  cash: 0,
  openPositions: 0,
  consecutiveLosses: 0,
  log: [],
  done: false,
  killswitch: false,
};

// ─── Sparkline ────────────────────────────────────────────────────────────────

const SPARK = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

function sparkline(prices: number[], width = 30): string {
  if (prices.length < 2) return chalk.gray('·'.repeat(width));
  const slice = prices.slice(-width);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const range = max - min || 1;
  return slice
    .map(p => {
      const idx = Math.round(((p - min) / range) * (SPARK.length - 1));
      const bar = SPARK[idx] ?? '▄';
      const isUp = p > prices[prices.indexOf(p) - 1];
      return isUp ? chalk.green(bar) : chalk.red(bar);
    })
    .join('');
}

// ─── Render ───────────────────────────────────────────────────────────────────

function pnlColor(n: number): string {
  const s = (n >= 0 ? '+' : '') + n.toLocaleString() + ' lamports';
  return n >= 0 ? chalk.green(s) : chalk.red(s);
}

function render(): void {
  const lines: string[] = [];
  const w = process.stdout.columns ?? 100;
  const border = chalk.magenta('═'.repeat(w));

  // Header
  lines.push(chalk.magenta('╔') + border + chalk.magenta('╗'));
  const title = '  🦞 DARK RALPH — OODA Paper Loop  ·  devnet  ·  paper  ';
  const titlePad = Math.max(0, w - title.length);
  lines.push(chalk.magenta('║') + chalk.bold.magenta(title) + ' '.repeat(titlePad) + chalk.magenta('║'));
  lines.push(chalk.magenta('╠') + border + chalk.magenta('╣'));

  // Progress bar
  const pct = ds.totalTicks > 0 ? ds.lastTick / ds.totalTicks : 0;
  const barW = Math.max(10, w - 20);
  const filled = Math.round(pct * barW);
  const bar = chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(barW - filled));
  const pctStr = `  Tick ${ds.lastTick}/${ds.totalTicks} [${bar}] ${Math.round(pct * 100)}%`;
  const pctPad = Math.max(0, w - pctStr.replace(/\x1b\[[0-9;]*m/g, '').length);
  lines.push(chalk.magenta('║') + pctStr + ' '.repeat(pctPad) + chalk.magenta('║'));

  // Price + sparkline
  const priceStr = ds.price > 0 ? `$${(ds.price / 1000).toFixed(3)}` : '---';
  const spark = sparkline(ds.priceHistory, Math.min(40, w - 30));
  const priceRow = `  SOL ~${chalk.yellow.bold(priceStr)}  ${spark}`;
  const priceRowPlain = `  SOL ~${priceStr}  ` + '·'.repeat(Math.min(40, w - 30));
  const pricePad = Math.max(0, w - priceRowPlain.length);
  lines.push(chalk.magenta('║') + priceRow + ' '.repeat(pricePad) + chalk.magenta('║'));

  // Decision
  const dec = ds.lastDecision;
  let decStr = '  [--] waiting…';
  if (dec) {
    const actionColor = dec.action === 'open' ? chalk.green :
      dec.action === 'close' ? chalk.red : chalk.gray;
    const outcomeColor = ds.lastOutcome === 'rejected' ? chalk.red :
      ds.lastOutcome === 'killswitch' ? chalk.bgRed.white : chalk.cyan;
    decStr = `  [${actionColor(dec.action.toUpperCase())}] ${chalk.white(dec.reason?.slice(0, 70) ?? '')}  ${outcomeColor(ds.lastOutcome)}`;
  }
  const decPlain = `  [${dec?.action?.toUpperCase() ?? '--'}] ${dec?.reason?.slice(0, 70) ?? ''}  ${ds.lastOutcome}`;
  const decPad = Math.max(0, w - decPlain.length);
  lines.push(chalk.magenta('║') + decStr + ' '.repeat(decPad) + chalk.magenta('║'));

  lines.push(chalk.magenta('╠') + border + chalk.magenta('╣'));

  // Stats row
  const statsRow = [
    `  PnL: ${pnlColor(ds.totalPnl)}`,
    `Cash: ${chalk.cyan(ds.cash.toLocaleString())} lam`,
    `Pos: ${chalk.yellow(ds.openPositions)}`,
    `Losses: ${ds.consecutiveLosses > 0 ? chalk.red(ds.consecutiveLosses) : chalk.gray('0')}`,
  ].join('  ·  ');
  const statsPlain = `  PnL: ${ds.totalPnl >= 0 ? '+' : ''}${ds.totalPnl} lamports  ·  Cash: ${ds.cash} lam  ·  Pos: ${ds.openPositions}  ·  Losses: ${ds.consecutiveLosses}`;
  const statsPad = Math.max(0, w - statsPlain.length);
  lines.push(chalk.magenta('║') + statsRow + ' '.repeat(statsPad) + chalk.magenta('║'));

  // Log
  lines.push(chalk.magenta('╠') + border + chalk.magenta('╣'));
  const logLines = ds.log.slice(-6);
  for (const entry of logLines) {
    const pad = Math.max(0, w - entry.replace(/\x1b\[[0-9;]*m/g, '').length);
    lines.push(chalk.magenta('║') + entry + ' '.repeat(pad) + chalk.magenta('║'));
  }

  // Footer
  if (ds.done) {
    lines.push(chalk.magenta('╠') + border + chalk.magenta('╣'));
    const doneMsg = ds.killswitch
      ? '  ⛔ KILLSWITCH TRIGGERED — consecutive losses limit reached'
      : '  ✅ Loop complete — see ooda/journal/ticks.jsonl for full log';
    const donePad = Math.max(0, w - doneMsg.length);
    lines.push(chalk.magenta('║') + chalk.bold(ds.killswitch ? chalk.red(doneMsg) : chalk.green(doneMsg)) + ' '.repeat(donePad) + chalk.magenta('║'));
  }
  lines.push(chalk.magenta('╚') + border + chalk.magenta('╝'));

  process.stdout.write(CLEAR + lines.join('\n') + '\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

process.stdout.write(HIDE_CURSOR);
process.on('exit', () => process.stdout.write(SHOW_CURSOR));
process.on('SIGINT', () => { process.stdout.write(SHOW_CURSOR); process.exit(0); });

const rl = createInterface({ input: process.stdin });

rl.on('line', (line: string) => {
  if (!line.trim()) return;
  try {
    const ev = JSON.parse(line) as TickEvent;

    if (ev.event === 'start') {
      ds.totalTicks = ev.ticks ?? 50;
    } else if (ev.event === 'tick') {
      ds.lastTick = ev.tick ?? ds.lastTick;
      ds.price = ev.price ?? ds.price;
      ds.priceHistory.push(ds.price);
      if (ds.priceHistory.length > 60) ds.priceHistory.shift();
      ds.lastDecision = ev.decision ?? ds.lastDecision;
      ds.lastOutcome = ev.outcome ?? '';
      ds.totalPnl = ev.total_pnl_lamports ?? ds.totalPnl;
      ds.cash = ev.cash_lamports ?? ds.cash;
      ds.openPositions = ev.positions ?? ds.openPositions;
      ds.consecutiveLosses = ev.consecutive_losses ?? ds.consecutiveLosses;

      const action = ev.decision?.action ?? 'hold';
      const actionColor = action === 'open' ? chalk.green : action === 'close' ? chalk.red : chalk.gray;
      ds.log.push(
        `  ${chalk.gray(new Date(ev.now ?? '').toTimeString().slice(0, 8))} ` +
        `[${chalk.yellow('T' + ev.tick)}] ` +
        `${actionColor(action.toUpperCase().padEnd(5))} ` +
        chalk.white((ev.decision?.reason ?? '').slice(0, 55)),
      );
    } else if (ev.event === 'killswitch') {
      ds.killswitch = true;
      ds.done = true;
    } else if (ev.event === 'done') {
      ds.done = true;
    }

    render();
  } catch { /* skip non-JSON */ }
});

rl.on('close', () => {
  ds.done = true;
  render();
  process.stdout.write(SHOW_CURSOR);
});
