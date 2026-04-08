/**
 * src/monitor/index.ts — Unified wallet & token monitoring exports
 *
 * Three streaming sources + polling fallback:
 *  1. Helius WebSocket (Enhanced) — via ../helius/
 *  2. Birdeye WebSocket           — token prices, trades, metadata
 *  3. Solana Tracker DataStream   — trades, new tokens, wallet activity
 *  4. Helius HTTP Poller          — enhanced transaction polling fallback
 */

// ── Birdeye ────────────────────────────────────────────────────────────────────
export { BirdeyeStream, createBirdeyeStream } from "./birdeye-stream.js";
export type {
  BirdeyeStreamConfig,
  BirdeyePriceUpdate,
  BirdeyeTradeEvent,
  BirdeyeTokenOverview,
  BirdeyeEvent,
} from "./birdeye-stream.js";

// ── Solana Tracker ─────────────────────────────────────────────────────────────
export { SolanaTrackerStream, createSolanaTrackerStream } from "./solana-tracker-stream.js";
export type {
  SolanaTrackerStreamConfig,
  SolanaTrackerTradeEvent,
  SolanaTrackerNewTokenEvent,
  SolanaTrackerPoolUpdate,
  SolanaTrackerWalletActivity,
  SolanaTrackerEvent,
} from "./solana-tracker-stream.js";

// ── Unified Monitor ────────────────────────────────────────────────────────────
export { WalletMonitor, createWalletMonitor } from "./wallet-monitor.js";
export type {
  WalletMonitorConfig,
  MonitorEvent,
  MonitorStatus,
} from "./wallet-monitor.js";
