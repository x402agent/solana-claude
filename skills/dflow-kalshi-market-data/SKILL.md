---
name: dflow-kalshi-market-data
description: Read market data for a known Kalshi prediction market on DFlow — orderbook, trades, top-of-book prices, candlesticks, forecast-percentile history, and Kalshi in-game live data — via one-shot REST snapshots, historical ranges, or live WebSocket streams. Use when the user asks "show me the orderbook for X", "get last hour of trades", "build a live price ticker", "stream orderbook depth", "pull 1-minute candles for the last day", "watch in-game scores for this sports market", or "alert me when the orderbook moves". Do NOT use to discover markets matching a criterion (use `dflow-kalshi-market-scanner`), to place orders (use `dflow-kalshi-trading`), or to read a user's own positions/P&L (use `dflow-kalshi-portfolio`).
---

# DFlow Kalshi Market Data

Pull data about a **known** Kalshi market (or set of markets) — orderbook, trades, prices, candles, forecasts, in-game live data — as a snapshot, a historical range, or a live stream.

## Prerequisites

- **DFlow docs MCP** (`https://pond.dflow.net/mcp`) — install per the [repo README](../../README.md#recommended-install-the-dflow-docs-mcp). This skill is the recipe; the MCP is the reference. Query params, pagination, exact payload schemas, WS snapshot-vs-diff semantics, and the category-specific `live_data.details` shapes all live there — don't guess.

## Surface

All data endpoints in this skill run against the **Metadata API** (`https://pond.dflow.net/build/metadata-api`) — REST for snapshots and history, WebSockets for live streams. Call it from anywhere: a `curl` from the command line, a Node/Python script, a cron job, a backend, or a Next.js proxy fronting a browser UI.

If the user says "run this from my terminal", **don't reach for the `dflow` CLI** — it has no market-data subcommands. Write a short HTTP/WS script against the Metadata API instead.

## Pick the shape first

Three intents, three shapes. Match the user's phrasing, then pick the endpoint:

- **Snapshot** ("right now", "current") → **REST**, one call.
- **History** ("last hour", "between T1 and T2", "last N trades") → **REST** with time / limit params.
- **Stream** ("live", "as it happens", "alert me when") → **WebSocket** subscription.

## Data → endpoint map

For each dataset below, the one-liner covers all three shapes. Field-level details (exact params, pagination tokens, payload schemas) → docs MCP.

### Orderbook
- Snapshot: `GET /api/v1/orderbook/{ticker}` or `/api/v1/orderbook/by-mint/{mint}` (includes `sequence`).
- Stream: `orderbook` channel (`yes_bids` + `no_bids` maps per update; no `sequence` on the stream payload).

### Trades — **two endpoints, overlapping but different scopes**
- **`GET /api/v1/trades`** (and `/trades/by-mint/{mint}`) — the **complete market print tape**. All trades that hit Kalshi's orderbook, which includes DFlow onchain fills (those hit Kalshi's book too; see the "Do onchain trades show up on Kalshi's trade websocket?" FAQ). This is the default for "show me trades on this market." Stream equivalent: `trades` channel.
- **`GET /api/v1/onchain-trades`** (and `/onchain-trades/by-market/{ticker}`, `/onchain-trades/by-event/{eventTicker}`) — **DFlow onchain fills only**, with onchain-specific fields that `/trades` doesn't carry: `wallet`, `transactionSignature`, `id`, `inputAmount`, `outputAmount`, `createdAt`. Subset of what's on `/trades`, but richer per-row. No WS stream.
- Decision: *complete tape* → `/trades`. *Wallet-scoped activity feed, DFlow-execution analytics, tx-signature lookups* → `/onchain-trades`. Real-time fill detection for a specific user order → parse program events directly (see [`/build/prediction-markets/onchain-trade-parsing`](https://pond.dflow.net/build/prediction-markets/onchain-trade-parsing)).

### Top-of-book prices
- Snapshot: read `yesBid` / `yesAsk` / `noBid` / `noAsk` directly from the market object (`GET /api/v1/market/{ticker}` — singular) — no separate endpoint.
- Stream: `prices` channel.

### Candlesticks (OHLCV)
- Market-level: `GET /api/v1/market/{ticker}/candlesticks` or `/api/v1/market/by-mint/{mint}/candlesticks`.
- Event-level: `GET /api/v1/event/{ticker}/candlesticks`.
- **5,000-candle cap per request** (see Gotchas).

### Forecast percentile history
- Event-level: `GET /api/v1/event/{seriesTicker}/{eventId}/forecast_percentile_history` (plus `/api/v1/event/by-mint/{mint}/forecast_percentile_history`). Kalshi's historical forecast distribution for an event.

### Live data (Kalshi passthrough)
- `GET /api/v1/live_data`, `/live_data/by-event/{ticker}`, `/live_data/by-mint/{mint}`.
- Response includes a `details` object whose **fields depend on the milestone type** — football, soccer, tennis, golf, MMA, baseball, cricket, racing each have their own known-field sets. See `live-data-details` in the docs MCP before touching `details`.

## Streaming lifecycle

Connect → subscribe → handle → reconnect. In a sentence each:

- **Connect**: dev is `wss://dev-prediction-markets-api.dflow.net/api/v1/ws` (no auth). Prod is `wss://prediction-markets-api.dflow.net/api/v1/ws` with `x-api-key` on the WS upgrade headers. REST equivalents: `https://dev-prediction-markets-api.dflow.net` and `https://prediction-markets-api.dflow.net`.
- **Subscribe**: send `{ type: "subscribe", channel: "prices" | "trades" | "orderbook", all: true | tickers: [...] }`. Each channel holds its own subscription state.
- **Handle**: parse each message by `channel`, process asynchronously — don't block the read loop.
- **Reconnect**: exponential backoff on disconnect, and **re-send every subscription** after reconnect. The server doesn't remember you.

Exact message schemas (prices, trades, orderbook), heartbeat/ping behavior, and incremental-vs-snapshot semantics on the orderbook channel → docs MCP.

## What to ASK the user (and what NOT to ask)

**Query shape — infer if unambiguous, confirm if not:**

1. **Which market** — ticker or outcome mint.
2. **Which dataset** — orderbook, trades (Kalshi vs onchain), prices, candles, forecasts, or live data.
3. **Snapshot / history / stream** — infer from phrasing, confirm if ambiguous.
4. **History bounds / interval** — time range (`startTs`, `endTs`) and `periodInterval` for candles; limit for trades.

**Infra — always ask, never infer:**

5. **DFlow API key.** **Ask with a clean, neutral question: *"Do you have a DFlow API key?"*** Don't presuppose where the key lives — phrasings like *"do you have it in env?"* or *"is `DFLOW_API_KEY` set?"* nudge the user toward env-var defaults they didn't ask for. Don't assume the user has one just because they mention the `dflow` CLI is configured. Surface the choice; don't silently fall back to env or to dev. It's **one key for everything DFlow** — same `x-api-key` unlocks the Trade API *and* the Metadata API, REST *and* WebSocket. If yes → prod host (`https://prediction-markets-api.dflow.net` REST, `wss://prediction-markets-api.dflow.net/api/v1/ws` WS) with `x-api-key` on every request (REST and the WS upgrade). If no → dev host (`https://dev-prediction-markets-api.dflow.net`, `wss://dev-prediction-markets-api.dflow.net/api/v1/ws`), rate-limited; point them at `https://pond.dflow.net/build/api-key` for a prod key. **When you generate a script, log the resolved host + key-presence at startup** so the user can see which rails they're on.

**Do NOT ask about:**
- **RPC, wallet, signing** — this skill is read-only public data.
- **Settlement mint / slippage / fees** — trade-side concerns; if the user pivots to placing an order off something they see here, hand off to `dflow-kalshi-trading`.

## Gotchas (the docs MCP won't volunteer these)

- **Two trade endpoints, overlapping scopes.** `/api/v1/trades` is the complete market tape (Kalshi-offchain order flow **plus** DFlow onchain fills — DFlow fills hit Kalshi's book). `/api/v1/onchain-trades` is the DFlow-onchain subset, enriched with `wallet` / `transactionSignature` / input-output amounts. When a user says "show trades on this market" they want `/trades`; when they say "show this wallet's DFlow activity" they want `/onchain-trades?wallet=...`.
- **Orderbook returns only bid ladders** (`yes_bids`, `no_bids`). Best YES *ask* is derived: `1 - max(no_bids keys)` (a NO bid at `p` is a YES offer at `1-p`). Same on REST and the WS channel.
- **Two price scales.** Probability strings (`"0.4200"`) on orderbook + prices channels. Integer 0–10000 on `/trades` + `trades` channel, with `yes_price_dollars` / `no_price_dollars` string companions. Normalize before you compute.
- **5,000-candle cap per request, hard 400.** If the range × interval would produce more than 5,000 candles, the endpoint returns a **400 with no partial result** — it's Kalshi's upstream cap forwarded through DFlow. Narrow the range, widen the interval, or page yourself.
- **`periodInterval` is in minutes, not seconds.** Kalshi convention: `1` = 1-minute candles, `60` = hourly, `1440` = daily. Easy to blow past the 5,000-candle cap by assuming seconds.
- **`live_data.details` is categorical, not generic.** Fields differ per milestone type. Don't hardcode cross-category field access; branch on `type` and pull the known fields for that category from the MCP's `live-data-details` reference.
- **WebSocket `all: true` is a firehose.** Especially on `prices` and `orderbook`. Use a ticker list unless the monitor truly needs universe-wide coverage.
- **WS subscriptions don't survive reconnects.** After every reconnect, resend every `subscribe` message you had before the drop.
- **Streams can go quiet in the maintenance window** — Thursdays 3:00–5:00 AM ET, Kalshi is offline; expect sparse or missing WS traffic and stale REST fields.
- **The CLI's stored key doesn't flow into your script's HTTP client.** `dflow setup` stores the key for the `dflow` binary's own use. The Metadata API calls your script makes directly are separate — they need the key plumbed in (env, `.env`, flag). It's one DFlow key, but two plumbing sites any time you mix CLI invocations with direct HTTP/WS calls in the same codebase.

## When something doesn't fit

For anything not covered above — full parameter lists, pagination tokens, exact WS message shapes (snapshot-vs-diff on orderbook, heartbeat cadence), candlestick interval enums, category-specific `live_data.details` fields, forecast-percentile response shape — query the docs MCP (`search_d_flow`, `query_docs_filesystem_d_flow`). Don't guess.

## Sibling skills

- `dflow-kalshi-market-scanner` — find markets matching a criterion across the universe (uses these primitives, shapes them into named scans).
- `dflow-kalshi-trading` — place buy / sell / redeem orders on a market you're watching here.
- `dflow-kalshi-portfolio` — view the user's own positions and P&L.
