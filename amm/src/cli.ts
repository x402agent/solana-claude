#!/usr/bin/env node
import { createPerpsAmmClient } from "./sdk/client.js";
import type { OrderSide } from "./types.js";

function usage(): never {
  console.log(`clawd-amm

Usage:
  clawd-amm venues
  clawd-amm markets
  clawd-amm quote <symbol> <long|short> <notionalUsd>
  clawd-amm route <symbol> <long|short> <notionalUsd>
  clawd-amm simulate <wallet> <symbol> <long|short> <notionalUsd> [leverage]
  clawd-amm positions <wallet>
  clawd-amm risks <wallet>
  clawd-amm score <symbol> [long|short]
  clawd-amm mcp
`);
  process.exit(1);
}

function side(value: string | undefined): OrderSide {
  if (value === "long" || value === "short") return value;
  throw new Error("side must be long or short");
}

function print(data: unknown): void {
  console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "-h" || command === "--help") usage();

  if (command === "mcp") {
    await import("./mcp/bin.js");
    return;
  }

  const client = createPerpsAmmClient();
  switch (command) {
    case "venues":
      print(client.listVenues());
      break;
    case "markets":
      print(await client.listMarkets());
      break;
    case "quote":
      print(await client.quote({ symbol: String(args[0]), side: side(args[1]), notionalUsd: Number(args[2]) }));
      break;
    case "route":
      print(await client.route({ symbol: String(args[0]), side: side(args[1]), notionalUsd: Number(args[2]) }));
      break;
    case "simulate":
      print(await client.simulateOrder({
        wallet: String(args[0]),
        symbol: String(args[1]),
        side: side(args[2]),
        notionalUsd: Number(args[3]),
        leverage: args[4] == null ? undefined : Number(args[4]),
      }));
      break;
    case "positions":
      print(await client.positions(String(args[0])));
      break;
    case "risks":
      print(await client.liquidationRisks(String(args[0])));
      break;
    case "score":
      print(await client.scoreMarket(String(args[0]), args[1] ? side(args[1]) : "long"));
      break;
    default:
      usage();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
