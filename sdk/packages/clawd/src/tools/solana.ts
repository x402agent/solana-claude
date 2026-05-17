import axios, { type AxiosInstance, isAxiosError } from "axios";
import type { ToolResult } from "../types/index.js";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function wrap(err: unknown, prefix: string): ToolResult {
  if (isAxiosError(err)) {
    if (err.code === "ECONNABORTED") return { success: false, error: `${prefix}: request timeout` };
    if (err.response) return { success: false, error: `${prefix}: ${err.response.status} ${err.response.statusText} ${JSON.stringify(err.response.data || {})}` };
    if (err.request) return { success: false, error: `${prefix}: network error` };
  }
  return { success: false, error: `${prefix}: ${err instanceof Error ? err.message : "unknown"}` };
}

export class SolanaTool {
  private heliusRpcUrl: string;
  private heliusApiKey: string;
  private birdeyeApiKey: string;
  private birdeye: AxiosInstance;

  constructor() {
    this.heliusRpcUrl = process.env.HELIUS_RPC_URL || "https://mainnet.helius-rpc.com";
    this.heliusApiKey = process.env.HELIUS_API_KEY || "";
    this.birdeyeApiKey = process.env.BIRDEYE_API_KEY || "";
    this.birdeye = axios.create({
      baseURL: "https://public-api.birdeye.so",
      headers: {
        accept: "application/json",
        "x-chain": "solana",
        "X-API-KEY": this.birdeyeApiKey,
      },
      timeout: 15000,
    });
  }

  private requireBirdeye(): ToolResult | null {
    if (!this.birdeyeApiKey) return { success: false, error: "BIRDEYE_API_KEY environment variable is not set" };
    return null;
  }

  private async birdeyeGet(path: string, params: Record<string, unknown>, chain?: string): Promise<ToolResult> {
    const miss = this.requireBirdeye();
    if (miss) return miss;
    try {
      const resp = await this.birdeye.get(path, {
        params,
        headers: chain ? { "x-chain": chain } : undefined,
      });
      if (resp.data?.success === false) {
        return { success: false, error: `Birdeye: ${resp.data.message || JSON.stringify(resp.data)}` };
      }
      return { success: true, output: JSON.stringify(resp.data?.data ?? resp.data, null, 2), data: resp.data?.data };
    } catch (e) {
      return wrap(e, `Birdeye ${path}`);
    }
  }

  async getAsset(assetId: string): Promise<ToolResult> {
    if (!assetId || !BASE58.test(assetId)) return { success: false, error: "Invalid Solana address" };
    if (!this.heliusApiKey) return { success: false, error: "HELIUS_API_KEY environment variable is not set" };
    try {
      const resp = await axios.post(
        `${this.heliusRpcUrl}?api-key=${this.heliusApiKey}`,
        { jsonrpc: "2.0", id: "1", method: "getAsset", params: { id: assetId } },
        { timeout: 10000 }
      );
      if (resp.data.error) return { success: false, error: `Helius: ${JSON.stringify(resp.data.error)}` };
      return { success: true, output: JSON.stringify(resp.data.result, null, 2) };
    } catch (e) {
      return wrap(e, "getAsset");
    }
  }

  async getPrice(tokenAddress: string): Promise<ToolResult> {
    if (!BASE58.test(tokenAddress)) return { success: false, error: "Invalid token address" };
    return this.birdeyeGet("/defi/price", { address: tokenAddress });
  }

  async getTokenOverview(address: string, frames?: string): Promise<ToolResult> {
    if (!BASE58.test(address)) return { success: false, error: "Invalid token address" };
    return this.birdeyeGet("/defi/token_overview", { address, ui_amount_mode: "scaled", ...(frames ? { frames } : {}) });
  }

  async getTokenMetadata(address: string, chain = "solana"): Promise<ToolResult> {
    return this.birdeyeGet("/defi/v3/token/meta-data/single", { address }, chain);
  }

  async getTokenMetadataMulti(addresses: string[], chain = "solana"): Promise<ToolResult> {
    return this.birdeyeGet("/defi/v3/token/meta-data/multiple", { list_address: addresses.join(",") }, chain);
  }

  async getTokenMarketData(address: string, chain = "solana"): Promise<ToolResult> {
    return this.birdeyeGet("/defi/v3/token/market-data", { address, ui_amount_mode: "scaled" }, chain);
  }

  async getTokenMarketDataMulti(addresses: string[], chain = "solana"): Promise<ToolResult> {
    return this.birdeyeGet("/defi/v3/token/market-data/multiple", { list_address: addresses.join(","), ui_amount_mode: "scaled" }, chain);
  }

  async getTokenTradeData(address: string, frames?: string, chain = "solana"): Promise<ToolResult> {
    return this.birdeyeGet("/defi/v3/token/trade-data/single", { address, ui_amount_mode: "scaled", ...(frames ? { frames } : {}) }, chain);
  }

  async getTokenTradeDataMulti(addresses: string[], frames?: string, chain = "solana"): Promise<ToolResult> {
    return this.birdeyeGet("/defi/v3/token/trade-data/multiple", { list_address: addresses.join(","), ui_amount_mode: "scaled", ...(frames ? { frames } : {}) }, chain);
  }

  async getTokenLiquidity(address: string, chain = "base"): Promise<ToolResult> {
    return this.birdeyeGet("/defi/v3/token/exit-liquidity", { address }, chain);
  }

  async getTokenLiquidityMulti(addresses: string[], chain = "base"): Promise<ToolResult> {
    return this.birdeyeGet("/defi/v3/token/exit-liquidity/multiple", { list_address: addresses.join(",") }, chain);
  }

  async searchToken(keyword: string, chain = "solana", limit = 20): Promise<ToolResult> {
    return this.birdeyeGet("/defi/v3/search", { keyword, target: "token", sort_by: "volume_24h_usd", sort_type: "desc", offset: 0, limit }, chain);
  }

  async getTokenList(sort_by = "v24hUSD", sort_type: "asc" | "desc" = "desc", offset = 0, limit = 50, chain = "solana"): Promise<ToolResult> {
    return this.birdeyeGet("/defi/tokenlist", { sort_by, sort_type, offset, limit }, chain);
  }

  async getTrending(sort_by = "rank", sort_type: "asc" | "desc" = "asc", offset = 0, limit = 20, chain = "solana"): Promise<ToolResult> {
    return this.birdeyeGet("/defi/token_trending", { sort_by, sort_type, offset, limit }, chain);
  }

  async getOhlcv(address: string, type_: "1m" | "5m" | "15m" | "30m" | "1H" | "2H" | "4H" | "6H" | "8H" | "12H" | "1D" | "3D" | "1W" | "1M" = "1H", time_from?: number, time_to?: number, chain = "solana"): Promise<ToolResult> {
    const params: Record<string, unknown> = { address, type: type_ };
    if (time_from) params.time_from = time_from;
    if (time_to) params.time_to = time_to;
    return this.birdeyeGet("/defi/ohlcv", params, chain);
  }

  async getWalletBalance(walletAddress: string): Promise<ToolResult> {
    if (!BASE58.test(walletAddress)) return { success: false, error: "Invalid wallet address" };
    if (!this.heliusApiKey) return { success: false, error: "HELIUS_API_KEY environment variable is not set" };
    const url = `${this.heliusRpcUrl}?api-key=${this.heliusApiKey}`;
    try {
      const [balance, tokens] = await Promise.all([
        axios.post(url, { jsonrpc: "2.0", id: "1", method: "getBalance", params: [walletAddress] }, { timeout: 10000 }),
        axios.post(url, {
          jsonrpc: "2.0", id: "2", method: "getTokenAccountsByOwner",
          params: [walletAddress, { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }, { encoding: "jsonParsed" }],
        }, { timeout: 10000 }),
      ]);
      if (balance.data.error) return { success: false, error: `RPC: ${JSON.stringify(balance.data.error)}` };
      const lamports = balance.data.result.value;
      const accounts = (tokens.data.result?.value || []).map((a: { pubkey: string; account: { data: { parsed?: { info: unknown } } } }) => ({
        pubkey: a.pubkey,
        info: a.account.data.parsed?.info,
      }));
      return {
        success: true,
        output: JSON.stringify({ address: walletAddress, sol: lamports / 1e9, lamports, tokenAccounts: accounts }, null, 2),
      };
    } catch (e) {
      return wrap(e, "getWalletBalance");
    }
  }

  async getWalletPortfolio(walletAddress: string, chain = "solana"): Promise<ToolResult> {
    if (!BASE58.test(walletAddress) && chain === "solana") return { success: false, error: "Invalid wallet address" };
    return this.birdeyeGet("/v1/wallet/token_list", { wallet: walletAddress }, chain);
  }
}
