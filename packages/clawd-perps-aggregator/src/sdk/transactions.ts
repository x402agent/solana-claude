/**
 * Transaction construction helpers.
 *
 * We don't build raw Solana transactions client-side — the venues / Imperial
 * router build them server-side and hand back a partially-signed base64 tx.
 * The helpers below convert SDK-level requests into the on-wire payload, then
 * call into the venue adapter to POST the build/submit endpoint.
 */

import type {
  BuildTxResult,
  OrderRequest,
  RoutePlan,
  Side,
  VenueId,
} from "../types.js";
import { ORDER_TYPE_CODE } from "../types.js";
import type { VenueAdapter } from "../venues/adapter.js";
import type { ImperialTransport } from "../venues/transport.js";

/** USD float → 6-decimal fixed point (1_000_000 = $1). */
export function usdToFixed(usd: number): number {
  return Math.round(usd * 1_000_000);
}

/** 6-decimal fixed point → USD float. */
export function fixedToUsd(fx: number): number {
  return fx / 1_000_000;
}

/** Oracle price scale used by Imperial: 1e9. */
export function priceToOracle(price: number): number {
  return Math.round(price * 1e9);
}

export interface BuildArgs {
  req: OrderRequest;
  route: RoutePlan;
  adapter: VenueAdapter;
  transport: ImperialTransport;
  defaultSlippageBps: number;
}

/**
 * Produce a base64 partially-signed transaction by:
 *   1. Routing the order (caller supplies the chosen leg).
 *   2. Asking the adapter for its on-wire payload.
 *   3. POSTing to the order build endpoint, which returns a base64 tx for the
 *      caller to sign and submit.
 *
 * Imperial's /mobile/orders endpoint already builds, signs (sponsor), and
 * broadcasts the tx — but it also returns the signature, so we treat its
 * response as "submitted" rather than build-only. For pure build-only flows
 * (build, sign client-side, then submit yourself), use /deposit/build-tx —
 * Imperial's existing surface is order-aware on submit only.
 *
 * This helper returns the payload + tx if available; for venues where the
 * router executes server-side, it falls back to returning the payload so the
 * caller can choose to submit via `submit()`.
 */
export async function buildOrderTx(args: BuildArgs): Promise<BuildTxResult> {
  const { req, route, adapter, defaultSlippageBps } = args;
  const venue: VenueId = route.legs[0].venue;
  const leg = route.legs[0];
  const sizeFixed = usdToFixed(leg.sizeUsd);
  const collateralFixed = usdToFixed(req.collateralUsd ?? leg.sizeUsd);
  const orderTypeCode = ORDER_TYPE_CODE[req.orderType ?? "market"];

  const payload = adapter.buildOrderPayload({
    wallet: req.wallet,
    profileIndex: req.profileIndex ?? 0,
    symbol: req.symbol,
    side: req.side,
    action: req.action,
    sizeUsdFixed: sizeFixed,
    collateralFixed,
    slippageBps: req.slippageBps ?? defaultSlippageBps,
    orderTypeCode,
    triggerPrice: req.triggerPrice != null ? priceToOracle(req.triggerPrice) : 0,
    triggerCondition: req.triggerCondition ?? 0,
  });

  // No build-only endpoint for orders today — Imperial /mobile/orders is
  // build-and-submit. We return the payload + the route, leaving the actual
  // submission to the explicit `submit` helper. Callers that want a true
  // sign-yourself flow should switch to a venue with a build-only path
  // (e.g., GMTrade direct) and override `buildOrderPayload`.
  return {
    transactionBase64: "",
    venue,
    route,
    payload,
  };
}

/** Build a deposit/withdraw tx; this surface is build-only and returns a real base64 tx. */
export async function buildDepositTx(
  transport: ImperialTransport,
  wallet: string,
  profileIndex: number,
  amountUsd: number,
  mode: "deposit" | "withdraw",
): Promise<string> {
  const res = await transport.buildDepositTx(wallet, profileIndex, usdToFixed(amountUsd), mode);
  return res.transaction;
}

export type { Side };
