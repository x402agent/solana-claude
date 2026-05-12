export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function withRetries<T>(
  fn: () => Promise<T>,
  opts: {
    retries?: number;
    backoffMs?: number;
    shouldRetry?: (value: T) => boolean;
  } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const backoffMs = opts.backoffMs ?? 250;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const value = await fn();
      if (!opts.shouldRetry || !opts.shouldRetry(value) || attempt === retries) {
        return value;
      }
    } catch (error) {
      if (attempt === retries) throw error;
    }
    await sleep(backoffMs * 2 ** attempt);
  }

  throw new Error('retry budget exhausted');
}
