<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:05060d,20:1a0a2e,50:FF5F1F,80:FFD166,100:9945FF&height=220&section=header&text=🦞👑%20LOBSTER%20KING%20PERPS&fontSize=52&fontColor=ffffff&animation=twinkling&fontAlignY=42&desc=Phoenix%20%C2%B7%20Vulcan%20%C2%B7%20Imperial%20%C2%B7%20On-Chain%20MM%20%C2%B7%20AI%20Harness&descAlignY=66&descSize=18" alt="Lobster King Perps" />

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=22&duration=1800&pause=600&color=FF5F1F&center=true&vCenter=true&width=900&lines=%F0%9F%A6%9E%F0%9F%91%91+LOBSTER+KING+PERPS+v1.5.0;%F0%9F%94%A5+PHOENIX+MARKETS+%2B+TP%2FSL+%2B+RISK+METRICS;%E2%9A%A1+CLAWD+AGENTS+%2B+IMPERIAL+RELAY+%2B+VULCAN;%F0%9F%93%A1+REALTIME+TUI+%2B+AI+HARNESS+%2B+ONCHAIN+MM;%F0%9F9E+NEW%3A+getRiskMetrics+%C2%B7+buildSetTpSl+%C2%B7+Claude+model" alt="Lobster King Perps" />

[![npm](https://img.shields.io/npm/v/@openclawdsolana/clawd-perps?style=for-the-badge&color=FF5F1F&logo=npm)](https://www.npmjs.com/package/@openclawdsolana/clawd-perps)
[![License](https://img.shields.io/badge/license-MIT-9945FF?style=for-the-badge)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-Phoenix%20Perps-14F195?style=for-the-badge&logo=solana)](https://phoenix.trade)
[![OpenClawd](https://img.shields.io/badge/OpenClawd-solanaclawd.com-FF5F1F?style=for-the-badge)](https://solanaclawd.com)

</div>

---

```text
  ╔══════════════════════════════════════════════════════════════════╗
  ║   🦞  Phoenix Perpetuals DEX · CLI · TUI · Agent Harness        ║
  ║                                                                  ║
  ║   market data  ─▶  positions  ─▶  orders  ─▶  TP/SL           ║
  ║   risk metrics ─▶  margin ratio ─▶  liq distance bands         ║
  ║   harness      ─▶  Claude Haiku ─▶  OODA ─▶  relay             ║
  ║   on-chain MM  ─▶  Phoenix reference impl (gated)              ║
  ╚══════════════════════════════════════════════════════════════════╝
```

**Phoenix Perpetuals DEX CLI, realtime TUI, agent harness, and gated on-chain market-maker bridge for the OpenClawd framework.**  
Trade perps on Solana from TypeScript market tools, bring up the Clawd TypeScript agent, inspect the Phoenix on-chain MM reference implementation, or delegate strategies/lifecycle controls through the Python Phoenix agent and Vulcan CLI.

Part of the [OpenClawd](https://solanaclawd.com) framework.

### What's new in v1.5.0

| Change | Details |
| --- | --- |
| **Take-profit orders** | `buildSetTpSl` now wires both SL (Rise stop-loss) and TP (resting limit close) in one call |
| **Risk metrics** | New `getRiskMetrics()` — margin ratio, liquidation distance bands, portfolio health score |
| **Claude Haiku default** | Harness default model upgraded from `gpt-5-nano` → `claude-haiku-4-5` |
| **TP size control** | `TpSlParams.takeProfitSize` — partial TP at specified base units |

---

## Install

```bash
# Global CLI
npm install -g @openclawdsolana/clawd-perps

# Or as a library
npm install @openclawdsolana/clawd-perps
```

[![npm](https://img.shields.io/npm/v/@openclawdsolana/clawd-perps)](https://www.npmjs.com/package/@openclawdsolana/clawd-perps)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## CLI usage

```bash
# Check config
clawd-perps perps config

# Market data
clawd-perps perps market list
clawd-perps perps market ticker BTC-PERP
clawd-perps perps market orderbook BTC-PERP --depth 10
clawd-perps perps market candles BTC-PERP --resolution 1h --limit 48

# Account
clawd-perps perps account portfolio
clawd-perps perps account margin

# Positions
clawd-perps perps position list
clawd-perps perps position show BTC-PERP
clawd-perps perps position tpsl BTC-PERP --tp 120000 --sl 90000 --side long

# Orders
clawd-perps perps order place BTC-PERP --side buy --size 0.1 --type market
clawd-perps perps order list
clawd-perps perps order cancel <orderId> BTC-PERP

# Margin
clawd-perps perps margin deposit 100
clawd-perps perps margin withdraw 50

# History
clawd-perps perps history trades --market BTC-PERP --limit 20
clawd-perps perps history pnl

# API health
clawd-perps perps health

# Python Phoenix agent + Vulcan strategy surface
clawd-perps perps vulcan health
clawd-perps perps agent status
clawd-perps perps agent telegram "/perps"
clawd-perps perps onchain-mm status
clawd-perps perps onchain-mm plan --market <PHOENIX_MARKET> --ticker SOL-USD --rpc-url local
clawd-perps perps onchain-mm build
clawd-perps perps python-agent market SOL
clawd-perps perps twap SOL --side buy --notional-usdc 500 --slices 5 --detached
clawd-perps perps grid SOL --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5 --detached
clawd-perps perps monitor <run-id>

# Realtime Backroom relay + TUI + long-horizon harness
clawd-perps perps relay "wake the Phoenix/Vulcan/Imperial perps room"
clawd-perps perps tui --symbols SOL,BTC,ETH --relay
clawd-perps perps tui --channels status,agents,conversation,perps,arena,pumpfun --pumpfun-limit 60 --relay
clawd-perps perps harness --symbols SOL,BTC,ETH --relay --once
clawd-perps perps harness --symbols SOL --no-model-call --once
```

Or without a global install:

```bash
npx @openclawdsolana/clawd-perps perps market list
```

---

## Library usage

```typescript
import { ClaWDPerps } from "@openclawdsolana/clawd-perps";

const perps = new ClaWDPerps({
  apiUrl: "https://perp-api.phoenix.trade",   // default
  rpcUrl: "https://api.mainnet-beta.solana.com", // default
  walletName: "YourPublicKey...",
});

// Market data (no wallet needed)
const markets = await perps.listMarkets();
const ticker  = await perps.getTicker("BTC-PERP");
const book    = await perps.getOrderbook("BTC-PERP", 20);

// Account (wallet required)
const portfolio = await perps.getPortfolio();
const positions = await perps.listPositions();

// Build transactions (returned as serialized tx — you sign + send)
const orderTx  = await perps.buildOrder({ market: "BTC-PERP", side: "buy", size: 0.1, orderType: "market" });
const closeTx  = await perps.buildClosePosition("BTC-PERP");
const tpslTx   = await perps.buildSetTpSl({ market: "BTC-PERP", positionSide: "long", takeProfit: 120000, stopLoss: 90000 });
const depositTx = await perps.buildDeposit(100);
```

---

## Environment variables

```bash
CLAWD_PERPS_API_URL=    # Phoenix perps API (default: https://perp-api.phoenix.trade)
CLAWD_PERPS_RPC_URL=    # Solana RPC (default: https://api.mainnet-beta.solana.com)
CLAWD_PERPS_API_KEY=    # Bearer token for authenticated endpoints (optional)
CLAWD_PERPS_WALLET=     # Trader wallet address / public key
OPENROUTER_API_KEY=     # Optional model key for harness analysis
CLAWD_PERPS_MODEL=      # Optional OpenRouter model override
CLAWD_PERPS_AGENT_PATH= # Optional path to solana-python-agent/perps_agent.py
CLAWD_PERPS_TS_AGENT_CLI= # Optional path to Perps/clawd-agents-perps/dist/cli.js
VULCAN_BIN=             # Optional Vulcan binary override
CLAWD_ONCHAIN_MM_ROOT=  # Optional path to Perps/phoenix-onchain-market-maker-master
CLAWD_ONCHAIN_MM_MARKET= # Phoenix market pubkey for on-chain MM plans
CLAWD_ONCHAIN_MM_TICKER= # Coinbase ticker for on-chain MM fair price (default: SOL-USD)
CLAWD_ONCHAIN_MM_RPC_URL= # RPC alias/url for on-chain MM (default: local or SOLANA_RPC_URL)
CLAWD_ONCHAIN_MM_LIVE=false # Must be true, with OPERATOR_CONFIRMED=true and --yes, to run
CLAWD_BACKROOM_URL=     # Relay base URL (default: https://backrooms.x402.wtf)
CLAWD_PERPS_RELAY_URL=  # Full relay endpoint override
CLAWD_PERPS_EXTRA_RELAY_URLS= # Optional comma-separated private relay endpoints
CLAWD_BACKROOM_TOKEN=   # Optional bearer token for private Backroom feed/relay
CLAWD_PERPS_RELAY_TOKEN= # Optional perps-specific Backroom bearer token
CLAWD_FLY_BACKROOMS_URL= # Optional private Fly dashboard URL for TUI display
CLAWD_PUMPFUN_WS_URL=   # Optional private Pump.fun websocket source URL
CLAWD_PUMPFUN_UI_URL=   # Optional private Pump.fun UI URL
CLAWD_PERPS_SESSION_DIR= # Harness JSONL session directory
CLAWD_PERPS_NO_RELAY=1  # Disable best-effort install relay
```

---

## Command groups

| Group | Commands |
|-------|----------|
| `market` | `list`, `info`, `ticker`, `orderbook`, `candles`, `leverage` |
| `account` | `info`, `portfolio`, `margin` |
| `position` | `list`, `show`, `close`, `reduce`, `tpsl` |
| `order` | `list`, `show`, `place`, `cancel` |
| `margin` | `deposit`, `withdraw`, `collateral` |
| `history` | `trades`, `orders`, `funding`, `pnl` |
| `agent` | Clawd TypeScript perps agent from `Perps/clawd-agents-perps` (`status`, `frontend`, `telegram`, `imperial-scan`, previews) |
| `onchain-mm` | Phoenix on-chain market-maker bridge (`status`, `build`, `plan`, gated `run`) |
| `python-agent` | Direct pass-through to `perps_agent.py` (`health`, `market`, `twap`, `grid`, `ta`, lifecycle) |
| `vulcan` | Pass-through to Python agent when available, or raw Vulcan with `--raw` |
| realtime | `relay`, `tui`, `harness` |
| strategy aliases | `twap`, `grid`, `ta`, `runs`, `status`, `monitor`, `wait-next-tick`, `report`, `pause`, `stop`, `resume`, `finalize` |

---

## Architecture

`clawd-perps` has two execution paths:

- TypeScript market/account/order helpers target the [Phoenix Perpetuals](https://phoenix.trade) REST API at `https://perp-api.phoenix.trade`.
- `clawd-perps perps agent` prefers the richer TypeScript Clawd perps agent at `Perps/clawd-agents-perps/dist/cli.js`, exposing frontend status, Telegram-style commands, Vulcan catalog posture, and Imperial scan/cycle tools. Set `CLAWD_PERPS_TS_AGENT_CLI` when running outside the monorepo.
- `clawd-perps perps onchain-mm` bridges the Phoenix on-chain market-maker reference workspace at `Perps/phoenix-onchain-market-maker-master`. `status`, `plan`, and `build` are safe operator surfaces; `run` is blocked unless `CLAWD_ONCHAIN_MM_LIVE=true`, `OPERATOR_CONFIRMED=true`, and `--yes` are all present.
- Strategy and lifecycle commands delegate to the Python Phoenix agent (`solana-python-agent/perps_agent.py`), which in turn calls Vulcan/Rise SDK. Set `CLAWD_PERPS_AGENT_PATH` when running outside the monorepo. Use `VULCAN_BIN` to point at a specific Vulcan binary.
- `perps tui` polls the Backroom `/feed/snapshot` realtime API for `status,agents,conversation,perps,arena,pumpfun`, visualizes Vulcan strategy paths, on-chain MM gates, Imperial posture, and Pump.fun launch tape state. `perps relay` and the harness can fan out to private relay endpoints via `CLAWD_PERPS_EXTRA_RELAY_URLS`. Private Fly/Pump URLs are env-only and should stay out of public commits.

The `ClaWDPerps` class follows the same tool pattern as other clawd tools (`DFlowTool`, `KalshiTool`, etc.) and can be plugged directly into the Clawd Leviathan agent runtime.

---

## Links

- **npm:** https://www.npmjs.com/package/@openclawdsolana/clawd-perps
- **Full agent CLI:** https://www.npmjs.com/package/@openclawdsolana/clawd
- **Phoenix DEX:** https://phoenix.trade
- **Homepage:** https://solanaclawd.com
- **Token:** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`
