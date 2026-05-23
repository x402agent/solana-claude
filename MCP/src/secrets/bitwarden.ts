/**
 * Bitwarden Secrets Manager — Node-side runtime hydrator.
 *
 * The installers wrap launchers with `bws run`, which injects secrets as env
 * vars before Node starts. But when the server is launched directly (e.g.
 * `node dist/index.js` from an MCP client config that doesn't go through the
 * launcher), we still want secrets available. This module hydrates
 * `process.env` from Bitwarden Secrets Manager at startup.
 *
 * Behaviour:
 *   - No-op unless BWS_ACCESS_TOKEN is set and SOLANA_CLAWD_BWS !== "0".
 *   - No-op if the `bws` CLI is not on PATH.
 *   - Existing env vars always win — we never overwrite a value that is already
 *     set (so `bws run` injection and explicit env take precedence).
 *   - Fully guarded: any failure logs to stderr and resolves; it never throws,
 *     so a misconfigured token can't take the server down.
 *
 * Honors:
 *   BWS_ACCESS_TOKEN   machine-account token (required to do anything)
 *   BWS_PROJECT_ID     optional project filter
 *   BWS_SERVER_URL     optional self-hosted server
 *   SOLANA_CLAWD_BWS=0 hard-disable
 */

import { spawnSync } from "node:child_process";

interface BwsSecret {
  id?: string;
  key?: string;
  value?: string;
  projectId?: string;
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function bwsAvailable(): boolean {
  try {
    const r = spawnSync("bws", ["--version"], { stdio: "ignore" });
    return r.status === 0;
  } catch {
    return false;
  }
}

/**
 * Pull secrets from Bitwarden and merge into process.env (without overwriting
 * existing values). Returns the number of keys added. Never throws.
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

  let result;
  try {
    result = spawnSync("bws", args, {
      encoding: "utf-8",
      // Inherit the real environment (PATH, etc.) and layer the caller's
      // overrides (token/project/server) on top.
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
    parsed = JSON.parse(result.stdout) as BwsSecret[];
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
    process.stderr.write(`[bitwarden] hydrated ${added} secret(s) from Bitwarden Secrets Manager\n`);
  }
  return added;
}
