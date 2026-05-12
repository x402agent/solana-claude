#!/usr/bin/env bun
/**
 * HERMES Dark Ralph TUI — TypeScript port of dark-ralph/tui.py.
 *
 * Reads the loop's JSONL on stdin, renders a full-screen ANSI dashboard.
 * stdlib only (no React, no curses). Same wire format as the Python tui.
 *
 * Usage:
 *   bun ooda/operator.ts --tui --sleep 400 | bun ooda/tui.ts
 */

import { createInterface } from "readline";

// ── ANSI ──────────────────────────────────────────────────────────────────────
const R = "\x1b[0m";
const HOME = "\x1b[H";
const CLEAR = "\x1b[2J";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

const LOBSTER = "\x1b[38;5;160m";
const CLAW = "\x1b[38;5;124m";
const SHELL = "\x1b[38;5;94m";
const GREEN = "\x1b[38;5;46m";
const CYAN = "\x1b[38;5;51m";
const GOLD = "\x1b[38;5;220m";
const DIM = "\x1b[38;5;245m";
const BOLD = "\x1b[1m";

const SPARK = "▁▂▃▄▅▆▇█";

const LOGO = [
  "  ██╗  ██╗███████╗██████╗ ███╗   ███╗███████╗███████╗",
  "  ██║  ██║██╔════╝██╔══██╗████╗ ████║██╔════╝██╔════╝",
  "  ███████║█████╗  ██████╔╝██╔████╔██║█████╗  ███████╗",
  "  ██╔══██║██╔══╝  ██╔══██╗██║╚██╔╝██║██╔══╝  ╚════██║",
  "  ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║███████╗███████║",
  "  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝",
  `  ${GOLD}x402 OODA Loop  ·  Dark Ralph v1  ·  $CLAWD${R}`,
];

const BORDER_TOP = `${CLAW}╔${"═".repeat(78)}╗${R}`;
const BORDER_MID = `${CLAW}╠${"═".repeat(78)}╣${R}`;
const BORDER_BOT = `${CLAW}╚${"═".repeat(78)}╝${R}`;

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function row(left: string, right = "", width = 76): string {
  const visible = stripAnsi(left) + stripAnsi(right);
  const pad = Math.max(0, width - visible.length);
  return `${CLAW}║${R} ${left}${" ".repeat(pad)}${right} ${CLAW}║${R}`;
}

function sparkline(values: number[], width = 60): string {
  if (!values.length) return "";
  const vals = values.slice(-width);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  if (hi - lo < 1e-9) return SPARK[0].repeat(vals.length);
  return vals
    .map((v) => {
      const idx = Math.floor(((v - lo) / (hi - lo)) * (SPARK.length - 1));
      return SPARK[idx];
    })
    .join("");
}

function fmtLamports(n: number): string {
  const sign = n < 0 ? "-" : " ";
  return `${sign}${Math.abs(n).toLocaleString()}ł`;
}

// ── Dashboard state ───────────────────────────────────────────────────────────

interface DashState {
  tick: number;
  frontmatter: Record<string, unknown>;
  closes: number[];
  lastDecision: { action: string; reason: string };
  book: {
    positions: Array<{ id: string; side: string; size_lamports: number; entry: number }>;
    cash_lamports: number;
    realized_pnl_lamports: number;
  };
  consecutiveLosses: number;
  killThreshold: number;
  killed: Record<string, unknown> | null;
  done: Record<string, unknown> | null;
  model: string;
  darkDefi: Record<string, unknown> | null;
  payshLatency: number | null;
}

const dash: DashState = {
  tick: 0,
  frontmatter: {},
  closes: [],
  lastDecision: { action: "—", reason: "waiting for first tick" },
  book: { positions: [], cash_lamports: 0, realized_pnl_lamports: 0 },
  consecutiveLosses: 0,
  killThreshold: 3,
  killed: null,
  done: null,
  model: "rule-based",
  darkDefi: null,
  payshLatency: null,
};

function ingest(evt: Record<string, unknown>): void {
  switch (evt.event) {
    case "start":
      dash.frontmatter = (evt.frontmatter as Record<string, unknown>) ?? {};
      dash.killThreshold = Number(dash.frontmatter.loss_killswitch_consecutive ?? 3);
      break;
    case "tick":
      dash.tick = evt.tick as number;
      const candle = evt.candle as { c: number } | undefined;
      if (candle) dash.closes.push(candle.c);
      dash.lastDecision = (evt.decision as { action: string; reason: string }) ?? dash.lastDecision;
      dash.book = (evt.book as DashState["book"]) ?? dash.book;
      dash.consecutiveLosses = (evt.consecutive_losses as number) ?? 0;
      dash.model = (evt.model as string) ?? dash.model;
      // extras that loop emits into the tick event
      if (evt.dark_defi) dash.darkDefi = evt.dark_defi as Record<string, unknown>;
      if (typeof evt.paysh_relay_latency_ms === "number") dash.payshLatency = evt.paysh_relay_latency_ms;
      break;
    case "killswitch":
      dash.killed = evt;
      break;
    case "done":
      dash.done = evt;
      break;
  }
}

function render(): string {
  const mode = String(dash.frontmatter.mode ?? "?").toUpperCase();
  const net = String(dash.frontmatter.network ?? "?").toUpperCase();
  const pnl = dash.book.realized_pnl_lamports;
  const pnlColor = pnl >= 0 ? GREEN : LOBSTER;

  // Header
  const statusPill =
    `${LOBSTER}● ${BOLD}OODA${R}${DIM}  ·  ${R}` +
    `${SHELL}${mode}${R}${DIM}  ·  ${R}` +
    `${SHELL}${net}${R}${DIM}  ·  ${R}` +
    `${GOLD}$CLAWD${R}`;
  const headerL = `${LOBSTER}${BOLD}HERMES x402${R}   ${statusPill}`;
  const headerR =
    `${DIM}tick${R} ${BOLD}${String(dash.tick).padStart(5)}${R}   ` +
    `${DIM}pnl${R} ${pnlColor}${pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}${R}`;

  // Sparkline
  const spark = sparkline(dash.closes, 60);
  const lastClose = dash.closes.at(-1) ?? 0;

  // Position
  let posLine: string;
  if (dash.book.positions.length > 0) {
    const p = dash.book.positions[0];
    const mark = lastClose;
    const delta = p.side === "long" ? mark - p.entry : p.entry - mark;
    const unreal = Math.trunc((delta * p.size_lamports) / Math.max(p.entry, 1));
    const uColor = unreal >= 0 ? GREEN : LOBSTER;
    posLine =
      `${BOLD}${p.side.toUpperCase().padEnd(5)}${R} ` +
      `${fmtLamports(p.size_lamports)}   ` +
      `${DIM}entry${R} ${p.entry.toFixed(3)}   ` +
      `${DIM}mark${R} ${mark.toFixed(3)}   ` +
      `${DIM}u-pnl${R} ${uColor}${unreal >= 0 ? "+" : ""}${unreal.toLocaleString()}${R}`;
  } else {
    posLine = `${DIM}(no open position)${R}`;
  }

  // Decision
  const action = dash.lastDecision.action;
  const reason = dash.lastDecision.reason?.slice(0, 58) ?? "";
  const aColor = action === "open" ? GREEN : action === "close" ? SHELL : DIM;
  const decLine = `${aColor}${BOLD}${action.padEnd(6)}${R}${DIM}—${R} ${reason}`;

  // Kill-switch dots
  const ks = dash.consecutiveLosses;
  const kt = dash.killThreshold;
  const dots = Array.from({ length: kt }, (_, i) => (i < ks ? "●" : "○")).join("");
  const ksColor = ks >= kt ? LOBSTER : ks > 0 ? SHELL : DIM;
  const ksLine = `${ksColor}${dots}${R}  ${DIM}(${ks} / ${kt} consecutive losses)${R}`;

  // Model + dark DeFi
  const modelBadge =
    dash.model === "claude-sonnet-4-6"
      ? `${CYAN}claude-sonnet-4-6${R}`
      : `${DIM}rule-based${R}`;
  const ddf = dash.darkDefi;
  const ddfLine = ddf
    ? `${SHELL}${String(ddf.tier).toUpperCase()}${R}  type=${ddf.type}  conf=${Number(ddf.confidence).toFixed(2)}`
    : `${DIM}—${R}`;
  const latLine =
    dash.payshLatency !== null
      ? `${dash.payshLatency > 2000 ? LOBSTER : GREEN}${dash.payshLatency}ms${R}`
      : `${DIM}not configured${R}`;

  // Status line
  let statusLine: string;
  if (dash.killed) {
    statusLine = `${LOBSTER}${BOLD}HALTED${R}  ${String(dash.killed.reason ?? "").slice(0, 60)}`;
  } else if (dash.done) {
    statusLine = `${GREEN}DONE${R}    tick ${dash.done.tick}  final pnl ${pnlColor}${pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}${R}`;
  } else {
    statusLine = `${DIM}running…${R}`;
  }

  const rows = [
    BORDER_TOP,
    ...LOGO.map((l) => row(`  ${l}`)),
    BORDER_MID,
    row(""),
    row(headerL, headerR),
    BORDER_MID,
    row(""),
    row(`${DIM}PRICE  (last 60 closes)${R}`),
    row(`  ${LOBSTER}${spark}${R}`, `${BOLD}${lastClose.toFixed(3)}${R}`),
    row(""),
    row(`${DIM}POSITION${R}`),
    row(`  ${posLine}`),
    row(""),
    row(`${DIM}LAST DECISION${R}`),
    row(`  ${decLine}`),
    row(""),
    row(`${DIM}MODEL${R}`, ""),
    row(`  ${modelBadge}`),
    row(""),
    row(`${DIM}DARK DEFI${R}`),
    row(`  ${ddfLine}`),
    row(`  ${DIM}pay.sh latency${R}  ${latLine}`),
    row(""),
    row(`${DIM}KILL-SWITCH${R}`),
    row(`  ${ksLine}`),
    row(""),
    row(statusLine),
    BORDER_BOT,
  ];

  return rows.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

process.stdout.write(HIDE + CLEAR);

const rl = createInterface({ input: process.stdin });

rl.on("line", (raw) => {
  const trimmed = raw.trim();
  if (!trimmed) return;
  try {
    const evt = JSON.parse(trimmed) as Record<string, unknown>;
    ingest(evt);
    process.stdout.write(HOME + render() + "\n");
  } catch {
    // malformed line — skip
  }
});

rl.on("close", () => {
  process.stdout.write(SHOW + "\n");
});

process.on("SIGINT", () => {
  process.stdout.write(SHOW + "\n");
  process.exit(0);
});
