/**
 * TWAMM adapter — time-weighted execution via on-chain permissionless crank.
 *
 * TWAMM is not an immediate-fill perps venue. It schedules a large order as
 * time-weighted slices executed permissionlessly by a crank runner. The key
 * trade-off is near-zero price impact on large size in exchange for deferred
 * fill and crank latency.
 *
 * In the SOR, TWAMM is preferred when:
 *   - sizeUsd exceeds a configurable impact threshold (default: $50k notional)
 *   - the user has explicitly requested low-impact / scheduled execution
 *
 * The slippage model returns ~0 bps for expected price since the fill tracks
 * the time-weighted oracle price. The `fillable` flag is always true for
 * supported token pairs. Orders are tagged with `executionNote` to surface
 * the deferred-fill caveat to the caller.
 */

import { BaseVenueAdapter, type VenueDefaults } from "./base.js";
import type { VenueId } from "../types.js";
import { TWAMM_EXECUTION_NOTE } from "../types.js";
import type { QuoteContext } from "./adapter.js";
import type { VenueQuote } from "../types.js";

export const TWAMM_DEFAULT_SUPPORTED_PAIRS: ReadonlySet<string> = new Set([
  "SOL",
  "BTC",
  "ETH",
  "USDC",
  "USDT",
]);

export class TwammAdapter extends BaseVenueAdapter {
  readonly id: VenueId = "twamm";
  readonly label = "TWAMM";

  readonly defaults: VenueDefaults = {
    // No maker/taker fees — TWAMM charges a small protocol fee modelled here.
    makerFeeBps: 0,
    takerFeeBps: 1,
    maxLeverage: 1,
    minOrderUsd: 100,
    // Slippage is near-zero: orders fill at time-weighted oracle price.
    impactCoeff: 0.000_01,
    fallbackLiquidityUsd: 50_000_000,
    markSource: "twamm-oracle",
  };

  /** TWAMM routes on-chain; no Imperial API book is available. */
  override hasBook(): boolean {
    return false;
  }

  /** Override quote to model deferred time-weighted execution. */
  override async quote(ctx: QuoteContext): Promise<VenueQuote> {
    const base = await super.quote(ctx);
    return {
      ...base,
      venue: this.id,
      // TWAMM fills track the oracle TWAP, so expected price ≈ mark with near-zero slippage.
      slippageBps: Math.min(base.slippageBps, 2),
      reason: base.reason ?? TWAMM_EXECUTION_NOTE,
      fillable: true,
    };
  }
}
