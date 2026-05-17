/**
 * Sentiment Engine — tracks buy/sell pressure via EMA and adjusts DBC fees.
 *
 * The engine computes a signed sentiment score in [-1e9, +1e9].
 * Bullish sentiment → lower fees (to incentivise more buying).
 * Bearish sentiment → higher fees (to slow down selling pressure).
 *
 * Fee adjustment is symmetric and bounded by sentimentFeeRangeBps.
 */

import type { Connection, PublicKey } from "@solana/web3.js";
import type { SentimentState, AdaptiveCurveConfig } from "../types/index.js";
import {
  updateEma,
  computeSentimentScore,
} from "../utils/math.js";
import {
  SENTIMENT_SCALE,
  SENTIMENT_EMA_DECAY,
  MIN_SENTIMENT_UPDATE_INTERVAL,
} from "../constants.js";
import { deriveSentimentStatePda } from "../utils/pda.js";

export interface SentimentUpdate {
  recentBuyVolume: bigint;
  recentSellVolume: bigint;
  windowSlots: number;
}

export interface FeeAdjustment {
  baseFeeNumerator: bigint;
  adjustedFeeNumerator: bigint;
  sentimentScore: bigint;
  adjustmentBps: number;
}

/**
 * Apply sentiment score to compute an adjusted fee numerator.
 *
 * Logic:
 *   - score > 0 (bullish): reduce fee by up to sentimentFeeRangeBps
 *   - score < 0 (bearish): increase fee by up to sentimentFeeRangeBps
 *   - Linear interpolation within the range
 */
export function computeSentimentAdjustedFee(
  baseFeeNumerator: bigint,
  sentimentScore: bigint,
  sentimentFeeRangeBps: number,
  feeDenominator: bigint = 1_000_000_000n
): FeeAdjustment {
  // Normalise score to [-10000, 10000] bps range
  const scoreBps = Number((sentimentScore * 10_000n) / SENTIMENT_SCALE);
  // sentimentFeeRangeBps is the max adjustment
  const adjustmentBps = Math.round(
    (-scoreBps / 10_000) * sentimentFeeRangeBps
  );

  // Convert bps adjustment to fee_numerator delta
  const delta = (baseFeeNumerator * BigInt(Math.abs(adjustmentBps))) / 10_000n;
  const adjustedFeeNumerator =
    adjustmentBps >= 0
      ? baseFeeNumerator + delta
      : baseFeeNumerator - delta;

  // Clamp to [MIN_FEE, MAX_FEE] in fee_numerator units
  const minFee = feeDenominator / 400n; // 0.25%
  const maxFee = (feeDenominator * 99n) / 100n; // 99%
  const clampedFee =
    adjustedFeeNumerator < minFee
      ? minFee
      : adjustedFeeNumerator > maxFee
      ? maxFee
      : adjustedFeeNumerator;

  return {
    baseFeeNumerator,
    adjustedFeeNumerator: clampedFee,
    sentimentScore,
    adjustmentBps,
  };
}

/**
 * Update EMA-based sentiment state with new buy/sell volumes.
 * Returns the updated state — caller should pass this to update_curve_sentiment.
 */
export function updateSentimentState(
  current: SentimentState,
  update: SentimentUpdate,
  currentSlot: bigint
): {
  updatedState: SentimentState;
  feeAdjustment: FeeAdjustment;
  curveConfig: AdaptiveCurveConfig;
} {
  const slotsSinceLast = currentSlot - current.lastUpdateSlot;
  if (
    slotsSinceLast < BigInt(MIN_SENTIMENT_UPDATE_INTERVAL) &&
    slotsSinceLast < BigInt(current.updateIntervalSlots)
  ) {
    throw new Error("SentimentUpdateTooSoon");
  }

  const newEmaBuy = updateEma(
    current.emaBuyVolume,
    update.recentBuyVolume,
    SENTIMENT_EMA_DECAY
  );
  const newEmaSell = updateEma(
    current.emaSellVolume,
    update.recentSellVolume,
    SENTIMENT_EMA_DECAY
  );

  const newScore = computeSentimentScore(newEmaBuy, newEmaSell, SENTIMENT_SCALE);

  const feeAdjustment = computeSentimentAdjustedFee(
    1_000_000_000n, // placeholder — real base fee from config
    newScore,
    500 // placeholder sentimentFeeRangeBps
  );

  const updatedState: SentimentState = {
    ...current,
    lastUpdateSlot: currentSlot,
    sentimentScoreSigned: newScore,
    emaBuyVolume: newEmaBuy,
    emaSellVolume: newEmaSell,
    currentFeeAdjustmentBps: feeAdjustment.adjustmentBps,
  };

  const curveConfig: AdaptiveCurveConfig = {
    sqrtStartPrice: 0n, // filled in by caller
    migrationSqrtPrice: 0n,
    migrationQuoteThreshold: 0n,
    curve: [],
    baseFeeNumerator: feeAdjustment.adjustedFeeNumerator,
    sentimentFeeRangeBps: 500,
    sentimentUpdateIntervalSlots: current.updateIntervalSlots,
  };

  return { updatedState, feeAdjustment, curveConfig };
}

/**
 * Derive the sentiment state PDA and fetch on-chain data.
 */
export async function fetchSentimentState(
  connection: Connection,
  dbcPool: PublicKey
): Promise<SentimentState | null> {
  const [sentimentPda] = deriveSentimentStatePda(dbcPool);
  const info = await connection.getAccountInfo(sentimentPda);
  if (!info) return null;

  // Parse using Anchor account discriminator offset (8 bytes)
  const data = info.data.slice(8);
  let offset = 0;

  const readPubkey = () => {
    const pk = new (require("@solana/web3.js").PublicKey)(
      data.slice(offset, offset + 32)
    );
    offset += 32;
    return pk as PublicKey;
  };
  const readU64 = () => {
    const val = data.readBigUInt64LE(offset);
    offset += 8;
    return val;
  };
  const readI64 = () => {
    const val = data.readBigInt64LE(offset);
    offset += 8;
    return val;
  };
  const readU128 = () => {
    const lo = data.readBigUInt64LE(offset);
    const hi = data.readBigUInt64LE(offset + 8);
    offset += 16;
    return lo + (hi << 64n);
  };
  const readU32 = () => {
    const val = data.readUInt32LE(offset);
    offset += 4;
    return val;
  };
  const readI16 = () => {
    const val = data.readInt16LE(offset);
    offset += 2;
    return val;
  };

  return {
    dbcPool: readPubkey(),
    lastUpdateSlot: readU64(),
    sentimentScoreSigned: readI64(),
    emaBuyVolume: readU128(),
    emaSellVolume: readU128(),
    currentFeeAdjustmentBps: readI16(),
    updateIntervalSlots: readU32(),
  };
}

/** Human-readable sentiment label */
export function sentimentLabel(score: bigint): string {
  const s = Number(score) / Number(SENTIMENT_SCALE);
  if (s > 0.7) return "extremely bullish";
  if (s > 0.4) return "bullish";
  if (s > 0.15) return "slightly bullish";
  if (s > -0.15) return "neutral";
  if (s > -0.4) return "slightly bearish";
  if (s > -0.7) return "bearish";
  return "extremely bearish";
}
