# Perps

The perp arena for `solana-clawd`. Three layers moving at different speeds:

- upstream engines with their own assumptions and risk models
- Clawd-owned adapters that translate those engines into agent-safe surfaces
- presentation and control planes that turn perp infrastructure into something
  humans and agents can actually operate

---

## What Lives Here

### Upstream Engines

- `phoenix-onchain-market-maker-master` — Phoenix-native market-making and on-chain execution
- `Solana-Market-Maker-master` — generalized Solana MM logic (quoting, inventory, flow)
- `solana-market-maker-volume-bot-master` — volume and agent-behavior patterns
- `twamm-master` — TWAMM long-horizon execution primitives and UI references

### Clawd Control Surface

- `clawd-agents-perps/` — the canonical integration workspace

---

## Imperial Trading API

**Base URL:** `https://api.imperial.space/api/v1`

Imperial is a perpetual futures router on Solana — one passthrough program that
brokers trades across Jupiter, Flash Trade, Phoenix, and GMTrade from a single
HTTP API surface.

### Authentication

JWT-gated flow:

```
POST /mobile/connect    — post {wallet, message, signature} where message =
                          "imperial:mobile-connect:{wallet}:{nonce}"
                          signed by the wallet keypair.
                          Returns: { code: string }

POST /mobile/exchange   — exchange the one-time code for { jwt, expires_at }
                          Code expires in 5 minutes, single-use only.

Authorization: Bearer <jwt>  — attach to all trading requests.
                              JWT wallet claim must match the wallet field.

POST /mobile/revoke     — invalidate the JWT on shutdown or key rotation.
```

Multi-wallet bots: each wallet owner completes the flow independently and
shares their JWT. The bot holds N tokens and calls the API in parallel.

### Rate Limits

600 req/min sustained, burst 120. Per-wallet when JWT present, else per-IP.
`429` returns `{ error: "rate_limited", retry_after_seconds: N }`.
`/health`, `/ws`, and Telegram webhook endpoints are not rate limited.

---

### Order Types

| Code | Name           | Extra fields required                                 |
|------|----------------|-------------------------------------------------------|
| 0    | Market         | —                                                     |
| 1    | Limit          | `triggerPrice`                                        |
| 2    | StopLimit      | `triggerPrice`                                        |
| 3    | LandMine       | `triggerPrice`, `extraData.waitPrice`, `waitDuration` |
| 4    | Ratchet        | `extraData.worstPrice`, `ratchetSize`                 |
| 6    | RatchetEntry   | same as Ratchet                                       |
| 9    | DCA            | `extraData.dcaStartPrice`, `dcaEndPrice`, `dcaNumLegs`|
| 10   | FibRatchet     | same as Ratchet                                       |
| 11   | FibRatchetEntry| same as Ratchet                                       |
| 12   | DcaClose       | `extraData.dcaCloseStartPrice`, `dcaCloseEndPrice`, `dcaCloseNumLegs` |
| 13   | DcaTimeClose   | `extraData.dcaCloseIntervalSeconds`, `dcaCloseNumLegs`|
| 14   | DcaRatchetClose| `extraData.dcaCloseNumLegs`, `dcaCloseRatchetSize`    |
| 15   | DcaTime        | `extraData.dcaIntervalSeconds`, `dcaNumLegs`          |
| 16   | DcaRatchet     | `extraData.dcaNumLegs`, `dcaRatchetSize`              |

**Underwriter codes:** `0` = Jupiter, `1` = Flash Trade, `2` = Phoenix, `3` = GMTrade

**Side:** `0` = long, `1` = short

**Action:** `0` = Increase (open/add), `1` = Decrease (close/reduce)

---

### Subaccounts (Profiles)

Every wallet has 6 implicit subaccounts (`profileIndex` 0–5). Each is an
isolated-margin account; balances and positions don't cross profiles.
Profiles are created lazily on first deposit or order — no explicit create call.
`/mobile/balances` returns `usdc: 0` for uninitialized profiles (not an error).

---

### Trading Endpoints (JWT required)

#### `POST /deposit/build-tx`
Build a sponsored, partially-signed deposit or withdraw transaction.

```json
{
  "wallet": "<base58 pubkey>",
  "profileIndex": 0,
  "amount": 1000000,
  "mode": "deposit"
}
```
`amount` in USDC native units (6-decimal — `1_000_000` = $1).
`mode`: `"deposit"` or `"withdraw"`.
Response: `{ "transaction": "<base64 tx>" }` — caller signs with wallet keypair and submits.

#### `GET /mobile/balances`
Per-subaccount USDC balances.
```json
{
  "wallet": "...",
  "profiles": [{ "profileIndex": 0, "profilePda": "...", "usdc": 5000000 }]
}
```

#### `POST /mobile/orders`
Submit a single order.

```json
{
  "wallet": "<pubkey>",
  "profileIndex": 0,
  "action": 0,
  "side": 0,
  "underwriter": 2,
  "orderType": 0,
  "sizeUsd": 100000000,
  "collateralAmount": 100000000,
  "slippageBps": 50,
  "fundingStatus": 0,
  "priority": 0,
  "triggerPrice": 0,
  "triggerCondition": 0,
  "symbol": "SOL"
}
```

`sizeUsd` and `collateralAmount` are in 6-decimal fixed point (`1_000_000` = $1).

Response: `{ "success": true|false, "error": null|"msg", "orderPda": null|"...", "signature": null|"..." }`

Always HTTP 200 even on on-chain rejection — inspect `success`.

#### `POST /mobile/orders/batch`
Entry order + attached TP/SL/close legs in one atomic request. Entry is
submitted first; close legs only run if entry succeeds. Close failures don't
roll back the entry.

```json
{
  "entry": { ...MobileCreateOrderRequest },
  "closeOrders": [ ...MobileCreateOrderRequest[] ]
}
```

Close orders must have `action: 1` and match entry's `(wallet, side, underwriter, profileIndex)`.

#### `POST /mobile/orders/cancel`
```json
{ "wallet": "...", "profileIndex": 0, "orderPda": "<base58>" }
```

#### `POST /mobile/orders/update`
Update size, trigger price, slippage, close %, or advanced order parameters.
All fields except `wallet`, `profileIndex`, `orderPda` are optional — omit to leave unchanged.

#### `POST /mobile/orders/collateral`
Add or remove collateral from an open position.
```json
{
  "wallet": "...", "profileIndex": 0,
  "action": 0,
  "marketMint": "<mint pubkey>",
  "side": 0,
  "underwriter": 2,
  "collateralAmount": 1000000,
  "price": 180000000000,
  "slippageBps": 50
}
```
`price` in oracle scale (1e9).

#### `POST /passthrough/users/{wallet}/profiles/{index}/sync`
After closing a non-USDC-collateralized position (Jupiter/Flash long leaves
WSOL/WBTC/WETH residue), call this to swap residue back to USDC and route to
the wallet. Idempotent. ~10s rate limit per profile.

#### `POST /phoenix/register`
Pre-activate a wallet's Phoenix profile under Imperial's referral.
Optional — `/mobile/orders` auto-activates Phoenix on first use.

---

### Public Read Endpoints (no auth)

| Endpoint                               | Purpose                                           |
|----------------------------------------|---------------------------------------------------|
| `GET /status`                          | API health                                        |
| `GET /funding-rates`                   | Per-venue funding and borrow rates, all symbols   |
| `GET /mark-prices`                     | Mark prices across venues                         |
| `GET /phoenix/mark-prices`             | Phoenix-specific mark prices                      |
| `GET /phoenix/depth?symbol=SOL`        | Phoenix orderbook depth                           |
| `GET /phoenix/markets`                 | Phoenix market list (PDAs, leverage tiers, fees)  |
| `GET /flash/markets`                   | Flash Trade market list                           |
| `GET /gmtrade/markets`                 | GMTrade market list                               |
| `GET /gmtrade/funding-rates`           | GMTrade-specific funding rates                    |
| `GET /gmtrade/liquidity`               | GMTrade liquidity                                 |
| `GET /route?asset=SOL&side=0&notional=100` | Cost-optimized venue recommendation          |
| `GET /positions?wallet=<pubkey>`       | Open positions for a wallet                       |
| `GET /orders?wallet=<pubkey>`          | Resting orders                                    |
| `GET /passthrough/users/{w}/orders`    | Passthrough-only order subset                     |
| `GET /priority-fee`                    | Current Solana priority fee tiers                 |
| `GET /trades?wallet=<pubkey>`          | Trade history                                     |

---

### WebSockets

#### `GET /ws` — wallet-scoped invalidation
Subscribe by wallet; receive refetch triggers when positions or orders change.
No replay buffer — refetch on reconnect.

```json
{ "type": "subscribe", "wallet": "<pubkey>" }
```

Server pushes: `{ "type": "positions_updated" }` and `{ "type": "orders_updated" }`.

#### `GET /ws/market` — public market-data stream
Replaces polling on funding-rates, mark-prices, and depth.
Server pushes a full snapshot immediately on subscribe, then tracks diffs.

**Subscribe messages:**
```json
{ "type": "subscribe_funding_rates" }
{ "type": "subscribe_mark_prices" }
{ "type": "subscribe_phoenix_depth" }
{ "type": "subscribe_phoenix_depth", "symbols": ["SOL"] }
```

**Server pushes:**
```json
{ "type": "funding_rate_update", "symbol": "SOL", "venue": "phoenix",
  "longFundingRatePerHourPercent": 0.004, "shortFundingRatePerHourPercent": -0.004 }
{ "type": "mark_price_update", "symbol": "SOL", "venue": "phoenix",
  "price": 172.5, "fetchedAtUnixMs": 1234567890 }
{ "type": "phoenix_depth_update", "symbol": "SOL", "snapshot": { "bids": [...], "asks": [...] } }
```

Funding sign convention: `longFundingRatePerHourPercent > 0` → longs pay shorts.

---

### Response Convention

All `POST /mobile/orders*` return **HTTP 200** even on on-chain rejection.
Always inspect the `success` field:

- `success: true` — accepted, `signature` is the Solana tx signature
- `success: false` — rejected, `error` has the reason (leverage too high,
  slippage exceeded, no matching position for a close, etc.)

HTTP 4xx = malformed request or auth failure.
HTTP 5xx = server or order-bot failure.

---

## Clawd Imperial Agent

The Clawd-owned Imperial integration lives in `clawd-agents-perps/src/`.

### `imperialAgent.ts` — Runtime client

`ImperialClient` wraps the full Imperial API:

```ts
import { ImperialClient, Underwriter, usdToFixed } from '@solanaclawd/clawd-agents-perps';

const client = new ImperialClient(); // reads env vars

// OODA scan
const { signals } = await client.runScan();

// Single order (dry-run by default)
const req = client.buildOrderRequest({
  symbol: 'SOL', side: 0, action: 0, sizeUsd: 100,
  underwriter: Underwriter.Phoenix,
});
const { response, record } = await client.placeOrder(req);

// Batch entry + TP/SL
const entry = client.buildOrderRequest({ symbol: 'SOL', side: 0, action: 0, sizeUsd: 100 });
const tp = client.buildOrderRequest({
  symbol: 'SOL', side: 0, action: 1, sizeUsd: 100,
  orderType: 1, triggerPrice: Math.round(185 * 1e9), triggerCondition: 0,
});
const { response: batchRes } = await client.placeBatch({ entry, closeOrders: [tp] });
```

**Environment variables:**

| Variable               | Default                          | Purpose                         |
|------------------------|----------------------------------|---------------------------------|
| `IMPERIAL_JWT`         | —                                | Pre-issued JWT (skip auth flow) |
| `IMPERIAL_WALLET`      | —                                | Operator wallet pubkey          |
| `IMPERIAL_PROFILE_INDEX` | `0`                            | Subaccount index                |
| `IMPERIAL_LIVE`        | `false`                          | Enable live order submission    |
| `IMPERIAL_MAX_SIZE_USD` | `100`                           | Hard cap per order (USD)        |
| `IMPERIAL_ALLOWED_SYMS` | `SOL,ETH,BTC`                  | Symbol allowlist                |
| `IMPERIAL_SLIPPAGE_BPS` | `50`                            | Default slippage tolerance      |
| `IMPERIAL_API_BASE`    | `https://api.imperial.space/api/v1` | Override API base            |

### `imperialBot.ts` — Natural language Telegram bot

`ImperialBot` is a persistent Telegram bot with full natural language parsing,
Claude NLP fallback, browser-use capabilities, and live market WebSocket push.

```ts
import { startImperialBot } from '@solanaclawd/clawd-agents-perps';

await startImperialBot({
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  allowedChats: ['123456789'],
  claudeApiKey: process.env.CLAWD_CLAUDE_API_KEY,
});
```

**Additional environment variables:**

| Variable                | Purpose                                    |
|-------------------------|--------------------------------------------|
| `TELEGRAM_BOT_TOKEN`    | Telegram bot token                         |
| `TELEGRAM_ALLOWED_CHATS`| Comma-separated allowed chat IDs           |
| `CLAWD_CLAUDE_API_KEY`  | Claude API key for NLP fallback            |
| `IMPERIAL_STATE_FILE`   | State persistence path (default `./imperial-state.json`) |

**Natural language examples:**

```
scan SOL ETH BTC
long SOL $100 on phoenix
short BTC $50 via flash
long SOL $200 TP @185 SL @155
close SOL
funding SOL
marks
depth BTC
route SOL long $100
balances
positions
orders
history
health
browse https://example.com
```

**Signal scoring weights (OODA orient phase):**
- Momentum (mark vs mid drift): 40%
- Funding (crowded-longs fade via Phoenix hourly rate): 40%
- Liquidity (Phoenix book spread tightness): 20%

Decision threshold: 0.25 composite score → `buy`, `sell`, or `watch`.

---

## Current Direction

- Imperial as the execution router, Phoenix as the default venue (underwriter 2)
- Dry-run by default — live only behind `IMPERIAL_LIVE=true`
- Every order attempt recorded in `ExecutionRecord` (audit trail)
- OODA loop: observe (market tape) → orient (signal score) → decide → act (route)
- WebSocket push for real-time market data without polling

## Security Policy

- Local `.env`, wallet keypairs, JWT files must never be committed.
- Run `npm run perps:audit` from the repo root before pushing changes.
- Treat every upstream subtree as untrusted until reviewed, adapted, and pinned.
- Private keys never pass through this workspace — signing happens externally.
- JWT revocation on shutdown is mandatory for long-running bots.

## Where to Start

For the active Clawd trading stack:
- `Perps/clawd-agents-perps/src/imperialAgent.ts` — Imperial API client + OODA
- `Perps/clawd-agents-perps/src/imperialBot.ts` — Telegram bot + NLP
- Agent definition: `agents/src/imperial-perps-trader.json`
