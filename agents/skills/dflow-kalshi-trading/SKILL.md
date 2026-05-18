---
name: dflow-kalshi-trading
description: Buy, sell, or redeem YES/NO outcome tokens on Kalshi prediction markets via DFlow. Use when the user wants to bet on an event, place a Kalshi order, take a YES or NO position, exit a Kalshi position, redeem winning outcome tokens after a market resolves, tune priority fees on a PM trade, or build a gasless / sponsored PM flow where the app pays tx / ATA / market-init costs. Covers both the `dflow` CLI and the DFlow Trading API. Do NOT use to discover markets, view positions, stream prices, complete Proof KYC, or for non-Kalshi spot swaps.
---

# DFlow Kalshi Trading

Buy, sell, and redeem YES/NO outcome tokens on Kalshi prediction markets. PM trades are **imperative and asynchronous** — submit, then poll until terminal.

## Prerequisites

- **DFlow docs MCP** (`https://pond.dflow.net/mcp`) — install per the [repo README](../../README.md#recommended-install-the-dflow-docs-mcp). This skill is the recipe; the MCP is the reference. Look up endpoint shapes, parameter details, error codes, and anything else field-level via `search_d_flow` / `query_docs_filesystem_d_flow` — don't guess.
- **`dflow` CLI** (optional, for command-line/agent use) — install per the [repo README](../../README.md#recommended-install-the-dflow-cli).

## Choose your surface

- **CLI** — command line, scripts, local agents. Manages keys, signs, submits, polls.
- **API** — web/mobile apps with a browser wallet (Phantom, Privy, Turnkey, etc.). Wallet handles signing + RPC; app must proxy HTTP through its backend (the Trading API serves no CORS).

If unclear, ask once: *"From the command line, or wired into an app?"*

## Workflows

All three workflows assume the user already has a **market ledger mint** (CLI; the `marketLedger` field on the Metadata API market object) or an **outcome mint** (API; `yesMint` / `noMint`) in hand. If they only have a ticker / event name, defer to `dflow-kalshi-market-scanner`.

**One market, two settlement rails.** Every initialized Kalshi market on DFlow exposes **both** a USDC rail and a CASH rail in `market.accounts` — each with its own `marketLedger`, `yesMint`, and `noMint`. They share an orderbook (the top-level `yesBid` / `yesAsk` / `volume24hFp` are market-wide), but trades and holdings are rail-scoped: USDC-rail YES tokens are a different SPL mint from CASH-rail YES tokens and aren't fungible. **Default to the USDC rail** unless the user holds CASH, explicitly asks for CASH, or the active DFlow vault only has CASH. Don't write defensive "fall back to CASH if USDC rail missing" code — it never fires, and it hides the rail choice from the user. State the default at the top of the script instead.

**Settlement mint constants** (Solana, Token-2022 for CASH and the classic SPL token program for USDC):
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- CASH: `CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH`

Use these as the keys into `market.accounts[mint]` when picking a rail. There is **no top-level `market.settlementMint` field** on the `/markets` response (despite what some recipe snippets might suggest with `market.accounts?.[market.settlementMint]` — that pattern shows up in *position-side* code, where the rail is already known from the held outcome mint, not in market-discovery code). Key by the mint directly.

### Buy (open or increase a YES/NO position)

1. Confirm the buy gates (KYC + geo + maintenance window) are passable for *this* user — see Gotchas.
2. Submit the order with the **settlement mint as input** (USDC or CASH) and the **outcome mint as output**.
3. Poll status until terminal (`closed` / `expired` / `failed`).

- CLI: `dflow trade <atomic-amount> USDC --market <marketLedger> --side yes|no` — auto-polls for up to 120s. `<FROM>` accepts either the base58 mint or the shorthand `USDC` / `CASH` (CLI resolves a small symbol set, same as spot). `--market` takes the `marketLedger` for the settlement track matching the `<from>` arg — i.e. `market.accounts[<USDC-or-CASH-mint>].marketLedger` on the Metadata API response. The CLI derives the YES/NO outcome mint from `--side` + `<from>`, so **the same `marketLedger` value is used for both `--side yes` and `--side no`**. Don't pass a `yesMint` / `noMint` here — those are inputs to the API surface, not the CLI. The docs' "market mint" and "market ledger mint" phrasing both refer to this one field.

**"Buy N whole contracts" from a scan snapshot.** Kalshi buys submit a USDC amount and get back as many whole contracts as it covers, refunding leftovers. When you're executing N contracts off a snapshotted `yesAsk`, compute `Math.ceil(N * yesAsk * 1e6)` atomic USDC and optionally add a small buffer (≤ ~1%, a few basis points is typically enough) so a tick-up in the ask between scan and submit doesn't leave you with N-1. Leftover stablecoin is refunded by the CLP, so over-funding slightly is cheap insurance. Don't over-fund by more than a percent or two — at some point it's no longer insurance, it's a different order size.
- API: `GET /order?userPublicKey=&inputMint=<settlement>&outputMint=<yesMint|noMint>&amount=<atomic>`, then sign + submit + poll `/order-status`. The API takes the outcome mint directly (no `--market` indirection). Field details via the docs MCP.

### Sell (decrease or close)

Flip the mints — outcome in, settlement out. **No KYC required.** No `--market` / `--side` on the CLI; pass the outcome mint as the FROM positional and the CLI auto-resolves the settlement mint.

- CLI: `dflow trade <atomic-outcome> <outcome-mint>`
- API: same `/order` call as buy, with input/output mints flipped.

### Redeem (post-settlement)

Once the market is `determined` / `finalized` **and** `redemptionStatus: "open"`, redemption is just a regular sell of the winning side back to the settlement mint. No special flag, no KYC.

## What to ASK the user (and what NOT to ask)

**Trade shape — infer if unambiguous, confirm if not:**

1. **Operation** — buy / sell / redeem. Infer from intent ("bet on X" → buy YES; "cash out" → sell; "my YES tokens just won" → redeem). Don't make the user pick a mode.
2. **Market + side** — for CLI: the `marketLedger` (from `market.accounts[<settlement-mint>].marketLedger`) plus `--side yes|no`. For API: the YES or NO outcome mint directly as `outputMint`.
3. **Settlement rail** — USDC or CASH. Both exist on every initialized market; default to USDC unless the user says otherwise. This determines which `marketLedger` (CLI) or `yesMint` / `noMint` (API) you use.
4. **Amount in atomic units** — every Kalshi mint is **6 decimals** (`8_000_000` = $8 of USDC; `10_000_000` = 10 outcome tokens). Buys submit settlement-mint amounts (USDC/CASH); sells/redeems submit outcome-token amounts.

**Infra — always ask, never infer:**

5. **API only — wallet pubkey** (base58). Required for every `/order` call.
6. **API only — DFlow API key** (only when the script is making direct HTTP calls to `/order` or other Trade API endpoints; pure CLI scripts don't need one — see the "two auth paths" gotcha). **Ask with a clean, neutral question: *"Do you have a DFlow API key?"*** Don't presuppose where the key lives — phrasings like *"do you have it in env?"* or *"is `DFLOW_API_KEY` set?"* nudge the user toward env-var defaults they didn't ask for. Surface the choice; don't silently fall back to env or to dev. It's **one key for everything DFlow** — same `x-api-key` unlocks the Trade API *and* the Metadata API, REST *and* WebSocket. If yes → prod host `https://quote-api.dflow.net` with `x-api-key` on every request. If no → dev host `https://dev-quote-api.dflow.net` (same features, rate-limited). Point them at `https://pond.dflow.net/build/api-key` for a prod key. **When you generate a script that does its own HTTP, log the resolved host + key-presence at startup** so the user can see which rails they're on.
7. **Priority fee (both surfaces)** — "Any priority-fee preference, or just use DFlow's default?" Default on both surfaces = DFlow-auto, capped at 0.005 SOL (documented default on `/order`). Surface this explicitly so the user knows the lever exists for congested periods or cost-sensitive flows. Don't editorialize about what percentage of trades this covers — DFlow doesn't publish one and you don't know.
   - **API** — pass `prioritizationFeeLamports` on `/order`: `auto` | `medium` | `high` | `veryHigh` | `disabled` | integer lamports. Live estimates for tuning: `GET /priority-fees` (snapshot), `/priority-fees/stream` (WebSocket). (`/intent` doesn't apply to Kalshi — PM is imperative-only.)
   - **CLI** — no tuning flag; `dflow trade` always uses the server-side default. If the user needs finer control (an exact lamport value, or `disabled`), they'll have to drop to the API.
8. **Sponsored / gasless (API only — skip for CLI)** — "Does the user need to hold SOL for this trade, or is your app covering fees?" Default = user pays everything. Two levers on `/order`, depending on what you want to cover:
   - `sponsor=<sponsor-wallet-base58>` — sponsor pays tx fee + ATA creation + market-init. Tx must be co-signed by both user and sponsor. Optional `sponsorExec=true|false` picks sponsor-executes (default) vs. user-executes.
   - `predictionMarketInitPayer=<wallet>` — covers *only* the one-time market-init rent; user still signs and pays their own tx fee and ATA creation. Useful when you only want to eat the init cost. Markets can also be pre-initialized out-of-band via `GET /prediction-market-init`.
   - The CLI doesn't support either sponsorship lever.

**Do NOT ask about:**

- **RPC** — CLI users set it during `dflow setup`. API users on a browser wallet never need their own RPC (the wallet handles it). Only ask if signing server-side. When one is needed, suggest [Helius](https://helius.dev).
- **Slippage** — both surfaces default to `"auto"`, which is right for CLP-sourced fills. Override only on explicit user request (`--slippage` CLI; `predictionMarketSlippageBps` API).
- **Platform fee** — defer to `dflow-platform-fees` if the user pivots there.

## Gotchas (the docs MCP won't volunteer these)

- **Token-2022 outcome mints.** Kalshi outcome mints use the Token-2022 program. Declarative trades (`/intent`) don't support Token-2022 — that's why Kalshi is imperative-only.
- **All Kalshi mints are 6 decimals.** USDC, CASH, every outcome token. Always pass atomic units to the API.
- **Buys are whole-contract only — no fractional contracts.** Submit a USDC/CASH amount; the system buys as many whole contracts as that amount covers and **refunds any leftover stablecoin**. Per-order floor is **0.01 USDC**, but the practical floor in any given market is one contract at the current YES/NO price (e.g. if YES is trading at 0.43, you need ≥ `430_000` atomic = $0.43). Quote first if the user is anywhere near the floor.
- **Async fills, no exceptions.** PM `/order` returns `executionMode: "async"`. The transaction landing onchain is *not* the fill — the order can still expire or fail in the CLP. Always poll `/order-status` to a terminal state. CLI auto-polls for 120s; on timeout, follow up with `dflow status <orderAddress> --poll`.
- **Buy gates exist; check once per session, not per call.**
  - **Proof KYC** — required to buy (not sell, not redeem). Hit `GET https://proof.dflow.net/verify/{address}` (public, no auth) once at session start, cache `{ verified: boolean }`, gate the buy UI off the cache. `/order` is still authoritative; on the rare miss, fall back on `unverified_wallet_not_allowed` (API) / `PROOF_NOT_VERIFIED` (CLI) using `details.deepLink`.
  - **Geoblock** — restricted in some jurisdictions. API builders enforce in their own UI (cache the user's country once per session). The CLI handles this internally and returns `category: "geoblock"`. Policy: `https://pond.dflow.net/legal/prediction-market-compliance`.
- **Maintenance window.** Kalshi is offline **Thursdays 3:00–5:00 AM ET, every week**. CLPs stop serving routes; `/order` returns `route_not_found` (the CLI annotates with a maintenance note). Block PM submissions for the whole window.
- **`route_not_found` is a catch-all.** Wrong mint, amount below the contract-price floor, no liquidity right now, *or* the maintenance window. Verify mint, atomic units, and that the amount covers ≥ 1 contract before assuming illiquidity.
- **Browser apps must proxy.** The Trading API serves no CORS — call it from a backend (Next.js API route or equivalent), never directly from the browser.
- **CLI shell-outs authenticate themselves; direct HTTP calls don't.** If your script or backend shells out to `dflow trade`, that leg uses the CLI's stored config from `dflow setup` (key, wallet, RPC) — **you plumb nothing** for CLI invocations. If the same script *also* hits the Trade API or Metadata API directly over HTTP (e.g. scanner-style discovery, your own `/order` call, `/quote`, sibling HTTP tools), that HTTP client needs the key handed in explicitly (env var, `.env`, `--api-key` flag, header). The CLI's stored key is not reusable by a sibling HTTP client, and an env-var key is not injected into the CLI either — they're independent plumbing sites for the same DFlow key. **Only ask about an API key for the HTTP portion; pure CLI scripts don't need one.**

## When something doesn't fit

For anything not covered above — full parameter lists, full error tables, response schemas, partial-fill handling, rare flags, new features — query the docs MCP (`search_d_flow`, `query_docs_filesystem_d_flow`). Don't guess.

For runnable code, point the user at the **DFlow docs recipes** (each links to the DFlow Cookbook Repo for clone-and-go): [`/build/recipes/prediction-markets/increase-position`](https://pond.dflow.net/build/recipes/prediction-markets/increase-position), [`/build/recipes/prediction-markets/decrease-position`](https://pond.dflow.net/build/recipes/prediction-markets/decrease-position), [`/build/recipes/prediction-markets/redeem-outcome-tokens`](https://pond.dflow.net/build/recipes/prediction-markets/redeem-outcome-tokens).

## Sibling skills

Defer if the user pivots to:

- `dflow-kalshi-market-scanner` — discover markets, filter by event/category
- `dflow-kalshi-market-data` — live prices, orderbooks, streams
- `dflow-kalshi-portfolio` — view positions, unrealized P&L
- `dflow-proof-kyc` — set up Proof verification on a wallet
- `dflow-platform-fees` — charge a builder fee on PM trades
- `dflow-spot-trading` — non-Kalshi token swaps
