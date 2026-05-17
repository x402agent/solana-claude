export { AdaptiveCurve, designDefaultAgentCurve } from "./adaptive-curve.js";
export type { EnrichedSwapQuote, AdaptiveSwapParams } from "./adaptive-curve.js";
export { buildRanges, quoteExactInBuy, quoteExactInSell } from "./curve-math.js";
export type { CurveRange } from "./curve-math.js";
export {
  computeSentimentAdjustedFee,
  updateSentimentState,
  fetchSentimentState,
  sentimentLabel,
} from "./sentiment-engine.js";
export type { SentimentUpdate, FeeAdjustment } from "./sentiment-engine.js";
