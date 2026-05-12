import {
  addAgentMessage,
  addLog,
  type CandlePoint,
  type DashboardState,
  type FeedItem,
  type HeatCell,
  type OrderBookLevel,
  type TradeSignal,
  type TrendingToken,
} from './state.js';

interface CoinGeckoPrice {
  solana: { usd: number; usd_24h_change: number };
}

interface SolanaTrackerToken {
  symbol?: string;
  change24h?: number;
  priceChange24h?: number;
  volume24h?: number;
  volume?: number;
  price?: number;
  token?: { symbol?: string };
}

interface SolanaTrackerResponse {
  tokens?: SolanaTrackerToken[];
  data?: SolanaTrackerToken[];
}

function rand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pctSide(score: number): TradeSignal['side'] {
  if (score >= 65) return 'buy';
  if (score <= 35) return 'sell';
  return 'pass';
}

function buildSyntheticCandles(price: number, change24h: number, count = 36): CandlePoint[] {
  const candles: CandlePoint[] = [];
  let last = Math.max(1, price * (1 - change24h / 100 / 3));
  for (let i = 0; i < count; i++) {
    const drift = (change24h / 100) * 0.18 + (rand(i + price) - 0.5) * 1.4;
    const o = last;
    const c = Math.max(1, o + drift);
    const h = Math.max(o, c) + rand(i + 11) * 0.8;
    const l = Math.min(o, c) - rand(i + 17) * 0.8;
    const v = 1000 + rand(i + 23) * 4000;
    candles.push({ t: Date.now() - (count - i) * 60_000, o, h, l, c, v });
    last = c;
  }
  if (candles.length) {
    const lastCandle = candles[candles.length - 1]!;
    const scale = price / lastCandle.c;
    for (const candle of candles) {
      candle.o *= scale;
      candle.h *= scale;
      candle.l *= scale;
      candle.c *= scale;
    }
  }
  return candles;
}

function buildOrderBook(price: number): OrderBookLevel[] {
  const rows: OrderBookLevel[] = [];
  for (let i = 4; i >= 0; i--) {
    rows.push({
      side: 'ask',
      price: price + 0.04 + i * 0.01,
      size: 150 + rand(i + price) * 900,
    });
  }
  for (let i = 0; i < 5; i++) {
    rows.push({
      side: 'bid',
      price: price - 0.01 - i * 0.01,
      size: 150 + rand(i + price + 99) * 900,
    });
  }
  return rows;
}

function buildHeatmap(tokens: TrendingToken[]): HeatCell[] {
  return tokens.slice(0, 6).map((token) => ({
    label: token.symbol.slice(0, 4),
    change: token.change,
  }));
}

function buildFeed(state: DashboardState): FeedItem[] {
  const top = state.topMovers[0];
  return [
    {
      icon: '🐋',
      text: `${(1200 + state.cycleCount * 37).toLocaleString()} SOL routed through dark pool`,
      tone: 'whale',
      ts: Date.now(),
    },
    {
      icon: '📈',
      text: `SOL crossed $${state.solPrice.toFixed(2)} with ${state.network.tps.toFixed(0)} TPS`,
      tone: state.solChange24h >= 0 ? 'bull' : 'bear',
      ts: Date.now(),
    },
    {
      icon: '⚡',
      text: top ? `${top.symbol} divergence at ${top.change >= 0 ? '+' : ''}${top.change.toFixed(1)}%` : 'No divergence signal',
      tone: 'neutral',
      ts: Date.now(),
    },
    {
      icon: '🤖',
      text: `${state.activeModel} marked ${state.lastSignal?.symbol ?? 'SOL'} as ${state.lastSignal?.side ?? 'pass'}`,
      tone: 'neutral',
      ts: Date.now(),
    },
  ];
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
  const r = await fetch('https://data.solanatracker.io/tokens/trending?limit=12', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = (await r.json()) as SolanaTrackerResponse;
  const tokens = d.tokens ?? d.data ?? [];
  return tokens.slice(0, 12).map((t) => ({
    symbol: (t.symbol ?? t.token?.symbol ?? '???').toUpperCase().slice(0, 10),
    change: t.change24h ?? t.priceChange24h ?? 0,
    volume24h: t.volume24h ?? t.volume,
    price: t.price,
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
      side: pctSide(score),
      timestamp: Date.now(),
    };
  }).sort((a, b) => b.score - a.score);
}

function applyFallback(state: DashboardState): void {
  state.solPrice = 150.25;
  state.solChange24h = 2.34;
  state.trending = [
    { symbol: 'BONK', change: 15.3, volume24h: 2200000, price: 0.00002345 },
    { symbol: 'WIF', change: 12.5, volume24h: 1800000, price: 2.85 },
    { symbol: 'JUP', change: 3.8, volume24h: 1100000, price: 1.13 },
    { symbol: 'PYTH', change: -1.5, volume24h: 780000, price: 0.54 },
    { symbol: 'MNGO', change: -12.5, volume24h: 440000, price: 0.023 },
    { symbol: 'MEW', change: 8.3, volume24h: 950000, price: 0.007 },
  ];
}

export async function fetchMarketData(state: DashboardState): Promise<void> {
  state.oodaPhase = 'observe';
  addLog(state, 'OBSERVE', 'Refreshing MAWD market surface', 'info');

  const results = await Promise.allSettled([fetchSolPrice(), fetchTrending()]);

  if (results[0].status === 'fulfilled') {
    state.solPrice = results[0].value.usd;
    state.solChange24h = results[0].value.change;
  }
  if (results[1].status === 'fulfilled') {
    state.trending = results[1].value;
  }
  if (state.solPrice <= 0 || state.trending.length === 0) {
    applyFallback(state);
  }

  state.oodaPhase = 'orient';
  state.tickerTape = [
    { symbol: 'SOL', change: state.solChange24h, price: state.solPrice },
    ...state.trending.slice(0, 4),
  ];
  state.candles = buildSyntheticCandles(state.solPrice, state.solChange24h);
  state.orderBook = buildOrderBook(state.solPrice);
  state.heatmap = buildHeatmap(state.trending);
  state.topMovers = [...state.trending]
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 5);
  state.network = {
    tps: 2345 + rand(state.cycleCount + 31) * 900,
    slot: 319000000 + state.cycleCount * 12,
    pingMs: 48 + rand(state.cycleCount + 41) * 35,
    validators: 1888,
  };

  const scored = scoreTrending(state);
  const best = scored[0] ?? null;
  state.lastSignal = best && best.score >= 65 ? best : null;
  state.paperPnl = Math.round(((state.paperPnl + state.solChange24h * 23.4) + Number.EPSILON) * 100) / 100;
  state.totalTrades = Math.max(state.totalTrades, state.cycleCount + (state.lastSignal ? 1 : 0));
  state.winRate = state.totalTrades > 0 ? Math.min(0.92, 0.48 + state.cycleCount * 0.02) : 0;
  state.wallet.solBalance = 24.6;
  state.wallet.totalValueUsd = state.wallet.solBalance * state.solPrice + 2840;
  state.wallet.dailyPnlUsd = state.solChange24h * 41.5;
  state.wallet.positions = [
    { symbol: 'SOL', valueUsd: state.wallet.solBalance * state.solPrice, change24h: state.solChange24h, allocation: 0.62 },
    { symbol: 'JUP', valueUsd: 980, change24h: 3.8, allocation: 0.16 },
    { symbol: 'BONK', valueUsd: 640, change24h: 15.3, allocation: 0.11 },
    { symbol: '$CLAWD', valueUsd: 420, change24h: 6.4, allocation: 0.11 },
  ];

  state.oodaPhase = 'decide';
  if (state.lastSignal) {
    addLog(state, 'DECIDE', `${state.lastSignal.symbol} ${state.lastSignal.side} score ${state.lastSignal.score}`, 'trade');
    addAgentMessage(
      state,
      'agent',
      `Momentum intact on ${state.lastSignal.symbol}; sizing ${state.lastSignal.size} in paper mode.`,
    );
  } else {
    addLog(state, 'DECIDE', 'No trade: top signal below threshold', 'info');
  }

  state.oodaPhase = 'act';
  state.liveFeed = buildFeed(state);
  addLog(state, 'ACT', 'Execution remains paper-only and devnet-gated', 'warn');

  state.oodaPhase = 'learn';
  state.memory.known += state.trending.length;
  state.memory.learned = Math.min(state.memory.learned + 1, 999);
  state.memory.inferred += state.lastSignal ? 1 : 0;
  state.cycleCount += 1;
  state.lastRefresh = Date.now();
  addLog(state, 'LEARN', `Cycle ${state.cycleCount} journalled`, 'info');
  if (state.agentMessages.length === 0) {
    addAgentMessage(state, 'system', 'MAWD online. Use 1-5, Tab, /commands, R, H, Q.');
  }
  state.oodaPhase = 'idle';
}
