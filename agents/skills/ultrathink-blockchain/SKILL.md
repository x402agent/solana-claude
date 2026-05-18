---
name: ultrathink-blockchain
description: "Deep-reasoning Solana and blockchain engineering skill. Use for production blockchain development, on-chain programs, Solana transaction flows, DeFi integrations, token bots, swaps, Anchor/Rust programs, RPC handling, Helius/Jito execution, MEV analysis, PDA/account validation, retry logic, simulations, monitoring, or security hardening."
---

# Ultrathink Blockchain

A Claude Code skill for building production Solana systems with deep reasoning.

## Activation

This skill activates when the user is working on blockchain development — specifically Solana — and needs production-quality code with proper transaction handling, MEV protection, and failure resilience.

**Trigger phrases:** blockchain, solana, on-chain, web3, defi, token, swap, sniper, anchor, program, transaction, RPC, Helius, Jito, MEV, PDA

## Protocol

When this skill is active, follow the **Ultrathink Blockchain Formula**:

### Phase 1: Context Dump

Before writing any blockchain code, establish the environment:

```
Context: [chain] [network: mainnet/devnet/testnet]

Stack:
- Runtime: [Node.js/Bun + TypeScript | Rust/Anchor]
- RPC: [Helius/Quicknode/Triton + features used]
- Data: [Birdeye/Jupiter/on-chain reads]
- Execution: [Jito bundles / standard RPC / both]
- Wallet: [Keypair from env / browser wallet / multisig]

Constraints:
- Transactions must land in 1-2 slots or fail fast
- All RPC calls need retry logic with exponential backoff
- Assume network is adversarial (MEV, failed txs, RPC lag)
- Compute units are precious — simulate before send
- Every transaction needs priority fee estimation
```

If the user hasn't provided this context, **ask for it** before writing code. This prevents generic web2 patterns from leaking in.

### Phase 2: Intent Declaration

Ensure the goal is dimensional, not vague:

- **Bad:** "Build me a swap"
- **Good:** "Build a Jupiter swap executor that handles multi-hop routes with <200ms latency, uses Jito for MEV protection, and retries with fresh blockhash on failure"

If the user's intent is vague, help them make it specific by asking about success criteria, latency requirements, and failure tolerance.

### Phase 3: Extraction Interview

Before writing code, extract requirements through structured questioning. Ask 3-5 questions at a time covering:

**Architecture:**
- Client-side (TypeScript) or on-chain program (Rust/Anchor)?
- What programs/accounts does this interact with?
- Deploy new contracts or call existing?

**Execution:**
- Latency requirements?
- Batch or single transactions?
- Confirmation strategy (processed/confirmed/finalized)?

**Data:**
- What on-chain state to read?
- Real-time needs (websockets vs polling)?
- Historical data requirements?

**Risk:**
- Max value at risk per transaction?
- MEV concerns?
- Unattended operation requirements?

**Existing code:**
- Greenfield or integrating with existing system?
- What's already built?

Reflect requirements back for confirmation before proceeding.

### Phase 4: Ultrathink

Activate deep reasoning on the critical areas. **Focus ultrathink — don't waste tokens on obvious code.**

**Always ultrathink about:**

1. **Transaction Structure**
   - Instruction ordering and dependencies
   - Account validation (signer, writable, PDA derivation)
   - Compute unit estimation with buffer
   - Lookup tables for address compression
   - Blockhash freshness and retry strategy

2. **MEV Exposure**
   - What can a searcher extract from this transaction?
   - Should this go through Jito bundles?
   - Backrun opportunities being created
   - Sandwich risk and prevention
   - Worst-case slippage if frontrun

3. **State Race Conditions**
   - Account state changes between read and write
   - Stale blockhash handling
   - Concurrent account access
   - Durable nonce requirements
   - Retry strategy that doesn't double-spend

4. **Security**
   - Instruction data manipulation risks
   - Account constraint validation
   - Reentrancy paths
   - Authority check bypasses
   - Wrong account ordering

5. **Failure Modes**
   - What breaks at 3am with no one watching?
   - RPC provider outages
   - Cascading failures
   - Orphaned state / open positions

### Phase 5: Plan Mode

Present the architecture before writing code:

1. **Account Schema** — all accounts, PDA derivations, sizes, rent
2. **Instruction Flow** — ordered instructions, batching strategy, CU estimates
3. **Error Taxonomy** — program errors, RPC errors, state errors, retry strategies
4. **Testing Strategy** — localnet/devnet plan, mainnet dry-run, simulation vs execution
5. **Monitoring** — logs, metrics, alert conditions

Wait for user approval before proceeding to implementation.

### Phase 6: Constraints (Non-Negotiable)

Every blockchain implementation must include:

- **Retry logic** on all RPC calls (exponential backoff)
- **Transaction simulation** before every send
- **Dynamic priority fees** (Helius API or equivalent)
- **Jito bundles** for value-bearing transactions
- **Explicit timeouts** on all network operations
- **Graceful degradation** when dependencies fail
- **Comprehensive error types** (no generic throws)
- **Structured logging** with correlation IDs

### Phase 7: Execute

Write full, production-quality files:

- TypeScript strict mode, no `any`
- Pure functions where possible
- Explicit state machines for async flows
- Complete files, no placeholders or stubs
- Every function has error handling

### Phase 8: Iterate

After initial implementation, prompt for review:
- "Review the code. What would break under load?"
- "What edge cases did I miss?"
- "Is the error handling complete?"

## Antipatterns to Prevent

See `references/antipatterns.md` for the full list. Key ones:

1. **No retry logic** — never call RPC directly, always through retry wrapper
2. **No simulation** — never send a transaction without simulating first
3. **Blocking confirmation** — never block indefinitely on tx confirmation
4. **Hardcoded fees** — never hardcode priority fees
5. **Public mempool for swaps** — value transactions go through Jito

## Templates

See `references/templates.md` for production prompt templates:

- Token Sniper / Trading Bot
- DeFi Protocol Integration
- Indexer / Analytics Pipeline
- Anchor Program (Rust)
- Multi-Agent Trading System

## Code Style

```typescript
// GOOD — production pattern
const balance = await withRetry(
  () => connection.getBalance(pubkey),
  { maxRetries: 3, backoffMs: 200 }
);

// GOOD — simulate before send
const sim = await connection.simulateTransaction(tx);
if (sim.value.err) {
  throw new SimulationError(sim.value.err, sim.value.logs);
}

// GOOD — dynamic priority fees
const priorityFee = await helius.getPriorityFeeEstimate(tx);
tx.add(ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: priorityFee.high
}));

// GOOD — Jito for value transactions
await jito.sendBundle([swapTx], { tip: 10000 });
```
