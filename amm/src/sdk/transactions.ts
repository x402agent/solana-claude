import type { BuiltOrderTx, OrderBuildRequest, RoutePlan, SimulatedOrder } from "../types.js";

export function orderPayloadFromRoute(route: RoutePlan, request: OrderBuildRequest): Record<string, unknown> {
  const first = route.legs[0];
  if (!first) throw new Error("Route has no legs");
  return {
    wallet: request.wallet,
    profileIndex: request.profileIndex ?? 0,
    symbol: route.symbol,
    side: route.side === "long" ? 0 : 1,
    notionalUsd: route.notionalUsd,
    leverage: request.leverage ?? 1,
    venue: first.venue,
    routeId: route.id,
    reduceOnly: request.reduceOnly ?? false,
    orderKind: request.orderKind ?? "market",
    limitPrice: request.limitPrice,
    clientOrderId: request.clientOrderId,
    split: route.mode === "split"
      ? route.legs.map((leg) => ({ venue: leg.venue, notionalUsd: leg.notionalUsd }))
      : undefined,
  };
}

export function paperBuiltOrder(route: RoutePlan, request: OrderBuildRequest): BuiltOrderTx {
  return {
    route,
    transaction: null,
    payload: orderPayloadFromRoute(route, request),
    paper: true,
  };
}

export function simulateBuiltOrder(route: RoutePlan, request: OrderBuildRequest): SimulatedOrder {
  const leverage = request.leverage ?? 1;
  const marginRequiredUsd = route.notionalUsd / Math.max(leverage, 1);
  const warnings = [...route.warnings];
  if (route.estimatedSlippageBps > 75) warnings.push("high estimated slippage");
  if (leverage > 10) warnings.push("high leverage");

  return {
    route,
    accepted: warnings.length === 0 || route.notionalUsd <= 5000,
    paper: true,
    marginRequiredUsd,
    maxLossUsd: marginRequiredUsd,
    warnings,
  };
}
