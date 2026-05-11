/**
 * HERMES x402 TUI — Full-Screen Renderer
 *
 * Merges panels side-by-side and writes the complete frame to stdout
 * using ANSI escape codes. No external TUI framework needed.
 */

import chalk from 'chalk';
import type { DashboardState } from './state.js';
import { renderHeader } from './panels/header.js';
import { renderOODA } from './panels/ooda.js';
import { renderMarket } from './panels/market.js';
import { renderPayments } from './panels/payments.js';
import { renderLog } from './panels/log.js';

// ANSI escape helpers
const CLEAR_SCREEN = '\x1b[2J\x1b[H';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

export function enableRawMode(): void {
  process.stdout.write(HIDE_CURSOR);
  if (process.stdin.setRawMode) process.stdin.setRawMode(true);
}

export function disableRawMode(): void {
  process.stdout.write(SHOW_CURSOR);
  if (process.stdin.setRawMode) process.stdin.setRawMode(false);
}

// Plain text column width (strips ANSI color codes)
function visLen(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function padRight(s: string, targetLen: number): string {
  const current = visLen(s);
  return s + ' '.repeat(Math.max(0, targetLen - current));
}

/** Merge multiple columns side-by-side into combined line array */
function mergeColumns(cols: string[][], colWidths: number[]): string[] {
  const maxHeight = Math.max(...cols.map(c => c.length));
  const merged: string[] = [];
  for (let i = 0; i < maxHeight; i++) {
    let row = '';
    for (let j = 0; j < cols.length; j++) {
      const cell = cols[j]![i] ?? '';
      row += padRight(cell, colWidths[j]!);
    }
    merged.push(row);
  }
  return merged;
}

export function renderFrame(state: DashboardState): void {
  const { columns: termWidth = 120, rows: termHeight = 40 } = process.stdout;
  const width = Math.max(termWidth - 2, 80);

  // Column widths (inner content)
  const oodaW = 34;
  const marketW = 36;
  const payW = 36;

  // Number of body rows available
  const headerLines = 9; // header panel height
  const logLines = 8;
  const footerLines = 2;
  const bodyHeight = Math.max(10, termHeight - headerLines - logLines - footerLines);

  // Render each panel
  const header = renderHeader(state, width);
  const ooda = renderOODA(state, bodyHeight);
  const market = renderMarket(state, bodyHeight);
  const pay = renderPayments(state, bodyHeight);
  const log = renderLog(state, width, logLines);

  // ─── Body: 3 columns separated by ║ borders ────────────────────────────────
  const maxRows = Math.max(ooda.length, market.length, pay.length);
  const bodyLines: string[] = [];
  for (let i = 0; i < maxRows; i++) {
    const o = padRight(ooda[i] ?? '', oodaW);
    const m = padRight(market[i] ?? '', marketW);
    const p = padRight(pay[i] ?? '', payW);
    const remaining = Math.max(0, width - oodaW - marketW - payW - 6);
    bodyLines.push(
      chalk.cyan('║') + ' ' + o + chalk.cyan('║') + ' ' + m + chalk.cyan('║') + ' ' + p +
      ' '.repeat(remaining) + chalk.cyan('║'),
    );
  }

  // ─── Footer ────────────────────────────────────────────────────────────────
  const uptime = Math.floor((Date.now() - state.startedAt) / 1000);
  const uptimeStr = `${Math.floor(uptime / 60)}m ${uptime % 60}s`;
  const refreshStr = state.lastRefresh > 0
    ? new Date(state.lastRefresh).toTimeString().slice(0, 8)
    : 'fetching…';
  const footerLeft = `  OpenClawd Stack  •  HERMES x402  •  $CLAWD  •  Solana  •  Uptime: ${uptimeStr}`;
  const footerRight = `  Last: ${refreshStr}  •  [Q] Quit  [R] Refresh  `;
  const footerPad = Math.max(0, width - footerLeft.length - footerRight.length + 1);

  const border = chalk.cyan('═'.repeat(width));
  const footer = [
    chalk.cyan('╠') + border + chalk.cyan('╣'),
    chalk.cyan('║') +
      chalk.gray(footerLeft) +
      ' '.repeat(footerPad) +
      chalk.gray(footerRight) +
      chalk.cyan('║'),
    chalk.cyan('╚') + border + chalk.cyan('╝'),
  ];

  // ─── Compose & emit ────────────────────────────────────────────────────────
  const allLines = [
    ...header,
    ...bodyLines,
    ...log,
    ...footer,
  ];

  const frame = CLEAR_SCREEN + allLines.join('\n') + '\n';
  process.stdout.write(frame);
}
