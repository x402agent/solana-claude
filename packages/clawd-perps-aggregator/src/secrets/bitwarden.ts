/**
 * Bitwarden Secrets Manager — runtime hydrator for the perps aggregator.
 *
 * The canonical, zero-dependency implementation lives in
 * `@openclawdsolana/clawd-secrets`. We re-export it here so the aggregator's
 * public API (`hydrateSecretsFromBitwarden`) stays stable and its entrypoints
 * (CLI + standalone MCP bin) can self-hydrate from Bitwarden even when not
 * launched through a `bws run` wrapper.
 *
 * Rules (from the canonical implementation):
 *   - No-op unless BWS_ACCESS_TOKEN is set and SOLANA_CLAWD_BWS !== "0".
 *   - No-op if the `bws` CLI is not on PATH.
 *   - Existing env vars always win (bws run / explicit env / dotenv take precedence).
 *   - Fully guarded: never throws; logs to stderr on failure.
 */

export {
  hydrateSecretsFromBitwarden,
  bwsAvailable,
  type BwsSecret,
} from "@openclawdsolana/clawd-secrets";
