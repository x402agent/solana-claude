# Repo Map

This repository contains both active development surfaces and preserved upstream/vendor trees. New contributors should start with the active surfaces below and treat the embedded trees as reference material unless a task explicitly targets them.

## Start Here

- `README.md` — public project story and command overview
- `STARTHERE.md` — onboarding and local run path
- `SECURITY.md` — secret-handling and release constraints
- `.env.example` — minimum shared environment shape
- `npm run doctor` — repo health check for the active surfaces

## Active Surfaces

| Path | Purpose | Primary check |
| --- | --- | --- |
| `sdk/` | TypeScript SDK for external integrations | `npx tsc -p sdk/tsconfig.json --noEmit` |
| `leviathan/` | sovereign runtime CLI and loop | `npx tsc -p leviathan/tsconfig.json --noEmit` |
| `clawdrouter/` | model-routing layer | `npx tsc -p clawdrouter/tsconfig.json --noEmit` |
| `MCP/` | MCP server and orchestrator | `npx tsc -p MCP/tsconfig.json --noEmit` |
| `gateway/` | Solana/Telegram HTTP gateway | `npm --prefix gateway install && npx tsc -p gateway/tsconfig.json --noEmit` |
| `beepboop/worker/` | Cloudflare worker for install/chat/Solana proxy | `npm --prefix beepboop/worker install --ignore-scripts && wrangler deploy --dry-run` |
| `beepboop/convex/` | Convex install-tracking backend | `npm --prefix beepboop/convex install && convex --help` |
| `automaton-main/automation/` | automation hub bootstrap and CI orchestration | `npm run doctor` |

## Treat As Embedded Or Upstream

These directories are large, useful, and sometimes runnable, but they are not part of the default root verification path:

- `openclawd/`
- `openclawd-framework/`
- `plugin.delivery/`
- `solana-mcp-official-main/`
- `MemeBRain/`
- `pinocchio/`
- `programs/`
- `chrome-extension/`
- `openShell/`
- `x402/`

## Conventions

- Use Node `20` to `22`. `.nvmrc` pins `22`.
- Do not commit real `.env` files, private keys, or worker secrets.
- Prefer package-local installs for subprojects with their own `package.json`.
- Use `npm run doctor` before release-facing changes.
