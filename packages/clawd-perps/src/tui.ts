import {
  buildImperialRelay,
  feedWsUrl,
  fetchSnapshot,
  flyBackroomsDashboardUrl,
  pumpfunUiUrl,
  pumpfunWsUrl,
  relayUrls,
  sendRelayFanout,
} from "./relay-client.js";
import { getOnchainMmStatus } from "./onchain-market-maker.js";

type TuiOptions = {
  symbols: string[];
  intervalMs: number;
  relay: boolean;
  channels?: string;
  pumpfunLimit?: number;
};

const ESC = "\x1b[";
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  green: "\x1b[38;2;20;241;149m",
  purple: "\x1b[38;2;153;69;255m",
  amber: "\x1b[38;2;255;209;102m",
  orange: "\x1b[38;2;255;95;31m",
  red: "\x1b[38;2;255;87;87m",
};

function clear() {
  process.stdout.write(`${ESC}?25l${ESC}2J${ESC}H`);
}

function showCursor() {
  process.stdout.write(`${ESC}?25h${colors.reset}`);
}

function truncate(value: string, width: number): string {
  if (value.length <= width) return value.padEnd(width, " ");
  return `${value.slice(0, Math.max(0, width - 1))}…`;
}

function line(label: string, value: unknown, width = 86): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return `${colors.dim}${label.padEnd(16)}${colors.reset}${truncate(raw ?? "-", width)}`;
}

function boolFlag(value: boolean): string {
  return value ? `${colors.green}yes${colors.reset}` : `${colors.red}no${colors.reset}`;
}

function pick(obj: any, path: string): any {
  return path.split(".").reduce((cur, part) => cur?.[part], obj);
}

function formatMarket(market: any): string {
  const symbol = market?.symbol || market?.market || market?.name || "?";
  const mark =
    market?.markPrice ??
    market?.mark ??
    market?.price ??
    market?.markPriceParameters?.markPrice ??
    market?.data?.markPrice ??
    "-";
  const funding = market?.fundingRate ?? market?.fundingRatePercentage ?? market?.imperialFunding ?? "-";
  const oi = market?.openInterest ?? market?.oi ?? "-";
  return `${String(symbol).padEnd(10)} mark=${String(mark).padEnd(14)} funding=${String(funding).padEnd(12)} oi=${oi}`;
}

function extractMarkets(snapshot: any): any[] {
  const candidates = [
    pick(snapshot, "perps.markets"),
    pick(snapshot, "perps.data.markets"),
    pick(snapshot, "perps.snapshot.markets"),
    pick(snapshot, "arena.markets"),
    pick(snapshot, "arena.data.markets"),
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function extractConversation(snapshot: any): string[] {
  const raw = pick(snapshot, "conversation.raw") || pick(snapshot, "conversation.tail") || "";
  return String(raw)
    .split("\n")
    .filter(Boolean)
    .slice(-7);
}

function extractPumpfun(snapshot: any): any[] {
  const candidates = [
    pick(snapshot, "pumpfun.tokens"),
    pick(snapshot, "pumpfun.summary.tokens"),
    pick(snapshot, "pumpfun.data.tokens"),
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function formatPumpToken(token: any): string {
  const symbol = token?.symbol || token?.ticker || token?.name || "?";
  const score = token?.score ?? token?.hotness ?? token?.qualityScore ?? "-";
  const mint = token?.mint ? String(token.mint).slice(0, 6) + "…" + String(token.mint).slice(-4) : "-";
  const cap = token?.marketCapSol ?? token?.marketCap ?? token?.market_cap ?? "-";
  return `${String(symbol).padEnd(10)} score=${String(score).padEnd(6)} cap=${String(cap).padEnd(10)} mint=${mint}`;
}

function extractImperial(snapshot: any): any {
  return (
    pick(snapshot, "perps.imperial") ||
    pick(snapshot, "perps.overview.imperial") ||
    pick(snapshot, "arena.imperial") ||
    {}
  );
}

function formatRelayStatus(status: string): string {
  return status.length > 116 ? `${status.slice(0, 113)}...` : status;
}

function renderVulcanVisual(symbols: string[]) {
  const mm = getOnchainMmStatus();
  console.log(`${colors.purple}${colors.bold}VULCAN STRATEGY MAP${colors.reset}`);
  console.log(`  market → paper → strategy ledger → monitor → pause/resume/finalize`);
  console.log(`  TWAP: clawd-perps perps twap ${symbols[0] || "SOL"} --side buy --notional-usdc 500 --slices 5 --mode paper`);
  console.log(`  GRID: clawd-perps perps grid ${symbols[0] || "SOL"} --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5`);
  console.log(`  TA  : clawd-perps perps ta start --config-file ./ema-cross.json --mode paper`);
  console.log(`  on-chain MM built=${boolFlag(Boolean(mm.binaryBuilt))} live=${boolFlag(Boolean(mm.liveEnabled && mm.operatorConfirmed))}`);
}

function render(snapshot: any, symbols: string[], status: string) {
  clear();
  const width = process.stdout.columns || 100;
  const title = "🦞👑 LOBSTER KING PERPS TUI";
  console.log(`${colors.orange}${colors.bold}${title}${colors.reset}`);
  console.log(`${colors.amber}Phoenix realtime feed · Vulcan strategy harness · Imperial relay · Pump.fun tape · on-chain MM guardrails${colors.reset}`);
  console.log(`${colors.dim}${"─".repeat(Math.min(width, 100))}${colors.reset}`);
  console.log(line("symbols", symbols.join(", ")));
  console.log(line("relay", formatRelayStatus(status)));
  console.log(line("feed", "channels=status,agents,conversation,perps,arena,pumpfun"));
  console.log(line("ws feed", feedWsUrl(symbols), Math.min(width - 18, 104)));
  console.log("");

  console.log(`${colors.purple}${colors.bold}MARKETS${colors.reset}`);
  const markets = extractMarkets(snapshot);
  if (markets.length) {
    for (const market of markets.slice(0, 10)) console.log(`  ${formatMarket(market)}`);
  } else {
    console.log(`  ${colors.dim}Waiting for perps feed. Try: clawd-perps perps relay "wake perps feed"${colors.reset}`);
  }

  console.log("");
  const imperial = extractImperial(snapshot);
  console.log(`${colors.orange}${colors.bold}IMPERIAL ROUTING${colors.reset}`);
  console.log(`  wallet=${process.env.IMPERIAL_WALLET ? "configured" : "missing"} jwt=${process.env.IMPERIAL_JWT ? "present" : "missing"} live=${process.env.IMPERIAL_LIVE === "true" ? "armed" : "dry"}`);
  console.log(`  route=${truncate(JSON.stringify(imperial?.route || imperial?.status || imperial || "awaiting feed"), Math.min(width - 4, 110))}`);

  console.log("");
  const pumpTokens = extractPumpfun(snapshot);
  const pumpStatus = pick(snapshot, "pumpfun.status") || {};
  console.log(`${colors.green}${colors.bold}PUMP.FUN LIVE TAPE${colors.reset}`);
  console.log(`  source=${pumpfunWsUrl() || "set CLAWD_PUMPFUN_WS_URL"} ui=${pumpfunUiUrl() || "set CLAWD_PUMPFUN_UI_URL"} connected=${pumpStatus.connected ?? "?"}`);
  if (pumpTokens.length) {
    for (const token of pumpTokens.slice(0, 5)) console.log(`  ${formatPumpToken(token)}`);
  } else {
    console.log(`  ${colors.dim}No pumpfun tokens in snapshot. Feed may require CLAWD_BACKROOM_TOKEN.${colors.reset}`);
  }

  console.log("");
  renderVulcanVisual(symbols);

  console.log("");
  console.log(`${colors.amber}${colors.bold}RELAY MESH${colors.reset}`);
  console.log(`  post=${relayUrls().join(" | ")}`);
  console.log(`  fly=${flyBackroomsDashboardUrl() || "set CLAWD_FLY_BACKROOMS_URL"}`);

  console.log("");
  console.log(`${colors.green}${colors.bold}AGENT TAPE${colors.reset}`);
  const convo = extractConversation(snapshot);
  if (convo.length) {
    for (const entry of convo) console.log(`  ${truncate(entry, Math.min(width - 4, 110))}`);
  } else {
    console.log(`  ${colors.dim}No conversation tail yet.${colors.reset}`);
  }

  console.log("");
  console.log(`${colors.amber}${colors.bold}HOTKEYS${colors.reset}`);
  console.log("  q quit   r relay fanout   g grid   m on-chain MM plan   p pump source   v vulcan status   h harness");
}

export async function runPerpsTui(options: TuiOptions): Promise<void> {
  let relayStatus = options.relay ? "relay pending" : "relay off";
  let stopped = false;

  if (options.relay) {
    const result = await sendRelayFanout({
      name: "clawd-perps-tui",
      content: buildImperialRelay(options.symbols, "tui"),
    });
    relayStatus = result.ok ? `sent ${result.results.filter((item) => item.ok).length}/${result.results.length}` : `relay error: ${result.error}`;
  }

  const onData = async (chunk: Buffer) => {
    const key = chunk.toString("utf8");
    if (key === "q" || key === "\u0003") {
      stopped = true;
      showCursor();
      process.exit(0);
    }
    if (key === "r") {
      const result = await sendRelayFanout({
        name: "clawd-perps-tui",
        content: buildImperialRelay(options.symbols, "manual-relay"),
      });
      relayStatus = result.ok ? `sent ${result.results.filter((item) => item.ok).length}/${result.results.length}` : `relay error: ${result.error}`;
    }
    if (key === "g") {
      console.log("\nclawd-perps perps grid SOL --center-on-mark --width-pct 2.5 --levels-per-side 5 --tokens-per-level 0.5 --detached\n");
    }
    if (key === "h") {
      console.log("\nclawd-perps perps harness --symbols SOL,BTC,ETH --relay\n");
    }
    if (key === "m") {
      console.log("\nclawd-perps perps onchain-mm plan --market <PHOENIX_MARKET> --ticker SOL-USD --rpc-url local\n");
    }
    if (key === "p") {
      console.log(`\nPump.fun source: ${pumpfunWsUrl() || "set CLAWD_PUMPFUN_WS_URL"}\nPump.fun UI: ${pumpfunUiUrl() || "set CLAWD_PUMPFUN_UI_URL"}\n`);
    }
    if (key === "v") {
      console.log("\nvulcan status -o json\nvulcan strategy runs -o json\nvulcan agent health\n");
    }
  };

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  }

  process.on("exit", showCursor);
  process.on("SIGINT", () => {
    showCursor();
    process.exit(0);
  });

  while (!stopped) {
    try {
      const snapshot = await fetchSnapshot(
        options.symbols,
        options.channels || "status,agents,conversation,perps,arena,pumpfun",
        options.pumpfunLimit || 40,
      );
      render(snapshot, options.symbols, relayStatus);
    } catch (error) {
      render({}, options.symbols, `snapshot error: ${error instanceof Error ? error.message : "unknown"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
  }
}
