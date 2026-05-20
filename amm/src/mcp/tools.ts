import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const AMM_TOOLS: Tool[] = [
  {
    name: "amm_list_venues",
    description: "List enabled AMM/perps venues.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "amm_list_markets",
    description: "List markets across enabled venues.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "amm_get_quote",
    description: "Quote all enabled venues for a symbol, side, and notional.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        side: { type: "string", enum: ["long", "short"] },
        notionalUsd: { type: "number" },
      },
      required: ["symbol", "side", "notionalUsd"],
    },
  },
  {
    name: "amm_route_trade",
    description: "Build the best route plan for a trade.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        side: { type: "string", enum: ["long", "short"] },
        notionalUsd: { type: "number" },
      },
      required: ["symbol", "side", "notionalUsd"],
    },
  },
  {
    name: "amm_build_order_tx",
    description: "Build a paper-safe order transaction payload.",
    inputSchema: {
      type: "object",
      properties: {
        wallet: { type: "string" },
        symbol: { type: "string" },
        side: { type: "string", enum: ["long", "short"] },
        notionalUsd: { type: "number" },
        leverage: { type: "number" },
      },
      required: ["wallet", "symbol", "side", "notionalUsd"],
    },
  },
  {
    name: "amm_simulate_order",
    description: "Simulate margin, risk, fees, slippage, and route acceptance.",
    inputSchema: {
      type: "object",
      properties: {
        wallet: { type: "string" },
        symbol: { type: "string" },
        side: { type: "string", enum: ["long", "short"] },
        notionalUsd: { type: "number" },
        leverage: { type: "number" },
      },
      required: ["wallet", "symbol", "side", "notionalUsd"],
    },
  },
  {
    name: "amm_execute_order",
    description: "Execute an order. Defaults to paper mode unless live execution is explicitly enabled.",
    inputSchema: {
      type: "object",
      properties: {
        wallet: { type: "string" },
        symbol: { type: "string" },
        side: { type: "string", enum: ["long", "short"] },
        notionalUsd: { type: "number" },
        leverage: { type: "number" },
      },
      required: ["wallet", "symbol", "side", "notionalUsd"],
    },
  },
  {
    name: "amm_get_positions",
    description: "Fetch raw cross-venue positions for a wallet.",
    inputSchema: {
      type: "object",
      properties: { wallet: { type: "string" } },
      required: ["wallet"],
    },
  },
  {
    name: "amm_get_aggregated_positions",
    description: "Fetch netted positions and liquidation risk bands for a wallet.",
    inputSchema: {
      type: "object",
      properties: { wallet: { type: "string" } },
      required: ["wallet"],
    },
  },
  {
    name: "amm_liquidation_risks",
    description: "Return non-low liquidation risks for a wallet.",
    inputSchema: {
      type: "object",
      properties: { wallet: { type: "string" } },
      required: ["wallet"],
    },
  },
  {
    name: "amm_score_market",
    description: "Score a market across venues using quote, funding, liquidity, and slippage.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        side: { type: "string", enum: ["long", "short"] },
      },
      required: ["symbol"],
    },
  },
];
