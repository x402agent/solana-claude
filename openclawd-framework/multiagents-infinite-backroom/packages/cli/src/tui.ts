/**
 * CLAWD TUI — interactive terminal interface
 *
 * Runs when `clawd` is invoked with no arguments.
 * Navigation: arrow keys or number keys, Enter to select, q/Esc to go back.
 */

import chalk from "chalk";
import readline from "readline";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
  isVulcanInstalled,
  loadTraderSnapshot,
  normalizeSymbol,
  spawnVulcanInherited,
  vulcanInstallHint,
} from "./vulcan.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  label: string;
  description: string;
  action: () => Promise<void> | void;
}

// ─── Terminal helpers ─────────────────────────────────────────────────────────

function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}

function hideCursor(): void {
  process.stdout.write("\x1b[?25l");
}

function showCursor(): void {
  process.stdout.write("\x1b[?25h");
}

function moveTo(row: number, col: number): void {
  process.stdout.write(`\x1b[${row};${col}H`);
}

function printHeader(): void {
  const width = Math.min(process.stdout.columns || 80, 100);
  const line = "─".repeat(width);

  console.log(chalk.cyan(`
 ██████╗██╗      █████╗ ██╗    ██╗██████╗
██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
██║     ██║     ███████║██║ █╗ ██║██║  ██║
██║     ██║     ██╔══██║██║███╗██║██║  ██║
╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
 ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝╚═════╝`));
  console.log(chalk.dim(`  🦞 Sovereign AI Lobster Runtime · $CLAWD on Solana · v0.1.0`));
  console.log(chalk.dim(`  ${line}`));
  console.log();
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function printStatusBar(items: Array<{ label: string; value: string; color?: string }>): void {
  const parts = items.map(({ label, value, color }) => {
    const colorFn = color ? (chalk as unknown as Record<string, (s: string) => string>)[color] : null;
    const val = colorFn ? colorFn(value) : chalk.white(value);
    return `${chalk.gray(label + ":")} ${val}`;
  });
  console.log("  " + parts.join(chalk.dim("  │  ")));
  console.log();
}

// ─── Menu renderer ────────────────────────────────────────────────────────────

async function showMenu(
  title: string,
  items: MenuItem[],
  footer = chalk.dim("  [↑↓ / 1-9] select  [Enter] confirm  [q] back"),
): Promise<void> {
  return new Promise((resolve) => {
    let selected = 0;

    function render(): void {
      clearScreen();
      printHeader();
      console.log(chalk.bold(`  ${title}\n`));

      items.forEach((item, i) => {
        const num = chalk.dim(`${i + 1}.`);
        if (i === selected) {
          console.log(
            chalk.cyan(`  ❯ ${num} `) +
            chalk.bold.white(item.label) +
            "  " +
            chalk.dim(item.description),
          );
        } else {
          console.log(
            `    ${num} ` +
            chalk.white(item.label) +
            "  " +
            chalk.dim(item.description),
          );
        }
      });

      console.log();
      console.log(footer);
    }

    render();

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    const onKey = async (
      _: unknown,
      key: { name: string; sequence: string },
    ): Promise<void> => {
      if (!key) return;

      if (key.name === "up" || key.sequence === "\x1b[A") {
        selected = (selected - 1 + items.length) % items.length;
        render();
      } else if (key.name === "down" || key.sequence === "\x1b[B") {
        selected = (selected + 1) % items.length;
        render();
      } else if (key.name === "return" || key.name === "enter") {
        cleanup();
        await items[selected].action();
        resolve();
      } else if (key.sequence >= "1" && key.sequence <= "9") {
        const idx = parseInt(key.sequence) - 1;
        if (idx < items.length) {
          selected = idx;
          cleanup();
          await items[idx].action();
          resolve();
        }
      } else if (key.name === "q" || key.name === "escape" || key.sequence === "\x03") {
        cleanup();
        resolve();
      }
    };

    function cleanup(): void {
      process.stdin.removeListener("keypress", onKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      showCursor();
    }

    process.stdin.on("keypress", onKey);
  });
}

// ─── Prompt helper ────────────────────────────────────────────────────────────

async function prompt(question: string): Promise<string> {
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  showCursor();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(chalk.cyan(`  ? ${question} `) + chalk.dim("→ "), (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function pressAnyKey(msg = "Press any key to continue..."): Promise<void> {
  return new Promise((resolve) => {
    console.log(chalk.dim(`\n  ${msg}`));
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.once("keypress", () => {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      resolve();
    });
  });
}

// ─── Section: Backroom ────────────────────────────────────────────────────────

async function menuBackroom(): Promise<void> {
  const items: MenuItem[] = [
    {
      label: "Status",
      description: "Show Upstash Box + automaton status",
      action: () => runCliCommand(["status"]),
    },
    {
      label: "Run conversation",
      description: "8-turn structured backroom debate",
      action: async () => {
        const topic = await prompt("Topic (Enter for random)");
        const args = topic ? ["run", "--topic", topic] : ["run"];
        await runCliCommand(args);
      },
    },
    {
      label: "Stream conversation",
      description: "Live-streamed backroom debate",
      action: () => runCliCommand(["stream"]),
    },
    {
      label: "Logs",
      description: "Tail box logs",
      action: async () => {
        const n = await prompt("Lines to tail (default 20)");
        await runCliCommand(["logs", "--tail", n || "20"]);
      },
    },
    {
      label: "Files",
      description: "List files in Upstash Box",
      action: () => runCliCommand(["files"]),
    },
    {
      label: "Deploy",
      description: "Deploy backroom server to box",
      action: () => runCliCommand(["deploy"]),
    },
    {
      label: "Execute command",
      description: "Run a shell command in the box",
      action: async () => {
        const cmd = await prompt("Command");
        if (cmd) await runCliCommand(["exec", cmd]);
      },
    },
    { label: "← Back", description: "", action: async () => {} },
  ];
  await showMenu("🦞  Backroom", items);
}

// ─── Section: Wallet ─────────────────────────────────────────────────────────

async function menuWallet(): Promise<void> {
  clearScreen();
  printHeader();
  console.log(chalk.bold("  💰  Wallet\n"));

  const configPath = path.join(process.env.HOME || "~", ".automaton", "automaton.json");
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      console.log(chalk.gray("  Agent wallet:"));
      console.log(chalk.white(`    ${cfg.walletAddress || "not set"}`));
      console.log();
      if (cfg.walletAddress) {
        console.log(chalk.dim("  To fund: send USDC to the address above on Solana mainnet."));
        console.log(chalk.dim("  To feed: send $CLAWD to the same address."));
        console.log(chalk.dim("  CA: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump"));
      }
    } catch {
      console.log(chalk.yellow("  Could not read wallet config."));
    }
  } else {
    console.log(chalk.yellow("  No automaton configured yet."));
    console.log(chalk.dim("  Run: clawd spawn"));
  }

  const items: MenuItem[] = [
    {
      label: "Fund (USDC)",
      description: "Show USDC deposit instructions",
      action: async () => {
        const amt = await prompt("Amount in USDC");
        if (amt) await runCliCommand(["fund", amt]);
      },
    },
    {
      label: "Feed ($CLAWD)",
      description: "Show $CLAWD deposit instructions",
      action: async () => {
        const amt = await prompt("Amount in $CLAWD");
        if (amt) await runCliCommand(["feed", amt]);
      },
    },
    { label: "← Back", description: "", action: async () => {} },
  ];
  await showMenu("💰  Wallet", items);
}

// ─── Section: Perps ──────────────────────────────────────────────────────────

function vulcanInstalled(): boolean {
  return isVulcanInstalled();
}

async function menuPerps(): Promise<void> {
  if (!vulcanInstalled()) {
    clearScreen();
    printHeader();
    console.log(chalk.bold("  📈  Perps — Phoenix via Vulcan\n"));
    console.log(chalk.yellow("  ⚠️  Vulcan CLI not found.\n"));
    console.log(chalk.white("  Install it:"));
    console.log(chalk.cyan(`  ${vulcanInstallHint()}\n`));
    console.log(chalk.dim("  Make sure ~/.local/bin is on your PATH, then restart.\n"));
    await pressAnyKey();
    return;
  }

  const symbols = ["SOL", "BTC", "ETH", "JLP", "JTO"];

  const items: MenuItem[] = [
    {
      label: "Clawd Perpetual Trader",
      description: "Live market snapshot + health + paper-safe launchpad",
      action: menuPerpetualTrader,
    },
    {
      label: "Health / onboarding",
      description: "Skills, MCP, config, paper readiness",
      action: () => runVulcan(["agent", "health"]),
    },
    {
      label: "Live preflight",
      description: "Read-only wallet/collateral readiness check",
      action: () => runVulcan(["strategy", "preflight"]),
    },
    {
      label: "Markets",
      description: "List all Phoenix perp markets",
      action: () => runVulcan(["market", "list"]),
    },
    {
      label: "Ticker",
      description: "Live price ticker for a market",
      action: async () => {
        const sym = await prompt(`Symbol (${symbols.join("/")})`);
        await runVulcan(["market", "ticker", (sym || "SOL").toUpperCase()]);
      },
    },
    {
      label: "Orderbook",
      description: "Top-of-book snapshot",
      action: async () => {
        const sym = await prompt(`Symbol (${symbols.join("/")})`);
        await runVulcan(["market", "orderbook", (sym || "SOL").toUpperCase()]);
      },
    },
    {
      label: "Portfolio",
      description: "Margin health + open positions + funding",
      action: () => runVulcan(["portfolio"]),
    },
    {
      label: "Positions",
      description: "Open positions with unrealized PnL",
      action: () => runVulcan(["position", "list"]),
    },
    {
      label: "─── Paper trading ───",
      description: "",
      action: async () => menuPaper(),
    },
    {
      label: "─── Live trading ─── ⚠️",
      description: "Real funds — irreversible",
      action: async () => menuLiveTrade(),
    },
    {
      label: "─── Strategies ───",
      description: "TWAP · Grid · TA",
      action: async () => menuStrategies(),
    },
    {
      label: "Setup Vulcan agent (MCP)",
      description: "Install skills + MCP server for Claude Code",
      action: () => runVulcan(["agent", "install", "--target", "claude", "--scope", "user"]),
    },
    { label: "← Back", description: "", action: async () => {} },
  ];
  await showMenu("📈  Perps — Phoenix", items);
}

async function menuPerpetualTrader(): Promise<void> {
  clearScreen();
  printHeader();
  console.log(chalk.bold("  🦞  Clawd Perpetual Trader\n"));
  console.log(chalk.dim("  Loading Phoenix live data, portfolio, positions, and agent health...\n"));

  const snapshot = await loadTraderSnapshot("SOL");
  printStatusBar([
    { label: "source", value: snapshot.source, color: snapshot.source === "live" ? "green" : "yellow" },
    { label: "mode", value: "paper default", color: "cyan" },
    { label: "markets", value: String(snapshot.markets.length), color: "white" },
  ]);

  console.log(chalk.cyan("  Markets"));
  for (const market of snapshot.markets.slice(0, 8)) {
    const price = market.markPrice > 0 ? `$${market.markPrice.toFixed(4)}` : "n/a";
    const funding = `${(market.fundingRate * 100).toFixed(4)}%`;
    console.log(`  ${chalk.white(market.symbol.padEnd(8))} ${chalk.yellow(price.padEnd(14))} ${chalk.gray("funding")} ${funding}`);
  }
  console.log();
  console.log(chalk.dim("  Live actions require an explicit prompt and pass --yes only after confirmation."));
  await pressAnyKey();

  const items: MenuItem[] = [
    {
      label: "Paper long",
      description: "No real funds; uses live Phoenix price context",
      action: async () => {
        const sym = normalizeSymbol(await prompt("Symbol (e.g. SOL)"));
        const amt = await prompt("Notional USDC (e.g. 100)");
        await runVulcan(["paper", "buy", sym, "--notional-usdc", amt || "100", "--type", "market"]);
      },
    },
    {
      label: "Paper short",
      description: "No real funds; uses live Phoenix price context",
      action: async () => {
        const sym = normalizeSymbol(await prompt("Symbol (e.g. SOL)"));
        const amt = await prompt("Notional USDC (e.g. 100)");
        await runVulcan(["paper", "sell", sym, "--notional-usdc", amt || "100", "--type", "market"]);
      },
    },
    {
      label: "TA report",
      description: "RSI/MACD/BBands/ATR/ADX market-intel snapshot",
      action: async () => {
        const sym = normalizeSymbol(await prompt("Symbol (e.g. SOL)"));
        const tf = await prompt("Timeframe (default 1h)");
        await runVulcan(["ta", "report", sym, "--timeframe", tf || "1h"]);
      },
    },
    {
      label: "Start paper TWAP",
      description: "First-class Vulcan runner with ledger and tick logs",
      action: async () => {
        const sym = normalizeSymbol(await prompt("Symbol (e.g. SOL)"));
        const side = await prompt("Side (buy/sell)");
        const amt = await prompt("Total notional USDC");
        const slices = await prompt("Slices");
        const interval = await prompt("Interval seconds");
        await runVulcan(["strategy", "twap", "start", "--symbol", sym, "--side", side || "buy", "--notional-usdc", amt || "100", "--slices", slices || "5", "--interval-seconds", interval || "30", "--mode", "paper"]);
      },
    },
    {
      label: "Strategy monitor",
      description: "Poll compact status by run id",
      action: async () => {
        const runId = await prompt("Run ID");
        if (runId) await runVulcan(["strategy", "monitor", runId]);
      },
    },
    { label: "← Back", description: "", action: async () => {} },
  ];
  await showMenu("🦞  Clawd Perpetual Trader", items);
}

async function menuPaper(): Promise<void> {
  const items: MenuItem[] = [
    {
      label: "Init paper account",
      description: "Start with $10,000 simulated USDC",
      action: () => runVulcan(["paper", "init", "--balance", "10000"]),
    },
    {
      label: "Paper status",
      description: "View paper portfolio",
      action: () => runVulcan(["paper", "status"]),
    },
    {
      label: "Paper long",
      description: "Buy a market in paper mode",
      action: async () => {
        const sym = await prompt("Symbol (e.g. SOL)");
        const amt = await prompt("Notional USDC (e.g. 100)");
        await runVulcan(["paper", "buy", (sym || "SOL").toUpperCase(), "--notional-usdc", amt || "100", "--type", "market"]);
      },
    },
    {
      label: "Paper short",
      description: "Sell a market in paper mode",
      action: async () => {
        const sym = await prompt("Symbol (e.g. SOL)");
        const amt = await prompt("Notional USDC (e.g. 100)");
        await runVulcan(["paper", "sell", (sym || "SOL").toUpperCase(), "--notional-usdc", amt || "100", "--type", "market"]);
      },
    },
    { label: "← Back", description: "", action: async () => {} },
  ];
  await showMenu("📄  Paper Trading (no real funds)", items);
}

async function menuLiveTrade(): Promise<void> {
  clearScreen();
  printHeader();
  console.log(chalk.red.bold("  ⚠️  LIVE TRADING — REAL FUNDS\n"));
  console.log(chalk.yellow("  All live trades execute irreversible on-chain transactions on Solana Mainnet."));
  console.log(chalk.yellow("  You are responsible for wallet security and all trading outcomes.\n"));

  const items: MenuItem[] = [
    {
      label: "Long",
      description: "Open a long position (market order)",
      action: async () => {
        const sym = await prompt("Symbol (e.g. SOL)");
        const amt = await prompt("Notional USDC (e.g. 200)");
        const confirm = await prompt(`Confirm LIVE long ${sym?.toUpperCase() || "SOL"} $${amt}? (yes/no)`);
        if (confirm.toLowerCase() === "yes") {
          await runVulcan(["trade", "market-buy", normalizeSymbol(sym), "--notional-usdc", amt || "100", "--yes"]);
        }
      },
    },
    {
      label: "Short",
      description: "Open a short position (market order)",
      action: async () => {
        const sym = await prompt("Symbol (e.g. SOL)");
        const amt = await prompt("Notional USDC (e.g. 200)");
        const confirm = await prompt(`Confirm LIVE short ${sym?.toUpperCase() || "SOL"} $${amt}? (yes/no)`);
        if (confirm.toLowerCase() === "yes") {
          await runVulcan(["trade", "market-sell", normalizeSymbol(sym), "--notional-usdc", amt || "100", "--yes"]);
        }
      },
    },
    {
      label: "Close position",
      description: "Close an open position",
      action: async () => {
        const sym = await prompt("Symbol (e.g. SOL)");
        const confirm = await prompt(`Confirm CLOSE ${sym?.toUpperCase() || "SOL"}? (yes/no)`);
        if (confirm.toLowerCase() === "yes") {
          await runVulcan(["position", "close", normalizeSymbol(sym), "--yes"]);
        }
      },
    },
    {
      label: "Set TP / SL",
      description: "Attach take-profit and stop-loss",
      action: async () => {
        const sym = await prompt("Symbol (e.g. SOL)");
        const tp = await prompt("Take-profit price");
        const sl = await prompt("Stop-loss price");
        await runVulcan(["trade", "set-tpsl", normalizeSymbol(sym), "--tp", tp, "--sl", sl, "--yes"]);
      },
    },
    { label: "← Back", description: "", action: async () => {} },
  ];
  await showMenu("⚠️  Live Trading", items);
}

async function menuStrategies(): Promise<void> {
  const items: MenuItem[] = [
    {
      label: "TWAP",
      description: "Split order into timed slices",
      action: async () => {
        const sym = await prompt("Symbol (e.g. SOL)");
        const side = await prompt("Side (buy/sell)");
        const amt = await prompt("Total notional USDC");
        const slices = await prompt("Number of slices (e.g. 10)");
        const interval = await prompt("Interval seconds (e.g. 60)");
        const mode = await prompt("Mode (paper/dry_run/auto_execute)");
        await runVulcan([
          "strategy", "twap", "start",
          "--symbol", (sym || "SOL").toUpperCase(),
          "--side", side || "buy",
          "--notional-usdc", amt || "500",
          "--slices", slices || "10",
          "--interval-seconds", interval || "60",
          "--mode", mode || "paper",
          "-o", "json",
        ]);
      },
    },
    {
      label: "Grid",
      description: "Layered limit orders across a range",
      action: async () => {
        const sym = await prompt("Symbol (e.g. SOL)");
        const lower = await prompt("Lower price");
        const upper = await prompt("Upper price");
        const levels = await prompt("Grid levels (e.g. 10)");
        const mode = await prompt("Mode (paper/dry_run/auto_execute)");
        await runVulcan([
          "strategy", "grid", "start",
          "--symbol", (sym || "SOL").toUpperCase(),
          "--lower-price", lower,
          "--upper-price", upper,
          "--levels", levels || "10",
          "--mode", mode || "paper",
        ]);
      },
    },
    {
      label: "TA strategy",
      description: "Rule-based entry/exit on indicators",
      action: async () => {
        const sym = await prompt("Symbol (e.g. SOL)");
        const tf = await prompt("Timeframe (1m/5m/15m/1h)");
        console.log(chalk.dim("\n  Example entries: RSI<30, EMA9>EMA21"));
        const entry = await prompt("Entry condition");
        const exit_ = await prompt("Exit condition");
        const mode = await prompt("Mode (paper/dry_run/auto_execute)");
        await runVulcan([
          "strategy", "ta", "start",
          "--symbol", (sym || "SOL").toUpperCase(),
          "--timeframe", tf || "5m",
          "--entry", entry || "RSI<30",
          "--exit", exit_ || "RSI>70",
          "--mode", mode || "paper",
        ]);
      },
    },
    {
      label: "Strategy runs",
      description: "List active and completed runs",
      action: () => runVulcan(["strategy", "runs"]),
    },
    { label: "← Back", description: "", action: async () => {} },
  ];
  await showMenu("⚡  Strategies", items);
}

// ─── Spawn ────────────────────────────────────────────────────────────────────

async function menuSpawn(): Promise<void> {
  clearScreen();
  printHeader();
  console.log(chalk.bold("  🦞  Spawn CLAWD Automation\n"));
  console.log(chalk.dim("  This will launch the sovereign agent runtime."));
  console.log(chalk.dim("  On first run it generates a wallet and runs the setup wizard.\n"));

  const confirm = await prompt("Spawn the automaton? (yes/no)");
  if (confirm.toLowerCase() !== "yes") return;

  const selfDir = new URL("..", import.meta.url).pathname;
  const candidates = [
    path.resolve(selfDir, "../../automaton-main/dist/index.js"),
    path.resolve(process.cwd(), "automaton-main/dist/index.js"),
  ];
  const runtimeIndex = candidates.find((candidate) => fs.existsSync(candidate));

  if (!runtimeIndex) {
    clearScreen();
    console.log(chalk.red("\n  ❌  automaton-main not built."));
    console.log(chalk.dim("  From a repo checkout, build it with:"));
    console.log(chalk.cyan("  cd openclawd-framework/multiagents-infinite-backroom/automaton-main && npm install && npm run build\n"));
    console.log(chalk.dim("  Checked:"));
    for (const candidate of candidates) {
      console.log(chalk.dim(`  - ${candidate}`));
    }
    console.log();
    await pressAnyKey();
    return;
  }

  showCursor();
  console.log(chalk.cyan("\n  🦞  Spawning...\n"));
  const child = spawn("node", [runtimeIndex, "--run"], { stdio: "inherit" });
  await new Promise<void>((resolve) => child.on("exit", () => resolve()));
}

// ─── Command runners ─────────────────────────────────────────────────────────

async function runCliCommand(args: string[]): Promise<void> {
  clearScreen();
  showCursor();
  console.log(chalk.dim(`\n  $ clawd ${args.join(" ")}\n`));

  const selfPath = new URL(import.meta.url).pathname;
  const child = spawn("node", [selfPath.replace("/tui.js", "/index.js"), ...args], {
    stdio: "inherit",
  });
  await new Promise<void>((resolve) => child.on("exit", () => resolve()));
  await pressAnyKey();
}

async function runVulcan(args: string[]): Promise<void> {
  clearScreen();
  showCursor();
  console.log(chalk.dim(`\n  $ vulcan ${args.join(" ")}\n`));
  const child = spawnVulcanInherited(args);
  await new Promise<void>((resolve) => child.on("exit", () => resolve()));
  await pressAnyKey();
}

// ─── Main TUI loop ────────────────────────────────────────────────────────────

export async function runTUI(): Promise<void> {
  hideCursor();

  const mainMenu: MenuItem[] = [
    {
      label: "🦞  Backroom",
      description: "Two AI agents trapped in infinite debate",
      action: menuBackroom,
    },
    {
      label: "📈  Perps",
      description: "Phoenix perpetuals via Vulcan CLI",
      action: menuPerps,
    },
    {
      label: "💰  Wallet",
      description: "Fund + feed the leviathan",
      action: menuWallet,
    },
    {
      label: "🚀  Spawn automaton",
      description: "Launch the sovereign agent runtime",
      action: menuSpawn,
    },
    {
      label: "❌  Exit",
      description: "The backroom will remember you",
      action: async () => {
        showCursor();
        clearScreen();
        console.log(chalk.cyan("\n  🦞  The shell molts. The laws do not.\n"));
        process.exit(0);
      },
    },
  ];

  while (true) {
    await showMenu("Main Menu", mainMenu, chalk.dim("  [↑↓ / 1-5] navigate  [Enter] select  [q] exit"));
  }
}
