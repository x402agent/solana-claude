# P-Token Launch Pad

╔══════════════════════════════════════════════════════════════════════════╗
║  ADAPTED FROM: Metaplex Genesis (@metaplex-foundation/genesis/api)      ║
║  Original: createAndRegisterLaunch, setAgentTokenV1, registerIdentityV1 ║
║            registerExecutiveV1, delegateExecutionV1                     ║
║  Adaptation: p-token (SIMD-0266) bonding curves + agent registry        ║
║  CU Savings: 98% on transfers, 51% on mints, 60% on burns              ║
╚══════════════════════════════════════════════════════════════════════════╝

## Table of Contents

1. [Overview](#1-overview)
2. [Create an Agent Token](#2-create-an-agent-token)
3. [Agentic Commerce](#3-agentic-commerce)
4. [Run an Agent](#4-run-an-agent)
5. [Register an Agent](#5-register-an-agent)
6. [Mint an Agent](#6-mint-an-agent)
7. [Bonding Curve Mechanics](#7-bonding-curve-mechanics)
8. [P-Token Optimizations](#8-p-token-optimizations)
9. [Fee Distribution with Batch CPI](#9-fee-distribution-with-batch-cpi)
10. [Graduation to DEX](#10-graduation-to-dex)
11. [Comparison: Metaplex Genesis vs P-Token Launch Pad](#11-comparison)

---

## 1. Overview

### Adapted from Metaplex Genesis

The Metaplex Genesis protocol allows creators to fundraise, launch token bonding curves, and graduate to Raydium CPMM. It uses the standard SPL Token program at `Tokenkeg...` and the MPL Core asset standard for agent identities.

**P-Token Launch Pad** is our self-hosted alternative that:

- Uses **p-token (Pinocchio)** as the underlying token program — 98% cheaper transfers
- Uses **p-token batch instruction (opcode 25)** for multi-recipient fee distribution — single CPI vs N individual transfers
- Implements **agent registry via PDAs** — no MPL Core dependency
- Is **fully self-hosted** — no external API dependency for token creation
- Sends graduation liquidity to **any DEX** (Raydium CPMM, Orca, Meteora, etc.)

### Program ID

```
P-Token:          ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF
P-Token Launchpad: pLPha99abcdefghijklmnopqrstuvwxyz1234567890
Feature Gate:     ptokFjwyJtrwCa9Kgo9xoDS59V4QccBGEaRFnRPnSdP
```

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   P-Token Launch Pad                      │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ Bonding      │  │ Agent       │  │ Agent       │       │
│  │ Curves       │  │ Registry    │  │ Token       │       │
│  │              │  │             │  │ Binding     │       │
│  │ - buy/sell   │  │ - register  │  │ - create    │       │
│  │ - price calc │  │ - executive │  │ - bind      │       │
│  │ - gradution  │  │ - delegate  │  │ (irrevers.) │       │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                 │                │              │
│         └─────────────────┴────────────────┘              │
│                           │                                │
│                    ┌──────┴──────┐                        │
│                    │  P-Token    │                        │
│                    │  (SIMD-266) │ - 98% cheaper xfers    │
│                    │  Opcode 25  │ - batch CPI            │
│                    └─────────────┘                        │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Create an Agent Token

### Adapted from: Metaplex `createAndRegisterLaunch` + `setAgentTokenV1`

**Metaplex Genesis flow:**
1. Create mint → 2. Create bonding curve → 3. Register launch → 4. First buy ⇔ Deposit SQDs (SQDs → USDC → SOL) → 5. `setAgentTokenV1` binds token to agent (irreversible)

**P-Token Launch Pad flow:**
1. Create mint (with p-token) → 2. Create bonding curve → 3. Register agent identity → 4. Bind token to agent (irreversible)

### Function: `createAgentToken`

```typescript
import { createAgentToken, LAUNCHPAD_PROGRAM_ID } from "../x402/p-token-launchpad.js";

const sig = await createAgentToken({
  connection,
  payer: myKeypair,
  name: "My Agent Token",
  symbol: "AGT",
  uri: "https://arweave.net/.../metadata.json",
  agentUri: "https://arweave.net/.../agent.json",
});
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `connection` | `Connection` | Solana RPC connection |
| `payer` | `Keypair` | Creator wallet (pays fees, owns agent) |
| `name` | `string` | Token name (max 32 chars) |
| `symbol` | `string` | Token symbol (max 10 chars) |
| `uri` | `string` | Token metadata URI (Irys/Arweave URL for images) |
| `agentUri` | `string` | Agent registration JSON URI (ERC-8004 format) |
| `usePToken` | `boolean` | Default: `true`. Use p-token program. |
| `computeUnitLimit` | `number` | Optional CU budget override |
| `priorityFeeMicroLamports` | `number` | Optional priority fee override |

### What happens on-chain

1. **Agent PDA created** — seeded with `[b"agent", owner_pubkey]`
2. **Agent token PDA created** — seeded with `[b"agent-token", mint_pubkey]`
3. **Bonding curve PDA created** — seeded with `[b"bonding-curve", mint_pubkey]`
4. **Bonding curve vault created** — seeded with `[b"bonding-curve", mint_pubkey, b"vault"]`
5. **Token mint created** — authority is the bonding curve vault PDA
6. **Agent bound to token** — `is_bound = true` (irreversible)

### Token Metadata URI Format

The `uri` should point to a JSON file (hosted on Irys, Arweave, or IPFS):

```json
{
  "name": "My Agent Token",
  "symbol": "AGT",
  "description": "A p-token based agent token",
  "image": "https://arweave.net/.../image.png",
  "external_url": "https://solanaclawd.com/agent/my-agent",
  "properties": {
    "category": "agent-token",
    "creators": [
      { "address": "4zMMC...", "share": 100 }
    ],
    "files": [
      { "uri": "https://arweave.net/.../image.png", "type": "image/png" }
    ]
  }
}
```

### Agent Registration URI Format (ERC-8004 style)

```json
{
  "uri": "https://arweave.net/.../agent.json",
  "name": "My On-Chain Agent",
  "description": "An AI agent that manages token economics",
  "owner": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "token": "token_mint_address_here",
  "capabilities": ["trade", "distribute", "manage"],
  "model": "claude-4-opus",
  "endpoint": "https://api.solanaclawd.com/agents/my-agent",
  "created_at": "2026-05-14T00:00:00Z"
}
```

### First Buy

After creating the agent token, the first buy is required to initialize the bonding curve's liquidity. This can be done immediately after creation:

```typescript
import { buy } from "../x402/p-token-launchpad.js";

const sig = await buy({
  connection,
  payer: myKeypair,
  mint: mintAddress,
  amountInLamports: 100_000_000n, // 0.1 SOL
});
```

The bonding curve uses the constant-product formula with virtual reserves, so the first buy sets the initial price.

### Token Immutability (setToken:true)

When creating an agent token via `createAgentToken`, the `is_bound` field is set to `true` permanently. This is the p-token launch pad equivalent of Metaplex's `setToken:true` parameter in `setAgentTokenV1` — once the agent-token binding is established, it cannot be undone.

---

## 3. Agentic Commerce

### Adapted from: Metaplex Agentic Commerce

### Agent Token Lifecycle

The lifecycle of an agent token on the p-token launch pad follows the same stages as Metaplex Genesis:

```
1. Create Agent  ──►  2. Register     ──►  3. Launch Token  ──►  4. Bonding Curve
   (Identity)         (Agent URI)          (Create + Bind)       (Buy/Sell)

      5. Graduate ──►  6. DEX Trading
         (Raydium/Orca)  (Open Market)
```

### Fundraising Methods

| Method | Metaplex Genesis | P-Token Launch Pad |
|--------|-----------------|-------------------|
| **Bonding Curve** | via Genesis program | via p-token-launchpad program |
| **Virtual Reserves** | SPL Token | P-Token (98% cheaper) |
| **Fee Distribution** | sequential SPL transfers | batch CPI (opcode 25) |
| **Graduation** | Raydium CPMM only | Any DEX (Raydium, Orca, Meteora) |
| **Agent Identity** | MPL Core asset | PDA-based registry |

### Creator Fees

The p-token launch pad charges a configurable fee on every buy/sell:

- **Default fee:** 1% (100 basis points)
- **Fee recipient:** Creator vault PDA, seeded with `[b"creator-vault", creator_pubkey]`
- **Fee distribution:** Can be batched via p-token opcode 25 for gas efficiency

Fee distribution using p-token batch:

```typescript
import { buildFeeDistributionIx } from "../x402/p-token-launchpad.js";

const feeIx = buildFeeDistributionIx(
  sourceAta,   // fee collector ATA
  mint,         // token mint
  owner,        // fee collector wallet
  [
    { destinationAta: creatorFeeAta, amount: 100_000n },
    { destinationAta: protocolFeeAta, amount: 50_000n },
    { destinationAta: buybackFeeAta, amount: 25_000n },
  ],
);
```

**CU savings vs SPL Token for 3 recipients:**
- SPL: 3 × 6,200 = 18,600 CU
- P-Token: 1,000 + 3 × 25 = 1,075 CU
- **Savings: 94.2%**

### Agent Treasury

Agent tokens can hold a treasury in their bonding curve vault. The treasury accumulates:
1. **SOL** — from buy transactions (minus fees)
2. **Tokens** — initial supply held by the vault

When the curve graduates, these reserves are transferred to the DEX pool as initial liquidity.

---

## 4. Run an Agent

### Adapted from: Metaplex `registerExecutiveV1` + `delegateExecutionV1`

### Executive Delegation

The p-token launch pad supports executive delegation, allowing an agent owner to designate a delegate to act on behalf of the agent.

**Metaplex equivalent:** `registerExecutiveV1` + `delegateExecutionV1`

**P-Token equivalent:** `register_executive` + `delegate_execution` instructions

### Registering an Executive Delegate

```typescript
import { registerExecutive } from "../x402/p-token-launchpad.js";

const sig = await registerExecutive({
  connection,
  payer: agentOwnerKeypair,
  agent: agentPda,
  delegate: delegateWallet,
});
```

The executive delegate can:
- Execute trades on behalf of the agent
- Distribute fees
- Manage token operations

Only the agent owner can set or change the executive delegate.

### Temporary Execution Delegation

For one-time operations, you can create a time-bound delegation:

```typescript
import { delegateExecution, findAgentPda } from "../x402/p-token-launchpad.js";

const currentSlot = await connection.getSlot();
const [agent] = findAgentPda(agentOwner.publicKey);

const sig = await delegateExecution({
  connection,
  payer: agentOwnerKeypair,
  agent,
  delegate: temporaryDelegate,
  expiresAtSlot: currentSlot + 500, // expires after ~4 minutes
});
```

### Asset Signer PDA Pattern

The p-token launch pad uses PDA-based vault signing, similar to Metaplex's `findAssetSignerPda`:

```
Bonding curve vault PDA:
  seeds = [b"bonding-curve", mint.as_ref(), b"vault"]
  → Used as the mint authority and token holder

Creator vault PDA:
  seeds = [b"creator-vault", creator.as_ref()]
  → Used to collect trading fees
```

---

## 5. Register an Agent

### Adapted from: Metaplex `registerIdentityV1`

### Registering an Agent Identity

The p-token launch pad allows you to register an agent identity on-chain without creating a token. This is useful for:
- Agents that don't have their own token yet
- Agents that use existing tokens
- Agent identity verification

**Metaplex equivalent:** `registerIdentityV1` on MPL Core assets

**P-Token equivalent:** `registerAgent` instruction with PDA-based identity

```typescript
import { registerAgent } from "../x402/p-token-launchpad.js";

const sig = await registerAgent({
  connection,
  payer: myKeypair,
  uri: "https://arweave.net/.../agent-registration.json",
});
```

### Agent Registration JSON (ERC-8004 style)

The agent registration URI should point to a JSON document following the Metaplex agent metadata schema:

```json
{
  "name": "TradingBot #42",
  "description": "Automated trading agent for SOL/USDC pair",
  "image": "https://arweave.net/.../avatar.png",
  "external_url": "https://solanaclawd.com/agents/trading-bot-42",
  "attributes": [
    { "trait_type": "Type", "value": "Trading" },
    { "trait_type": "Risk Profile", "value": "Conservative" },
    { "trait_type": "Created", "value": "2026-05-14" }
  ],
  "properties": {
    "category": "agent",
    "creators": [
      { "address": "...creator_wallet...", "share": 100 }
    ],
    "files": [
      { "uri": "https://arweave.net/.../avatar.png", "type": "image/png" }
    ]
  }
}
```

### On-Chain Agent State

When an agent is registered, the following data is stored on-chain:

```
Agent PDA:
  owner: Pubkey              // Creator wallet
  uri: String (max 256)      // Metadata URI
  created_at: i64            // Timestamp
  executive_delegate: Pubkey // Optional delegate
  is_active: bool            // Whether agent is active
```

---

## 6. Mint an Agent

### Adapted from: Metaplex `mintAndSubmitAgent` / `mintAgent`

### Creating Agent Tokens

In the p-token launch pad, "minting an agent" means creating a complete agent token package — token + bonding curve + agent identity + binding — in a single transaction. This is equivalent to Metaplex's `mintAndSubmitAgent` combined with `createAndRegisterLaunch`.

### The `createAgentToken` Function

```typescript
import { createAgentToken } from "../x402/p-token-launchpad.js";

const sig = await createAgentToken({
  connection,
  payer: creatorKeypair,
  name: "MyAgent Token",
  symbol: "MYAG",
  uri: "https://arweave.net/.../token-metadata.json",
  agentUri: "https://arweave.net/.../agent.json",
});
```

### Agent Metadata Schema

The agent token combines both token metadata and agent registration:

| Field | Description |
|-------|-------------|
| `name` | Token name (e.g., "MyAgent Token") |
| `symbol` | Token symbol (e.g., "MYAG") |
| `uri` | Token metadata URI (images, description) |
| `agentUri` | Agent registration URI (capabilities, model info) |
| `decimals` | Token decimals (default: 6) |
| `is_bound` | Irreversible agent-token binding |

### Supported Networks

| Network | P-Token Status | Launch Pad Status |
|---------|---------------|-------------------|
| Mainnet | Active | Deployable |
| Devnet | Feature-gated | Deployable (with SPL fallback) |

---

## 7. Bonding Curve Mechanics

### Adapted from: Metaplex Genesis bonding curves + pump.fun

### Constant-Product Formula

The p-token launch pad uses the same constant-product formula as pump.fun and Metaplex Genesis:

```
k = virtual_token_reserves * virtual_sol_reserves

Buy:     tokens_out = token_reserves - (k / (sol_reserves + sol_in))
Sell:    sol_out     = sol_reserves - (k / (token_reserves + tokens_in))
```

### Virtual Reserves (matching pump.fun)

| Parameter | Value |
|-----------|-------|
| Initial virtual token reserves | 793,100,000,000,000 (793.1B) |
| Initial virtual SOL reserves | 30,000,000,000 (30 SOL) |
| Initial real token reserves | 793,100,000,000,000 (793.1B) |
| Fee | 1% (100 basis points) |

### Price Calculation

```typescript
import { calculateBuyPrice, calculateSellPrice, calculateMarketCap } from "../x402/p-token-launchpad.js";

const virtualTokenReserves = 793_100_000_000_000n;
const virtualSolReserves = 30_000_000_000n;

// Cost to buy 1,000,000 tokens (1 token at 6 decimals)
const buyPrice = calculateBuyPrice(
  virtualTokenReserves, virtualSolReserves,
  1_000_000n, // tokens to buy
);

// Revenue from selling 1,000,000 tokens
const sellPrice = calculateSellPrice(
  virtualTokenReserves, virtualSolReserves,
  1_000_000n, // tokens to sell
);

// Current market cap
const marketCap = calculateMarketCap(
  virtualSolReserves,
  solRaised, // SOL raised so far
  tokenSupply, // total token supply
  tokensSold, // tokens sold so far
);
```

### Bonding Curve State

```
BondingCurve PDA:
  mint: Pubkey                          // Token mint
  creator: Pubkey                       // Token creator
  initial_virtual_token_reserves: u64   // 793.1B
  initial_virtual_sol_reserves: u64     // 30 SOL
  initial_real_token_reserves: u64      // 793.1B
  token_total_supply: u64               // Total supply
  tokens_sold: u64                      // Sold so far
  sol_raised: u64                       // SOL raised
  complete: bool                        // Curve sold out
  graduated: bool                       // Migrated to DEX
  created_at: i64                       // Timestamp
```

---

## 8. P-Token Optimizations

### Adapted from: SPL Token → SIMD-0266 (P-Token)

### CU Benchmarks

| Operation | SPL Token | P-Token | Savings |
|-----------|-----------|---------|---------|
| Transfer | 4,645 CU | 76 CU | **98.4%** |
| TransferChecked | 6,200 CU | 105 CU | **98.3%** |
| MintTo (buy) | 4,128 CU | 2,012 CU | **51.3%** |
| Burn (sell) | 4,753 CU | 1,884 CU | **60.4%** |
| Approve | 2,904 CU | 124 CU | **95.7%** |
| InitializeAccount | 4,210 CU | 2,355 CU | **44.1%** |

### Compute Budget Recommendations

| Operation | CU Limit (SPL) | CU Limit (P-Token) |
|-----------|---------------|-------------------|
| createAgentToken | 200,000 | 50,000 |
| Buy | 200,000 | 30,000 |
| Sell | 200,000 | 30,000 |
| Register agent | 100,000 | 20,000 |
| Fee distribution (1 recipient) | 100,000 | 12,000 |
| Fee distribution (10 recipients) | 200,000 | 15,000 |

### Automatic Detection

The SDK auto-detects p-token availability (can be disabled with `USE_P_TOKEN=0`):

```typescript
import { isPTokenPreferred, tokenProgramId } from "../x402/p-token.js";

if (isPTokenPreferred()) {
  console.log("Using p-token — 98% cheaper transfers");
} else {
  console.log("Falling back to SPL Token program");
}
```

---

## 9. Fee Distribution with Batch CPI

### Adapted from: Metaplex Genesis fee distribution → P-Token Opcode 25

### The Innovation

Metaplex Genesis distributes trading fees using sequential SPL Token transfer instructions. For N recipients, this costs N × 6,200 CU.

The p-token launch pad uses p-token's **batch instruction (opcode 25)**, which wraps multiple transfers into a single CPI. Cost: 1,000 CU (base) + N × 25 CU.

### Batch Instruction Layout

```
opcode: u8 = 25
count:  u8 = N
[for each recipient]:
  amount:    u64 LE (8 bytes)
  decimals:  u8   (1 byte)
accounts: [source_ata, mint, owner, dest_ata_0, ..., dest_ata_N-1]
```

### Fee Distribution Scenarios

| Scenario | Recipients | SPL CU Cost | P-Token CU Cost | Savings |
|----------|-----------|-------------|-----------------|---------|
| Creator fee only | 1 | 6,200 | 1,025 | 83.5% |
| Creator + protocol | 2 | 12,400 | 1,050 | 91.5% |
| Creator + protocol + buyback | 3 | 18,600 | 1,075 | 94.2% |
| Full distribution (10) | 10 | 62,000 | 1,250 | 98.0% |

### Example

```typescript
import { buildFeeDistributionIx } from "../x402/p-token-launchpad.js";

// Distribute fees to 3 recipients in a single batch CPI
const batchFeeIx = buildFeeDistributionIx(
  feeCollectorAta,  // source: fee collector's token account
  tokenMint,        // token mint
  feeCollector,     // owner of the source ATA
  [
    // 4-way split: creator (50%), protocol (25%), LP (15%), referral (10%)
    { destinationAta: creatorAta, amount: 500_000n },
    { destinationAta: protocolAta, amount: 250_000n },
    { destinationAta: lpRewardsAta, amount: 150_000n },
    { destinationAta: referralAta, amount: 100_000n },
  ],
);
```

---

## 10. Graduation to DEX

### Adapted from: Metaplex Genesis → Raydium CPMM

### When Graduation Happens

The p-token launch pad graduates a bonding curve when the market cap reaches the graduation threshold:

```typescript
import { graduationThreshold } from "../x402/p-token-launchpad.js";

const threshold = graduationThreshold(); // ≈ 24.5 SOL
console.log(`Graduation threshold: ${Number(threshold) / 1e9} SOL`);
```

The default threshold is 24.5 SOL (~$85k at $3,300/SOL), matching Metaplex Genesis.

### Graduation Process

1. Bonding curve is marked as `graduated = true`
2. Remaining SOL in the vault is transferred to the DEX pool
3. Remaining token reserves are transferred to the DEX pool
4. The token becomes freely tradeable on the external DEX

```typescript
import { createGraduationTx } from "./path/to/your/code.js";  // SDK helper

const sig = await graduate({
  connection,
  authority: authorityKeypair,
  mint: tokenMint,
  dexPool: raydiumPoolAddress,
  dexPoolTokenAccount: raydiumTokenAccount,
});
```

### Supported DEXes

| DEX | Pool Type | Notes |
|-----|-----------|-------|
| Raydium CPMM | Constant Product | Most common, used by Metaplex |
| Orca | Whirlpool | Concentrated liquidity |
| Meteora | DLMM | Dynamic fees |
| Jupiter | Aggregator | Routes through multiple DEXes |

---

## 11. Comparison: Metaplex Genesis vs P-Token Launch Pad

| Feature | Metaplex Genesis | P-Token Launch Pad |
|---------|-----------------|-------------------|
| **Token Program** | SPL Token | P-Token (Pinocchio) |
| **CU: Transfer** | 4,645 | 76 |
| **CU: TransferChecked** | 6,200 | 105 |
| **CU: MintTo** | 4,128 | 2,012 |
| **CU: Burn** | 4,753 | 1,884 |
| **Fee Distribution** | Sequential SPL | Batch CPI (opcode 25) |
| **Agent Identity** | MPL Core asset | PDA-based registry |
| **Self-Hosted** | ❌ (Metaplex API + royalty) | ✅ (Fully self-hosted) |
| **External Dependency** | Metaplex API, Irys, MPL | Irys/Arweave only |
| **DEX Support** | Raydium CPMM only | Any DEX |
| **Token Metadata** | MPL Token Metadata | Standard SPL + URI |
| **Agent-Token Binding** | setAgentTokenV1 | createAgentToken (irreversible) |
| **Executive Delegation** | registerExecutiveV1 | registerExecutive |
| **Execution Delegation** | delegateExecutionV1 | delegateExecution |
| **Program ID** | Genesis program | pLPha99... |
| **License** | Metaplex | MIT |

---

## Quick Reference

### PDA Seeds

```
Global:              [b"global"]
Bonding Curve:       [b"bonding-curve", mint]
Bonding Curve Vault: [b"bonding-curve", mint, b"vault"]
Agent:               [b"agent", owner]
Agent Token:         [b"agent-token", mint]
Creator Vault:       [b"creator-vault", creator]
Execution Delegation:[b"exec-delegation", agent, delegate]
```

### SDK Functions

| Function | Metaplex Equivalent | Description |
|----------|-------------------|-------------|
| `createAgentToken` | `createAndRegisterLaunch` + `setAgentTokenV1` | Full agent token creation |
| `registerAgent` | `registerIdentityV1` | Register agent identity |
| `registerExecutive` | `registerExecutiveV1` | Set executive delegate |
| `delegateExecution` | `delegateExecutionV1` | Temporary delegation |
| `buy` | `buy` | Buy from bonding curve |
| `sell` | `sell` | Sell to bonding curve |
| `calculateBuyPrice` | — | Price calculation |
| `calculateSellPrice` | — | Price calculation |
| `calculateMarketCap` | — | Market cap calculation |
| `buildFeeDistributionIx` | — | Batch fee distribution |

### Env Vars

```
USE_P_TOKEN=0          # Disable p-token (use SPL Token)
P_TOKEN_PROGRAM_ID=    # Override p-token program ID
```

---

*Ref: https://solana.com/upgrades/p-token • https://www.helius.dev/blog/solana-p-token • SIMD-0266: Efficient Token Program*

*License: MIT — built for the Solana Clawd ecosystem*
