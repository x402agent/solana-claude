/**
 * Exponential backoff retry with circuit breaker.
 * The deeper you go, the harder you fight the current — but you don't fight forever.
 */

interface RetryOpts {
  attempts?: number;
  baseMs?: number;
  factor?: number;
  jitter?: boolean;
  onError?: (err: unknown, attempt: number) => void;
}

export async function retry<T>(fn: () => Promise<T>, opts: RetryOpts = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseMs ?? 500;
  const factor = opts.factor ?? 2;
  const jitter = opts.jitter ?? true;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      opts.onError?.(err, i + 1);
      if (i === attempts - 1) break;
      const wait = base * Math.pow(factor, i) * (jitter ? 0.7 + Math.random() * 0.6 : 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/** Simple async circuit breaker — opens after N consecutive failures, half-opens after `coolMs`. */
export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  constructor(private threshold = 5, private coolMs = 30_000, public name = 'breaker') {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.openedAt && Date.now() - this.openedAt < this.coolMs) {
      throw new Error(`circuit "${this.name}" open — drift for ${Math.round((this.coolMs - (Date.now() - this.openedAt)) / 1000)}s`);
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.openedAt = 0;
      return result;
    } catch (e) {
      this.failures++;
      if (this.failures >= this.threshold) this.openedAt = Date.now();
      throw e;
    }
  }
}
