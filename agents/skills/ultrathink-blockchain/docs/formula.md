# The Complete Ultrathink Blockchain Formula

A comprehensive guide to using Claude Code's extended thinking for production blockchain development.

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

### Activation Patterns

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

## Part 3: Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│             CLAUDE CODE × BLOCKCHAIN FORMULA                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. CONTEXT DUMP         Set chain, stack, constraints      │
│  2. INTENT               Goal + success criteria            │
│  3. INTERVIEW            Requirements extraction            │
│  4. ULTRATHINK           Focus on: TX, MEV, races, security │
│  5. PLAN                 Accounts, instructions, errors     │
│  6. CONSTRAINTS          Retries, simulation, Jito          │
│  7. EXECUTE              Full files, production patterns    │
│  8. ITERATE              Review → steer → continue          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ULTRATHINK FOCUS AREAS FOR BLOCKCHAIN:                     │
│  • Transaction atomicity and instruction ordering           │
│  • MEV exposure — who can extract value from this?          │
│  • State races — what if account changes mid-operation?     │
│  • Failure modes — what breaks at 3am?                      │
│  • Security — can this be exploited? How?                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  NEVER SHIP WITHOUT:                                        │
│  ✓ Retry logic on all RPC calls                            │
│  ✓ Transaction simulation before send                      │
│  ✓ Dynamic priority fees                                   │
│  ✓ Jito bundles for value transactions                     │
│  ✓ Explicit timeouts on network ops                        │
│  ✓ Graceful shutdown / position cleanup                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*Ultrathink. Build on-chain. Ship to mainnet.*
