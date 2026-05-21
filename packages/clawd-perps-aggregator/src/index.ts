/**
 * @openclawdsolana/clawd-perps-aggregator — Solana perps SOR + SDK + MCP.
 *
 * High-level entry: import the `PerpsAggregator` class and you have a fully
 * wired client for quotes, routing, building transactions, executing orders
 * (paper-first), realtime market data, and cross-venue position aggregation.
 *
 * The MCP server is a separate entry; see ./mcp/server.ts.
 */

export * from "./types.js";
export * from "./config.js";

export {
  PerpsAggregator,
  usdToFixed,
  fixedToUsd,
  summarisePool,
} from "./sdk/client.js";
export type { PerpsAggregatorOpts, PoolSummary } from "./sdk/client.js";

export { SmartRouter } from "./aggregator/router.js";
export { SplitRouter } from "./aggregator/splitRouter.js";
export type { SplitRouterOpts } from "./aggregator/splitRouter.js";
export { scoreQuotes, DEFAULT_WEIGHTS } from "./aggregator/scoring.js";
export type { ScoredQuote, ScoringWeights } from "./aggregator/scoring.js";
export { bookVwapSlippage, ammImpactSlippage } from "./aggregator/slippage.js";
export type { SlippageResult } from "./aggregator/slippage.js";
export {
  poolImpact,
  predictFundingPerHourPct,
  borrowRatePerHourPct,
  poolHealthScore,
  utilizationFor,
  capacityFor,
  oiSkew,
} from "./aggregator/ammMath.js";
export type { PoolState, PoolImpactInputs, PoolImpactResult } from "./aggregator/ammMath.js";

export { ImperialTransport } from "./venues/transport.js";
export type {
  RawFundingEntry,
  RawMarkEntry,
  RawDepth,
  RawRoute,
  RawPosition,
  RawOrderResponse,
} from "./venues/transport.js";
export type { VenueAdapter, QuoteContext } from "./venues/adapter.js";
export { BaseVenueAdapter } from "./venues/base.js";
export type { VenueDefaults } from "./venues/base.js";
export {
  PhoenixAdapter,
  FlashAdapter,
  JupiterAdapter,
  GMTradeAdapter,
  buildVenueAdapters,
} from "./venues/registry.js";
export {
  StaticPoolStateProvider,
  chainPoolStateProviders,
  syntheticPoolState,
  remainingCapacityUsd,
} from "./venues/poolState.js";
export type { PoolStateProvider, SyntheticPoolOpts } from "./venues/poolState.js";

export {
  MarketStream,
  createMarketStream,
} from "./realtime/marketStream.js";
export type { MarketStreamEvents, MarketCacheSnapshot } from "./realtime/marketStream.js";
export {
  fetchAggregatedPositions,
  computeLiquidationRisks,
} from "./realtime/positionAggregator.js";
export { scoreMarket, scoreSymbolAllVenues } from "./realtime/marketScore.js";
export type { Bias, MarketScore } from "./realtime/marketScore.js";

export {
  buildOrderTx,
  buildDepositTx,
  priceToOracle,
} from "./sdk/transactions.js";
export {
  signBase64Transaction,
  base64ToBytes,
  bytesToBase64,
  buildConnectMessage,
} from "./sdk/signing.js";
export type { Base64Tx, SignerLike } from "./sdk/signing.js";

export { startMcpServer } from "./mcp/server.js";
export { buildTools } from "./mcp/tools.js";
export type { McpTool } from "./mcp/tools.js";
