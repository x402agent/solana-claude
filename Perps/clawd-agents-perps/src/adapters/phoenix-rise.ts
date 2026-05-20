import { loadPerpsRuntimeConfig, type PerpsRuntimeConfig } from "../config.js";
import { createPhoenixRiseAdapter } from "./phoenixRise.js";

export type OiTick = {
  ts: number;
  symbol: string;
  markPrice: number;
  indexPrice?: number;
  openInterestUsd: number;
  fundingRate?: number;
  bestBid?: number;
  bestAsk?: number;
  depthUsd?: number;
  longOiUsd?: number;
  shortOiUsd?: number;
};

export type ReadPhoenixOiTickArgs = {
  symbol: string;
  config?: PerpsRuntimeConfig;
  apiUrl?: string;
  rpcUrl?: string;
  mock?: boolean;
};

function normalizeSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  if (!upper) return "SOL-PERP";
  return upper.endsWith("-PERP") ? upper : `${upper}-PERP`;
}

function pickNumber(obj: unknown, paths: string[]): number | undefined {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (acc == null) return undefined;
      if (/^\d+$/.test(key) && Array.isArray(acc)) return acc[Number(key)];
      return (acc as Record<string, unknown>)[key];
    }, obj);
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return undefined;
}

function sumBookDepthUsd(book: unknown, side: "bids" | "asks", markPrice: number, levels = 10): number | undefined {
  const rows = (book as Record<string, unknown> | null)?.[side];
  if (!Array.isArray(rows)) return undefined;
  const depth = rows.slice(0, levels).reduce((sum, row) => {
    const price = pickNumber(row, ["price", "0"]);
    const size = pickNumber(row, ["size", "quantity", "qty", "baseSize", "1"]);
    return sum + (price ?? markPrice) * (size ?? 0);
  }, 0);
  return Number.isFinite(depth) && depth > 0 ? depth : undefined;
}

export function buildMockOiTick(symbol: string): OiTick {
  const normalized = normalizeSymbol(symbol);
  return {
    ts: Date.now(),
    symbol: normalized,
    markPrice: 184.22,
    indexPrice: 183.92,
    openInterestUsd: 18_340_291,
    fundingRate: 0.00022,
    bestBid: 184.16,
    bestAsk: 184.28,
    depthUsd: 325_000,
    longOiUsd: 9_880_000,
    shortOiUsd: 8_460_291,
  };
}

export async function readPhoenixOiTick(args: ReadPhoenixOiTickArgs): Promise<OiTick> {
  const symbol = normalizeSymbol(args.symbol);
  if (args.mock || process.env.CLAWD_PERPS_OI_MOCK === "true") {
    return buildMockOiTick(symbol);
  }

  const config = {
    ...loadPerpsRuntimeConfig(),
    ...args.config,
    ...(args.apiUrl ? { apiUrl: args.apiUrl } : {}),
    ...(args.rpcUrl ? { rpcUrl: args.rpcUrl } : {}),
  };
  const adapter = createPhoenixRiseAdapter(config);
  const baseSymbol = symbol.replace(/-PERP$/i, "");
  const [markets, ticker, orderbook] = await Promise.all([
    adapter.listMarkets(),
    adapter.getTicker(symbol),
    adapter.getOrderbook(symbol, 20),
  ]);

  const market =
    markets.find((item) => item.symbol.toUpperCase() === symbol || item.symbol.toUpperCase() === baseSymbol) ??
    markets.find((item) => item.symbol.toUpperCase().replace(/-PERP$/i, "") === baseSymbol);

  const bestBid = pickNumber(ticker, ["bestBid.price", "bid", "bids.0.price"]) ??
    pickNumber(orderbook, ["bids.0.price", "data.bids.0.price", "book.bids.0.price"]);
  const bestAsk = pickNumber(ticker, ["bestAsk.price", "ask", "asks.0.price"]) ??
    pickNumber(orderbook, ["asks.0.price", "data.asks.0.price", "book.asks.0.price"]);
  const markPrice =
    pickNumber(market, ["markPrice"]) ??
    pickNumber(ticker, ["markPrice", "mid", "lastPrice"]) ??
    (bestBid && bestAsk ? (bestBid + bestAsk) / 2 : undefined);
  const openInterestUsd =
    pickNumber(market, ["openInterest", "openInterestUsd"]) ??
    pickNumber(ticker, ["openInterest", "openInterestUsd"]);

  if (!markPrice || !openInterestUsd) {
    throw new Error("Phoenix market response did not include usable mark price or open interest.");
  }

  const bidDepth = sumBookDepthUsd(orderbook, "bids", markPrice);
  const askDepth = sumBookDepthUsd(orderbook, "asks", markPrice);

  return {
    ts: Date.now(),
    symbol,
    markPrice,
    indexPrice: pickNumber(market, ["spotPrice", "indexPrice", "oraclePrice"]),
    openInterestUsd,
    fundingRate: pickNumber(market, ["fundingRate"]) ?? pickNumber(ticker, ["fundingRate"]),
    bestBid,
    bestAsk,
    depthUsd: pickNumber(orderbook, ["depthUsd", "data.depthUsd", "stats.depthUsd"]) ??
      (bidDepth !== undefined && askDepth !== undefined ? Math.min(bidDepth, askDepth) : undefined),
    longOiUsd: pickNumber(market, ["longOiUsd", "longOpenInterestUsd"]),
    shortOiUsd: pickNumber(market, ["shortOiUsd", "shortOpenInterestUsd"]),
  };
}
