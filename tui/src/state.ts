/**
 * HERMES x402 TUI — Shared Dashboard State
 *
 * Holds all live data that panels read on each render cycle.
 */

export type OODAPhase = 'observe' | 'orient' | 'decide' | 'act' | 'learn' | 'idle';
export type MemoryTier = 'KNOWN' | 'LEARNED' | 'INFERRED';
export type Protocol = 'x402' | 'mpp' | 'ap2' | 'a2a';

export interface TrendingToken {
  symbol: string;
  change: number;
  volume24h?: number;
}

export interface TradeSignal {
  symbol: string;
  score: number;
  size: string;
  side: 'buy' | 'sell' | 'pass';
  timestamp: number;
}

export interface A2AConnection {
  agentId: string;
  endpoint: string;
  status: 'connected' | 'handshaking' | 'disconnected';
  latencyMs: number;
  protocol: Protocol;
}

export interface PaymentRecord {
  amount: number;
  asset: 'USDC' | 'CLAWD';
  resource: string;
  signature: string;
  protocol: Protocol;
  timestamp: number;
  confidential: boolean;
}

export interface MemoryStats {
  known: number;
  learned: number;
  inferred: number;
}

export interface LogEntry {
  ts: number;
  phase: string;
  msg: string;
  level: 'info' | 'warn' | 'error' | 'pay' | 'a2a' | 'trade';
}

export interface DashboardState {
  // Market
  solPrice: number;
  solChange24h: number;
  trending: TrendingToken[];
  // P&L
  paperPnl: number;
  winRate: number;
  totalTrades: number;
  lastSignal: TradeSignal | null;
  // OODA
  oodaPhase: OODAPhase;
  pulseIntervalSec: number;
  cycleCount: number;
  // Payments
  usdcBalance: number;
  clawdBalance: number;
  lastPayment: PaymentRecord | null;
  totalSpent: number;
  // A2A / Protocol
  a2aConnections: A2AConnection[];
  confidentialMode: boolean;
  darkDefiArmed: boolean;
  payshStatus: 'online' | 'degraded' | 'offline';
  // Memory
  memory: MemoryStats;
  // Model
  activeModel: string;
  nousOnline: boolean;
  // Log
  log: LogEntry[];
  // Runtime
  startedAt: number;
  lastRefresh: number;
  error: string | null;
}

export function createInitialState(): DashboardState {
  return {
    solPrice: 0,
    solChange24h: 0,
    trending: [],
    paperPnl: 0,
    winRate: 0,
    totalTrades: 0,
    lastSignal: null,
    oodaPhase: 'idle',
    pulseIntervalSec: 60,
    cycleCount: 0,
    usdcBalance: 0,
    clawdBalance: 0,
    lastPayment: null,
    totalSpent: 0,
    a2aConnections: [],
    confidentialMode: true,
    darkDefiArmed: false,
    payshStatus: 'offline',
    memory: { known: 0, learned: 0, inferred: 0 },
    activeModel: 'hermes-4.3-70b',
    nousOnline: false,
    log: [],
    startedAt: Date.now(),
    lastRefresh: 0,
    error: null,
  };
}

export function addLog(
  state: DashboardState,
  phase: string,
  msg: string,
  level: LogEntry['level'] = 'info',
): void {
  state.log.unshift({ ts: Date.now(), phase, msg, level });
  if (state.log.length > 50) state.log.length = 50;
}
