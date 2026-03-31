/**
 * src/pump/client.ts
 *
 * Pump.fun + PumpSwap API client for solana-claude.
 *
 * Data sources:
 *   - Helius JSON-RPC: onchain account fetching, DAS token metadata
 *   - Helius Enhanced Transactions: parsed trade history
 *   - PumpPortal WebSocket: real-time token creation + trade stream
 *   - SolanaTracker: token security score, holder count, volume
 *
 * Adapted from Claude Code's tool patterns + pump-public-docs.
 *
 * NO private key or wallet required — all read-only.
 */

import type {
  BondingCurve,
  CreateEvent,
  PumpPool,
  PumpTokenScan,
  TokenPriceInfo,
  TradeEvent,
} from "./types.js";
import {
  CANONICAL_POOL_INDEX,
  PUMP_GLOBAL_PDA,
  PUMP_PROGRAM_ID,
  PUMP_AMM_PROGRAM_ID,
} from "./types.js";
import {
  bondingCurveMarketCap,
  formatGraduation,
  formatMarketCap,
  formatSol,
  formatTokens,
  getBuyQuote,
  getGraduationProgress,
  getSellQuote,
  getTokenPriceInfo,
} from "./math.js";

// ─── PDAs ──────────────────────────────────────────────────────────────────

/**
 * Derive the bonding curve PDA for a given mint.
 * Seeds: ["bonding-curve", mint_pubkey]
 *
 * Note: In production use @coral-xyz/anchor or @solana/kit to derive PDAs properly.
 * This is a doc reference — actual derivation happens on-chain.
 */
export function bondingCurvePdaNote(mint: string): string {
  return `PDA seeds: ["bonding-curve", "${mint}"] on program ${PUMP_PROGRAM_ID}`;
}

// ─── Helius RPC Helpers ───────────────────────────────────────────────────

const HELIUS_RPC = process.env.HELIUS_RPC_URL ??
  (process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com");

const HELIUS_KEY = process.env.HELIUS_API_KEY ?? "";
const SOL_TRACKER_KEY = process.env.SOLANA_TRACKER_API_KEY ?? "";

async function heliusRpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json() as { result?: T; error?: { message: string } };
  if (data.error) throw new Error(`Helius RPC ${method}: ${data.error.message}`);
  return data.result as T;
}

async function heliusRest<T>(endpoint: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  if (!HELIUS_KEY) throw new Error("HELIUS_API_KEY not set");
  const url = `https://api-mainnet.helius-rpc.com${endpoint}${endpoint.includes("?") ? "&" : "?"}api-key=${HELIUS_KEY}`;
  const res = await fetch(url, {
    method: opts?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`Helius REST ${endpoint} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function solanaTracker<T>(path: string): Promise<T> {
  const res = await fetch(`https://data.solanatracker.io${path}`, {
    headers: { Accept: "application/json", "x-api-key": SOL_TRACKER_KEY },
  });
  if (!res.ok) throw new Error(`SolanaTracker ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Bonding Curve Fetcher ───────────────────────────────────────────────────

/**
 * Fetch and decode a Pump bonding curve account from on-chain state.
 * Returns null if token has graduated (account may be zeroed).
 *
 * Bonding curve account layout (from pump.json IDL):
 *   virtualTokenReserves: u64 @ offset 8
 *   virtualSolReserves:   u64 @ offset 16
 *   realTokenReserves:    u64 @ offset 24
 *   realSolReserves:      u64 @ offset 32
 *   tokenTotalSupply:     u64 @ offset 40
 *   complete:             bool @ offset 48
 */
export async function fetchBondingCurve(
  bondingCurvePda: string,
): Promise<BondingCurve | null> {
  try {
    const result = await heliusRpc<{ value: { data: [string, string] } | null }>(
      "getAccountInfo",
      [bondingCurvePda, { encoding: "base64", commitment: "confirmed" }],
    );

    if (!result.value?.data) return null;

    const [b64] = result.value.data;
    const buf = Buffer.from(b64, "base64");
    if (buf.length < 49) return null;

    // Anchor discriminator is first 8 bytes
    const view = new DataView(buf.buffer, buf.byteOffset);
    const virtualTokenReserves = view.getBigUint64(8, true);
    const virtualSolReserves = view.getBigUint64(16, true);
    const realTokenReserves = view.getBigUint64(24, true);
    const realSolReserves = view.getBigUint64(32, true);
    const tokenTotalSupply = view.getBigUint64(40, true);
    const complete = buf[48] === 1;

    return {
      virtualTokenReserves,
      virtualSolReserves,
      realTokenReserves,
      realSolReserves,
      tokenTotalSupply,
      complete,
      creator: "unknown", // Not available without cross-referencing CreateEvent
      isMayhemMode: false,
    };
  } catch {
    return null;
  }
}

// ─── Token Scan (Combined data from all sources) ─────────────────────────────

/**
 * Comprehensive token scan — combines on-chain data, analytics, and security.
 *
 * @param mint - Token mint address
 * @param solPriceUSD - Current SOL price (for USD market cap)
 */
export async function scanPumpToken(
  mint: string,
  solPriceUSD?: number,
): Promise<PumpTokenScan> {
  const [trackerData, dasData] = await Promise.allSettled([
    solanaTracker<Record<string, unknown>>(`/tokens/${mint}`),
    heliusRpc<Record<string, unknown>>("getAsset", [{ id: mint }]),
  ]);

  const tracker = trackerData.status === "fulfilled" ? trackerData.value : null;
  const das = dasData.status === "fulfilled" ? dasData.value : null;

  // Fetch Enhanced transactions for recent trade history
  let recentTrades: TradeEvent[] = [];
  if (HELIUS_KEY) {
    try {
      const txs = await heliusRest<Array<Record<string, unknown>>>(
        `/v0/addresses/${mint}/transactions?limit=20&type=SWAP`,
      );
      recentTrades = txs.map(tx => parsePumpTradeFromHelius(tx, mint)).filter(Boolean) as TradeEvent[];
    } catch { /* no trades yet */ }
  }

  const mintInfo = (tracker as Record<string, unknown> | null);
  // DAS response needs explicit casts — shape varies by asset type
  const dasContent = das?.["content"] as Record<string, unknown> | undefined;
  const dasMetadata = dasContent?.["metadata"] as Record<string, unknown> | undefined;
  const dasAuthorities = das?.["authorities"] as Array<Record<string, unknown>> | undefined;
  const name = String(mintInfo?.name ?? dasMetadata?.["name"] ?? "Unknown");
  const symbol = String(mintInfo?.symbol ?? dasMetadata?.["symbol"] ?? "???");
  const creator = String(mintInfo?.creator ?? dasAuthorities?.[0]?.["address"] ?? "unknown");

  // Determine graduation status
  const isGraduated = Boolean(mintInfo?.poolAddress) || Boolean(mintInfo?.migratedToAMM);

  const priceInfo: TokenPriceInfo | null = null; // Would need on-chain bonding curve

  return {
    mint,
    name,
    symbol,
    uri: String(dasContent?.["json_uri"] ?? ""),
    creator,
    createdAt: Number(mintInfo?.createdAt ?? 0),
    bondingCurve: null,  // Populated by fetchBondingCurve if not graduated
    priceInfo,
    isGraduated,
    pool: null,
    recentTrades,
    holderCount: Number(mintInfo?.holderCount ?? 0),
    flags: {
      creatorSold: Boolean(mintInfo?.creatorSold),
      liquidityLocked: isGraduated, // LP tokens burned on graduation
      cashbackEnabled: Boolean(mintInfo?.isCashbackCoin),
      mayhemMode: Boolean(mintInfo?.isMayhemMode),
      whaleConcentration: detectWhaleConcentration(mintInfo),
    },
  };
}

// ─── Signal Scoring (OODA integration) ───────────────────────────────────────

export type PumpSignalStrength = "strong" | "moderate" | "weak" | "avoid";

export interface PumpSignalScore {
  strength: PumpSignalStrength;
  score: number;         // 0–100
  reasons: string[];
  riskFactors: string[];
}

/**
 * Score a Pump token for trading signal strength.
 * Adapted from the OODA "orient" phase — used by the scanner agent.
 *
 * Scoring model:
 *   + Security: no rug flags, creator retained, LP locked
 *   + Volume: high 24h volume relative to market cap
 *   + Momentum: price change % vs SOL and overall market
 *   + Smart money: top trader activity
 *   + Graduation: 60-90% = sweet spot (pre-grad play)
 */
export function scorePumpSignal(
  scan: PumpTokenScan,
  trackerData?: Record<string, unknown>,
): PumpSignalScore {
  let score = 50;
  const reasons: string[] = [];
  const riskFactors: string[] = [];

  // ── Security checks ──
  if (scan.flags.liquidityLocked) { score += 10; reasons.push("LP locked (graduated)"); }
  if (scan.flags.creatorSold) { score -= 20; riskFactors.push("Creator sold tokens ⚠️"); }
  if (scan.flags.whaleConcentration) { score -= 15; riskFactors.push("Whale concentration (>50% top 10)"); }
  if (scan.flags.mayhemMode) { score -= 5; riskFactors.push("Mayhem mode (higher volatility)"); }
  if (scan.flags.cashbackEnabled) { score += 3; reasons.push("Cashback enabled (rewards traders)"); }

  // ── Graduation progress ──
  if (scan.priceInfo?.graduation) {
    const { progressBps } = scan.priceInfo.graduation;
    if (progressBps >= 6000 && progressBps <= 9000) {
      score += 15;
      reasons.push(`Pre-grad play: ${(progressBps / 100).toFixed(0)}% bonded 🎯`);
    } else if (progressBps >= 9001) {
      score += 5;
      reasons.push(`Near graduation: ${(progressBps / 100).toFixed(0)}%`);
    } else if (progressBps < 2000) {
      score -= 10;
      riskFactors.push(`Early stage only ${(progressBps / 100).toFixed(0)}% bonded`);
    }
  }

  // ── Volume check ──
  const vol24h = Number(trackerData?.["volume24h"] ?? 0);
  if (vol24h > 1_000_000) { score += 10; reasons.push(`High volume: $${(vol24h / 1e6).toFixed(2)}M`); }
  else if (vol24h > 100_000) { score += 5; reasons.push(`Moderate volume: $${(vol24h / 1e3).toFixed(0)}K`); }

  // ── Recent trades ──
  const buys = scan.recentTrades.filter(t => t.isBuy).length;
  const sells = scan.recentTrades.filter(t => !t.isBuy).length;
  if (buys > sells * 2) { score += 8; reasons.push(`Buy pressure: ${buys}/${buys + sells} buys`); }
  if (sells > buys * 2) { score -= 10; riskFactors.push(`Sell pressure: ${sells}/${buys + sells} sells`); }

  // ── Holder count ──
  if ((scan.holderCount ?? 0) > 1000) { score += 5; reasons.push(`${scan.holderCount!.toLocaleString()} holders`); }

  // ── Classify ──
  const strength: PumpSignalStrength =
    score >= 75 ? "strong" :
    score >= 55 ? "moderate" :
    score >= 35 ? "weak" : "avoid";

  return { strength, score: Math.min(100, Math.max(0, score)), reasons, riskFactors };
}

/**
 * Format a pump scan result as a human-readable summary for the agent.
 */
export function formatPumpScan(
  scan: PumpTokenScan,
  signal: PumpSignalScore,
  solPriceUSD?: number,
): string {
  const lines: string[] = [];

  lines.push(`## ${scan.symbol} — ${scan.name}`);
  lines.push(`Mint: \`${scan.mint}\``);
  lines.push(`Creator: \`${scan.creator.slice(0, 8)}...\``);
  lines.push(`Status: ${scan.isGraduated ? "🎓 Graduated to PumpSwap AMM" : "📈 Bonding curve"}`);

  if (scan.priceInfo) {
    lines.push(`\n### Price`);
    lines.push(`Buy:  ${formatSol(scan.priceInfo.buyPriceLamports)} / token`);
    lines.push(`Sell: ${formatSol(scan.priceInfo.sellPriceLamports)} / token`);
    if (scan.priceInfo.marketCapUSD !== undefined) {
      lines.push(`MCap: $${scan.priceInfo.marketCapUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    }
    lines.push(`Graduation: ${formatGraduation(scan.priceInfo.graduation.progressBps)}`);
  }

  lines.push(`\n### Signal`);
  lines.push(`Score: **${signal.score}/100** (${signal.strength.toUpperCase()})`);
  if (signal.reasons.length > 0) lines.push(`✅ ${signal.reasons.join(" | ")}`);
  if (signal.riskFactors.length > 0) lines.push(`⚠️ ${signal.riskFactors.join(" | ")}`);

  lines.push(`\n### Flags`);
  const flagLines = [
    scan.flags.liquidityLocked ? "🔒 LP Locked" : "🔓 LP Not Locked",
    scan.flags.cashbackEnabled ? "💰 Cashback" : "",
    scan.flags.mayhemMode ? "⚡ Mayhem Mode" : "",
    scan.flags.whaleConcentration ? "🐋 Whale Risk" : "",
    scan.flags.creatorSold ? "🚨 Creator Sold" : "✅ Creator Holding",
  ].filter(Boolean);
  lines.push(flagLines.join(" | "));

  lines.push(`\n*${scan.recentTrades.length} recent trades analyzed*`);
  return lines.join("\n");
}

// ─── PumpPortal WebSocket (real-time stream) ─────────────────────────────────

export type PumpPortalEvent =
  | { type: "newToken"; data: CreateEvent }
  | { type: "trade"; data: TradeEvent }
  | { type: "error"; error: string };

/**
 * Connect to PumpPortal's real-time WebSocket for live token creation + trade events.
 *
 * @param handler - Called for each event
 * @param opts    - Subscription options
 * @returns Disconnect function
 *
 * PumpPortal WS: wss://pumpportal.fun/api/data
 * Docs: https://pumpportal.fun/docs
 */
export function connectPumpPortalStream(
  handler: (event: PumpPortalEvent) => void,
  opts: {
    /** Subscribe to new token creations */
    newTokens?: boolean;
    /** Subscribe to trades on specific mints */
    tradeMints?: string[];
    /** Subscribe to trades by specific accounts */
    tradeAccounts?: string[];
  } = {},
): { disconnect: () => void } {
  const WS_URL = "wss://pumpportal.fun/api/data";
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      if (opts.newTokens !== false) {
        ws!.send(JSON.stringify({ method: "subscribeNewToken" }));
      }
      if (opts.tradeMints?.length) {
        ws!.send(JSON.stringify({ method: "subscribeTokenTrade", keys: opts.tradeMints }));
      }
      if (opts.tradeAccounts?.length) {
        ws!.send(JSON.stringify({ method: "subscribeAccountTrade", keys: opts.tradeAccounts }));
      }
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(String(msg.data));
        if (data.txType === "create") {
          handler({ type: "newToken", data: data as CreateEvent });
        } else if (data.txType === "buy" || data.txType === "sell") {
          handler({
            type: "trade",
            data: {
              ...data,
              isBuy: data.txType === "buy",
            } as TradeEvent,
          });
        }
      } catch { /* ignore malformed */ }
    };

    ws.onerror = (e) => {
      handler({ type: "error", error: String(e) });
    };

    ws.onclose = () => {
      if (!stopped) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };
  }

  connect();

  return {
    disconnect: () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function parsePumpTradeFromHelius(
  tx: Record<string, unknown>,
  mint: string,
): TradeEvent | null {
  try {
    const type = String(tx["type"] ?? "");
    const isBuy = type === "SWAP" && String(tx["source"] ?? "").includes("PUMP");
    const events = (tx["events"] as Record<string, unknown> | undefined) ?? {};
    const swap = events["swap"] as Record<string, unknown> | undefined;
    if (!swap) return null;

    const tokenInputs = swap["tokenInputs"] as Array<Record<string, unknown>> | undefined;
    const tokenOutputs = swap["tokenOutputs"] as Array<Record<string, unknown>> | undefined;
    const rawIn = tokenInputs?.[0]?.["rawTokenAmount"] as Record<string, unknown> | undefined;
    const rawOut = tokenOutputs?.[0]?.["rawTokenAmount"] as Record<string, unknown> | undefined;
    return {
      mint,
      solAmount: BigInt(Math.round(Number(swap["nativeInput"] ?? swap["nativeOutput"] ?? 0))),
      tokenAmount: BigInt(Math.round(Number(rawIn?.["tokenAmount"] ?? rawOut?.["tokenAmount"] ?? 0))),
      isBuy,
      user: String(tx["feePayer"] ?? "unknown"),
      timestamp: BigInt(Number(tx["timestamp"] ?? 0)),
      virtualSolReserves: 0n,
      virtualTokenReserves: 0n,
      realSolReserves: 0n,
      realTokenReserves: 0n,
      feeRecipient: "unknown",
      feeBasisPoints: 100n,
      fee: 0n,
      creator: "unknown",
      creatorFeeBasisPoints: 0n,
      creatorFee: 0n,
      trackVolume: false,
    };
  } catch {
    return null;
  }
}

function detectWhaleConcentration(tokenData: Record<string, unknown> | null): boolean {
  if (!tokenData) return false;
  const top10 = Number(tokenData["top10HolderPercent"] ?? tokenData["top10"] ?? 0);
  return top10 > 50;
}
