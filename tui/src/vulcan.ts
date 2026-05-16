import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

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

export function resolveVulcanBinary(): string | null {
  const direct = spawnSync('vulcan', ['version'], { stdio: 'ignore' });
  if (direct.status === 0) return 'vulcan';

  const candidates = [
    path.resolve(process.cwd(), 'vulcan-cli-master/target/debug/vulcan'),
    path.resolve(process.env.HOME || '', '.local/bin/vulcan'),
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

export function vulcanInstallHint(): string {
  return 'curl -fsSL https://github.com/Ellipsis-Labs/vulcan-cli/releases/latest/download/install.sh | sh';
}

export function runVulcanJson(args: string[], timeoutMs = 12_000): Promise<VulcanResult> {
  const vulcan = resolveVulcanBinary();
  if (!vulcan) {
    return Promise.resolve({ ok: false, stdout: '', stderr: 'Vulcan CLI not installed', status: 127 });
  }

  const finalArgs = args.includes('-o') || args.includes('--output') ? args : [...args, '-o', 'json'];
  return new Promise(resolve => {
    const child = spawn(vulcan, finalArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);

    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
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

export async function loadVulcanMarkets(): Promise<{ markets: VulcanMarket[]; source: 'live' | 'fallback'; status: string }> {
  const result = await runVulcanJson(['market', 'list']);
  if (!result.ok || !result.json) {
    return {
      markets: fallbackMarkets(),
      source: 'fallback',
      status: result.stderr || `Vulcan unavailable. Install with: ${vulcanInstallHint()}`,
    };
  }

  const markets = normalizeMarkets(result.json);
  return {
    markets,
    source: 'live',
    status: `${markets.length} Phoenix markets loaded from Vulcan`,
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

  const markets = rows.map((row: any) => ({
    symbol: normalizeSymbol(row.symbol ?? row.market ?? row.name),
    markPrice: numberFrom(row.markPrice ?? row.mark_price ?? row.price ?? row.index_price),
    fundingRate: numberFrom(row.fundingRate ?? row.funding_rate ?? row.funding),
    openInterest: numberFrom(row.openInterest ?? row.open_interest ?? row.oi),
    volume24h: numberFrom(row.volume24h ?? row.volume_24h ?? row.volume),
    change24h: numberFrom(row.change24h ?? row.change_24h ?? row.price_change_24h),
  })).filter((market: VulcanMarket) => market.symbol && market.markPrice > 0);

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
