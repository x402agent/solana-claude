/**
 * clawd — Perps Screen
 *
 * Shows Phoenix perpetuals via Vulcan CLI.
 * Paper mode is always on unless LIVE_TRADING=true AND OPERATOR_CONFIRMED=true.
 *
 * Keys: [q] quote  [p] place paper order  [b] back to menu
 */

import chalk from 'chalk';
import { type PerpMarket } from '../state.js';
import { getTraderSnapshot, loadVulcanMarkets as loadVulcanMarketData, normalizeSymbol, runVulcanJson, vulcanInstallHint } from '../vulcan.js';

// ─── Safety gate ──────────────────────────────────────────────────────────────

const LIVE_MODE =
  process.env['LIVE_TRADING'] === 'true' &&
  process.env['OPERATOR_CONFIRMED'] === 'true';

// ─── Display helpers ──────────────────────────────────────────────────────────

function padEnd(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

function formatFunding(rate: number): string {
  const pct = (rate * 100).toFixed(4) + '%';
  return rate >= 0 ? chalk.green(pct) : chalk.red(pct);
}

function formatOI(oi: number): string {
  if (oi >= 1_000_000) return `$${(oi / 1_000_000).toFixed(2)}M`;
  if (oi >= 1_000) return `$${(oi / 1_000).toFixed(1)}K`;
  return `$${oi.toFixed(0)}`;
}

function renderPerpsScreen(
  markets: PerpMarket[],
  status: string,
  orderPrompt: string | null,
): void {
  process.stdout.write('\x1b[2J\x1b[H');

  const border = chalk.cyan('─'.repeat(60));
  const corner = chalk.cyan;

  process.stdout.write(chalk.cyanBright.bold('\n  📈  Phoenix Perpetuals · Clawd Trader  ') +
    (LIVE_MODE ? chalk.red.bold('[LIVE]') : chalk.yellow('[PAPER]')) + '\n');
  process.stdout.write('  ' + border + '\n\n');

  // Markets table header
  process.stdout.write(
    '  ' +
      chalk.cyan(padEnd('SYMBOL', 10)) +
      chalk.cyan(padEnd('MARK PRICE', 14)) +
      chalk.cyan(padEnd('FUNDING', 12)) +
      chalk.cyan(padEnd('OPEN INTEREST', 14)) +
      '\n',
  );
  process.stdout.write('  ' + chalk.cyan('─'.repeat(52)) + '\n');

  if (markets.length === 0) {
    process.stdout.write('  ' + chalk.gray('No markets loaded — running vulcan markets...\n'));
  } else {
    for (const m of markets) {
      process.stdout.write(
        '  ' +
          chalk.white(padEnd(m.symbol, 10)) +
          chalk.yellow(padEnd(`$${m.markPrice.toFixed(2)}`, 14)) +
          padEnd(formatFunding(m.fundingRate), 12) +
          chalk.gray(padEnd(formatOI(m.openInterest), 14)) +
          '\n',
      );
    }
  }

  process.stdout.write('\n  ' + border + '\n');
  process.stdout.write('  ' + chalk.gray(status) + '\n\n');

  if (orderPrompt) {
    process.stdout.write('  ' + chalk.cyanBright(orderPrompt) + '\n\n');
  }

  process.stdout.write(
    '  ' + chalk.gray('[q] quote  [p] paper long  [s] paper short  [t] trader snapshot  [b] back') + '\n\n',
  );
}

// ─── Vulcan markets fetcher ───────────────────────────────────────────────────

async function loadVulcanMarkets(): Promise<PerpMarket[]> {
  const result = await loadVulcanMarketData();
  return result.markets;
}

// ─── Main exported function ───────────────────────────────────────────────────

export async function runPerps(): Promise<void> {
  let markets: PerpMarket[] = [];
  let status = 'Fetching markets...';
  let orderPrompt: string | null = null;

  // Show loading screen
  renderPerpsScreen(markets, status, null);

  // Load markets in background
  loadVulcanMarkets().then(m => {
    markets = m;
    status = m.length > 0
      ? `${m.length} markets loaded (${LIVE_MODE ? 'LIVE' : 'paper mode'})`
      : 'vulcan CLI not found — showing demo data';
    renderPerpsScreen(markets, status, orderPrompt);
  }).catch(() => {
    markets = [];
    status = 'vulcan CLI unavailable — showing demo data';
    renderPerpsScreen(markets, status, orderPrompt);
  });

  return new Promise<void>(resolve => {
    const enableRaw = (): void => {
      if (process.stdin.setRawMode) process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
    };

    const disableRaw = (): void => {
      if (process.stdin.setRawMode) process.stdin.setRawMode(false);
    };

    enableRaw();

    const onData = (chunk: string): void => {
      if (chunk === 'b' || chunk === 'B' || chunk === '\x1b') {
        process.stdin.off('data', onData);
        disableRaw();
        resolve();
        return;
      }

      if (chunk === 'q' || chunk === 'Q') {
        // Quote mode
        if (markets.length > 0) {
          const first = markets[0]!;
          status = `Quote: ${first.symbol} @ ${first.markPrice ? `$${first.markPrice.toFixed(4)}` : 'n/a'} | Funding: ${(first.fundingRate * 100).toFixed(4)}%`;
        } else {
          status = 'No markets loaded yet.';
        }
        orderPrompt = null;
        renderPerpsScreen(markets, status, orderPrompt);
        return;
      }

      if (chunk === 'p' || chunk === 'P') {
        const sym = normalizeSymbol(markets[0]?.symbol);
        runVulcanJson(['paper', 'buy', sym, '--notional-usdc', '100', '--type', 'market'])
          .then(result => {
            orderPrompt = result.ok
              ? `Paper long submitted: ${sym} $100 notional`
              : `Paper long failed: ${result.stderr || 'Vulcan unavailable'}`;
            status = result.ok ? 'Paper fill recorded by Vulcan' : `Install Vulcan: ${vulcanInstallHint()}`;
            renderPerpsScreen(markets, status, orderPrompt);
          });
        orderPrompt = `Submitting paper long ${sym} $100 notional...`;
        status = 'Paper mode uses no real funds';
        renderPerpsScreen(markets, status, orderPrompt);
        return;
      }

      if (chunk === 's' || chunk === 'S') {
        const sym = normalizeSymbol(markets[0]?.symbol);
        runVulcanJson(['paper', 'sell', sym, '--notional-usdc', '100', '--type', 'market'])
          .then(result => {
            orderPrompt = result.ok
              ? `Paper short submitted: ${sym} $100 notional`
              : `Paper short failed: ${result.stderr || 'Vulcan unavailable'}`;
            status = result.ok ? 'Paper fill recorded by Vulcan' : `Install Vulcan: ${vulcanInstallHint()}`;
            renderPerpsScreen(markets, status, orderPrompt);
          });
        orderPrompt = `Submitting paper short ${sym} $100 notional...`;
        status = 'Paper mode uses no real funds';
        renderPerpsScreen(markets, status, orderPrompt);
        return;
      }

      if (chunk === 't' || chunk === 'T') {
        getTraderSnapshot(markets[0]?.symbol ?? 'SOL').then(snapshot => {
          status = `Trader snapshot: ${snapshot.source} | markets ${snapshot.markets.length} | health ${snapshot.health ? 'loaded' : 'unavailable'}`;
          orderPrompt = 'Use CLI for live actions: clawd perps preflight, then clawd perps long/short with explicit confirmation.';
          renderPerpsScreen(snapshot.markets, status, orderPrompt);
        });
        status = 'Loading trader snapshot...';
        renderPerpsScreen(markets, status, orderPrompt);
        return;
      }

      if (chunk === '\x03') {
        process.stdin.off('data', onData);
        disableRaw();
        resolve();
        process.exit(0);
      }
    };

    process.stdin.on('data', onData);
  });
}
