/**
 * BaseVenueAdapter — shared Imperial-backed behavior.
 *
 * Concrete subclasses override defaults (fees, max leverage, depth fetcher,
 * impact coefficients) but inherit the cross-venue funding/mark/positions
 * plumbing.
 */

import type { ImperialTransport } from "./transport.js";
import type { VenueAdapter, QuoteContext } from "./adapter.js";
import type {
  FundingRate,
  MarkPrice,
  MarketMeta,
  MarketSnapshot,
  OrderbookSnapshot,
  Side,
  VenueId,
  VenueQuote,
} from "../types.js";
import {
  ORDER_TYPE_CODE,
  SIDE_CODE,
  ACTION_CODE,
  UNDERWRITER_CODE,
  VENUE_FROM_UNDERWRITER,
} from "../types.js";
import { ammImpactSlippage, bookVwapSlippage } from "../aggregator/slippage.js";
import { poolImpact } from "../aggregator/ammMath.js";
import { syntheticPoolState, type PoolStateProvider } from "./poolState.js";

export interface VenueDefaults {
  makerFeeBps: number;
  takerFeeBps: number;
  maxLeverage: number;
  minOrderUsd: number;
  /** Used by the AMM slippage model when no book is available. */
  impactCoeff: number;
  /** Fallback assumed pool/liquidity if the venue doesn't advertise it. */
  fallbackLiquidityUsd: number;
  markSource: string;
}

export abstract class BaseVenueAdapter implements VenueAdapter {
  abstract readonly id: VenueId;
  abstract readonly label: string;
  abstract readonly defaults: VenueDefaults;

  poolProvider: PoolStateProvider | null = null;

  constructor(protected readonly transport: ImperialTransport) {}

  /** Whether this venue has a CLOB (Phoenix) or is AMM-style (others). */
  hasBook(): boolean {
    return false;
  }

  /** Allow operators to inject real on-chain pool state per venue/symbol. */
  setPoolProvider(provider: PoolStateProvider | null): void {
    this.poolProvider = provider;
  }

  async fetchMarkPrices(symbols?: string[]): Promise<MarkPrice[]> {
    const raw = await this.transport.getMarkPrices();
    return raw
      .filter((m) => m.venue.toLowerCase() === this.id)
      .filter((m) => !symbols || symbols.includes(m.symbol.toUpperCase()))
      .map<MarkPrice>((m) => ({
        symbol: m.symbol.toUpperCase(),
        venue: this.id,
        price: m.price,
        source: m.source,
        fetchedAtUnixMs: m.fetchedAtUnixMs,
      }));
  }

  async fetchFunding(symbols?: string[]): Promise<FundingRate[]> {
    const raw = await this.transport.getFundingRates();
    return raw
      .filter((r) => r.venue.toLowerCase() === this.id)
      .filter((r) => !symbols || symbols.includes(r.symbol.toUpperCase()))
      .map<FundingRate>((r) => ({
        symbol: r.symbol.toUpperCase(),
        venue: this.id,
        source: r.source,
        longPerHourPct: r.longFundingRatePerHourPercent,
        shortPerHourPct: r.shortFundingRatePerHourPercent,
        longBorrowPerHourPct: r.longBorrowRatePerHourPercent,
        shortBorrowPerHourPct: r.shortBorrowRatePerHourPercent,
      }));
  }

  async fetchBook(_symbol: string): Promise<OrderbookSnapshot | null> {
    return null;
  }

  async fetchMeta(symbol: string): Promise<MarketMeta | null> {
    const sym = symbol.toUpperCase();
    const meta: MarketMeta = {
      symbol: sym,
      venue: this.id,
      makerFeeBps: this.defaults.makerFeeBps,
      takerFeeBps: this.defaults.takerFeeBps,
      maxLeverage: this.defaults.maxLeverage,
      openInterestUsd: null,
      liquidityUsd: this.defaults.fallbackLiquidityUsd,
      minOrderUsd: this.defaults.minOrderUsd,
      markSource: this.defaults.markSource,
      pool: null,
    };
    if (!this.hasBook()) {
      meta.pool = await this.resolvePool(sym);
      if (meta.pool) {
        meta.openInterestUsd = meta.pool.longOiUsd + meta.pool.shortOiUsd;
        meta.liquidityUsd = Math.max(
          meta.pool.maxLongOiUsd + meta.pool.maxShortOiUsd - meta.openInterestUsd,
          meta.liquidityUsd ?? 0,
        );
      }
    }
    return meta;
  }

  /** Resolve a pool state: provider first, then synthetic fallback. */
  protected async resolvePool(symbol: string) {
    if (this.poolProvider) {
      try {
        const fromProvider = await this.poolProvider(this.id, symbol);
        if (fromProvider) return fromProvider;
      } catch {
        // fall through to synthetic
      }
    }
    // Best-effort synthetic from current funding + venue AUM default.
    try {
      const funding = (await this.fetchFunding([symbol]))[0] ?? null;
      return syntheticPoolState({
        aumUsd: this.defaults.fallbackLiquidityUsd,
        funding,
      });
    } catch {
      return null;
    }
  }

  async snapshot(symbol: string): Promise<MarketSnapshot> {
    const sym = symbol.toUpperCase();
    const [marks, funding, book, meta] = await Promise.all([
      this.fetchMarkPrices([sym]).catch(() => [] as MarkPrice[]),
      this.fetchFunding([sym]).catch(() => [] as FundingRate[]),
      this.fetchBook(sym).catch(() => null),
      this.fetchMeta(sym).catch(() => null),
    ]);
    return {
      symbol: sym,
      venue: this.id,
      markPrice: marks[0]?.price ?? null,
      funding: funding[0] ?? null,
      book,
      meta,
    };
  }

  async quote(ctx: QuoteContext): Promise<VenueQuote> {
    const sym = ctx.symbol.toUpperCase();
    const snap = await this.snapshot(sym);

    if (snap.markPrice == null) {
      return {
        venue: this.id,
        symbol: sym,
        side: ctx.side,
        sizeUsd: ctx.sizeUsd,
        expectedPrice: 0,
        markPrice: 0,
        slippageBps: 0,
        feeUsd: 0,
        fundingCostUsd: 0,
        totalCostUsd: Number.POSITIVE_INFINITY,
        openInterestUsd: snap.meta?.openInterestUsd ?? null,
        liquidityUsd: snap.meta?.liquidityUsd ?? null,
        fillable: false,
        reason: `no mark price for ${sym} on ${this.id}`,
        breakdown: { slippageUsd: 0, feeUsd: 0, fundingUsd: 0 },
      };
    }

    const meta = snap.meta;
    const liquidityUsd = meta?.liquidityUsd ?? this.defaults.fallbackLiquidityUsd;

    // Slippage is based on execution direction. Closing a long sells into bids;
    // closing a short buys from asks. Keep the quote side as the user's
    // position side, but flip the book/AMM side for close actions.
    const executionSide = executionSideFor(ctx.side, ctx.action);
    const slip = snap.book
      ? bookVwapSlippage(snap.book, executionSide, ctx.sizeUsd)
      : meta?.pool
        ? (() => {
            const r = poolImpact({
              pool: meta.pool!,
              markPrice: snap.markPrice!,
              side: executionSide,
              sizeUsd: ctx.sizeUsd,
              impactCoeff: this.defaults.impactCoeff,
            });
            return {
              expectedPrice: r.expectedPrice,
              slippageBps: r.slippageBps,
              fillable: r.fillable,
              filledUsd: r.filledUsd,
              reason: r.reason,
            };
          })()
        : ammImpactSlippage({
            markPrice: snap.markPrice,
            liquidityUsd,
            sizeUsd: ctx.sizeUsd,
            side: executionSide,
            impactCoeff: this.defaults.impactCoeff,
          });

    const expectedPrice = slip.expectedPrice || snap.markPrice;
    const slippageUsd = (Math.abs(slip.slippageBps) / 10_000) * ctx.sizeUsd;

    // Fees: assume taker for market orders.
    const takerFeeBps = meta?.takerFeeBps ?? this.defaults.takerFeeBps;
    const feeUsd = (takerFeeBps / 10_000) * ctx.sizeUsd;

    // Funding cost over hold horizon, signed for long perspective.
    // Positive long funding = longs pay shorts → cost for longs, rebate for shorts.
    const f = snap.funding;
    let fundingCostUsd = 0;
    if (f) {
      const hours = ctx.holdSeconds / 3600;
      if (ctx.action === "close") {
        fundingCostUsd = 0;
      } else if (ctx.side === "long" && f.longPerHourPct != null) {
        fundingCostUsd = (f.longPerHourPct / 100) * ctx.sizeUsd * hours;
      } else if (ctx.side === "short" && f.shortPerHourPct != null) {
        // Short funding is reported as -long by Imperial convention; negative = rebate.
        fundingCostUsd = (f.shortPerHourPct / 100) * ctx.sizeUsd * hours;
      }
    }

    const totalCostUsd = slippageUsd + feeUsd + fundingCostUsd;

    // Allowed slippage check.
    const fillable = slip.fillable && Math.abs(slip.slippageBps) <= ctx.slippageBps;
    const reason = !slip.fillable
      ? ("reason" in slip && slip.reason
          ? `${slip.reason} (${this.id})`
          : `insufficient depth for ${ctx.sizeUsd} USD on ${this.id}`)
      : Math.abs(slip.slippageBps) > ctx.slippageBps
        ? `slippage ${slip.slippageBps.toFixed(1)} bps exceeds tolerance ${ctx.slippageBps}`
        : undefined;

    return {
      venue: this.id,
      symbol: sym,
      side: ctx.side,
      sizeUsd: ctx.sizeUsd,
      expectedPrice,
      markPrice: snap.markPrice,
      slippageBps: slip.slippageBps,
      feeUsd,
      fundingCostUsd,
      totalCostUsd,
      openInterestUsd: meta?.openInterestUsd ?? null,
      liquidityUsd,
      fillable,
      reason,
      breakdown: {
        slippageUsd,
        feeUsd,
        fundingUsd: fundingCostUsd,
      },
    };
  }

  buildOrderPayload(opts: {
    wallet: string;
    profileIndex: number;
    symbol: string;
    side: Side;
    action: "open" | "close";
    sizeUsdFixed: number;
    collateralFixed: number;
    slippageBps: number;
    orderTypeCode: number;
    triggerPrice?: number;
    triggerCondition?: 0 | 1;
  }): Record<string, unknown> {
    return {
      wallet: opts.wallet,
      profileIndex: opts.profileIndex,
      action: ACTION_CODE[opts.action],
      side: SIDE_CODE[opts.side],
      underwriter: UNDERWRITER_CODE[this.id],
      orderType: opts.orderTypeCode ?? ORDER_TYPE_CODE.market,
      sizeUsd: opts.sizeUsdFixed,
      collateralAmount: opts.collateralFixed,
      slippageBps: opts.slippageBps,
      fundingStatus: 0,
      priority: 0,
      triggerPrice: opts.triggerPrice ?? 0,
      triggerCondition: opts.triggerCondition ?? 0,
      symbol: opts.symbol.toUpperCase(),
      extraData: null,
      parentOrderPda: null,
    };
  }
}

function executionSideFor(side: Side, action: "open" | "close"): Side {
  if (action === "open") return side;
  return side === "long" ? "short" : "long";
}

/** Convenience to pick the right adapter from an underwriter code. */
export function venueFromUnderwriter(code: number): VenueId | null {
  return VENUE_FROM_UNDERWRITER[code] ?? null;
}
