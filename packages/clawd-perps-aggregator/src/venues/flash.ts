/**
 * Flash Trade adapter — Solana perps via Flash pools.
 *
 * Flash is pool-backed (no CLOB), so we use the AMM impact model with
 * tuned coefficients. Fees and leverage caps come from Flash's documented
 * market parameters.
 */

import { BaseVenueAdapter, type VenueDefaults } from "./base.js";
import type { VenueId } from "../types.js";

export class FlashAdapter extends BaseVenueAdapter {
  readonly id: VenueId = "flash";
  readonly label = "Flash Trade";

  readonly defaults: VenueDefaults = {
    // Flash charges higher taker fees than Phoenix but pays borrow rebates
    // to LPs; we model the full cost via takerFeeBps + funding/borrow.
    makerFeeBps: 0,
    takerFeeBps: 8,
    maxLeverage: 100,
    minOrderUsd: 10,
    impactCoeff: 0.0008,
    fallbackLiquidityUsd: 8_000_000,
    markSource: "flash-pool-oracle",
  };
}
