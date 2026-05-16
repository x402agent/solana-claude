/**
 * HERMES x402 TUI — Agent Activity Log Panel
 *
 * Shows real-time log entries from all OODA/payment/A2A activity.
 */

import chalk, { type ChalkInstance } from 'chalk';
import type { DashboardState, LogEntry } from '../state.js';

const LEVEL_COLOR: Record<LogEntry['level'], ChalkInstance> = {
  info:  chalk.cyan,
  warn:  chalk.yellow,
  error: chalk.red,
  pay:   chalk.green,
  a2a:   chalk.magenta,
  trade: chalk.hex('#ff8c00'),
};

const PHASE_COLOR: Record<string, ChalkInstance> = {
  OBSERVE: chalk.cyan,
  ORIENT:  chalk.yellow,
  DECIDE:  chalk.magenta,
  ACT:     chalk.red,
  LEARN:   chalk.green,
  PAY:     chalk.green,
  A2A:     chalk.hex('#ff00ff'),
  TRADE:   chalk.hex('#ff8c00'),
  SYSTEM:  chalk.gray,
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function renderLog(
  state: DashboardState,
  width: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  const innerWidth = width - 4; // ║ + space on each side

  // Header
  const model = chalk.hex('#ff00ff').bold(state.activeModel.toUpperCase());
  const headerLabel = `AGENT LOG  [${state.activeModel.toUpperCase()}]`;
  lines.push(chalk.cyan('╠') + chalk.cyan('═'.repeat(width)) + chalk.cyan('╣'));
  lines.push(
    chalk.cyan('║') +
      '  ' + chalk.bold.white('AGENT LOG') +
      '  ' + chalk.gray('[') + model + chalk.gray(']') +
      ' '.repeat(Math.max(0, innerWidth - headerLabel.length - 1)) +
      chalk.cyan('║'),
  );

  const entries = state.log.slice(0, maxLines);
  const padLen = maxLines - entries.length;

  for (const entry of entries) {
    const timeStr = chalk.gray(fmtTime(entry.ts));
    const phaseColor = PHASE_COLOR[entry.phase] ?? chalk.white;
    const phaseStr = phaseColor(`[${entry.phase.padEnd(7)}]`);
    const levelColor = LEVEL_COLOR[entry.level] ?? chalk.white;
    const msgColored = levelColor(truncate(entry.msg, innerWidth - 22));
    const raw = `[${fmtTime(entry.ts)}] [${entry.phase.padEnd(7)}] ${truncate(entry.msg, innerWidth - 22)}`;
    const pad = Math.max(0, innerWidth - raw.length);
    lines.push(
      chalk.cyan('║') +
        '  ' + timeStr + ' ' + phaseStr + ' ' + msgColored +
        ' '.repeat(pad) +
        chalk.cyan('║'),
    );
  }

  for (let i = 0; i < padLen; i++) {
    lines.push(chalk.cyan('║') + ' '.repeat(width) + chalk.cyan('║'));
  }

  return lines;
}
