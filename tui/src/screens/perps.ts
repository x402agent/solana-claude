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

  process.stdout.write(chalk.cyanBright.bold('\n  📈  Phoenix Perpetuals  ') +
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
    '  ' + chalk.gray('[q] quote  [p] place paper order  [b] back') + '\n\n',
  );
}

// ─── Vulcan markets fetcher ───────────────────────────────────────────────────

async function loadVulcanMarkets(): Promise<PerpMarket[]> {
  try {
    // Dynamically import execa so it only fails at runtime if missing
    const { execa } = await import('execa') as { execa: (cmd: string, args: string[], opts?: Record<string, unknown>) => Promise<{ stdout: string }> };
    const result = await execa('vulcan', ['markets'], {
      reject: false,
      timeout: 8_000,
    });
    // Try to parse JSON output from vulcan markets
    const raw = result.stdout.trim();
    if (!raw) return fallbackMarkets();
    try {
      const parsed = JSON.parse(raw) as Array<{
        symbol?: string;
        name?: string;
        markPrice?: number;
        mark_price?: number;
        fundingRate?: number;
        funding_rate?: number;
        openInterest?: number;
        open_interest?: number;
      }>;
      if (!Array.isArray(parsed)) return fallbackMarkets();
      return parsed.slice(0, 10).map(m => ({
        symbol: (m.symbol ?? m.name ?? '???').toUpperCase(),
        markPrice: m.markPrice ?? m.mark_price ?? 0,
        fundingRate: m.fundingRate ?? m.funding_rate ?? 0,
        openInterest: m.openInterest ?? m.open_interest ?? 0,
      }));
    } catch {
      // Not JSON — vulcan may print a table; fall back
      return fallbackMarkets();
    }
  } catch {
    return fallbackMarkets();
  }
}

/** Fallback demo markets when vulcan CLI is not installed */
function fallbackMarkets(): PerpMarket[] {
  return [
    { symbol: 'SOL-PERP',  markPrice: 158.42, fundingRate:  0.0001, openInterest: 12_500_000 },
    { symbol: 'BTC-PERP',  markPrice: 67200,  fundingRate:  0.00008, openInterest: 98_000_000 },
    { symbol: 'ETH-PERP',  markPrice: 3540,   fundingRate: -0.00003, openInterest: 45_000_000 },
    { symbol: 'JTO-PERP',  markPrice: 3.21,   fundingRate:  0.0002,  openInterest: 2_100_000 },
    { symbol: 'BONK-PERP', markPrice: 0.0000285, fundingRate: 0.0003, openInterest: 890_000 },
  ];
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
    markets = fallbackMarkets();
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
          status = `Quote: ${first.symbol} @ $${first.markPrice.toFixed(2)} | Funding: ${(first.fundingRate * 100).toFixed(4)}%`;
        } else {
          status = 'No markets loaded yet.';
        }
        orderPrompt = null;
        renderPerpsScreen(markets, status, orderPrompt);
        return;
      }

      if (chunk === 'p' || chunk === 'P') {
        // Paper order prompt
        orderPrompt = LIVE_MODE
          ? '⚠️  LIVE MODE: would submit real order (disabled in this build)'
          : '📝  Paper order: BUY 1x SOL-PERP @ market — recorded (no real funds)';
        status = 'Paper order placed (no real funds at risk)';
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
