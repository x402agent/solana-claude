import { createHash, randomUUID } from 'crypto';

export interface PrivateCacheOptions {
  namespace?: string;
  ttlMs?: number;
  maxEntries?: number;
}

export class PrivateContentCache<T> {
  private readonly namespace: string;
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly store = new Map<string, { value: T; expiresAt: number; hits: number }>();

  constructor(opts: PrivateCacheOptions = {}) {
    this.namespace = opts.namespace ?? randomUUID();
    this.ttlMs = opts.ttlMs ?? 5 * 60_000;
    this.maxEntries = opts.maxEntries ?? 256;
  }

  deriveKey(parts: unknown[]): string {
    const hash = createHash('sha256');
    hash.update(this.namespace);
    for (const part of parts) {
      hash.update('\n');
      hash.update(typeof part === 'string' ? part : JSON.stringify(part));
    }
    return hash.digest('hex');
  }

  get(key: string): T | undefined {
    const record = this.store.get(key);
    if (!record) return undefined;
    if (record.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    record.hits += 1;
    return record.value;
  }

  set(key: string, value: T): void {
    this.prune();
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value as string | undefined;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs, hits: 0 });
  }

  stats() {
    this.prune();
    return { namespace: this.namespace, ttlMs: this.ttlMs, maxEntries: this.maxEntries, size: this.store.size };
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.expiresAt <= now) this.store.delete(key);
    }
  }
}
