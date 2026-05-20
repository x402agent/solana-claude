import { estimateAmmSlippage, estimateBookSlippage, priceFromSlippage } from "../aggregator/slippage.js";
import type {
  BuiltOrderTx,
  FundingRate,
  Market,
  MarkPrice,
  OrderBook,
  OrderBuildRequest,
  Position,
  QuoteRequest,
  VenueName,
  VenueQuote,
} from "../types.js";
import { rawSideToSide, type ImperialTransport, type RawDepth } from "./transport.js";
import type { VenueAdapter, VenueDefaults } from "./adapter.js";

const UNDERWRITER: Record<VenueName, number> = {
  phoenix: 0,
  flash: 1,
  jupiter: 2,
  gmtrade: 3,
};

function assetFromSymbol(symbol: string): string {
  return symbol.replace(/[-_/]?PERP$/i, "").toUpperCase();
}

function normalizeVenue(value: string | undefined, fallback: VenueName): VenueName {
  const lower = (value ?? fallback).toLowerCase();
  if (lower === "phoenix" || lower === "flash" || lower === "jupiter" || lower === "gmtrade") return lower;
  return fallback;
}

function rawDepthToBook(raw: RawDepth, venue: VenueName): OrderBook {
  return {
    symbol: raw.symbol,
    venue,
    bids: (raw.bids ?? []).map(([price, sizeUsd]) => ({ price, sizeUsd })),
    asks: (raw.asks ?? []).map(([price, sizeUsd]) => ({ price, sizeUsd })),
    timestamp: Date.now(),
  };
}

export class BaseImperialVenueAdapter implements VenueAdapter {
  readonly name: VenueName;
  protected readonly defaults: VenueDefaults;
  protected readonly transport: ImperialTransport;

  constructor(defaults: VenueDefaults, transport: ImperialTransport) {
    this.name = defaults.venue;
    this.defaults = defaults;
    this.transport = transport;
  }

  async listMarkets(): Promise<Market[]> {
    try {
      const raw = await this.transport.getVenueMarkets(this.name);
      if (Array.isArray(raw)) {
        return raw.map((entry) => {
          const obj = entry as Record<string, unknown>;
          const symbol = String(obj.symbol ?? obj.market ?? obj.name ?? "SOL-PERP");
          return this.market(symbol);
        });
      }
    } catch {
      // Fall back to static markets.
    }
    return this.defaults.markets.map((symbol) => this.market(symbol));
  }

  async getMarkPrice(symbol: string): Promise<MarkPrice> {
    try {
      const marks = await this.transport.getMarkPrices();
      const found = marks.find((entry) =>
        entry.symbol === symbol && normalizeVenue(entry.venue, this.name) === this.name
      ) ?? marks.find((entry) => entry.symbol === symbol);
      if (found) {
        return {
          symbol,
          venue: this.name,
          price: Number(found.price ?? found.markPrice ?? 0),
          source: found.source ?? "imperial",
          timestamp: Number(found.fetchedAtUnixMs ?? found.timestamp ?? Date.now()),
        };
      }
    } catch {
      // Fall through to deterministic defaults.
    }
    return {
      symbol,
      venue: this.name,
      price: this.defaultMark(symbol),
      source: "fallback",
      timestamp: Date.now(),
    };
  }

  async getFundingRate(symbol: string): Promise<FundingRate> {
    try {
      const rates = await this.transport.getFundingRates();
      const found = rates.find((entry) =>
        entry.symbol === symbol && normalizeVenue(entry.venue, this.name) === this.name
      ) ?? rates.find((entry) => entry.symbol === symbol);
      if (found) {
        return {
          symbol,
          venue: this.name,
          longRateHourlyPct: Number(found.longFundingRatePerHourPercent ?? found.longBorrowRatePerHourPercent ?? 0),
          shortRateHourlyPct: Number(found.shortFundingRatePerHourPercent ?? found.shortBorrowRatePerHourPercent ?? 0),
          source: found.source ?? "imperial",
          timestamp: Date.now(),
        };
      }
    } catch {
      // Fall through to neutral funding.
    }
    return {
      symbol,
      venue: this.name,
      longRateHourlyPct: 0,
      shortRateHourlyPct: 0,
      source: "fallback",
      timestamp: Date.now(),
    };
  }

  async getOrderBook(_symbol: string): Promise<OrderBook | null> {
    return null;
  }

  async quote(request: QuoteRequest): Promise<VenueQuote> {
    const [mark, funding, book] = await Promise.all([
      this.getMarkPrice(request.symbol),
      this.getFundingRate(request.symbol),
      this.getOrderBook(request.symbol),
    ]);

    const warnings: string[] = [];
    let slippageBps: number;
    let expectedPrice: number;
    let liquidityUsd = this.defaults.defaultLiquidityUsd;

    if (book) {
      const estimate = estimateBookSlippage(book, request.side, request.notionalUsd, mark.price);
      slippageBps = estimate.slippageBps;
      expectedPrice = estimate.averagePrice;
      liquidityUsd = estimate.liquidityUsd;
      if (estimate.unfilledUsd > 0) {
        warnings.push(`book lacks ${estimate.unfilledUsd.toFixed(2)} USD of requested notional`);
      }
    } else {
      slippageBps = estimateAmmSlippage(
        request.notionalUsd,
        this.defaults.defaultLiquidityUsd,
        this.defaults.impactCoefficientBps,
      );
      expectedPrice = priceFromSlippage(mark.price, request.side, slippageBps);
    }

    const fundingRateHourlyPct =
      request.side === "long" ? funding.longRateHourlyPct : funding.shortRateHourlyPct;
    const estimatedFeeUsd = request.notionalUsd * (this.defaults.feeBps / 10_000);
    const confidence = Math.max(0.1, Math.min(1, liquidityUsd / Math.max(request.notionalUsd * 20, 1)));

    return {
      venue: this.name,
      symbol: request.symbol,
      side: request.side,
      notionalUsd: request.notionalUsd,
      expectedPrice,
      markPrice: mark.price,
      estimatedFeeUsd,
      estimatedSlippageBps: slippageBps,
      fundingRateHourlyPct,
      liquidityUsd,
      openInterestUsd: this.defaults.defaultOpenInterestUsd,
      confidence,
      warnings,
    };
  }

  async buildOrder(request: OrderBuildRequest): Promise<BuiltOrderTx> {
    const quote = await this.quote(request);
    const payload = {
      wallet: request.wallet,
      profileIndex: request.profileIndex ?? 0,
      symbol: request.symbol,
      asset: assetFromSymbol(request.symbol),
      side: request.side === "long" ? 0 : 1,
      notionalUsd: request.notionalUsd,
      leverage: request.leverage ?? 1,
      venue: this.name,
      underwriter: UNDERWRITER[this.name],
      orderKind: request.orderKind ?? "market",
      limitPrice: request.limitPrice,
      reduceOnly: request.reduceOnly ?? false,
      clientOrderId: request.clientOrderId,
    };

    return {
      route: {
        id: `direct-${this.name}-${Date.now()}`,
        mode: "single",
        symbol: request.symbol,
        side: request.side,
        notionalUsd: request.notionalUsd,
        legs: [{ venue: this.name, notionalUsd: request.notionalUsd, quote }],
        score: 0,
        estimatedPrice: quote.expectedPrice,
        estimatedFeeUsd: quote.estimatedFeeUsd,
        estimatedSlippageBps: quote.estimatedSlippageBps,
        estimatedFundingHourlyPct: quote.fundingRateHourlyPct,
        warnings: quote.warnings,
        createdAt: new Date().toISOString(),
      },
      transaction: null,
      payload,
      paper: true,
    };
  }

  async submitOrder(request: OrderBuildRequest): Promise<{ signature: string | null; orderPda: string | null; success: boolean; error?: string | null }> {
    const built = await this.buildOrder(request);
    const response = await this.transport.placeOrder(built.payload);
    return {
      signature: response.signature ?? null,
      orderPda: response.orderPda ?? null,
      success: response.success !== false,
      error: response.error ?? null,
    };
  }

  async getPositions(wallet: string): Promise<Position[]> {
    const positions = await this.transport.getPositions(wallet).catch(() => []);
    return positions
      .filter((position) => normalizeVenue(position.venue, this.name) === this.name)
      .map((position) => ({
        wallet: position.wallet ?? wallet,
        profileIndex: Number(position.profileIndex ?? 0),
        symbol: position.symbol,
        venue: this.name,
        side: rawSideToSide(position.side),
        sizeUsd: Number(position.sizeUsd ?? position.notionalUsd ?? 0),
        entryPrice: Number(position.entryPrice ?? 0),
        markPrice: Number(position.markPrice ?? position.entryPrice ?? 0),
        unrealizedPnlUsd: Number(position.unrealizedPnlUsd ?? 0),
        collateralUsd: Number(position.collateralUsd ?? 0),
        leverage: Number(position.leverage ?? 1),
        liquidationPrice: position.liquidationPrice == null ? null : Number(position.liquidationPrice),
        fundingAccruedUsd: Number(position.fundingAccruedUsd ?? 0),
      }));
  }

  protected market(symbol: string): Market {
    return {
      symbol,
      baseAsset: assetFromSymbol(symbol),
      quoteAsset: "USD",
      venue: this.name,
      active: true,
      maxLeverage: this.defaults.maxLeverage,
      minNotionalUsd: 1,
    };
  }

  protected defaultMark(symbol: string): number {
    const asset = assetFromSymbol(symbol);
    if (asset === "BTC") return 100_000;
    if (asset === "ETH") return 3_500;
    if (asset === "SOL") return 150;
    return 1;
  }
}

export class PhoenixVenueAdapter extends BaseImperialVenueAdapter {
  override async getOrderBook(symbol: string): Promise<OrderBook | null> {
    try {
      const raw = await this.transport.getPhoenixDepth(symbol);
      const depth = Array.isArray(raw) ? raw.find((entry) => entry.symbol === symbol) : raw;
      return depth ? rawDepthToBook(depth, this.name) : null;
    } catch {
      return null;
    }
  }
}
