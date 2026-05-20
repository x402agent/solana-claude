/**
 * Jupiter adapter — Jupiter Perps (JLP-backed).
 *
 * Pool-backed; large depth on majors (SOL/ETH/BTC). The impact model is
 * generous because Jupiter's JLP pool typically carries 8-figure liquidity.
 */

import { BaseVenueAdapter, type VenueDefaults } from "./base.js";
import type { VenueId } from "../types.js";

export class JupiterAdapter extends BaseVenueAdapter {
  readonly id: VenueId = "jupiter";
  readonly label = "Jupiter Perps";

  readonly defaults: VenueDefaults = {
    makerFeeBps: 0,
    takerFeeBps: 6,
    maxLeverage: 100,
    minOrderUsd: 10,
    impactCoeff: 0.0005,
    fallbackLiquidityUsd: 50_000_000,
    markSource: "pyth-oracle",
  };
}
