/**
 * MCP tool definitions for the Clawd Perps Aggregator.
 *
 * Tools are grouped:
 *   - market data : list_markets, get_marks, get_funding, get_book
 *   - routing     : get_quote, route_trade, score_market
 *   - execution   : build_order_tx, simulate_order, execute_order
 *   - positions   : get_positions, get_balances, get_liquidation_risks
 *   - realtime    : stream_status, stream_marks (one-shot snapshot)
 *
 * Every tool is gated by the SDK's existing paper-first defaults; execution
 * is impossible unless the operator has explicitly turned live mode on.
 */

import type { PerpsAggregator } from "../sdk/client.js";
import type { Side, Action, VenueId } from "../types.js";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

function asSymbol(input: Record<string, unknown>, key = "symbol"): string {
  const v = input[key];
  if (typeof v !== "string" || !v) throw new Error(`${key} required`);
  return v.toUpperCase();
}

function asSide(input: Record<string, unknown>): Side {
  const v = (input.side ?? "long") as string;
  if (v !== "long" && v !== "short") throw new Error("side must be 'long' or 'short'");
  return v;
}

function asAction(input: Record<string, unknown>): Action {
  const v = (input.action ?? "open") as string;
  if (v !== "open" && v !== "close") throw new Error("action must be 'open' or 'close'");
  return v;
}

function asNumber(input: Record<string, unknown>, key: string, fallback?: number): number {
  const v = input[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && !Number.isNaN(Number(v))) return Number(v);
  if (fallback !== undefined) return fallback;
  throw new Error(`${key} required (number)`);
}

function asVenue(input: Record<string, unknown>, key = "venue"): VenueId | undefined {
  const v = input[key];
  if (v == null) return undefined;
  if (typeof v !== "string") return undefined;
  const lc = v.toLowerCase() as VenueId;
  if (!["phoenix", "flash", "jupiter", "gmtrade"].includes(lc)) {
    throw new Error(`unknown venue ${v}`);
  }
  return lc;
}

export function buildTools(agg: PerpsAggregator): McpTool[] {
  return [
    {
      name: "perps_list_venues",
      description: "List Solana perps venues enabled in this aggregator.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => ({ venues: agg.listVenues() }),
    },
    {
      name: "perps_list_markets",
      description: "List perps markets across all venues, optionally filtered by symbol.",
      inputSchema: {
        type: "object",
        properties: { symbol: { type: "string", description: "Symbol like SOL, ETH, BTC. Omit for all." } },
      },
      handler: async (input) => {
        const sym = (input.symbol as string | undefined)?.toUpperCase();
        return { markets: await agg.listMarkets(sym) };
      },
    },
    {
      name: "perps_get_marks",
      description: "Current mark prices across all venues for a symbol or all symbols.",
      inputSchema: {
        type: "object",
        properties: { symbol: { type: "string" } },
      },
      handler: async (input) => ({ marks: await agg.marks(input.symbol as string | undefined) }),
    },
    {
      name: "perps_get_funding",
      description: "Funding + borrow rates per venue. Positive long rate = longs pay shorts.",
      inputSchema: {
        type: "object",
        properties: { symbol: { type: "string" } },
      },
      handler: async (input) => ({ funding: await agg.funding(input.symbol as string | undefined) }),
    },
    {
      name: "perps_get_quote",
      description:
        "Quote a market order across all enabled venues. Returns per-venue expected price, slippage, fee, and funding cost.",
      inputSchema: {
        type: "object",
        required: ["symbol", "side", "sizeUsd"],
        properties: {
          symbol: { type: "string" },
          side: { type: "string", enum: ["long", "short"] },
          action: { type: "string", enum: ["open", "close"], default: "open" },
          sizeUsd: { type: "number", description: "Notional in USD" },
          slippageBps: { type: "number", default: 50 },
          holdSeconds: { type: "number", default: 3600 },
          venues: { type: "array", items: { type: "string" } },
        },
      },
      handler: async (input) => {
        const quotes = await agg.quote({
          symbol: asSymbol(input),
          side: asSide(input),
          action: asAction(input),
          sizeUsd: asNumber(input, "sizeUsd"),
          slippageBps: input.slippageBps as number | undefined,
          holdSeconds: input.holdSeconds as number | undefined,
          venues: input.venues as VenueId[] | undefined,
        });
        return { quotes };
      },
    },
    {
      name: "perps_route_trade",
      description:
        "Smart-order-route a perps trade and return the chosen venue with full candidate breakdown and rationale.",
      inputSchema: {
        type: "object",
        required: ["symbol", "side", "sizeUsd"],
        properties: {
          symbol: { type: "string" },
          side: { type: "string", enum: ["long", "short"] },
          action: { type: "string", enum: ["open", "close"], default: "open" },
          sizeUsd: { type: "number" },
          slippageBps: { type: "number", default: 50 },
          holdSeconds: { type: "number", default: 3600 },
          venues: { type: "array", items: { type: "string" } },
        },
      },
      handler: async (input) => {
        const route = await agg.route({
          symbol: asSymbol(input),
          side: asSide(input),
          action: asAction(input),
          sizeUsd: asNumber(input, "sizeUsd"),
          slippageBps: input.slippageBps as number | undefined,
          holdSeconds: input.holdSeconds as number | undefined,
          venues: input.venues as VenueId[] | undefined,
        });
        return { route };
      },
    },
    {
      name: "perps_build_order_tx",
      description:
        "Build the on-wire order payload (and route plan) without submitting. Safe to call without live mode.",
      inputSchema: {
        type: "object",
        required: ["wallet", "symbol", "side", "sizeUsd"],
        properties: {
          wallet: { type: "string" },
          profileIndex: { type: "number", default: 0 },
          symbol: { type: "string" },
          side: { type: "string", enum: ["long", "short"] },
          action: { type: "string", enum: ["open", "close"], default: "open" },
          sizeUsd: { type: "number" },
          venue: { type: "string", enum: ["phoenix", "flash", "jupiter", "gmtrade"] },
          orderType: { type: "string", default: "market" },
          slippageBps: { type: "number", default: 50 },
          triggerPrice: { type: "number" },
          triggerCondition: { type: "number", enum: [0, 1] },
          collateralUsd: { type: "number" },
          holdSeconds: { type: "number", default: 3600 },
        },
      },
      handler: async (input) => {
        const built = await agg.buildOrder({
          wallet: input.wallet as string,
          profileIndex: input.profileIndex as number | undefined,
          symbol: asSymbol(input),
          side: asSide(input),
          action: asAction(input),
          sizeUsd: asNumber(input, "sizeUsd"),
          venue: asVenue(input),
          orderType: input.orderType as never,
          slippageBps: input.slippageBps as number | undefined,
          triggerPrice: input.triggerPrice as number | undefined,
          triggerCondition: input.triggerCondition as 0 | 1 | undefined,
          collateralUsd: input.collateralUsd as number | undefined,
          holdSeconds: input.holdSeconds as number | undefined,
        });
        return built;
      },
    },
    {
      name: "perps_simulate_order",
      description: "Simulate an order: routes, checks fillability, fees, slippage, and policy caps.",
      inputSchema: {
        type: "object",
        required: ["wallet", "symbol", "side", "sizeUsd"],
        properties: {
          wallet: { type: "string" },
          profileIndex: { type: "number", default: 0 },
          symbol: { type: "string" },
          side: { type: "string", enum: ["long", "short"] },
          action: { type: "string", enum: ["open", "close"], default: "open" },
          sizeUsd: { type: "number" },
          venue: { type: "string", enum: ["phoenix", "flash", "jupiter", "gmtrade"] },
          slippageBps: { type: "number", default: 50 },
          holdSeconds: { type: "number", default: 3600 },
        },
      },
      handler: async (input) => {
        const sim = await agg.simulate({
          wallet: input.wallet as string,
          profileIndex: input.profileIndex as number | undefined,
          symbol: asSymbol(input),
          side: asSide(input),
          action: asAction(input),
          sizeUsd: asNumber(input, "sizeUsd"),
          venue: asVenue(input),
          slippageBps: input.slippageBps as number | undefined,
          holdSeconds: input.holdSeconds as number | undefined,
        });
        return sim;
      },
    },
    {
      name: "perps_execute_order",
      description:
        "Execute an order. Paper-first by default — submits a real on-chain order only when IMPERIAL_LIVE=true and PERPS_AGG_PAPER!=true.",
      inputSchema: {
        type: "object",
        required: ["wallet", "symbol", "side", "sizeUsd"],
        properties: {
          wallet: { type: "string" },
          profileIndex: { type: "number", default: 0 },
          symbol: { type: "string" },
          side: { type: "string", enum: ["long", "short"] },
          action: { type: "string", enum: ["open", "close"], default: "open" },
          sizeUsd: { type: "number" },
          venue: { type: "string", enum: ["phoenix", "flash", "jupiter", "gmtrade"] },
          orderType: { type: "string", default: "market" },
          slippageBps: { type: "number", default: 50 },
          triggerPrice: { type: "number" },
          triggerCondition: { type: "number", enum: [0, 1] },
          collateralUsd: { type: "number" },
          holdSeconds: { type: "number", default: 3600 },
        },
      },
      handler: async (input) => {
        const rec = await agg.execute({
          wallet: input.wallet as string,
          profileIndex: input.profileIndex as number | undefined,
          symbol: asSymbol(input),
          side: asSide(input),
          action: asAction(input),
          sizeUsd: asNumber(input, "sizeUsd"),
          venue: asVenue(input),
          orderType: input.orderType as never,
          slippageBps: input.slippageBps as number | undefined,
          triggerPrice: input.triggerPrice as number | undefined,
          triggerCondition: input.triggerCondition as 0 | 1 | undefined,
          collateralUsd: input.collateralUsd as number | undefined,
          holdSeconds: input.holdSeconds as number | undefined,
        });
        return rec;
      },
    },
    {
      name: "perps_get_positions",
      description: "Aggregated cross-venue positions for a wallet, with totals.",
      inputSchema: {
        type: "object",
        properties: { wallet: { type: "string" } },
      },
      handler: async (input) => ({ positions: await agg.positions(input.wallet as string | undefined) }),
    },
    {
      name: "perps_get_balances",
      description: "USDC subaccount balances across profile indices (requires IMPERIAL_JWT).",
      inputSchema: { type: "object", properties: {} },
      handler: async () => ({ balances: await agg.balances() }),
    },
    {
      name: "perps_liquidation_risks",
      description: "Liquidation distance per open position, sorted most-at-risk first.",
      inputSchema: {
        type: "object",
        properties: { wallet: { type: "string" } },
      },
      handler: async (input) => ({ risks: await agg.liquidationRisks(input.wallet as string | undefined) }),
    },
    {
      name: "perps_build_deposit_tx",
      description: "Build a sponsored deposit or withdraw tx (base64). Caller signs and submits.",
      inputSchema: {
        type: "object",
        required: ["amountUsd"],
        properties: {
          amountUsd: { type: "number" },
          mode: { type: "string", enum: ["deposit", "withdraw"], default: "deposit" },
        },
      },
      handler: async (input) => {
        const tx = await agg.buildDeposit(
          asNumber(input, "amountUsd"),
          (input.mode as "deposit" | "withdraw" | undefined) ?? "deposit",
        );
        return { transactionBase64: tx };
      },
    },
    {
      name: "perps_stream_snapshot",
      description: "Snapshot the realtime market cache (marks, funding, books). Starts the stream lazily.",
      inputSchema: {
        type: "object",
        properties: {
          symbols: { type: "array", items: { type: "string" } },
        },
      },
      handler: async (input) => {
        const stream = agg.stream(input.symbols as string[] | undefined);
        return { snapshot: stream.snapshotCache() };
      },
    },
    {
      name: "perps_score_market",
      description: "Realtime composite market score for (symbol, venue): momentum + funding + liquidity.",
      inputSchema: {
        type: "object",
        required: ["symbol"],
        properties: {
          symbol: { type: "string" },
          venue: { type: "string", enum: ["phoenix", "flash", "jupiter", "gmtrade"] },
        },
      },
      handler: async (input) => {
        const sym = asSymbol(input);
        const venue = asVenue(input);
        if (venue) {
          return { score: agg.scoreMarket(sym, venue) };
        }
        return { scores: agg.scoreAllVenues(sym) };
      },
    },
  ];
}
