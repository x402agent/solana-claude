# Ultrathink Deep Dive + Blockchain Adaptation

## Extended Thinking Mechanics & Chain-Native Prompting

---

## Part 1: Understanding Ultrathink

### What Actually Happens

When you invoke `ultrathink`, you're triggering Claude Code's extended thinking mode — an internal reasoning chain that runs *before* any output is generated. This isn't just "think longer." It's a fundamentally different cognitive process:

**Standard mode:**
```
Input → Pattern match → Generate output
```

**Ultrathink mode:**
```
Input → Decompose problem → Generate hypotheses → 
Evaluate tradeoffs → Simulate failure modes → 
Select approach → Generate output
```

The key insight: **ultrathink explores the solution space before committing**. It considers multiple architectures, anticipates problems, and makes reasoned choices — all before you see a single line of code.

---

### The Depth Ladder

| Invocation | Token Budget | Best For |
|------------|--------------|----------|
| `think` | ~500 tokens internal | Simple decisions, quick fixes |
| `think step by step` | ~1000 tokens | Multi-step problems, debugging |
| `think hard` | ~2000 tokens | Architecture decisions, complex logic |
| `think harder` | ~4000 tokens | System design, security analysis |
| `ultrathink` | ~8000+ tokens | Production systems, critical code |
| `megathink` | Maximum depth | Novel problems, research-grade work |

**The tradeoff:** Deeper thinking = better reasoning but slower response and higher token cost. Use the right level for the task.

---

### Ultrathink Activation Patterns

These phrases reliably trigger deep reasoning:

```
ultrathink about...
think very carefully about...
before answering, deeply consider...
explore multiple approaches before deciding...
reason through this step by step, considering edge cases...
think like a senior [blockchain/security/systems] engineer would...
```

**Stacking for maximum depth:**
```
ultrathink. Consider this from multiple angles:
- Performance implications on-chain
- Security attack vectors
- MEV exposure
- Failure modes under load
- Gas/compute unit optimization

Then give me your recommended approach with justification.
```

---

### Focusing Ultrathink (Don't Waste It)

Raw `ultrathink` burns tokens on everything, including obvious parts. Focus it:

**Unfocused (wasteful):**
```
Build me a Solana swap aggregator. ultrathink.
```

**Focused (surgical):**
```
Build me a Solana swap aggregator.

ultrathink specifically about:
- Route optimization across Jupiter, Raydium, Orca
- Slippage calculation with real-time liquidity depth
- Transaction assembly for atomic multi-hop swaps
- Priority fee estimation using recent block data

For the standard parts (CLI parsing, config loading, logging),
just write clean straightforward code.
```

This pattern: **deep reasoning where it matters, efficient execution everywhere else.**

---

### Ultrathink + Verification Loop

The most powerful pattern combines deep thinking with explicit verification:

```
ultrathink about [problem].

Then:
1. State your assumptions explicitly
2. Identify the 3 biggest risks in your approach
3. Explain what would make this solution fail
4. Give me the implementation

I'll review before we proceed.
```

This forces Claude Code to **think adversarially about its own solution** — which catches bugs that normal generation misses entirely.

---

## Part 2: Blockchain-Native Adaptation

### The Blockchain Context Dump

Every blockchain session should start with context that prevents generic web2 patterns from leaking in:

```
Context: We're building on Solana mainnet-beta.

Stack:
- Runtime: Node.js / Bun with TypeScript
- RPC: Helius (DAS API + websockets + priority fee API)
- Data: Birdeye API for price/market data
- Execution: Jito bundles for MEV protection
- Wallet: Keypair from env, no browser wallet

Constraints:
- Transactions must land in 1-2 slots or fail fast
- All RPC calls need retry logic with exponential backoff
- Assume network is adversarial (MEV, failed txs, RPC lag)
- Compute units are precious — simulate before send
- Every transaction needs priority fee estimation

Do not:
- Use deprecated @solana/web3.js patterns
- Assume transactions confirm on first try
- Ignore partial failures in batch operations
- Use synchronous RPC calls in hot paths
```

This context primes Claude Code to think like a Solana developer, not a generic JS developer.

---

### Solana-Specific Ultrathink Triggers

These prompts activate blockchain-native reasoning:

**Transaction Construction:**
```
ultrathink about the transaction structure:
- Instruction ordering and dependencies
- Account validation (signer, writable, PDA derivation)
- Compute unit estimation with buffer
- Lookup tables for address compression
- Blockhash freshness and retry strategy
```

**MEV Awareness:**
```
ultrathink about MEV exposure:
- What can a searcher extract from this transaction?
- Should this go through Jito bundles?
- Is there a backrun opportunity we're creating?
- Can the transaction be sandwiched? How do we prevent it?
- What's the worst case slippage if we're frontrun?
```

**State Race Conditions:**
```
ultrathink about state races:
- What if the account state changes between read and write?
- How do we handle stale blockhash?
- What if another transaction touches this account first?
- Should we use durable nonces?
- What's the retry strategy that doesn't double-spend?
```

**Program Security:**
```
ultrathink about attack vectors:
- Can instruction data be manipulated to drain funds?
- Are all account constraints validated on-chain?
- Is there a reentrancy path?
- Can authority checks be bypassed?
- What happens if accounts are passed in wrong order?
```

---

### The Blockchain Interview Protocol

Adapt the interview phase for chain development:

```
Before writing any code, interview me about:

Architecture:
- Is this a program (Rust/Anchor) or client-side (TS)?
- What programs/accounts does this interact with?
- Do I need to deploy anything or just call existing contracts?

Execution:
- Latency requirements? (< 200ms for sniping, relaxed for analytics)
- Batch operations or single transactions?
- Confirmation strategy (processed, confirmed, finalized)?

Data:
- What on-chain state do I need to read?
- Real-time requirements? (websockets vs polling)
- Historical data needs? (archive RPC, indexed data)

Risk:
- What's the max value at risk per transaction?
- MEV concerns? Need Jito?
- What happens if this fails at 3am with no one watching?

Existing code:
- Is this greenfield or integrating with existing system?
- What's already built that I should know about?

Ask me 3-5 questions at a time.
```

---

### Blockchain-Specific Planning Mode

When you enable plan mode for blockchain projects, add these requirements:

```
plan mode: on

Your plan must include:

1. Account Schema
   - All accounts this touches (PDAs, token accounts, system accounts)
   - Derivation paths for PDAs
   - Account sizes and rent calculations

2. Instruction Flow
   - Ordered list of instructions per transaction
   - Which can be batched vs must be sequential
   - Compute unit estimates per instruction

3. Error Taxonomy
   - Program errors we might hit
   - RPC errors and retry strategy
   - State errors (insufficient balance, wrong owner, etc.)

4. Testing Strategy
   - Localnet/devnet test plan
   - Mainnet dry-run approach
   - What we simulate vs what we actually execute

5. Monitoring
   - How do we know this is working?
   - What logs/metrics do we emit?
   - Alert conditions

Present the plan. I'll review before you write code.
```

---

## Part 3: Domain-Specific Templates

### Template: Token Sniper / Trading Bot

```
I want a production Solana token sniper that:
- Monitors [Raydium/Pump.fun/Moonshot] for new pools via websocket
- Evaluates tokens against [criteria: liquidity, holder distribution, etc.]
- Executes buys within [X]ms of detection using Jito bundles
- Implements [trailing stop / take profit / time-based exit] strategy
- Exposes a terminal UI with real-time PnL

Interview me about:
- My RPC setup (Helius tier, dedicated nodes?)
- Risk parameters (max position size, daily loss limit)
- The specific signals I want to filter on
- My existing infra this needs to integrate with

ultrathink about:
- The latency budget from detection → execution
- Race conditions between the monitor and executor
- State management for open positions
- Failure modes when RPC lags or Jito rejects bundles
- How to avoid getting rekt by rugs and honeypots

plan mode: on — I need to see the architecture before code.

Constraints:
- TypeScript with strict mode
- Use Helius websockets for pool detection
- Jito bundle submission for execution
- All secrets from environment variables
- Graceful shutdown that doesn't leave orphan positions
```

---

### Template: DeFi Protocol Integration

```
I want to integrate with [Protocol] to [action: swap/stake/lend/etc.].

Context:
- Protocol address: [address]
- IDL available: [yes/no, location]
- Documentation: [link if exists]

Interview me about:
- The specific user flow I'm building
- Whether I need to handle [token accounts, ATAs, wrapping SOL]
- Expected transaction frequency
- Error handling requirements

ultrathink about:
- The exact instruction sequence this protocol expects
- Account validation — what PDAs need derivation?
- Edge cases: what if user has no ATA? What if balance insufficient?
- How to simulate this transaction before sending

Before writing code, show me:
1. The account schema for each instruction
2. The instruction data layout
3. Example transaction structure

Then implement with full error handling.
```

---

### Template: Indexer / Analytics Pipeline

```
I want to index [event type] from [program/token/protocol] and:
- Store in [Postgres/SQLite/Redis]
- Expose via [REST API / GraphQL / websocket]
- Update in [real-time / batched]

Interview me about:
- Historical depth needed (how far back?)
- Query patterns (what questions am I answering?)
- Update latency requirements
- Scale expectations (events per second)

ultrathink about:
- The gRPC vs websocket vs polling tradeoff for ingestion
- Schema design for the query patterns I described
- Handling chain reorgs and missed slots
- Backfill strategy for historical data
- Rate limit management with the RPC provider

plan mode: on

Constraints:
- Use Helius webhooks or geyser if applicable
- Idempotent processing (re-running is safe)
- Include health checks and lag monitoring
- Document the schema with example queries
```

---

### Template: Anchor Program (Rust)

```
I want an Anchor program that [functionality].

Interview me about:
- The accounts this program will manage
- Who can call which instructions (authority model)
- Fee structure if any
- Upgrade authority plan

ultrathink about:
- Account sizing and rent implications
- PDA derivation strategy (seeds, bump handling)
- Access control vulnerabilities
- Integer overflow/underflow risks
- Reentrancy potential
- What happens if accounts are passed in wrong order

plan mode: on — show me:
1. Account struct definitions
2. Instruction signatures
3. Error enum
4. Events emitted
5. Key security invariants

Constraints:
- Anchor 0.29+ patterns
- All math uses checked operations or safe-math
- Events for every state change
- Comprehensive error types (no generic errors)
- Include test scaffolding in TypeScript
```

---

### Template: Multi-Agent Trading System

```
I want a multi-agent system where:
- Agent A monitors [data source] for signals
- Agent B evaluates signals against [strategy]
- Agent C executes approved trades via [execution venue]
- Agent D manages risk and position limits
- All agents coordinate via [message bus / shared state]

Interview me about:
- The specific signal sources and their data format
- Strategy parameters (what makes a "good" signal?)
- Execution requirements (speed, MEV protection)
- Risk limits (position size, correlation, drawdown)
- How I want to monitor and intervene

ultrathink about:
- Agent coordination — avoiding race conditions and conflicts
- State consistency across agents
- Failure isolation — one agent crashing shouldn't kill the system
- Human override mechanisms
- Backtest vs live mode switching

plan mode: on

Show me the message schemas, state machine for each agent,
and the coordination protocol before writing implementation.
```

---

## Part 4: Blockchain Antipatterns

### What Claude Code Gets Wrong (And How to Fix It)

**Problem:** Generic RPC patterns without retries
```typescript
// BAD — Claude's default
const balance = await connection.getBalance(pubkey);

// GOOD — production pattern
const balance = await withRetry(
  () => connection.getBalance(pubkey),
  { maxRetries: 3, backoffMs: 200 }
);
```

**Fix prompt:**
```
All RPC calls must use retry logic with exponential backoff.
Never call the RPC directly — always through a retry wrapper.
```

---

**Problem:** Ignoring transaction simulation
```typescript
// BAD — YOLO send
await sendAndConfirmTransaction(connection, tx, [signer]);

// GOOD — simulate first
const sim = await connection.simulateTransaction(tx);
if (sim.value.err) {
  throw new SimulationError(sim.value.err, sim.value.logs);
}
// then send with priority fee based on simulation CU
```

**Fix prompt:**
```
Every transaction must be simulated before sending.
Use simulation results to set compute unit limit accurately.
Never send a transaction that hasn't been simulated.
```

---

**Problem:** Blocking on confirmation
```typescript
// BAD — blocks forever on congestion
await sendAndConfirmTransaction(...); // can hang for 60s+

// GOOD — timeout and retry strategy
const sig = await sendWithTimeout(tx, { timeoutMs: 5000 });
const confirmed = await pollConfirmation(sig, { maxAttempts: 10 });
```

**Fix prompt:**
```
Transaction confirmation must have explicit timeouts.
Implement a retry strategy for transactions that don't land.
Never block indefinitely waiting for confirmation.
```

---

**Problem:** Hardcoded priority fees
```typescript
// BAD — hardcoded, stale
tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }));

// GOOD — dynamic based on network
const priorityFee = await helius.getPriorityFeeEstimate(tx);
tx.add(ComputeBudgetProgram.setComputeUnitPrice({ 
  microLamports: priorityFee.high // or medium based on urgency
}));
```

**Fix prompt:**
```
Priority fees must be estimated dynamically using Helius priority fee API.
Never hardcode priority fees — network conditions change constantly.
```

---

**Problem:** No MEV protection for swaps
```typescript
// BAD — public mempool, sandwichable
await sendTransaction(swapTx);

// GOOD — Jito bundle
await jito.sendBundle([swapTx], { tip: 10000 });
```

**Fix prompt:**
```
All value-bearing transactions (swaps, liquidations, arb)
must go through Jito bundles for MEV protection.
Public mempool submission only for non-sensitive operations.
```

---

## Part 5: The Complete Blockchain Formula

### One-Shot Production Prompt

```
Context: Solana mainnet-beta production environment.
Stack: TypeScript, Helius RPC + websockets, Birdeye data, Jito execution.

I want [detailed goal with success metrics].

Before writing code, interview me about requirements, constraints,
existing infrastructure, and edge cases. Ask 3-5 questions at a time.

After the interview:
1. Reflect requirements back for confirmation
2. ultrathink about:
   - Transaction structure and instruction ordering
   - Account validation and PDA derivation
   - MEV exposure and protection strategy
   - Failure modes and retry logic
   - State race conditions
3. Present plan (accounts, instructions, error taxonomy, tests)
4. Wait for my approval

Constraints:
- All RPC calls through retry wrapper with backoff
- All transactions simulated before sending
- Dynamic priority fees via Helius
- Value transactions through Jito bundles
- Explicit timeout on all network operations
- Graceful degradation when dependencies fail
- Comprehensive error types (no generic throws)
- Structured logging with correlation IDs

Code style:
- TypeScript strict mode, no `any`
- Pure functions where possible
- Explicit state machines for async flows
- Full files, no placeholders

Write production code. I'm shipping this.
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                 CLAUDE CODE × BLOCKCHAIN FORMULA                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CONTEXT DUMP         Set chain, stack, constraints          │
│  2. INTENT               Goal + success criteria                │
│  3. INTERVIEW            Requirements extraction                 │
│  4. ULTRATHINK           Focus on: TX, MEV, races, security     │
│  5. PLAN                 Accounts, instructions, errors, tests  │
│  6. CONSTRAINTS          Retries, simulation, Jito, timeouts    │
│  7. EXECUTE              Full files, production patterns        │
│  8. ITERATE              Review → steer → continue              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ULTRATHINK FOCUS AREAS FOR BLOCKCHAIN:                         │
│  • Transaction atomicity and instruction ordering               │
│  • MEV exposure — who can extract value from this?              │
│  • State races — what if account changes mid-operation?         │
│  • Failure modes — what breaks at 3am with no one watching?     │
│  • Security — can this be exploited? How?                       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  NEVER SHIP WITHOUT:                                            │
│  ✓ Retry logic on all RPC calls                                │
│  ✓ Transaction simulation before send                          │
│  ✓ Dynamic priority fees                                       │
│  ✓ Jito bundles for value transactions                         │
│  ✓ Explicit timeouts on network ops                            │
│  ✓ Graceful shutdown / position cleanup                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

*Ultrathink. Build on-chain. Ship to mainnet.*
