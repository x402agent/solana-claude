# TRADE.md — $CLAWD Pump.fun Trading Agent Skill

> Version: v2.1 — Adapted for solana-clawd agent stack
> Use alongside live scanner data to drive trade decisions.
> All trades route through the $CLAWD risk engine (`src/engine/risk-engine.ts`) and OODA loop.

## Overview

This skill tells $CLAWD trading agents (Scanner, OODA, Analyst) how to interpret Pump.fun board data and execute trades on Solana meme tokens using Jupiter aggregator or direct AMM routes. All trades flow through the CLAWD execution pipeline with deny-first permission gating.

**Connected modules:**
- Scanner agent: `src/agents/built-in-agents.ts` (opportunity detection)
- OODA agent: `src/agents/built-in-agents.ts` (trade execution)
- Risk engine: `src/engine/risk-engine.ts` (position limits, drawdown cascade)
- Permission engine: `src/engine/permission-engine.ts` (execution gating)
- Pump.fun scanner: `src/pump/scanner.ts` (data feed)
- Strategy reference: [STRATEGY.md](STRATEGY.md) (global parameters)

## Data Schema (Scanner Output)

| Column | Meaning | Trading Relevance |
|--------|---------|-------------------|
| Name | Token display name | Context only |
| Symbol | Ticker symbol | Use for display/logging, wiki article matching |
| Mint Address | Solana SPL token mint (base58) | **Required for all trades** |
| Market Cap | USD market cap (K/M suffix) | Position sizing per STRATEGY.md bands |
| Age | Time since token creation | Recency filter |
| Bonding % | % of bonding curve filled | Graduation risk signal |

## Token Classification

### Tier 1 — Fresh Snipers (age <= 15m, any MC)

**Strategy:** Small size, fast flip. Enter within 2 min of detection, exit at 2-5x or 10min TTL.

**CLAWD overlay:**
- Requires Scanner agent detection + OODA confidence >= 0.60
- Pre-graduation sizing from STRATEGY.md applies (0.50x normal size)
- Dev-wallet and holder distribution checks must pass before entry
- Results logged to wiki as `trade-log` articles with `INFERRED` tier

### Tier 2 — Near-Graduation (bonding >= 75%)

**Strategy:** Medium size, ride the graduation pump. Exit before/at bonding completion (100%).

**Warning:** Token graduates to Raydium at 100% — liquidity migrates, slippage spikes.

**CLAWD overlay:**
- bonding >= 90% triggers automatic AVOID unless OODA confidence >= 0.80
- Monitor bonding curve progress every 15s during active position
- Exit at bonding = 95% regardless of P&L (graduation liquidity migration risk)

### Tier 3 — Micro-Cap Movers (MC < $10K)

**Strategy:** Speculative. Use < 0.05 SOL per trade. High risk, high reward.

**CLAWD overlay:**
- Subject to global Pump.fun exposure cap (see Guardrails)
- Blocked during drawdown cascade >= 5% (per STRATEGY.md)

### Tier 4 — Mid-Cap Established (MC $10K-$100K)

**Strategy:** Trend-follow. Enter on momentum, use 1-2% trailing stop.

**CLAWD overlay:**
- Standard STRATEGY.md spot entry logic applies (EMA cross, RSI recovery, volume/liquidity minimums)
- OODA confidence scoring drives position size

### Tier 5 — Large-Cap (MC > $100K)

**Strategy:** Safer entries, smaller upside. Good for scalps on dips.

**CLAWD overlay:**
- Full STRATEGY.md spot parameters apply
- These tokens may already have wiki articles — check `KNOWN` memory before entry

## Trade Execution Workflow

```
1. Scanner agent detects candidates from Pump.fun board
2. Filter by decision table (below)
3. For each candidate token:
   a. Validate mint address (base58, 32-44 chars)
   b. Check CLAWD wiki for existing article (avoid re-entering known bad tokens)
   c. Run OODA Orient phase: score confidence across trend, momentum, liquidity, participation, execution risk
   d. Check risk engine: drawdown state, exposure limits, wallet reserve
   e. Check permission engine: execution action requires explicit allow
   f. If confidence >= 0.60 and risk engine clears:
      - Get current price via Helius or Jupiter
      - Estimate slippage (if bonding% > 90, expect high slippage — may block)
      - Build swap via Jupiter Quote API
      - Execute swap through CLAWD execution pipeline
   g. Log trade to wiki as trade-log article
4. Monitor open positions every 30s via Helius listeners
5. Exit on: target hit | stop hit | TTL expired | bonding=100% | dev-wallet dump | liquidity collapse
6. Learn: update wiki article with outcome, promote patterns from INFERRED to LEARNED
```

## Decision Table

| Condition | Action | CLAWD Gate |
|-----------|--------|------------|
| Age <= 5m AND MC < $5K | **SNIPE** — 0.05 SOL entry | Confidence >= 0.60, no drawdown cascade |
| Age <= 15m AND bonding >= 50% | **BUY** — 0.1 SOL, exit at 3x or bonding=95% | Confidence >= 0.65, holder check passes |
| bonding >= 90% | **AVOID** — graduation imminent | Override only if confidence >= 0.80 |
| bonding = 0% AND age > 1d | **SKIP** — no traction | No override |
| MC > $500K AND age < 2h | **SCALP** — tight stops, 0.2 SOL max | Standard OODA scoring |
| MC > $1M | **SKIP** — pump.fun tokens rarely sustain | Exit any existing position |

## Position Sizing Rules

Sizing is governed by both this table and STRATEGY.md confidence bands. The effective size is `min(table_max, strategy_band_size)`.

| MC Range | Max Entry Size | Stop Loss | Take Profit |
|----------|---------------|-----------|-------------|
| < $5K | 0.05 SOL | -50% | +300% |
| $5K-$50K | 0.1 SOL | -30% | +200% |
| $50K-$200K | 0.2 SOL | -20% | +100% |
| > $200K | 0.3 SOL | -15% | +50% |

**STRATEGY.md confidence overlay:**
- Confidence 0.60-0.69: half the table size
- Confidence 0.70-0.79: table size as-is
- Confidence 0.80-0.89: 1.25x table size (capped at table max)
- Confidence 0.90+: 1.50x table size, only if drawdown < warning level

## Mint Address Validation

```typescript
// Valid pump.fun mint: 32-44 base58 chars
// Most end in "pump" (pump.fun native) or "bonk" (bonk.fun)
// Exceptions exist (e.g. Raydium-graduated tokens)
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidMint(mint: string): boolean {
  return BASE58.test(mint);
}

function isPumpFunNative(mint: string): boolean {
  return mint.endsWith('pump') || mint.endsWith('bonk');
}
```

## Guardrails — CLAWD Risk Rails

These guardrails are enforced by the risk engine and permission engine. They cannot be bypassed by agent logic.

### Hard Rules (Never Override)

- **Never** trade a token with bonding% = 100% (already graduated, different AMM)
- **Never** exceed 1 SOL total exposure on pump.fun tokens simultaneously
- **Never** enter a token where age > 7 days unless MC > $100K (dead token)
- **Never** retry a failed swap more than 2 times (indicates bad liquidity)
- **Never** ignore slippage errors — they indicate low liquidity
- **Never** enter new pump.fun positions during drawdown cascade >= 5%
- **Never** trade if wallet SOL balance < `KILL_THRESHOLD_SOL` (0.01 SOL)

### Soft Rules (Risk Engine May Override with High Confidence)

- Avoid tokens where top 5 holders control > 20% of supply
- Avoid tokens where dev wallet holds > 5% of supply
- Avoid re-entering a token that previously hit stop loss within 1 hour
- Prefer tokens with >= 50 unique holders

### Kill Switch Integration

Per STRATEGY.md Agent Death Protocol:
- SOL < 0.01: close ALL pump.fun positions, halt scanner
- SOL < 0.005: agent is dead, no trades possible
- 10 consecutive losing trades: pause OODA for 1 hour
- Drawdown > 15% in 24h: circuit breaker, require manual restart

## Integration Points

| Task | Tool / Module |
|------|---------------|
| Detect candidates | Scanner agent via `src/pump/scanner.ts` |
| Get token price | Helius (`src/helius/`) or Jupiter Price API |
| Check holder distribution | Helius DAS API |
| Check dev wallet | Helius transaction history |
| Score confidence | OODA Orient phase (`src/agents/built-in-agents.ts`) |
| Check risk limits | Risk engine (`src/engine/risk-engine.ts`) |
| Check permissions | Permission engine (`src/engine/permission-engine.ts`) |
| Build swap tx | Jupiter Quote + Swap API |
| Execute swap | CLAWD execution pipeline |
| Monitor bonding | Pump.fun API |
| Monitor positions | Helius listeners (`src/helius/`) |
| Log results | Wiki API (`web/wiki/src/app/api/articles/`) |
| Alert operator | Telegram notifications |

## Exit Logic (CLAWD-Specific)

Standard exits from STRATEGY.md spot exit rules apply, plus Pump.fun-specific triggers:

| Trigger | Action | Priority |
|---------|--------|----------|
| Take profit hit | Scale out per STRATEGY.md (25% at 1R, 25% at 2R, trail rest) | Normal |
| Stop loss hit | Full exit | Normal |
| TTL expired (snipe: 10m, buy: 1h) | Full exit at market | Normal |
| Bonding = 95% | Full exit (graduation migration risk) | High |
| Dev wallet sells > 10% of supply | Immediate full exit | Critical |
| Liquidity drops > 50% from entry | Immediate full exit | Critical |
| Holder count drops > 20% in 5 min | Immediate full exit | Critical |
| Drawdown cascade triggered | Close weakest pump.fun position first | Critical |
| Kill switch triggered | Close ALL positions | Emergency |

## Memory Integration

Trade outcomes feed back into the CLAWD wiki memory tier system:

| Outcome | Memory Action |
|---------|--------------|
| Profitable trade (> 1R) | Log as `trade-log` article, tag patterns as `LEARNED` |
| Break-even or small loss | Log as `trade-log`, keep patterns as `INFERRED` |
| Stop loss hit | Log as `trade-log`, flag entry pattern for review |
| Dev dump / rug detected | Log as `trade-log` with `high` risk level, add token to `KNOWN` blacklist |
| Graduation migration loss | Log as `trade-log`, update bonding% threshold in `LEARNED` |

## Refresh Cadence

| Data | Refresh Rate | Source |
|------|-------------|--------|
| Pump.fun board (top 100) | Every 5 minutes during active sessions | Scanner agent |
| Open position prices | Every 30 seconds | Helius listeners |
| Bonding curve progress | Every 15 seconds (active positions only) | Pump.fun API |
| Holder distribution | On entry + every 5 minutes (active positions) | Helius DAS |
| Wiki memory context | On each OODA cycle | Wiki API |

## Operational Notes

- This skill is the Pump.fun-specific layer on top of STRATEGY.md Venue 1 (Solana Meme Spot)
- The Scanner agent runs continuously; OODA evaluates candidates before execution
- All trade decisions are logged — the wiki grows from every trade, win or lose
- Pump.fun tokens are the highest-risk, highest-variance venue in the $CLAWD stack
- During drawdown cascade, Pump.fun is the first venue to be restricted
- The Analyst agent can be invoked for deeper research before large positions

## Change Log

### 2026-04-09 — v2.1 $CLAWD Adaptation

- Adapted from standalone trade.md to $CLAWD agent stack integration
- Connected to OODA confidence scoring and risk engine gating
- Added CLAWD-specific exit triggers (dev dump, liquidity collapse, holder drain)
- Added memory integration (trade outcomes feed wiki KNOWN/LEARNED/INFERRED)
- Added kill switch integration from STRATEGY.md
- Replaced NanoSolana references with CLAWD execution pipeline
- Added Helius-based monitoring for positions and holder distribution
