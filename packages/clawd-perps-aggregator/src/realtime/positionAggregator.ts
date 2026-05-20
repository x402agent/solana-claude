/**
 * Cross-protocol position aggregator.
 *
 * Fetches positions via the Imperial /positions endpoint (which already
 * returns positions across all four venues) and normalises them into the
 * aggregator's `Position` type. Computes totals + liquidation risk views.
 */

import type { ImperialTransport } from "../venues/transport.js";
import type { RawPosition } from "../venues/transport.js";
import type {
  AggregatedPositions,
  LiquidationRisk,
  Position,
  Side,
  VenueId,
} from "../types.js";
import { VENUE_FROM_UNDERWRITER, VENUE_IDS } from "../types.js";

function normaliseVenue(raw: RawPosition): VenueId | null {
  if (raw.venue) {
    const lc = raw.venue.toLowerCase() as VenueId;
    if (VENUE_IDS.includes(lc)) return lc;
  }
  if (typeof raw.underwriter === "number") {
    const v = VENUE_FROM_UNDERWRITER[raw.underwriter];
    if (v) return v;
  }
  return null;
}

function toPosition(raw: RawPosition): Position | null {
  const venue = normaliseVenue(raw);
  if (!venue) return null;
  const side: Side = raw.side === 0 ? "long" : "short";
  // Convert from Imperial 6-decimal fixed point to USD floats.
  const sizeUsd = raw.sizeUsd > 1_000 ? raw.sizeUsd / 1_000_000 : raw.sizeUsd;
  const collateralUsd =
    (raw.collateralUsd ?? 0) > 1_000 ? (raw.collateralUsd ?? 0) / 1_000_000 : raw.collateralUsd ?? 0;
  const leverage = raw.leverage ?? (collateralUsd > 0 ? sizeUsd / collateralUsd : 0);
  return {
    wallet: raw.wallet,
    profileIndex: raw.profileIndex,
    venue,
    symbol: raw.symbol.toUpperCase(),
    side,
    sizeUsd,
    entryPrice: raw.entryPrice,
    markPrice: raw.markPrice ?? null,
    unrealizedPnlUsd: raw.unrealizedPnlUsd ?? null,
    collateralUsd,
    leverage,
    liquidationPrice: raw.liquidationPrice ?? null,
    fundingAccruedUsd: raw.fundingAccruedUsd ?? null,
  };
}

export async function fetchAggregatedPositions(
  transport: ImperialTransport,
  wallet: string,
): Promise<AggregatedPositions> {
  const raw = await transport.getPositions(wallet);
  const positions = raw
    .map(toPosition)
    .filter((p): p is Position => p !== null);

  const totals = {
    grossNotionalUsd: 0,
    netNotionalUsd: 0,
    collateralUsd: 0,
    unrealizedPnlUsd: 0,
    bySymbol: {} as Record<string, number>,
  };
  for (const p of positions) {
    const signedUsd = p.side === "long" ? p.sizeUsd : -p.sizeUsd;
    totals.grossNotionalUsd += p.sizeUsd;
    totals.netNotionalUsd += signedUsd;
    totals.collateralUsd += p.collateralUsd;
    totals.unrealizedPnlUsd += p.unrealizedPnlUsd ?? 0;
    totals.bySymbol[p.symbol] = (totals.bySymbol[p.symbol] ?? 0) + signedUsd;
  }

  return { wallet, positions, totals };
}

export function computeLiquidationRisks(positions: Position[]): LiquidationRisk[] {
  const out: LiquidationRisk[] = [];
  for (const p of positions) {
    if (p.markPrice == null || p.liquidationPrice == null || p.liquidationPrice <= 0) continue;
    // For longs: liq below mark, danger when mark drops toward liq.
    // For shorts: liq above mark, danger when mark rises toward liq.
    const distance =
      p.side === "long" ? (p.markPrice - p.liquidationPrice) / p.markPrice : (p.liquidationPrice - p.markPrice) / p.markPrice;
    const distanceBps = distance * 10_000;
    const risk: LiquidationRisk["risk"] =
      distanceBps > 2_000 ? "low" : distanceBps > 800 ? "medium" : distanceBps > 200 ? "high" : "critical";
    out.push({
      symbol: p.symbol,
      venue: p.venue,
      side: p.side,
      sizeUsd: p.sizeUsd,
      entryPrice: p.entryPrice,
      markPrice: p.markPrice,
      liquidationPrice: p.liquidationPrice,
      distanceBps,
      risk,
    });
  }
  return out.sort((a, b) => a.distanceBps - b.distanceBps);
}
