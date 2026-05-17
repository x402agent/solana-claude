#!/usr/bin/env node
import { createInterface } from "node:readline";
import chalk from "chalk";

const CLEAR = "\x1b[2J\x1b[H";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const SPARK = ["_", ".", "-", "~", "^", "*", "#", "@"];

interface TickEvent {
  event: "tick" | "start" | "done" | "killswitch";
  tick?: number;
  ticks?: number;
  now?: string;
  price?: number;
  decision?: { action: string; reason: string; side?: string; size_lamports?: number; position_id?: string };
  outcome?: string;
  total_pnl_lamports?: number;
  cash_lamports?: number;
  positions?: number;
  consecutive_losses?: number;
  molt_note?: string;
  goblin?: boolean;
}

const display = {
  goblin: false,
  lastTick: 0,
  totalTicks: 0,
  price: 0,
  priceHistory: [] as number[],
  lastDecision: null as TickEvent["decision"] | null,
  lastOutcome: "",
  totalPnl: 0,
  cash: 0,
  openPositions: 0,
  consecutiveLosses: 0,
  log: [] as string[],
  done: false,
  killswitch: false,
};

function visibleLength(value: string): number {
  return value.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function sparkline(prices: number[], width = 30): string {
  if (prices.length < 2) return chalk.gray(".".repeat(width));
  const slice = prices.slice(-width);
  const min = Math.min(...slice);
  const max = Math.max(...slice);
  const range = max - min || 1;
  return slice
    .map((price, index) => {
      const idx = Math.round(((price - min) / range) * (SPARK.length - 1));
      const bar = SPARK[idx] ?? "-";
      const prev = slice[Math.max(0, index - 1)] ?? price;
      return price >= prev ? chalk.green(bar) : chalk.red(bar);
    })
    .join("");
}

function pnlColor(n: number): string {
  const s = `${n >= 0 ? "+" : ""}${n.toLocaleString()} lamports`;
  return n >= 0 ? chalk.green(s) : chalk.red(s);
}

function row(content: string, width: number): string {
  return chalk.magenta("|") + content + " ".repeat(Math.max(0, width - visibleLength(content))) + chalk.magenta("|");
}

function render(): void {
  const width = Math.max(80, process.stdout.columns ?? 100) - 2;
  const border = chalk.magenta("=".repeat(width));
  const lines: string[] = [];
  const title = display.goblin ? "  GOBLIN MODE - OODA Paper Loop / devnet / no keys  " : "  DARK RALPH - OODA Paper Loop / devnet / no keys  ";
  const pct = display.totalTicks > 0 ? display.lastTick / display.totalTicks : 0;
  const barW = Math.max(12, width - 28);
  const filled = Math.round(pct * barW);
  const progress = `${chalk.cyan("#".repeat(filled))}${chalk.gray("-".repeat(barW - filled))}`;
  const dec = display.lastDecision;
  const actionColor = dec?.action === "open" ? chalk.green : dec?.action === "close" ? chalk.red : chalk.gray;

  lines.push(chalk.magenta("+") + border + chalk.magenta("+"));
  lines.push(row(chalk.bold.magenta(title), width));
  lines.push(chalk.magenta("+") + border + chalk.magenta("+"));
  lines.push(row(`  Tick ${display.lastTick}/${display.totalTicks} [${progress}] ${Math.round(pct * 100)}%`, width));
  lines.push(row(`  Price ${(display.price / 1000).toFixed(3)}  ${sparkline(display.priceHistory, Math.min(44, width - 24))}`, width));
  lines.push(row(`  Decision ${actionColor((dec?.action ?? "--").toUpperCase())} ${chalk.white((dec?.reason ?? "waiting").slice(0, 82))} ${chalk.cyan(display.lastOutcome)}`, width));
  lines.push(chalk.magenta("+") + border + chalk.magenta("+"));
  lines.push(row(`  PnL ${pnlColor(display.totalPnl)}  |  Cash ${chalk.cyan(display.cash.toLocaleString())} lam  |  Positions ${chalk.yellow(display.openPositions)}  |  Losses ${display.consecutiveLosses > 0 ? chalk.red(display.consecutiveLosses) : chalk.gray("0")}`, width));
  lines.push(chalk.magenta("+") + border + chalk.magenta("+"));
  for (const entry of display.log.slice(-7)) lines.push(row(entry, width));
  if (display.done) {
    lines.push(chalk.magenta("+") + border + chalk.magenta("+"));
    lines.push(row(display.killswitch ? chalk.red.bold("  KILLSWITCH TRIGGERED") : chalk.green.bold("  Loop complete - journal written"), width));
  }
  lines.push(chalk.magenta("+") + border + chalk.magenta("+"));
  process.stdout.write(`${CLEAR}${lines.join("\n")}\n`);
}

process.stdout.write(HIDE_CURSOR);
process.on("exit", () => process.stdout.write(SHOW_CURSOR));
process.on("SIGINT", () => {
  process.stdout.write(SHOW_CURSOR);
  process.exit(0);
});

const rl = createInterface({ input: process.stdin });

rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const ev = JSON.parse(line) as TickEvent;
    if (ev.event === "start") {
      display.totalTicks = ev.ticks ?? 50;
      display.goblin = Boolean(ev.goblin);
    } else if (ev.event === "tick") {
      display.lastTick = ev.tick ?? display.lastTick;
      display.price = ev.price ?? display.price;
      display.priceHistory.push(display.price);
      if (display.priceHistory.length > 60) display.priceHistory.shift();
      display.lastDecision = ev.decision ?? display.lastDecision;
      display.lastOutcome = ev.outcome ?? "";
      display.totalPnl = ev.total_pnl_lamports ?? display.totalPnl;
      display.cash = ev.cash_lamports ?? display.cash;
      display.openPositions = ev.positions ?? display.openPositions;
      display.consecutiveLosses = ev.consecutive_losses ?? display.consecutiveLosses;
      display.goblin = Boolean(ev.goblin);
      const action = ev.decision?.action ?? "hold";
      const color = action === "open" ? chalk.green : action === "close" ? chalk.red : chalk.gray;
      display.log.push(`  ${chalk.gray(new Date(ev.now ?? "").toTimeString().slice(0, 8))} [${chalk.yellow(`T${ev.tick}`)}] ${color(action.toUpperCase().padEnd(5))} ${chalk.white((ev.decision?.reason ?? "").slice(0, 70))}`);
      if (ev.molt_note) display.log.push(`  ${chalk.magenta("MOLT")} ${ev.molt_note}`);
    } else if (ev.event === "killswitch") {
      display.killswitch = true;
      display.done = true;
    } else if (ev.event === "done") {
      display.done = true;
    }
    render();
  } catch {
    // Keep the TUI resilient to non-JSON stderr when piped incorrectly.
  }
});

rl.on("close", () => {
  display.done = true;
  render();
  process.stdout.write(SHOW_CURSOR);
});

