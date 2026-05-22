import { ImperialTransport } from "./transport.js";
import { BaseImperialVenueAdapter, PhoenixVenueAdapter } from "./base.js";
import { TwammVenueAdapter } from "./twamm.js";
import type { VenueAdapter, VenueDefaults } from "./adapter.js";
import type { AggregatorConfig, VenueName } from "../types.js";

const DEFAULTS: Record<Exclude<VenueName, "twamm">, VenueDefaults> = {
  phoenix: {
    venue: "phoenix",
    feeBps: 4,
    maxLeverage: 10,
    defaultLiquidityUsd: 3_000_000,
    defaultOpenInterestUsd: 30_000_000,
    impactCoefficientBps: 40,
    markets: ["SOL-PERP", "BTC-PERP", "ETH-PERP"],
  },
  flash: {
    venue: "flash",
    feeBps: 6,
    maxLeverage: 20,
    defaultLiquidityUsd: 8_000_000,
    defaultOpenInterestUsd: 55_000_000,
    impactCoefficientBps: 30,
    markets: ["SOL-PERP", "BTC-PERP", "ETH-PERP"],
  },
  jupiter: {
    venue: "jupiter",
    feeBps: 5,
    maxLeverage: 50,
    defaultLiquidityUsd: 12_000_000,
    defaultOpenInterestUsd: 75_000_000,
    impactCoefficientBps: 22,
    markets: ["SOL-PERP", "BTC-PERP", "ETH-PERP"],
  },
  gmtrade: {
    venue: "gmtrade",
    feeBps: 8,
    maxLeverage: 30,
    defaultLiquidityUsd: 5_000_000,
    defaultOpenInterestUsd: 35_000_000,
    impactCoefficientBps: 36,
    markets: ["SOL-PERP", "BTC-PERP", "ETH-PERP"],
  },
};

export function createVenueAdapters(config: AggregatorConfig): VenueAdapter[] {
  const transport = new ImperialTransport({
    base: config.imperialApiBase,
    jwt: config.imperialJwt,
  });

  return config.safety.allowedVenues.map((venue) => {
    if (venue === "twamm") return new TwammVenueAdapter(transport);
    if (venue === "phoenix") return new PhoenixVenueAdapter(DEFAULTS[venue], transport);
    return new BaseImperialVenueAdapter(DEFAULTS[venue as Exclude<VenueName, "twamm">], transport);
  });
}

export { TwammVenueAdapter };
