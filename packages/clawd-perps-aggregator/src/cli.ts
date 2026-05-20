#!/usr/bin/env node
/**
 * clawd-perps-aggregator — operator CLI.
 *
 * Subcommands:
 *   markets [SYMBOL]        list all markets / a symbol across all venues
 *   marks [SYMBOL]          mark prices across venues
 *   funding [SYMBOL]        funding rates across venues
 *   quote SYM SIDE SIZE     quote a market order across all venues
 *   route SYM SIDE SIZE     route a market order, print chosen + breakdown
 *   positions [WALLET]      aggregated positions
 *   risk [WALLET]           liquidation risk table
 *   simulate ... (same args as quote)
 *   mcp                     start the MCP server on stdio
 *
 * This CLI is intentionally minimal — the operator surface is via the SDK;
 * this is just for exploration and smoke tests.
 */

import { PerpsAggregator } from "./sdk/client.js";
import type { Side } from "./types.js";

const args = process.argv.slice(2);
const cmd = args[0] ?? "help";

function logJson(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
}

async function main(): Promise<void> {
  const agg = new PerpsAggregator();

  switch (cmd) {
    case "venues": {
      logJson(agg.listVenues());
      break;
    }
    case "markets": {
      const sym = args[1]?.toUpperCase();
      logJson(await agg.listMarkets(sym));
      break;
    }
    case "marks": {
      const sym = args[1]?.toUpperCase();
      logJson(await agg.marks(sym));
      break;
    }
    case "funding": {
      const sym = args[1]?.toUpperCase();
      logJson(await agg.funding(sym));
      break;
    }
    case "quote": {
      const [, symbol, side, sizeStr] = args;
      if (!symbol || !side || !sizeStr) throw new Error("usage: quote SYMBOL long|short SIZE_USD");
      logJson(
        await agg.quote({
          symbol,
          side: side as Side,
          action: "open",
          sizeUsd: Number(sizeStr),
        }),
      );
      break;
    }
    case "route": {
      const [, symbol, side, sizeStr] = args;
      if (!symbol || !side || !sizeStr) throw new Error("usage: route SYMBOL long|short SIZE_USD");
      logJson(
        await agg.route({
          symbol,
          side: side as Side,
          action: "open",
          sizeUsd: Number(sizeStr),
        }),
      );
      break;
    }
    case "positions": {
      const wallet = args[1];
      logJson(await agg.positions(wallet));
      break;
    }
    case "risk": {
      const wallet = args[1];
      logJson(await agg.liquidationRisks(wallet));
      break;
    }
    case "balances": {
      logJson(await agg.balances());
      break;
    }
    case "simulate": {
      const [, symbol, side, sizeStr, wallet] = args;
      if (!symbol || !side || !sizeStr || !wallet) {
        throw new Error("usage: simulate SYMBOL long|short SIZE_USD WALLET");
      }
      logJson(
        await agg.simulate({
          wallet,
          symbol,
          side: side as Side,
          action: "open",
          sizeUsd: Number(sizeStr),
        }),
      );
      break;
    }
    case "mcp": {
      const { startMcpServer } = await import("./mcp/server.js");
      await startMcpServer({ aggregator: agg });
      return; // do not exit
    }
    case "help":
    case "--help":
    case "-h":
    default: {
      process.stdout.write(
        [
          "clawd-perps-aggregator — Solana perps SOR + SDK + MCP",
          "",
          "Commands:",
          "  venues                          list enabled venues",
          "  markets [SYMBOL]                list markets across venues",
          "  marks [SYMBOL]                  mark prices",
          "  funding [SYMBOL]                funding rates",
          "  quote SYMBOL long|short SIZE    cross-venue quotes",
          "  route SYMBOL long|short SIZE    routed best venue + breakdown",
          "  positions [WALLET]              aggregated positions",
          "  risk [WALLET]                   liquidation risk table",
          "  balances                        USDC subaccount balances (needs IMPERIAL_JWT)",
          "  simulate SYM SIDE SIZE WALLET   simulate without submitting",
          "  mcp                             start MCP server on stdio",
          "",
          "Env: IMPERIAL_API_BASE, IMPERIAL_JWT, IMPERIAL_WALLET, IMPERIAL_LIVE,",
          "     IMPERIAL_MAX_SIZE_USD, IMPERIAL_ALLOWED_SYMS, PERPS_AGG_VENUES,",
          "     PERPS_AGG_PAPER, PERPS_AGG_HOLD_SECONDS.",
          "",
        ].join("\n"),
      );
      break;
    }
  }
}

main().catch((err) => {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
