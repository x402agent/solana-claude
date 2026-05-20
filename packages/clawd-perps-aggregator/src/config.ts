/**
 * Aggregator configuration. Mirrors the Imperial env contract so existing
 * operators don't need to re-learn variables.
 */

import type { VenueId } from "./types.js";
import { VENUE_IDS } from "./types.js";

export interface AggregatorConfig {
  /** Imperial API base, e.g. https://api.imperial.space/api/v1 */
  imperialBase: string;
  /** Pre-issued Imperial JWT, or empty string to skip auth-only endpoints. */
  jwt: string;
  /** Operator wallet pubkey (base58). */
  wallet: string;
  /** Imperial profile index 0..5. */
  profileIndex: number;
  /** Live submission enabled. Paper-first by default. */
  live: boolean;
  /** Hard cap per order in USD. */
  maxSizeUsd: number;
  /** Symbol allowlist. */
  allowedSymbols: string[];
  /** Default slippage in basis points. */
  slippageBps: number;
  /** Default hold horizon for funding-aware quotes, seconds. */
  defaultHoldSeconds: number;
  /** Venues enabled for routing. */
  enabledVenues: VenueId[];
  /** When true, all SDK execute calls are short-circuited to a paper response. */
  paperMode: boolean;
}

export const DEFAULT_IMPERIAL_BASE = "https://api.imperial.space/api/v1";

export function loadAggregatorConfig(
  env: NodeJS.ProcessEnv = process.env,
): AggregatorConfig {
  const enabled = (env.PERPS_AGG_VENUES ?? VENUE_IDS.join(","))
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is VenueId => VENUE_IDS.includes(s as VenueId));

  return {
    imperialBase: env.IMPERIAL_API_BASE ?? DEFAULT_IMPERIAL_BASE,
    jwt: env.IMPERIAL_JWT ?? "",
    wallet: env.IMPERIAL_WALLET ?? "",
    profileIndex: Number(env.IMPERIAL_PROFILE_INDEX ?? 0),
    live: env.IMPERIAL_LIVE === "true",
    maxSizeUsd: Number(env.IMPERIAL_MAX_SIZE_USD ?? 100),
    allowedSymbols: (env.IMPERIAL_ALLOWED_SYMS ?? "SOL,ETH,BTC")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
    slippageBps: Number(env.IMPERIAL_SLIPPAGE_BPS ?? 50),
    defaultHoldSeconds: Number(env.PERPS_AGG_HOLD_SECONDS ?? 3600),
    enabledVenues: enabled.length > 0 ? enabled : [...VENUE_IDS],
    paperMode: env.PERPS_AGG_PAPER === "true" || env.IMPERIAL_LIVE !== "true",
  };
}

export function mergeConfig(
  base: AggregatorConfig,
  override?: Partial<AggregatorConfig>,
): AggregatorConfig {
  if (!override) return base;
  return { ...base, ...override };
}
