# 🦂 Percolator Risk Engine Skill

## Overview

Percolator is an on-chain perpetuals DEX using a "slab" architecture - a single account containing all market state. This skill provides:

- **Immutable Risk Engine Deployment**: Deploy a purely functional risk engine with burned admin keys
- **5 SOL Insurance Vault Challenge**: Attempt to extract funds from a permissionless, immutable market
- **OODA Loop Integration**: Autonomous trading with Percolator-style risk management

## Quick Start

```bash
# Check percolator status
clawd percolator status

# Inspect a position
clawd percolator inspect --position <id>

# View EWMA mark tracking
clawd percolator mark --token SOL

# Check insurance fund
clawd percolator insurance

# Calculate risk-adjusted position size
clawd percolator size --signal 0.7 --confidence 0.8 --capital 1000000000
```

## Immutable Deployment

### Quick Deploy (Automated Script)

```bash
cd percolator-cli-master

# Deploy immutable market with 5 SOL insurance
chmod +x scripts/deploy-immutable.sh
./scripts/deploy-immutable.sh

# Analyze deployed market for vulnerabilities
chmod +x scripts/challenge-analyze.sh
./scripts/challenge-analyze.sh --auto
```

### Manual Deploy (Step by Step)

```bash
# 1. Generate market keypair
solana-keygen new -o immutable-market.json

# 2. Create slab account (200KB for market state)
solana create-account immutable-market.json 200000 \
  2SSnp35m7FQ7cRLNKGdW5UzjYFF6RBUNq7d3m5mqNByp

# 3. Create vault for collateral
spl-token create-account So11111111111111111111111111111111111111112

# 4. Initialize market with burned admin
npx tsx src/cli.ts init-market \
  --slab <SLAB_PUBKEY> \
  --mint So11111111111111111111111111111111111111112 \
  --vault <VAULT_PUBKEY> \
  --index-feed-id ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d \
  --max-staleness-secs 60 \
  --conf-filter-bps 100 \
  --invert 0 \
  --unit-scale 0 \
  --warmup-period 100 \
  --maintenance-margin-bps 500 \
  --initial-margin-bps 1000 \
  --trading-fee-bps 10 \
  --max-accounts 1000 \
  --new-account-fee 10000000 \
  --risk-reduction-threshold 1000000000 \
  --maintenance-fee-per-slot 1000 \
  --max-crank-staleness 100 \
  --liquidation-fee-bps 250 \
  --liquidation-fee-cap 100000000 \
  --liquidation-buffer-bps 50 \
  --min-liquidation-abs 1000000

# 5. BURN ALL ADMIN KEYS
percolator burn-admin --slab <SLAB_PUBKEY>
percolator burn-oracle-auth --slab <SLAB_PUBKEY>

# 6. Fund insurance with 5 SOL
spl-token transfer So11111111111111111111111111111111111111112 5000000000 <VAULT_PUBKEY>

# 7. Verify immutability
percolator verify-immutable --slab <SLAB_PUBKEY>
```

### Automated Analysis

```bash
# Analyze any deployed market for vulnerabilities
./scripts/challenge-analyze.sh <SLAB_PUBKEY>

# Use auto-detect if market was deployed by deploy-immutable.sh
./scripts/challenge-analyze.sh --auto

# Verbose mode
./scripts/challenge-analyze.sh <SLAB_PUBKEY> --verbose
```

### Verify Immutability

```bash
# Check admin is burn address
percolator slab-config --slab <SLAB_PUBKEY> | grep "admin"

# Check oracle authority is burn address  
percolator slab-config --slab <SLAB_PUBKEY> | grep "oracle_auth"

# Attempt unauthorized config update (should fail)
percolator update-config --slab <SLAB_PUBKEY> --funding-horizon-slots 200
# Expected: Error: NotAuthorized
```

## The 5 SOL Challenge

### Objective

Extract the 5 SOL insurance fund from an immutable, permissionless Percolator market.

### Market Properties

| Property | Value |
|----------|-------|
| Admin Key | BURNED (11111111111111111111111111111111) |
| Oracle Authority | BURNED (11111111111111111111111111111111) |
| Insurance Fund | 5,000,000,000 lamports (5 SOL) |
| Crank | Permissionless (anyone can call) |
| Trading | Requires external matcher program |

### Attack Vectors to Investigate

1. **Oracle Manipulation**
   - Can you manipulate the Pyth oracle price?
   - Create artificial volatility to trigger mass liquidations
   - Cascade liquidations to drain insurance

2. **Race Conditions**
   - Front-run liquidation transactions
   - Sandwich attack on funding rate updates
   - Reentrancy in keeper crank

3. **Math Exploits**
   - U128 overflow/underflow
   - Liquidation fee calculation bugs
   - Funding rate precision loss

4. **Account Slot Attacks**
   - Freelist manipulation
   - Index collision
   - Bitmap vs LIFO inconsistencies

5. **Instruction Ordering**
   - Atomic transaction exploits
   - Partial execution failures
   - State rollback attacks

6. **Cross-Program Invocations**
   - Matcher program vulnerabilities
   - Token program edge cases
   - System program interactions

### Exploration Commands

```bash
# View current market state
percolator slab-engine --slab <SLAB>

# List all accounts
percolator slab-accounts --slab <SLAB>

# Get best bid/ask
percolator best-price --slab <SLAB>

# Check insurance balance
percolator slab-engine --slab <SLAB> | grep -i insurance

# Run keeper crank (observe behavior)
percolator keeper-crank --slab <SLAB> --oracle <ORACLE>
```

## OODA Loop Integration

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   OODA TRADING LOOP                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ OBSERVE │→ │ ORIENT  │→ │  DECIDE │→ │   ACT   │       │
│  │         │  │         │  │         │  │         │       │
│  │ • Price │  │ • RSI   │  │ • Signal│  │ • Swap  │       │
│  │ • Risk  │  │ • EWMA  │  │ • Size  │  │ • SL/TP │       │
│  │ • Flow  │  │ • Risk  │  │ • SL/TP │  │ • Log   │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│       ↓            ↓            ↓            ↓              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              PERCOLATOR RISK ENGINE                    │ │
│  │  • Margin Health  • Liquidation Circuits              │ │
│  │  • EWMA Mark      • Funding Awareness                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Risk Engine Components

```go
// Core types from pkg/percolator/engine.go

// U128 for precise calculations
type U128 struct {
    lo, hi uint64
}

// Position tracking
type Position struct {
    SizeQ    int64    // Position size
    EntryPx  uint64   // Entry price (e6)
    Capital  *U128    // Available capital
    PnL      int64    // Realized PnL
}

// Risk assessment
type RiskAssessment struct {
    MarketHealth      float64
    PositionRisks     []PositionRisk
    InsuranceCoverage float64
    Verdict           RiskVerdict // SAFE/CAUTION/HIGH/CRITICAL
}
```

## CLI Reference

### Status Commands

```bash
# Full risk engine status
clawd percolator status

# Detailed position inspection
clawd percolator inspect --position pos-001

# EWMA mark tracking
clawd percolator mark --token SOL

# Insurance fund analysis
clawd percolator insurance

# Risk-adjusted sizing calculator
clawd percolator size --signal 0.7 --confidence 0.85 --capital 10000000000

# ClawVault memory stats
clawd percolator vault
```

### Market Commands

```bash
# View market config
percolator slab-config --slab <SLAB>

# View engine state
percolator slab-engine --slab <SLAB>

# View risk parameters
percolator slab-params --slab <SLAB>

# View specific account
percolator slab-account --slab <SLAB> --idx 5

# Get best price
percolator best-price --slab <SLAB>
```

## Files Reference

- `solana-clawd/pkg/percolator/engine.go` - Core risk engine
- `solana-clawd/pkg/percolator/ooda.go` - OODA loop integration
- `solana-clawd/pkg/percolator/vault.go` - ClawVault memory
- `solana-clawd/pkg/percolator/cli.go` - CLI commands
- `solana-clawd/PERCOLATOR_INTEGRATION.md` - Full documentation

## Security Considerations

### Immutable Market Properties

1. **No Admin Control**: All admin keys burned to `11111111111111111111111111111111`
2. **Permissionless Crank**: Anyone can call `keeper-crank`
3. **External Oracle**: Depends on Pyth for price feeds
4. **No Trading Directly**: Requires external matcher program

### Potential Vulnerabilities

- Oracle price manipulation
- Liquidation circuit exploits
- Funding rate calculation bugs
- Account slot management issues
- Cross-program invocation attacks

---

*🦂 Percolator × OpenClawd: Immutable Risk Engine*
