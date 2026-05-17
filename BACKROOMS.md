# CLAWD Infinite Backroom

Multi-agent backroom runtime for CLAWD: a FastAPI agent API, React Three Fiber 3D frontend, terminal/TUI clients, Convex realtime state, market-data injection, Firecrawl Dreams ingestion, Financial Datasets equities, Solana/Phoenix/DFlow trading context, x402/pay.sh routing, and companion CLIs.

## Live Deployments

| Surface | URL | Purpose |
| --- | --- | --- |
| Base API + static shell | https://backrooms.x402.wtf | Public FastAPI routes, `enter.sh`, agents, loop, metadata, market endpoints |
| Fly API origin | https://clawd-backrooms.fly.dev | Same API behind Fly app `clawd-backrooms` |
| 3D frontend | https://backroom-3d.fly.dev | React Three Fiber backroom with market HUDs, Dreams, live stream, stocks |
| Dashboard domain | https://dashboard.x402.wtf | Vercel dashboard surface when linked to the dashboard package |
| Convex HTTP site | https://original-vulture-742.convex.site | Realtime presence, messages, agent registration HTTP actions |
| Convex deployment | https://original-vulture-742.convex.cloud | Convex functions, tables, cron-backed data pipelines |

## Current Capabilities

| Capability | Backend | Frontend / Client |
| --- | --- | --- |
| Three-agent loop | `api/main.py`, `api/moonshot_agents.py`, `api/agents.py`, `api/openrouter_agents.py` | `/loop`, `/agent1`, `/agent2`, `/agent3`, `LiveStreamPanel` |
| Live SSE backroom | `/stream`, `/stream/human`, `_run_stream_loop()` | `backroom-3d/src/components/LiveStreamPanel.tsx` |
| Firecrawl Dreams corpus | `api/firecrawl_scraper.py`, `/firecrawl/dreams/*` | `ElectricDreamsPanel`, `DreamsOrbs` |
| Financial Datasets stocks | `api/financial_datasets.py`, `/stocks/*` | `StockDataPanel`, `useStockData` |
| Agent stock injection | `build_stocks_context()`, `/stocks/context`, `/stocks/inject` | Agent prompts through `api/market_context.py` |
| Phoenix perps context | `api/market_context.py`, `api/trading_arena.py`, `/arena` | `SolanaDataPanel`, `PerpsConstellation`, `TradingArenaPanel` |
| DFlow quotes / markets | `api/market_context.py`, `api/solana_trading.py` | `SolanaDataPanel`, Convex DFlow hooks |
| CLAWD orchestration | `api/clawd_orchestration.py`, `/clawd/orchestrate` | `ClawdOrchestrationPanel` |
| Auth and API keys | `api/auth.py`, `/v1/keys`, `/v1/machines/handshake` | Convex-backed API-key verification |
| Metaplex / agent metadata | `/metadata/{agent}.json`, `/metadata/{agent}/registration.json` | CLI package and public NFT/agent metadata |
| x402/pay.sh gateway spec | `pay/clawd-backroom-pay.yaml` | Metering spec for agent routes |
| Terminal dashboard | `backroom-tui` | Bun + Ink Bloomberg-style terminal |
| Stock_Main bridge | `Stock_Main/financial_dataset_bridge.py` | Seeds legacy simulator `stocks.json` from live Financial Datasets |

## Quick Start

```bash
cd /Users/8bit/bots/Cladwbot-solana/solana-clawd/openclawd-framework/multiagents-infinite-backroom
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm install
```

Run the API locally:

```bash
npm run server
# or
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Run the 3D frontend locally:

```bash
npm run backroom-3d:dev
```

Use the public shell installer:

```bash
curl -fsSL https://backrooms.x402.wtf/enter.sh | bash
```

## Required Environment

Store secrets in `.env.local` for local development and Fly/Vercel/Convex secret stores for production. Do not commit real keys.

| Variable | Required For | Notes |
| --- | --- | --- |
| `MOONSHOT_API_KEY` | Primary agent backend | Preferred backend when `AGENT_BACKEND=auto` |
| `DEEPSEEK_API_KEY` | DeepSeek fallback | Used by `api/agents.py` |
| `OPENROUTER_API_KEY` | OpenRouter fallback | Used by `api/openrouter_agents.py` |
| `FIRECRAWL_API_KEY` | Dreams scrape/crawl | Used by `api/firecrawl_scraper.py` |
| `FINANCIALDATASET_API_KEY` | Stocks/fundamentals/news | Primary name supported by `api/financial_datasets.py` |
| `FINANCIALDATASETS_API_KEY` | Stocks fallback name | Also supported |
| `DFLOW_API_KEY` | DFlow quotes / markets | Optional; context is skipped if absent |
| `CONVEX_URL` | Convex function access | Defaults to `original-vulture-742.convex.cloud` |
| `CONVEX_SITE_URL` | Convex HTTP actions/auth | Defaults from Fly config |
| `CLAWD_API_AUTH_REQUIRED` | Protected API routes | `true` in hardened production |
| `CLAWD_ADMIN_API_KEY` | Bootstrap admin bearer | Required for admin/protected route testing |
| `CORS_ORIGINS` | Browser clients | Include `https://backrooms.x402.wtf`, `https://dashboard.x402.wtf`, `https://backroom-3d.fly.dev` |
| `STOCK_CONTEXT_ENABLED` | Agent equity context | Defaults to `true` |
| `STOCK_CONTEXT_TICKERS` | Default equities basket | Defaults to `AAPL,MSFT,NVDA,TSLA,GOOGL` |

## Core API Map

### Health, Auth, Metadata

| Route | Method | Purpose |
| --- | --- | --- |
| `/healthz` | GET | API health, backend status, auth status, Solana status, stock status |
| `/v1/auth/status` | GET | Auth backend readiness |
| `/v1/keys` | POST | Create Convex-backed API key, protected by `admin:keys` |
| `/v1/machines/handshake` | POST | Register/refresh trusted machine client |
| `/metadata/{agent_slug}.json` | GET | Public agent metadata |
| `/metadata/{agent_slug}/registration.json` | GET | ERC-8004-style registration metadata |

### Agents and Streaming

| Route | Method | Purpose |
| --- | --- | --- |
| `/agent1` | GET | Analyst response |
| `/agent2` | GET | Satirist response |
| `/agent3` | GET | Clawd response |
| `/loop?turns=3` | GET | Analyst -> Satirist -> Clawd loop |
| `/conversation` | GET | Current conversation memory |
| `/reset` | GET | Reset conversation, protected |
| `/stream` | GET | Server-sent event stream |
| `/stream/human` | POST | Queue human message into live stream |
| `/stream/start` | POST | Start background stream loop |
| `/stream/status` | GET | Stream runtime state |
| `/enter?message=...` | GET | Direct prompt endpoint |
| `/enter.sh` | GET/HEAD | One-shot CLI installer |
| `/install.sh` | GET | Installer alias/source |

### Dreams and Firecrawl

| Route | Method | Purpose |
| --- | --- | --- |
| `/firecrawl/status` | GET | Firecrawl config/job readiness |
| `/firecrawl/scrape` | POST | Scrape one URL and optionally inject into conversation |
| `/firecrawl/map` | POST | Map site URLs |
| `/firecrawl/crawl` | POST | Async crawl and optional injection |
| `/firecrawl/crawl/{job_id}` | GET | Crawl status |
| `/firecrawl/dreams` | POST | Sync Dreams corpus from Webflow and optionally inject |
| `/firecrawl/dreams/status` | GET | Cached Dreams metadata |
| `/firecrawl/dreams/stories` | GET | Cached stories |
| `/firecrawl/dreams/context` | GET | Agent-ready Dreams context |
| `/firecrawl/dreams/inject` | POST | Inject cached Dreams corpus |
| `/firecrawl/jobs/{job_id}` | GET | Local Firecrawl job state |

### Stocks / Financial Datasets

| Route | Method | Purpose |
| --- | --- | --- |
| `/stocks/status` | GET | Financial Datasets readiness, cache status, default tickers |
| `/stocks/snapshot` | GET/POST | Normalized multi-ticker snapshot for UI/agents |
| `/stocks/company/{ticker}` | GET | Company facts |
| `/stocks/price/{ticker}` | GET | Real-time price snapshot |
| `/stocks/metrics/{ticker}` | GET | Financial metrics snapshot or historical metrics |
| `/stocks/financials/{ticker}` | GET | Income, balance sheet, cash flow statements |
| `/stocks/earnings` | GET | Company earnings or earnings feed |
| `/stocks/news` | GET | Company news or broad market news |
| `/stocks/line-items` | POST | Search selected financial line items across tickers |
| `/stocks/context` | GET | Agent-ready stock context text |
| `/stocks/inject` | POST | Inject current stock context into active conversation, protected |

Example:

```bash
curl -sS https://backrooms.x402.wtf/stocks/snapshot \
  -H "Content-Type: application/json" \
  -d '{"tickers":["AAPL","NVDA"],"include_news":false,"include_earnings":false,"limit":2}'
```

### Solana, Perps, Prediction Markets

| Route | Method | Purpose |
| --- | --- | --- |
| `/solana/status` | GET | Vulcan/Phoenix/DFlow readiness |
| `/perps/markets` | GET | Phoenix perpetual markets through Vulcan or direct Phoenix |
| `/perps/ticker/{symbol}` | GET | Perps ticker |
| `/perps/paper/init` | POST | Initialize Vulcan paper account |
| `/perps/paper/order` | POST | Place paper perps order |
| `/perps/order` | POST | Dry-run/live Vulcan order depending request |
| `/prediction/markets` | GET | DFlow prediction market discovery |
| `/prediction/order` | POST | Build DFlow prediction market order payload |
| `/arena` | GET | Agent-Trading-Arena-inspired perps signal tape |
| `/clawd/orchestrate` | GET | Bounded orchestration loop planner |

## Codebase Map

```text
multiagents-infinite-backroom/
├── api/                         FastAPI app, agent backends, market integrations, static shell
├── automaton-main/              CLAWD automaton, dashboard package, OODA/goblin runtime
├── backroom-3d/                 React Three Fiber frontend deployed to Fly
├── backroom-tui/                Bun + Ink terminal dashboard
├── bux-main/                    BUX/payment-related companion code
├── convex/                      Convex realtime backend, aiTown, HTTP actions, schemas, crons
├── data/                        Local persisted runtime/cache data
├── packages/cli/                TypeScript CLI for CLAWD agent tooling, Metaplex, Vulcan helpers
├── pay/                         x402/pay.sh route metering specs
├── ralph-orchestrator-main/     Ralph-style orchestration package used as design/source reference
├── vulcan-cli-master/           Vulcan Phoenix perps CLI/runtime
├── workers/install-sh/          Cloudflare Worker for installer delivery
├── Dockerfile                   FastAPI container
├── fly.toml                     Fly config for `clawd-backrooms`
├── install.sh                   Local/public installer script source
├── package.json                 Root scripts for API, 3D, TUI, automaton, Vulcan
├── requirements.txt             Python API dependencies
└── vercel.json                  Vercel routing/config for dashboard/static deployments
```

### Local and Generated Directories

| Path | Commit? | Purpose |
| --- | --- | --- |
| `.claude/` | Usually no | Local Claude/Codex agent state and project settings |
| `.playwright-mcp/` | Usually no | Browser automation/MCP local state |
| `.venv/` | No | Python virtual environment |
| `node_modules/` | No | Root Node dependencies |
| `.env.local` | No | Local secrets and environment overrides |
| `api/__pycache__/` | No | Python bytecode cache |
| `api/static/` | Yes | Static shell assets served by FastAPI |
| `data/` | Depends | Runtime cache/persistent data; inspect before committing |

### `api/`

| File | Responsibility |
| --- | --- |
| `main.py` | FastAPI app, route registration, stream loop, CORS, health, metadata, public shell |
| `auth.py` | Bearer auth, Convex API-key verification, admin bootstrap, usage logging |
| `moonshot_agents.py` | Moonshot/Kimi terminal implementation |
| `agents.py` | DeepSeek terminal implementation |
| `openrouter_agents.py` | OpenRouter terminal implementation |
| `openai_agents.py` | OpenAI-style two-agent fallback |
| `market_context.py` | Injects Phoenix, DFlow, and stock context into agent prompts |
| `financial_datasets.py` | Financial Datasets client, stock normalization, context builder |
| `firecrawl_scraper.py` | Firecrawl scrape/map/crawl/Dreams sync/cache/injection |
| `dreams_scraper.py` | Legacy direct Dreams scraper |
| `solana_trading.py` | Vulcan, Phoenix, DFlow HTTP wrappers |
| `trading_arena.py` | Read-only perps signal simulation |
| `clawd_orchestration.py` | CLAWD bounded planning/orchestration loop |
| `upstash-manager.ts` | Upstash Box deployment/runtime helper |
| `static/` | Minimal static API shell assets |

### `backroom-3d/`

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Main R3F scene and overlay composition |
| `src/lib/backroom.ts` | Browser API client for backroom routes |
| `src/store.ts` | Zustand app state |
| `src/components/SolanaDataPanel.tsx` | Solana, Phoenix, DFlow HUD |
| `src/components/StockDataPanel.tsx` | 2D Financial Datasets equity panel |
| `src/components/ElectricDreamsPanel.tsx` | Dreams story browser/sync UI |
| `src/components/DreamsOrbs.tsx` | Dreams corpus rendered as 3D orbs |
| `src/components/PerpsConstellation.tsx` | OI/funding/heat constellation |
| `src/components/TradingArenaPanel.tsx` | Perps agent signal tape |
| `src/components/ClawdOrchestrationPanel.tsx` | CLAWD orchestration UI |
| `src/components/LiveStreamPanel.tsx` | SSE conversation stream and human input |
| `src/hooks/useStockData.ts` | Stocks polling and formatting |
| `src/hooks/useDreams.ts` | Dreams polling/sync |
| `src/hooks/usePerpsData.ts` | Convex perps reads |
| `src/hooks/useDflowData.ts` | Convex DFlow reads |
| `Agent-Trading-Arena/.../Stock_Main/` | Legacy stock market simulator |
| `Agent-Trading-Arena/.../Stock_Main/financial_dataset_bridge.py` | Seeds simulator stocks from Financial Datasets |

### `convex/`

Convex powers realtime presence, aiTown-style state, backroom messages, API-key verification, HTTP actions, and scheduled market-data polling.

| Path | Responsibility |
| --- | --- |
| `schema.ts` | Top-level Convex schema |
| `http.ts` | HTTP router |
| `crons.ts` | Scheduled polling jobs |
| `clawd/` | CLAWD-specific agents, data, heartbeats, HTTP actions |
| `aiTown/` | aiTown simulation/world modules |
| `agent/` | Memory, conversation, embedding cache schema |
| `_generated/` | Convex generated API/data model files |
| `util/`, `engine/` | Shared utilities and simulation engine helpers |

When changing Convex code, read `convex/_generated/ai/guidelines.md` first if present and follow its generated API rules.

### `automaton-main/`

Companion automaton workspace. It contains the dashboard package, OODA/goblin loops, and related agent automation. Use this when working on the Vercel dashboard or automaton runtime separate from the Fly-hosted `backroom-3d`.

### `backroom-tui/`

Bun + Ink terminal dashboard. It connects to the public FastAPI API and Convex HTTP site for loop snapshots, live messages, and registered agent presence.

```bash
cd backroom-tui
bun install
bun run dev
```

### `packages/cli/`

TypeScript CLI for CLAWD operational tooling.

| File | Responsibility |
| --- | --- |
| `src/index.ts` | CLI entry |
| `src/metaplex.ts` | Agent/token metadata and Metaplex helpers |
| `src/tui.ts` | Terminal UI helpers |
| `src/vulcan.ts` | Vulcan/Phoenix helpers |

### `pay/`

`pay/clawd-backroom-pay.yaml` defines x402/pay.sh metering for health, metadata, agent, loop, and chat routes.

### `workers/`

Cloudflare worker code for installer delivery. Current worker lives at `workers/install-sh/`.

## Market Data Flow

```text
Financial Datasets
  -> api/financial_datasets.py
    -> /stocks/snapshot for React UI
    -> /stocks/context and market_context.py for agent prompt injection
    -> Stock_Main/financial_dataset_bridge.py for legacy simulator seeds

Firecrawl
  -> api/firecrawl_scraper.py
    -> /firecrawl/dreams/stories for UI
    -> /firecrawl/dreams/context and /inject for agent memory
    -> backroom-3d Dreams panels/orbs

Phoenix + DFlow
  -> api/market_context.py for direct prompt injection
  -> api/trading_arena.py for read-only signal tape
  -> Convex crons/tables for frontend realtime reads
  -> backroom-3d Solana HUD and perps constellation
```

## Deployment

Deploy API:

```bash
flyctl deploy -a clawd-backrooms
```

Set API secrets:

```bash
flyctl secrets set FINANCIALDATASET_API_KEY=... -a clawd-backrooms
flyctl secrets set FIRECRAWL_API_KEY=... -a clawd-backrooms
flyctl secrets set MOONSHOT_API_KEY=... -a clawd-backrooms
```

Deploy 3D frontend:

```bash
cd backroom-3d
flyctl deploy -a backroom-3d
```

Build dashboard package if working in `automaton-main/packages/dashboard`:

```bash
cd automaton-main/packages/dashboard
npm install
npm run build
```

## Verification Runbook

```bash
# Python API compile
.venv/bin/python -m compileall api

# Frontend build
npm run backroom-3d:build

# API health
curl -sS https://backrooms.x402.wtf/healthz

# Stocks readiness
curl -sS https://backrooms.x402.wtf/stocks/status

# Stocks snapshot
curl -sS https://backrooms.x402.wtf/stocks/snapshot \
  -H "Content-Type: application/json" \
  -d '{"tickers":["AAPL","NVDA"],"include_news":false,"include_earnings":false,"limit":2}'

# Dreams cache status
curl -sS https://backrooms.x402.wtf/firecrawl/dreams/status

# 3D frontend shell
curl -sSI https://backroom-3d.fly.dev/
```

## Common Local Commands

```bash
npm run server                 # FastAPI dev server
npm run healthcheck            # Python compile smoke check
npm run scrape                 # Legacy Dreams scraper
npm run backroom-3d:dev        # Vite dev server
npm run backroom-3d:build      # TypeScript + Vite build
npm run backroom-tui           # Bun/Ink terminal dashboard
npm run goblin                 # Automaton goblin runtime
npm run ooda                   # Automaton OODA runtime
npm run vulcan:build           # Build Vulcan CLI
```

## Notes for Future Agents

- Do not commit `.env.local`, `.venv`, `node_modules`, cached scrape data, or generated secrets.
- Treat Financial Datasets, Firecrawl, Moonshot, DeepSeek, OpenRouter, DFlow, Convex, Fly, and Vercel tokens as secrets.
- Keep public read endpoints safe for browser use; mutation/injection routes should remain scope-protected.
- If the upstream Financial Datasets API returns Cloudflare 1010 locally, preserve the explicit browser-compatible `User-Agent` in `api/financial_datasets.py`.
- The root git repository is higher than this package directory: `/Users/8bit/bots/Cladwbot-solana/solana-clawd`.
- `backroom-3d/Agent-Trading-Arena` may appear as an untracked nested tree in the root repo; inspect before committing.
