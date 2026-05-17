/**
 * Adaptive Bonding Curve Client
 *
 * Wraps the base DBC program with an intelligent adaptation layer:
 *   1. Reads sentiment state from clawd_protocol PDA
 *   2. Adjusts effective fee before quoting
 *   3. Builds update_curve_sentiment instructions when interval has elapsed
 *   4. Exposes enriched swap quotes with sentiment context
 */

import type { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import type {
  AdaptiveCurveConfig,
  SwapQuote,
  SentimentState,
  SdkInstructions,
} from "../types/index.js";
import type { CurveRange } from "./curve-math.js";
import {
  buildRanges,
  quoteExactInBuy,
  quoteExactInSell,
} from "./curve-math.js";
import {
  computeSentimentAdjustedFee,
  fetchSentimentState,
  sentimentLabel,
} from "./sentiment-engine.js";
import { deriveSentimentStatePda } from "../utils/pda.js";

export interface EnrichedSwapQuote extends SwapQuote {
  effectiveFeeNumerator: bigint;
  sentimentScore: bigint;
  sentimentLabel: string;
  isAdaptiveActive: boolean;
}

export interface AdaptiveSwapParams {
  sqrtPrice: bigint;
  quoteReserve: bigint;
  baseReserve: bigint;
  buyBaseForQuote: boolean;
  amountIn: bigint;
}

export class AdaptiveCurve {
  private ranges: CurveRange[];

  constructor(
    private readonly config: AdaptiveCurveConfig,
    private readonly dbcPool: PublicKey
  ) {
    this.ranges = buildRanges(config.sqrtStartPrice, config.curve);
  }

  /** Quote a swap with sentiment-adjusted fee */
  async quoteSwap(
    connection: Connection,
    params: AdaptiveSwapParams
  ): Promise<EnrichedSwapQuote> {
    const sentiment = await fetchSentimentState(connection, this.dbcPool);

    let feeNumerator = this.config.baseFeeNumerator;
    let sentimentScore = 0n;
    let label = "neutral";
    let isAdaptiveActive = false;

    if (sentiment) {
      sentimentScore = sentiment.sentimentScoreSigned;
      label = sentimentLabel(sentimentScore);
      const adj = computeSentimentAdjustedFee(
        feeNumerator,
        sentimentScore,
        this.config.sentimentFeeRangeBps
      );
      feeNumerator = adj.adjustedFeeNumerator;
      isAdaptiveActive = true;
    }

    const baseQuote = params.buyBaseForQuote
      ? quoteExactInSell(
          params.sqrtPrice,
          this.ranges,
          params.amountIn,
          feeNumerator
        )
      : quoteExactInBuy(
          params.sqrtPrice,
          this.ranges,
          params.amountIn,
          feeNumerator
        );

    return {
      ...baseQuote,
      effectiveFeeNumerator: feeNumerator,
      sentimentScore,
      sentimentLabel: label,
      isAdaptiveActive,
    };
  }

  /** Quote without network call (offline, uses base fee only) */
  quoteOffline(params: AdaptiveSwapParams): SwapQuote {
    return params.buyBaseForQuote
      ? quoteExactInSell(
          params.sqrtPrice,
          this.ranges,
          params.amountIn,
          this.config.baseFeeNumerator
        )
      : quoteExactInBuy(
          params.sqrtPrice,
          this.ranges,
          params.amountIn,
          this.config.baseFeeNumerator
        );
  }

  /**
   * Build an update_curve_sentiment instruction if the interval has elapsed.
   * Returns null if too soon to update.
   */
  buildSentimentUpdateInstruction(
    connection: Connection,
    caller: PublicKey,
    recentBuyVolume: bigint,
    recentSellVolume: bigint,
    windowSlots: number,
    currentSlot: bigint,
    lastUpdateSlot: bigint
  ): SdkInstructions | null {
    const slotsSince = currentSlot - lastUpdateSlot;
    if (slotsSince < BigInt(this.config.sentimentUpdateIntervalSlots)) {
      return null;
    }

    const [sentimentPda] = deriveSentimentStatePda(this.dbcPool);

    // Instruction data layout: discriminator (8) + buy_vol (8) + sell_vol (8) + window (4)
    const data = Buffer.alloc(8 + 8 + 8 + 4);
    // discriminator for update_curve_sentiment
    Buffer.from([15, 0, 0, 0, 0, 0, 0, 0]).copy(data, 0);
    data.writeBigUInt64LE(recentBuyVolume, 8);
    data.writeBigUInt64LE(recentSellVolume, 16);
    data.writeUInt32LE(windowSlots, 24);

    const ix: TransactionInstruction = {
      programId: new (require("@solana/web3.js").PublicKey)(
        "CLAWDpRoToCoLv1pRoGRaM111111111111111111111"
      ),
      keys: [
        { pubkey: sentimentPda, isSigner: false, isWritable: true },
        { pubkey: this.dbcPool, isSigner: false, isWritable: false },
        { pubkey: caller, isSigner: true, isWritable: false },
      ],
      data,
    };

    return { instructions: [ix], computeUnits: 50_000 };
  }

  /** Rebuild curve ranges (call after config update) */
  refreshRanges(): void {
    this.ranges = buildRanges(this.config.sqrtStartPrice, this.config.curve);
  }

  get currentRanges(): CurveRange[] {
    return [...this.ranges];
  }
}

/**
 * Design a default 10-range bonding curve for agent token launches.
 *
 * Price increases exponentially from start → migration.
 * Liquidity is front-loaded (more liquidity at lower prices for early stability).
 */
export function designDefaultAgentCurve(opts: {
  startPrice: number;
  migrationPrice: number;
  numRanges?: number;
  frontLoadFactor?: number;
}): AdaptiveCurveConfig {
  const {
    startPrice,
    migrationPrice,
    numRanges = 10,
    frontLoadFactor = 2.0,
  } = opts;

  const { priceToSqrtPrice } = require("../utils/math.js");

  const sqrtStart = priceToSqrtPrice(startPrice) as bigint;
  const sqrtMigration = priceToSqrtPrice(migrationPrice) as bigint;

  // Geometric spacing between start and migration sqrt prices
  const ratio = Number(sqrtMigration) / Number(sqrtStart);
  const step = Math.pow(ratio, 1 / numRanges);

  const curve = [];
  let sqrtPrice = sqrtStart;

  for (let i = 0; i < numRanges; i++) {
    sqrtPrice = BigInt(Math.floor(Number(sqrtStart) * Math.pow(step, i + 1)));

    // Front-loaded liquidity: first ranges get more
    const liquidityMultiplier =
      Math.pow(frontLoadFactor, (numRanges - i) / numRanges);
    const baseLiquidity = 1_000_000_000n; // 1e9 base unit
    const liquidity = BigInt(
      Math.floor(Number(baseLiquidity) * liquidityMultiplier)
    );

    curve.push({ sqrtPrice, liquidity });
  }

  return {
    sqrtStartPrice: sqrtStart,
    migrationSqrtPrice: sqrtMigration,
    migrationQuoteThreshold: 85_000_000_000n, // 85 SOL default
    curve,
    baseFeeNumerator: 25_000_000n, // 2.5% default
    sentimentFeeRangeBps: 150, // ±1.5% fee adjustment range
    sentimentUpdateIntervalSlots: 300, // ~2 minutes
  };
}
