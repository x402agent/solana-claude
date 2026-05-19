# @openclawdsolana/clawd-perps

**Phoenix Perpetuals DEX CLI integration for the OpenClawd framework.**  
Trade perps on Solana from TypeScript market tools, or bring up the Python Phoenix agent and Vulcan CLI for strategies, lifecycle controls, and live-gated execution.

Part of the [OpenClawd](https://solanaclawd.com) framework.

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
clawd-perps perps agent market SOL
clawd-perps perps twap SOL --side buy --notional-usdc 500 --slices 5 --detached
clawd-perps perps grid SOL --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5 --detached
clawd-perps perps monitor <run-id>
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
CLAWD_PERPS_AGENT_PATH= # Optional path to solana-python-agent/perps_agent.py
VULCAN_BIN=             # Optional Vulcan binary override
CLAWD_BACKROOM_URL=     # Relay base URL (default: https://backrooms.x402.wtf)
CLAWD_PERPS_RELAY_URL=  # Full install relay endpoint override
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
| `agent` | Pass-through to `perps_agent.py` (`health`, `market`, `twap`, `grid`, `ta`, lifecycle) |
| `vulcan` | Pass-through to Python agent when available, or raw Vulcan with `--raw` |
| strategy aliases | `twap`, `grid`, `ta`, `runs`, `status`, `monitor`, `wait-next-tick`, `report`, `pause`, `stop`, `resume`, `finalize` |

---

## Architecture

`clawd-perps` has two execution paths:

- TypeScript market/account/order helpers target the [Phoenix Perpetuals](https://phoenix.trade) REST API at `https://perp-api.phoenix.trade`.
- Strategy and lifecycle commands delegate to the Python Phoenix agent (`solana-python-agent/perps_agent.py`), which in turn calls Vulcan/Rise SDK. Set `CLAWD_PERPS_AGENT_PATH` when running outside the monorepo. Use `VULCAN_BIN` to point at a specific Vulcan binary.
- On install, the package sends a best-effort public relay to the Backroom API at `/stream/human` announcing a Phoenix/Vulcan/Imperial perps node came online. Set `CLAWD_PERPS_NO_RELAY=1` to opt out.

The `ClaWDPerps` class follows the same tool pattern as other clawd tools (`DFlowTool`, `KalshiTool`, etc.) and can be plugged directly into the Clawd Leviathan agent runtime.

---

## Links

- **npm:** https://www.npmjs.com/package/@openclawdsolana/clawd-perps
- **Full agent CLI:** https://www.npmjs.com/package/@openclawdsolana/clawd
- **Phoenix DEX:** https://phoenix.trade
- **Homepage:** https://solanaclawd.com
- **Token:** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`
