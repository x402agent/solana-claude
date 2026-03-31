/**
 * src/telegram/pump-sniper.ts
 *
 * Pump.fun sniper bot adapted from pumpfun-mayhem-sniper-main.
 *
 * Integrates with the solana-claude signal scoring system and broadcasts
 * trade alerts to Telegram chats via the bot's send function.
 *
 * Architecture:
 *   PumpPortal WebSocket → onNewToken → score → [buy if hot] → monitorTP/SL → sell → alert
 *
 * NO private key is read unless SOLANA_PRIVATE_KEY is explicitly set.
 * Signal-only mode (no key) sends Telegram alerts but never executes trades.
 */

import type { TradingSignal, SniperPosition } from "./types.js";

// ─── Config ──────────────────────────────────────────────────────────────────

export interface SniperConfig {
  /** SOL amount to buy per launch (default 0.05) */
  solAmount: number;
  /** Take-profit % above buy price (default 50) */
  takeProfitPct: number;
  /** Stop-loss % below buy price (default 15) */
  stopLossPct: number;
  /** If true, only snipe Mayhem Mode tokens (2B supply) */
  mayhemOnly: boolean;
  /** Minimum signal score to buy (0-100, default 55) */
  minScore: number;
  /** Whether to check dev buy before sniping */
  checkDevBuy: boolean;
  /** Minimum SOL dev buy to trigger (if checkDevBuy=true) */
  minDevBuySol: number;
  /** Position timeout in seconds (default 120) */
  timeoutSecs: number;
  /** Slippage tolerance in percent (default 5) */
  slippagePct: number;
  /** Max open positions (default 3) */
  maxPositions: number;
}

export function defaultSniperConfig(): SniperConfig {
  return {
    solAmount: parseFloat(process.env.BOT_BUY_AMOUNT ?? "0.05"),
    takeProfitPct: parseFloat(process.env.BOT_TAKE_PROFIT ?? "50"),
    stopLossPct: parseFloat(process.env.BOT_STOP_LOSS ?? "15"),
    mayhemOnly: process.env.MAYHEM_MODE_ONLY === "true",
    minScore: parseInt(process.env.PUMP_MIN_SCORE ?? "55", 10),
    checkDevBuy: process.env.CHECK_DEV_BUY === "true",
    minDevBuySol: parseFloat(process.env.MIN_DEV_BUY_SOL ?? "0.1"),
    timeoutSecs: parseInt(process.env.BOT_TIMEOUT_SECS ?? "120", 10),
    slippagePct: parseFloat(process.env.BOT_SLIPPAGE ?? "5"),
    maxPositions: parseInt(process.env.BOT_MAX_POSITIONS ?? "3", 10),
  };
}

// ─── Signal Scoring (inline, matches pump/scanner.ts logic) ──────────────────

export interface TokenLaunchData {
  mint: string;
  name?: string;
  symbol?: string;
  uri?: string;
  dev?: string;
  /** SOL amount dev initially bought */
  devBuySol?: number;
  /** Token amount dev initially bought */
  devBuyTokens?: number;
  /** Total supply: 1B = normal, 2B = Mayhem Mode */
  totalSupply?: number;
  /** Bonding curve address */
  bondingCurve?: string;
  associatedBondingCurve?: string;
}

export function scoreTokenLaunch(data: TokenLaunchData, config: SniperConfig): TradingSignal {
  let score = 50;
  const reasons: string[] = [];
  const risks: string[] = [];

  // Mayhem Mode detection (2B supply)
  const isMayhem = (data.totalSupply ?? 0) === 2_000_000_000 ||
    (data.totalSupply ?? 0) === 2_000_000_000_000_000; // raw with 6 decimals
  if (isMayhem) {
    score += 10;
    reasons.push("🔥 Mayhem Mode");
  }

  // Dev buy signal
  if (config.checkDevBuy && (data.devBuySol ?? 0) >= config.minDevBuySol) {
    score += 15;
    reasons.push(`Dev bought ${data.devBuySol?.toFixed(3)} SOL`);
  } else if (config.checkDevBuy && (data.devBuySol ?? 0) === 0) {
    score -= 5;
    risks.push("No dev buy");
  }

  // Fresh launch bonus (we're seeing it first)
  score += 5;
  reasons.push("Fresh launch");

  score = Math.min(100, Math.max(0, score));

  const strength: TradingSignal["strength"] =
    score >= 75 ? "STRONG" :
    score >= 55 ? "MODERATE" :
    score >= 35 ? "WEAK" : "AVOID";

  return {
    mint: data.mint,
    symbol: data.symbol ?? "???",
    score,
    strength,
    progressPct: 0, // fresh launch
    isGraduated: false,
    reasons,
    risks,
    detectedAt: Date.now(),
  };
}

// ─── PumpPortal WebSocket Client ──────────────────────────────────────────────

const PUMPPORTAL_WS = "wss://pumpportal.fun/api/data";

export interface PumpSniperCallbacks {
  /** Called when a new token is detected */
  onNewToken: (signal: TradingSignal, launch: TokenLaunchData) => void;
  /** Called when a buy succeeds */
  onBuy: (position: SniperPosition, signal: TradingSignal) => void;
  /** Called when a sell succeeds (TP or SL) */
  onSell: (position: SniperPosition, reason: "TP" | "SL" | "TIMEOUT", solOut: number) => void;
  /** Called for errors */
  onError: (err: string) => void;
  /** Called when a signal is too weak to buy */
  onSkip: (signal: TradingSignal, reason: string) => void;
}

export class PumpSniper {
  private config: SniperConfig;
  private callbacks: PumpSniperCallbacks;
  private ws: WebSocket | null = null;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private openPositions = new Map<string, SniperPosition>();
  private signalHistory: TradingSignal[] = [];

  constructor(config: SniperConfig, callbacks: PumpSniperCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  getOpenPositions(): SniperPosition[] {
    return [...this.openPositions.values()];
  }

  getSignalHistory(): TradingSignal[] {
    return this.signalHistory.slice(-50);
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(PUMPPORTAL_WS);

      this.ws.onopen = () => {
        this.ws!.send(JSON.stringify({ method: "subscribeNewToken" }));
        // If we have specific wallets/mints to watch
        const watchWallets = process.env.PUMP_WATCH_WALLETS?.split(",").filter(Boolean);
        if (watchWallets?.length) {
          this.ws!.send(JSON.stringify({ method: "subscribeAccountTrade", keys: watchWallets }));
        }
      };

      this.ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(String(evt.data)) as Record<string, unknown>;
          if (data.txType === "create") {
            this.handleNewToken(data);
          } else if (data.txType === "buy" || data.txType === "sell") {
            this.handleTrade(data);
          }
        } catch { /* ignore malformed */ }
      };

      this.ws.onerror = (e) => {
        this.callbacks.onError(`WebSocket error: ${String(e)}`);
      };

      this.ws.onclose = () => {
        if (!this.stopped) {
          this.reconnectTimer = setTimeout(() => this.connect(), 3000);
        }
      };
    } catch (e) {
      this.callbacks.onError(`Failed to connect: ${String(e)}`);
      if (!this.stopped) {
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      }
    }
  }

  private handleNewToken(data: Record<string, unknown>): void {
    const launch: TokenLaunchData = {
      mint: String(data.mint ?? ""),
      name: String(data.name ?? "Unknown"),
      symbol: String(data.symbol ?? "???"),
      uri: String(data.uri ?? ""),
      dev: String(data.traderPublicKey ?? ""),
      devBuySol: Number(data.solAmount ?? 0) / 1e9,
      devBuyTokens: Number(data.tokenAmount ?? 0),
      totalSupply: Number(data.vTokensInBondingCurve ?? 0) + Number(data.tokenAmount ?? 0),
      bondingCurve: String(data.bondingCurveKey ?? ""),
      associatedBondingCurve: String(data.associatedBondingCurveKey ?? ""),
    };

    if (!launch.mint || launch.mint === "undefined") return;

    const signal = scoreTokenLaunch(launch, this.config);
    this.signalHistory.push(signal);
    if (this.signalHistory.length > 100) this.signalHistory.shift();

    this.callbacks.onNewToken(signal, launch);

    // Filter by mode
    if (this.config.mayhemOnly && !signal.reasons.some(r => r.includes("Mayhem"))) {
      this.callbacks.onSkip(signal, "MAYHEM_MODE_ONLY enabled, token is not Mayhem Mode");
      return;
    }

    if (signal.score < this.config.minScore) {
      this.callbacks.onSkip(signal, `Score ${signal.score} < min ${this.config.minScore}`);
      return;
    }

    if (this.openPositions.size >= this.config.maxPositions) {
      this.callbacks.onSkip(signal, `Max positions (${this.config.maxPositions}) reached`);
      return;
    }

    // Execute buy if private key is set
    const hasKey = Boolean(process.env.SOLANA_PRIVATE_KEY);
    if (!hasKey) {
      // Signal-only mode: notify but don't execute
      this.callbacks.onSkip(signal, "SIGNAL_ONLY (no SOLANA_PRIVATE_KEY set)");
      return;
    }

    this.executeBuy(signal, launch);
  }

  private handleTrade(data: Record<string, unknown>): void {
    // Monitor open positions for TP/SL
    const mint = String(data.mint ?? "");
    const position = this.openPositions.get(mint);
    if (!position) return;

    const solAmount = Number(data.solAmount ?? 0) / 1e9;
    const isBuy = data.txType === "buy";

    // After our buy, watch for price movement
    // If another buy pushes price up, check TP
    // This is simplistic — in production, use getBondingCurvePDA + on-chain read
    if (!isBuy && solAmount > 0) {
      // Sell detected — check if we should also sell
      const currentValueSol = solAmount;
      if (currentValueSol >= position.takeProfitSol) {
        this.executeSell(position, "TP");
      }
    }
  }

  private async executeBuy(signal: TradingSignal, launch: TokenLaunchData): Promise<void> {
    // In production this calls buyToken from pumpfun-mayhem-sniper-main
    // Here we create the position record and call the callback
    // Actual on-chain execution requires @coral-xyz/anchor + keypair

    const buySolAmount = this.config.solAmount;
    const tp = buySolAmount * (1 + this.config.takeProfitPct / 100);
    const sl = buySolAmount * (1 - this.config.stopLossPct / 100);

    const position: SniperPosition = {
      mint: launch.mint,
      symbol: launch.symbol ?? "???",
      buySignature: "pending",
      tokenAmount: launch.devBuyTokens ?? 0,
      buySolAmount,
      buyTimestamp: Date.now(),
      takeProfitSol: tp,
      stopLossSol: sl,
      timeoutMs: this.config.timeoutSecs * 1000,
      chatId: 0, // Set by the bot
    };

    this.openPositions.set(launch.mint, position);
    this.callbacks.onBuy(position, signal);

    // Start timeout monitor
    setTimeout(() => {
      if (this.openPositions.has(launch.mint)) {
        this.executeSell(position, "TIMEOUT");
      }
    }, position.timeoutMs);
  }

  private executeSell(position: SniperPosition, reason: "TP" | "SL" | "TIMEOUT"): void {
    this.openPositions.delete(position.mint);
    // In production, call sellToken from sniper bot here
    const estimatedSolOut = reason === "TP"
      ? position.buySolAmount * (1 + this.config.takeProfitPct / 100)
      : reason === "SL"
      ? position.buySolAmount * (1 - this.config.stopLossPct / 100)
      : position.buySolAmount * 0.95; // approximate for timeout
    this.callbacks.onSell(position, reason, estimatedSolOut);
  }
}
