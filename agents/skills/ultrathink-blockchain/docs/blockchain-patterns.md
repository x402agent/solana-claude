# Solana-Specific Patterns

Production patterns for Solana development with Claude Code.

---

## Retry Wrapper

Every RPC call should go through a retry wrapper:

```typescript
interface RetryOptions {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs?: number;
  retryOn?: (error: unknown) => boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, backoffMs, maxBackoffMs = 10_000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      if (options.retryOn && !options.retryOn(error)) throw error;

      const delay = Math.min(
        backoffMs * Math.pow(2, attempt),
        maxBackoffMs
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error('Unreachable');
}
```

---

## Transaction Builder Pattern

Simulate, set CU, set priority fee, then send:

```typescript
async function buildAndSend(
  connection: Connection,
  instructions: TransactionInstruction[],
  signer: Keypair,
  options: { useJito?: boolean; urgency?: 'low' | 'medium' | 'high' }
): Promise<string> {
  // 1. Build transaction
  const { blockhash } = await withRetry(
    () => connection.getLatestBlockhash('confirmed'),
    { maxRetries: 3, backoffMs: 200 }
  );

  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: signer.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message()
  );

  // 2. Simulate
  const sim = await connection.simulateTransaction(tx);
  if (sim.value.err) {
    throw new SimulationError(sim.value.err, sim.value.logs);
  }

  // 3. Set compute units based on simulation
  const cuUsed = sim.value.unitsConsumed || 200_000;
  const cuLimit = Math.ceil(cuUsed * 1.2);

  // 4. Get priority fee
  const priorityFee = await getPriorityFee(options.urgency || 'medium');

  // 5. Rebuild with CU + priority fee instructions prepended
  const finalInstructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }),
    ...instructions,
  ];

  // 6. Send via Jito or standard
  if (options.useJito) {
    return await sendViaJito(finalInstructions, signer, blockhash);
  }

  return await sendWithConfirmation(finalInstructions, signer, blockhash);
}
```

---

## Confirmation Polling

Never block indefinitely. Poll with timeout:

```typescript
async function confirmTransaction(
  connection: Connection,
  signature: string,
  options: { timeoutMs?: number; commitment?: Commitment }
): Promise<void> {
  const { timeoutMs = 30_000, commitment = 'confirmed' } = options;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const status = await withRetry(
      () => connection.getSignatureStatus(signature),
      { maxRetries: 2, backoffMs: 100 }
    );

    if (status.value?.confirmationStatus === commitment) return;
    if (status.value?.err) {
      throw new TransactionError(signature, status.value.err);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  throw new TimeoutError(signature, timeoutMs);
}
```

---

## Graceful Shutdown

Handle process termination cleanly:

```typescript
class GracefulShutdown {
  private shutdownCallbacks: (() => Promise<void>)[] = [];
  private isShuttingDown = false;

  constructor() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  onShutdown(callback: () => Promise<void>) {
    this.shutdownCallbacks.push(callback);
  }

  private async shutdown(signal: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log(`[shutdown] Received ${signal}, cleaning up...`);

    for (const callback of this.shutdownCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('[shutdown] Cleanup error:', error);
      }
    }

    console.log('[shutdown] Complete.');
    process.exit(0);
  }
}
```

---

## Structured Error Types

No generic throws. Every error has context:

```typescript
class SolanaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SolanaError';
  }
}

class SimulationError extends SolanaError {
  constructor(err: unknown, logs: string[] | null) {
    super('Transaction simulation failed', 'SIMULATION_FAILED', { err, logs });
  }
}

class TransactionError extends SolanaError {
  constructor(signature: string, err: unknown) {
    super('Transaction failed', 'TX_FAILED', { signature, err });
  }
}

class TimeoutError extends SolanaError {
  constructor(signature: string, timeoutMs: number) {
    super('Transaction confirmation timed out', 'TX_TIMEOUT', { signature, timeoutMs });
  }
}
```

---

## Websocket Reconnection

Resilient websocket connections for real-time monitoring:

```typescript
function createResilientSubscription(
  endpoint: string,
  onMessage: (data: unknown) => void,
  options: { maxReconnects?: number; reconnectDelayMs?: number } = {}
) {
  const { maxReconnects = 10, reconnectDelayMs = 1000 } = options;
  let reconnects = 0;
  let ws: WebSocket;

  function connect() {
    ws = new WebSocket(endpoint);

    ws.onopen = () => {
      reconnects = 0; // Reset on successful connection
    };

    ws.onmessage = (event) => {
      onMessage(JSON.parse(event.data));
    };

    ws.onclose = () => {
      if (reconnects < maxReconnects) {
        reconnects++;
        const delay = reconnectDelayMs * Math.pow(2, reconnects - 1);
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => ws.close();
  }

  connect();

  return {
    close: () => ws?.close(),
  };
}
```

---

*These patterns form the foundation of production Solana development. The skill enforces them automatically when active.*
