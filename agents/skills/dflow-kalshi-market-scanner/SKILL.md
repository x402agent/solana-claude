---
name: dflow-kalshi-market-scanner
description: Find Kalshi prediction markets on DFlow that match a criterion — arbitrage (YES+NO<$1), cheap long-shots, near-certain short-dated plays, biggest movers, widest spreads, highest volume, closing soonest, and series/event-level scans. Use when the user asks "where's the free money?", "any mispriced markets?", "cheap YES with volume", "what moved today?", "markets closing soon", "cheapest YES in this event", "top markets by volume", or "alert me when X happens" (streaming). Do NOT use to place orders (use `dflow-kalshi-trading`), to view a user's own positions (use `dflow-kalshi-portfolio`), or for general live-data plumbing unrelated to a scan (use `dflow-kalshi-market-data`).
---

# DFlow Kalshi Market Scanner

Find Kalshi markets that match a **criterion**. This skill is a set of named **scans** (filter-and-rank recipes) over the DFlow Metadata API.

## Prerequisites

- **DFlow docs MCP** (`https://pond.dflow.net/mcp`) — install per the [repo README](../../README.md#recommended-install-the-dflow-docs-mcp). This skill is the recipe; the MCP is the reference. Look up exact query params, pagination, response shapes, and anything else field-level via `search_d_flow` / `query_docs_filesystem_d_flow` — don't guess.

## Surface

All scans here run against the **Metadata API** (`https://pond.dflow.net/build/metadata-api`) — REST for point-in-time queries, WebSockets for continuous streams. You can call both from anywhere: a quick `curl` from the command line, a Node/Python script, a cron job, a backend service, or a Next.js route proxying a browser UI.

If the user says "run this from my terminal", **don't reach for the `dflow` CLI** — it has no discovery subcommands. Write a short HTTP/WS script that hits the Metadata API instead.

## The scanner skeleton

Every scan is the same four steps. Build around this pattern — don't reinvent it per scan:

1. **Enumerate the universe** — `GET /api/v1/markets` (flat) or `GET /api/v1/events?withNestedMarkets=true` (grouped). Filter to `status=active`. Page through until done (see the pagination gotcha for the `{ markets, cursor }` shape). Pass `isInitialized=true` only if the user wants markets tradable on DFlow *right now* (see Gotchas).
2. **Grab the per-market signal.** For top-of-book scans the signal is already on the market object — `yesBid` / `yesAsk` / `noBid` / `noAsk` (4-decimal probability strings), `volume24hFp` / `volumeFp` / `openInterestFp` (dollar-equivalent strings), `closeTime` (unix) — **no orderbook call needed**. For momentum use candlesticks or the `prices` / `trades` WebSocket channels. For ladder depth use `/api/v1/orderbook/by-mint/{mint}`. For recent prints use `/api/v1/trades` or the `trades` channel.
3. **Compute the metric.**
4. **Filter and rank.** Return the top-N (default 10, ask if the user wants more).

### Polling vs streaming

Pick the mode that fits the intent:

- **Polling (REST)** — right when the user wants a snapshot ("show me the top 10 right now", "list all markets with X"). Re-run on a cadence if they want it fresh.
- **Streaming (WebSocket)** — right when the user wants to *act on an event* as it happens ("alert me when YES+NO drops below $1", "flag any market that moves > 5% in a minute", "trade when X trades"). Subscribe to the relevant channel (`prices`, `trades`, `orderbook`) at `wss://<host>/api/v1/ws` and compute the metric on each update. For the full streaming plumbing (reconnection, backoff, subscription lifecycle), hand off to `dflow-kalshi-market-data`.

Exact endpoint params, channel payloads, and pagination → docs MCP.

## Scans to offer

Each scan = a user question + a metric. Plug the metric into the skeleton.

**Prefer rank-based filters over fixed numeric thresholds.** Kalshi volume alone spans 5+ orders of magnitude across active markets — any hardcoded dollar floor is either a pass-through (too low) or excludes everything (too high), and it drifts as the platform grows. When a scan needs "busy" or "cheap" or "moved a lot," compute the cutoff from the scan result (percentile of the current universe), not from a number baked in here.

Only use a fixed number when it's **semantic** — e.g. `YES + NO < $1.00` for arbitrage (that's the no-arb invariant, not a tunable), or `status=active` (a field value, not a threshold). If the user supplies a specific number, use theirs. If the user's phrasing implies a threshold you don't have ("serious volume", "big movers"), ask them — don't guess.

### 1. Arbitrage — `YES + NO < $1`

*"Find markets where I can buy both sides for under a dollar."*
- Metric: `parseFloat(yesAsk) + parseFloat(noAsk) < 1.00`. Semantic threshold — the no-arb invariant; keep this one fixed.
- Rank: largest gap (`1 - sum`) descending.
- Skip rows where either `yesAsk` or `noAsk` is null (no resting ask on that side — not a real arb).

### 2. Long-shot YES

*"Cheap YES that's actually trading."*
- Rank by `parseFloat(volume24hFp)` descending, take the **top quartile of the active universe** as the "actually trading" pool (compute the 75th-percentile cutoff from the scan, don't hardcode a dollar figure).
- Within that pool, sort by `parseFloat(yesAsk)` ascending and return the bottom-N cheapest. If the user supplies a cap ("under 20¢", "under 3¢") use theirs; otherwise rank-only — **don't invent a cents ceiling**. "Cheap" isn't a fixed number; what counts as a long-shot depends on how much the user is willing to tolerate.
- Alternate rank for "best expected payoff": `parseFloat(volume24hFp) / parseFloat(yesAsk)` — busy and cheap at once. Ask the user which they want if ambiguous.
- A cheap market with no volume is a zombie ticker, not a long-shot. Volume-rank first, then look at price — that's the order that filters noise.

### 3. Near-certain short-dated YES

*"YES above 97¢ closing soon — grind the theta."*
- Filter: `parseFloat(yesAsk)` above a user-supplied threshold. "Near-certain" is a phrase, not a number — if the user says 97¢, use 0.97; if they say 99¢, use 0.99. If they just say "near-certain" with no number, ask them what bar they want (95¢? 99¢?). **Don't invent a default cutoff.**
- Rank: `closeTime` ascending — soonest-to-close first.
- Return top-N. If the user specifies a window ("under 48h", "this week"), apply that as an override; don't invent a default window.

### 4. Momentum

*"What moved in the last hour?"* or *"Alert me when something moves"*
- **Polling**: `/api/v1/market/{ticker}/candlesticks` (or `/market/by-mint/{mint}/candlesticks`) per market at the smallest interval, compare latest close vs the close N minutes ago. Per-market and expensive — pre-filter the universe to top-of-volume first (re-use scan #6's ranking, take top-N busy markets, compute momentum on those).
- **Streaming**: subscribe to the `prices` channel (`all: true` or a ticker list) and compute rolling pct change in memory. Much cheaper for the "alert when X happens" variant, and this is how you'd wire "trade when a market moves > N%" (hand the matching market to `dflow-kalshi-trading`).
- Rank by absolute pct change (two-sided) or signed (directional) over a **user-supplied window** — default to 60 minutes if they don't specify, but no default pct threshold. Return top-N. If the user says "moved > N%" they supply N.

### 5. Widest bid-ask spreads

*"Inefficient markets — market-make or avoid."*
- Metric: `parseFloat(yesAsk) - parseFloat(yesBid)` (NO side is symmetric).
- Rank: spread descending.
- Source: market object; no extra calls.

### 6. Highest volume

*"Where's the action?"*
- Metric: `parseFloat(volume24hFp)` (24h dollar-equivalent) or sum over `/api/v1/trades` since a cutoff (intraday). For a live feed, subscribe to the `trades` channel and aggregate in a rolling window.
- Rank: volume descending.

### 7. Closing soonest

*"Theta clock."*
- Metric: `closeTime - now`.
- Rank: ascending.
- Most useful stacked with scan 3 ("near-certain AND closing soon") or scan 6 ("busy AND closing soon").

### 8. Event- and series-level scans

*"Cheapest YES across all outcomes in this event", "do mutually-exclusive buckets sum > 1?"*
- **Within one event** (e.g. "Fed raises rates by X bps" with a bucket per outcome): pull `GET /api/v1/event/{eventTicker}?withNestedMarkets=true`, then reduce across the nested markets (`min(yesAsk)`, `Σ yesAsk`, etc.). Events are the natural scope for single-winner scans.
- **Across a series**: pull `GET /api/v1/series/{seriesTicker}` plus its events, then roll up.
- **There is no `mutuallyExclusive` flag on series or events.** Summing YES across outcomes only makes sense when the outcomes are a partition of one future (one must happen, exactly one can happen). That's a judgment from the event/series title and contract terms — not a field lookup. When in doubt, surface the numbers and flag the assumption to the user.

## Point lookups (N=1)

When the user already has one market in mind, skip the skeleton:
- By ticker: `GET /api/v1/market/{ticker}` (singular `market`, not plural).
- By outcome mint: `GET /api/v1/market/by-mint/{mint}` (slash, not hyphen).
- By event ticker: `GET /api/v1/event/{eventTicker}?withNestedMarkets=true` (singular `event`).
- Free-text: `GET /api/v1/search` (natural-language to events/markets).

The plural forms (`/markets`, `/events`) are the **list** endpoints and take `?cursor=&limit=` for pagination. The singular forms are **point lookups** by id. Mixing them up gets you 404s.

## What to ASK the user (and what NOT to ask)

**Query shape — infer if unambiguous, confirm if not:**

1. **Which scan** (or a plain-English intent you can map to one).
2. **Thresholds the user supplies — use theirs verbatim.** If they say "> 5%" or "under 2¢" or "this week", use those numbers. Otherwise, use the rank-based defaults from each scan above (top quartile by volume, etc.); **do not propose a fixed numeric threshold of your own**. If the user's phrasing implies a threshold the scan doesn't define ("big movers", "serious volume"), ask them — don't guess a number.
3. **Polling vs streaming** — if the intent sounds like "show me now" go REST; if it sounds like "alert me / react when" go WebSocket.
4. **Top-N** (default 10).

**Infra — always ask, never infer:**

5. **DFlow API key** — for the discovery / HTTP portion of the script only; CLI shell-outs authenticate themselves (see the "two auth paths" gotcha below). **Ask with a clean, neutral question: *"For the scanner / discovery side, do you have a DFlow API key?"*** Don't presuppose where the key lives — phrasings like *"do you have it in env?"* or *"is `DFLOW_API_KEY` set?"* nudge the user toward env-var defaults they didn't ask for. Surface the choice; don't silently fall back to env or to dev. It's **one DFlow key everywhere** — same `x-api-key` unlocks the Trade API *and* the Metadata API, REST *and* WebSocket. If yes → prod hosts (`https://prediction-markets-api.dflow.net` REST, `wss://prediction-markets-api.dflow.net/api/v1/ws` WS) with `x-api-key` on every request (REST and the WS upgrade). If no → dev hosts (`https://dev-prediction-markets-api.dflow.net`, `wss://dev-prediction-markets-api.dflow.net/api/v1/ws`), rate-limited; point them at `https://pond.dflow.net/build/api-key` for a prod key. **When you generate a script, log the resolved host + key-presence at startup** (`Using prod Metadata API` / `Using dev Metadata API — rate-limited`) so the user can see which rails they're on without spelunking through code.

**Do NOT ask about:**
- **RPC, wallet, signing** — this skill is read-only public metadata. No transactions.
- **Settlement mint / slippage / fees** — those are trade-side concerns. If the user pivots to placing an order on a market you surfaced, hand off to `dflow-kalshi-trading`.

## Gotchas (the docs MCP won't volunteer these)

- **Top-of-book lives on the market object.** `yesBid` / `yesAsk` / `noBid` / `noAsk` are already there. Don't loop the orderbook endpoint just to get best prices.
- **Prices and volume are market-wide; trading is rail-scoped.** Every initialized market has both a USDC rail and a CASH rail under `market.accounts`, each with its own `marketLedger` / `yesMint` / `noMint`. The scan's `yesBid` / `yesAsk` / `volume24hFp` come off the shared Kalshi orderbook and don't tell you which rail you'll trade on. When handing off to `dflow-kalshi-trading`, pass the market ticker and let the trading step pick the rail (default: USDC). Don't silently pre-select a rail in the scan output — state it if you do.
- **The orderbook returns only bid ladders** (`yes_bids`, `no_bids`). Best YES *ask* is derived: `1 - max(no_bids keys)` (a NO bid at `p` is a YES offer at `1-p`). Only matters if the user wants ladder depth.
- **Two price scales.** Market/orderbook prices are 4-decimal probability strings (`"0.4200"`). Trade prices (REST and `trades` channel) are integer 0–10000, with `yes_price_dollars` / `no_price_dollars` string fields alongside. Normalize before you compute.
- **`market.title` is often event-level, not market-specific.** On multi-outcome events (a market per candidate, per rate-hike bucket, per game winner, etc.), every market under that event shares the same `title` — the outcome-specific wording lives in `yesSubTitle` (and `noSubTitle`). If your scan output only prints `title`, adjacent rows look identical and the user can't tell which outcome is which. Render `title — yesSubTitle` (or fall back to just `title` when `yesSubTitle` is null / empty, which happens on simple binary markets). Same applies when you hand a market off to a trade prompt: a "buy YES on X" confirmation that just shows `title` is ambiguous for multi-outcome events.
- **Volume fields — string, dollar-equivalent, and no `volume24h`.** The market object has `volume` (int, cumulative raw units), `volumeFp` (string, cumulative dollar-equivalent), and **`volume24hFp`** (string, 24h dollar-equivalent). There is *no* `volume24h` field. Always `parseFloat` the `*Fp` fields before comparing. Same shape on `openInterest` / `openInterestFp`.
- **`isInitialized` filter.** Short-duration markets (15-min crypto, etc.) are often active on Kalshi but not yet tokenized on DFlow. Without the filter, scans include them; with `isInitialized=true`, only markets tradable on DFlow right now. Usually you want `true`.
- **Null bids/asks.** Illiquid markets have null top-of-book fields. Every scan that reads them must skip nulls, not treat them as zero.
- **Maintenance window** — Kalshi is offline **Thursdays 3:00–5:00 AM ET**. Top-of-book and volume fields can go stale or missing during the window; WS updates can go quiet. If scans look empty or weirdly wrong during the window, that's why.
- **Pagination shape.** `/markets` (and `/events`) return `{ markets: [...], cursor: <number> }`. First call: omit `cursor` or pass `cursor=0` — equivalent. The returned `cursor` is the offset of the next page (= running row count); pass it back as `?cursor=N` on the next call. Terminate when `markets.length < limit` (canonical); a `next === cursor` sanity check is harmless paranoia but not necessary. `limit` caps at **255** — `limit=256`+ returns HTTP 400 `"number too large to fit in target type"` (it's a `u8` on the backend). Docs use `200` as a conservative default; `255` is the true ceiling. Large scans that skip pagination silently drop matches.
- **WebSocket `all: true` is firehose-y.** Subscribing `all: true` on busy channels (esp. `prices`) streams every update across every market. Prefer ticker lists when the scan only cares about a known set; use `all: true` only when the scan really is universe-wide.
- **"Scan then buy" = one interactive script, not two separate artifacts.** When the user wants to find markets *and then act on the result* from the command line, the right output is a single script that scans, prints the ranked list, prompts the user to pick one (or confirm y/N per row), and then shells out to `dflow trade`. Don't write a non-interactive scan script and tell the user to "pick one and run `dflow trade` yourself" — that forces them to context-switch and copy identifiers around. A `readline` prompt in Node / `input()` in Python is fine. For full-auto flows (no per-row prompt), still keep it one script and make the "no confirmation" behavior explicit up front.
- **Handoff shape to `dflow trade`.** The scan result is a market object, not a CLI-ready invocation. The CLI's `--market` flag takes the **`marketLedger`** from `market.accounts[<settlementMint>].marketLedger` — not `market.ticker`, not `yesMint` / `noMint`, not any top-level mint. Default to the USDC rail unless the user says CASH (see the "prices and volume are market-wide; trading is rail-scoped" gotcha above). The same `marketLedger` is used for both YES and NO buys — side selection is `--side yes|no`, not a different `--market`. For the full CLI argument shape (settlement-mint → `marketLedger` lookup, atomic-unit conversion, priority-fee flags, the "buy N whole contracts" idiom), see `dflow-kalshi-trading`. Don't reinvent it here.
- **Mixed-surface scripts: two auth paths, not one.** The natural shape of this skill plus `dflow-kalshi-trading` is a script that does discovery over the Metadata API, then shells out to `dflow trade` for execution. The two legs authenticate independently:
  - **Discovery (Metadata API HTTP)** — plain `fetch` / `curl`. Needs a DFlow API key in the script's env or config (see #5). No key → dev host, rate-limited.
  - **Execution (`dflow trade` shell-out)** — uses whatever the CLI has stored from `dflow setup` (key, wallet, RPC). The script plumbs **nothing** for CLI invocations.

  When a user says "the CLI is already set up," that's the execution leg covered — not the discovery leg. Frame the API-key ask as *"for the scanner/discovery side, do you have a DFlow API key?"* — not as *"the CLI isn't enough, you need another key."* The two are independent: one DFlow key, two plumbing sites.

## When something doesn't fit

For anything not covered above — full parameter lists, pagination tokens, response schemas, WS reconnection semantics, rare filters (sports, tags, categories, series search), candlestick intervals — query the docs MCP (`search_d_flow`, `query_docs_filesystem_d_flow`). Don't guess.

## Sibling skills

When the user pivots from discovery to action, hand off:
- `dflow-kalshi-trading` — actually buy/sell/redeem a market you found here.
- `dflow-kalshi-portfolio` — view *their* positions and P&L.
- `dflow-kalshi-market-data` — general live orderbook / trade / price streaming outside the "named scan" shape (reconnection patterns, full payload schemas, in-game live data).
- `dflow-proof-kyc` — verify a wallet so it can actually buy what you surfaced.
