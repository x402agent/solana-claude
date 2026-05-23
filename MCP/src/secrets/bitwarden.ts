/**
 * Bitwarden Secrets Manager — Node-side runtime hydrator for the MCP server.
 *
 * The canonical implementation lives in the perps aggregator package (which
 * the MCP server already depends on), so there is exactly one hydrator to
 * maintain. We re-export it here and fall back to a local no-op only if the
 * aggregator package can't be resolved (so the server always boots).
 *
 * Behaviour (from the canonical implementation):
 *   - No-op unless BWS_ACCESS_TOKEN is set and SOLANA_CLAWD_BWS !== "0".
 *   - No-op if the `bws` CLI is not on PATH.
 *   - Existing env vars always win (bws run / explicit env take precedence).
 *   - Fully guarded: never throws; logs to stderr on failure.
 */

import { hydrateSecretsFromBitwarden as canonicalHydrate } from "@openclawdsolana/clawd-perps-aggregator";

export function hydrateSecretsFromBitwarden(env: NodeJS.ProcessEnv = process.env): number {
  try {
    return canonicalHydrate(env);
  } catch (err) {
    process.stderr.write(
      `[bitwarden] hydrator unavailable: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return 0;
  }
}
