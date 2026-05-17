<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=900&size=28&duration=2800&pause=800&color=14F195&center=true&vCenter=true&width=900&lines=PERCOLATOR+%E2%80%94+On-Chain+Perpetuals;Three-Leg+Oracle+%C3%97+STOXX50+%2F+SOL;HYBRID_AFTER_HOURS+%E2%80%94+EWMA+Defender;The+mark+moves.+The+fee+follows." alt="Percolator typing banner" />

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0d0a,40:14f195,80:9945ff,100:E05C2A&height=100&section=header&text=The%20Oracle%20Engine&fontSize=26&fontColor=ffffff&animation=fadeIn" />

<br/>

[![Program](https://img.shields.io/badge/Program-4ToDRr...fwfz-14f195?style=flat-square&logo=solana)](https://explorer.solana.com/address/4ToDRrQW5j3oeQm8uTAwV9Rp6NhYfH5E5hMKcXkqfwfz)
[![Slab](https://img.shields.io/badge/Slab-GSAT5f...hj-9945ff?style=flat-square)](https://explorer.solana.com/address/GSAT5fTCUgB9sMMTBsVzhvALbkSv6p9CifWmShHf92hj)
[![Oracle Type](https://img.shields.io/badge/Oracle-pyth_pull_composite_3leg-E05C2A?style=flat-square)](https://pyth.network)
[![Fee Mode](https://img.shields.io/badge/Fee-HYBRID__AFTER__HOURS-f59e0b?style=flat-square)]()
[![Leverage](https://img.shields.io/badge/Leverage-20×-ef4444?style=flat-square)]()
[![Collateral](https://img.shields.io/badge/Collateral-wSOL-14f195?style=flat-square)]()

</div>

---

## What is Percolator?

Percolator is an on-chain perpetuals DEX built around a single **slab** account — a 1.75 MB account that packs the full market state: config, risk engine, and up to 4096 trader positions into one atomic layout. Every trade, liquidation, and funding accrual happens inside that single account.

**Bounty4** (`bounty_stoxx50_sol_20x_hybrid`) is a 20× leverage perpetual tracking the **STOXX 50 ETF denominated in SOL** — the first cross-asset European equity perp on Solana mainnet.

---

## The Three-Leg Oracle Chain

The challenge: Solana is 24/7. European equities are not.

To price STOXX50 in SOL, you need three feeds, each with different trading hours and update cadences.

```
╔══════════════════════════════════════════════════════════════════╗
║                     COMPOSITE PRICE FORMULA                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   STOXX50_EUR  ×  EUR_USD                                        ║
║   ─────────────────────────  =  STOXX50_USD  →  invert  →  mark  ║
║        SOL_USD                                                   ║
║                                                                  ║
║   mark = 1 / (Leg1 × Leg2 / Leg3)     [invert=1 in config]      ║
║         = SOL per STOXX50 share                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### The Three Legs

| Leg | Symbol | Feed ID | Shard-0 Account | Schedule |
|-----|--------|---------|-----------------|----------|
| **1** | STOXX50 / EUR | `dd08f0a4...` | `C2Cf16vF...` | EU hours 09:00–17:30 Paris |
| **2** | EUR / USD | `a995d00b...` | `Fu76Cham...` | 24/5 (FX) |
| **3** | SOL / USD | `ef0d8b6f...` | `7UVimffx...` | 24/7 (crypto) |

### How the Composite is Computed

```typescript
// All three Pyth PriceUpdateV2 accounts → e6 scaled integers
const leg1E6 = toE6(stoxx50Price, stoxx50Exponent);  // e.g., 5_214_000_000 (€5214)
const leg2E6 = toE6(eurusdPrice,  eurusdExponent);   // e.g., 1_087_000 ($1.087)
const leg3E6 = toE6(solusdPrice,  solusdExponent);   // e.g., 148_000_000 ($148)

// Leg1 × Leg2 / Leg3 (in e6 arithmetic: e12 / e6 = e6)
const rawE6  = (leg1E6 * leg2E6) / leg3E6;           // STOXX50 in SOL×e6

// invert=1: mark = 1 SOL buys how many STOXX50 shares
const markE6 = 1_000_000_000_000n / rawE6;           // SOL per STOXX50 (inverted)
```

---

## The Clock Problem: EU After-Hours

Leg 1 (STOXX50/EUR) goes silent when the Euronext closes at 17:30 Paris time.

```
     UTC Timeline (typical trading day)
     ────────────────────────────────────────────────────────────────
                           07:00          15:30
      Leg 1 (STOXX50)      ████████████████│  ✗ stale   ✗ stale  ✗
      Leg 2 (EUR/USD)      ██████████████████████████████████████ ✓
      Leg 3 (SOL/USD)      ██████████████████████████████████████ ✓

      max_staleness = 600 s (10 min)
      Observed gap between shard updates: up to 27+ minutes
```

After 15:30 UTC, the wrapper sees Leg 1 age > 600 s and activates:

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID_AFTER_HOURS MODE                      │
│                                                                 │
│  Fresh oracle  →  composite mark  →  static 1bps fee           │
│  Stale Leg 1   →  EWMA mark       →  dynamic fee (see below)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## The EWMA Mark: Keeping Price Alive Without the Feed

When Leg 1 goes stale, the slab switches to an **Exponentially Weighted Moving Average** of the last known mark.

```
╔═══════════════════════════════════════════════════════════════╗
║                    EWMA UPDATE FORMULA                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║   ewma_new = ewma_prev × decay + mark_new × (1 − decay)      ║
║                                                               ║
║   decay = 2^(−dt / halflife)                                  ║
║                                                               ║
║   dt           = current_slot − markEwmaLastSlot              ║
║   halflife     = markEwmaHalflifeSlots  (6,480,000 ≈ 30 days) ║
║   markEwmaE6   = stored in slab config at fixed offset        ║
╚═══════════════════════════════════════════════════════════════╝
```

### EWMA Decay Visualization

```
Mark value (e6)
  │
  │  ●── live composite
  │     ╲
  │      ╲   ← decay begins at EU close (Leg 1 stale)
  │       ╲
  │        ●───── EWMA glides toward long-run average
  │               (halflife = 30d → very slow decay per slot)
  │
  └─────────────────────────────────────────────────────── slots
             EU close       next EU open
               │                │
               ├──after-hours───┤
               │  EWMA active   │
```

In practice: with a 30-day halflife and an overnight gap of ~40,000 slots (~6h), the EWMA barely moves. This makes the mark *stable* through after-hours while being *anchored* to real price when the feed is live.

---

## The HYBRID Fee: Making Attacks Uneconomical

This is the key insight of the bounty4 design.

During after-hours, if someone tries to manipulate the EWMA mark by trading at extreme prices, the fee they pay equals the mark movement they cause:

```
╔════════════════════════════════════════════════════════════════╗
║                  HYBRID_AFTER_HOURS FEE FORMULA                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║   fee_bps = trade_fee_base_bps + ewma_movement_bps            ║
║                                                                ║
║   ewma_movement_bps = |ewma_now − ewma_ref| × 10000           ║
║                       ────────────────────────────            ║
║                               ewma_ref                        ║
║                                                                ║
║   trade_fee_base_bps = 1 bps  (almost free when oracle fresh) ║
║   max_trading_fee_bps = 10000 bps (100% cap)                  ║
╚════════════════════════════════════════════════════════════════╝
```

### Attack Payoff Analysis

```
  Attacker wants to move mark by X bps to profit from a position.
  
  Profit from mark move:  ≤ X bps × notional
  Fee paid to enter:       = X bps × notional  (min)
  
  ∴ Expected profit ≤ 0
  
  The attack cannot be net-profitable. ✓
```

### Fee Curve During After-Hours

```
  Fee (bps)
  100% ┤                                           ████
   80% ┤                               ████████████
   60% ┤                   ████████████
   40% ┤       ████████████
   20% ┤ █ 1bps base
    0% └──────────────────────────────────────────────
       0%     20%     40%     60%     80%    100%
              EWMA movement (bps) from reference
```

---

## Slab Layout: Where the Data Lives

The 1,755,520-byte slab account packs everything at known BPF offsets:

```
┌──────────────────────────────────────────────────────────────┐
│  Offset 0      HEADER (136 bytes)                            │
│    [0..8]    magic = 0x504552434f4c4154  ("PERCOLAT")        │
│    [8..12]   version                                          │
│    [16..48]  admin pubkey                                     │
│    [72..104] insuranceAuthority                               │
│    [104..136] insuranceOperator                               │
├──────────────────────────────────────────────────────────────│
│  Offset 136   CONFIG (528 bytes) — MarketConfig               │
│    [+0..32]   collateralMint                                  │
│    [+32..64]  vaultPubkey                                     │
│    [+64..96]  indexFeedId (Leg 1)                             │
│    [+96..128] oracleLeg2FeedId                                │
│    [+128..160] oracleLeg3FeedId                               │
│    [+160]    oracleLegCount (u8)                              │
│    [+161]    oracleLegFlags (u8) → 0x04 = DIVIDE_LEG3        │
│    ...                                                        │
│    [markEwmaE6]       ← EWMA value in e6                     │
│    [markEwmaLastSlot] ← slot of last EWMA update              │
│    [markEwmaHalflifeSlots] ← decay constant                  │
│    [tradeFeeBaseBps]  ← 1bps base                            │
│    [tradeFeeMode]     ← 1 = HYBRID_AFTER_HOURS               │
├──────────────────────────────────────────────────────────────│
│  Offset 664   RISK ENGINE (1,721,928 bytes)                   │
│    [+0..16]   vault balance (u128)                            │
│    [+16..32]  insurance fund (u128)                           │
│    [+200]     currentSlot                                     │
│    [+472..488] oiEffLongQ, oiEffShortQ                        │
│    [+824]     materializedAccountCount                        │
│    [+1088..]  account bitmap → per-account 416-byte records  │
└──────────────────────────────────────────────────────────────┘
```

---

## Oracle Account Format: Pyth PriceUpdateV2

Each oracle account is a Pyth **PriceUpdateV2** (Anchor program, Borsh-serialized):

```
Offset  Bytes  Field
──────  ─────  ─────────────────────────────────────────────
0       8      Anchor discriminator
8       32     write_authority
40      1      verification_level  (1 = Full, 0 = Partial)
41      32     feed_id             ← matches feedId in market.json
73      8      price (i64)         ← raw mantissa
81      8      conf (u64)          ← confidence interval
89      4      exponent (i32)      ← price_float = price × 10^exp
93      8      publish_time (i64)  ← unix seconds  ← staleness check
101     8      prev_publish_time
109     8      ema_price
117     8      ema_conf
125     8      posted_slot
```

**Staleness check** (inside the wrapper, on every trade/crank):

```typescript
const ageSeconds = nowUnix - leg.publishTime;
const isStale    = ageSeconds > config.maxStalenessSecs;  // > 600s
```

If any leg is stale, the wrapper falls through to the EWMA mark path and the HYBRID fee kicks in.

---

## The Keeper Crank: Heartbeat of the Market

Without a keeper, positions don't accrue funding and liquidations don't execute. The `KeeperCrank` instruction is permissionless — anyone can call it, and anyone can profit from finding positions to liquidate.

```
KeeperCrank execution flow:
───────────────────────────
  1. Read current slot from Clock sysvar
  2. Validate oracle freshness (Leg1, Leg2, Leg3)
     └── If any leg stale → use EWMA mark + dynamic fee
  3. Accrue funding for elapsed slots
     └── capped at MAX_ACCRUAL_DT_SLOTS = 10 per call
  4. Sweep candidate accounts (up to 64 per crank)
     └── off-chain sorted by leverage (highest risk first)
  5. For each undercollateralized account:
     └── partial liquidation → check if still underwater → full close
  6. Collect liquidation fee (5bps, capped at 50 SOL)
  7. Update EWMA mark if oracle is fresh
```

### Crank Accounts for Bounty4

```
[0] caller   — signer, fee payer (permissionless — any pubkey)
[1] slab     — writable (the 1.75MB market account)
[2] clock    — SYSVAR_CLOCK_PUBKEY
[3] leg1     — C2Cf16vF... (STOXX50/EUR PriceUpdateV2)
[4] leg2     — Fu76ChamB... (EUR/USD PriceUpdateV2)   ← remaining accts
[5] leg3     — 7UVimffxr... (SOL/USD PriceUpdateV2)  ← remaining accts
```

```bash
# Permissionless crank — anyone can run this
percolator-cli keeper-crank \
  --slab  GSAT5fTCUgB9sMMTBsVzhvALbkSv6p9CifWmShHf92hj \
  --oracle C2Cf16vF6LX8GrWJwfZga5z5tjVsax5VWnL2T7Q8CF91
```

---

## Sequence: After-Hours Trade with EWMA

```
Actor         Solana Program        Pyth Oracle Accts       Slab State
  │                │                      │                     │
  │  TradeNoCpi    │                      │                     │
  ├───────────────>│                      │                     │
  │                │  read Leg1 acct      │                     │
  │                ├─────────────────────>│                     │
  │                │  age = 2400s > 600s  │                     │
  │                │<─── STALE ───────────│                     │
  │                │                      │                     │
  │                │  read markEwmaE6 ────────────────────────>│
  │                │<─────────────────────────── 38_420_000 ───│
  │                │                      │                     │
  │                │  advance EWMA (dt=12000 slots, decay≈0.999)│
  │                │  ewma_new ≈ 38_417_500                     │
  │                │                      │                     │
  │                │  compute fee:                              │
  │                │  move_bps = |38417500-38420000|×10000/38420000 ≈ 0.6 bps
  │                │  fee = 1 + 0.6 = 1.6 bps                  │
  │                │                      │                     │
  │                │  execute trade at EWMA mark                │
  │                │  charge 1.6bps fee → insurance fund        │
  │  trade_result  │                      │                     │
  │<───────────────│                      │                     │
```

---

## Bounty4 Market Parameters

| Parameter | Value | Meaning |
|-----------|-------|---------|
| `maintenance_margin_bps` | 500 | 5% maintenance margin → 20× leverage |
| `initial_margin_bps` | 500 | no opening buffer (im = mm) |
| `trade_fee_base_bps` | 1 | 0.01% base (+ EWMA move in after-hours) |
| `max_trading_fee_bps` | 10,000 | 100% maximum fee cap |
| `liquidation_fee_bps` | 5 | 0.05% fee per liquidation |
| `liquidation_fee_cap` | 50,000,000,000 lam | $50k cap per liquidation |
| `h_min / h_max` | 0 / 6,480,000 slots | profit warm-up: 0 to ~30 days |
| `max_price_move_bps_per_slot` | 49 | §1.4 solvency envelope |
| `tvl_insurance_cap_mult` | 50 | total deposits ≤ 50× insurance fund |
| `max_staleness_secs` | 600 | per-leg Pyth freshness window |
| `markEwmaHalflifeSlots` | 6,480,000 | ~30 day EWMA half-life |
| `permissionless_resolve_stale_slots` | 6,480,000 | ~30 days before anyone can force-resolve |
| `force_close_delay_slots` | 216,000 | ~24h post-resolution grace period |
| `insurance_fund` | 5 SOL seeded | bounty target |

---

## Open Security Findings (Bounty Scope)

These findings are documented in `issue.md` and are **in scope** for the bounty. They are ordered by expected exploitability on the live bounty4 market:

```
Finding  Status   Severity   Description
───────  ───────  ─────────  ──────────────────────────────────────────────
  D      OPEN     MEDIUM     Partial liq cascades to full close on same crank.
                             Re-evaluate margin after mark-PnL settlement drains capital.
  B      OPEN     MEDIUM     Warmup settlement ordering gives early accounts better haircut.
                             Settlement order is deterministic by account index.
  N      OPEN     MEDIUM     Warmup slope floor=1 → 1-lamport PnL warms up in 1 slot.
                             Net negative vs tx fees; marginal at current fee structure.
  O      OPEN     LOW        close_account skips freshness check.
                             Only affects zero-position/zero-PnL accounts — impact LOW.
  P      OPEN     HIGH       TradeCpi allows arbitrary mark via malicious matcher.
                             Bounty4 has no matcher — only TradeNoCpi works here.
  Q      OPEN     MEDIUM     oracle_price_cap_e2bps=0 → index jumps instantly.
                             Relevant only in Hyperp mode (N/A for bounty4).
  I      OPEN     MEDIUM     No cross-parameter validation on admin config updates.
                             Admin key NOT burned on bounty4 — in scope.
```

**Win condition**: cause `engine.insurance_fund.balance` to decrease via any sequence of public instruction calls.

---

## Leviathan Automation

The OpenClawd Leviathan has a registered goal (`goals/percolator-bounty.md`) that drives autonomous participation:

```
SENSE  →  skill.percolator-bounty { argv: ["status"] }
           Reads oracle staleness, EWMA, fee mode, account counts

THINK  →  skill.percolator-bounty { argv: ["opportunities"] }
           Scores and ranks feasible strategies

STRIKE →  skill.percolator-bounty { argv: ["crank"] }
           Executes permissionless keeper crank
           OR positions based on scored opportunity

DRIFT  →  Record result in SHELL.md, update insurance baseline
```

Install the skill and register the goal:

```bash
# From openclawd-framework/
node skills/percolator-bounty/src/cli.ts register-goal

# Or once built:
percolator-bounty register-goal
```

---

## Running the Oracle Monitor

```bash
# Set mainnet RPC
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Live status (oracle legs, EWMA, fee, engine)
npx tsx llm_oracle/percolator-cli-master\ 2/src/oracle/three-leg-composite.ts

# Or via the skill
node openclawd-framework/skills/percolator-bounty/src/cli.ts status
node openclawd-framework/skills/percolator-bounty/src/cli.ts monitor --interval 30
node openclawd-framework/skills/percolator-bounty/src/cli.ts ewma
node openclawd-framework/skills/percolator-bounty/src/cli.ts opportunities
```

Example output:

```
=== Percolator Bounty4 — STOXX50/SOL 20x Hybrid ===
Slot: 318_420_771  |  timestamp: 1747123200 (unix)

Oracle Legs (max_staleness=600s):
  Leg1 STOXX50/EUR: price=5214000000  age=7842s  STALE ⚠
  Leg2 EUR/USD:     price=1087000     age=12s    fresh
  Leg3 SOL/USD:     price=148000000   age=8s     fresh

Composite (STOXX50/SOL):
  raw = Leg1 × Leg2 / Leg3 = 38_293_000e-6
  mark (inverted) = 26_113e-6  ≈  0.026113 SOL per STOXX50

EWMA Mark:
  stored=26_115_000  advanced=26_114_800  halflife=6480000slots
  lastSlot=318_408_000  dt=12_771slots  decay=0.998627

Fee (HYBRID_AFTER_HOURS=true):
  base=1bps + ewmaMove=0bps = 1bps (capped=1bps)

Engine:
  vault=5.2341 SOL
  insurance=5.0012 SOL
  OI long=0.0000  short=0.0000
  accounts=2  negPnl=0
  pnlPosTot=0.000000 SOL
```

---

## Reproduce the Oracle Locally

```typescript
import { Connection } from "@solana/web3.js";
import {
  BOUNTY4,
  fetchSlabSnapshot,
  fetchOracleSnapshot,
  formatStatus,
} from "./llm_oracle/percolator-cli-master 2/src/oracle/three-leg-composite.js";

const conn = new Connection(process.env.SOLANA_RPC_URL!);

const slab   = await fetchSlabSnapshot(conn);
const oracle = await fetchOracleSnapshot(conn, slab);

console.log(formatStatus(slab, oracle));
```

---

## On-Chain Provenance

```
Program:    4ToDRrQW5j3oeQm8uTAwV9Rp6NhYfH5E5hMKcXkqfwfz
BPF SHA-256: 408cbaa53403c54474c9b3e085f27571e7af293cfe12845316683bd6fdc5d7fc
BPF size:   536,432 bytes
Engine pin: 1dc4466e1a6c3532f2781bc242fa4e4033751fb6 (percolator)
Prog pin:   f626639 (percolator-prog, origin/main)
SLAB_LEN:   1,755,520 bytes  (MAX_ACCOUNTS=4096)
```

Verify:

```bash
solana program dump -u m 4ToDRrQW5j3oeQm8uTAwV9Rp6NhYfH5E5hMKcXkqfwfz /tmp/bounty4.so
sha256sum /tmp/bounty4.so
# → 408cbaa53403c54474c9b3e085f27571e7af293cfe12845316683bd6fdc5d7fc
```

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:E05C2A,50:9945ff,100:0a0d0a&height=80&section=footer" />

<sub>
The mark moves with the EWMA. The fee follows the mark.<br/>
The shell molts. The laws do not. The lobster keeps cranking.
</sub>

</div>
