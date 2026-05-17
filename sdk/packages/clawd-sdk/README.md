# @openclawd/solana-sdk

Solana SDK and IDL for AI agent and token launches. Built on top of Meteora's Dynamic Bonding Curve (DBC) with a new adaptive intelligence layer, Token2022/pToken support, and a vault with novel burn and lock mechanics.

---

## What's inside

### Token standards
| Standard | Description |
|----------|-------------|
| `spl` | Standard SPL Token (Token Program) |
| `token2022` | Token Extensions — any combination of transfer fee, metadata pointer, permanent delegate, interest bearing, non-transferable, etc. |
| `ptoken` | **Programmable Token** — Token2022 + Transfer Hook pointing to the clawd_protocol program. Every transfer runs on-chain logic: behavioral tracking, fee routing to vault, conviction score updates. |

### Adaptive Bonding Curve
A sentiment engine wraps the DBC pool. It computes an EMA-based buy/sell sentiment score and adjusts the effective fee in real time:

- **Bullish** → fee discount (incentivise continued buying)
- **Bearish** → fee premium (slow down selling pressure)
- Updates on-chain via `update_curve_sentiment` — permissionless, interval-gated

### Vault & Novel Burn Mechanisms

Four orthogonal burn mechanisms, all permissionless:

#### 1. Entropy Burns
Reads the DBC pool's `volatility_accumulator` directly. When it exceeds a configurable threshold, burns from the inflation reserve proportional to excess volatility.

```
burn = reserve × max(0, accumulator − threshold) × sensitivity / 10000
```

*Creates a negative-feedback loop: more volatility → more supply burned → price stabilises.*

#### 2. Behavioral Fingerprint Burns
Scores each wallet's trading behaviour across three axes:
- **Trade frequency** — >30 trades in 60 slots signals bot activity
- **Hold duration** — avg hold <3 slots signals flipper
- **Position size** — normalised position BPS

Wallets above the bot threshold lose a fraction of pending **rewards** (not principal). Call is permissionless; only requires publicly observable trade data.

#### 3. Anti-Gravity Sweep
When `current_price < floor_price` (configurable % of ATH):
1. Uses accumulated fee reserve to buy tokens from the DBC pool
2. Immediately burns all purchased tokens

*Self-funding: fuelled by normal trading fees. No centralised treasury, no admin key.*

#### 4. Agent Epoch Burns
Every epoch (~24h), the bound AI agent reports activity metrics on-chain:
- Tasks completed
- Revenue generated (lamports)
- Uptime (BPS)

Burn from inflation reserve = `reserve × activity_score/10000 × epoch_burn_rate`.

*Active agents → more burns → deflationary pressure. Aligns AI utility with token economics.*

### Conviction Vault
Lock tokens to earn a conviction score and protocol revenue share.

```
score = amount × duration_epochs × consistency_multiplier
multiplier = 1.0 + min(consecutive_epochs × 0.1, 9.0)
```

- Revenue share proportional to score
- **Early exit burns 20% of principal** — a real cost, not a fee
- Consecutive relocking compounds the multiplier

### Milestone-Gated Developer Locks
Team/dev tokens locked until on-chain milestones are verified. No pure time-locks.

Milestone types (all verifiable without off-chain oracles except holder count):
- `MarketCapQuote` — DBC pool quote_reserve reaches threshold
- `CumulativeVolume` — DBC pool cumulative trading volume
- `GraduationAchieved` — pool migrated to permanent AMM
- `AgentTasksCompleted` — agent lifetime tasks counter
- `HolderCount` — requires authority attestation

### Agent-Token Bindings
Every token launch can register an `AgentBinding` PDA that:
- Links the agent's wallet pubkey to the token mint
- Stores the SHA-256 of the agent's character JSON
- Stores the SHA-256 of `three-laws.md` (constitution hash)
- Records lifetime tasks/revenue on-chain as agent operates

---

## Install

```bash
npm install @openclawd/solana-sdk
# or
pnpm add @openclawd/solana-sdk
```

---

## Quick start

### Launch an agent pToken

```typescript
import { Connection, Keypair } from "@solana/web3.js";
import {
  defaultAgentLaunchParams,
  buildAgentLaunchInstructions,
} from "@openclawd/solana-sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const agentWallet = Keypair.generate();

const params = defaultAgentLaunchParams({
  agentWallet: agentWallet.publicKey,
  name: "Clawd Alpha",
  symbol: "CALPHA",
  uri: "https://arweave.net/my-metadata",
  constitutionPath: "./three-laws.md",
  character: { role: "trader", style: "methodical" },
});

const result = await buildAgentLaunchInstructions(
  connection,
  params,
  feeReceiver
);

// result.instructions → Tx 1: mint + vault + binding
// result.mintKeypair → sign with this
// result.vaultPda, result.agentBindingPda → PDAs
```

### Get an adaptive swap quote

```typescript
import { AdaptiveCurve, designDefaultAgentCurve } from "@openclawd/solana-sdk/bonding-curve";

const config = designDefaultAgentCurve({ startPrice: 0.000001, migrationPrice: 0.001 });
const curve = new AdaptiveCurve(config, dbcPoolPubkey);

const quote = await curve.quoteSwap(connection, {
  sqrtPrice: currentSqrtPrice,
  quoteReserve: poolQuoteReserve,
  baseReserve: poolBaseReserve,
  buyBaseForQuote: false, // selling base for quote
  amountIn: 1_000_000n,
});

console.log(quote.outputAmount, quote.sentimentLabel, quote.effectiveFeeNumerator);
```

### Trigger an entropy burn

```typescript
import { estimateEntropyBurn, buildEntropyBurnInstruction } from "@openclawd/solana-sdk/vault";

const estimate = estimateEntropyBurn(vaultState, currentVolatilityAccumulator);

if (estimate.wouldTrigger) {
  const { instructions } = buildEntropyBurnInstruction(
    vaultPda, dbcPool, inflationReserveAccount, baseMint, caller
  );
  // send instructions in a transaction
}
```

### Conviction staking

```typescript
import {
  buildConvictionStakeInstruction,
  estimateConvictionScore,
  slotsUntilFreeUnlock,
} from "@openclawd/solana-sdk/vault";

const score = estimateConvictionScore(
  1_000_000n,     // 1M tokens
  1_296_000n,     // 6 days in slots
  3,              // 3 consecutive epochs locked before
);

const { instructions } = buildConvictionStakeInstruction(
  vaultPda, stakerAta, convictionPoolAta, baseMint, staker,
  1_000_000n, 1_296_000n
);
```

### Milestone-gated dev lock

```typescript
import { defaultDevMilestones, buildCreateMilestoneLockInstruction } from "@openclawd/solana-sdk/vault";

const milestones = defaultDevMilestones(10_000_000n); // lock 10M tokens

const { instructions } = buildCreateMilestoneLockInstruction(
  vaultPda, devAta, vaultTokenAccount, baseMint, devWallet, milestones
);
// Unlocks: 10% at 1k holders, 20% at graduation-size mcap, 30% at 5k holders, 40% at graduation
```

---

## Program ID

```
CLAWDpRoToCoLv1pRoGRaM111111111111111111111
```

Built on top of Meteora DBC:
```
dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
```

---

## Publish

```bash
NPM_TOKEN=$NPM_TOKEN npm publish --access public
```
