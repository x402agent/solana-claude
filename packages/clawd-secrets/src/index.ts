/**
 * @openclawdsolana/clawd-secrets — zero-dependency Bitwarden hydrator.
 *
 * The canonical secret-manager hydrator for the entire Clawd runtime. Any Node
 * entrypoint can pull secrets from Bitwarden Secrets Manager at startup with a
 * single call, even when it is NOT launched through a `bws run` wrapper
 * (npx / tsx / node / npm run):
 *
 *   import { hydrateSecretsFromBitwarden } from "@openclawdsolana/clawd-secrets";
 *   hydrateSecretsFromBitwarden(); // before reading process.env
 *
 * Behaviour:
 *   - No-op unless BWS_ACCESS_TOKEN is set and SOLANA_CLAWD_BWS !== "0".
 *   - No-op if the `bws` CLI is not on PATH.
 *   - Existing env vars always win — never overwrites a value already set, so
 *     `bws run` injection, explicit env, and .env files take precedence.
 *   - Fully guarded: any failure logs to stderr and returns 0; never throws.
 *
 * Honors BWS_ACCESS_TOKEN, BWS_PROJECT_ID, BWS_SERVER_URL, SOLANA_CLAWD_BWS=0.
 *
 * Only Node's built-in child_process is used — no third-party dependencies, so
 * even the lightest CLI can depend on this without bloat.
 */

import { spawnSync } from "node:child_process";

export interface BwsSecret {
  id?: string;
  key?: string;
  value?: string;
  projectId?: string;
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** True if the bws CLI responds to --version. */
export function bwsAvailable(): boolean {
  try {
    return spawnSync("bws", ["--version"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

/**
 * Merge Bitwarden secrets into `env` (default process.env) without overwriting
 * existing values. Returns the number of keys added. Never throws.
 */
export function hydrateSecretsFromBitwarden(
  env: NodeJS.ProcessEnv = process.env,
): number {
  if (env.SOLANA_CLAWD_BWS === "0") return 0;
  if (!env.BWS_ACCESS_TOKEN) return 0;
  if (!bwsAvailable()) {
    process.stderr.write(
      "[bitwarden] BWS_ACCESS_TOKEN set but `bws` CLI not found on PATH — skipping secret hydration\n",
    );
    return 0;
  }

  const args = ["secret", "list"];
  if (env.BWS_PROJECT_ID) args.push(env.BWS_PROJECT_ID);
  args.push("--output", "json");
  if (env.BWS_SERVER_URL) args.push("--server-url", env.BWS_SERVER_URL);

  let result: ReturnType<typeof spawnSync>;
  try {
    result = spawnSync("bws", args, {
      encoding: "utf-8",
      // Inherit the real environment (PATH, etc.) plus caller overrides.
      env: { ...process.env, ...env },
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (err) {
    process.stderr.write(
      `[bitwarden] failed to invoke bws: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return 0;
  }

  if (result.status !== 0) {
    process.stderr.write(
      `[bitwarden] bws secret list failed (status ${result.status}). Check token/project.\n`,
    );
    return 0;
  }

  let parsed: BwsSecret[];
  try {
    parsed = JSON.parse(String(result.stdout)) as BwsSecret[];
  } catch {
    process.stderr.write("[bitwarden] could not parse bws output as JSON\n");
    return 0;
  }
  if (!Array.isArray(parsed)) return 0;

  let added = 0;
  for (const secret of parsed) {
    const key = secret.key;
    const value = secret.value;
    if (!key || value == null || !IDENT.test(key)) continue;
    if (env[key] !== undefined && env[key] !== "") continue; // existing wins
    env[key] = value;
    added += 1;
  }

  if (added > 0) {
    process.stderr.write(
      `[bitwarden] hydrated ${added} secret(s) from Bitwarden Secrets Manager\n`,
    );
  }
  return added;
}
