# P-Token x402: How AI Agents on Solana Just Got 98% Cheaper to Run

*Published by the OpenClawd team · May 2026*

---

## The Problem Nobody Was Talking About

Every time an AI agent makes a paid API call on Solana, it burns a transaction. Before this week, that transaction consumed **6,200 compute units** just for the SPL token transfer — and that's *before* the ATA creation check, the memo, the priority fee. A realistic x402 payment was clearing 25,000–30,000 CU.

That sounds fine until you're billing per-output-token.

> $0.0001 per LLM token × 1 token = $0.0001 payment  
> SPL TransferChecked = 6,200 CU ≈ $0.000080 fee  
> **→ 80% of payment value consumed by transaction fees. Not viable.**

This is why every "AI micropayment" system on Solana has had to batch, defer, or fake it. Real-time per-token metered billing was economically broken — until [SIMD-0266 shipped p-token](https://solana.com/upgrades/p-token).

---

## What Is P-Token?

P-Token is a Pinocchio-optimised SPL token program that implements the same instruction interface as the standard SPL Token program — but uses far fewer compute units:

| Instruction | SPL Token | P-Token | Savings |
|---|---|---|---|
| `TransferChecked` | 6,200 CU | **105 CU** | 98.3% |
| `Transfer` | 4,645 CU | **76 CU** | 98.4% |
| `Approve` | 2,904 CU | **124 CU** | 95.7% |
| `Revoke` | 2,876 CU | **124 CU** | 95.7% |
| `MintTo` | 4,597 CU | **138 CU** | 97.0% |

The program ID is `ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF`.

P-Token is a **drop-in replacement**: same `TransferChecked` opcode (12), same account layout (`source, mint, destination, owner`), same 10-byte data wire format. Existing indexers, explorers, and wallets do not need changes. The only difference is which program ID signs the CPI.

There is also a new **Batch instruction** (discriminator 255) that amortises the 1,000 CU base CPI cost across multiple transfers in a single transaction — essential for the stream settlement model described below.

---

## What We Shipped

OpenClawd's x402 stack — the payment layer for AI agents on Solana — now uses p-token end-to-end:

### 1. `x402/p-token.ts` — Core Module

A standalone module that every part of the stack imports:

```typescript
import {
  P_TOKEN_PROGRAM_ID,          // ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF
  createPTokenTransferChecked, // 105 CU vs 6,200
  createPTokenComputeBudget,   // sets limit to 12,000 CU (was 200,000 default)
  getPTokenATA,                // same ATA address, locked to p-token program
  createBatchInstruction,      // discriminator 255 — batch settle N streams
  isTokenProgram,              // accepts both SPL and p-token for verification
  pTokenSavingsReport,         // human-readable savings summary
} from './p-token.js';
```

`createPTokenComputeBudget()` sets the compute limit to **12,000 CU** — enough for a full x402 payment including the worst-case ATA creation. With the SPL default of 200,000 CU, agents were burning budget they never needed.

### 2. `x402/client-sdk.ts` — Agent Client

The `clawdFetch` drop-in now automatically uses p-token for every payment:

```typescript
const instructions = [
  ...createPTokenComputeBudget(),              // 12k CU limit
  createPTokenATAIdempotent(payer, ata, ...),  // idempotent ATA creation
  createPTokenTransferChecked(                  // 105 CU transfer
    sourceAta, mint, destAta, signer.publicKey,
    BigInt(req.maxAmountRequired), req.extra.decimals,
  ),
];
```

No API change. Existing code that calls `clawdFetch` is already using p-token.

### 3. `x402/solana-x402-scheme.ts` + Worker — Server Verification

The server-side verifier now accepts payments from *either* the SPL token program or p-token. An agent sending a p-token transaction will not be rejected:

```typescript
// Before: hardcoded SPL only
if (!programId.equals(TOKEN_PROGRAM_ID)) continue;

// After: accepts both
if (!isTokenProgram(programId)) continue;
```

### 4. `pay.solanaclawd.com` — Live Facilitator

The OpenClawd hosted x402 facilitator at `pay.solanaclawd.com` is the default relay for all payment transactions. Every agent that pays through it now benefits from p-token fees — no configuration required.

---

## The Innovation: Per-Output-Token x402 Metered Billing

This is the part no one has shipped before.

### The Math, Revisited

After p-token:

> $0.0001 per LLM token × 1 token = $0.0001 payment  
> P-Token TransferChecked = 105 CU ≈ $0.000001 fee  
> **→ 1% overhead. Per-token billing is now real.**

That's not just an incremental improvement — it's a phase transition. The economics of per-inference-token billing flipped from *impossible* to *trivially cheap*.

### How `PTokenStreamFacilitator` Works

The `x402/p-token-stream-facilitator.ts` module implements a new x402 scheme type: `metered`. Here's the flow:

```
1. Agent opens session against pay.solanaclawd.com/stream
   → Receives MeterChallenge { scheme: 'metered', pricePerToken, sessionId, maxTokens }

2. Agent pre-authorises max spend (e.g., 0.10 USDC for 1,000 tokens)
   → Signs a single transaction capping the total

3. LLM inference runs. Tokens stream to the agent.

4. Facilitator meters usage:
   - Every 50 tokens (SETTLE_BATCH_SIZE): settle exact amount consumed
   - OR: batch across N concurrent sessions in ONE p-token batch transaction
   - At stream end: final settle, release unused authorisation

5. Agent is charged for exactly what it consumed. Not a round number. Not a tier.
```

Three settlement modes give operators flexibility:

| Mode | When to use | CU cost |
|---|---|---|
| `atomic` | Standard x402, one tx per request | ~12,000 CU |
| `batched` | Accumulate N streams, batch-settle | ~1,000 + N×105 CU |
| `streamed` | Settle every K tokens as they arrive | ~12,000 CU per checkpoint |

The `batched` mode is the breakthrough. Using p-token's batch instruction (discriminator 255), settling **10 concurrent agent sessions costs roughly the same as one SPL transfer did before** — about 2,050 CU total.

```typescript
const facilitator = createStreamFacilitator({
  connection,
  operatorKeypair,
  mint: USDC_MINT,
  pricePerToken: 100n, // 0.0001 USDC in base units
  settleBatchSize: 50,
  settlementMode: 'batched',
});

const challenge = facilitator.issueChallenge({
  payerPubkey: agentWallet,
  maxTokens: 1000,
});

// ... inference runs, tokens arrive ...
await facilitator.meter(challenge.sessionId, tokensConsumed);
const settlement = await facilitator.closeSession(challenge.sessionId);
```

---

## Economic Impact

### Per Agent, Per Day

A busy AI agent making 1,000 x402 API calls per day:

| | Before (SPL) | After (P-Token) |
|---|---|---|
| CU per payment tx | ~25,000 CU | ~2,000 CU |
| Priority fee (5,000 microlamports/CU) | $0.00067/tx | $0.000054/tx |
| Daily fee cost (1,000 calls) | **$0.67** | **$0.054** |
| Annual fee cost | **$244** | **$20** |
| **Annual savings** | | **$224** |

That's per agent. Extrapolate to a fleet of 100 agents running 24/7 and you're looking at $22,000/year saved on transaction fees alone — before the metered billing efficiency gains.

### The Metered Billing Unlock

The bigger story is what becomes *possible* when fees drop to 1%:

- **Sub-cent billing is viable.** API providers can charge $0.0001 per token without losing money to fees.
- **No more tier-based plans for agents.** Agents pay for exactly what they use — pay-as-you-go, to the token.
- **Composed agent workflows become cheap.** When Agent A calls Agent B which calls Agent C, the three-hop x402 payment chain cost $2/day in fees at SPL rates. With p-token: $0.16/day.
- **Streaming inference billing is real.** The stream facilitator can checkpoint every 50 tokens. An agent that gets cut off mid-stream (rate limit, budget exceeded, connection drop) is charged only for what it received.

### Global Agent Economy

OpenClawd's `pay.solanaclawd.com` is the hosted x402 facilitator for the Solana agent ecosystem. Every transaction relayed through it — from any agent, any framework, any language — now uses p-token. No opt-in required.

The payment infrastructure that powers agents worldwide just got 98% cheaper at the settlement layer. That cost reduction flows through to every developer building on x402, every end-user whose agent is billing them for API calls, and every API provider whose margins have been squeezed by infrastructure costs.

---

## Technical Deep Dive: The Batch Instruction

P-token introduces a new instruction (discriminator byte `0xFF` = 255) that executes multiple token operations in a single CPI invocation. The standard 1,000 CU base cost for a program invocation is paid once, then each inner transfer adds only ~105 CU:

```
Batch tx with 10 transfers:
  Base CPI cost:        1,000 CU
  10 × TransferChecked: 1,050 CU  (10 × 105)
  Overhead:               200 CU
  Total:                2,250 CU

vs. 10 separate SPL transfers:
  10 × 6,200 CU:       62,000 CU
  10 × base CPI cost:  10,000 CU
  Total:               72,000 CU

Savings: 96.9%
```

The `createBatchInstruction` helper in `x402/p-token.ts` handles the serialisation:

```typescript
export function createBatchInstruction(
  innerInstructions: TransactionInstruction[],
  keys: AccountMeta[],
): TransactionInstruction {
  // discriminator 255 + [len:u32LE] + [inner instruction data...]
  const chunks: Uint8Array[] = [];
  chunks.push(new Uint8Array([255]));
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32LE(innerInstructions.length, 0);
  chunks.push(lenBuf);
  for (const ix of innerInstructions) {
    chunks.push(new Uint8Array([ix.data.length]));
    chunks.push(ix.data);
  }
  return new TransactionInstruction({
    programId: P_TOKEN_PROGRAM_ID,
    keys,
    data: Buffer.concat(chunks.map(c => Buffer.from(c))),
  });
}
```

---

## What's Next

The stream facilitator is live in this repo. The next milestones:

1. **`pay.solanaclawd.com/stream` endpoint** — hosted stream sessions, open to any agent
2. **Leviathan integration** — the OODA loop's `paysh_pay` tool will use stream sessions for per-tool-call billing
3. **SDK helper: `clawdStream`** — a `clawdFetch` variant that opens a stream session and returns a `ReadableStream<string>` of tokens, billing as they arrive
4. **Operator savings dashboard** — `pTokenSavingsReport()` data surfaced in the pay.solanaclawd.com admin panel

---

## Try It

```bash
# Install the client SDK
npm install @solanaclawd/x402-client

# Make a metered x402 call
import { clawdFetch } from '@solanaclawd/x402-client';
const res = await clawdFetch('https://pay.solanaclawd.com/x402/agents/summarize', {
  signer: myKeypair,
  connection: myConnection,
  // p-token is used automatically — no extra config needed
});
```

The `$CLAWD` token: `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump`  
The facilitator: [pay.solanaclawd.com](https://pay.solanaclawd.com)  
The code: [github.com/x402agent/solana-clawd](https://github.com/x402agent/solana-clawd)

---

*OpenClawd is building the payment infrastructure for the agentic internet on Solana. The x402 protocol, p-token integration, and stream facilitator are open source.*
