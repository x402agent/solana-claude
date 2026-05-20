<div align="center">

<img alt="x402.wtf CLAWD lobster terminal" src="https://capsule-render.vercel.app/api?type=waving&height=190&color=0:052e2b,45:0f766e,100:fb923c&text=x402.wtf%20CLAWD&fontColor=fff7ed&fontSize=48&animation=fadeIn&fontAlignY=38&desc=Lobster%20terminal%20for%20agents,%20payments,%20markets,%20and%20Backrooms&descAlignY=58" />

[![Site](https://img.shields.io/badge/site-x402.wtf-0f766e?style=for-the-badge)](https://x402.wtf)
[![Terminal](https://img.shields.io/badge/free_terminal-/terminal/free-f97316?style=for-the-badge)](https://x402.wtf/terminal/free)
[![Telegram](https://img.shields.io/badge/telegram_ops-/telegram-0891b2?style=for-the-badge)](https://x402.wtf/telegram)
[![API](https://img.shields.io/badge/api_catalog-/api-111827?style=for-the-badge)](https://x402.wtf/api)

<img alt="animated x402 readme tagline" src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=20&duration=2600&pause=500&color=FB923C&center=true&vCenter=true&width=900&lines=curl+-fsSL+https%3A%2F%2Fx402.wtf%2Fx402.sh+%7C+bash;CLAWD+terminal+%2B+Backrooms+API+%2B+Telegram+Agent+Engine;Solana+Clawd+TUI+ships+the+lobster+cockpit" />

</div>

```text
            _       _
          >(.)__ <(.)__
           (___/  \___)     x402.wtf
        _.-'  /____\  `-._   CLAWD public terminal
      /`     /  🦞  \     `\ Solana agents and market feeds
     /______/________\______\
```

# ClawdBrowser Production Catalog

Last updated: 2026-05-19

ClawdBrowser is the production Next.js application for `x402.wtf`. It ships the public x402/CLAWD site, the free terminal, the Backrooms proxy, the agent catalog, the Telegram control plane, Phoenix/Imperial trading surfaces, Pump.fun launch feeds, stock data panels, payment tools, Google Agent Engine integration, and the lobster-themed Solana Clawd TUI entry path.

Production:

- Site: https://x402.wtf
- Telegram ops page: https://x402.wtf/telegram
- Free terminal: https://x402.wtf/terminal/free
- API catalog: https://x402.wtf/api
- Backrooms API upstream: https://backrooms.x402.wtf
- One-shot launcher: `curl -fsSL https://x402.wtf/x402.sh | bash`
- TUI launcher: `curl -fsSL https://x402.wtf/x402.sh | X402_TUI=1 bash`
- Vercel project: `clawd-browser`
- Google Agent Engine: `projects/1013652097839/locations/us-central1/reasoningEngines/7617201602708897792`

Do not commit API keys, wallet keys, provider keys, or Google credentials. Admin access is configured through server-only environment variables such as `CLAWD_ADMIN_API_KEY`, `VERTEX_API_KEY`, and scoped provider keys.

## Current Shipped State

| Area | Status | Notes |
| --- | --- | --- |
| Next.js app | Live | `x402.wtf`, App Router, React 19, TypeScript |
| Public pages | Live | 66 app pages/routes |
| API routes | Live | 336 route handlers under `src/app/api` |
| Free terminal | Live | Ollama/Nemotron via Backrooms, OpenRouter fallback, Convex usage tracking |
| Backrooms proxy | Live | Server-side proxy routes under `/api/backrooms/*` with bearer auth upstream |
| Telegram ops | Live | `/telegram`, webhook config, bot status, admin Agent Engine bridge |
| Google Agent Engine | Live | Metadata probe and query path reachable through `/api/telegram/agent-engine` |
| Convex tracking | Live | Terminal turns, token usage, sessions, Telegram state, platform records |
| One-shot CLI | Live | `/x402.sh` installs `x402.wtf` and opens `/terminal/free` |
| Solana Clawd TUI | Integrated | `x402.wtf tui` launches the Backroom, perps, registry, wallet, and automaton cockpit |
| Vercel production | Live | Deployed and aliased to `https://x402.wtf` |

Recent production smoke result:

```text
GET  /telegram                                      200
GET  /api/telegram/agent-engine                    401 without admin auth
GET  /api/telegram/agent-engine?probe=1            200 with admin auth
POST /api/telegram/agent-engine                    200 with admin auth
GET  /api/telegram/agent-engine with x-api-key     200 with admin auth
```

## One-Shot Lobster Entry

The fastest public entry point is the shell launcher. It installs a tiny local `x402.wtf` command, opens the free terminal immediately, and keeps secrets server-side.

```bash
curl -fsSL https://x402.wtf/x402.sh | bash
```

Launch the full lobster TUI instead:

```bash
curl -fsSL https://x402.wtf/x402.sh | X402_TUI=1 bash
```

Installed commands:

```bash
x402.wtf                 # open https://x402.wtf/terminal/free
x402.wtf terminal        # same as default
x402.wtf api             # open API catalog
x402.wtf telegram        # open Telegram ops
x402.wtf agents          # open agent catalog
x402.wtf pump            # open Pump.fun dashboard
x402.wtf perps           # open perps surface
x402.wtf tui             # clone/update Solana Clawd and start the TUI
x402.wtf doctor          # public smoke check
x402.wtf curls           # print useful curl commands
```

The npm package is published as `x402.wtf` and maintained from `packages/x402-wtf`:

```bash
npm install -g x402.wtf
x402.wtf tui
```

## Stack

| Layer | Technology |
| --- | --- |
| Web | Next.js 15.5 App Router, React 19, TypeScript |
| Runtime | Vercel Node.js functions |
| Database | Convex plus platform Postgres/Neon paths |
| Auth | Better Auth, platform sessions, API keys, wallet/admin gates |
| AI | Backrooms Ollama/Nemotron, OpenRouter fallback, Google GenAI, Google Agent Engine |
| Trading | Phoenix/Rise/Vulcan, Imperial router, Jupiter, DFlow, Meteora |
| Market data | Helius, Birdeye, Solana Tracker, Pyth, Financial Datasets, Backrooms feeds |
| Payments | x402, Pay, Sponge/PaySponge, store checkout |
| Automation | Browser Use, Kernel, Box, orchestration, LiveKit |

## Lobster TUI

The Solana Clawd TUI is the terminal-native cockpit that sits beside the web app. It lives in the Solana Clawd repo and is exposed to users through the `x402.wtf tui` launcher instead of being bundled into browser JavaScript.

```text
/Users/8bit/bots/Cladwbot-solana/solana-clawd/tui
```

TUI package:

```text
@solanaclawd/tui
bins: hermes, clawd-tui
screens: Backroom, Phoenix Perps, Agent Registry, Wallet, Automaton Spawn
```

Primary TUI capabilities:

- Backroom dashboard for HERMES/x402 state.
- Phoenix perpetuals and Vulcan paper-trading views.
- Agent registry and A2A discovery panels.
- Wallet/operator screen.
- Automaton spawn flow for local agent operations.

Local operator run:

```bash
cd /Users/8bit/bots/Cladwbot-solana/solana-clawd/tui
npm install
npm run build
npm start
```

## Page Catalog

Primary public/operator pages:

| Route | Purpose |
| --- | --- |
| `/` and `/home` | Main x402/CLAWD landing surface |
| `/terminal/free` | Free public CLAWD terminal with Pump.fun feed, dream stream, token accounting |
| `/telegram` | Telegram bot/webhook/admin control plane and Google Agent Engine status |
| `/api` | Human-facing API catalog |
| `/profile` and `/profile/api` | User profile, API keys, usage, developer account surfaces |
| `/agents` | Agent catalog and agent entry surface |
| `/agents/google` | Google Agent Platform/Agent Engine visibility |
| `/agents/manage` | Agent deployment management |
| `/agents/mint` | Solana/Metaplex agent minting |
| `/backrooms` and `/3d` | Infinite Backroom iframe/surface |
| `/pump` | Pump.fun launch data and token tooling |
| `/stocks` | Stock market dashboard |
| `/perps` | Phoenix/Imperial perpetuals surface |
| `/perps/market-maker` | Hybrid market-maker planner |
| `/perps/arena` | Arena/trading signal surface |
| `/swap` | Solana swap UI |
| `/sponge` | Sponge/PaySponge surface |
| `/pay` | x402/MPP/payment debugger surface |
| `/store` | Store/checkout surface |
| `/box` | Box runtime surface |
| `/orchestrator` | Multi-agent orchestration UI |
| `/automation` | Automation install/control surface |
| `/bot-monitor` | Bot monitor page |
| `/explorer` | Agent/Solana explorer |
| `/gemini-studio` | Gemini studio surface |
| `/goblinmode` | Goblin image/research mode |
| `/voice-studio` | LiveKit/voice studio |
| `/wallet` | Wallet utilities |
| `/treasury` | Treasury and stream surface |
| `/usage` | Usage/accounting page |
| `/skills` | Skills catalog |
| `/docs` and `/library` | Docs/library surfaces |

Additional app routes are present for auth, devices, sessions, DEX token pages, install scripts, deep links, router, gateway, mail, prediction markets, percolator, and admin pages.

## API Catalog

The live API catalog is rendered at `/api`. The source tree currently contains 336 route handlers grouped as follows:

| Prefix | Count | Scope |
| --- | ---: | --- |
| `/api/agents` | 24 | Agent catalog, registry, deploy, mint, runtime, skills |
| `/api/platform` | 23 | Platform auth, profile, API keys, usage, history, admin launch mode |
| `/api/dflow` | 23 | DFlow markets, orders, positions, priority fees, search, live data |
| `/api/perps` | 16 | Perps auth, market-maker, strategies, Rise/Phoenix execution helpers |
| `/api/phoenix` | 15 | Phoenix markets, candles, orderbook, trader state, snapshots |
| `/api/clawd` | 14 | CLAWD chat providers, free terminal, dream stream, OpenAI/Gemini/Grok/etc. |
| `/api/auth` | 14 | Better Auth/social/auth callbacks and sessions |
| `/api/backrooms` | 12 | Protected Backrooms proxy: chat, feed, pump, stocks, perps, Firecrawl |
| `/api/x402` | 11 | x402-paid and premium agent/data routes |
| `/api/store` | 11 | Store products, checkout, funding, frontier/judge mode |
| `/api/sponge` | 11 | Sponge bank, balances, bridge, transfer, MCP, swap |
| `/api/meteora-swap` | 9 | Meteora pool, quote, liquidity, swap, submit |
| `/api/pump` | 9 | Pump.fun stream, agent, catalog, buy tx, Backrooms feed |
| `/api/tide` | 9 | Tide auth, keys, credits, models, chat completions, sandboxes |
| `/api/backroom` | 7 | Legacy Backroom feed/catalog/ws/push helpers |
| `/api/birdeye` | 7 | Birdeye portfolio, pulse, token, trending, search |
| `/api/box` | 7 | Box create/list/run/exec/files/stream/delete |
| `/api/mail` | 7 | Mail bootstrap/config/inboxes/threads/messages |
| `/api/stocks` | 7 | Stocks catalog, dashboard, data, market, metrics, news, snapshot |
| `/api/assembly` | 6 | Assembly chat, token, transcripts, voice deploy |
| `/api/pay` | 6 | Pay balance, curl, endpoints, search, server demo, skills |
| `/api/browser` | 5 | Browser Use profile sync, sessions, trading-agent |
| `/api/explorer` | 5 | Explorer, delegate, realtime, Solana, executive registration |
| `/api/gemini` | 5 | Gemini caches, image, interactions, live token, video |
| `/api/google-agents` | 5 | Google agents status, deploy, chat, live token, interactions |
| `/api/helius` | 5 | Helius DAS, wallet, sender, status, explorer webhook |
| `/api/skills` | 5 | Skills list/detail/submit/attest |
| `/api/telegram` | 4 | Bot status, webhook, webhook config, Agent Engine admin bridge |
| `/api/jupiter` | 4 | Jupiter order, price, search, submit |
| `/api/kernel` | 4 | Kernel browser sessions and computer/playwright control |
| `/api/solana-tracker` | 4 | Token/chart/risk charts/token lists |
| `/api/gateway` | 4 | Gateway install, source, stats, installer |
| Other prefixes | 49 | Health, MCP, realtime, router, treasury, tokens, wallet, RPC, etc. |

Key admin/protected endpoints:

```text
GET  /api/platform/admin/dashboard
GET  /api/platform/admin/launch-mode
GET  /api/telegram/bot
GET  /api/telegram/webhook/config
POST /api/telegram/webhook/config
GET  /api/telegram/agent-engine
POST /api/telegram/agent-engine
GET  /api/backrooms/handoff
POST /api/backrooms/chat
POST /api/backrooms/generate
GET  /api/backrooms/feed/snapshot
POST /api/backrooms/firecrawl/scrape
```

## Auth And Security Model

Security rules:

- Never expose `CLAWD_ADMIN_API_KEY`, `CLAWD_API_KEY`, `VERTEX_API_KEY`, `FIRECRAWL_API_KEY`, Helius keys, wallet keys, or provider keys to client JavaScript.
- Browser code calls same-origin app routes. Server routes add upstream auth.
- Protected Telegram admin routes accept `Authorization: Bearer <admin key>` or `x-api-key: <admin key>`.
- Platform API keys are checked through `src/lib/platform/api-auth.ts`.
- Telegram-specific admin fallback is in `src/lib/telegram/admin.ts`.
- Backrooms upstream auth is injected by `src/lib/backrooms/api.ts`.
- Protected responses use `Cache-Control: no-store`.
- Live trading routes must remain gated by explicit auth, admin/user scope, and confirmation flow.

Important server-only env vars:

```bash
CLAWD_ADMIN_API_KEY=
CLAWD_API_KEY=
BACKROOMS_API_BASE=https://backrooms.x402.wtf
BACKROOMS_TIMEOUT_MS=180000
VERTEX_API_KEY=
GOOGLE_AGENT_ENGINE_RESOURCE=projects/1013652097839/locations/us-central1/reasoningEngines/7617201602708897792
GOOGLE_AGENT_ENGINE_LOCATION=us-central1
GOOGLE_AGENT_ENGINE_ID=7617201602708897792
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_2=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ADMIN_SECRET=
TELEGRAM_USER_ID=
CONVEX_TERMINAL_WRITE_SECRET=
CONVEX_TERMINAL_READ_SECRET=
```

## Backrooms Integration

The site should not expose the Backrooms bearer key in browser code. Use these same-origin proxy routes:

| x402 route | Upstream |
| --- | --- |
| `GET /api/backrooms/health` | `GET /healthz` |
| `GET /api/backrooms/handoff` | `GET /api2.txt` |
| `POST /api/backrooms/chat` | `POST /v1/chat/completions` |
| `POST /api/backrooms/generate` | `POST /api/generate` |
| `GET /api/backrooms/feed/snapshot` | `GET /feed/snapshot` |
| `GET /api/backrooms/pump/*` | `GET /pumpfun/*` |
| `GET/POST /api/backrooms/stocks/*` | `/stocks/*` |
| `GET/POST /api/backrooms/perps/*` | `/perps/*` |
| `POST /api/backrooms/firecrawl/scrape` | `POST /firecrawl/scrape` |

Example server-side smoke:

```bash
curl -sS https://x402.wtf/api/backrooms/health | jq .

curl -sS https://x402.wtf/api/backrooms/feed/snapshot \
  -H "Authorization: Bearer $CLAWD_ADMIN_API_KEY" \
  --get --data-urlencode "channels=status,agents,conversation,perps,arena,pumpfun,stocks" \
  --data-urlencode "symbols=SOL,BTC,ETH" | jq .
```

## Free Terminal And Convex Usage Tracking

The free terminal lives at `/terminal/free` and calls `POST /api/clawd/free-terminal`.

Backend order:

1. CLAWD/Backrooms Ollama-compatible adapter via `OLLAMA_BASE_URL`, `OLLAMA_HOST`, or `PUBLIC_FLY_URL`.
2. OpenRouter free model fallback when the local/private adapter is unavailable.
3. Server-side usage persistence through Convex.

Tracked Convex surfaces:

- `chatSessions`
- `chatMessages`
- `aiUsage`
- Telegram session/state tables
- Platform usage/profile/API-key records

Terminal streams normalize output to:

```text
data: {"type":"meta"|"text"|"usage"|"done"|"error", ...}
```

Token accounting is upstream when available and estimated otherwise.

## Telegram And Google Agent Engine

Production route: https://x402.wtf/telegram

Admin API:

```bash
curl -sS "https://x402.wtf/api/telegram/agent-engine?probe=1" \
  -H "Authorization: Bearer $CLAWD_ADMIN_API_KEY" | jq .

curl -sS "https://x402.wtf/api/telegram/agent-engine" \
  -H "x-api-key: $CLAWD_ADMIN_API_KEY" | jq .

curl -sS "https://x402.wtf/api/telegram/agent-engine" \
  -H "Authorization: Bearer $CLAWD_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"Give me an operator status brief."}' | jq .
```

Telegram bot admin command:

```text
/agent_engine
/agent_engine Give me a short status brief.
```

Main Telegram commands:

```text
/mode <default|vulcan|phoenix|imperial>
/market <symbol>
/funding <symbol>
/route <symbol> <long|short> <notional> [leverage]
/risk <symbol> <long|short> <notional> [venue] [profile]
/margin [profile]
/positions [symbol]
/orders
/portfolio_intel
/long <symbol> <notional> [venue] [profile]
/short <symbol> <notional> [venue] [profile]
/close <symbol> <long|short> <notional> [venue] [profile]
/ideposit <amount_usdc> [profile]
/ibalance
/register_phoenix [profile]
/backroom
/arena
/dreams
/dreams_context
/backroom_status
/interrupt <message>
/browser [markets]
/profile_sync
/browser_profile [profile_id]
/browser_status [id]
/browser_stop [id]
```

## Agents, Registry, And Skills

Agent pages and APIs:

```text
/agents
/agents/[id]
/agents/google
/agents/manage
/agents/mint
/agents/registry
/api/agents
/api/agents/catalog
/api/agents/registry
/api/agents/deploy
/api/agents/chat
/api/google-agents/status
/api/google-agents/deploy
/api/google-agents/chat
```

Skills:

```text
/skills
/skills/[slug]
/api/skills
/api/skills/[slug]
/api/skills/detail/[slug]
/api/skills/submit
/api/skills/attest
```

Run generated catalog syncs:

```bash
npm run agents:sync
npm run skills:sync
npm run api:sync
```

## Trading And Market Data

Primary UI:

```text
/perps
/perps/market-maker
/perps/arena
/perps/strategy
/pump
/stocks
/swap
/dex
/prediction-markets
```

Primary APIs:

```text
/api/perps/*
/api/perps/v1/*
/api/phoenix/*
/api/imperial/*
/api/pump/*
/api/backrooms/pump/*
/api/stocks/*
/api/birdeye/*
/api/helius/*
/api/jupiter/*
/api/dflow/*
/api/meteora-swap/*
/api/solana-tracker/*
```

Trading safety defaults:

- Public terminal is read-only.
- Paper/dry-run modes are preferred.
- Live execution must be gated by auth, admin/user scope, and explicit confirmation.
- Telegram live mode requires `TELEGRAM_USER_ID` allowlisting and Imperial credentials.

## Payments, Store, And x402

Pages:

```text
/pay
/store
/sponge
/gateway
/usage
```

APIs:

```text
/api/pay/*
/api/x402/*
/api/store/*
/api/sponge/*
/api/gateway/*
/api/tide/*
```

x402 paid routes exist alongside public/free routes. Keep free metadata/catalog routes public where intended; keep premium inference/data routes behind server-side auth/payment checks.

## Automation And Runtime Surfaces

Pages:

```text
/automation
/box
/bot-monitor
/orchestrator
/session/[id]
/voice-studio
```

APIs:

```text
/api/automation/status
/api/box/*
/api/browser/*
/api/kernel/*
/api/orchestrator
/api/livekit/token
/api/bot-monitor/*
/api/stream/*
```

## Local Development

Install and run:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build -- --no-lint
```

Production-like local server:

```bash
npm run build -- --no-lint
npm run start -- -p 3100
```

Useful scripts:

```bash
npm run deploy:check
npm run smoke:pages
npm run smoke:api
npm run audit:env
npm run agents:sync
npm run skills:sync
npm run api:sync:dry
npm run package:x402-wtf
```

Package smoke:

```bash
npm pack ./packages/x402-wtf --dry-run
node packages/x402-wtf/bin/x402-wtf.mjs curls
```

## Deployment

Vercel production:

```bash
vercel env ls production
vercel --prod --yes
```

Convex production:

```bash
npx convex deploy
```

Backrooms runtime is separate and deployed to Fly under the Backrooms project. x402 should call it through same-origin proxy routes unless explicitly doing server-side integration work.

## Smoke Checklist

Use these after deploy:

```bash
curl -sS https://x402.wtf/telegram | head
curl -sS https://x402.wtf/api/health | jq .
curl -sS https://x402.wtf/api/backrooms/health | jq .
curl -sS https://x402.wtf/api/telegram/agent-engine | jq .

curl -sS "https://x402.wtf/api/telegram/agent-engine?probe=1" \
  -H "Authorization: Bearer $CLAWD_ADMIN_API_KEY" | jq .

curl -sS "https://x402.wtf/api/telegram/agent-engine" \
  -H "Authorization: Bearer $CLAWD_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"Reply with a one sentence production status."}' | jq .

curl -sS "https://x402.wtf/api/backrooms/feed/snapshot?channels=status,agents,conversation,perps,arena,pumpfun,stocks&symbols=SOL,BTC,ETH" \
  -H "Authorization: Bearer $CLAWD_ADMIN_API_KEY" | jq .
```

Expected:

- Public pages return `200`.
- Protected admin endpoints return `401` without auth.
- Admin endpoints return `200` with `CLAWD_ADMIN_API_KEY`.
- No response exposes raw provider keys, wallet keys, bearer values, or private upstream errors.

## Source Map

| Path | Purpose |
| --- | --- |
| `src/app` | App Router pages and API routes |
| `src/app/x402.sh/route.ts` | One-shot public shell installer for the x402.wtf launcher |
| `src/components` | UI components |
| `src/context` | React context providers |
| `src/lib` | Server/client libraries, integrations, auth, Backrooms, Telegram, Google agents |
| `src/pages` | Legacy pages routes if present |
| `src/middleware.ts` | Request middleware and route gating |
| `convex` | Convex schema, functions, usage tracking, Telegram state |
| `packages/x402-wtf` | npm CLI package for terminal, route, smoke, and TUI launch |
| `scripts` | Deploy/smoke/sync/audit scripts |
| `skills` | Repo-local agent skills |
| `public/api` | Public mirrored catalogs |

High-signal files:

```text
src/app/telegram/page.tsx
src/app/api/telegram/agent-engine/route.ts
src/lib/telegram/admin.ts
src/lib/telegram/handler.ts
src/lib/google-agents/agent-engine.ts
src/app/api/clawd/free-terminal/route.ts
src/components/free-clawd-terminal.tsx
src/lib/backrooms/api.ts
convex/messages.ts
convex/schema.ts
```

## Contributor Rules

- Keep secrets out of git and out of client bundles.
- Update `/api` catalog entries when adding public API routes.
- Keep admin-only routes server-side and `no-store`.
- Run `npm run build -- --no-lint` before deploy.
- Run live smoke tests after `vercel --prod --yes`.
- Prefer server-side proxy routes for protected upstreams.
- Do not enable live trading without explicit confirmation and scoped credentials.
