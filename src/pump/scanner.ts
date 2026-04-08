/**
 * src/pump/scanner.ts
 *
 * Pump.fun token scanner — the OODA "Observe" and "Orient" subsystem.
 *
 * Continuously monitors PumpPortal for new token launches and evaluates
 * them against configurable filters to surface high-signal opportunities.
 *
 * Adapted from Clawd Code's DreamTask & LocalAgentTask patterns:
 *   - Runs as a background TaskManager task (type: "scanner")
 *   - Emits scored signals to AppState memories
 *   - Respects AbortController for graceful shutdown
 *
 * OODA loop integration:
 *   observe → new token / trade events from PumpPortal
 *   orient  → scorePumpSignal() evaluation
 *   decide  → emit INFERRED signal memories above threshold
 *   act     → (handled by trading layer or human)
 */

import { EventEmitter } from "events";
import type { Task, TaskManager } from "../tasks/task-manager.js";
import { setAppState, writeMemory } from "../state/app-state.js";
import type { CreateEvent, PumpTokenScan, TradeEvent } from "./types.js";
import {
  connectPumpPortalStream,
  formatPumpScan,
  scanPumpToken,
  scorePumpSignal,
  type PumpSignalScore,
} from "./client.js";

// ─── Scanner Config ───────────────────────────────────────────────────────────

export interface PumpScannerConfig {
  /** Minimum signal score to emit a memory entry (0–100) */
  minScore: number;
  /** Track trades on these specific mints */
  watchMints?: string[];
  /** Track trades from these wallet addresses */
  watchWallets?: string[];
  /** Max tokens in the evaluated cache (LRU-like) */
  maxCache: number;
  /** How often to refresh SOL price (ms) */
  solPriceRefreshMs: number;
  /** Whether to log all events even below minScore */
  verbose: boolean;
}

const DEFAULT_CONFIG: PumpScannerConfig = {
  minScore: 60,
  maxCache: 200,
  solPriceRefreshMs: 60_000,
  verbose: false,
};

// ─── Scanner State ─────────────────────────────────────────────────────────────

export interface ScannerStats {
  tokensObserved: number;
  tradesObserved: number;
  signalsEmitted: number;
  strongSignals: number;
  startedAt: Date;
  lastEventAt?: Date;
}

// ─── PumpScanner ──────────────────────────────────────────────────────────────

export class PumpScanner extends EventEmitter {
  private config: PumpScannerConfig;
  private cache = new Map<string, { scan: PumpTokenScan; score: PumpSignalScore; seenAt: Date }>();
  private stats: ScannerStats;
  private solPriceUSD = 0;
  private solPriceTimer?: ReturnType<typeof setInterval>;
  private disconnect?: () => void;

  constructor(config: Partial<PumpScannerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      tokensObserved: 0,
      tradesObserved: 0,
      signalsEmitted: 0,
      strongSignals: 0,
      startedAt: new Date(),
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getStats(): ScannerStats {
    return { ...this.stats };
  }

  getCachedScan(mint: string) {
    return this.cache.get(mint);
  }

  getTopSignals(limit = 10) {
    return Array.from(this.cache.values())
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, limit);
  }

  // ── TaskManager integration ────────────────────────────────────────────────

  /**
   * Run as a TaskManager task handler.
   * Called via: taskManager.registerHandler("scanner", pumpScanner.asHandler())
   */
  asHandler() {
    return async (task: Task, manager: TaskManager): Promise<void> => {
      await this.start(task.abortController.signal, (line) => {
        manager.appendOutput(task.id, line);
      });
    };
  }

  // ── Core start/stop ───────────────────────────────────────────────────────

  async start(
    signal?: AbortSignal,
    log?: (line: string) => void,
  ): Promise<void> {
    this.log = log ?? ((l) => process.stdout.write(l + "\n"));
    this.log(`[PumpScanner] Starting (minScore=${this.config.minScore})…`);

    // Refresh SOL price on interval
    this.solPriceUSD = await this.fetchSolPrice();
    this.solPriceTimer = setInterval(async () => {
      this.solPriceUSD = await this.fetchSolPrice().catch(() => this.solPriceUSD);
    }, this.config.solPriceRefreshMs);

    // Connect to PumpPortal WebSocket
    const stream = connectPumpPortalStream(
      async (event) => {
        if (signal?.aborted) return;
        this.stats.lastEventAt = new Date();

        if (event.type === "newToken") {
          await this.handleNewToken(event.data);
        } else if (event.type === "trade") {
          await this.handleTrade(event.data);
        } else if (event.type === "error") {
          this.log!(`[PumpScanner] Stream error: ${event.error}`);
        }
      },
      {
        newTokens: true,
        tradeMints: this.config.watchMints,
        tradeAccounts: this.config.watchWallets,
      },
    );

    this.disconnect = stream.disconnect;

    // Block until aborted
    await new Promise<void>((resolve) => {
      if (signal) {
        signal.addEventListener("abort", () => {
          this.stop();
          resolve();
        });
      }
    });
  }

  stop(): void {
    this.log?.(`[PumpScanner] Stopping. Stats: ${JSON.stringify(this.stats, null, 2)}`);
    if (this.solPriceTimer) clearInterval(this.solPriceTimer);
    this.disconnect?.();
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  private log?: (line: string) => void;

  private async handleNewToken(event: CreateEvent): Promise<void> {
    this.stats.tokensObserved++;

    const mint = event.mint;
    if (this.cache.has(mint)) return; // Already seen

    if (this.config.verbose) {
      this.log?.(`[PumpScanner] 🆕 ${event.symbol} (${mint.slice(0, 8)}…)`);
    }

    // Async enrichment — don't block stream
    this.enrichAndScore(mint).catch((e) => {
      this.log?.(`[PumpScanner] Enrich error ${mint.slice(0, 8)}: ${e}`);
    });

    // Emit raw creation event for listeners
    this.emit("newToken", event);
  }

  private async handleTrade(event: TradeEvent): Promise<void> {
    this.stats.tradesObserved++;

    if (this.config.verbose) {
      const side = event.isBuy ? "BUY" : "SELL";
      const sol = (Number(event.solAmount) / 1e9).toFixed(3);
      this.log?.(`[PumpScanner] ${side} ${event.mint.slice(0, 8)}… ${sol} SOL`);
    }

    // Update AppState if this is a watched mint
    if (this.config.watchMints?.includes(event.mint)) {
      setAppState((prev) => ({
        ...prev,
        totalToolCalls: prev.totalToolCalls + 1,
      }));
    }

    this.emit("trade", event);
  }

  private async enrichAndScore(mint: string): Promise<void> {
    // Evict cache if full (remove oldest entry)
    if (this.cache.size >= this.config.maxCache) {
      const oldest = Array.from(this.cache.keys())[0];
      if (oldest) this.cache.delete(oldest);
    }

    const scan = await scanPumpToken(mint, this.solPriceUSD);
    const trackerData: Record<string, unknown> = {};
    const score = scorePumpSignal(scan, trackerData);

    this.cache.set(mint, { scan, score, seenAt: new Date() });

    if (score.score >= this.config.minScore) {
      this.stats.signalsEmitted++;
      if (score.strength === "strong") this.stats.strongSignals++;

      const summary = formatPumpScan(scan, score, this.solPriceUSD);
      this.log?.(`[PumpScanner] 🎯 ${score.strength.toUpperCase()} signal: ${scan.symbol} (${score.score}/100)`);

      // Write to solana-claude memory system
      writeMemory({
        tier: "INFERRED",
        content: `PUMP SIGNAL [${score.strength.toUpperCase()}] ${scan.symbol}/${scan.mint}: score=${score.score}. ${score.reasons.slice(0, 2).join(", ")}`,
        source: "pump-scanner",
      });

      this.emit("signal", { scan, score, summary });
    }
  }

  private async fetchSolPrice(): Promise<number> {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      );
      const data = await res.json() as { solana?: { usd?: number } };
      return data.solana?.usd ?? this.solPriceUSD;
    } catch {
      return this.solPriceUSD;
    }
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────

let _scanner: PumpScanner | null = null;

/** Get or create the global PumpScanner singleton */
export function getPumpScanner(config?: Partial<PumpScannerConfig>): PumpScanner {
  if (!_scanner) _scanner = new PumpScanner(config);
  return _scanner;
}
