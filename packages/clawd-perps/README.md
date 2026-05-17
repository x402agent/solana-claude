# @openclawdsolana/clawd-perps

**Phoenix Perpetuals DEX CLI integration for the OpenClawd framework.**  
Trade perps on Solana from the terminal or import the `ClaWDPerps` class directly into your agent code.

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

---

## Architecture

`clawd-perps` is a pure TypeScript HTTP client — it targets the [Phoenix Perpetuals](https://phoenix.trade) REST API at `https://perp-api.phoenix.trade`. No Vulcan binary is required. Transaction-building endpoints return serialized Solana transactions that you sign with any wallet (Phantom, Backpack, `@solana/web3.js`, etc.).

The `ClaWDPerps` class follows the same tool pattern as other clawd tools (`DFlowTool`, `KalshiTool`, etc.) and can be plugged directly into the Clawd Leviathan agent runtime.

---

## Links

- **npm:** https://www.npmjs.com/package/@openclawdsolana/clawd-perps
- **Full agent CLI:** https://www.npmjs.com/package/@openclawdsolana/clawd
- **Phoenix DEX:** https://phoenix.trade
- **Homepage:** https://solanaclawd.com
- **Token:** `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`
