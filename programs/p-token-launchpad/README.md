# P-Token Launch Pad

**Self-hosted token launch pad for p-token (SIMD-0266)**  
Agent bonding curves, agent registry, and DEX graduation — all on p-token.

> ⚡ 98% cheaper transfers than SPL Token  
> 🤖 Agent identity registry via PDAs (no MPL Core needed)  
> 🚀 Graduation to any DEX (Raydium, Orca, Meteora)  
> 🔥 Batch fee distribution via p-token opcode 25 — single CPI vs N transfers

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Instructions](#instructions)
- [SDK Usage](#sdk-usage)
- [Program IDs](#program-ids)
- [PDA Seeds](#pda-seeds)
- [P-Token Integration](#p-token-integration)
- [Deployment](#deployment)
- [MCP Tools](#mcp-tools)
- [Full Documentation](#full-documentation)

---

## Quick Start

### Prerequisites

- Solana CLI tool suite
- Anchor v0.32.1+
- Rust toolchain (edition 2021)
- Node.js 18+ (for SDK)

### 1. Build the program

```bash
cd programs
anchor build -p p-token-launchpad
```

### 2. Deploy

```bash
# Devnet
anchor deploy -p p-token-launchpad --provider.cluster devnet

# Mainnet
anchor deploy -p p-token-launchpad --provider.cluster mainnet
```

### 3. Initialize the launch pad

```bash
solana config set --keypair ~/.config/solana/id.json

# Initialize global state (authority + fee recipient)
solana program deploy --program-id target/deploy/p_token_launchpad-keypair.json
```

### 4. Launch your first agent token (SDK)

```typescript
import { createAgentToken } from "../../x402/p-token-launchpad.js";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const connection = new Connection("https://api.devnet.solana.com");
const payer = Keypair.fromSecretKey(bs58.decode("your_base58_secret_key"));

const sig = await createAgentToken({
  connection,
  payer,
  name: "My Agent",
  symbol: "MYAG",
  uri: "https://arweave.net/.../metadata.json",
  agentUri: "https://arweave.net/.../agent.json",
});
console.log(`Agent token created! TX: ${sig}`);
```

---

## Architecture

```
                    ┌─────────────────────────┐
                    │  P-Token Launch Pad     │
                    │  deploy-specific id      │
                    └───────────┬─────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
    ┌─────▼─────┐        ┌─────▼─────┐        ┌─────▼─────┐
    │  Bonding   │        │  Agent    │        │  Batch    │
    │  Curves    │        │  Registry │        │  Fee Dist │
    │            │        │           │        │ (opcode25)│
    │ - buy/sell │        │ - regiser │        │           │
    │ - graduate │        │ - exeutive│        │ 1 CPI vs  │
    │ - price    │        │ - delegate│        │ N x 6,200 │
    └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  P-Token (Pinocchio) │
                    │  ptok6rngomXrDb...   │
                    │  SIMD-0266           │
                    │  98% cheaper xfers   │
                    └─────────────────────┘
```

### Agent Token Lifecycle

```
1. Create Agent  ──►  2. Register     ──►  3. Launch Token  ──►  4. Bonding Curve
   (PDA seeds:        (Agent URI)          (Mint + curve +     (Buy/Sell via
    [b"agent",         in JSON format       binding =           constant-product
     owner])               ERC-8004         irreversible)       formula)

      5. Graduate ──►  6. DEX Trading
         (Market cap          (Open market on Raydium, Orca, etc.)
          threshold:
          ~24.5 SOL)
```

---

## Instructions

| Instruction | Description | Adapted From |
|-------------|-------------|-------------|
| `initialize` | Set up launch pad global state | Metaplex Genesis global init |
| `create_bonding_curve` | Initialize a token bonding curve | Metaplex `createBondingCurve` |
| `register_agent` | Register an agent identity PDA | Metaplex `registerIdentityV1` |
| `create_agent_token` | All-in-one: mint + curve + agent + binding | Metaplex `createAndRegisterLaunch` + `setAgentTokenV1` |
| `register_executive` | Set an executive delegate for an agent | Metaplex `registerExecutiveV1` |
| `delegate_execution` | Create a time-bound execution delegation | Metaplex `delegateExecutionV1` |
| `buy` | Buy tokens from bonding curve | pump.fun / Metaplex `buy` |
| `sell` | Sell tokens back to bonding curve | pump.fun / Metaplex `sell` |
| `graduate` | Migrate liquidity to external DEX | Metaplex Genesis graduation |
| `withdraw_fees` | Withdraw collected fees from creator vault | — |

### Instruction Details

#### `initialize`

```
Accounts:
  global          [w] - Global state PDA
  authority       [s] - Admin authority
  fee_recipient       - Fee recipient wallet
  p_token_program     - P-Token program
  system_program      - System program
```

#### `create_agent_token`

```
Accounts:
  global                  [w] - Global state
  agent                   [w] - Agent PDA (seeds: [b"agent", owner])
  agent_token             [w] - Agent token PDA (seeds: [b"agent-token", mint])
  bonding_curve           [w] - Bonding curve PDA (seeds: [b"bonding-curve", mint])
  bonding_curve_vault     [w] - Vault ATA (seeds: [..., b"vault"])
  mint                    [w] - Token mint (new account)
  owner                   [s] - Creator/payer wallet
  token_program               - P-Token or SPL Token program
  associated_token_program    - ATA program
  system_program              - System program

Args:
  name: String      - Token name (max 32 chars)
  symbol: String    - Token symbol (max 10 chars)
  uri: String       - Token metadata URI (max 256 chars)
  agent_uri: String - Agent registration URI (max 256 chars)
```

#### `buy`

```
Accounts:
  global              [w] - Global state
  bonding_curve       [w] - Bonding curve PDA
  mint                [w] - Token mint
  bonding_curve_vault [w] - Vault holding reserves
  creator_vault       [w] - Creator fee vault
  user_token_account  [w] - User's token ATA (init if needed)
  user                [s] - Buyer wallet
  token_program           - Token program
  associated_token_program - ATA program
  system_program          - System program

Args:
  amount: u64      - SOL to spend (lamports)
  max_sol_cost: u64 - Maximum SOL to spend (slippage protection)
```

#### `sell`

```
Accounts:
  global              [w] - Global state
  bonding_curve       [w] - Bonding curve PDA
  mint                [w] - Token mint
  bonding_curve_vault [w] - Vault holding reserves
  creator_vault       [w] - Creator fee vault
  user_token_account  [w] - User's token ATA
  user                [s] - Seller wallet
  token_program           - Token program (P-Token for lower burn CU)
  system_program          - System program

Args:
  amount: u64      - Token amount to sell (base units)
  min_sol_out: u64 - Minimum SOL to receive (slippage protection)
```

---

## SDK Usage

### Installation

The SDK is at `x402/p-token-launchpad.ts`. Import it directly:

```typescript
import {
  createAgentToken,
  registerAgent,
  registerExecutive,
  delegateExecution,
  buy,
  sell,
  calculateBuyPrice,
  calculateSellPrice,
  calculateMarketCap,
  graduationThreshold,
  buildFeeDistributionIx,
  launchPadCuSavingsReport,
  findBondingCurvePda,
  findBondingCurveVaultPda,
  findAgentPda,
  findAgentTokenPda,
  findCreatorVaultPda,
  findGlobalPda,
} from "../x402/p-token-launchpad.js";
```

### PDA Derivation

```typescript
const [curvePda] = findBondingCurvePda(mint);
const [vaultPda] = findBondingCurveVaultPda(mint);
const [agentPda] = findAgentPda(owner);
const [globalPda] = findGlobalPda();
const [creatorVault] = findCreatorVaultPda(creator);
```

### Price Calculation

```typescript
// Calculate buy price for 100 tokens (100 * 10^6 = 100_000_000 base units)
const price = calculateBuyPrice(
  793_100_000_000_000n,  // virtual token reserves
  30_000_000_000n,       // virtual SOL reserves (30 SOL)
  100_000_000n,          // tokens to buy
);
console.log(`Cost: ${Number(price) / 1e9} SOL`);

// Market cap
const mc = calculateMarketCap(
  30_000_000_000n,   // initial virtual SOL
  5_000_000_000n,    // SOL raised so far
  793_100_000_000_000n, // total supply
  100_000_000_000_000n, // tokens sold
);
console.log(`Market cap: ${Number(mc) / 1e9} SOL`);
```

### Batch Fee Distribution (The Innovation)

Distribute fees to multiple recipients in a single p-token batch CPI — **1,000 CU base + 25 CU per recipient** vs **N × 6,200 CU** with SPL Token:

```typescript
const batchIx = buildFeeDistributionIx(
  sourceAta,     // Source ATA holding fees
  tokenMint,     // Token mint
  feeCollector,  // Owner of source ATA
  [
    { destinationAta: creatorAta, amount: 500_000n },    // 50%
    { destinationAta: protocolAta, amount: 250_000n },   // 25%
    { destinationAta: lpRewardsAta, amount: 150_000n },  // 15%
    { destinationAta: referralAta, amount: 100_000n },   // 10%
  ],
);
```

**CU Savings (3 recipients):** SPL: 18,600 CU → P-Token: 1,075 CU (**94.2% savings**)

### CU Savings Report

```typescript
console.log(launchPadCuSavingsReport());
```

Output:
```
═══ P-Token Launch Pad CU Savings ═══

Operation                      | SPL CU  | P-Token CU | Savings
───────────────────────────────|─────────|────────────|────────
MintTo (buy)                  |   4,128 |      2,012 |  51%
Burn (sell)                   |   4,753 |      1,884 |  60%
Transfer (fee distribution)   |   4,645 |         76 |  98%
InitializeAccount (ATA)       |   4,210 |      2,355 |  44%

Batch fee distribution (N recp):
  SPL:    N × 6,200 CU
  P-Token: 1,000 + N × 25 CU

Example: 10 recipients
  SPL:     62000 CU
  P-Token: 1250 CU
  Savings: 98.0%
```

---

## Program IDs

| Component | Address |
|-----------|---------|
| P-Token (Pinocchio) | `ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF` |
| P-Token Feature Gate | `ptokFjwyJtrwCa9Kgo9xoDS59V4QccBGEaRFnRPnSdP` |
| Launch Pad (placeholder) | `11111111111111111111111111111111` |
| SPL Token (fallback) | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |

> **Note:** The launch pad program ID is a placeholder. Replace with your deployed program ID before mainnet deployment.

---

## PDA Seeds

| PDA | Seeds | Description |
|-----|-------|-------------|
| Global | `[b"global"]` | Launch pad global state |
| Bonding Curve | `[b"bonding-curve", mint]` | Curve state (virtual reserves, tokens sold, etc.) |
| Bonding Curve Vault | `[b"bonding-curve", mint, b"vault"]` | Token vault (mint authority + token holder) |
| Agent | `[b"agent", owner]` | Agent identity (owner, URI, delegate) |
| Agent Token | `[b"agent-token", mint]` | Agent-token binding |
| Creator Vault | `[b"creator-vault", creator]` | Fee collection vault |
| Execution Delegation | `[b"exec-delegation", agent, delegate]` | Time-bound delegation |

---

## P-Token Integration

### Why P-Token?

P-Token (SIMD-0266) is a drop-in replacement for the SPL Token program with dramatically lower compute unit consumption:

| Operation | SPL CU | P-Token CU | Savings |
|-----------|--------|------------|---------|
| TransferChecked | 6,200 | 105 | **98.3%** |
| Transfer | 4,645 | 76 | **98.4%** |
| MintTo | 4,128 | 2,012 | **51.3%** |
| Burn | 4,753 | 1,884 | **60.4%** |
| Approve | 2,904 | 124 | **95.7%** |

### Batch Instruction (Opcode 25)

P-token introduces a new batch instruction that executes multiple token operations in a single CPI:

```
Layout: [opcode:u8=25, count:u8, (amount:u64, decimals:u8)...]
Accounts: [source_ata, mint, owner, dest_ata_0, ..., dest_ata_N-1]
```

### Disabling P-Token

Set `USE_P_TOKEN=0` or `USE_P_TOKEN=false` in your environment to fall back to classic SPL Token:

```bash
export USE_P_TOKEN=0
```

---

## Deployment

### Localnet (for testing)

```bash
# Start local validator with p-token feature gate active
solana-test-validator \
  --url https://api.devnet.solana.com \
  --clone ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF

# Build and deploy
cd programs
anchor build -p p-token-launchpad
anchor deploy -p p-token-launchpad --provider.cluster localnet

# Initialize
anchor run init --provider.cluster localnet
```

### Devnet

```bash
anchor build -p p-token-launchpad
anchor deploy -p p-token-launchpad --provider.cluster devnet
```

### Mainnet

```bash
anchor build -p p-token-launchpad --verifiable
anchor deploy -p p-token-launchpad --provider.cluster mainnet
```

### Post-Deploy Steps

1. **Set the real program ID** — Update `declare_id!()` in `src/lib.rs` and `LAUNCHPAD_PROGRAM_ID` in the SDK
2. **Call `initialize`** — Set authority and fee recipient
3. **Fund the fee recipient** — Ensure there's SOL for fee accumulation
4. **Verify on-chain** — Use `solana program show <PROGRAM_ID>` to confirm

---

## MCP Tools

The clawd facilitator exposes these tools at `/facilitator/clawd/call`:

| Tool | Description |
|------|-------------|
| `clawd_pay` | Issue single x402 payment challenge |
| `clawd_batch_pay` | Issue batch p-token payment challenge (opcode 25) |
| `clawd_settle` | Verify + settle signed payment |
| `clawd_unwrap_lamports` | Build unwrap_lamports instruction (opcode 26) |
| `clawd_p_token_status` | Check p-token status |
| `clawd_launch_token` | **NEW** — Create agent token with bonding curve |
| `clawd_buy_token` | **NEW** — Buy from bonding curve |
| `clawd_sell_token` | **NEW** — Sell to bonding curve |
| `clawd_register_agent` | **NEW** — Register agent identity |
| `clawd_fee_distribute` | **NEW** — Batch fee distribution via opcode 25 |

---

## Full Documentation

See [`docs/PTOKEN_LAUNCHPAD.md`](../../docs/PTOKEN_LAUNCHPAD.md) for the complete reference, including:

- [Overview & Architecture](../../docs/PTOKEN_LAUNCHPAD.md#1-overview)
- [Create an Agent Token](../../docs/PTOKEN_LAUNCHPAD.md#2-create-an-agent-token)
- [Agentic Commerce](../../docs/PTOKEN_LAUNCHPAD.md#3-agentic-commerce)
- [Run an Agent (Executive Delegation)](../../docs/PTOKEN_LAUNCHPAD.md#4-run-an-agent)
- [Register an Agent](../../docs/PTOKEN_LAUNCHPAD.md#5-register-an-agent)
- [Mint an Agent](../../docs/PTOKEN_LAUNCHPAD.md#6-mint-an-agent)
- [Bonding Curve Mechanics](../../docs/PTOKEN_LAUNCHPAD.md#7-bonding-curve-mechanics)
- [P-Token Optimizations](../../docs/PTOKEN_LAUNCHPAD.md#8-p-token-optimizations)
- [Fee Distribution with Batch CPI](../../docs/PTOKEN_LAUNCHPAD.md#9-fee-distribution-with-batch-cpi)
- [Graduation to DEX](../../docs/PTOKEN_LAUNCHPAD.md#10-graduation-to-dex)
- [Comparison: Metaplex Genesis vs P-Token Launch Pad](../../docs/PTOKEN_LAUNCHPAD.md#11-comparison)

---

## License

MIT — built for the Solana Clawd ecosystem.

---

## Resources

- [SIMD-0266: Efficient Token Program](https://solana.com/upgrades/p-token)
- [P-Token on Helius](https://www.helius.dev/blog/solana-p-token)
- [Metaplex Genesis](https://developers.metaplex.com/genesis)
- [Solana Clawd](https://github.com/x402agent/solana-clawd)
