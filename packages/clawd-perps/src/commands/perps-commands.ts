import { Command } from "commander";
import { ClaWDPerps } from "../perps-tool.js";
import type { ToolResult, CandleParams, OrderParams, TpSlParams } from "../types.js";

function print(r: ToolResult) {
  if (!r.success) {
    console.error(`error: ${r.error}`);
    process.exitCode = 1;
    return;
  }
  console.log(r.output ?? JSON.stringify(r.data, null, 2));
}

export function buildPerpsCommand(): Command {
  const perps = new ClaWDPerps();

  const cmd = new Command("perps")
    .description("Phoenix Perpetuals DEX — clawd perps CLI")
    .addHelpText("after", `
Environment variables:
  CLAWD_PERPS_API_URL   Phoenix perps API (default: https://perp-api.phoenix.trade)
  CLAWD_PERPS_RPC_URL   Solana RPC        (default: https://api.mainnet-beta.solana.com)
  CLAWD_PERPS_API_KEY   Bearer token for authenticated endpoints (optional)
  CLAWD_PERPS_WALLET    Trader wallet address / public key
`);

  // ── market ─────────────────────────────────────────────────────────────────
  const market = new Command("market").description("Market data commands");

  market
    .command("list")
    .description("List all available perps markets")
    .action(async () => print(await perps.listMarkets()));

  market
    .command("info <symbol>")
    .description("Get market details for a symbol")
    .action(async (symbol) => print(await perps.getMarketInfo(symbol)));

  market
    .command("ticker [symbol]")
    .description("Get ticker for a market (or all tickers if no symbol given)")
    .action(async (symbol) =>
      symbol ? print(await perps.getTicker(symbol)) : print(await perps.getAllTickers())
    );

  market
    .command("orderbook <symbol>")
    .description("Get orderbook for a market")
    .option("-d, --depth <n>", "Orderbook depth", "20")
    .action(async (symbol, opts) => print(await perps.getOrderbook(symbol, Number(opts.depth))));

  market
    .command("candles <symbol>")
    .description("Get OHLCV candle data")
    .option("-r, --resolution <res>", "Resolution: 1m 5m 15m 1h 4h 1d", "1h")
    .option("-n, --limit <n>", "Number of candles", "100")
    .action(async (symbol, opts) => {
      const params: CandleParams = {
        market: symbol,
        resolution: opts.resolution as CandleParams["resolution"],
        limit: Number(opts.limit),
      };
      print(await perps.getCandles(params));
    });

  market
    .command("leverage <symbol>")
    .description("Show leverage tiers for a market")
    .action(async (symbol) => print(await perps.getLeverageTiers(symbol)));

  cmd.addCommand(market);

  // ── account ─────────────────────────────────────────────────────────────────
  const account = new Command("account").description("Account and portfolio commands");

  account
    .command("info [wallet]")
    .description("Show account info")
    .action(async (wallet) => print(await perps.getAccountInfo(wallet)));

  account
    .command("portfolio [wallet]")
    .description("Show full portfolio snapshot (margin + positions + orders)")
    .action(async (wallet) => print(await perps.getPortfolio(wallet)));

  account
    .command("margin [wallet]")
    .description("Show margin status")
    .action(async (wallet) => print(await perps.getMarginStatus(wallet)));

  cmd.addCommand(account);

  // ── position ─────────────────────────────────────────────────────────────────
  const position = new Command("position").description("Position management");

  position
    .command("list [wallet]")
    .description("List open positions")
    .action(async (wallet) => print(await perps.listPositions(wallet)));

  position
    .command("show <market> [wallet]")
    .description("Show a single position")
    .action(async (market, wallet) => print(await perps.getPosition(market, wallet)));

  position
    .command("close <market>")
    .description("Build close-position transaction (signs and sends separately)")
    .option("-s, --size <n>", "Partial close size (omit for full close)")
    .action(async (market, opts) => {
      const size = opts.size !== undefined ? Number(opts.size) : undefined;
      print(await perps.buildClosePosition(market, size));
    });

  position
    .command("reduce <market> <size>")
    .description("Build reduce-position transaction")
    .action(async (market, size) => print(await perps.buildReducePosition(market, Number(size))));

  position
    .command("tpsl <market>")
    .description("Set take-profit / stop-loss on a position")
    .option("--tp <price>", "Take-profit price")
    .option("--sl <price>", "Stop-loss price")
    .option("--side <side>", "Position side: long | short", "long")
    .action(async (market, opts) => {
      if (!opts.tp && !opts.sl) {
        console.error("error: provide at least --tp or --sl");
        process.exitCode = 1;
        return;
      }
      const params: TpSlParams = {
        market,
        positionSide: opts.side as "long" | "short",
        ...(opts.tp ? { takeProfit: Number(opts.tp) } : {}),
        ...(opts.sl ? { stopLoss: Number(opts.sl) } : {}),
      };
      print(await perps.buildSetTpSl(params));
    });

  cmd.addCommand(position);

  // ── order ─────────────────────────────────────────────────────────────────
  const order = new Command("order").description("Order management");

  order
    .command("list [wallet]")
    .description("List open orders")
    .option("-m, --market <symbol>", "Filter by market")
    .action(async (wallet, opts) => print(await perps.listOrders(wallet, opts.market)));

  order
    .command("show <orderId>")
    .description("Get order details")
    .action(async (orderId) => print(await perps.getOrder(orderId)));

  order
    .command("place <market>")
    .description("Build a trade order transaction")
    .option("--side <side>", "buy | sell", "buy")
    .option("--type <type>", "market | limit", "market")
    .option("--size <n>", "Order size (required)", "0")
    .option("--price <n>", "Limit price (required for limit orders)")
    .option("--reduce-only", "Reduce-only flag")
    .action(async (market, opts) => {
      const params: OrderParams = {
        market,
        side: opts.side as "buy" | "sell",
        orderType: opts.type as "market" | "limit",
        size: Number(opts.size),
        ...(opts.price ? { price: Number(opts.price) } : {}),
        ...(opts.reduceOnly ? { reduceOnly: true } : {}),
      };
      print(await perps.buildOrder(params));
    });

  order
    .command("cancel <orderId> <market>")
    .description("Build a cancel-order transaction")
    .action(async (orderId, market) => print(await perps.buildCancelOrder(orderId, market)));

  cmd.addCommand(order);

  // ── margin ─────────────────────────────────────────────────────────────────
  const marginCmd = new Command("margin").description("Margin / collateral operations");

  marginCmd
    .command("deposit <amount>")
    .description("Build a deposit transaction")
    .option("--mint <address>", "Token mint (default: USDC)")
    .action(async (amount) => print(await perps.buildDeposit(Number(amount))));

  marginCmd
    .command("withdraw <amount>")
    .description("Build a withdrawal transaction")
    .option("--mint <address>", "Token mint (default: USDC)")
    .action(async (amount) => print(await perps.buildWithdraw(Number(amount))));

  marginCmd
    .command("collateral <market> <amount>")
    .description("Build an add-collateral transaction for a position")
    .action(async (market, amount) => print(await perps.buildAddCollateral(market, Number(amount))));

  cmd.addCommand(marginCmd);

  // ── history ─────────────────────────────────────────────────────────────────
  const history = new Command("history").description("Historical data");

  history
    .command("trades")
    .description("Trade history")
    .option("-m, --market <symbol>", "Filter by market")
    .option("-n, --limit <n>", "Max results", "50")
    .action(async (opts) =>
      print(await perps.getTradeHistory({ market: opts.market, limit: Number(opts.limit) }))
    );

  history
    .command("orders")
    .description("Order history")
    .option("-m, --market <symbol>", "Filter by market")
    .option("-n, --limit <n>", "Max results", "50")
    .action(async (opts) =>
      print(await perps.getOrderHistory({ market: opts.market, limit: Number(opts.limit) }))
    );

  history
    .command("funding")
    .description("Funding payment history")
    .option("-m, --market <symbol>", "Filter by market")
    .option("-n, --limit <n>", "Max results", "50")
    .action(async (opts) =>
      print(await perps.getFundingHistory({ market: opts.market, limit: Number(opts.limit) }))
    );

  history
    .command("pnl")
    .description("Realized PnL history")
    .option("-m, --market <symbol>", "Filter by market")
    .option("-n, --limit <n>", "Max results", "50")
    .action(async (opts) =>
      print(await perps.getPnlHistory({ market: opts.market, limit: Number(opts.limit) }))
    );

  cmd.addCommand(history);

  // ── misc ──────────────────────────────────────────────────────────────────
  cmd
    .command("config")
    .description("Show current perps configuration")
    .action(() => print(perps.getConfig()));

  cmd
    .command("health")
    .description("Check Phoenix perps API health")
    .action(async () => print(await perps.health()));

  return cmd;
}
