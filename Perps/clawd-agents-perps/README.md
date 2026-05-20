# Clawd Agents Perps

The perp nerve center for Clawd agents — and now the home of **Clawd Perps Core OI Signal**.

This workspace is where the repo stops sounding like infrastructure and starts reading like an active trading machine: Phoenix prices through Rise, OI signal regimes scored in real time, Vulcan command surfaces mapped into agent-safe plans, and operator-facing payloads that tell you what is armed, what is blocked, and what still needs human approval.

It does not replace the upstream repos under `Perps/`. It metabolizes them.

---

## Clawd Perps Core OI Signal

OI alone is not the signal. The real signal is:

```text
OI delta
+ mark price delta
+ funding pressure
+ long/short skew
+ orderbook liquidity
+ spread widening
+ mark/index basis
+ account/risk health
= Clawd Core OI Signal
```

### Signal Regimes

| Regime | Condition |
|---|---|
| `LONG_CONTINUATION` | price ↑ + OI ↑ + funding sane + spread tight |
| `SHORT_CONTINUATION` | price ↓ + OI ↑ + funding sane + spread tight |
| `SHORTS_CLOSING` | price ↑ + OI ↓ (do not chase) |
| `LONGS_CLOSING` | price ↓ + OI ↓ (wait) |
| `CROWDED_LONG_RISK` | OI ↑ hard + funding very positive + skew long + thinning bids |
| `CROWDED_SHORT_RISK` | OI ↑ hard + funding very negative + skew short + thinning asks |
| `NEUTRAL` | no directional signal |
| `DATA_INVALID` | any gate failed |

### Execution Gates

The signal will not pass `executable: true` if any of these fail:

```text
OI missing
data stale (> 15s)
spread too wide (default > 25 bps)
depth too thin (default < $25,000)
funding overheated (default > 0.25%)
mark/index basis extreme (default > 150 bps)
```

### Quick Demo

```bash
# One-shot OI signal (mock — no RPC needed)
node perps/clawd-agents-perps/dist/cli.js signal oi SOL-PERP --mock

# Live Phoenix read
node perps/clawd-agents-perps/dist/cli.js signal oi SOL-PERP --rpc-url "$CLAWD_RPC_URL"

# Watch loop (5s interval)
node perps/clawd-agents-perps/dist/cli.js signal watch SOL-PERP --interval 5s --mode paper --mock

# Risk gate check before entering
node perps/clawd-agents-perps/dist/cli.js signal risk-gate SOL-PERP --notional 500 --side long --mock
```

Sample output:

```json
{
  "symbol": "SOL-PERP",
  "regime": "LONG_CONTINUATION",
  "side": "long",
  "score": 61.4,
  "confidence": 0.61,
  "market": {
    "markPrice": 184.22,
    "openInterestUsd": 18340291,
    "openInterestDeltaPct": 4.8,
    "priceDeltaPct": 1.1,
    "fundingRate": 0.00022,
    "spreadBps": 6.3
  },
  "gates": {
    "dataFresh": true,
    "oiPresent": true,
    "spreadOk": true,
    "fundingOk": true,
    "liquidityOk": true,
    "riskOk": true,
    "executable": true
  },
  "action": {
    "mode": "paper",
    "suggestedRoute": "phoenix",
    "maxNotionalUsdc": 610
  }
}
```

### MCP Tools

```ts
// Returns the full ClawdOiCoreSignal
clawd_perps_oi_signal({ symbol: "SOL-PERP", lookback: "5m", mode: "paper" })

// Returns a pass/fail gate for a specific notional + side
clawd_perps_oi_risk_gate({ symbol: "SOL-PERP", notionalUsdc: 500, side: "long" })
```

### OODA Loop Integration

```
Phoenix reads the tape.
RPC verifies the chain.
Percolator guards the invariants.
Clawd scores the crowd.
Imperial/Phoenix routes only after the shell says risk is clean.
```

This is the Observe layer of the perps OODA loop — OI as a live agent-grade risk signal, not just a chart metric.

---

## Mission

- pull live Phoenix perp reads through the Rise SDK
- compute structured OI signals with regime classification and gate checks
- map Vulcan CLI and MCP surfaces into compatible agent routes
- expose a market-maker runtime for observe, paper, and gated live previews
- provide Telegram and frontend entrypoints that feel operational
- keep secrets, signing, and irreversible actions out of the wrong layer

## Mental Model

1. Observe the market cleanly.
2. Score the crowd. Pass the gates.
3. Describe execution paths clearly.
4. Refuse unsafe live behavior unless the runtime is explicitly armed.

---

## Layout

| File | Role |
|---|---|
| `src/signals/oi-core.ts` | Core OI signal — regime classifier, scorer, gate checks, `buildClawdOiCoreSignal` |
| `src/adapters/phoenix-rise.ts` | Phoenix Rise HTTP adapter — mark price, OI, funding, orderbook, mock support |
| `src/adapters/perp-account-oi.ts` | Raw Solana RPC account decoder for on-chain program OI reads |
| `src/mcp/tools/clawd_perps_oi_signal.ts` | MCP tool wrappers — `clawd_perps_oi_signal`, `clawd_perps_oi_risk_gate` |
| `src/cli.ts` | CLI entry — `signal oi`, `signal watch`, `signal risk-gate`, plus all existing commands |
| `src/adapters/phoenixRise.ts` | Rise-powered Phoenix read plane (markets, tickers, positions, health) |
| `src/adapters/vulcan.ts` | Vulcan execution-plan generator for paper routes and CLI-compatible live paths |
| `src/marketMaker.ts` | Clawd runtime for observe, paper, and live-preview orchestration |
| `src/telegram.ts` | Operator command surface (health, markets, positions, route previews) |
| `src/frontend.ts` | Dashboard/status payload builder |
| `src/config.ts` | Env parsing, trading-mode resolution, preflight gating |
| `src/onchainMarketMaker.ts` | Safe bridge to Phoenix on-chain market-maker reference workspace |
| `src/twammAutomation.ts` | Gated bridge for TWAMM build/test/crank automation |

---

## CLI Reference

```bash
# Build
npm --prefix perps/clawd-agents-perps run build

# OI Signal — core commands
node perps/clawd-agents-perps/dist/cli.js signal oi SOL-PERP --mock
node perps/clawd-agents-perps/dist/cli.js signal oi SOL-PERP --rpc-url "$CLAWD_RPC_URL"
node perps/clawd-agents-perps/dist/cli.js signal watch SOL-PERP --interval 5s --mode paper
node perps/clawd-agents-perps/dist/cli.js signal risk-gate SOL-PERP --notional 500 --side long

# Runtime / market-maker
node perps/clawd-agents-perps/dist/cli.js status
node perps/clawd-agents-perps/dist/cli.js frontend
node perps/clawd-agents-perps/dist/cli.js telegram "/perps"

# Imperial
node perps/clawd-agents-perps/dist/cli.js imperial-scan --symbols SOL,BTC,ETH --size 100
node perps/clawd-agents-perps/dist/cli.js imperial-cycle SOL --size 100

# Paper trades
node perps/clawd-agents-perps/dist/cli.js paper-long SOL --notional 100
node perps/clawd-agents-perps/dist/cli.js paper-short SOL --notional 100

# On-chain market maker (gated — requires CLAWD_ONCHAIN_MM_LIVE=true)
node perps/clawd-agents-perps/dist/cli.js onchain-mm plan --market <pubkey> --ticker SOL-USD
node perps/clawd-agents-perps/dist/cli.js onchain-mm run --market <pubkey> --yes

# TWAMM (gated — requires CLAWD_TWAMM_LIVE=true)
node perps/clawd-agents-perps/dist/cli.js twamm crank-plan --token-a <mint> --token-b <mint>
node perps/clawd-agents-perps/dist/cli.js twamm crank --token-a <mint> --token-b <mint> --yes

# Via clawd-perps package
clawd-perps perps signal oi SOL-PERP --mode paper
clawd-perps perps signal watch SOL-PERP --interval 5s --mode paper
clawd-perps perps agent status
```

### Signal CLI Options

| Option | Default | Description |
|---|---|---|
| `--mock` | false | Use hardcoded mock tick (no RPC/HTTP needed) |
| `--mode` | `paper` | `observe`, `paper`, `dry-run`, `confirm-each`, `auto-execute` |
| `--rpc-url` | env | Solana RPC URL |
| `--api-url` | env | Phoenix Rise API base URL |
| `--interval` | `5s` | Watch loop interval (supports `ms`, `s`, `m`) |
| `--max-spread-bps` | `25` | Max spread before `spreadOk: false` |
| `--max-funding-abs` | `0.0025` | Max absolute funding rate before `fundingOk: false` |
| `--min-depth-usd` | `25000` | Min book depth before `liquidityOk: false` |
| `--notional` | `500` | USDC notional for risk-gate check |
| `--side` | `long` | Direction for risk-gate check |

---

## Safety Posture

- `paper` / `observe` are the default signal modes — they never submit orders
- Live execution requires `LIVE_TRADING=true`, `OPERATOR_CONFIRMED=true`, `PERPS_SIM_ONLY=false`
- Imperial order submission additionally requires `IMPERIAL_LIVE=true`
- On-chain MM requires `CLAWD_ONCHAIN_MM_LIVE=true` + `OPERATOR_CONFIRMED=true` + `--yes`
- TWAMM crank requires `CLAWD_TWAMM_LIVE=true` + `OPERATOR_CONFIRMED=true` + `--yes`
- No private keys in source — signing belongs in wallet/runtime integration

---

## Reading Order

1. `src/config.ts` — env flags and preflight gates
2. `src/signals/oi-core.ts` — OI signal engine
3. `src/adapters/phoenix-rise.ts` — live market data adapter
4. `src/adapters/perp-account-oi.ts` — on-chain account OI reader
5. `src/mcp/tools/clawd_perps_oi_signal.ts` — MCP tool surface
6. `src/marketMaker.ts` — runtime orchestration
7. `src/adapters/vulcan.ts` — execution planning
8. `src/frontend.ts` — dashboard payloads
9. `src/telegram.ts` — operator command surface
