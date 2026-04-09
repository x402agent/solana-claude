# $CLAWD Trading Strategy

Last updated: 2026-04-09
Version: v2.1
Scope: Solana meme spot, Hyperliquid perps, Aster perps

## Canonical Links

- Repo: [github.com/x402agent/solana-clawd](https://github.com/x402agent/solana-clawd)
- Vault: [vault.solanaclawd.com](https://vault.solanaclawd.com)
- Wiki: `web/wiki` (operational knowledge base)
- Agent Fleet: `src/agents/built-in-agents.ts`

## Objective

$CLAWD trades three distinct venues with one shared risk engine:

- **Solana spot momentum** for Pump.fun and post-graduation meme tokens
- **Hyperliquid perpetuals** for liquid directional expression and funding dislocations
- **Aster perpetuals** for Solana-native perp exposure when on-chain settlement and shared wallet context matter

The strategy is not a single indicator stack. It is a venue-aware decision system that changes filters, stops, size, and exit behavior based on liquidity profile, leverage profile, and microstructure.

## Core Principles

- Trade momentum only when liquidity, structure, and execution quality agree.
- Prefer no trade over low-quality trade.
- Size from confidence, not conviction.
- Spot meme trades are asymmetric and event-driven; perp trades are tighter and inventory-managed.
- The system must preserve capital through drawdown cascades before optimizing for upside.

## Unified OODA Flow

The OODA loop is the core operating model for all $CLAWD finance agents. It maps directly to the memory tier system in `web/wiki` and the agent fleet in `src/agents/`.

1. **Observe**
   Gather price, volume, liquidity, volatility, funding, OI, social velocity, holder concentration, dev-wallet behavior, and venue-specific execution constraints.
   Sources: Helius (`src/helius/`), Jupiter, Pump.fun (`src/pump/`), on-chain listeners.

2. **Orient**
   Score the setup across trend, momentum, liquidity, participation, and execution.
   Cross-check with `LEARNED` memory for recurring patterns and `KNOWN` memory for active conditions.

3. **Decide**
   Compare confidence against venue threshold, apply global risk caps, then choose spot long, perp long, perp short, reduce, close, or pass.
   Route through the risk engine (`src/engine/risk-engine.ts`) and permission engine (`src/engine/permission-engine.ts`).

4. **Act**
   Route through the correct execution path:
   - Solana spot via Jupiter or venue-specific flow
   - Hyperliquid via perp orders
   - Aster via Solana-native perp execution

5. **Learn**
   Log outcome, slippage, realized volatility, and exit quality; feed results back into the auto-optimizer.
   Promote corroborated patterns from `INFERRED` to `LEARNED` in the wiki.

## Global Execution Rules

- Minimum confidence to enter: `0.60`
- Confidence bands:
  - `0.60-0.69`: half-size
  - `0.70-0.79`: base-size
  - `0.80-0.89`: 1.25x size
  - `0.90+`: 1.50x size, only if global drawdown is below warning level
- New risk is blocked if:
  - wallet reserve would fall below hard minimum
  - venue connectivity is degraded
  - slippage estimate exceeds venue cap
  - drawdown cascade is active

## Confidence Model

Each candidate trade receives a weighted score from 0.00 to 1.00.

| Component | Weight | What it measures |
| --- | ---: | --- |
| Trend structure | 0.25 | EMA alignment, slope, higher-high or lower-low integrity |
| Momentum quality | 0.20 | RSI regime, breakout velocity, candle expansion |
| Liquidity quality | 0.20 | Depth, spread, slippage estimate, executable size |
| Participation | 0.15 | Volume expansion, OI expansion, social/flow confirmation |
| Execution risk | 0.20 | Funding, volatility shock risk, holder concentration, dev-wallet risk |

Execution risk is subtractive. A trade can fail despite strong momentum if liquidity or structure is weak.

## Venue 1: Solana Meme Spot

This venue covers Pump.fun launches, post-graduation Raydium flow, and liquid Solana meme rotations. Powered by the Scanner and OODA agents.

### Intent

- Capture breakout continuation and recovery bounces in high-velocity meme tokens
- Avoid low-liquidity traps, insider-heavy launches, and hopeless grind-down structures
- Trade long-only unless the venue shifts to perps

### Spot Parameters

```json
{
  "venue": "solana-spot",
  "rsiOverbought": 72,
  "rsiOversold": 28,
  "emaFastPeriod": 9,
  "emaSlowPeriod": 21,
  "emaSlopeLookback": 5,
  "atrPeriod": 14,
  "minVolume24h": 200000,
  "minLiquidityUsd": 50000,
  "maxSlippage": 0.02,
  "basePositionSizePct": 0.10,
  "stopLossPct": 0.07,
  "takeProfitPct": 0.25,
  "atrStopMultiplier": 1.8,
  "atrTakeProfitMultiplier": 3.5,
  "holderConcentrationLimit": 0.20,
  "devWalletMaxPct": 0.05,
  "allowShorts": false
}
```

### Spot Entry Logic

LONG fires only when all are true:

1. RSI is in recovery: `oversold < RSI < oversold + 12`
2. Fresh bullish EMA cross: `EMA9 crosses above EMA21`
3. Price is above fast EMA and reclaim holds through the close
4. Slow EMA slope is not materially negative
5. 24h volume and liquidity exceed minimums
6. Estimated execution slippage is inside cap

### Pump.fun Early Launch Overlay

For very early meme tokens the system applies a separate overlay:

- Pre-graduation entries use `0.50x` normal size
- Hard stop widens to `15%`
- Profit target widens to `100%`
- Entry only allowed when:
  - bonding curve progress is constructive
  - buyer flow is still net-expanding
  - dev-wallet behavior is not hostile
  - launch quality passes basic holder distribution checks

This overlay exists because pre-graduation Pump.fun microstructure does not behave like post-graduation spot.

### Spot Exits

- Primary stop: `max(price * 7%, ATR * 1.8)`
- Primary take profit: `max(price * 25%, ATR * 3.5)`
- Scale out on strength:
  - take `25%` off at `1R`
  - take `25%` off at `2R`
  - trail remainder under fast EMA or recent swing low
- Immediate exit conditions:
  - dev-wallet dump or hostile insider distribution
  - liquidity collapse
  - failed breakout reclaim with expanding sell volume

## Venue 2: Hyperliquid Perpetuals

Hyperliquid is the cleanest venue for fast directional expression, especially when funding and OI are part of the thesis.

### Intent

- Trade trend continuation and exhaustion reversals in liquid perps
- Use funding and open interest as regime filters, not standalone triggers
- Keep stops tighter than meme spot because leverage magnifies mistakes

### Hyperliquid Parameters

```json
{
  "venue": "hyperliquid",
  "rsiOverbought": 70,
  "rsiOversold": 30,
  "emaFastPeriod": 9,
  "emaSlowPeriod": 21,
  "atrPeriod": 14,
  "basePositionSizePct": 0.08,
  "stopLossPct": 0.05,
  "takeProfitPct": 0.18,
  "atrStopMultiplier": 1.5,
  "atrTakeProfitMultiplier": 2.8,
  "maxSlippage": 0.005,
  "fundingRateThreshold": 0.0003,
  "minOpenInterestUsd": 5000000,
  "minVolume24h": 10000000,
  "marginMode": "isolated"
}
```

### Funding Bias Map

| Funding state | Interpretation | Default bias |
| --- | --- | --- |
| Heavy positive | Crowded longs | Prefer shorts or long profit-taking |
| Moderate positive | Mild long crowding | Longs allowed only with strong trend |
| Neutral | Balanced | Follow structure |
| Moderate negative | Mild short crowding | Shorts require stronger confirmation |
| Heavy negative | Crowded shorts | Prefer longs or short profit-taking |

Funding is used with OI and price direction:

- Price up + OI up + heavy positive funding can still be a long, but size is reduced
- Price down + OI up + heavy positive funding strengthens short bias
- Funding flips against the position are exit signals when combined with momentum decay

### Hyperliquid Entry Logic

LONG requires:

1. Trend alignment or strong reclaim structure
2. RSI recovery or breakout continuation
3. OI confirms, not fades, the move
4. Funding is neutral-to-supportive or negative enough to support squeeze potential
5. Spread and slippage remain inside cap

SHORT requires:

1. Bearish EMA structure or breakdown reclaim failure
2. RSI rollover
3. OI expands with the move or trapped-long structure is visible
4. Funding is positive enough to support short thesis
5. Liquidation risk is acceptable under isolated margin

### Hyperliquid Exits

- Hard stop: `max(price * 5%, ATR * 1.5)`
- Base take profit: `max(price * 18%, ATR * 2.8)`
- Close early if:
  - funding flips sharply against the position
  - OI diverges from price
  - mark-price trigger fires against the trade and confidence collapses

## Venue 3: Aster Perpetuals

Aster is treated as the Solana-native perp venue inside the same operator wallet context.

### Intent

- Express perp views while staying aligned with Solana-native treasury, research, and wallet flows
- Manage perps alongside spot without starving the wallet of gas or reserve liquidity

### Aster Parameters

```json
{
  "venue": "aster",
  "rsiOverbought": 70,
  "rsiOversold": 30,
  "emaFastPeriod": 9,
  "emaSlowPeriod": 21,
  "atrPeriod": 14,
  "basePositionSizePct": 0.07,
  "stopLossPct": 0.05,
  "takeProfitPct": 0.16,
  "atrStopMultiplier": 1.5,
  "atrTakeProfitMultiplier": 2.5,
  "maxSlippage": 0.0075,
  "fundingRateThreshold": 0.00025,
  "minVolume24h": 3000000,
  "reserveSol": 0.05,
  "marginMode": "isolated"
}
```

### Aster Rules

- Keep at least `0.05 SOL` reserved for gas and wallet continuity
- Do not allow Aster perp size to crowd out Solana spot opportunities
- Favor Aster when:
  - a Solana-native thesis already exists
  - the wallet context matters
  - the token or correlated asset is already on the Solana watchlist

### Aster Entry and Exit

The signal stack is similar to Hyperliquid, but sizing is slightly smaller and profit targets are tighter. Aster is used as a disciplined expression layer, not a degen leverage venue.

## Global Risk Model

### Drawdown Cascade

| Drawdown | Action |
| --- | --- |
| `5%` | Reduce weakest exposure and block high-risk Pump.fun entries |
| `8%` | Close all perp positions and revert to spot-only or flat mode |
| `12%` | Full halt on new risk until manual or automated review clears it |

### Kill Switch — Agent Death Protocol

When the $CLAWD agent runs out of money, it dies. This is intentional.

| Trigger | Action |
| --- | --- |
| SOL balance < `KILL_THRESHOLD_SOL` (default `0.01`) | **CRITICAL**: Close ALL positions, cancel ALL orders, halt OODA |
| SOL balance < `DEAD_THRESHOLD_SOL` (default `0.005`) | **DEAD**: Stop daemon, log death |
| Portfolio value < 5% of `INITIAL_FUNDING_SOL` | **DEATH SPIRAL**: Emergency liquidate everything |
| 10 consecutive losing trades | **TILT PROTECTION**: Pause OODA for 1 hour, notify operator |
| Drawdown > 15% in 24 hours | **CIRCUIT BREAKER**: Halt trading, require manual restart |

**On death:**
1. All open positions closed at market across all venues
2. All pending orders cancelled (Hyperliquid, Aster)
3. OODA loop halted permanently
4. Final P&L persisted as `LEARNED` conclusion in the wiki
5. Telegram: `AGENT TERMINATED — wallet depleted. Fund > 0.05 SOL to resurrect.`
6. Daemon stays alive for status queries but refuses new trades

**What does NOT happen:**
- No borrowing, no margin calls, no spending gas it can't afford
- No recovery trades with dust — the agent accepts death cleanly
- No hiding — operator sees it immediately via Telegram and vault dashboard

**Resurrection:**
1. Fund wallet above `0.05 SOL`
2. Run OODA in simulation mode to verify signals
3. Resume live trading
4. Memory persists everything from the previous life

### Portfolio Rules

- No more than one high-volatility new listing at full size
- No correlated perp stacking across venues without explicit confirmation
- Spot and perp books share one global risk budget
- Venue-specific wins do not justify raising total exposure during drawdown recovery

## Auto-Optimizer

The optimizer can mutate parameters only inside bounded ranges.

| Parameter | Min | Max |
| --- | ---: | ---: |
| `rsiOversold` | 20 | 40 |
| `rsiOverbought` | 60 | 80 |
| `emaFastPeriod` | 5 | 20 |
| `emaSlowPeriod` | 15 | 60 |
| `stopLossPct` | 0.03 | 0.15 |
| `takeProfitPct` | 0.10 | 1.00 |
| `positionSizePct` | 0.02 | 0.25 |
| `fundingRateThreshold` | 0.0001 | 0.0010 |

### Optimizer Tiers

| Win rate / outcome state | Action |
| --- | --- |
| `< 35%` | Defensive mode: widen stop modestly, tighten RSI filters, cut size |
| `< 45%` | Tighten entry filters only |
| `55-65%` | Hold baseline unless sample quality is high |
| `> 65%` | Slight size increase, capped by drawdown state |
| `> 72%` with positive expectancy and adequate sample | Allow very small size increase or wider TP |

Overfitting protection:

- minimum trade sample required before promotion
- no single-parameter jump larger than approved mutation step
- optimizer cannot bypass global drawdown rules

## Venue Selection Matrix

| Condition | Preferred venue |
| --- | --- |
| Early viral launch, asymmetric upside, no borrow/short need | Solana spot |
| Liquid directional trend with funding/OI edge | Hyperliquid |
| Solana-native perp thesis with wallet-context priority | Aster |
| Liquidity poor, spread wide, signals mixed | No trade |

## Connected Modules

| Surface | Role |
| --- | --- |
| `src/agents/built-in-agents.ts` | OODA, Scanner, Analyst agents execute this strategy |
| `src/engine/risk-engine.ts` | Enforces drawdown cascade, kill switch, position limits |
| `src/engine/permission-engine.ts` | Deny-first gating on execution actions |
| `src/helius/` | Solana market data, account resolution, priority fees |
| `src/pump/` | Pump.fun launch discovery, bonding curve analysis |
| `web/wiki` | OODA context memory (KNOWN/LEARNED/INFERRED tiers) |
| `web/vault` | Clawd Vault for source documents and compiled research |
| `STRATEGY.md` | This file — single source of truth for trading parameters |

## Operational Notes

- Spot meme tokens are allowed to be noisy; perps are not
- Pump.fun setups must survive stricter distribution and execution checks
- Hyperliquid is the default venue for clean long/short expression
- Aster is the Solana-native execution layer when treasury and wallet alignment matter
- The wiki memory tier system feeds directly into OODA Orient phase
- All strategy changes must be reflected here and in the wiki article

## Change Log

### 2026-04-09 — v2.1 $CLAWD Multi-Venue Strategy

- Adapted from SolanaOS strategy framework to $CLAWD agent stack
- Integrated with CLAWD wiki memory tiers (KNOWN/LEARNED/INFERRED)
- Connected to CLAWD agent fleet (OODA, Scanner, Analyst, Dream)
- Linked to Clawd Vault research pipeline and risk engine
- Added connected modules table mapping strategy to runtime

### 2026-03-21 — v2.0 Multi-Venue Framework

- Reframed from single meme setup into venue-aware system
- Added separate parameter profiles for Solana spot, Hyperliquid perps, and Aster perps
- Added Pump.fun pre-graduation sizing and exit rules
- Added unified confidence scoring and drawdown cascade
- Added professional optimizer bounds and anti-overfitting rules
