/**
 * HERMES x402 TUI — Header Panel
 *
 * Renders the neon pixel-art HERMES x402 branding banner.
 */

import chalk from 'chalk';
import type { DashboardState } from '../state.js';

const HERMES_ASCII = [
  '  ██╗  ██╗███████╗██████╗ ███╗   ███╗███████╗███████╗',
  '  ██║  ██║██╔════╝██╔══██╗████╗ ████║██╔════╝██╔════╝',
  '  ███████║█████╗  ██████╔╝██╔████╔██║█████╗  ███████╗',
  '  ██╔══██║██╔══╝  ██╔══██╗██║╚██╔╝██║██╔══╝  ╚════██║',
  '  ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║███████╗███████║',
];

const X402_BADGE = chalk.bgMagenta.white.bold(' x402 ');
const CLAWD_BADGE = chalk.bgCyan.black.bold(' $CLAWD ');
const NOUS_BADGE = chalk.bgGreen.black.bold(' NOUS ');
const PAYSH_BADGE = chalk.bgYellow.black.bold(' pay.sh ');
const packageBadge = (count: number): string =>
  chalk.bgBlue.white.bold(` PKG ${String(count).padStart(2, '0')} `);
const vaultBadge = (available: boolean, walletCount: number): string =>
  available
    ? chalk.bgGreen.black.bold(` VAULT ${walletCount} `)
    : chalk.bgRed.white.bold(' VAULT OFF ');

export function renderHeader(state: DashboardState, width: number): string[] {
  const lines: string[] = [];
  const border = chalk.cyan('═'.repeat(width));

  lines.push(chalk.cyan('╔') + border + chalk.cyan('╗'));

  // ASCII logo centered
  for (const row of HERMES_ASCII) {
    const colored = chalk.hex('#ff00ff').bold(row);
    const padding = Math.max(0, Math.floor((width - stripLen(row)) / 2));
    const right = Math.max(0, width - stripLen(row) - padding);
    lines.push(
      chalk.cyan('║') +
        ' '.repeat(padding) +
        colored +
        ' '.repeat(right) +
        chalk.cyan('║'),
    );
  }

  // x402 suffix + tagline
  const tag = `  ${X402_BADGE}  PRIVATE AI AGENT FOR NOUS RESEARCH  ${CLAWD_BADGE}`;
  const tagPlain = `    x402   PRIVATE AI AGENT FOR NOUS RESEARCH   $CLAWD `;
  const tagPad = Math.max(0, width - tagPlain.length);
  lines.push(
    chalk.cyan('║') + tag + ' '.repeat(tagPad) + chalk.cyan('║'),
  );

  // Sub-tag: self-sustaining loop
  const loop =
    chalk.yellow('  TRADE') +
    chalk.white(' → ') +
    chalk.green('EARN USDC') +
    chalk.white(' → ') +
    chalk.magenta('PAY x402') +
    chalk.white(' → ') +
    chalk.cyan('GET SMARTER') +
    chalk.white(' → ') +
    chalk.yellow('TRADE BETTER');
  const loopPlain = '  TRADE → EARN USDC → PAY x402 → GET SMARTER → TRADE BETTER';
  const loopPad = Math.max(0, width - loopPlain.length);
  lines.push(
    chalk.cyan('║') + loop + ' '.repeat(loopPad) + chalk.cyan('║'),
  );

  // Badges row
  const badgeLine = `  ${NOUS_BADGE}  ${PAYSH_BADGE}  ${chalk.hex('#00eeff').bold('SOLANA')}  ${chalk.hex('#ff00ff').bold('A2A')}  ${chalk.hex('#00ff99').bold('MCP')}  ${packageBadge(state.sdkPackageCount)}  ${vaultBadge(state.walletVault.available, state.walletVault.walletCount)}  `;
  const badgePlain = `     NOUS    pay.sh    SOLANA   A2A   MCP    PKG ${String(state.sdkPackageCount).padStart(2, '0')}    VAULT ${state.walletVault.available ? String(state.walletVault.walletCount) : 'OFF'}    `;
  const badgePad = Math.max(0, width - badgePlain.length);
  lines.push(
    chalk.cyan('║') + badgeLine + ' '.repeat(badgePad) + chalk.cyan('║'),
  );

  lines.push(chalk.cyan('╠') + border + chalk.cyan('╣'));

  return lines;
}

function stripLen(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}
