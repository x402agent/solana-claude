# Blockchain Antipatterns

Common mistakes Claude Code makes with blockchain development, and the fix prompts that prevent them.

---

## 1. No Retry Logic on RPC Calls

**Problem:** Generic RPC calls without error handling or retries.

```typescript
// BAD — Claude's default
const balance = await connection.getBalance(pubkey);
```

```typescript
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

## 2. No Transaction Simulation

**Problem:** Sending transactions without simulating first.

```typescript
// BAD — YOLO send
await sendAndConfirmTransaction(connection, tx, [signer]);
```

```typescript
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

## 3. Blocking on Confirmation

**Problem:** Using `sendAndConfirmTransaction` which can hang indefinitely during congestion.

```typescript
// BAD — blocks forever on congestion
await sendAndConfirmTransaction(...); // can hang for 60s+
```

```typescript
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

## 4. Hardcoded Priority Fees

**Problem:** Static priority fees that don't adapt to network conditions.

```typescript
// BAD — hardcoded, stale
tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }));
```

```typescript
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

## 5. No MEV Protection for Swaps

**Problem:** Submitting value-bearing transactions to the public mempool.

```typescript
// BAD — public mempool, sandwichable
await sendTransaction(swapTx);
```

```typescript
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

## 6. Deprecated Solana Patterns

**Problem:** Using outdated `@solana/web3.js` APIs.

**Fix prompt:**
```
Do not use deprecated @solana/web3.js patterns.
Check the current API before using any web3.js function.
Prefer the newer transaction format (VersionedTransaction) over legacy.
```

---

## 7. No Compute Unit Management

**Problem:** Not setting compute unit limits, wasting SOL on over-allocated CU.

```typescript
// BAD — default 200k CU, wasteful
const tx = new Transaction().add(swapInstruction);
```

```typescript
// GOOD — set CU based on simulation
const sim = await connection.simulateTransaction(tx);
const cuUsed = sim.value.unitsConsumed || 200_000;
tx.add(ComputeBudgetProgram.setComputeUnitLimit({
  units: Math.ceil(cuUsed * 1.2) // 20% buffer
}));
```

**Fix prompt:**
```
Always set compute unit limits based on simulation results.
Add a 20% buffer to simulated CU usage.
Never use default compute units for production transactions.
```

---

## 8. Ignoring Account Constraints

**Problem:** Not validating account ownership, mutability, or signer status.

**Fix prompt:**
```
Every account passed to an instruction must be validated:
- Is it the correct owner?
- Is it marked writable when needed?
- Is the signer requirement correct?
- Is the PDA derivation verified?
For Anchor programs, use account constraints in the struct.
```

---

## 9. Synchronous RPC in Hot Paths

**Problem:** Making blocking RPC calls in performance-critical loops.

**Fix prompt:**
```
Never use synchronous RPC calls in hot paths.
Batch reads where possible with getMultipleAccountsInfo.
Pre-fetch data that doesn't change frequently.
Use websocket subscriptions for real-time state.
```

---

## 10. No Graceful Shutdown

**Problem:** Process exits leave orphaned positions, pending transactions, or inconsistent state.

**Fix prompt:**
```
Implement graceful shutdown that:
- Catches SIGTERM and SIGINT
- Closes open websocket connections
- Waits for in-flight transactions to resolve
- Logs final state for recovery
- Does not leave orphaned positions
```
