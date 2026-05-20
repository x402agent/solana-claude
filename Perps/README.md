<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,12:1a0a2e,28:ff5f1f,50:ffd166,72:9945FF,88:14F195,100:05060d&height=320&section=header&text=%F0%9F%A6%9E%F0%9F%91%91%20LOBSTER%20KING%20PERPS&fontSize=58&fontColor=ffffff&animation=twinkling&fontAlignY=36&desc=Phoenix%20%C2%B7%20Vulcan%20%C2%B7%20Imperial%20%C2%B7%20Clawd%20%E2%80%94%20Sovereign%20Solana%20Perpetuals&descAlignY=58&descAlign=50&descSize=18" alt="Lobster King Perps banner" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=28&duration=1600&pause=400&color=FFD166&center=true&vCenter=true&width=1080&lines=%F0%9F%94%A5+PHOENIX+RISES+%E2%86%92+VULCAN+EXECUTES+%E2%86%92+CLAWD+CROWNS;%F0%9F%A6%9E%F0%9F%91%91+LOBSTER+KING+MODE+%E2%86%92+PAPER+FIRST+%E2%86%92+LIVE+GATED;TWAP+%E2%86%92+GRID+%E2%86%92+TA+%E2%86%92+LEDGER+%E2%86%92+FINALIZE;IMPERIAL+ROUTER+%E2%86%92+JUPITER+%C2%B7+FLASH+%C2%B7+PHOENIX+%C2%B7+GMTRADE;THE+HEART+OF+THE+CLAWD+STACK" alt="Perps animated header" />

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=15&duration=1300&pause=250&color=14F195&center=true&vCenter=true&width=1000&lines=clawd-perps+perps+vulcan+context;clawd-perps+perps+grid+SOL+--center-on-mark+--width-pct+2.5;clawd-perps+perps+twap+SOL+--side+buy+--notional-usdc+500+--slices+5;clawd-perps+perps+ta+--config-file+ema-cross-sol.json+--run-until-stopped;clawd-perps+perps+finalize+%3Crun-id%3E+--cancel-orders+--close-position+--yes" alt="animated CLI" />

<br/><br/>

[![GitHub](https://img.shields.io/badge/GitHub-x402agent%2Fsolana--clawd-111827?style=for-the-badge&logo=github)](https://github.com/x402agent/solana-clawd)
[![Phoenix](https://img.shields.io/badge/Phoenix-Perpetuals-FF5F1F?style=for-the-badge)](https://phoenix.trade)
[![Vulcan](https://img.shields.io/badge/Vulcan-Strategy%20Engine-FFD166?style=for-the-badge)](../vulcan-cli-master)
[![clawd-perps](https://img.shields.io/badge/clawd--perps-npm%20%2B%20python%20agent-9945FF?style=for-the-badge)](../packages/clawd-perps)
[![Imperial](https://img.shields.io/badge/Imperial-Multi--Venue%20Router-14F195?style=for-the-badge)](https://api.imperial.space)
[![x402](https://img.shields.io/badge/x402.wtf-agent%20payments-FF5F1F?style=for-the-badge)](https://x402.wtf)
[![Backrooms](https://img.shields.io/badge/backrooms.x402.wtf-INFINITE-FFD700?style=for-the-badge)](https://backrooms.x402.wtf)
[![npm](https://img.shields.io/badge/npm-clawd--perps-CB3837?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@openclawdsolana/clawd-perps)

<br/>

```text
╔══════════════════════════════════════════════════════════════════════════════════╗
║  🦞👑  LOBSTER KING PERPS — THE HEART OF THE CLAWD STACK                       ║
║  Phoenix · Vulcan · Imperial · Clawd — four layers of sovereign execution       ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║  Runtime      clawd · leviathan · clawd-automaton · clawd-perps                 ║
║  Perps        Phoenix markets · Vulcan/Rise execution · Python agent            ║
║  Router       Imperial — Jupiter · Flash Trade · Phoenix · GMTrade              ║
║  Strategies   TWAP · Grid · TA · Ledgers · Pause/Resume/Finalize               ║
║  Rooms        Analyst ↔ Satirist ↔ Clawd                                        ║
║  Payments     x402 / HTTP 402 / Solana USDC rails                              ║
║  Safety       Paper-first · Dry-run · Confirm-each · Auto-execute gated        ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

</div>

---

## What Is This

`/Perps` is the perpetuals execution heart of Solana Clawd. Three layers moving at different speeds:

- **Upstream engines** — Phoenix, Flash Trade, Jupiter, GMTrade, with their own risk models
- **Clawd adapters** — translate those engines into agent-safe, ledger-auditable operator surfaces
- **Imperial router** — single HTTP API that brokers multi-venue perp execution from one passthrough program

The canonical Clawd integration workspace is [`clawd-agents-perps/`](./clawd-agents-perps/).

---

## Quick Start

```bash
# Install the CLI
npm install -g @openclawdsolana/clawd-perps

# Crown check — bring up Phoenix Python agent and Vulcan context
clawd-perps perps vulcan context

# Market intelligence through the Solana CLAWD Phoenix agent
clawd-perps perps agent market SOL

# Paper-first imperial strategy loops
clawd-perps perps twap SOL --side buy --notional-usdc 500 --slices 5 --detached
clawd-perps perps grid SOL --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5 --detached
clawd-perps perps ta --config-file ./ema-cross-sol.json --run-until-stopped --detached

# Royal ledger control
clawd-perps perps runs
clawd-perps perps monitor <run-id>
clawd-perps perps finalize <run-id> --cancel-orders --close-position --wait --yes
```

---

## Repo Layout

```text
Perps/
├── clawd-agents-perps/            ← canonical Clawd integration workspace
│   └── src/
│       ├── imperialAgent.ts       — Imperial API client + OODA loop
│       └── imperialBot.ts         — Telegram NLP bot + WebSocket push
├── phoenix-onchain-market-maker-master/   — Phoenix-native MM and execution
├── Solana-Market-Maker-master/            — Generalized Solana MM (quoting, inventory, flow)
├── solana-market-maker-volume-bot-master/ — Volume and agent-behavior patterns
└── twamm-master/                          — TWAMM long-horizon execution primitives
```

---

## Imperial Trading API

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=16&duration=1400&pause=300&color=9945FF&center=true&vCenter=true&width=900&lines=Base+URL%3A+https%3A%2F%2Fapi.imperial.space%2Fapi%2Fv1;Venues%3A+Jupiter+%C2%B7+Flash+Trade+%C2%B7+Phoenix+%C2%B7+GMTrade;Rate+Limit%3A+600+req%2Fmin+sustained+%2F+burst+120;Paper-first.+Dry-run+by+default.+Live+behind+IMPERIAL_LIVE%3Dtrue." alt="Imperial API info" />

</div>

Imperial is a perpetual futures router on Solana — one passthrough program that brokers trades across Jupiter, Flash Trade, Phoenix, and GMTrade from a single HTTP API surface.

### Authentication

```text
POST /mobile/connect    — post {wallet, message, signature}
                          message = "imperial:mobile-connect:{wallet}:{nonce}"
                          signed by the wallet keypair.
                          Returns: { code: string }

POST /mobile/exchange   — exchange the one-time code for { jwt, expires_at }
                          Code expires in 5 minutes, single-use only.

Authorization: Bearer <jwt>  — attach to all trading requests.
                               JWT wallet claim must match the wallet field.

POST /mobile/revoke     — invalidate the JWT on shutdown or key rotation.
```

Multi-wallet bots: each wallet owner completes the flow independently and shares their JWT. The bot holds N tokens and calls the API in parallel.

### Rate Limits

600 req/min sustained, burst 120. Per-wallet when JWT present, else per-IP.  
`429` returns `{ error: "rate_limited", retry_after_seconds: N }`.  
`/health`, `/ws`, and Telegram webhook endpoints are not rate limited.

---

### Order Types

| Code | Name            | Extra fields required |
|------|-----------------|-----------------------|
| 0    | Market          | — |
| 1    | Limit           | `triggerPrice` |
| 2    | StopLimit       | `triggerPrice` |
| 3    | LandMine        | `triggerPrice`, `extraData.waitPrice`, `waitDuration` |
| 4    | Ratchet         | `extraData.worstPrice`, `ratchetSize` |
| 6    | RatchetEntry    | same as Ratchet |
| 9    | DCA             | `extraData.dcaStartPrice`, `dcaEndPrice`, `dcaNumLegs` |
| 10   | FibRatchet      | same as Ratchet |
| 11   | FibRatchetEntry | same as Ratchet |
| 12   | DcaClose        | `extraData.dcaCloseStartPrice`, `dcaCloseEndPrice`, `dcaCloseNumLegs` |
| 13   | DcaTimeClose    | `extraData.dcaCloseIntervalSeconds`, `dcaCloseNumLegs` |
| 14   | DcaRatchetClose | `extraData.dcaCloseNumLegs`, `dcaCloseRatchetSize` |
| 15   | DcaTime         | `extraData.dcaIntervalSeconds`, `dcaNumLegs` |
| 16   | DcaRatchet      | `extraData.dcaNumLegs`, `dcaRatchetSize` |

**Underwriter codes:** `0` = Jupiter · `1` = Flash Trade · `2` = Phoenix · `3` = GMTrade  
**Side:** `0` = long · `1` = short  
**Action:** `0` = Increase (open/add) · `1` = Decrease (close/reduce)

---

### Subaccounts (Profiles)

Every wallet has 6 implicit subaccounts (`profileIndex` 0–5). Each is an isolated-margin account; balances and positions don't cross profiles. Profiles are created lazily on first deposit or order — no explicit create call. `/mobile/balances` returns `usdc: 0` for uninitialized profiles.

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

```json
{
  "wallet": "...",
  "profiles": [{ "profileIndex": 0, "profilePda": "...", "usdc": 5000000 }]
}
```

#### `POST /mobile/orders`

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
Response always HTTP 200 — inspect `success` field.

#### `POST /mobile/orders/batch`

Entry order + attached TP/SL/close legs in one atomic request. Entry is submitted first; close legs only run if entry succeeds.

```json
{
  "entry": { "...MobileCreateOrderRequest": true },
  "closeOrders": [{ "...MobileCreateOrderRequest": true }]
}
```

Close orders must have `action: 1` and match entry's `(wallet, side, underwriter, profileIndex)`.

#### Other Order Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /mobile/orders/cancel` | Cancel a resting order by PDA |
| `POST /mobile/orders/update` | Update size, trigger price, slippage, close %, advanced params |
| `POST /mobile/orders/collateral` | Add or remove collateral from an open position |
| `POST /passthrough/users/{wallet}/profiles/{index}/sync` | Swap non-USDC residue back to USDC after close |
| `POST /phoenix/register` | Pre-activate Phoenix profile under Imperial's referral |

---

### Public Read Endpoints (no auth)

| Endpoint | Purpose |
|----------|---------|
| `GET /status` | API health |
| `GET /funding-rates` | Per-venue funding and borrow rates, all symbols |
| `GET /mark-prices` | Mark prices across venues |
| `GET /phoenix/mark-prices` | Phoenix-specific mark prices |
| `GET /phoenix/depth?symbol=SOL` | Phoenix orderbook depth |
| `GET /phoenix/markets` | Phoenix market list (PDAs, leverage, fees) |
| `GET /flash/markets` | Flash Trade market list |
| `GET /gmtrade/markets` | GMTrade market list |
| `GET /gmtrade/funding-rates` | GMTrade-specific funding rates |
| `GET /gmtrade/liquidity` | GMTrade liquidity |
| `GET /route?asset=SOL&side=0&notional=100` | Cost-optimized venue recommendation |
| `GET /positions?wallet=<pubkey>` | Open positions for a wallet |
| `GET /orders?wallet=<pubkey>` | Resting orders |
| `GET /passthrough/users/{w}/orders` | Passthrough-only order subset |
| `GET /priority-fee` | Current Solana priority fee tiers |
| `GET /trades?wallet=<pubkey>` | Trade history |

---

### WebSockets

#### `GET /ws` — wallet-scoped invalidation

```json
{ "type": "subscribe", "wallet": "<pubkey>" }
```

Server pushes: `{ "type": "positions_updated" }` and `{ "type": "orders_updated" }`.

#### `GET /ws/market` — public market-data stream

```json
{ "type": "subscribe_funding_rates" }
{ "type": "subscribe_mark_prices" }
{ "type": "subscribe_phoenix_depth" }
{ "type": "subscribe_phoenix_depth", "symbols": ["SOL"] }
```

Server pushes:

```json
{ "type": "funding_rate_update", "symbol": "SOL", "venue": "phoenix",
  "longFundingRatePerHourPercent": 0.004, "shortFundingRatePerHourPercent": -0.004 }
{ "type": "mark_price_update", "symbol": "SOL", "venue": "phoenix",
  "price": 172.5, "fetchedAtUnixMs": 1234567890 }
{ "type": "phoenix_depth_update", "symbol": "SOL", "snapshot": { "bids": [], "asks": [] } }
```

Funding sign convention: `longFundingRatePerHourPercent > 0` → longs pay shorts.

---

### Response Convention

All `POST /mobile/orders*` return **HTTP 200** even on on-chain rejection. Always inspect `success`:

- `success: true` — accepted, `signature` is the Solana tx signature
- `success: false` — rejected, `error` has the reason

HTTP 4xx = malformed request or auth failure. HTTP 5xx = server or order-bot failure.

---

## Clawd Imperial Agent

The Clawd-owned Imperial integration lives in `clawd-agents-perps/src/`.

### `imperialAgent.ts` — Runtime client

```typescript
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

#### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `IMPERIAL_JWT` | — | Pre-issued JWT (skip auth flow) |
| `IMPERIAL_WALLET` | — | Operator wallet pubkey |
| `IMPERIAL_PROFILE_INDEX` | `0` | Subaccount index |
| `IMPERIAL_LIVE` | `false` | Enable live order submission |
| `IMPERIAL_MAX_SIZE_USD` | `100` | Hard cap per order (USD) |
| `IMPERIAL_ALLOWED_SYMS` | `SOL,ETH,BTC` | Symbol allowlist |
| `IMPERIAL_SLIPPAGE_BPS` | `50` | Default slippage tolerance |
| `IMPERIAL_API_BASE` | `https://api.imperial.space/api/v1` | Override API base |

### `imperialBot.ts` — Natural language Telegram bot

`ImperialBot` is a persistent Telegram bot with full natural language parsing, Claude NLP fallback, browser-use Clawd capabilities, and live market WebSocket push.

```typescript
import { startImperialBot } from '@solanaclawd/clawd-agents-perps';

await startImperialBot({
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  allowedChats: ['123456789'],
  claudeApiKey: process.env.CLAWD_CLAUDE_API_KEY,
});
```

#### Additional environment variables

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_ALLOWED_CHATS` | Comma-separated allowed chat IDs |
| `CLAWD_CLAUDE_API_KEY` | Claude API key for NLP fallback |
| `IMPERIAL_STATE_FILE` | State persistence path (default `./imperial-state.json`) |

#### Natural language commands

```text
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

#### OODA signal scoring (orient phase)

| Signal | Weight | Description |
|--------|--------|-------------|
| Momentum | 40% | Mark vs mid drift |
| Funding | 40% | Crowded-longs fade via Phoenix hourly rate |
| Liquidity | 20% | Phoenix book spread tightness |

Decision threshold: **0.25 composite score** → `buy`, `sell`, or `watch`.

---

## Strategies

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1500&pause=350&color=FF5F1F&center=true&vCenter=true&width=900&lines=TWAP+%E2%80%94+Time-weighted+average+price+execution;GRID+%E2%80%94+Layered+limit+orders+around+mark;TA+%E2%80%94+EMA+%2F+RSI+%2F+MACD+%2F+BBands+trigger+rules;LEDGER+%E2%80%94+Every+run+audited%2C+pause%2Fresume%2Ffinalize" alt="strategies" />

</div>

### TWAP

```bash
clawd-perps perps twap SOL \
  --side buy \
  --notional-usdc 500 \
  --slices 5 \
  --interval 60s \
  --detached
```

### Grid

```bash
clawd-perps perps grid SOL \
  --center-on-mark \
  --width-pct 2.5 \
  --levels-per-side 5 \
  --tokens-per-level 0.5 \
  --detached
```

### TA Strategy

```bash
clawd-perps perps ta \
  --config-file ./ema-cross-sol.json \
  --run-until-stopped \
  --detached
```

### Ledger Control

```bash
clawd-perps perps runs                          # list active strategy runs
clawd-perps perps monitor <run-id>              # tail logs and metrics
clawd-perps perps finalize <run-id> \
  --cancel-orders --close-position --wait --yes # clean exit
```

---

## Execution Modes

| Mode | Flag | Behavior |
|------|------|----------|
| Observe | default | Read market data only, no orders |
| Paper | `--paper` | Simulated fills, ledger recording, no on-chain tx |
| Dry-run | `--dry-run` | Build and validate tx, do not submit |
| Confirm-each | `--confirm-each` | Prompt before each order submission |
| Auto-execute | `--yes` + `IMPERIAL_LIVE=true` | Live orders, gated by allowlist + size cap |

**Paper-first is the default. Live execution requires both `IMPERIAL_LIVE=true` and `--yes`.**

---

## Current Direction

- Imperial as the execution router, Phoenix as the default venue (underwriter 2)
- Dry-run by default — live only behind `IMPERIAL_LIVE=true`
- Every order attempt recorded in `ExecutionRecord` (full audit trail)
- OODA loop: observe (market tape) → orient (signal score) → decide → act (route)
- WebSocket push for real-time market data without polling

---

## Security Policy

- Local `.env`, wallet keypairs, and JWT files must never be committed
- Run `npm run perps:audit` from the repo root before pushing changes
- Treat every upstream subtree as untrusted until reviewed, adapted, and pinned
- Private keys never pass through this workspace — signing happens externally
- JWT revocation on shutdown is mandatory for long-running bots

---

## Where to Start

For the active Clawd trading stack:

- [`clawd-agents-perps/src/imperialAgent.ts`](./clawd-agents-perps/src/imperialAgent.ts) — Imperial API client + OODA loop
- [`clawd-agents-perps/src/imperialBot.ts`](./clawd-agents-perps/src/imperialBot.ts) — Telegram bot + NLP
- Agent definition: [`../agents/src/imperial-perps-trader.json`](../agents/src/imperial-perps-trader.json)
- Skills: [`../skills/vulcan/`](../skills/vulcan/) · [`../skills/vulcan-quickstart/`](../skills/vulcan-quickstart/)

---

## Links

- **npm:** [npmjs.com/package/@openclawdsolana/clawd-perps](https://www.npmjs.com/package/@openclawdsolana/clawd-perps)
- **Imperial API:** [api.imperial.space](https://api.imperial.space)
- **Phoenix:** [phoenix.trade](https://phoenix.trade)
- **Runtime API:** [api.x402.wtf](https://api.x402.wtf)
- **Repository:** [github.com/x402agent/solana-clawd](https://github.com/x402agent/solana-clawd)
- **Token:** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,28:FF5F1F,72:9945FF,100:05060d&height=160&section=footer&text=%F0%9F%A6%9E%20THE+SHELL+MOLTS.+THE+LAWS+DO+NOT.&fontSize=22&fontColor=ffffff&animation=twinkling&fontAlignY=65" alt="footer" />

<sub>backrooms.x402.wtf · x402.wtf · solanaclawd.com · imperial.space</sub>

</div>
