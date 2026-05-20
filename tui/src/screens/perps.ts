/**
 * clawd — Perps Screen
 *
 * Drives the real Vulcan CLI binary (Ellipsis-Labs/vulcan-cli) for live
 * Phoenix perpetuals data and paper trading. All trades are paper-only.
 *
 * Keys: [q] quote  [p] paper long  [s] paper short
 *       [a] paper account  [x] paper positions  [r] refresh  [b] back
 */

import chalk from 'chalk';
import type { PerpMarket } from '../state.js';
import {
  getPaperPositions,
  getPaperStatus,
  getTraderSnapshot,
  loadVulcanMarkets,
  normalizeSymbol,
  runVulcanJson,
  vulcanInstallHint,
  type PaperPosition,
  type PaperStatus,
  type VulcanMarket,
} from '../vulcan.js';

// ─── Display helpers ──────────────────────────────────────────────────────────

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : `${s}${' '.repeat(n - s.length)}`;
}

function fmtPrice(p: number): string {
  if (p === 0) return chalk.gray('---');
  if (p >= 10_000) return chalk.yellow(`$${p.toFixed(0)}`);
  if (p >= 1) return chalk.yellow(`$${p.toFixed(2)}`);
  return chalk.yellow(`$${p.toFixed(4)}`);
}

function fmtFunding(rate: number): string {
  if (rate === 0) return chalk.gray('--');
  const pct = `${(rate * 100).toFixed(4)}%`;
  return rate >= 0 ? chalk.green(pct) : chalk.red(pct);
}

function fmtOI(oi: number): string {
  if (oi === 0) return chalk.gray('---');
  if (oi >= 1_000_000) return `$${(oi / 1_000_000).toFixed(2)}M`;
  if (oi >= 1_000) return `$${(oi / 1_000).toFixed(1)}K`;
  return `$${oi.toFixed(0)}`;
}

function fmtChange(pct: number): string {
  if (pct === 0) return chalk.gray(' ----');
  const s = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  return pct >= 0 ? chalk.green(s) : chalk.red(s);
}

function fmtPnl(pnl: number): string {
  if (pnl === 0) return chalk.gray('$0.00');
  return pnl >= 0 ? chalk.green(`+$${pnl.toFixed(2)}`) : chalk.red(`-$${Math.abs(pnl).toFixed(2)}`);
}

// ─── View renderers ───────────────────────────────────────────────────────────

type ViewMode = 'markets' | 'account' | 'positions';

function renderMarkets(markets: VulcanMarket[]): void {
  process.stdout.write(
    `  ${chalk.cyan(pad('SYMBOL', 8))}${chalk.cyan(pad('MARK PRICE', 14))}${chalk.cyan(pad('24H', 10))}${chalk.cyan(pad('FUNDING', 13))}${chalk.cyan(pad('OI', 12))}${chalk.cyan(pad('MAX LEV', 8))}\n`,
  );
  process.stdout.write(`  ${chalk.cyan('─'.repeat(66))}\n`);

  if (markets.length === 0) {
    process.stdout.write(`  ${chalk.gray('No markets — fetching from Vulcan...')}\n`);
    return;
  }

  for (const m of markets) {
    process.stdout.write(
      `  ${chalk.white(pad(m.symbol, 8))}${pad(fmtPrice(m.markPrice), 14)}${pad(fmtChange(m.change24h), 10)}${pad(fmtFunding(m.fundingRate), 13)}${chalk.gray(pad(fmtOI(m.openInterest), 12))}${chalk.gray(`${m.maxLeverage}x`)}\n`,
    );
  }
}

function renderAccount(ps: PaperStatus | null, positions: PaperPosition[]): void {
  if (!ps) {
    process.stdout.write(`  ${chalk.gray('Paper account not initialized — run: vulcan paper init')}\n`);
    return;
  }
  process.stdout.write(`  ${chalk.bold.white('PAPER ACCOUNT')}\n\n`);
  process.stdout.write(`  ${chalk.cyan('Balance')}    ${chalk.white(`$${ps.balance.toFixed(2)}`)} USDC\n`);
  process.stdout.write(`  ${chalk.cyan('Equity')}     ${chalk.white(`$${ps.equity.toFixed(2)}`)} USDC\n`);
  process.stdout.write(`  ${chalk.cyan('Unreal PnL')} ${fmtPnl(ps.unrealizedPnl)}\n`);
  process.stdout.write(`  ${chalk.cyan('Realized')}   ${fmtPnl(ps.realizedPnl)}\n`);
  process.stdout.write(`  ${chalk.cyan('Fees Paid')}  ${chalk.gray(`$${ps.feesPaid.toFixed(4)}`)}\n`);
  process.stdout.write(
    `  ${chalk.cyan('Positions')} ${chalk.white(String(ps.openPositions))}   ${chalk.cyan('Orders')} ${chalk.white(String(ps.openOrders))}   ${chalk.cyan('Fills')} ${chalk.white(String(ps.fills))}\n`,
  );
  process.stdout.write(`  ${chalk.cyan('Exposure')}   ${chalk.white(`${(ps.exposureRatio * 100).toFixed(2)}%`)}\n`);

  if (positions.length > 0) {
    process.stdout.write(`\n  ${chalk.bold.white('OPEN POSITIONS')}\n`);
    for (const pos of positions) {
      const sideColor = pos.side === 'buy' || pos.side === 'long' ? chalk.green : chalk.red;
      process.stdout.write(
        `  ${chalk.cyan(pad(pos.symbol, 6))} ${sideColor(pad(pos.side.toUpperCase(), 6))} ${chalk.white(pos.sizeTokens.toFixed(2))} @ ${chalk.yellow(`$${pos.entryPrice.toFixed(2)}`)} pnl ${fmtPnl(pos.unrealizedPnl)}\n`,
      );
    }
  }
}

function renderPositions(positions: PaperPosition[], markets: VulcanMarket[]): void {
  process.stdout.write(`  ${chalk.bold.white('PAPER POSITIONS')}\n\n`);
  if (positions.length === 0) {
    process.stdout.write(`  ${chalk.gray('No open paper positions.')}\n`);
    return;
  }
  process.stdout.write(
    `  ${chalk.cyan(pad('SYMBOL', 8))}${chalk.cyan(pad('SIDE', 7))}${chalk.cyan(pad('SIZE', 10))}${chalk.cyan(pad('ENTRY', 12))}${chalk.cyan(pad('MARK', 12))}${chalk.cyan(pad('UNREAL PNL', 12))}\n`,
  );
  process.stdout.write(`  ${chalk.cyan('─'.repeat(64))}\n`);

  for (const pos of positions) {
    const liveMarket = markets.find(m => m.symbol === pos.symbol);
    const mark = liveMarket?.markPrice ?? pos.markPrice;
    const sideColor = pos.side === 'buy' || pos.side === 'long' ? chalk.green : chalk.red;
    process.stdout.write(
      `  ${chalk.white(pad(pos.symbol, 8))}${sideColor(pad(pos.side.toUpperCase(), 7))}${chalk.white(pad(pos.sizeTokens.toFixed(2), 10))}${chalk.yellow(pad(`$${pos.entryPrice.toFixed(2)}`, 12))}${chalk.yellow(pad(mark > 0 ? `$${mark.toFixed(2)}` : '---', 12))}${fmtPnl(pos.unrealizedPnl)}\n`,
    );
  }
}

// ─── Screen shell ─────────────────────────────────────────────────────────────

interface ScreenState {
  markets: VulcanMarket[];
  status: string;
  orderPrompt: string | null;
  paperStatus: PaperStatus | null;
  paperPositions: PaperPosition[];
  view: ViewMode;
}

function renderScreen(s: ScreenState): void {
  process.stdout.write('\x1b[2J\x1b[H');
  const W = Math.min(process.stdout.columns || 100, 110);
  const border = chalk.cyan('─'.repeat(W - 4));

  process.stdout.write(
    `\n  ${chalk.cyanBright.bold('📈  Phoenix Perpetuals · Vulcan CLI  ')}${chalk.yellow('[PAPER]')}${chalk.gray('  ·  paper-only mode')}\n`,
  );
  process.stdout.write(`  ${border}\n\n`);

  if (s.view === 'account') renderAccount(s.paperStatus, s.paperPositions);
  else if (s.view === 'positions') renderPositions(s.paperPositions, s.markets);
  else renderMarkets(s.markets);

  process.stdout.write(`\n  ${border}\n`);
  if (s.orderPrompt) process.stdout.write(`  ${chalk.cyanBright(s.orderPrompt)}\n`);
  process.stdout.write(`  ${chalk.gray(s.status)}\n\n`);
  process.stdout.write(
    `  ${chalk.gray('[q] quote  [p] long  [s] short  [a] account  [x] positions  [r] refresh  [b] back')}\n\n`,
  );
}

// ─── Key handlers (split for complexity budget) ───────────────────────────────

function handleRefresh(s: ScreenState, redraw: () => void): void {
  s.status = 'Refreshing...';
  redraw();
  Promise.all([loadVulcanMarkets(), getPaperStatus(), getPaperPositions()]).then(([mkt, ps, pp]) => {
    s.markets = mkt.markets;
    s.status = mkt.status;
    s.paperStatus = ps;
    s.paperPositions = pp;
    s.orderPrompt = null;
    redraw();
  }).catch(() => { /* silent */ });
}

function handlePaperOrder(s: ScreenState, side: 'buy' | 'sell', redraw: () => void): void {
  const sym = normalizeSymbol(s.markets[0]?.symbol);
  s.view = 'markets';
  s.orderPrompt = `Submitting paper ${side === 'buy' ? 'long' : 'short'} ${sym} $100 notional…`;
  s.status = 'Paper mode — no real funds at risk';
  redraw();

  runVulcanJson(['paper', side, sym, '--notional-usdc', '100']).then(result => {
    if (result.ok) {
      s.orderPrompt = `✔ Paper ${side === 'buy' ? 'long' : 'short'} filled: ${sym} $100`;
      s.status = 'Fill recorded — refreshing account…';
      return Promise.all([getPaperStatus(), getPaperPositions()]);
    }
    s.orderPrompt = `✘ Failed: ${result.stderr.slice(0, 60) || vulcanInstallHint()}`;
    s.status = 'Order failed';
    return Promise.resolve([null, []] as [PaperStatus | null, PaperPosition[]]);
  }).then(([ps, pp]) => {
    if (ps !== undefined) s.paperStatus = ps;
    if (pp !== undefined) s.paperPositions = pp;
    redraw();
  }).catch(() => { redraw(); });
}

function handleSnapshot(s: ScreenState, redraw: () => void): void {
  s.view = 'markets';
  s.status = 'Loading trader snapshot…';
  redraw();
  getTraderSnapshot(s.markets[0]?.symbol ?? 'SOL').then(snap => {
    s.markets = snap.markets;
    s.paperStatus = snap.paperStatus ?? null;
    s.paperPositions = snap.paperPositions ?? [];
    s.status = `Snapshot: ${snap.source} · ${snap.markets.length} markets · ${s.paperPositions.length} positions`;
    s.orderPrompt = null;
    redraw();
  }).catch(() => { redraw(); });
}

function handleQuote(s: ScreenState, redraw: () => void): void {
  s.view = 'markets';
  if (s.markets.length > 0) {
    const m = s.markets[0]!;
    s.status = `${m.symbol} mark ${fmtPrice(m.markPrice)}  funding ${(m.fundingRate * 100).toFixed(4)}%  OI ${fmtOI(m.openInterest)}`;
  } else {
    s.status = 'No markets loaded yet.';
  }
  s.orderPrompt = null;
  redraw();
}

function handleNumberKey(s: ScreenState, chunk: string, redraw: () => void): void {
  const idx = Number.parseInt(chunk, 10) - 1;
  const m = s.markets[idx];
  if (m) {
    s.view = 'markets';
    s.status = `${m.symbol} mark ${fmtPrice(m.markPrice)}  funding ${(m.fundingRate * 100).toFixed(4)}%  OI ${fmtOI(m.openInterest)}  24h ${fmtChange(m.change24h)}  max ${m.maxLeverage}x`;
    s.orderPrompt = null;
    redraw();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runPerps(): Promise<void> {
  const s: ScreenState = {
    markets: [],
    status: 'Fetching markets from Vulcan...',
    orderPrompt: null,
    paperStatus: null,
    paperPositions: [],
    view: 'markets',
  };

  const redraw = (): void => renderScreen(s);
  redraw();

  Promise.all([loadVulcanMarkets(), getPaperStatus(), getPaperPositions()]).then(([mkt, ps, pp]) => {
    s.markets = mkt.markets;
    s.status = mkt.status;
    s.paperStatus = ps;
    s.paperPositions = pp;
    redraw();
  }).catch(err => {
    s.status = `Load error: ${String(err).slice(0, 80)}`;
    redraw();
  });

  return new Promise<void>(resolve => {
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const stopRaw = (): void => { if (process.stdin.setRawMode) process.stdin.setRawMode(false); };

    const setView = (v: ViewMode): void => { s.view = v; s.orderPrompt = null; redraw(); };

    // Dispatch table: lowercase key → handler
    const dispatch: Record<string, () => void> = {
      r: () => handleRefresh(s, redraw),
      a: () => setView('account'),
      x: () => setView('positions'),
      q: () => handleQuote(s, redraw),
      p: () => handlePaperOrder(s, 'buy', redraw),
      s: () => handlePaperOrder(s, 'sell', redraw),
      t: () => handleSnapshot(s, redraw),
    };

    const onData = (chunk: string): void => {
      if (chunk === 'b' || chunk === 'B' || chunk === '\x1b') {
        process.stdin.off('data', onData); stopRaw(); resolve(); return;
      }
      if (chunk === '\x03') { process.stdin.off('data', onData); stopRaw(); process.exit(0); }
      const handler = dispatch[chunk.toLowerCase()];
      if (handler) { handler(); return; }
      if (/^[1-9]$/.test(chunk)) handleNumberKey(s, chunk, redraw);
    };

    process.stdin.on('data', onData);
  });
}

// Re-export PerpMarket so state.ts import stays satisfied in other files
export type { PerpMarket };
