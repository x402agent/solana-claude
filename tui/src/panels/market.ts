/**
 * HERMES x402 TUI — Market Data Panel
 *
 * Shows SOL price, trending tokens, and last trade signal.
 */

import chalk from 'chalk';
import type { DashboardState } from '../state.js';

function pct(n: number): string {
  const s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  return n > 0 ? chalk.green(s) : n < 0 ? chalk.red(s) : chalk.gray(s);
}

function bar(n: number, max = 25): string {
  const width = Math.round(Math.abs(n) / max * 8);
  const filled = '█'.repeat(Math.min(width, 8));
  return n >= 0 ? chalk.green(filled.padEnd(8)) : chalk.red(filled.padEnd(8));
}

export function renderMarket(state: DashboardState, height: number): string[] {
  const lines: string[] = [];
  const { solPrice, solChange24h, trending, paperPnl, winRate, totalTrades, lastSignal } = state;

  // SOL price
  lines.push(chalk.cyan('┌─ MARKET DATA ──────────────────┐'));
  const solStr = solPrice > 0 ? `$${solPrice.toFixed(2)}` : '---';
  lines.push(`│  ${chalk.bold.white('SOL')}  ${chalk.bold.yellow(solStr.padEnd(10))} ${pct(solChange24h).padEnd(9)}  │`);
  lines.push(chalk.gray('│  ──────────────────────────── │'));

  // Trending tokens
  lines.push(`│  ${chalk.cyan('TRENDING TOKENS')}               │`);
  const toShow = trending.slice(0, 6);
  for (const t of toShow) {
    const sym = t.symbol.slice(0, 8).padEnd(8);
    const b = bar(t.change);
    const change = pct(t.change);
    lines.push(`│   ${chalk.white(sym)} ${b} ${change.padEnd(8)} │`);
  }

  // Pad if fewer than 6 tokens
  for (let i = toShow.length; i < 6; i++) {
    lines.push('│                                │');
  }

  lines.push(chalk.gray('│  ──────────────────────────── │'));

  // P&L
  lines.push(`│  ${chalk.cyan('P&L (PAPER)')}                   │`);
  const pnlStr = (paperPnl >= 0 ? '+$' : '-$') + Math.abs(paperPnl).toFixed(2);
  const pnlColored = paperPnl >= 0 ? chalk.green.bold(pnlStr) : chalk.red.bold(pnlStr);
  lines.push(`│   Total  : ${pnlColored.padEnd(22)}│`);
  lines.push(`│   Win    : ${chalk.yellow((winRate * 100).toFixed(1) + '%').padEnd(22)}│`);
  lines.push(`│   Trades : ${chalk.white(String(totalTrades)).padEnd(22)}│`);

  // Last signal
  lines.push(chalk.gray('│  ──────────────────────────── │'));
  lines.push(`│  ${chalk.cyan('LAST SIGNAL')}                   │`);
  if (lastSignal) {
    const side = lastSignal.side === 'buy'
      ? chalk.green('BUY ')
      : lastSignal.side === 'sell'
        ? chalk.red('SELL')
        : chalk.gray('PASS');
    lines.push(`│   ${chalk.white(lastSignal.symbol.padEnd(10))} ${side} ${chalk.yellow(lastSignal.score + '/100')}  │`);
    lines.push(`│   Size: ${chalk.magenta(lastSignal.size.padEnd(24))}│`);
  } else {
    lines.push('│   No active signal             │');
    lines.push('│                                │');
  }

  lines.push(chalk.cyan('└────────────────────────────────┘'));

  while (lines.length < height) lines.push('');
  return lines;
}
