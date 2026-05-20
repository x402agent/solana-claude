/**
 * Vulcan CLI bridge — wraps the real `vulcan` binary (Ellipsis-Labs/vulcan-cli).
 *
 * All commands emit `{ ok, data, meta }` or `{ ok, error }` JSON on stdout.
 * We pass `-o json` and parse the envelope; callers never see raw output.
 */
import { spawn, spawnSync } from 'node:child_process';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VulcanMarket {
  symbol: string;
  markPrice: number;
  fundingRate: number;
  openInterest: number;
  volume24h: number;
  change24h: number;
  maxLeverage: number;
  status: string;
}

export interface VulcanResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
  data?: unknown;
  json?: unknown;
}

export interface PaperStatus {
  balance: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnl: number;
  openPositions: number;
  openOrders: number;
  fills: number;
  feesPaid: number;
  exposureRatio: number;
}

export interface PaperPosition {
  symbol: string;
  side: string;
  sizeTokens: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  marginUsdc: number;
  leverage: number;
}

// Typed shape returned by `vulcan market list`
interface RawMarketEntry {
  symbol?: string;
  status?: string;
  max_leverage?: number;
  isolated_only?: boolean;
}

// Typed shape returned by `vulcan market ticker`
interface RawTicker {
  symbol?: string;
  mark_price?: number;
  funding_rate?: number;
  open_interest?: number;
  volume_24h_usd?: number;
  change_24h_pct?: number;
}

// Typed shape returned by `vulcan paper status`
interface RawPaperStatus {
  balance?: number;
  equity?: number;
  unrealized_pnl?: number;
  realized_pnl?: number;
  open_positions?: number;
  open_orders?: number;
  fills?: number;
  fees_paid?: number;
  exposure_ratio?: number;
}

// Typed shape returned by `vulcan paper positions`
interface RawPaperPosition {
  symbol?: string;
  side?: string;
  size_tokens?: number;
  size?: number;
  entry_price?: number;
  mark_price?: number;
  unrealized_pnl?: number;
  margin_usdc?: number;
  margin?: number;
  leverage?: number;
}

// ─── Binary resolution ────────────────────────────────────────────────────────

function resolveVulcanBinary(): string | null {
  const probe = spawnSync('which', ['vulcan'], { encoding: 'utf8' });
  if (probe.status === 0 && probe.stdout.trim()) return 'vulcan';
  const home = process.env.HOME ?? '';
  for (const p of [`${home}/.local/bin/vulcan`, `${home}/.cargo/bin/vulcan`, '/usr/local/bin/vulcan']) {
    if (spawnSync('test', ['-x', p]).status === 0) return p;
  }
  return null;
}

const VULCAN_BIN = resolveVulcanBinary();

export function vulcanInstallHint(): string {
  return 'curl -sSfL https://vulcan.ellipsis.markets/install.sh | sh  (or: cargo install vulcan-cli)';
}

export function normalizeSymbol(symbol?: string): string {
  return (symbol ?? 'SOL').replace(/-PERP$/i, '').toUpperCase();
}

// ─── Core runner ──────────────────────────────────────────────────────────────

export function runVulcanJson(args: string[], timeoutMs = 15_000): Promise<VulcanResult> {
  if (!VULCAN_BIN) {
    return Promise.resolve({
      ok: false, stdout: '', stderr: `vulcan binary not found — ${vulcanInstallHint()}`, status: 127,
    });
  }

  return new Promise(resolve => {
    const child = spawn(VULCAN_BIN, [...args, '-o', 'json'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on('close', exitCode => {
      clearTimeout(timer);
      let parsed: { ok?: boolean; data?: unknown } | undefined;
      try { parsed = stdout.trim() ? JSON.parse(stdout) as typeof parsed : undefined; } catch { /* ignore */ }
      const ok = exitCode === 0 && parsed?.ok !== false;
      resolve({ ok, stdout, stderr, status: exitCode, data: parsed?.data, json: parsed });
    });
  });
}

// ─── Market data ──────────────────────────────────────────────────────────────

const PRIORITY_SYMBOLS = ['SOL', 'BTC', 'ETH', 'SUI', 'DOGE', 'XRP', 'BNB', 'HYPE'];

export async function loadVulcanMarkets(): Promise<{
  markets: VulcanMarket[];
  source: 'live' | 'fallback';
  status: string;
}> {
  const listResult = await runVulcanJson(['market', 'list']);
  if (!listResult.ok || !listResult.data) {
    return { markets: fallbackMarkets(), source: 'fallback', status: listResult.stderr || 'vulcan unavailable' };
  }

  const raw = listResult.data as { markets?: RawMarketEntry[] };
  const marketList = Array.isArray(raw.markets) ? raw.markets : [];
  if (marketList.length === 0) {
    return { markets: fallbackMarkets(), source: 'fallback', status: 'No markets returned' };
  }

  const sorted = [...marketList].sort((a, b) => {
    const ai = PRIORITY_SYMBOLS.indexOf(a.symbol ?? '');
    const bi = PRIORITY_SYMBOLS.indexOf(b.symbol ?? '');
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return (a.symbol ?? '').localeCompare(b.symbol ?? '');
  });

  const toFetch = sorted.slice(0, 12);
  const tickerResults = await Promise.all(
    toFetch.map(m => runVulcanJson(['market', 'ticker', m.symbol ?? 'SOL'], 8_000)),
  );

  const markets: VulcanMarket[] = toFetch.map((m, i) => {
    const ticker = tickerResults[i]?.data as RawTicker | undefined;
    return {
      symbol: normalizeSymbol(m.symbol),
      status: m.status ?? 'Active',
      maxLeverage: m.max_leverage ?? 0,
      markPrice: ticker?.mark_price ?? 0,
      fundingRate: ticker?.funding_rate ?? 0,
      openInterest: ticker?.open_interest ?? 0,
      volume24h: ticker?.volume_24h_usd ?? 0,
      change24h: ticker?.change_24h_pct ?? 0,
    };
  });

  const live = markets.filter(m => m.markPrice > 0).length;
  return {
    markets,
    source: live > 0 ? 'live' : 'fallback',
    status: `${markets.length} Phoenix markets · ${live} with live price`,
  };
}

// ─── Paper trading ────────────────────────────────────────────────────────────

export async function getPaperStatus(): Promise<PaperStatus | null> {
  const result = await runVulcanJson(['paper', 'status']);
  if (!result.ok || !result.data) return null;
  const d = result.data as RawPaperStatus;
  return {
    balance: d.balance ?? 0,
    equity: d.equity ?? 0,
    unrealizedPnl: d.unrealized_pnl ?? 0,
    realizedPnl: d.realized_pnl ?? 0,
    openPositions: d.open_positions ?? 0,
    openOrders: d.open_orders ?? 0,
    fills: d.fills ?? 0,
    feesPaid: d.fees_paid ?? 0,
    exposureRatio: d.exposure_ratio ?? 0,
  };
}

export async function getPaperPositions(): Promise<PaperPosition[]> {
  const result = await runVulcanJson(['paper', 'positions']);
  if (!result.ok || !result.data) return [];
  const rows: RawPaperPosition[] = Array.isArray(result.data)
    ? result.data as RawPaperPosition[]
    : Array.isArray((result.data as { positions?: RawPaperPosition[] }).positions)
      ? (result.data as { positions: RawPaperPosition[] }).positions
      : [];
  return rows.map(r => ({
    symbol: normalizeSymbol(r.symbol),
    side: r.side ?? 'long',
    sizeTokens: r.size_tokens ?? r.size ?? 0,
    entryPrice: r.entry_price ?? 0,
    markPrice: r.mark_price ?? 0,
    unrealizedPnl: r.unrealized_pnl ?? 0,
    marginUsdc: r.margin_usdc ?? r.margin ?? 0,
    leverage: r.leverage ?? 0,
  }));
}

// ─── Trader snapshot ──────────────────────────────────────────────────────────

export async function getTraderSnapshot(symbol = 'SOL'): Promise<{
  markets: VulcanMarket[];
  ticker?: RawTicker;
  paperStatus?: PaperStatus | null;
  paperPositions?: PaperPosition[];
  source: 'live' | 'fallback';
}> {
  const sym = normalizeSymbol(symbol);
  const [marketData, tickerResult, paperStatus, paperPositions] = await Promise.all([
    loadVulcanMarkets(),
    runVulcanJson(['market', 'ticker', sym]),
    getPaperStatus(),
    getPaperPositions(),
  ]);
  return {
    markets: marketData.markets,
    ticker: tickerResult.data as RawTicker | undefined,
    paperStatus,
    paperPositions,
    source: tickerResult.ok ? 'live' : marketData.source,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fallbackMarkets(): VulcanMarket[] {
  return [
    { symbol: 'SOL', markPrice: 0, fundingRate: 0, openInterest: 0, volume24h: 0, change24h: 0, maxLeverage: 15, status: 'unknown' },
    { symbol: 'BTC', markPrice: 0, fundingRate: 0, openInterest: 0, volume24h: 0, change24h: 0, maxLeverage: 15, status: 'unknown' },
    { symbol: 'ETH', markPrice: 0, fundingRate: 0, openInterest: 0, volume24h: 0, change24h: 0, maxLeverage: 10, status: 'unknown' },
  ];
}
