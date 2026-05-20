import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createPerpsAmmClient } from "../sdk/client.js";
import type { OrderSide } from "../types.js";
import { AMM_TOOLS } from "./tools.js";

function text(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function side(value: unknown): OrderSide {
  return value === "short" ? "short" : "long";
}

export async function createAmmMcpServer(): Promise<Server> {
  const client = createPerpsAmmClient();
  const server = new Server(
    { name: "clawd-amm", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: AMM_TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    switch (request.params.name) {
      case "amm_list_venues":
        return text(client.listVenues());
      case "amm_list_markets":
        return text(await client.listMarkets());
      case "amm_get_quote":
        return text(await client.quote({
          symbol: String(args.symbol),
          side: side(args.side),
          notionalUsd: Number(args.notionalUsd),
        }));
      case "amm_route_trade":
        return text(await client.route({
          symbol: String(args.symbol),
          side: side(args.side),
          notionalUsd: Number(args.notionalUsd),
        }));
      case "amm_build_order_tx":
        return text(await client.buildOrder({
          wallet: String(args.wallet),
          symbol: String(args.symbol),
          side: side(args.side),
          notionalUsd: Number(args.notionalUsd),
          leverage: args.leverage == null ? undefined : Number(args.leverage),
        }));
      case "amm_simulate_order":
        return text(await client.simulateOrder({
          wallet: String(args.wallet),
          symbol: String(args.symbol),
          side: side(args.side),
          notionalUsd: Number(args.notionalUsd),
          leverage: args.leverage == null ? undefined : Number(args.leverage),
        }));
      case "amm_execute_order":
        return text(await client.executeOrder({
          wallet: String(args.wallet),
          symbol: String(args.symbol),
          side: side(args.side),
          notionalUsd: Number(args.notionalUsd),
          leverage: args.leverage == null ? undefined : Number(args.leverage),
        }));
      case "amm_get_positions":
        return text(await client.positions(String(args.wallet)));
      case "amm_get_aggregated_positions":
        return text(await client.aggregatedPositions(String(args.wallet)));
      case "amm_liquidation_risks":
        return text(await client.liquidationRisks(String(args.wallet)));
      case "amm_score_market":
        return text(await client.scoreMarket(String(args.symbol), side(args.side)));
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });

  return server;
}
