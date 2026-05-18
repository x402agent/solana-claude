import { ClaWDPerps } from "@openclawdsolana/clawd-perps";
import type { ToolResult } from "@openclawdsolana/clawd-perps";
import type { PerpsRuntimeConfig } from "../config.js";

export interface PhoenixPerpMarketView {
  symbol: string;
  markPrice?: number | null;
  spotPrice?: number | null;
  fundingRate?: number | null;
  openInterest?: number | null;
  status?: string | null;
}

export interface PhoenixRiseAdapter {
  listMarkets(): Promise<PhoenixPerpMarketView[]>;
  getTicker(symbol?: string): Promise<unknown>;
  getOrderbook(symbol: string, depth?: number): Promise<unknown>;
  getTraderSnapshot(authority?: string): Promise<unknown>;
  getPositions(authority?: string): Promise<unknown>;
  health(): Promise<unknown>;
}

function unwrapResult<T>(label: string, result: ToolResult): T {
  if (!result.success) {
    throw new Error(result.error ?? `${label} failed`);
  }
  return result.data as T;
}

export class ClawdPhoenixRiseAdapter implements PhoenixRiseAdapter {
  private readonly perps: ClaWDPerps;

  constructor(private readonly config: PerpsRuntimeConfig) {
    this.perps = new ClaWDPerps({
      apiUrl: config.apiUrl,
      rpcUrl: config.rpcUrl,
      walletName: config.wallet,
      traderPdaIndex: config.traderPdaIndex,
      traderSubaccountIndex: config.traderSubaccountIndex,
    });
  }

  async listMarkets(): Promise<PhoenixPerpMarketView[]> {
    return unwrapResult<PhoenixPerpMarketView[]>("listMarkets", await this.perps.listMarkets());
  }

  async getTicker(symbol?: string): Promise<unknown> {
    const result = symbol
      ? await this.perps.getTicker(symbol)
      : await this.perps.getAllTickers();
    return unwrapResult("getTicker", result);
  }

  async getOrderbook(symbol: string, depth = 20): Promise<unknown> {
    return unwrapResult("getOrderbook", await this.perps.getOrderbook(symbol, depth));
  }

  async getTraderSnapshot(authority?: string): Promise<unknown> {
    return unwrapResult("getPortfolio", await this.perps.getPortfolio(authority));
  }

  async getPositions(authority?: string): Promise<unknown> {
    return unwrapResult("listPositions", await this.perps.listPositions(authority));
  }

  async health(): Promise<unknown> {
    return unwrapResult("health", await this.perps.health());
  }
}

export function createPhoenixRiseAdapter(config: PerpsRuntimeConfig): PhoenixRiseAdapter {
  return new ClawdPhoenixRiseAdapter(config);
}
