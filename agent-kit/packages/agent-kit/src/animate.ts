// animate.ts — dependency-free terminal animations for the clawd-kit CLI.
//
// Everything here uses raw ANSI escapes and stdout writes so the agent-kit
// stays zero-dependency. The animations downgrade gracefully when stdout
// is not a TTY (CI, piping to file, --no-animate).

import { stdout } from "node:process";

const CSI = "\x1b[";

export const ansi = {
  reset: `${CSI}0m`,
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  italic: `${CSI}3m`,
  underline: `${CSI}4m`,
  blink: `${CSI}5m`,
  inverse: `${CSI}7m`,
  hidden: `${CSI}8m`,
  green: `${CSI}38;2;20;241;149m`,
  purple: `${CSI}38;2;153;69;255m`,
  cyan: `${CSI}38;2;77;208;225m`,
  magenta: `${CSI}38;2;255;105;180m`,
  yellow: `${CSI}38;2;255;208;77m`,
  red: `${CSI}38;2;255;87;87m`,
  gray: `${CSI}38;2;120;134;160m`,
  white: `${CSI}38;2;240;240;240m`,
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,
  clearLine: `${CSI}2K\r`,
  up: (n = 1) => `${CSI}${n}A`,
  down: (n = 1) => `${CSI}${n}B`,
  col: (n: number) => `${CSI}${n}G`,
};

export function isTTY(): boolean {
  return Boolean(stdout.isTTY) && process.env.NO_COLOR !== "1";
}

let ANIMATE = true;
export function setAnimate(value: boolean): void {
  ANIMATE = value;
}
export function animateOn(): boolean {
  return ANIMATE && isTTY();
}

export function write(s: string): void {
  stdout.write(s);
}

export function writeln(s = ""): void {
  stdout.write(`${s}\n`);
}

export function paint(color: keyof typeof ansi, text: string): string {
  const code = ansi[color];
  return typeof code === "string" ? `${code}${text}${ansi.reset}` : text;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ─── Typewriter ───────────────────────────────────────────────────────────────
export async function typewriter(
  text: string,
  options: { delayMs?: number; color?: keyof typeof ansi } = {},
): Promise<void> {
  const { delayMs = 12, color } = options;
  if (!animateOn()) {
    writeln(color ? paint(color, text) : text);
    return;
  }
  const prefix = color ? ansi[color] : "";
  for (const char of text) {
    write(`${prefix}${char}`);
    if (char !== " " && char !== "\n") await sleep(delayMs);
  }
  writeln(ansi.reset);
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const CLAWD_FRAMES = ["🦞", "🦀", "🦞", "🦐"];

export interface Spinner {
  stop: (finalLine?: string) => void;
  update: (label: string) => void;
}

export function spinner(label: string, frames = SPINNER_FRAMES): Spinner {
  if (!animateOn()) {
    writeln(`  ${paint("purple", "▸")} ${label}`);
    return { stop: (final?: string) => final && writeln(`  ${paint("green", "✓")} ${final}`), update: () => undefined };
  }
  let i = 0;
  let current = label;
  write(ansi.hideCursor);
  const timer = setInterval(() => {
    const frame = frames[i++ % frames.length];
    write(`${ansi.clearLine}  ${paint("purple", frame ?? "·")} ${current}`);
  }, 80);
  return {
    update: (next: string) => {
      current = next;
    },
    stop: (finalLine?: string) => {
      clearInterval(timer);
      write(`${ansi.clearLine}${ansi.showCursor}`);
      if (finalLine) writeln(`  ${paint("green", "✓")} ${finalLine}`);
    },
  };
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export async function progressBar(
  label: string,
  steps: Array<{ label: string; ms: number }>,
): Promise<void> {
  const total = steps.length;
  if (!animateOn()) {
    for (const step of steps) writeln(`  ${paint("purple", "▸")} ${step.label}`);
    writeln(`  ${paint("green", "✓")} ${label}`);
    return;
  }
  write(ansi.hideCursor);
  for (let i = 0; i < total; i++) {
    const filled = Math.round(((i + 1) / total) * 28);
    const bar = "█".repeat(filled) + "░".repeat(28 - filled);
    const pct = Math.round(((i + 1) / total) * 100);
    const stepLabel = steps[i]?.label ?? "";
    write(
      `${ansi.clearLine}  ${paint("cyan", bar)} ${paint("white", `${pct}%`)} ${paint("gray", stepLabel)}`,
    );
    await sleep(steps[i]?.ms ?? 220);
  }
  write(`${ansi.clearLine}${ansi.showCursor}`);
  writeln(`  ${paint("green", "✓")} ${label}`);
}

// ─── Banner (Clawd ASCII) ─────────────────────────────────────────────────────
const CLAWD_BANNER = [
  "       ____    _      __    ____    ____   ",
  "      / ___|  | |    /  \\  | __ \\  |  _ \\  ",
  "     | |      | |   / /\\ \\ | |  | | | | | | ",
  "     | |___   | |__/  __  \\| |__| | | |_| | ",
  "      \\____|  |____/_/  \\_\\|____/  |____/  ",
];

export async function clawdBanner(name?: string): Promise<void> {
  if (!animateOn()) {
    for (const line of CLAWD_BANNER) writeln(paint("purple", line));
    if (name) writeln(paint("green", `       ${name} is alive 🦞`));
    return;
  }
  const palette: Array<keyof typeof ansi> = ["purple", "magenta", "cyan", "green"];
  for (let i = 0; i < CLAWD_BANNER.length; i++) {
    const color = palette[i % palette.length] as keyof typeof ansi;
    writeln(paint(color, CLAWD_BANNER[i] ?? ""));
    await sleep(45);
  }
  if (name) {
    write("       ");
    await typewriter(`${name} is alive 🦞`, { color: "green", delayMs: 26 });
  }
}

// ─── Pulse / heartbeat ────────────────────────────────────────────────────────
export async function pulse(label: string, beats = 4): Promise<void> {
  if (!animateOn()) {
    writeln(`  ${paint("green", "♥")} ${label}`);
    return;
  }
  write(ansi.hideCursor);
  for (let i = 0; i < beats; i++) {
    write(`${ansi.clearLine}  ${paint("green", "♥")} ${label}`);
    await sleep(180);
    write(`${ansi.clearLine}  ${paint("red", "♥")} ${label}`);
    await sleep(180);
  }
  write(`${ansi.clearLine}${ansi.showCursor}`);
  writeln(`  ${paint("green", "♥")} ${label}`);
}

// ─── Square dance — animated ORE board preview (5x5) ──────────────────────────
export async function oreBoardDance(durationMs = 1800): Promise<void> {
  if (!animateOn()) {
    writeln(`  ${paint("cyan", "⛏  ORE board ready (25 squares)")}`);
    return;
  }
  const cells = 25;
  const start = Date.now();
  write(ansi.hideCursor);
  let frame = 0;
  while (Date.now() - start < durationMs) {
    const winner = Math.floor(Math.random() * cells);
    const rows: string[] = [];
    for (let r = 0; r < 5; r++) {
      const row: string[] = [];
      for (let c = 0; c < 5; c++) {
        const idx = r * 5 + c;
        const lit = (idx + frame) % 7 === 0;
        const isWinner = idx === winner;
        const glyph = isWinner ? "◆" : lit ? "▣" : "·";
        const color: keyof typeof ansi = isWinner
          ? "green"
          : lit
            ? "purple"
            : "gray";
        row.push(paint(color, glyph));
      }
      rows.push(`     ${row.join("  ")}`);
    }
    if (frame > 0) write(ansi.up(5));
    for (const r of rows) writeln(r);
    frame++;
    await sleep(90);
  }
  write(ansi.showCursor);
  writeln(`  ${paint("cyan", "⛏  ORE board ready (25 squares)")}`);
}

// ─── Box drawing helpers ──────────────────────────────────────────────────────
export function drawBox(title: string, lines: string[]): void {
  const inner = Math.max(title.length + 4, ...lines.map((l) => stripAnsi(l).length)) + 2;
  const top = `╔${"═".repeat(inner)}╗`;
  const sep = `╠${"═".repeat(inner)}╣`;
  const bottom = `╚${"═".repeat(inner)}╝`;
  writeln(paint("purple", top));
  writeln(
    `${paint("purple", "║")} ${paint("bold", title)}${" ".repeat(inner - title.length - 1)}${paint("purple", "║")}`,
  );
  writeln(paint("purple", sep));
  for (const line of lines) {
    const pad = inner - stripAnsi(line).length - 1;
    writeln(`${paint("purple", "║")} ${line}${" ".repeat(Math.max(0, pad))}${paint("purple", "║")}`);
  }
  writeln(paint("purple", bottom));
}

export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}

// ─── Convergence — the final flash ────────────────────────────────────────────
export async function convergence(): Promise<void> {
  if (!animateOn()) {
    writeln(paint("green", "  ✦  convergence reached"));
    return;
  }
  const sweep = [
    "  ╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴",
    "  ╴╴╴╴◆╴╴╴╴╴╴╴╴╴╴╴╴╴╴╴",
    "  ╴╴╴╴◆◆◆╴╴╴╴╴╴╴╴╴╴╴╴╴",
    "  ╴╴◆◆◆◆◆◆◆╴╴╴╴╴╴╴╴╴╴╴",
    "  ◆◆◆◆◆◆◆◆◆◆◆◆◆╴╴╴╴╴╴╴",
    "  ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆",
  ];
  write(ansi.hideCursor);
  for (const line of sweep) {
    write(`${ansi.clearLine}${paint("purple", line)}\r`);
    await sleep(110);
  }
  write(`${ansi.clearLine}${ansi.showCursor}`);
  writeln(paint("green", "  ✦  convergence reached — the shell is molten"));
}
