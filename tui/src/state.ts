export type OODAPhase = 'observe' | 'orient' | 'decide' | 'act' | 'learn' | 'idle';
export type Protocol = 'x402' | 'mpp' | 'ap2' | 'a2a';
export type ViewMode = 'market' | 'trading' | 'portfolio' | 'analytics' | 'agent';

export interface TrendingToken {
  symbol: string;
  change: number;
  volume24h?: number;
  price?: number;
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

export interface CandlePoint {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface OrderBookLevel {
  side: 'bid' | 'ask';
  price: number;
  size: number;
}

export interface HeatCell {
  label: string;
  change: number;
}

export interface FeedItem {
  icon: string;
  text: string;
  tone: 'neutral' | 'bull' | 'bear' | 'whale';
  ts: number;
}

export interface WalletPosition {
  symbol: string;
  valueUsd: number;
  change24h: number;
  allocation: number;
}

export interface WalletContext {
  address: string;
  solBalance: number;
  totalValueUsd: number;
  dailyPnlUsd: number;
  positions: WalletPosition[];
}

export interface NetworkStats {
  tps: number;
  slot: number;
  pingMs: number;
  validators: number;
}

export interface AgentMessage {
  role: 'system' | 'agent' | 'user';
  text: string;
  ts: number;
}

export interface DashboardState {
  view: ViewMode;
  showHelp: boolean;
  commandBuffer: string;
  autoMode: boolean;
  interactiveMode: boolean;
  solPrice: number;
  solChange24h: number;
  trending: TrendingToken[];
  tickerTape: TrendingToken[];
  candles: CandlePoint[];
  orderBook: OrderBookLevel[];
  heatmap: HeatCell[];
  topMovers: TrendingToken[];
  liveFeed: FeedItem[];
  paperPnl: number;
  winRate: number;
  totalTrades: number;
  lastSignal: TradeSignal | null;
  wallet: WalletContext;
  network: NetworkStats;
  oodaPhase: OODAPhase;
  pulseIntervalSec: number;
  cycleCount: number;
  usdcBalance: number;
  clawdBalance: number;
  lastPayment: PaymentRecord | null;
  totalSpent: number;
  a2aConnections: A2AConnection[];
  confidentialMode: boolean;
  darkDefiArmed: boolean;
  payshStatus: 'online' | 'degraded' | 'offline';
  memory: MemoryStats;
  activeModel: string;
  nousOnline: boolean;
  log: LogEntry[];
  agentMessages: AgentMessage[];
  startedAt: number;
  lastRefresh: number;
  error: string | null;
}

export function createInitialState(): DashboardState {
  return {
    view: 'market',
    showHelp: false,
    commandBuffer: '',
    autoMode: false,
    interactiveMode: true,
    solPrice: 0,
    solChange24h: 0,
    trending: [],
    tickerTape: [],
    candles: [],
    orderBook: [],
    heatmap: [],
    topMovers: [],
    liveFeed: [],
    paperPnl: 0,
    winRate: 0,
    totalTrades: 0,
    lastSignal: null,
    wallet: {
      address: 'devnet-demo-wallet',
      solBalance: 0,
      totalValueUsd: 0,
      dailyPnlUsd: 0,
      positions: [],
    },
    network: {
      tps: 0,
      slot: 0,
      pingMs: 0,
      validators: 0,
    },
    oodaPhase: 'idle',
    pulseIntervalSec: 60,
    cycleCount: 0,
    usdcBalance: 25,
    clawdBalance: 1000000,
    lastPayment: null,
    totalSpent: 0,
    a2aConnections: [],
    confidentialMode: true,
    darkDefiArmed: false,
    payshStatus: 'offline',
    memory: { known: 0, learned: 0, inferred: 0 },
    activeModel: 'claude-sonnet-4-6',
    nousOnline: false,
    log: [],
    agentMessages: [],
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
  if (state.log.length > 80) state.log.length = 80;
}

export function addAgentMessage(
  state: DashboardState,
  role: AgentMessage['role'],
  text: string,
): void {
  state.agentMessages.unshift({ role, text, ts: Date.now() });
  if (state.agentMessages.length > 20) state.agentMessages.length = 20;
}
