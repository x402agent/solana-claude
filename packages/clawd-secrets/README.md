# @openclawdsolana/clawd-secrets

Zero-dependency **Bitwarden Secrets Manager** hydrator for the Clawd runtime.

Any Node entrypoint can pull secrets from Bitwarden into `process.env` at
startup with one call — even when not launched through a `bws run` wrapper:

```ts
import { hydrateSecretsFromBitwarden } from "@openclawdsolana/clawd-secrets";

hydrateSecretsFromBitwarden(); // call once, before reading process.env
```

## Rules

- No-op unless `BWS_ACCESS_TOKEN` is set and the `bws` CLI is on PATH.
- **Existing env vars always win** — `bws run` injection, explicit env, and
  `.env` files (via `dotenv`) take precedence; this only fills blanks.
- Fully guarded: any failure logs to stderr and returns `0`. Never throws, so a
  bad token can't take a process down.

## Env

| Variable | Purpose |
|----------|---------|
| `BWS_ACCESS_TOKEN` | Machine-account access token (required to do anything). |
| `BWS_PROJECT_ID` | Optional project filter. |
| `BWS_SERVER_URL` | Self-hosted Bitwarden server base URL. |
| `SOLANA_CLAWD_BWS=0` | Hard-disable. |

Uses only Node's built-in `child_process` — no third-party dependencies.

See [`docs/SECRETS.md`](../../docs/SECRETS.md) for the full install + runtime model.
