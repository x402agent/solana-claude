# TRADE.md -- Pump.fun Trading Agent Skill (solana-clawd)

> Adapted for solana-clawd v1.6 OODA trading loop + MCP tools
> Use this file alongside live `solana_trending` / `scan_pump_token` data to drive trade decisions.

---

## Overview

This skill tells trading agents how to interpret pump.fun market data and execute
trades on Solana pump.fun tokens using Jupiter aggregator or direct AMM routes.
All trades flow through solana-clawd's **permission engine** (deny-first) and
require explicit human approval via `permissionMode: "ask"`.

```text
pump.fun data -> OODA Loop -> Trade Plan -> Permission Gate -> Execution
                   |              |              |
               OBSERVE         DECIDE         ACT (human approves)
```

---

## Data Schema (pump.fun columns)

| Column | Meaning | Trading Relevance |
|--------|---------|-------------------|
| Name | Token display name | Context only |
| Symbol | Ticker symbol | Use for display/logging |
| Mint Address | Solana SPL token mint (base58) | **Required for all trades** |
| Market Cap | USD market cap (K/M suffix) | Position sizing |
| Age | Time since token creation | Recency filter |
| Bonding % | % of bonding curve filled | Graduation risk signal |

---

## Token Classification

### Tier 1 -- Fresh Snipers (age <= 15m, any MC)

**Strategy:** Small size, fast flip. Enter within 2 min of detection, exit at 2-5x or 10min TTL.

**solana-clawd agent:** `PUMP_SCANNER_AGENT` detects these automatically and routes signals to Telegram.

```bash
# Telegram bot command
/scan             # toggle background pump scanner
/signal           # show active pump signals
```

**MCP tool chain:**
```text
scan_pump_token -> solana_token_info -> memory_write (tier=INFERRED)
```

### Tier 2 -- Near-Graduation (bonding >= 75%)

**Strategy:** Medium size, ride the graduation pump. Exit before/at bonding completion (100%).

**Warning:** Token graduates to Raydium at 100% -- liquidity migrates, slippage spikes.

**solana-clawd tool:**
```text
get_pump_market_data -> check bonding% -> if >= 75% -> alert via Telegram
```

### Tier 3 -- Micro-Cap Movers (MC < $10K)

**Count typical scan:** ~48 tokens
**Strategy:** Speculative. Use <0.05 SOL per trade. High risk, high reward.

### Tier 4 -- Mid-Cap Established (MC $10K-$100K)

**Count typical scan:** ~36 tokens
**Strategy:** Trend-follow. Enter on momentum, use 1-2% trailing stop.

### Tier 5 -- Large-Cap (MC > $100K)

**Count typical scan:** ~16 tokens
**Strategy:** Safer entries, smaller upside. Good for scalps on dips.

---

## Trade Execution Workflow (solana-clawd OODA)

```text
OBSERVE:
  1. solana_trending -> get top movers
  2. scan_pump_token -> parse bonding curve data
  3. memory_recall(tier=KNOWN) -> check cached prices
  4. memory_recall(tier=INFERRED) -> check prior signals

ORIENT:
  5. solana_token_info(mint) -> metadata + security score
  6. solana_top_traders(mint) -> smart money activity
  7. Score each candidate:
     Trend:     0-25
     Momentum:  0-20
     Liquidity: 0-20
     Volume:    0-15
     Risk:      -20
     -----------
     Minimum:    60

DECIDE:
  8. If score >= 60 -> generate trade plan
  9. Position sizing per tier (see table below)
  10. memory_write(tier=INFERRED, content="Trade plan: BUY {mint} at {price}")

ACT:
  11. *** REQUIRES HUMAN APPROVAL ***
  12. Permission engine gates all trade_execute calls
  13. Execute swap via Jupiter aggregator
  14. Log result to memory (tier=KNOWN)

LEARN:
  15. Write outcome to LEARNED tier
  16. Dream agent consolidates patterns overnight
```

### Detailed Execution Steps

```text
For each candidate token:
  a. Verify mint is valid (32-44 char base58, typically ends in "pump" or "bonk")
  b. Check current price via Jupiter Price API
     GET https://price.jup.ag/v6/price?ids={MINT}
  c. Estimate slippage: if bonding% > 90, expect high slippage
  d. Build swap transaction via Jupiter Quote API
     GET https://quote-api.jup.ag/v6/quote
       ?inputMint=So11111111111111111111111111111111111111112
       &outputMint={MINT}
       &amount={LAMPORTS}
       &slippageBps=500
  e. Execute swap (permission-gated)
  f. Log result to trade journal + memory_write(tier=KNOWN)
  g. Monitor open positions every 30s
  h. Exit on: target hit | stop hit | TTL expired | bonding=100%
```

---

## Decision Table

| Condition | Action |
|-----------|--------|
| Age <= 5m AND MC < $5K | **SNIPE** -- 0.05 SOL entry |
| Age <= 15m AND bonding >= 50% | **BUY** -- 0.1 SOL, exit at 3x or bonding=95% |
| bonding >= 90% | **AVOID** -- graduation imminent, liquidity migration risk |
| bonding = 0% AND age > 1d | **SKIP** -- no traction |
| MC > $500K AND age < 2h | **SCALP** -- tight stops, 0.2 SOL max |
| MC > $1M | **SKIP** -- pump.fun tokens rarely sustain; exit any existing |

---

## Position Sizing Rules

| MC Range | Max Entry Size | Stop Loss | Take Profit |
|----------|---------------|-----------|-------------|
| < $5K | 0.05 SOL | -50% | +300% |
| $5K-$50K | 0.1 SOL | -30% | +200% |
| $50K-$200K | 0.2 SOL | -20% | +100% |
| > $200K | 0.3 SOL | -15% | +50% |

**Hard limit:** Never exceed 1 SOL total exposure on pump.fun tokens simultaneously.

---

## Mint Address Validation

```python
# Valid pump.fun mint: 32-44 base58 chars
# Most end in "pump" (pump.fun native) or "bonk" (bonk.fun)
# Exceptions exist (e.g. Raydium-graduated tokens)
import re
BASE58 = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
def is_valid_mint(mint: str) -> bool:
    return bool(BASE58.match(mint))
```

TypeScript equivalent (used in solana-clawd):
```typescript
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
function isValidMint(mint: string): boolean {
  return BASE58_RE.test(mint)
}
```

---

## Guardrails -- NEVER Do These

1. **Never** trade a token with bonding% = 100% (already graduated, different AMM)
2. **Never** use more than 1 SOL total exposure on pump.fun tokens simultaneously
3. **Never** enter a token where age > 7 days unless MC > $100K (dead token)
4. **Never** retry a failed swap more than 2 times (indicates bad liquidity)
5. **Never** ignore slippage errors -- they indicate low liquidity
6. **Never** bypass the permission engine (`permissionMode: "ask"` is mandatory for trades)
7. **Never** execute trades without writing a trade plan to INFERRED memory first

---

## solana-clawd Integration Points

| Task | solana-clawd Tool | Fallback |
|------|-------------------|----------|
| Get token price | `solana_price` MCP tool | `GET https://price.jup.ag/v6/price?ids={mint}` |
| Token metadata | `solana_token_info` MCP tool | Birdeye API |
| Smart money | `solana_top_traders` MCP tool | -- |
| Security score | `solana_token_info` (includes score) | Rugcheck API |
| Build swap tx | Jupiter Quote + Swap API v6 | -- |
| Send transaction | Permission-gated `trade_execute` | -- |
| Monitor bonding | `scan_pump_token` MCP tool | `GET https://frontend-api.pump.fun/coins/{mint}` |
| Refresh token list | `solana_trending` MCP tool | Re-run pump scanner skill |
| Write signal | `memory_write` (tier=INFERRED) | -- |
| Recall context | `memory_recall` (tier=KNOWN+INFERRED) | -- |
| Alert user | Telegram `/signal` command | -- |

---

## Telegram Bot Commands for Trading

| Command | Description |
|---------|-------------|
| `/scan` | Toggle background pump scanner |
| `/signal` | Show active pump signals |
| `/snipe [config]` | Start sniper bot (requires private key) |
| `/stop` | Stop sniper/scanner |
| `/grad <mint>` | Check graduation progress |
| `/mcap <mint>` | Current market cap |
| `/research <mint>` | Full OODA research report |
| `/deepresearch <mint>` | Holders + pools + top traders + chart + narrative |

---

## OODA Configuration

```yaml
# solana-clawd OODA config for pump.fun trading
ooda:
  cycleDurationMs: 300000    # 5 minutes between scans
  maxCycles: 100             # stop after 100 cycles
  learnAfterEveryAct: true   # write to LEARNED after each trade
  autoStartOnBoot: false     # manual start required
  minScore: 60               # minimum ORIENT score to enter DECIDE phase
  sizeBands:
    - range: [60, 69]
      multiplier: 0.5        # half size
    - range: [70, 79]
      multiplier: 1.0        # base size
    - range: [80, 89]
      multiplier: 1.25       # 1.25x
    - range: [90, 100]
      multiplier: 1.5        # 1.5x
```

---

## Refresh Cadence

- **Active trading session:** Refresh every 5 minutes via OODA cycle
- **Background monitoring:** Telegram `/scan` runs continuously, alerts on score >= 60
- **Manual research:** `/research <mint>` on demand
- After each refresh, re-run classification and update open-position watchlist
- Dream agent consolidates trade patterns into LEARNED tier every 4 hours

---

## Permission Model

```text
solana-clawd permission resolution for trade operations:

  deny > ask > allow > default

Trade tools are ALWAYS in the "ask" category:
  - trade_execute        -> ask (human approval required)
  - wallet_send          -> ask
  - wallet_sign          -> ask

Read-only tools are auto-approved:
  - solana_price         -> allow
  - solana_trending      -> allow
  - solana_token_info    -> allow
  - solana_top_traders   -> allow
  - scan_pump_token      -> allow
  - memory_recall        -> allow
  - memory_write         -> allow

Glob patterns supported:
  trading.buy(*)         -> matches any buy call
  trading.buy(BONK)      -> matches BONK buy only
  pump.*                 -> matches all pump namespace tools
```

---

## Memory Tier Usage for Trading

| Tier | What gets written | TTL | Example |
|------|-------------------|-----|---------|
| **KNOWN** | Current prices, balances, scan results | ~60s | "BONK: $0.000042, +12% 1h" |
| **INFERRED** | Trade plans, signals, hypotheses | Until promoted/expired | "BONK showing accumulation, score 72" |
| **LEARNED** | Confirmed patterns, trade outcomes | Permanent | "Tokens with bonding >90% have 80% chance of -50% within 1h post-graduation" |

---

*solana-clawd v1.6.0 -- MIT -- github.com/x402agent/solana-clawd*
