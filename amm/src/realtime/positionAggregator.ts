import type { AggregatedPosition, Position } from "../types.js";

function riskFor(position: Position): number {
  if (!position.liquidationPrice || !position.markPrice) return 0;
  const distance = Math.abs(position.markPrice - position.liquidationPrice) / position.markPrice;
  return 1 - Math.min(distance, 1);
}

function riskBand(score: number): AggregatedPosition["liquidationRisk"] {
  if (score >= 0.85) return "critical";
  if (score >= 0.65) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export function aggregatePositions(positions: Position[]): AggregatedPosition[] {
  const bySymbol = new Map<string, Position[]>();
  for (const position of positions) {
    const list = bySymbol.get(position.symbol) ?? [];
    list.push(position);
    bySymbol.set(position.symbol, list);
  }

  return Array.from(bySymbol.entries()).map(([symbol, legs]) => {
    const grossUsd = legs.reduce((sum, leg) => sum + Math.abs(leg.sizeUsd), 0);
    const netUsd = legs.reduce((sum, leg) => sum + (leg.side === "long" ? leg.sizeUsd : -leg.sizeUsd), 0);
    const weightedEntryPrice = grossUsd
      ? legs.reduce((sum, leg) => sum + leg.entryPrice * Math.abs(leg.sizeUsd), 0) / grossUsd
      : 0;
    const weightedMarkPrice = grossUsd
      ? legs.reduce((sum, leg) => sum + leg.markPrice * Math.abs(leg.sizeUsd), 0) / grossUsd
      : 0;
    const collateralUsd = legs.reduce((sum, leg) => sum + leg.collateralUsd, 0);
    const risk = Math.max(...legs.map(riskFor), 0);

    return {
      symbol,
      netSide: Math.abs(netUsd) < 1 ? "flat" : netUsd > 0 ? "long" : "short",
      grossUsd,
      netUsd,
      weightedEntryPrice,
      weightedMarkPrice,
      unrealizedPnlUsd: legs.reduce((sum, leg) => sum + leg.unrealizedPnlUsd, 0),
      collateralUsd,
      effectiveLeverage: collateralUsd > 0 ? grossUsd / collateralUsd : 0,
      liquidationRisk: riskBand(risk),
      legs,
    };
  });
}
