/**
 * HERMES x402 TUI — OODA Loop Panel
 *
 * Visualizes the current OODA phase with neon indicators.
 */

import chalk, { type ChalkInstance } from 'chalk';
import type { DashboardState, OODAPhase } from '../state.js';

const PHASE_ORDER: OODAPhase[] = ['observe', 'orient', 'decide', 'act', 'learn'];

const PHASE_LABELS: Record<OODAPhase, string> = {
  observe: 'OBSERVE',
  orient:  'ORIENT ',
  decide:  'DECIDE ',
  act:     'ACT    ',
  learn:   'LEARN  ',
  idle:    'IDLE   ',
};

const PHASE_COLORS: Record<OODAPhase, ChalkInstance> = {
  observe: chalk.cyan,
  orient:  chalk.yellow,
  decide:  chalk.magenta,
  act:     chalk.red,
  learn:   chalk.green,
  idle:    chalk.gray,
};

function dot(active: boolean, phase: OODAPhase, current: OODAPhase): string {
  if (current === phase) return chalk.bold.white('◉');
  if (active) return PHASE_COLORS[phase]('○');
  return chalk.gray('·');
}

export function renderOODA(state: DashboardState, height: number): string[] {
  const lines: string[] = [];
  const { oodaPhase, pulseIntervalSec, cycleCount, memory } = state;

  const currentIdx = PHASE_ORDER.indexOf(oodaPhase === 'idle' ? 'learn' : oodaPhase);

  lines.push(chalk.cyan('┌─ OODA LOOP ────────────────┐'));

  for (let i = 0; i < PHASE_ORDER.length; i++) {
    const phase = PHASE_ORDER[i]!;
    const isActive = i <= currentIdx || oodaPhase === 'idle';
    const isCurrent = phase === oodaPhase;
    const d = dot(isActive, phase, oodaPhase);
    const label = isCurrent
      ? chalk.bold.white(PHASE_LABELS[phase])
      : isActive
        ? PHASE_COLORS[phase](PHASE_LABELS[phase])
        : chalk.gray(PHASE_LABELS[phase]);

    const arrow = i < PHASE_ORDER.length - 1 ? chalk.gray(' →') : '   ';
    const marker = isCurrent ? chalk.bold.hex('#ff00ff')(' ◄') : '   ';
    lines.push(`│ ${d} ${label}${arrow}${marker} │`);

    // Connector arrow between phases
    if (i < PHASE_ORDER.length - 1) {
      lines.push(chalk.gray('│   ↓                        │'));
    }
  }

  lines.push(chalk.cyan('└────────────────────────────┘'));

  // Status rows
  const phaseColor = PHASE_COLORS[oodaPhase] ?? chalk.gray;
  const phaseLabel = oodaPhase.toUpperCase().padEnd(7);
  lines.push(`  Phase : ${phaseColor.bold(phaseLabel)}`);
  lines.push(`  Pulse : ${chalk.yellow(pulseIntervalSec + 's')}`);
  lines.push(`  Cycles: ${chalk.cyan(String(cycleCount))}`);
  lines.push(`  Mem   : ${chalk.green('K:' + memory.known)} ${chalk.yellow('L:' + memory.learned)} ${chalk.magenta('I:' + memory.inferred)}`);

  // Pad to height
  while (lines.length < height) lines.push('');

  return lines;
}
