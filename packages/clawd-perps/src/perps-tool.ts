import {
  Direction,
  MarginType,
  PhoenixHttpClient,
  Side,
  StopLossOrderKind,
  createPhoenixClient,
  priceUsdToTicksWithMarketParams,
} from "@ellipsis-labs/rise";
import type {
  CandleParams,
  HistoryParams,
  MarketInfo,
  OrderParams,
  PerpsConfig,
  ToolResult,
  TpSlParams,
} from "./types.js";

function wrapError(label: string, error: unknown): ToolResult {
  return {
    success: false,
    error: `${label}: ${error instanceof Error ? error.message : "unknown error"}`,
  };
}

function stringify(data: unknown): string {
  return JSON.stringify(
    data,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );
}

function ok(data: unknown): ToolResult {
  return { success: true, data, output: stringify(data) };
}

function normalizeSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  return upper.endsWith("-PERP") ? upper : `${upper}-PERP`;
}

function asAuthority(value: string): any {
  return value as any;
}

function asSymbol(value: string): any {
  return value as any;
}

function parseWholeUsdcAmount(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount must be a positive number");
  }
  return BigInt(Math.round(amount * 1_000_000));
}

type RiseInstruction = Awaited<ReturnType<ReturnType<typeof createPhoenixClient>["ixs"]["placeMarketOrder"]>>;

export class ClaWDPerps {
  private cfg: PerpsConfig;
  private api: PhoenixHttpClient;
  private client: ReturnType<typeof createPhoenixClient>;

  constructor(overrides: Partial<PerpsConfig> = {}) {
    this.cfg = {
      apiUrl: overrides.apiUrl ?? process.env.CLAWD_PERPS_API_URL ?? "https://perp-api.phoenix.trade",
      rpcUrl: overrides.rpcUrl ?? process.env.CLAWD_PERPS_RPC_URL ?? process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
      apiKey: overrides.apiKey ?? process.env.CLAWD_PERPS_API_KEY,
      walletName: overrides.walletName ?? process.env.CLAWD_PERPS_WALLET,
      traderPdaIndex: overrides.traderPdaIndex ?? Number(process.env.CLAWD_PERPS_TRADER_PDA_INDEX ?? 0),
      traderSubaccountIndex: overrides.traderSubaccountIndex ?? Number(process.env.CLAWD_PERPS_TRADER_SUBACCOUNT_INDEX ?? 0),
    };

    this.api = new PhoenixHttpClient({
      apiUrl: this.cfg.apiUrl,
    });

    this.client = createPhoenixClient({
      apiUrl: this.cfg.apiUrl,
      rpcUrl: this.cfg.rpcUrl,
      auth: false,
      ws: false,
      exchangeMetadata: { stream: false },
    });
  }

  private requireWallet(wallet?: string): string {
    const authority = wallet ?? this.cfg.walletName;
    if (!authority) {
      throw new Error("wallet address required. Set CLAWD_PERPS_WALLET or pass walletName in config.");
    }
    return authority;
  }

  private traderIndexes() {
    return {
      traderPdaIndex: this.cfg.traderPdaIndex ?? 0,
      traderSubaccountIndex: this.cfg.traderSubaccountIndex ?? 0,
    };
  }

  private async formatInstructionResult(
    label: string,
    instructionPromise: Promise<RiseInstruction>,
    meta: Record<string, unknown>,
  ): Promise<ToolResult> {
    try {
      const instruction = await instructionPromise;
      return ok({
        kind: label,
        signingRequired: true,
        submitVia: "solana wallet or RPC",
        meta,
        instruction,
      });
    } catch (error) {
      return wrapError(label, error);
    }
  }

  async listMarkets(): Promise<ToolResult> {
    try {
      const [markets, snapshot] = await Promise.all([
        this.api.markets().getMarkets(),
        this.api.exchange().getSnapshot(),
      ]);

      const bySymbol = new Map(
        snapshot.markets.map((market) => [market.symbol, market]),
      );

      const data: MarketInfo[] = markets.map((market) => {
        const snap = bySymbol.get(market.symbol);
        return {
          symbol: market.symbol,
          baseAsset: market.symbol.replace(/-PERP$/i, ""),
          quoteAsset: "USDC",
          marketAddress: market.marketPubkey,
          markPrice: (snap as any)?.markPriceParameters?.markPrice ?? null,
          spotPrice: (snap as any)?.markPriceParameters?.oraclePrice ?? null,
          openInterest: (snap as any)?.openInterest ?? null,
          status: market.marketStatus,
        };
      });
      return ok(data);
    } catch (error) {
      return wrapError("listMarkets", error);
    }
  }

  async getMarketInfo(market: string): Promise<ToolResult> {
    try {
      const symbol = normalizeSymbol(market);
      const data = await this.api.markets().getMarket(symbol);
      return ok(data);
    } catch (error) {
      return wrapError("getMarketInfo", error);
    }
  }

  async getTicker(market: string): Promise<ToolResult> {
    try {
      const symbol = normalizeSymbol(market);
      const book = await this.api.orderbook().getOrderbook(symbol);
      return ok({
        symbol,
        bestBid: book.bids[0] ?? null,
        bestAsk: book.asks[0] ?? null,
        mid: book.mid ?? null,
        lastUpdatedSlot: book.slot,
      });
    } catch (error) {
      return wrapError("getTicker", error);
    }
  }

  async getAllTickers(): Promise<ToolResult> {
    try {
      const snapshot = await this.api.exchange().getSnapshot();
      const data = snapshot.markets.map((market) => ({
        symbol: market.symbol,
        markPrice: (market as any).markPriceParameters?.markPrice ?? null,
        spotPrice: (market as any).markPriceParameters?.oraclePrice ?? null,
        openInterest: (market as any).openInterest ?? null,
        fundingRate: (market as any).fundingRatePercentage ?? null,
      }));
      return ok(data);
    } catch (error) {
      return wrapError("getAllTickers", error);
    }
  }

  async getOrderbook(market: string, depth = 20): Promise<ToolResult> {
    try {
      const symbol = normalizeSymbol(market);
      const data = await this.api.orderbook().getOrderbook(symbol);
      const trimmed = {
        ...data,
        bids: data.bids.slice(0, depth),
        asks: data.asks.slice(0, depth),
      };
      return ok(trimmed);
    } catch (error) {
      return wrapError("getOrderbook", error);
    }
  }

  async getCandles(params: CandleParams): Promise<ToolResult> {
    try {
      const symbol = normalizeSymbol(params.market);
      const data = await this.api.candles().getCandles(symbol, {
        timeframe: params.resolution,
        limit: params.limit,
        startTime: params.startTime,
        endTime: params.endTime,
      });
      return ok(data);
    } catch (error) {
      return wrapError("getCandles", error);
    }
  }

  async getPortfolio(wallet?: string): Promise<ToolResult> {
    try {
      const authority = this.requireWallet(wallet);
      const data = await this.api.traders().getTraderStateSnapshot(authority, {
        traderPdaIndex: this.traderIndexes().traderPdaIndex,
      });
      return ok(data);
    } catch (error) {
      return wrapError("getPortfolio", error);
    }
  }

  async getMarginStatus(wallet?: string): Promise<ToolResult> {
    try {
      const authority = this.requireWallet(wallet);
      const data = await this.api.traders().getTraderStateSnapshot(authority, {
        traderPdaIndex: this.traderIndexes().traderPdaIndex,
      });
      return ok((data.snapshot as any).margin ?? data.snapshot);
    } catch (error) {
      return wrapError("getMarginStatus", error);
    }
  }

  async getAccountInfo(wallet?: string): Promise<ToolResult> {
    try {
      const authority = this.requireWallet(wallet);
      const [trader, capabilities] = await Promise.all([
        this.api.traders().getTraderState(authority, {
          pdaIndex: this.traderIndexes().traderPdaIndex,
        }),
        this.api.traders().getTraderCapabilities(),
      ]);
      return ok({ authority, trader, capabilities });
    } catch (error) {
      return wrapError("getAccountInfo", error);
    }
  }

  async getLeverageTiers(market: string): Promise<ToolResult> {
    try {
      const symbol = normalizeSymbol(market);
      const data = await this.api.exchange().getMarket(symbol);
      return ok({
        symbol,
        leverageTiers: data.leverageTiers,
        riskFactors: data.riskFactors,
      });
    } catch (error) {
      return wrapError("getLeverageTiers", error);
    }
  }

  async listPositions(wallet?: string): Promise<ToolResult> {
    try {
      const authority = this.requireWallet(wallet);
      const snapshot = await this.api.traders().getTraderStateSnapshot(authority, {
        traderPdaIndex: this.traderIndexes().traderPdaIndex,
      });
      const positions =
        snapshot.snapshot.subaccounts?.flatMap((subaccount) =>
          (subaccount.positions ?? []).map((position) => ({
            subaccountIndex: subaccount.subaccountIndex,
            ...position,
          })),
        ) ?? [];
      return ok(positions);
    } catch (error) {
      return wrapError("listPositions", error);
    }
  }

  async getPosition(market: string, wallet?: string): Promise<ToolResult> {
    try {
      const symbol = normalizeSymbol(market);
      const authority = this.requireWallet(wallet);
      const snapshot = await this.api.traders().getTraderStateSnapshot(authority, {
        traderPdaIndex: this.traderIndexes().traderPdaIndex,
      });
      const match =
        snapshot.snapshot.subaccounts?.flatMap((subaccount) =>
          (subaccount.positions ?? []).map((position) => ({
            subaccountIndex: subaccount.subaccountIndex,
            ...position,
          })),
        ).find((position) => position.symbol === symbol) ?? null;
      return ok(match);
    } catch (error) {
      return wrapError("getPosition", error);
    }
  }

  async listOrders(wallet?: string, market?: string): Promise<ToolResult> {
    try {
      const authority = this.requireWallet(wallet);
      const state = await this.api.traders().getTraderState(authority, {
        pdaIndex: this.traderIndexes().traderPdaIndex,
      });
      const target = market ? normalizeSymbol(market) : null;
      const filtered = ((state.traders?.[0] as any)?.subaccounts ?? []).flatMap((subaccount: any) =>
        (subaccount.openOrders ?? [])
          .filter((order) => !target || order.symbol === target)
          .map((order) => ({
            subaccountIndex: subaccount.subaccountIndex,
            ...order,
          })),
      );
      return ok(filtered);
    } catch (error) {
      return wrapError("listOrders", error);
    }
  }

  async getOrder(orderId: string, wallet?: string): Promise<ToolResult> {
    try {
      const authority = this.requireWallet(wallet);
      const orders = await this.listOrders(authority);
      if (!orders.success || !Array.isArray(orders.data)) {
        return orders;
      }
      const found =
        orders.data.find((order: Record<string, unknown>) =>
          String(order.orderSequenceNumber ?? order.orderId) === orderId,
        ) ?? null;
      return ok(found);
    } catch (error) {
      return wrapError("getOrder", error);
    }
  }

  async buildOrder(params: OrderParams): Promise<ToolResult> {
    try {
      const authority = this.requireWallet();
      const symbol = normalizeSymbol(params.market);
      const side = params.side === "buy" ? Side.Bid : Side.Ask;
      const indexes = this.traderIndexes();

      const orderPacket =
        params.orderType === "limit"
          ? await this.client.orderPackets.buildLimitOrderPacket({
              symbol: asSymbol(symbol),
              side,
              priceUsd: String(params.price),
              baseUnits: String(params.size),
            })
          : await this.client.orderPackets.buildMarketOrderPacket({
              symbol: asSymbol(symbol),
              side,
              baseUnits: String(params.size),
              ...(params.price ? { priceLimitUsd: String(params.price) } : {}),
            });

      const ixPromise =
        params.orderType === "limit"
          ? (this.client.ixs.placeLimitOrder({
              authority: asAuthority(authority),
              symbol: asSymbol(symbol),
              orderPacket: orderPacket as any,
              ...indexes,
            }) as Promise<RiseInstruction>)
          : (this.client.ixs.placeMarketOrder({
              authority: asAuthority(authority),
              symbol: asSymbol(symbol),
              orderPacket: orderPacket as any,
              ...indexes,
            }) as Promise<RiseInstruction>);

      return this.formatInstructionResult("buildOrder", ixPromise, {
        authority,
        symbol,
        orderType: params.orderType,
        side: params.side,
        size: params.size,
        price: params.price ?? null,
      });
    } catch (error) {
      return wrapError("buildOrder", error);
    }
  }

  async buildCancelOrder(orderId: string, market: string): Promise<ToolResult> {
    try {
      const authority = this.requireWallet();
      const symbol = normalizeSymbol(market);
      const orders = await this.listOrders(authority, symbol);
      if (!orders.success || !Array.isArray(orders.data)) {
        return orders;
      }

      const match = orders.data.find((order: Record<string, unknown>) =>
        String(order.orderSequenceNumber ?? order.orderId) === orderId,
      );
      if (!match) {
        return {
          success: false,
          error: `buildCancelOrder: order ${orderId} not found for ${symbol}`,
        };
      }

      const orderSequenceNumber = String(match.orderSequenceNumber ?? match.orderId);
      const price = match.price;
      if (price === undefined || price === null) {
        return {
          success: false,
          error: "buildCancelOrder: matching order does not expose a cancel price",
        };
      }

      return this.formatInstructionResult(
        "buildCancelOrder",
        this.client.ixs.buildCancelOrdersById({
          authority: asAuthority(authority),
          symbol: asSymbol(symbol),
          orders: [{ price: Number(price), orderSequenceNumber }],
          ...this.traderIndexes(),
        }),
        { authority, symbol, orderId },
      );
    } catch (error) {
      return wrapError("buildCancelOrder", error);
    }
  }

  async buildClosePosition(market: string, size?: number): Promise<ToolResult> {
    try {
      const authority = this.requireWallet();
      const symbol = normalizeSymbol(market);
      const positionResult = await this.getPosition(symbol, authority);
      if (!positionResult.success || !positionResult.data) {
        return positionResult.success
          ? { success: false, error: `buildClosePosition: no open position for ${symbol}` }
          : positionResult;
      }

      const position = positionResult.data as Record<string, unknown>;
      const side = String(position.side).toLowerCase() === "long" ? Side.Ask : Side.Bid;
      const closeSize = size ?? Number(position.basePosition ?? position.size ?? 0);
      if (!Number.isFinite(closeSize) || closeSize <= 0) {
        return { success: false, error: "buildClosePosition: unable to determine close size" };
      }

      const orderPacket = await this.client.orderPackets.buildMarketOrderPacket({
        symbol: asSymbol(symbol),
        side,
        baseUnits: String(closeSize),
      });

      return this.formatInstructionResult(
        "buildClosePosition",
        this.client.ixs.placeMarketOrder({
          authority: asAuthority(authority),
          symbol: asSymbol(symbol),
          orderPacket,
          ...this.traderIndexes(),
        }),
        { authority, symbol, closeSize },
      );
    } catch (error) {
      return wrapError("buildClosePosition", error);
    }
  }

  async buildReducePosition(market: string, size: number): Promise<ToolResult> {
    return this.buildClosePosition(market, size);
  }

  private async buildSlInstruction(
    params: TpSlParams,
    authority: string,
    symbol: string,
    marketMeta: any,
    indexes: ReturnType<ClaWDPerps["traderIndexes"]>,
  ): Promise<{ instruction: unknown; price: number } | { error: string }> {
    const slSide = params.positionSide === "long" ? Side.Ask : Side.Bid;
    const slDirection = params.positionSide === "long" ? Direction.LessThan : Direction.GreaterThan;
    const triggerPrice = priceUsdToTicksWithMarketParams(String(params.stopLoss!), {
      tickSize: marketMeta.tickSize,
      baseLotsDecimals: marketMeta.baseLotsDecimals,
    });
    try {
      const ix = await this.client.ixs.buildPlaceStopLoss({
        authority: asAuthority(authority),
        symbol: asSymbol(symbol),
        tradeSide: slSide,
        executionDirection: slDirection,
        orderKind: StopLossOrderKind.IOC,
        triggerPrice,
        ...indexes,
      });
      return { instruction: ix, price: params.stopLoss! };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async buildTpInstruction(
    params: TpSlParams,
    authority: string,
    symbol: string,
    indexes: ReturnType<ClaWDPerps["traderIndexes"]>,
  ): Promise<{ instruction: unknown; price: number } | { error: string }> {
    // TP = resting limit close at the target price.
    // Long TP: limit sell (Ask) at TP price; short TP: limit buy (Bid) at TP price.
    const tpSide = params.positionSide === "long" ? Side.Ask : Side.Bid;
    try {
      const tpOrderPacket = await this.client.orderPackets.buildLimitOrderPacket({
        symbol: asSymbol(symbol),
        side: tpSide,
        priceUsd: String(params.takeProfit!),
        baseUnits: params.takeProfitSize ? String(params.takeProfitSize) : "0",
      });
      const ix = await this.client.ixs.placeLimitOrder({
        authority: asAuthority(authority),
        symbol: asSymbol(symbol),
        orderPacket: tpOrderPacket as any,
        ...indexes,
      });
      return { instruction: ix, price: params.takeProfit! };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  async buildSetTpSl(params: TpSlParams): Promise<ToolResult> {
    try {
      const authority = this.requireWallet();
      const symbol = normalizeSymbol(params.market);
      const marketMeta = await this.client.exchange.market(asSymbol(symbol));
      const indexes = this.traderIndexes();
      const meta: Record<string, unknown> = { authority, symbol, positionSide: params.positionSide };
      const instructions: unknown[] = [];

      if (params.stopLoss !== undefined) {
        const r = await this.buildSlInstruction(params, authority, symbol, marketMeta, indexes);
        if ("error" in r) { meta.stopLossError = r.error; }
        else { instructions.push({ kind: "stop_loss", triggerPrice: r.price, instruction: r.instruction }); meta.stopLoss = r.price; }
      }

      if (params.takeProfit !== undefined) {
        const r = await this.buildTpInstruction(params, authority, symbol, indexes);
        if ("error" in r) { meta.takeProfitError = r.error; }
        else { instructions.push({ kind: "take_profit", limitPrice: r.price, instruction: r.instruction }); meta.takeProfit = r.price; }
      }

      if (instructions.length === 0) {
        return { success: false, error: "buildSetTpSl: no valid takeProfit or stopLoss price provided" };
      }

      return ok({ kind: "buildSetTpSl", signingRequired: true, submitVia: "solana wallet or RPC", meta, instructions, count: instructions.length });
    } catch (error) {
      return wrapError("buildSetTpSl", error);
    }
  }

  private computePositionRisk(pos: any, markBySymbol: Map<string, number>) {
    const mark = markBySymbol.get(pos.symbol) ?? pos.markPrice ?? 0;
    const liqPrice: number = pos.liquidationPrice ?? 0;
    let liquidationDistancePct: number | null = null;
    let riskBand: "low" | "medium" | "high" | "critical" | "unknown" = "unknown";
    if (mark > 0 && liqPrice > 0) {
      const dist = pos.side === "long" ? (mark - liqPrice) / mark : (liqPrice - mark) / mark;
      liquidationDistancePct = +(dist * 100).toFixed(2);
      const bps = dist * 10_000;
      riskBand = bps > 2_000 ? "low" : bps > 800 ? "medium" : bps > 200 ? "high" : "critical";
    }
    return { symbol: pos.symbol, side: pos.side, markPrice: mark, liquidationPrice: liqPrice, liquidationDistancePct, riskBand, unrealizedPnl: pos.unrealizedPnl ?? 0, leverage: pos.leverage ?? 0 };
  }

  async getRiskMetrics(wallet?: string): Promise<ToolResult> {
    try {
      const authority = this.requireWallet(wallet);
      const [snapshot, exchangeSnapshot] = await Promise.all([
        this.api.traders().getTraderStateSnapshot(authority, { traderPdaIndex: this.traderIndexes().traderPdaIndex }),
        this.api.exchange().getSnapshot(),
      ]);

      const markBySymbol = new Map<string, number>(
        (exchangeSnapshot.markets ?? []).map((m: any) => [m.symbol, m.markPriceParameters?.markPrice ?? 0]),
      );

      const positions = snapshot.snapshot.subaccounts?.flatMap((subaccount) =>
        (subaccount.positions ?? []).map((position: any) => ({ subaccountIndex: subaccount.subaccountIndex, ...position })),
      ) ?? [];

      const ms = ((snapshot.snapshot as any).marginStatus ?? snapshot.snapshot) as any;
      const totalCollateral: number = ms.totalCollateral ?? ms.totalMargin ?? 0;
      const usedMargin: number = ms.usedMargin ?? 0;
      const availableMargin: number = ms.availableMargin ?? (totalCollateral - usedMargin);
      const marginRatio = totalCollateral > 0 ? usedMargin / totalCollateral : 0;

      const positionRisks = positions.map((pos: any) => this.computePositionRisk(pos, markBySymbol));
      const criticalCount = positionRisks.filter((p) => p.riskBand === "critical").length;
      const highCount = positionRisks.filter((p) => p.riskBand === "high").length;

      return ok({
        wallet: authority,
        totalCollateralUsd: totalCollateral,
        usedMarginUsd: usedMargin,
        availableMarginUsd: availableMargin,
        marginRatio: +marginRatio.toFixed(4),
        marginRatioPct: +(marginRatio * 100).toFixed(2),
        portfolioHealth: criticalCount > 0 ? "critical" : highCount > 0 ? "high" : marginRatio > 0.8 ? "medium" : "low",
        positions: positionRisks,
        summary: `${positions.length} position(s) · margin ratio ${(marginRatio * 100).toFixed(1)}% · ${criticalCount} critical`,
      });
    } catch (error) {
      return wrapError("getRiskMetrics", error);
    }
  }

  async buildDeposit(amount: number): Promise<ToolResult> {
    try {
      const authority = this.requireWallet();
      return this.formatInstructionResult(
        "buildDeposit",
        this.client.ixs.buildDepositFunds({
          authority: asAuthority(authority),
          amount: parseWholeUsdcAmount(amount),
          ...this.traderIndexes(),
        }),
        { authority, amount, unit: "USDC" },
      );
    } catch (error) {
      return wrapError("buildDeposit", error);
    }
  }

  async buildWithdraw(amount: number): Promise<ToolResult> {
    try {
      const authority = this.requireWallet();
      return this.formatInstructionResult(
        "buildWithdraw",
        this.client.ixs.buildWithdrawFunds({
          authority: asAuthority(authority),
          amount: parseWholeUsdcAmount(amount),
          ...this.traderIndexes(),
        }),
        { authority, amount, unit: "USDC" },
      );
    } catch (error) {
      return wrapError("buildWithdraw", error);
    }
  }

  async buildAddCollateral(_market: string, amount: number): Promise<ToolResult> {
    return this.buildDeposit(amount);
  }

  async getTradeHistory(params: HistoryParams = {}): Promise<ToolResult> {
    try {
      const symbol = params.market ? normalizeSymbol(params.market) : undefined;
      const authority = this.requireWallet();
      const data = await this.api.trades().getTraderTradesHistory(authority, {
        pdaIndex: this.traderIndexes().traderPdaIndex,
        marketSymbol: symbol,
        limit: params.limit,
        cursor: params.after,
      });
      return ok(data);
    } catch (error) {
      return wrapError("getTradeHistory", error);
    }
  }

  async getOrderHistory(params: HistoryParams = {}): Promise<ToolResult> {
    try {
      const authority = this.requireWallet();
      const data = await this.api.orders().getTraderOrderHistory(authority, {
        traderPdaIndex: this.traderIndexes().traderPdaIndex,
        marketSymbol: params.market ? normalizeSymbol(params.market) : undefined,
        limit: params.limit,
        cursor: params.after,
      });
      return ok(data);
    } catch (error) {
      return wrapError("getOrderHistory", error);
    }
  }

  async getFundingHistory(params: HistoryParams = {}): Promise<ToolResult> {
    try {
      const authority = this.requireWallet();
      const data = await this.api.funding().getTraderFundingHistory(authority, {
        pdaIndex: this.traderIndexes().traderPdaIndex,
        symbol: params.market ? normalizeSymbol(params.market) : undefined,
        limit: params.limit,
        cursor: params.after,
      });
      return ok(data);
    } catch (error) {
      return wrapError("getFundingHistory", error);
    }
  }

  async getPnlHistory(params: HistoryParams = {}): Promise<ToolResult> {
    try {
      const authority = this.requireWallet();
      const data = await this.api.traders().getTraderPnl(authority, {
        resolution: "1h",
        limit: params.limit,
      });
      return ok(data);
    } catch (error) {
      return wrapError("getPnlHistory", error);
    }
  }

  async registerTrader(marginType: "cross" | "isolated" = "cross"): Promise<ToolResult> {
    try {
      const authority = this.requireWallet();
      return this.formatInstructionResult(
        "registerTrader",
        this.client.ixs.buildRegisterTrader({
          authority: asAuthority(authority),
          marginType: marginType === "cross" ? MarginType.Cross : MarginType.Isolated,
          ...this.traderIndexes(),
        }),
        { authority, marginType },
      );
    } catch (error) {
      return wrapError("registerTrader", error);
    }
  }

  async health(): Promise<ToolResult> {
    try {
      const [exchange, markets] = await Promise.all([
        this.api.exchange().getExchange(),
        this.api.markets().getMarkets(),
      ]);
      return ok({
        ok: true,
        apiUrl: this.cfg.apiUrl,
        rpcUrl: this.cfg.rpcUrl,
        exchangeVersion: "live",
        marketCount: markets.length,
      });
    } catch (error) {
      return wrapError("health", error);
    }
  }

  getConfig(): ToolResult {
    return ok({
      apiUrl: this.cfg.apiUrl,
      rpcUrl: this.cfg.rpcUrl,
      wallet: this.cfg.walletName ?? "(not set)",
      hasApiKey: !!this.cfg.apiKey,
      traderPdaIndex: this.cfg.traderPdaIndex ?? 0,
      traderSubaccountIndex: this.cfg.traderSubaccountIndex ?? 0,
      sdk: "@ellipsis-labs/rise",
    });
  }
}
