import type { QuoteRequest, VenueQuote } from "../types.js";

export interface QuoteScore {
  quote: VenueQuote;
  score: number;
  components: {
    cost: number;
    liquidity: number;
    openInterest: number;
    funding: number;
    confidence: number;
  };
}

const WEIGHTS = {
  cost: 0.55,
  liquidity: 0.2,
  openInterest: 0.1,
  funding: 0.1,
  confidence: 0.05,
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizeCost(quote: VenueQuote): number {
  const feeBps = (quote.estimatedFeeUsd / quote.notionalUsd) * 10_000;
  const allInBps = feeBps + quote.estimatedSlippageBps;
  return clamp(100 - allInBps * 3);
}

function normalizeLiquidity(quote: VenueQuote): number {
  const ratio = quote.liquidityUsd / Math.max(quote.notionalUsd, 1);
  return clamp(Math.log10(Math.max(ratio, 1)) * 35);
}

function normalizeOpenInterest(quote: VenueQuote): number {
  return clamp(Math.log10(Math.max(quote.openInterestUsd / 100_000, 1)) * 25);
}

function normalizeFunding(request: QuoteRequest, quote: VenueQuote): number {
  const rate = quote.fundingRateHourlyPct;
  const favorable = request.side === "long" ? -rate : rate;
  return clamp(60 + favorable * 2000);
}

export function scoreQuote(request: QuoteRequest, quote: VenueQuote): QuoteScore {
  const components = {
    cost: normalizeCost(quote),
    liquidity: normalizeLiquidity(quote),
    openInterest: normalizeOpenInterest(quote),
    funding: normalizeFunding(request, quote),
    confidence: clamp(quote.confidence * 100),
  };

  const score =
    components.cost * WEIGHTS.cost +
    components.liquidity * WEIGHTS.liquidity +
    components.openInterest * WEIGHTS.openInterest +
    components.funding * WEIGHTS.funding +
    components.confidence * WEIGHTS.confidence;

  return { quote, score: clamp(score), components };
}

export function rankQuotes(request: QuoteRequest, quotes: VenueQuote[]): QuoteScore[] {
  return quotes
    .map((quote) => scoreQuote(request, quote))
    .sort((a, b) => b.score - a.score);
}
