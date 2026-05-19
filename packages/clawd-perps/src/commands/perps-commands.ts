import { Command } from "commander";
import { ClaWDPerps } from "../perps-tool.js";
import { runClawdPerpsAgent, runPerpsAgent, runVulcan } from "../vulcan-runner.js";
import { buildImperialRelay, sendRelay } from "../relay-client.js";
import { runPerpsTui } from "../tui.js";
import { runPerpsHarness } from "../harness.js";
import { buildOnchainMm, buildOnchainMmPlan, getOnchainMmStatus, runOnchainMm } from "../onchain-market-maker.js";
import type { ToolResult, CandleParams, OrderParams, TpSlParams } from "../types.js";

function print(r: ToolResult) {
  if (!r.success) {
    console.error(`error: ${r.error}`);
    process.exitCode = 1;
    return;
  }
  console.log(r.output ?? JSON.stringify(r.data, null, 2));
}

function parseSymbols(raw?: string): string[] {
  const symbols = (raw || "SOL,BTC,ETH")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
  return symbols.length ? symbols : ["SOL", "BTC", "ETH"];
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function readOnchainMmOptions(opts: Record<string, unknown>) {
  return {
    market: typeof opts.market === "string" ? opts.market : undefined,
    ticker: typeof opts.ticker === "string" ? opts.ticker : undefined,
    rpcUrl: typeof opts.rpcUrl === "string" ? opts.rpcUrl : undefined,
    keypairPath: typeof opts.keypairPath === "string" ? opts.keypairPath : undefined,
    quoteEdgeBps: parsePositiveInt(typeof opts.quoteEdgeBps === "string" ? opts.quoteEdgeBps : undefined, 3),
    quoteSize: parsePositiveInt(typeof opts.quoteSize === "string" ? opts.quoteSize : undefined, 100_000_000),
    refreshMs: parsePositiveInt(typeof opts.refreshMs === "string" ? opts.refreshMs : undefined, 2000),
    priceImprovement: typeof opts.priceImprovement === "string" ? opts.priceImprovement : undefined,
    postOnly: opts.postOnly !== false,
    release: Boolean(opts.release),
    yes: Boolean(opts.yes),
  };
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
  OPENROUTER_API_KEY    Optional model key for the agent harness
  CLAWD_PERPS_MODEL     OpenRouter model for harness analysis
  CLAWD_BACKROOM_URL    Realtime relay base URL (default: https://backrooms.x402.wtf)
  CLAWD_PERPS_RELAY_URL Full relay POST endpoint override
  CLAWD_PERPS_SESSION_DIR Harness JSONL session directory
  CLAWD_PERPS_TS_AGENT_CLI TypeScript clawd-agents-perps CLI path (optional)
  CLAWD_PERPS_AGENT_PATH Python Phoenix/Vulcan agent path (optional)
  VULCAN_BIN            Vulcan binary override (optional)
  CLAWD_ONCHAIN_MM_ROOT Phoenix on-chain market-maker workspace path
  CLAWD_ONCHAIN_MM_MARKET Phoenix market pubkey for on-chain MM plans
  CLAWD_ONCHAIN_MM_LIVE Must be true, with OPERATOR_CONFIRMED=true and --yes, for on-chain MM run
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

  // ── realtime TUI / harness / relay ────────────────────────────────────────
  cmd
    .command("relay [message...]")
    .description("Relay a perps operator message into the Backroom realtime stream")
    .option("--symbols <csv>", "Symbol list for generated relay payloads", "SOL,BTC,ETH")
    .option("--name <name>", "Relay sender name", "clawd-perps")
    .action(async (message: string[], opts: { symbols: string; name: string }) => {
      const symbols = parseSymbols(opts.symbols);
      const content = message.length ? message.join(" ") : buildImperialRelay(symbols, "manual");
      const result = await sendRelay({ name: opts.name, content });
      print({
        success: result.ok,
        data: result,
        output: JSON.stringify(result, null, 2),
        ...(result.ok ? {} : { error: result.error || "relay failed" }),
      });
    });

  cmd
    .command("tui")
    .description("Open the Lobster King Phoenix/Vulcan/Imperial perps realtime TUI")
    .option("--symbols <csv>", "Symbols to track", "SOL,BTC,ETH")
    .option("--interval-ms <n>", "Snapshot refresh interval", "2500")
    .option("--relay", "Announce the TUI to the Backroom realtime relay")
    .action(async (opts: { symbols: string; intervalMs: string; relay?: boolean }) => {
      await runPerpsTui({
        symbols: parseSymbols(opts.symbols),
        intervalMs: parsePositiveInt(opts.intervalMs, 2500),
        relay: Boolean(opts.relay),
      });
    });

  cmd
    .command("harness")
    .description("Run the OpenRouter-style long-horizon perps agent harness")
    .option("--symbols <csv>", "Symbols to track", "SOL,BTC,ETH")
    .option("--relay", "Relay startup and analysis to the Backroom")
    .option("--model <model>", "OpenRouter model override")
    .option("--prompt <text>", "Custom harness prompt")
    .option("--once", "Run a single iteration")
    .option("--interval-ms <n>", "Delay between iterations", "15000")
    .option("--max-iterations <n>", "Maximum iterations when not using --once", "3")
    .option("--no-model-call", "Skip OpenRouter and run deterministic snapshot mode")
    .action(
      async (opts: {
        symbols: string;
        relay?: boolean;
        model?: string;
        prompt?: string;
        once?: boolean;
        intervalMs: string;
        maxIterations: string;
        modelCall?: boolean;
      }) => {
        await runPerpsHarness({
          symbols: parseSymbols(opts.symbols),
          relay: Boolean(opts.relay),
          model: typeof opts.model === "string" ? opts.model : undefined,
          prompt: opts.prompt,
          once: Boolean(opts.once),
          intervalMs: parsePositiveInt(opts.intervalMs, 15000),
          maxIterations: parsePositiveInt(opts.maxIterations, 3),
          noModel: opts.modelCall === false,
        });
      },
    );

  // ── Vulcan / Python strategy agent ────────────────────────────────────────
  cmd
    .command("agent")
    .description("Run the Clawd TypeScript perps agent, falling back to Python Phoenix/Vulcan")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .argument("[args...]", "Arguments passed to clawd-agents-perps")
    .action((args: string[]) => runClawdPerpsAgent(args.length ? args : ["status"], { fallbackPython: true }));

  cmd
    .command("onchain-mm")
    .description("Phoenix on-chain market-maker status/build/plan/run")
    .argument("[action]", "status | build | install | plan | run", "status")
    .option("--market <pubkey>", "Phoenix market pubkey")
    .option("--ticker <ticker>", "Coinbase ticker used by the reference runner", "SOL-USD")
    .option("--rpc-url <url>", "RPC URL or alias: local, dev, main")
    .option("--keypair-path <path>", "Solana keypair path passed to the mm runner")
    .option("--quote-edge-bps <n>", "Quote edge in basis points", "3")
    .option("--quote-size <n>", "Quote size in quote atoms", "100000000")
    .option("--refresh-ms <n>", "Quote refresh frequency", "2000")
    .option("--price-improvement <mode>", "join | dime | ignore", "ignore")
    .option("--no-post-only", "Allow non-post-only orders")
    .option("--release", "Build/run release binary")
    .option("--yes", "Required for gated run")
    .action((action: string, opts: Record<string, unknown>) => {
      const mmOptions = readOnchainMmOptions(opts);
      if (action === "status") {
        print({ success: true, data: getOnchainMmStatus(), output: JSON.stringify(getOnchainMmStatus(), null, 2) });
        return;
      }
      if (action === "build" || action === "install") {
        const result = buildOnchainMm(mmOptions);
        print({ success: result.ok, data: result, output: JSON.stringify(result, null, 2), ...(result.ok ? {} : { error: result.error || "build failed" }) });
        return;
      }
      if (action === "plan") {
        const plan = buildOnchainMmPlan(mmOptions);
        print({ success: true, data: plan, output: JSON.stringify(plan, null, 2) });
        return;
      }
      if (action === "run") {
        runOnchainMm(mmOptions);
        return;
      }
      print({ success: false, error: `unknown onchain-mm action: ${action}` });
    });

  cmd
    .command("python-agent")
    .description("Run the Python Phoenix perps agent directly")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .argument("[args...]", "Arguments passed to perps_agent.py")
    .action((args: string[]) => runPerpsAgent(args.length ? args : ["health"], { requirePythonAgent: true }));

  cmd
    .command("vulcan")
    .description("Run Vulcan directly, or the Python agent when CLAWD_PERPS_AGENT_PATH is available")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .argument("[args...]", "Arguments passed to Vulcan")
    .option("--raw", "Bypass the Python agent and invoke the Vulcan binary directly")
    .action((args: string[], opts: { raw?: boolean }) => {
      if (opts.raw) runVulcan(args.length ? args : ["--help"]);
      runPerpsAgent(args.length ? args : ["health"]);
    });

  for (const name of [
    "context",
    "preflight",
    "twap",
    "grid",
    "ta",
    "runs",
    "status",
    "monitor",
    "wait-next-tick",
    "report",
    "reconcile-grid",
    "pause",
    "stop",
    "resume",
    "finalize",
  ]) {
    cmd
      .command(name)
      .description(`Delegate to Python Phoenix/Vulcan agent: ${name}`)
      .allowUnknownOption(true)
      .allowExcessArguments(true)
      .argument("[args...]", `Arguments passed to perps_agent.py ${name}`)
      .action((args: string[]) => runPerpsAgent([name, ...args], { requirePythonAgent: true }));
  }

  return cmd;
}
