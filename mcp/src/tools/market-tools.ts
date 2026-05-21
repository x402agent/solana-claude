/**
 * Composite Market Intelligence Tools for Solana Clawd MCP
 *
 * These tools aggregate signals from multiple sources into actionable
 * market intelligence — going beyond individual data points:
 *
 *   market_signal          — Composite signal: trending + pump + price + regime
 *   market_regime          — Bull / bear / crab / pump regime detection
 *   smart_money_flow       — Multi-wallet flow analysis (follow smart money)
 *   compute_unit_optimizer — P-token vs SPL fee comparison for any tx profile
 *   token_heat_map         — Visualise trending momentum across the market
 *
 * These are the "premium" tools — they synthesise multiple API calls into
 * a single structured intelligence report.
 */

import type { ToolDef, ToolHandler } from "../orchestrator.js";
import { solanaTracker, coingeckoPrice, jupiterPrice, heliusRPC } from "../api.js";

// ─── Cost constants (micro-USDC) ──────────────────────────────────────────────

const SIGNAL_COST = 500;   // $0.0005 — 3 API calls aggregated
const REGIME_COST = 300;   // $0.0003 — trend analysis
const SMART_MONEY_COST = 1000; // $0.001 — multi-wallet query

// ─── P-Token CU reference ────────────────────────────────────────────────────

const CU = {
  pToken: {
    transferChecked: 105, transfer: 76, approve: 124, revoke: 124,
    mintTo: 138, burn: 136,
  },
  spl: {
    transferChecked: 6200, transfer: 4645, approve: 2904, revoke: 2876,
    mintTo: 4597, burn: 4753,
  },
};

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const MARKET_TOOLS: Array<[ToolDef, ToolHandler]> = [

  // ── market_signal ─────────────────────────────────────────────────────────
  [
    {
      name: "market_signal",
      description:
        "Composite Solana market signal: aggregates SOL price, top trending tokens, " +
        "Pump.fun new launches, and momentum indicators into one STRONG/MODERATE/WEAK " +
        "signal with a top-3 opportunity list. Saves you 3+ separate tool calls. " +
        "Premium: $0.0005 per call.",
      inputSchema: {
        type: "object",
        properties: {
          trendingLimit: { type: "number", description: "Trending tokens to scan (default 20)" },
          minScore: { type: "number", description: "Minimum signal score to include 0-100 (default 50)" },
        },
      },
      category: "market",
      cost: SIGNAL_COST,
    },
    async (args) => {
      const limit = Math.min(Number(args.trendingLimit ?? 20), 50);
      const minScore = Number(args.minScore ?? 50);

      const [solData, trendingData, newTokensData] = await Promise.allSettled([
        coingeckoPrice("solana"),
        solanaTracker(`/tokens/trending?limit=${limit}`),
        solanaTracker(`/tokens/latest?limit=10`),
      ]);

      const sol = solData.status === "fulfilled"
        ? (solData.value as Record<string, Record<string, number>>)?.solana
        : null;
      const solPrice = sol?.usd ?? 0;
      const solChange = sol?.usd_24h_change ?? 0;

      // Regime detection from SOL price action
      let regime = "NEUTRAL";
      if (solChange > 5) regime = "BULL";
      else if (solChange > 2) regime = "MILD_BULL";
      else if (solChange < -5) regime = "BEAR";
      else if (solChange < -2) regime = "MILD_BEAR";

      // Score trending tokens
      const trending =
        trendingData.status === "fulfilled"
          ? (trendingData.value as Array<Record<string, unknown>>)
          : [];

      interface ScoredToken {
        symbol: string;
        mint: string;
        score: number;
        change24h: number;
        volume24h: number;
        reasons: string[];
      }

      const scored: ScoredToken[] = trending.slice(0, 15).map((t) => {
        let score = 50;
        const reasons: string[] = [];
        const change = Number(t.priceChange24h ?? t.change24h ?? 0);
        const vol = Number(t.volume24h ?? 0);
        const holders = Number(t.holderCount ?? 0);
        const secScore = Number(t.securityScore ?? t.score ?? 50);

        if (change > 30) { score += 20; reasons.push(`+${change.toFixed(0)}% 24h`); }
        else if (change > 10) { score += 10; reasons.push(`+${change.toFixed(0)}% 24h`); }
        if (vol > 1_000_000) { score += 15; reasons.push(`Vol $${(vol/1e6).toFixed(1)}M`); }
        else if (vol > 100_000) { score += 8; reasons.push(`Vol $${(vol/1e3).toFixed(0)}K`); }
        if (holders > 5000) { score += 5; reasons.push(`${holders.toLocaleString()} holders`); }
        if (secScore > 80) { score += 10; reasons.push(`Security ${secScore}`); }
        else if (secScore < 40) { score -= 20; reasons.push(`⚠️ Security ${secScore}`); }

        return {
          symbol: String(t.symbol ?? "??"),
          mint: String(t.address ?? t.mint ?? ""),
          score: Math.min(100, Math.max(0, score)),
          change24h: change,
          volume24h: vol,
          reasons,
        };
      });

      const top3 = scored
        .filter((t) => t.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const compositeScore = top3.length > 0
        ? Math.round(top3.reduce((s, t) => s + t.score, 0) / top3.length)
        : 40;
      const overallSignal =
        compositeScore >= 75 ? "STRONG" :
        compositeScore >= 55 ? "MODERATE" :
        compositeScore >= 35 ? "WEAK" : "AVOID";

      const newTokens =
        newTokensData.status === "fulfilled"
          ? (newTokensData.value as Array<Record<string, unknown>>).slice(0, 5)
          : [];

      return {
        timestamp: new Date().toISOString(),
        regime,
        solPrice: { usd: solPrice, change24h: solChange },
        overallSignal,
        compositeScore,
        top3Opportunities: top3,
        newLaunches: newTokens.map((t) => ({
          symbol: t.symbol,
          mint: t.address ?? t.mint,
          age: t.createdAt ?? "recent",
        })),
        scanCount: trending.length,
        note:
          `Regime: ${regime} | Score: ${compositeScore}/100 | ` +
          `Signal: ${overallSignal} | Scanned: ${trending.length} tokens`,
      };
    },
  ],

  // ── market_regime ─────────────────────────────────────────────────────────
  [
    {
      name: "market_regime",
      description:
        "Detect current Solana market regime: BULL / BEAR / CRAB / PUMP / CRASH. " +
        "Uses SOL + BTC price action, volume, and volatility indicators. " +
        "Premium: $0.0003 per call.",
      inputSchema: { type: "object", properties: {} },
      category: "market",
      cost: REGIME_COST,
    },
    async (_args) => {
      const [solData, cryptoData] = await Promise.allSettled([
        coingeckoPrice("solana"),
        coingeckoPrice("bitcoin,ethereum"),
      ]);

      const sol = solData.status === "fulfilled"
        ? (solData.value as Record<string, Record<string, number>>)?.solana
        : null;
      const btc = cryptoData.status === "fulfilled"
        ? (cryptoData.value as Record<string, Record<string, number>>)?.bitcoin
        : null;
      const eth = cryptoData.status === "fulfilled"
        ? (cryptoData.value as Record<string, Record<string, number>>)?.ethereum
        : null;

      const solChange = sol?.usd_24h_change ?? 0;
      const btcChange = btc?.usd_24h_change ?? 0;
      const ethChange = eth?.usd_24h_change ?? 0;
      const avgChange = (solChange + btcChange + ethChange) / 3;

      let regime: string;
      let confidence: string;
      const signals: string[] = [];

      if (solChange > 15) {
        regime = "PUMP";
        confidence = "HIGH";
        signals.push(`SOL ripping +${solChange.toFixed(1)}%`);
      } else if (avgChange > 5) {
        regime = "BULL";
        confidence = btcChange > 0 && ethChange > 0 ? "HIGH" : "MEDIUM";
        signals.push(`Broad rally: BTC ${btcChange.toFixed(1)}%, ETH ${ethChange.toFixed(1)}%`);
      } else if (solChange < -15 || avgChange < -8) {
        regime = "CRASH";
        confidence = "HIGH";
        signals.push(`Broad selloff: SOL ${solChange.toFixed(1)}%`);
      } else if (avgChange < -3) {
        regime = "BEAR";
        confidence = "MEDIUM";
        signals.push(`Downtrend: avg ${avgChange.toFixed(1)}%`);
      } else {
        regime = "CRAB";
        confidence = Math.abs(avgChange) < 1 ? "HIGH" : "MEDIUM";
        signals.push(`Consolidation: avg ${avgChange.toFixed(1)}%`);
      }

      const strategies: Record<string, string> = {
        PUMP: "Take profits, wait for pullback, avoid chasing. High volatility.",
        BULL: "Accumulate quality, ride momentum, widen stops.",
        CRAB: "Range trade, focus on relative strength plays, tight stops.",
        BEAR: "Reduce exposure, favour stables, short opportunities only for experienced.",
        CRASH: "Hold stables, wait for capitulation candle, no new positions.",
      };

      return {
        regime,
        confidence,
        signals,
        prices: {
          sol: { usd: sol?.usd ?? null, change24h: solChange },
          btc: { usd: btc?.usd ?? null, change24h: btcChange },
          eth: { usd: eth?.usd ?? null, change24h: ethChange },
        },
        strategy: strategies[regime],
        timestamp: new Date().toISOString(),
      };
    },
  ],

  // ── smart_money_flow ──────────────────────────────────────────────────────
  [
    {
      name: "smart_money_flow",
      description:
        "Track 'smart money' flow across multiple Solana wallets simultaneously. " +
        "Returns what each wallet holds, their PnL, and whether flow is bullish or bearish. " +
        "Up to 5 wallets in one call. Premium: $0.001 per call.",
      inputSchema: {
        type: "object",
        properties: {
          wallets: {
            type: "array",
            items: { type: "string" },
            description: "Solana wallet addresses to track (max 5)",
          },
        },
        required: ["wallets"],
      },
      category: "market",
      cost: SMART_MONEY_COST,
    },
    async (args) => {
      const wallets = ((args.wallets as string[]) ?? []).slice(0, 5);
      if (wallets.length === 0) throw new Error("Provide at least one wallet address");

      const results = await Promise.allSettled(
        wallets.map(async (wallet) => {
          const [pnl, tokens] = await Promise.allSettled([
            solanaTracker(`/pnl/${wallet}`) as Promise<Record<string, unknown>>,
            heliusRPC("getTokenAccountsByOwner", [
              wallet,
              { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
              { encoding: "jsonParsed" },
            ]) as Promise<{ value: unknown[] }>,
          ]);

          return {
            wallet: wallet.slice(0, 8) + "…",
            fullAddress: wallet,
            pnl: pnl.status === "fulfilled" ? pnl.value : null,
            tokenCount:
              tokens.status === "fulfilled" ? tokens.value?.value?.length ?? 0 : 0,
          };
        }),
      );

      const walletData = results.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : { wallet: wallets[i].slice(0, 8) + "…", error: (r.reason as Error)?.message },
      );

      // Determine overall flow direction from PnL data
      const successfulPnls = walletData
        .filter((w): w is { wallet: string; fullAddress: string; pnl: Record<string, unknown>; tokenCount: number } =>
          !("error" in w) && w.pnl !== null,
        )
        .map((w) => Number((w.pnl as Record<string, unknown>).realizedPnlUSD ?? 0));
      const avgPnl =
        successfulPnls.length > 0
          ? successfulPnls.reduce((a, b) => a + b, 0) / successfulPnls.length
          : 0;
      const flowDirection = avgPnl > 0 ? "BULLISH" : avgPnl < 0 ? "BEARISH" : "NEUTRAL";

      return {
        flowDirection,
        averageRealizedPnl: avgPnl.toFixed(2),
        wallets: walletData,
        timestamp: new Date().toISOString(),
      };
    },
  ],

  // ── compute_unit_optimizer ────────────────────────────────────────────────
  [
    {
      name: "compute_unit_optimizer",
      description:
        "Calculate compute unit usage and fee estimates for SPL Token vs P-Token " +
        "for any transaction profile. Shows exactly how much you save by using p-token " +
        "on Solana Clawd x402 payments.",
      inputSchema: {
        type: "object",
        properties: {
          transferCheckedCount: {
            type: "number",
            description: "Number of TransferChecked instructions in the tx",
          },
          approveCount: { type: "number", description: "Number of Approve instructions" },
          mintToCount: { type: "number", description: "Number of MintTo instructions" },
          microLamportsPerCu: {
            type: "number",
            description: "Priority fee per CU in microLamports (default 5000)",
          },
          txCount: {
            type: "number",
            description: "Total number of transactions to estimate (default 1)",
          },
        },
      },
      category: "market",
    },
    async (args) => {
      const tcCount = Number(args.transferCheckedCount ?? 1);
      const approveCount = Number(args.approveCount ?? 0);
      const mintToCount = Number(args.mintToCount ?? 0);
      const fee = Number(args.microLamportsPerCu ?? 5_000);
      const txCount = Number(args.txCount ?? 1);

      const splCu =
        tcCount * CU.spl.transferChecked +
        approveCount * CU.spl.approve +
        mintToCount * CU.spl.mintTo;

      const pCu =
        tcCount * CU.pToken.transferChecked +
        approveCount * CU.pToken.approve +
        mintToCount * CU.pToken.mintTo;

      const cuSaved = splCu - pCu;
      const pctSaved = splCu > 0 ? ((cuSaved / splCu) * 100).toFixed(1) : "0";

      // Fee in lamports: CU × microLamports/CU / 1e6
      const splFeeLamports = (splCu * fee) / 1e6;
      const pFeeLamports = (pCu * fee) / 1e6;
      const savedLamports = splFeeLamports - pFeeLamports;

      const SOL_USD = 170; // approximate
      const splFeeSOL = (splFeeLamports * txCount) / 1e9;
      const pFeeSOL = (pFeeLamports * txCount) / 1e9;
      const savedSOL = (savedLamports * txCount) / 1e9;
      const savedUSD = savedSOL * SOL_USD;

      return {
        txProfile: { transferCheckedCount: tcCount, approveCount, mintToCount, microLamportsPerCu: fee, txCount },
        perTx: {
          splCu, pTokenCu: pCu, cuSaved, savingsPercent: `${pctSaved}%`,
          splFeeLamports: splFeeLamports.toFixed(0),
          pTokenFeeLamports: pFeeLamports.toFixed(0),
          savedLamports: savedLamports.toFixed(0),
        },
        forAllTx: {
          splFeeSOL: splFeeSOL.toFixed(8),
          pTokenFeeSOL: pFeeSOL.toFixed(8),
          savedSOL: savedSOL.toFixed(8),
          savedUSD: `$${savedUSD.toFixed(6)}`,
        },
        computeBudget: {
          recommended: `${Math.max(pCu + 2000, 12000).toLocaleString()} CU`,
          vs_default: "200,000 CU (Solana default — 94% wasted with p-token)",
        },
        pTokenProgram: "ptok6rngomXrDbWf5v5Mkmu5CEbB51hzSCPDoj9DrvF",
        ref: "https://solana.com/upgrades/p-token",
      };
    },
  ],

  // ── token_heat_map ────────────────────────────────────────────────────────
  [
    {
      name: "token_heat_map",
      description:
        "Generate a text heat map of Solana market momentum: tokens bucketed by " +
        "24h change into HOT / WARM / COOL / COLD / CRASHED. Quick visual of market breadth.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Tokens to scan (default 30)" },
        },
      },
      category: "market",
    },
    async (args) => {
      const limit = Math.min(Number(args.limit ?? 30), 50);
      const data = (await solanaTracker(`/tokens/trending?limit=${limit}`)) as Array<
        Record<string, unknown>
      >;

      const buckets = { HOT: [] as string[], WARM: [] as string[], COOL: [] as string[], COLD: [] as string[], CRASHED: [] as string[] };

      for (const t of data) {
        const change = Number(t.priceChange24h ?? t.change24h ?? 0);
        const sym = String(t.symbol ?? "??");
        const tag = `${sym}(${change > 0 ? "+" : ""}${change.toFixed(0)}%)`;
        if (change > 20) buckets.HOT.push(tag);
        else if (change > 5) buckets.WARM.push(tag);
        else if (change > -5) buckets.COOL.push(tag);
        else if (change > -20) buckets.COLD.push(tag);
        else buckets.CRASHED.push(tag);
      }

      const breadth = (buckets.HOT.length + buckets.WARM.length) / limit * 100;
      const breadthLabel =
        breadth > 60 ? "BROAD BULL" :
        breadth > 40 ? "MIXED" :
        breadth > 20 ? "BEARISH" : "BROAD BEAR";

      return [
        `Solana Token Heat Map (${data.length} tokens)`,
        `Market breadth: ${breadthLabel} (${breadth.toFixed(0)}% positive)`,
        ``,
        `🔥 HOT (>+20%): ${buckets.HOT.length ? buckets.HOT.join(" ") : "none"}`,
        `🟡 WARM (+5%→+20%): ${buckets.WARM.length ? buckets.WARM.join(" ") : "none"}`,
        `⚪ COOL (-5%→+5%): ${buckets.COOL.length ? buckets.COOL.join(" ") : "none"}`,
        `🔵 COLD (-20%→-5%): ${buckets.COLD.length ? buckets.COLD.join(" ") : "none"}`,
        `🔴 CRASHED (<-20%): ${buckets.CRASHED.length ? buckets.CRASHED.join(" ") : "none"}`,
      ].join("\n");
    },
  ],
];
