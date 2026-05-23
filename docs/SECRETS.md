# Secret Management — Bitwarden Secrets Manager

solana-clawd installers integrate **[Bitwarden Secrets Manager](https://bitwarden.com/products/secrets-manager/)**
(the `bws` CLI) so API keys, JWTs, and wallet credentials can be managed in a
real secret store instead of plaintext `.env` files.

The integration is **optional and opt-in** — nothing changes unless you provide
a `BWS_ACCESS_TOKEN`. When you do, you get two modes:

1. **Runtime injection (recommended).** Launchers wrap the process with
   `bws run`, which pulls secrets from Bitwarden and injects them as
   environment variables for the lifetime of that process only. Secrets never
   touch disk.
2. **Env-file seeding.** `--bws-seed` writes the secrets into the install's
   `.env` (chmod `0600`), filling blank/missing keys. Use this when a tool
   needs a literal file.

Both modes use a **machine-account access token** (`BWS_ACCESS_TOKEN`) — no
interactive vault unlock, ideal for installers, CI, servers, and agents.

---

## Quick start

```bash
# 1. Create a machine account + access token in Bitwarden Secrets Manager,
#    and add your secrets (HELIUS_API_KEY, IMPERIAL_JWT, XAI_API_KEY, ...).
export BWS_ACCESS_TOKEN="0.xxxx…"          # machine-account token
export BWS_PROJECT_ID="…"                  # optional: scope to one project

# 2. Install with the secret manager wired in.
#    Root installer:
bash install.sh --bws-install --bws-save-token

#    MCP installer:
curl -fsSL https://raw.githubusercontent.com/x402agent/solana-clawd/main/MCP/install.sh \
  | bash -s -- --bws-install --bws-save-token

#    SDK installer:
bash sdk/install.sh --bws-install --bws-save-token --bws-seed
```

After install, run anything with runtime secret injection:

```bash
clawd-secure clawd                 # = bws run -- clawd
clawd-secure clawd-perps route SOL long 250
~/.local/bin/solana-clawd-mcp      # MCP launcher auto-uses `bws run`
```

---

## Flags (all three installers)

| Flag | Effect |
|------|--------|
| `--bws-install` | Install the `bws` CLI if missing (brew → cargo → GitHub release). |
| `--bws-token=TOKEN` | Provide the access token inline (or set `BWS_ACCESS_TOKEN`). |
| `--bws-project=ID` | Scope to one Secrets Manager project (or `BWS_PROJECT_ID`). |
| `--bws-save-token` | Persist the token to a `0600` file so launchers can inject at runtime. |
| `--bws-seed` | Seed the install `.env` from Bitwarden now (fills blanks). |
| `--bws-overwrite` | With `--bws-seed`, overwrite existing values too. |
| `--no-bws` | Disable the integration entirely (or `SOLANA_CLAWD_BWS=0`). |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `BWS_ACCESS_TOKEN` | Machine-account access token. Required to do anything. |
| `BWS_PROJECT_ID` | Optional project filter. |
| `BWS_SERVER_URL` | Self-hosted Bitwarden server base URL. |
| `BWS_TOKEN_FILE` | Where `--bws-save-token` writes the token (per-installer default). |
| `SOLANA_CLAWD_BWS=0` | Hard-disable Bitwarden integration. |

Token file defaults:

| Installer | Token file |
|-----------|-----------|
| Root (`install.sh`) | `$OPENCLAWD_HOME/bws-access-token` |
| MCP (`MCP/install.sh`) | `$XDG_CONFIG_HOME/solana-clawd-mcp/bws-access-token` |
| SDK (`sdk/install.sh`) | `~/.clawd/bws-access-token` |

---

## How runtime injection works

The launchers the installers generate share one prelude + exec pattern:

```bash
# load env file, then a saved token if BWS_ACCESS_TOKEN isn't already set
ENV_FILE="…"; [ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }
BWS_TOKEN_FILE="…"
[ -z "${BWS_ACCESS_TOKEN:-}" ] && [ -f "$BWS_TOKEN_FILE" ] && \
  export BWS_ACCESS_TOKEN="$(tr -d '\r\n' < "$BWS_TOKEN_FILE")"

# wrap with `bws run` when a token + CLI are present, else run directly
if [ "${SOLANA_CLAWD_BWS:-1}" != "0" ] && [ -n "${BWS_ACCESS_TOKEN:-}" ] && command -v bws >/dev/null 2>&1; then
  exec bws run ${BWS_PROJECT_ID:+--project-id "$BWS_PROJECT_ID"} -- "$@"
fi
exec "$@"
```

So a launcher degrades gracefully: no token or no CLI → it just runs the
program with whatever the env file provides.

## Node-side hydration (runtime, no launcher needed)

Even when a process is launched directly (e.g. a Claude Desktop config that
points at `node dist/index.js`, or `npx`/`tsx`/`npm run` without the `bws run`
launcher), the runtime self-hydrates from Bitwarden at startup.

Entrypoints that self-hydrate today:

| Entrypoint | Source |
|------------|--------|
| MCP server (stdio + HTTP) | `MCP/src/index.ts`, `MCP/src/http.ts` |
| Perps aggregator CLI | `packages/clawd-perps-aggregator/src/cli.ts` |
| Perps aggregator MCP bin | `packages/clawd-perps-aggregator/src/mcp/bin.ts` |
| `clawd-perps` CLI | `packages/clawd-perps/src/cli.ts` |
| `clawd-agents-perps` CLI | `Perps/clawd-agents-perps/src/cli.ts` |
| `clawd` TUI | `packages/clawd/src/index.ts` |
| `clawd-standalone` CLI | `packages/cli-standalone/index.js` |
| `leviathan` / `openclawd` CLI | `sdk/src/index.ts` |
| Gateway (Telegram + HTTP API) | `gateway/src/index.ts` |

The canonical implementation lives once in the zero-dependency package
**`@openclawdsolana/clawd-secrets`** (`packages/clawd-secrets`), exported as
`hydrateSecretsFromBitwarden()`. The perps aggregator re-exports it, and the
MCP server re-exports it via the aggregator — so there is exactly one hydrator
to maintain and every runtime above shares it.

Rules for all hydration paths:

- No-op unless `BWS_ACCESS_TOKEN` is set and the `bws` CLI is available.
- **Existing env vars always win** — `bws run` injection and explicit env take
  precedence; this is only a fallback.
- Fully guarded: any failure logs to stderr and continues. A bad token can
  never take a process down.

### Adding self-hydration to another runtime

Any Node entrypoint can opt in with the zero-dependency package:

```ts
import { hydrateSecretsFromBitwarden } from "@openclawdsolana/clawd-secrets";
hydrateSecretsFromBitwarden(); // call once, before reading process.env
```

Add `"@openclawdsolana/clawd-secrets": "file:…/packages/clawd-secrets"` to the
package's dependencies. It pulls in no third-party packages (only Node's
built-in `child_process`), so even the lightest CLI can use it.

Anything that hasn't opted in still receives Bitwarden secrets when launched
through the installed `bws run` launchers / `clawd-secure` wrapper, which
populate the environment before the process starts.

---

## Implementation

- `scripts/bitwarden-secrets.sh` — the canonical, sourceable shell library
  (CLI install, token resolution, JSON→env parsing, env seeding, launcher
  prelude/exec). The root and MCP installers source it from the checkout; the
  SDK installer fetches it from the repo when run via `curl | bash`.
- `scripts/test-bitwarden-secrets.sh` — a 25-assertion test suite that runs
  against a mock `bws` (no account/network needed): `bash scripts/test-bitwarden-secrets.sh`.
- `packages/clawd-secrets/` — the canonical, zero-dependency Node runtime
  hydrator (`@openclawdsolana/clawd-secrets`, exports
  `hydrateSecretsFromBitwarden`). Every runtime entrypoint imports this.
- `packages/clawd-perps-aggregator/src/secrets/bitwarden.ts` and
  `MCP/src/secrets/bitwarden.ts` — thin re-exports of the canonical hydrator.

## Security notes

- The access token grants read access to your secrets — treat it like a
  password. Prefer the runtime-injection path so plaintext secrets are never
  written to disk.
- Token files and seeded `.env` files are written `0600`.
- Never commit token files or `.env` files. They are covered by `.gitignore`.
- Scope machine accounts to the minimum project(s) needed and rotate tokens
  regularly.
- Bitwarden Secrets Manager CLI docs:
  <https://bitwarden.com/help/secrets-manager-cli/>
