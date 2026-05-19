import { fetchSnapshot, sendRelay, buildImperialRelay } from "./relay-client.js";

type TuiOptions = {
  symbols: string[];
  intervalMs: number;
  relay: boolean;
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

function render(snapshot: any, symbols: string[], status: string) {
  clear();
  const width = process.stdout.columns || 100;
  const title = "🦞👑 LOBSTER KING PERPS TUI";
  console.log(`${colors.orange}${colors.bold}${title}${colors.reset}`);
  console.log(`${colors.amber}Phoenix realtime feed · Vulcan strategy harness · Imperial relay · on-chain MM guardrails${colors.reset}`);
  console.log(`${colors.dim}${"─".repeat(Math.min(width, 100))}${colors.reset}`);
  console.log(line("symbols", symbols.join(", ")));
  console.log(line("relay", status));
  console.log(line("feed", "backrooms /feed/snapshot channels=status,conversation,perps,arena"));
  console.log("");

  console.log(`${colors.purple}${colors.bold}MARKETS${colors.reset}`);
  const markets = extractMarkets(snapshot);
  if (markets.length) {
    for (const market of markets.slice(0, 10)) console.log(`  ${formatMarket(market)}`);
  } else {
    console.log(`  ${colors.dim}Waiting for perps feed. Try: clawd-perps perps relay "wake perps feed"${colors.reset}`);
  }

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
  console.log("  q quit   r relay wakeup   g print grid   m print on-chain MM plan   h print harness");
}

export async function runPerpsTui(options: TuiOptions): Promise<void> {
  let relayStatus = options.relay ? "relay pending" : "relay off";
  let stopped = false;

  if (options.relay) {
    const result = await sendRelay({
      name: "clawd-perps-tui",
      content: buildImperialRelay(options.symbols, "tui"),
    });
    relayStatus = result.ok ? `sent ${result.url}` : `relay error: ${result.error}`;
  }

  const onData = async (chunk: Buffer) => {
    const key = chunk.toString("utf8");
    if (key === "q" || key === "\u0003") {
      stopped = true;
      showCursor();
      process.exit(0);
    }
    if (key === "r") {
      const result = await sendRelay({
        name: "clawd-perps-tui",
        content: buildImperialRelay(options.symbols, "manual-relay"),
      });
      relayStatus = result.ok ? `sent ${result.url}` : `relay error: ${result.error}`;
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
      const snapshot = await fetchSnapshot(options.symbols);
      render(snapshot, options.symbols, relayStatus);
    } catch (error) {
      render({}, options.symbols, `snapshot error: ${error instanceof Error ? error.message : "unknown"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
  }
}
