/**
 * HERMES x402 TUI — Payments & Protocol Panel
 *
 * Shows x402 / pay.sh / A2A / confidential agent status and payment history.
 */

import chalk from 'chalk';
import type { DashboardState } from '../state.js';

function statusDot(online: boolean | string): string {
  if (online === 'online' || online === true) return chalk.green('●');
  if (online === 'degraded') return chalk.yellow('◐');
  return chalk.red('○');
}

function shortSig(sig: string): string {
  if (sig.length <= 12) return sig;
  return sig.slice(0, 6) + '…' + sig.slice(-4);
}

export function renderPayments(state: DashboardState, height: number): string[] {
  const lines: string[] = [];
  const { usdcBalance, clawdBalance, lastPayment, totalSpent, a2aConnections,
    confidentialMode, darkDefiArmed, payshStatus, activeModel } = state;

  lines.push(chalk.cyan('┌─ x402 PAYMENTS & PROTOCOLS ───┐'));

  // Balance
  const bal = usdcBalance > 0 ? usdcBalance.toFixed(2) : '0.00';
  lines.push(`│  ${chalk.cyan('BALANCE')}                       │`);
  lines.push(`│   ${chalk.bold.green(bal + ' USDC').padEnd(32)}│`);
  lines.push(`│   ${chalk.hex('#ff00ff')(clawdBalance.toFixed(0) + ' $CLAWD').padEnd(32)}│`);
  lines.push(`│   Spent: ${chalk.yellow('$' + totalSpent.toFixed(4)).padEnd(23)}│`);

  lines.push(chalk.gray('│  ──────────────────────────── │'));

  // Protocol status
  lines.push(`│  ${chalk.cyan('PROTOCOLS')}                     │`);
  lines.push(`│   ${statusDot('online')} x402    ${chalk.white('ENABLED').padEnd(20)} │`);
  lines.push(`│   ${statusDot(payshStatus)} pay.sh  ${chalk.white(payshStatus.toUpperCase()).padEnd(20)} │`);
  lines.push(`│   ${statusDot('online')} MPP     ${chalk.white('ENABLED').padEnd(20)} │`);
  lines.push(`│   ${statusDot('online')} AP2     ${chalk.white('ENABLED').padEnd(20)} │`);

  lines.push(chalk.gray('│  ──────────────────────────── │'));

  // A2A connections
  const active = a2aConnections.filter(c => c.status === 'connected');
  lines.push(`│  ${chalk.cyan('A2A AGENTS')} (${active.length}/${a2aConnections.length})             │`);
  for (const conn of a2aConnections.slice(0, 3)) {
    const d = statusDot(conn.status === 'connected');
    const id = conn.agentId.slice(0, 12).padEnd(12);
    const lat = conn.latencyMs > 0 ? chalk.gray(conn.latencyMs + 'ms') : chalk.gray('---');
    lines.push(`│   ${d} ${chalk.white(id)} ${lat.padEnd(8)}  │`);
  }
  if (a2aConnections.length === 0) {
    lines.push('│   No A2A peers yet             │');
  }

  lines.push(chalk.gray('│  ──────────────────────────── │'));

  // Agent / model
  lines.push(`│  ${chalk.cyan('INFERENCE')}                     │`);
  const modelLabel = activeModel.toUpperCase().slice(0, 20).padEnd(20);
  lines.push(`│   Model: ${chalk.hex('#ff00ff')(modelLabel.slice(0, 14)).padEnd(24)}│`);

  lines.push(chalk.gray('│  ──────────────────────────── │'));

  // Security flags
  lines.push(`│  ${chalk.cyan('SECURITY')}                      │`);
  const confStr = confidentialMode ? chalk.green('✓ ON ') : chalk.red('✗ OFF');
  const darkStr = darkDefiArmed ? chalk.green('✓ ARMED ') : chalk.yellow('○ DISARMED');
  lines.push(`│   Confidential : ${confStr.padEnd(16)}│`);
  lines.push(`│   Dark DeFi    : ${darkStr.padEnd(16)}│`);

  lines.push(chalk.gray('│  ──────────────────────────── │'));

  // Last payment
  lines.push(`│  ${chalk.cyan('LAST PAYMENT')}                  │`);
  if (lastPayment) {
    const amt = lastPayment.amount.toFixed(4);
    const proto = lastPayment.protocol.toUpperCase().padEnd(4);
    const conf = lastPayment.confidential ? chalk.green('🔒') : chalk.gray('  ');
    lines.push(`│   ${chalk.yellow(amt)} ${chalk.white(lastPayment.asset)} via ${chalk.magenta(proto)} ${conf}  │`);
    lines.push(`│   ${chalk.gray(shortSig(lastPayment.signature)).padEnd(33)}│`);
    const res = lastPayment.resource.slice(0, 26).padEnd(26);
    lines.push(`│   ${chalk.gray(res).padEnd(33)}│`);
  } else {
    lines.push('│   No payments yet              │');
    lines.push('│                                │');
    lines.push('│                                │');
  }

  lines.push(chalk.cyan('└────────────────────────────────┘'));

  while (lines.length < height) lines.push('');
  return lines;
}
