import type { AggregatorConfig, VenueName } from "./types.js";

const DEFAULT_BASE = "https://api.imperial.space/api/v1";
const DEFAULT_VENUES: VenueName[] = ["phoenix", "flash", "jupiter", "gmtrade"];

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function venueList(value: string | undefined): VenueName[] {
  const allowed = new Set(DEFAULT_VENUES);
  const parsed = list(value).filter((item): item is VenueName => allowed.has(item as VenueName));
  return parsed.length ? parsed : DEFAULT_VENUES;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AggregatorConfig {
  return {
    imperialApiBase: env.IMPERIAL_API_BASE ?? env.IMPERIAL_BASE_URL ?? DEFAULT_BASE,
    imperialJwt: env.IMPERIAL_JWT ?? env.IMPERIAL_API_KEY,
    safety: {
      paper: bool(env.CLAWD_AMM_PAPER, true),
      live: bool(env.CLAWD_AMM_LIVE, false),
      maxNotionalUsd: Number(env.CLAWD_AMM_MAX_NOTIONAL_USD ?? 5000),
      allowedSymbols: list(env.CLAWD_AMM_ALLOWED_SYMBOLS),
      allowedVenues: venueList(env.CLAWD_AMM_ALLOWED_VENUES),
    },
  };
}

export function assertSafeNotional(config: AggregatorConfig, symbol: string, notionalUsd: number): void {
  if (!Number.isFinite(notionalUsd) || notionalUsd <= 0) {
    throw new Error(`Invalid notionalUsd: ${notionalUsd}`);
  }
  if (notionalUsd > config.safety.maxNotionalUsd) {
    throw new Error(`Order notional ${notionalUsd} exceeds cap ${config.safety.maxNotionalUsd}`);
  }
  if (config.safety.allowedSymbols.length && !config.safety.allowedSymbols.includes(symbol)) {
    throw new Error(`Symbol ${symbol} is not in CLAWD_AMM_ALLOWED_SYMBOLS`);
  }
}

export function assertLiveEnabled(config: AggregatorConfig): void {
  if (!config.safety.live || config.safety.paper) {
    throw new Error("Live execution is disabled. Set CLAWD_AMM_LIVE=true and CLAWD_AMM_PAPER=false.");
  }
}
