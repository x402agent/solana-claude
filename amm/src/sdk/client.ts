import { assertLiveEnabled, assertSafeNotional, loadConfig } from "../config.js";
import { SmartRouter } from "../aggregator/router.js";
import { createVenueAdapters } from "../venues/registry.js";
import type {
  AggregatorConfig,
  AggregatedPosition,
  BuiltOrderTx,
  ExecutedOrder,
  Market,
  MarketScore,
  OrderBuildRequest,
  Position,
  QuoteRequest,
  RoutePlan,
  SimulatedOrder,
  VenueName,
  VenueQuote,
} from "../types.js";
import type { VenueAdapter } from "../venues/adapter.js";
import type { PoolStateProvider } from "../venues/poolState.js";
import { summarisePool } from "../aggregator/ammMath.js";
import { aggregatePositions } from "../realtime/positionAggregator.js";
import { scoreMarketFromQuote } from "../realtime/marketScore.js";
import { orderPayloadFromRoute, paperBuiltOrder, simulateBuiltOrder } from "./transactions.js";

export class PerpsAmmClient {
  readonly config: AggregatorConfig;
  readonly adapters: VenueAdapter[];
  readonly router: SmartRouter;

  constructor(config: AggregatorConfig = loadConfig(), adapters = createVenueAdapters(config)) {
    this.config = config;
    this.adapters = adapters;
    this.router = new SmartRouter(config, adapters);
  }

  listVenues(): VenueName[] {
    return this.router.listVenues();
  }

  async listMarkets(): Promise<Market[]> {
    const nested = await Promise.all(this.adapters.map((adapter) => adapter.listMarkets().catch(() => [])));
    return nested.flat();
  }

  async funding(symbol: string) {
    const nested = await Promise.all(this.adapters.map((adapter) => adapter.getFundingRate(symbol).catch(() => null)));
    return nested.filter((rate) => rate !== null);
  }

  async marks(symbol: string) {
    const nested = await Promise.all(this.adapters.map((adapter) => adapter.getMarkPrice(symbol).catch(() => null)));
    return nested.filter((mark) => mark !== null);
  }

  async orderBook(symbol: string, venue: VenueName = "phoenix") {
    return this.router.getAdapter(venue).getOrderBook(symbol);
  }

  setPoolStateProvider(provider: PoolStateProvider | null): void {
    for (const adapter of this.adapters) adapter.setPoolStateProvider(provider);
  }

  async pools(symbol: string) {
    const states = await Promise.all(this.adapters.map(async (adapter) => {
      const pool = await adapter.getPoolState(symbol).catch(() => null);
      return pool ? summarisePool(adapter.name, symbol.toUpperCase(), pool) : null;
    }));
    return states.filter((state) => state !== null);
  }

  health() {
    return {
      paper: this.config.safety.paper,
      live: this.config.safety.live,
      maxNotionalUsd: this.config.safety.maxNotionalUsd,
      allowedSymbols: this.config.safety.allowedSymbols,
      allowedVenues: this.config.safety.allowedVenues,
      venues: this.listVenues(),
    };
  }

  async quote(request: QuoteRequest): Promise<VenueQuote[]> {
    assertSafeNotional(this.config, request.symbol, request.notionalUsd);
    return this.router.quoteAll(request);
  }

  async route(request: QuoteRequest): Promise<RoutePlan> {
    return this.router.route(request);
  }

  async routeSplit(request: QuoteRequest): Promise<RoutePlan> {
    return this.router.routeSplit(request);
  }

  async buildOrder(request: OrderBuildRequest): Promise<BuiltOrderTx> {
    const route = await this.router.route(request);
    if (this.config.safety.paper || !this.config.safety.live) {
      return paperBuiltOrder(route, request);
    }

    const first = route.legs[0];
    if (!first) throw new Error("Route has no legs");
    return this.router.getAdapter(first.venue).buildOrder(request);
  }

  async simulateOrder(request: OrderBuildRequest): Promise<SimulatedOrder> {
    const route = await this.router.route(request);
    return simulateBuiltOrder(route, request);
  }

  async executeOrder(request: OrderBuildRequest): Promise<ExecutedOrder> {
    const route = await this.router.route(request);
    if (this.config.safety.paper || !this.config.safety.live) {
      return {
        route,
        paper: true,
        signature: null,
        orderPda: null,
        status: "paper",
      };
    }

    assertLiveEnabled(this.config);
    const first = route.legs[0];
    if (!first) throw new Error("Route has no legs");
    const adapter = this.router.getAdapter(first.venue);
    const built = await adapter.buildOrder(request);
    const raw = await adapter.submitOrder(request).catch((error: unknown) => ({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      signature: null,
      orderPda: null,
    }));

    return {
      route: built.route,
      paper: false,
      signature: raw?.signature ?? null,
      orderPda: raw?.orderPda ?? null,
      status: raw?.success === false ? "rejected" : "submitted",
      error: raw?.error ?? undefined,
    };
  }

  async positions(wallet: string): Promise<Position[]> {
    const nested = await Promise.all(this.adapters.map((adapter) => adapter.getPositions(wallet).catch(() => [])));
    return nested.flat();
  }

  async aggregatedPositions(wallet: string): Promise<AggregatedPosition[]> {
    return aggregatePositions(await this.positions(wallet));
  }

  async liquidationRisks(wallet: string): Promise<AggregatedPosition[]> {
    return (await this.aggregatedPositions(wallet))
      .filter((position) => position.liquidationRisk !== "low")
      .sort((a, b) => b.effectiveLeverage - a.effectiveLeverage);
  }

  async scoreMarket(symbol: string, side: "long" | "short" = "long"): Promise<MarketScore[]> {
    const quotes = await this.quote({ symbol, side, notionalUsd: 1000 });
    return quotes.map((quote) => scoreMarketFromQuote(quote, side)).sort((a, b) => b.score - a.score);
  }
}

export function createPerpsAmmClient(config: AggregatorConfig = loadConfig()): PerpsAmmClient {
  return new PerpsAmmClient(config);
}
