---
name: dflow-kalshi-portfolio
description: View what a wallet holds on DFlow's Kalshi prediction markets — current positions, unrealized mark-to-market, realized P&L, activity history, and redeemable winners. Use when the user asks "what are my positions?", "what do I own?", "am I up or down?", "what's my fill history?", "what can I redeem?", "mark my portfolio to market", or "show me this wallet's DFlow activity". Read-only. Do NOT use to place sells or redemptions (use `dflow-kalshi-trading`), for market-wide data unrelated to a wallet (use `dflow-kalshi-market-data`), or to discover new markets (use `dflow-kalshi-market-scanner`).
---

# DFlow Kalshi Portfolio

Read-only views on a wallet's Kalshi activity — holdings, mark-to-market valuations, realized P&L, fill history, redeemable positions.

## Prerequisites

- **DFlow docs MCP** (`https://pond.dflow.net/mcp`) — install per the [repo README](../../README.md#recommended-install-the-dflow-docs-mcp). This skill is the recipe; the MCP is the reference. Look up exact response shapes, pagination, and batch-endpoint payloads via `search_d_flow` / `query_docs_filesystem_d_flow` — don't guess.
- **`dflow` CLI** (optional, for the fast-path holdings view) — install per the [repo README](../../README.md#recommended-install-the-dflow-cli).

## Surface

**There is no `/positions` endpoint.** A portfolio is assembled by hand from onchain wallet balances + metadata joins. Two ways to do it:

- **CLI — `dflow positions`** — one command, dumps spot + outcome tokens for the **active vault wallet** with balances and market labels. Covers "what do I hold right now?" on the CLI, and the stablecoin `uiAmount` already reads as USD. Doesn't carry mark prices for outcome tokens, `redemptionStatus`, or fill history, so outcome-token valuation, redemption checks, and P&L still need the API pipeline. Active-vault only.
- **API — build-your-own pipeline** — needed whenever the user wants any of: mark-to-market, P&L, activity history, redemption eligibility, *or* to inspect a wallet that isn't the CLI's active vault.

## Quick path: `dflow positions` (CLI)

Output (single JSON envelope, same on every wallet):

```json
{
  "ok": true,
  "data": {
    "wallet": "<pubkey>",
    "positions": [
      { "type": "spot",    "mint": "...", "symbol": "USDC", "amount": "1326161", "uiAmount": 1.326161, "decimals": 6 },
      { "type": "outcome", "mint": "...", "symbol": "DFlowYU0192", "amount": "2000000", "uiAmount": 2.0, "decimals": 6,
        "side": "yes", "market": { "title": "...", "status": "active" } }
    ]
  }
}
```

- `type: "spot"` — SOL, USDC, CASH, and anything else in the wallet.
- `type: "outcome"` — Kalshi outcome token; additionally carries `side` (`"yes"` | `"no"`) and a minimal `market` (`title`, `status`).
- No flag to inspect another wallet. For that, use the API pipeline.

## Full path: build-your-own (API)

The canonical pipeline, from the DFlow recipe [`/build/recipes/prediction-markets/track-positions`](https://pond.dflow.net/build/recipes/prediction-markets/track-positions):

1. **Read wallet balances via Solana RPC** — `getParsedTokenAccountsByOwner(wallet, { programId: TOKEN_2022_PROGRAM_ID })`. Outcome tokens are Token-2022. (For stablecoin balances, also query the classic SPL token program.)
2. **`POST /api/v1/filter_outcome_mints`** — send the wallet's mint list, get back just the PM outcome mints.
3. **`POST /api/v1/markets/batch`** — fetch full market metadata for those outcome mints (title, status, closeTime, `yesBid` / `yesAsk` / `noBid` / `noAsk`, `redemptionStatus`, `accounts.yesMint` / `noMint`).
4. **Join** — map each holding to its market; determine YES vs NO by matching the held mint against `accounts.yesMint` / `accounts.noMint`.

Field-level detail (response envelopes, pagination) → docs MCP.

## Views on top of the pipeline

### Current positions
Output of the pipeline above. Optionally attach current mark price per position (`yesBid` for YES holdings, `noBid` for NO holdings — see mark-to-market below).

### Unrealized mark-to-market
Value each outcome holding at the **bid on its side** (what you could sell it for), not the ask:
- Long YES → `uiAmount * parseFloat(yesBid)`
- Long NO → `uiAmount * parseFloat(noBid)`

Sum across positions for a wallet-level unrealized value. Subtract cost basis (below) for unrealized P&L.

### Realized activity and P&L
`GET /api/v1/onchain-trades?wallet=<pubkey>&sortBy=createdAt&sortOrder=desc&limit=N` — DFlow-indexed view of the wallet's onchain fills.

- **Activity feed**: each row has `createdAt`, `marketTicker`, `side`, `inputAmount`, `outputAmount`, `transactionSignature`.
- **Cost basis per market**: track net settlement-mint flow per outcome mint (settlement-in on buys minus settlement-out on sells).
- **Fees**: sum `feeAmount` across fills in the settlement mint.

### Redeemable sweep
A holding is redeemable iff **all three**:
- market `status` is `determined` or `finalized`,
- market `redemptionStatus` is `"open"`,
- the held outcome mint is the **winning** side (from market `result`).

To redeem, hand off to `dflow-kalshi-trading` (redemption is a sell of the winning side back to the settlement mint).

### Pending order check
If the app submitted the order itself, persist the `orderAddress` returned at submission and poll `GET /order-status?orderAddress=<addr>` until terminal. There's no list-by-wallet endpoint. Most fills terminate well under the CLI's 120s poll budget, so this is rarely a user-facing concern — but outside the maintenance window, don't assume a specific fill time.

## What to ASK the user (and what NOT to ask)

**View shape — infer if unambiguous, confirm if not:**

1. **Which view** — holdings / mark-to-market / realized P&L / activity / redeemable.
2. **Wallet pubkey** — API only (CLI uses the active vault wallet).

**Infra — always ask, never infer (HTTP/RPC pipeline only; the `dflow positions` quick path needs neither):**

3. **DFlow API key** (only when the script is hitting the Metadata API directly — `markets/batch`, `onchain-trades`, etc.). The CLI quick path (`dflow positions`) doesn't need one — it uses the CLI's stored config. **For the HTTP pipeline, ask with a clean, neutral question: *"Do you have a DFlow API key?"*** Don't presuppose where the key lives — phrasings like *"do you have it in env?"* or *"is `DFLOW_API_KEY` set?"* nudge the user toward env-var defaults they didn't ask for. Surface the choice; don't silently fall back to env or to dev. It's **one DFlow key everywhere** — same `x-api-key` unlocks Metadata + Trade APIs. Yes → prod host `https://prediction-markets-api.dflow.net` with `x-api-key`. No → dev host `https://dev-prediction-markets-api.dflow.net`, rate-limited. Pointer: `https://pond.dflow.net/build/api-key`. **When you generate a script, log the resolved host + key-presence at startup.**
4. **RPC URL** — **yes, ask here**, unlike spot/PM trading or market-data. The HTTP pipeline reads token accounts directly via RPC; there's no wallet in the loop to do it for you. Recommend [Helius](https://helius.dev). CLI users on the `dflow positions` quick path don't need one — `dflow setup` already configured it.

**Do NOT ask about:**
- Settlement mint, slippage, fees, signing — read-only skill. If the user pivots to acting on a position, hand off to `dflow-kalshi-trading`.

## Gotchas (the docs MCP won't volunteer these)

- **No `/positions` endpoint.** Portfolio = wallet balances + metadata joins. Don't hunt the API for a shortcut.
- **Token-2022 program for outcome tokens.** `TOKEN_2022_PROGRAM_ID`, not the classic token program. Query the classic program separately for USDC/SOL/CASH.
- **Mark-to-market = bid, not ask.** Long YES → `yesBid`. Long NO → `noBid`. Marking on the ask overstates the portfolio.
- **Two POST endpoints.** `filter_outcome_mints` and `markets/batch` both take a POST body with an address list. Easy to default to GET and fail.
- **Stablecoins aren't outcome mints.** `filter_outcome_mints` strips them out (they're settlement, not positions). Track USDC / CASH balances separately from the PM view.
- **Redemption readiness is three ANDed conditions**, not just "market closed." Surface a redeemable list only when status + `redemptionStatus` + winning side all line up.
- **Balance lag after fill.** A fill that just landed onchain may not show up immediately on a non-indexed RPC — the token account update propagates after the transaction finalizes. Debounce rapid refreshes, and if the user expected a balance change and doesn't see it, retry before assuming failure.
- **`dflow positions` is active-vault only.** No `--wallet` flag; switching wallets means `dflow setup` or the API pipeline.
- **`dflow positions` returns balances, not mark prices.** You get `amount` / `uiAmount` / `decimals` plus `side` + `market.title` + `market.status` on outcome tokens. That already gets you close to dollar value for USDC and CASH (their `uiAmount` ≈ USD modulo depeg), but **outcome tokens** need `yesBid` / `noBid` from `markets/batch` to mark, and **other spot tokens** (SOL, etc.) need an outside spot price. No `redemptionStatus` and no cost basis in the output either — pair with `markets/batch` for redemption eligibility, `/onchain-trades` for P&L.
- **Closed outcome token accounts.** After a full sell or redeem, the token account may be closed (rent reclaimed) and will no longer show up on the wallet. That's expected — check onchain-trades history if you need the record.
- **Same market, different rail = separate position.** Every Kalshi market on DFlow has a USDC rail and a CASH rail, each with its own `yesMint` / `noMint`. A wallet can hold YES on both rails of the same market — those are two rows in the portfolio, two redemption flows, and their mark-to-market sums independently. Rare in practice (most users stick to one rail) but worth handling if it shows up.
- **Two surfaces, two auth paths.** `dflow positions` shells out through the CLI and uses its stored config (key, wallet, RPC) — the script plumbs nothing for that call. The build-your-own HTTP pipeline (`markets/batch`, `onchain-trades`, RPC `getParsedTokenAccountsByOwner`) is plain HTTP/RPC and needs the DFlow API key + RPC URL plumbed in explicitly. They're independent: the CLI's stored key isn't reachable from a sibling HTTP client. Only ask about API key + RPC for the HTTP pipeline.

## When something doesn't fit

For anything not covered above — full response envelopes for `filter_outcome_mints` / `markets/batch` / `onchain-trades`, pagination params, Proof state in the picture, edge cases in `redemptionStatus` transitions, order-status terminal states — query the docs MCP (`search_d_flow`, `query_docs_filesystem_d_flow`). Don't guess.

For runnable reference code, point at [`/build/recipes/prediction-markets/track-positions`](https://pond.dflow.net/build/recipes/prediction-markets/track-positions) (and its Cookbook Repo link).

## Sibling skills

- `dflow-kalshi-trading` — sell, redeem, or otherwise act on a position you see here.
- `dflow-kalshi-market-data` — market-centric data (orderbook, trades, candles, in-game) for a position you're watching.
- `dflow-kalshi-market-scanner` — find new markets to open positions in.
- `dflow-proof-kyc` — verify a wallet before it can buy into new positions.
