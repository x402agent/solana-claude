/**
 * TWAMM venue adapter for the OpenClawd AMM aggregator.
 *
 * TWAMM routes large orders through an on-chain permissionless crank program.
 * Orders fill at the time-weighted oracle price, eliminating market-impact
 * slippage at the cost of deferred fills.
 *
 * Select this venue when sizeUsd is large or TWAP-style execution is preferred.
 */

import { BaseImperialVenueAdapter } from "./base.js";
import { ImperialTransport } from "./transport.js";
import type { VenueDefaults } from "./adapter.js";
import type { QuoteRequest, VenueQuote } from "../types.js";

const TWAMM_DEFAULTS: VenueDefaults = {
  venue: "twamm",
  feeBps: 1,
  maxLeverage: 1,
  defaultLiquidityUsd: 50_000_000,
  defaultOpenInterestUsd: 0,
  impactCoefficientBps: 1,
  markets: ["SOL-PERP", "BTC-PERP", "ETH-PERP"],
};

const TWAMM_NOTE =
  "TWAMM executes as time-weighted on-chain slices via permissionless crank. Orders are not immediate fills.";

export class TwammVenueAdapter extends BaseImperialVenueAdapter {
  constructor(transport: ImperialTransport) {
    super(TWAMM_DEFAULTS, transport);
  }

  override async quote(request: QuoteRequest): Promise<VenueQuote> {
    const base = await super.quote(request);
    return {
      ...base,
      venue: "twamm",
      // Slippage near-zero: fills track time-weighted oracle price.
      estimatedSlippageBps: Math.min(base.estimatedSlippageBps, 2),
      warnings: [TWAMM_NOTE, ...base.warnings],
    };
  }
}
