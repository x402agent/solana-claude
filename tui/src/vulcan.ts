import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export interface VulcanMarket {
  symbol: string;
  markPrice: number;
  fundingRate: number;
  openInterest: number;
  volume24h?: number;
  change24h?: number;
}

export interface VulcanResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
  json?: unknown;
}

export function normalizeSymbol(symbol?: string): string {
  return (symbol || 'SOL').replace(/-PERP$/i, '').toUpperCase();
}

function resolveClawdPerpsCli(): { command: string; args: string[] } | null {
  const distCli = path.resolve(process.cwd(), 'packages/clawd-perps/dist/cli.js');
  if (fs.existsSync(distCli)) {
    return { command: 'node', args: [distCli] };
  }

  const srcCli = path.resolve(process.cwd(), 'packages/clawd-perps/src/cli.ts');
  if (fs.existsSync(srcCli)) {
    return { command: 'node', args: ['--import', 'tsx/esm', srcCli] };
  }

  return null;
}

export function vulcanInstallHint(): string {
  return 'npm --prefix packages/clawd-perps install --workspaces=false --package-lock=false && npm --prefix packages/clawd-perps run build';
}

export function runVulcanJson(args: string[], timeoutMs = 12_000): Promise<VulcanResult> {
  const cli = resolveClawdPerpsCli();
  if (!cli) {
    return Promise.resolve({
      ok: false,
      stdout: '',
      stderr: 'Rise-powered clawd-perps CLI not found',
      status: 127,
    });
  }

  const mappedArgs = mapLegacyArgs(args);
  return new Promise(resolve => {
    const child = spawn(cli.command, [...cli.args, 'perps', ...mappedArgs], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('close', status => {
      clearTimeout(timer);
      let json: unknown;
      try {
        json = stdout.trim() ? JSON.parse(stdout) : undefined;
      } catch {
        json = undefined;
      }
      resolve({ ok: status === 0, stdout, stderr, status, json });
    });
  });
}

function mapLegacyArgs(args: string[]): string[] {
  if (args[0] === 'market' && args[1] === 'list') return ['market', 'list'];
  if (args[0] === 'market' && args[1] === 'ticker') return ['market', 'ticker', `${normalizeSymbol(args[2])}-PERP`];
  if (args[0] === 'portfolio') return ['account', 'portfolio'];
  if (args[0] === 'position' && args[1] === 'list') return ['position', 'list'];
  if (args[0] === 'agent' && args[1] === 'health') return ['health'];

  if (args[0] === 'paper' && (args[1] === 'buy' || args[1] === 'sell')) {
    const side = args[1] === 'buy' ? 'buy' : 'sell';
    const symbol = `${normalizeSymbol(args[2])}-PERP`;
    const notionalIndex = args.indexOf('--notional-usdc');
    const size = notionalIndex >= 0 ? args[notionalIndex + 1] ?? '100' : '100';
    return ['order', 'place', symbol, '--side', side, '--type', 'market', '--size', size];
  }

  return args;
}

export async function loadVulcanMarkets(): Promise<{ markets: VulcanMarket[]; source: 'live' | 'fallback'; status: string }> {
  const result = await runVulcanJson(['market', 'list']);
  if (!result.ok || !result.json) {
    return {
      markets: fallbackMarkets(),
      source: 'fallback',
      status: result.stderr || `clawd-perps unavailable. Build with: ${vulcanInstallHint()}`,
    };
  }

  const markets = normalizeMarkets(result.json);
  return {
    markets,
    source: 'live',
    status: `${markets.length} Phoenix markets loaded from Rise SDK`,
  };
}

export async function getTraderSnapshot(symbol = 'SOL'): Promise<{
  markets: VulcanMarket[];
  ticker?: unknown;
  portfolio?: unknown;
  positions?: unknown;
  health?: unknown;
  source: 'live' | 'fallback';
}> {
  const sym = normalizeSymbol(symbol);
  const [marketResult, ticker, portfolio, positions, health] = await Promise.all([
    loadVulcanMarkets(),
    runVulcanJson(['market', 'ticker', sym]),
    runVulcanJson(['portfolio']),
    runVulcanJson(['position', 'list']),
    runVulcanJson(['agent', 'health']),
  ]);

  return {
    markets: marketResult.markets,
    ticker: ticker.json,
    portfolio: portfolio.json,
    positions: positions.json,
    health: health.json,
    source: ticker.ok || portfolio.ok ? 'live' : marketResult.source,
  };
}

function normalizeMarkets(payload: unknown): VulcanMarket[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as any)?.markets)
      ? (payload as any).markets
      : Array.isArray((payload as any)?.data)
        ? (payload as any).data
        : [];

  const markets = rows
    .map((row: any) => ({
      symbol: normalizeSymbol(row.symbol ?? row.market ?? row.name),
      markPrice: numberFrom(
        row.markPrice ??
          row.mark_price ??
          row.price ??
          row.mid ??
          row.bestBid?.[0] ??
          row.bestAsk?.[0],
      ),
      fundingRate: numberFrom(row.fundingRate ?? row.funding_rate ?? row.funding),
      openInterest: numberFrom(row.openInterest ?? row.open_interest ?? row.oi),
      volume24h: numberFrom(row.volume24h ?? row.volume_24h ?? row.volume),
      change24h: numberFrom(row.change24h ?? row.change_24h ?? row.price_change_24h),
    }))
    .filter((market: VulcanMarket) => market.symbol);

  return markets.length > 0 ? markets : fallbackMarkets();
}

function fallbackMarkets(): VulcanMarket[] {
  return [
    { symbol: 'SOL', markPrice: 0, fundingRate: 0, openInterest: 0 },
    { symbol: 'BTC', markPrice: 0, fundingRate: 0, openInterest: 0 },
    { symbol: 'ETH', markPrice: 0, fundingRate: 0, openInterest: 0 },
  ];
}

function numberFrom(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[$,%]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
