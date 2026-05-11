/**
 * HERMES x402 TUI — Market Data Fetcher
 *
 * Pulls live SOL price + trending tokens from public APIs.
 * No API key required for basic data.
 */

import { addLog, type DashboardState, type TrendingToken, type TradeSignal } from './state.js';

interface CoinGeckoPrice {
  solana: { usd: number; usd_24h_change: number };
}

interface SolanaTrackerToken {
  symbol?: string;
  change24h?: number;
  priceChange24h?: number;
  volume24h?: number;
  volume?: number;
  token?: { symbol?: string };
}

interface SolanaTrackerResponse {
  tokens?: SolanaTrackerToken[];
  data?: SolanaTrackerToken[];
}

export async function fetchMarketData(state: DashboardState): Promise<void> {
  state.oodaPhase = 'observe';
  addLog(state, 'OBSERVE', 'Fetching SOL price + trending tokens…', 'info');

  const results = await Promise.allSettled([
    fetchSolPrice(),
    fetchTrending(),
  ]);

  if (results[0].status === 'fulfilled') {
    const price = results[0].value;
    state.solPrice = price.usd;
    state.solChange24h = price.change;
    addLog(state, 'OBSERVE', `SOL $${price.usd.toFixed(2)} (${price.change > 0 ? '+' : ''}${price.change.toFixed(2)}%)`, 'info');
  } else {
    addLog(state, 'OBSERVE', `CoinGecko unavailable — ${String(results[0].reason).slice(0, 60)}`, 'warn');
  }

  if (results[1].status === 'fulfilled') {
    state.trending = results[1].value;
    addLog(state, 'OBSERVE', `Trending: ${state.trending.slice(0, 3).map(t => t.symbol).join(', ')}`, 'info');
  } else {
    addLog(state, 'OBSERVE', 'Trending data unavailable', 'warn');
  }

  // ORIENT — score tokens
  state.oodaPhase = 'orient';
  const scored = scoreTrending(state);
  addLog(state, 'ORIENT', `Scored ${scored.length} tokens`, 'info');
  for (const s of scored.slice(0, 3)) {
    addLog(state, 'ORIENT', `${s.symbol}: ${s.score}/100 → ${s.side.toUpperCase()} ${s.size}`, 'trade');
  }

  // DECIDE
  state.oodaPhase = 'decide';
  const best = scored[0] ?? null;
  if (best && best.score >= 65) {
    state.lastSignal = best;
    addLog(state, 'DECIDE', `Signal: ${best.symbol} score=${best.score} size=${best.size} — awaiting approval`, 'trade');
  } else {
    addLog(state, 'DECIDE', `PASS — top score ${best?.score ?? 0}/100 below threshold 65`, 'info');
    state.lastSignal = null;
  }

  // ACT — gated
  state.oodaPhase = 'act';
  addLog(state, 'ACT', 'Trade execution gated — deny-first permission engine engaged', 'warn');

  // LEARN
  state.oodaPhase = 'learn';
  state.memory.known += state.trending.length;
  state.memory.learned = Math.min(state.memory.learned + 1, 999);
  if (best) state.memory.inferred += 1;
  state.cycleCount += 1;

  addLog(state, 'LEARN', `Cycle #${state.cycleCount} complete. Memory K:${state.memory.known} L:${state.memory.learned} I:${state.memory.inferred}`, 'info');

  state.oodaPhase = 'idle';
  state.lastRefresh = Date.now();
}

async function fetchSolPrice(): Promise<{ usd: number; change: number }> {
  const r = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true',
    { signal: AbortSignal.timeout(8000) },
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = (await r.json()) as CoinGeckoPrice;
  return { usd: d.solana.usd, change: d.solana.usd_24h_change };
}

async function fetchTrending(): Promise<TrendingToken[]> {
  const r = await fetch(
    'https://data.solanatracker.io/tokens/trending?limit=8',
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = (await r.json()) as SolanaTrackerResponse;
  const tokens = d.tokens ?? d.data ?? [];
  return tokens.slice(0, 8).map((t) => ({
    symbol: (t.symbol ?? t.token?.symbol ?? '???').toUpperCase().slice(0, 10),
    change: t.change24h ?? t.priceChange24h ?? 0,
    volume24h: t.volume24h ?? t.volume,
  }));
}

function scoreTrending(state: DashboardState): TradeSignal[] {
  return state.trending.map((t) => {
    let score = 50;
    if (t.change > 10) score += 20;
    else if (t.change > 5) score += 10;
    else if (t.change < -5) score -= 10;
    if ((t.volume24h ?? 0) > 1_000_000) score += 15;
    if (state.solChange24h > 0) score += 5;
    else score -= 5;
    score = Math.max(0, Math.min(100, score));

    let size = '0.5x';
    if (score >= 90) size = '1.5x';
    else if (score >= 80) size = '1.25x';
    else if (score >= 70) size = '1.0x';

    return {
      symbol: t.symbol,
      score,
      size,
      side: score >= 65 ? 'buy' : score <= 35 ? 'sell' : 'pass',
      timestamp: Date.now(),
    } satisfies TradeSignal;
  }).sort((a, b) => b.score - a.score);
}
