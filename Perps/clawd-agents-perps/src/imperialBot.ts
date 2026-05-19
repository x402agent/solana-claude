/**
 * Imperial Perps Bot — natural language Telegram interface for the Imperial agent.
 *
 * Features:
 * - Persistent session: JWT, positions, last signals, conversation context
 * - Natural language NLP: regex + Claude fallback
 * - Full order lifecycle: scan, long, short, close, cancel, update, collateral
 * - Live market data: funding rates, mark prices, depth, route recommendation
 * - Account: balances, positions, orders, deposit/withdraw
 * - Browser-use Clawd capabilities (external research via fetch)
 * - WebSocket subscription for live market push to Telegram
 *
 * Environment (beyond ImperialConfig):
 *   TELEGRAM_BOT_TOKEN       — required
 *   TELEGRAM_ALLOWED_CHATS   — comma-separated chat IDs (empty = open)
 *   CLAWD_CLAUDE_API_KEY     — optional: Claude API key for NLP fallback
 *   IMPERIAL_STATE_FILE      — path to persist state JSON (default ./imperial-state.json)
 */

import fs from "node:fs";
import path from "node:path";
import {
  ImperialClient,
  type ImperialConfig,
  type AgentSignal,
  type ExecutionRecord,
  type MobileCreateOrderRequest,
  type FundingRateEntry,
  type MarkPriceEntry,
  UNDERWRITER_LABELS,
  ORDER_TYPE_NAMES,
  Underwriter,
  usdToFixed,
  fixedToUsd,
  scoreImperialMarket,
} from "./imperialAgent.js";

// ─── State persistence ────────────────────────────────────────────────────────

export interface BotState {
  jwt: string;
  jwtExpiresAt: string;
  lastSignals: AgentSignal[];
  lastScanTs: number;
  executionHistory: ExecutionRecord[];
  conversationCtx: Record<string, string[]>; // chatId → last 10 messages
}

const DEFAULT_STATE: BotState = {
  jwt: "",
  jwtExpiresAt: "",
  lastSignals: [],
  lastScanTs: 0,
  executionHistory: [],
  conversationCtx: {},
};

function loadState(file: string): BotState {
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) } as BotState;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(file: string, state: BotState): void {
  try {
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  } catch {
    // non-fatal — state is in memory
  }
}

// ─── NLP: intent parsing ──────────────────────────────────────────────────────

export type BotIntent =
  | { kind: "scan"; symbols?: string[] }
  | { kind: "long"; symbol: string; sizeUsd?: number; venue?: number; tpPrice?: number; slPrice?: number }
  | { kind: "short"; symbol: string; sizeUsd?: number; venue?: number }
  | { kind: "close"; symbol: string; sizeUsd?: number }
  | { kind: "cancel"; orderPda: string }
  | { kind: "positions" }
  | { kind: "balances" }
  | { kind: "funding"; symbol?: string }
  | { kind: "marks"; symbol?: string }
  | { kind: "depth"; symbol: string }
  | { kind: "route"; symbol: string; side: "long" | "short"; notional: number }
  | { kind: "health" }
  | { kind: "orders" }
  | { kind: "history" }
  | { kind: "deposit"; amount: number }
  | { kind: "withdraw"; amount: number }
  | { kind: "help" }
  | { kind: "unknown"; raw: string };

const SYMBOL_RE = /\b(SOL|ETH|BTC|XAU|GOLD|BNB|AVAX)\b/i;
const SIZE_RE = /\$?([\d,.]+)\s*(?:usd|usdc|dollars?|k)?/i;
const VENUE_MAP: Record<string, number> = {
  jupiter: 0, jup: 0, flash: 1, phoenix: 2, phx: 2, gmtrade: 3, gm: 3,
};

function extractSymbol(text: string): string | null {
  const m = text.match(SYMBOL_RE);
  return m ? m[1].toUpperCase() : null;
}

function extractSize(text: string): number | null {
  const m = text.match(SIZE_RE);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractVenue(text: string): number | undefined {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(VENUE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return undefined;
}

function extractPrice(text: string, keyword: string): number | null {
  const re = new RegExp(`${keyword}[:\\s@]*\\$?([\\d,.]+)`, "i");
  const m = text.match(re);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseIntent(text: string): BotIntent {
  const t = text.trim().toLowerCase();

  if (/^\/?(help|start|commands?)\b/.test(t)) return { kind: "help" };
  if (/^\/?(health|status|ping|config)\b/.test(t)) return { kind: "health" };
  if (/^\/?(scan|signals?|overview)\b/.test(t)) {
    const syms = (text.match(/\b(SOL|ETH|BTC|XAU|GOLD)\b/gi) ?? []).map((s) => s.toUpperCase());
    return { kind: "scan", symbols: syms.length ? syms : undefined };
  }
  if (/^\/?(positions?|pos)\b/.test(t)) return { kind: "positions" };
  if (/^\/?(balances?|bal|balance|funds?)\b/.test(t)) return { kind: "balances" };
  if (/^\/?(orders?)\b/.test(t)) return { kind: "orders" };
  if (/^\/?(history|executions?)\b/.test(t)) return { kind: "history" };

  if (/\b(long|buy|open long|go long|enter long)\b/.test(t)) {
    const symbol = extractSymbol(text) ?? "SOL";
    return {
      kind: "long",
      symbol,
      sizeUsd: extractSize(text) ?? undefined,
      venue: extractVenue(text),
      tpPrice: extractPrice(text, "tp|take.?profit") ?? undefined,
      slPrice: extractPrice(text, "sl|stop.?loss") ?? undefined,
    };
  }

  if (/\b(short|sell|open short|go short|enter short)\b/.test(t)) {
    const symbol = extractSymbol(text) ?? "SOL";
    return {
      kind: "short",
      symbol,
      sizeUsd: extractSize(text) ?? undefined,
      venue: extractVenue(text),
    };
  }

  if (/\b(close|exit|reduce|decrease|market.?close)\b/.test(t)) {
    const symbol = extractSymbol(text) ?? "SOL";
    return { kind: "close", symbol, sizeUsd: extractSize(text) ?? undefined };
  }

  if (/\b(cancel|revoke)\b/.test(t)) {
    const m = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    if (m) return { kind: "cancel", orderPda: m[0] };
  }

  if (/\b(funding|rates?)\b/.test(t)) {
    const sym = extractSymbol(text);
    return { kind: "funding", symbol: sym ?? undefined };
  }

  if (/\b(mark.?prices?|prices?|marks?)\b/.test(t)) {
    const sym = extractSymbol(text);
    return { kind: "marks", symbol: sym ?? undefined };
  }

  if (/\b(depth|orderbook|book)\b/.test(t)) {
    const sym = extractSymbol(text) ?? "SOL";
    return { kind: "depth", symbol: sym };
  }

  if (/\b(route|venue|recommend|which venue|best venue)\b/.test(t)) {
    const sym = extractSymbol(text) ?? "SOL";
    const side = /\b(short|sell)\b/.test(t) ? "short" : "long";
    const notional = extractSize(text) ?? 100;
    return { kind: "route", symbol: sym, side, notional };
  }

  if (/\b(deposit)\b/.test(t)) {
    const amount = extractSize(text) ?? 0;
    return { kind: "deposit", amount };
  }

  if (/\b(withdraw)\b/.test(t)) {
    const amount = extractSize(text) ?? 0;
    return { kind: "withdraw", amount };
  }

  return { kind: "unknown", raw: text };
}

// ─── Claude NLP fallback (optional) ──────────────────────────────────────────

async function claudeParseIntent(
  text: string,
  apiKey: string,
): Promise<BotIntent> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system:
          'You extract trading intent from natural language for a Solana perps bot. Reply with JSON only, no prose. Schema: {"kind": "scan"|"long"|"short"|"close"|"cancel"|"positions"|"balances"|"funding"|"marks"|"depth"|"route"|"health"|"orders"|"history"|"deposit"|"withdraw"|"help"|"unknown", "symbol"?: string, "sizeUsd"?: number, "venue"?: number (0=Jupiter,1=Flash,2=Phoenix,3=GMTrade), "tpPrice"?: number, "slPrice"?: number, "orderPda"?: string, "side"?: "long"|"short", "notional"?: number, "amount"?: number, "raw"?: string}',
        messages: [{ role: "user", content: text }],
      }),
    });
    if (!res.ok) throw new Error(`Claude ${res.status}`);
    const data = await res.json() as { content: { text: string }[] };
    const raw = data.content[0]?.text ?? "{}";
    return JSON.parse(raw) as BotIntent;
  } catch {
    return { kind: "unknown", raw: text };
  }
}

// ─── Response formatters ──────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 4): string {
  return n == null ? "—" : n.toFixed(decimals);
}

function fmtFunding(rate: FundingRateEntry): string {
  const ann = (rate.longFundingRatePerHourPercent ?? 0) * 8760;
  return `${rate.venue}: ${fmt(rate.longFundingRatePerHourPercent, 4)}%/hr (${fmt(ann, 1)}% ann)`;
}

function fmtSignal(sig: AgentSignal): string {
  const emoji = sig.decision === "buy" ? "🟢" : sig.decision === "sell" ? "🔴" : "🟡";
  return `${emoji} ${sig.symbol} ${sig.decision.toUpperCase()} conf=${fmt(sig.confidence, 2)}\n   ${sig.rationale}`;
}

function fmtRecord(rec: ExecutionRecord): string {
  const mode = rec.dryRun ? "[DRY]" : "[LIVE]";
  const status = rec.status === "submitted" ? "✅" : rec.status === "preview" ? "👁" : "❌";
  return (
    `${status} ${mode} ${rec.action.toUpperCase()} ${rec.side} ${rec.symbol} ` +
    `$${fmt(rec.sizeUsd, 0)} via ${rec.venue}` +
    (rec.txSignature ? `\n   tx: ${rec.txSignature.slice(0, 16)}…` : "") +
    (rec.error ? `\n   err: ${rec.error}` : "")
  );
}

// ─── Intent handlers ──────────────────────────────────────────────────────────

async function handleScan(
  client: ImperialClient,
  intent: Extract<BotIntent, { kind: "scan" }>,
): Promise<string> {
  const syms = intent.symbols ?? client.config.allowedSymbols;
  const snaps = await Promise.all(syms.map((s) => client.fetchSnapshot(s)));
  const signals = snaps.map((s) => scoreImperialMarket(s));
  signals.sort((a, b) => b.confidence - a.confidence);
  return `Market scan — ${new Date().toISOString()}\n\n` + signals.map(fmtSignal).join("\n\n");
}

async function handleLong(
  client: ImperialClient,
  intent: Extract<BotIntent, { kind: "long" }>,
  live: boolean,
): Promise<{ text: string; record: ExecutionRecord | null }> {
  const sizeUsd = intent.sizeUsd ?? client.config.maxSizeUsd;
  const underwriter = (intent.venue ?? Underwriter.Phoenix) as 0 | 1 | 2 | 3;
  const venue = UNDERWRITER_LABELS[underwriter];

  const entry = client.buildOrderRequest({
    symbol: intent.symbol,
    side: 0,
    action: 0,
    sizeUsd,
    underwriter,
  });

  const closeOrders: MobileCreateOrderRequest[] = [];

  if (intent.tpPrice) {
    closeOrders.push(
      client.buildOrderRequest({
        symbol: intent.symbol,
        side: 0,
        action: 1,
        sizeUsd,
        underwriter,
        orderType: 1,
        triggerPrice: Math.round(intent.tpPrice * 1e9),
        triggerCondition: 0,
      }),
    );
  }

  if (intent.slPrice) {
    closeOrders.push(
      client.buildOrderRequest({
        symbol: intent.symbol,
        side: 0,
        action: 1,
        sizeUsd,
        underwriter,
        orderType: 2,
        triggerPrice: Math.round(intent.slPrice * 1e9),
        triggerCondition: 1,
      }),
    );
  }

  if (closeOrders.length > 0) {
    const { response, records } = await client.placeBatch(
      { entry, closeOrders },
      !live,
    );
    const rec = records[0] ?? null;
    const mode = live ? "LIVE" : "DRY RUN";
    const status = response.entry.success ? "✅ accepted" : `❌ ${response.entry.error}`;
    const closeSummary = response.closeOrders
      .map((c, i) => `  leg ${i + 1}: ${c.success ? "✅" : `❌ ${c.error}`}`)
      .join("\n");
    return {
      text: `[${mode}] LONG ${intent.symbol} $${sizeUsd} via ${venue}\n${status}\nClose legs:\n${closeSummary}`,
      record: rec,
    };
  }

  const { response, record } = await client.placeOrder(entry, !live);
  const mode = live ? "LIVE" : "DRY RUN";
  const status = response.success ? "✅ accepted" : `❌ ${response.error}`;
  return {
    text: `[${mode}] LONG ${intent.symbol} $${sizeUsd} via ${venue}\n${status}` +
      (response.signature ? `\ntx: ${response.signature}` : ""),
    record,
  };
}

async function handleShort(
  client: ImperialClient,
  intent: Extract<BotIntent, { kind: "short" }>,
  live: boolean,
): Promise<{ text: string; record: ExecutionRecord | null }> {
  const sizeUsd = intent.sizeUsd ?? client.config.maxSizeUsd;
  const underwriter = (intent.venue ?? Underwriter.Phoenix) as 0 | 1 | 2 | 3;
  const venue = UNDERWRITER_LABELS[underwriter];

  const req = client.buildOrderRequest({
    symbol: intent.symbol,
    side: 1,
    action: 0,
    sizeUsd,
    underwriter,
  });

  const { response, record } = await client.placeOrder(req, !live);
  const mode = live ? "LIVE" : "DRY RUN";
  const status = response.success ? "✅ accepted" : `❌ ${response.error}`;
  return {
    text: `[${mode}] SHORT ${intent.symbol} $${sizeUsd} via ${venue}\n${status}` +
      (response.signature ? `\ntx: ${response.signature}` : ""),
    record,
  };
}

async function handleClose(
  client: ImperialClient,
  intent: Extract<BotIntent, { kind: "close" }>,
  live: boolean,
): Promise<string> {
  const sizeUsd = intent.sizeUsd ?? client.config.maxSizeUsd;
  const req = client.buildOrderRequest({
    symbol: intent.symbol,
    side: 0,
    action: 1,
    sizeUsd,
  });
  const { response } = await client.placeOrder(req, !live);
  const mode = live ? "LIVE" : "DRY RUN";
  return `[${mode}] CLOSE ${intent.symbol} $${sizeUsd}\n` +
    (response.success ? "✅ accepted" : `❌ ${response.error}`);
}

async function handleFunding(
  client: ImperialClient,
  symbol?: string,
): Promise<string> {
  const rates = await client.getFundingRates();
  const filtered = symbol
    ? rates.filter((r) => r.symbol.toUpperCase() === symbol.toUpperCase())
    : rates;

  if (filtered.length === 0) return `No funding data for ${symbol ?? "all symbols"}.`;

  const grouped: Record<string, FundingRateEntry[]> = {};
  for (const r of filtered) {
    if (!grouped[r.symbol]) grouped[r.symbol] = [];
    grouped[r.symbol].push(r);
  }

  return Object.entries(grouped)
    .map(([sym, entries]) => `${sym}:\n${entries.map((e) => "  " + fmtFunding(e)).join("\n")}`)
    .join("\n\n");
}

async function handleMarks(
  client: ImperialClient,
  symbol?: string,
): Promise<string> {
  const marks = await client.getMarkPrices();
  const filtered = symbol
    ? marks.filter((m) => m.symbol.toUpperCase() === symbol.toUpperCase())
    : marks;
  if (filtered.length === 0) return `No mark prices for ${symbol ?? "all"}.`;
  return filtered
    .map((m) => `${m.symbol} [${m.venue}]: $${fmt(m.price, 4)}`)
    .join("\n");
}

async function handleDepth(
  client: ImperialClient,
  symbol: string,
): Promise<string> {
  const depth = await client.getPhoenixDepth(symbol);
  const snap = Array.isArray(depth) ? (depth as { symbol: string; bids: number[][]; asks: number[][] }[])[0] : depth as { bids: number[][]; asks: number[][] };
  if (!snap) return `No depth data for ${symbol}.`;

  const bids = (snap.bids ?? []).slice(0, 5).map(([p, s]: number[]) => `  $${fmt(p)} × ${fmt(s, 2)}`);
  const asks = (snap.asks ?? []).slice(0, 5).map(([p, s]: number[]) => `  $${fmt(p)} × ${fmt(s, 2)}`);
  return `${symbol} Phoenix depth:\nAsks:\n${asks.reverse().join("\n")}\nBids:\n${bids.join("\n")}`;
}

async function handleRoute(
  client: ImperialClient,
  intent: Extract<BotIntent, { kind: "route" }>,
): Promise<string> {
  const rec = await client.getRoute(
    intent.symbol,
    intent.side === "long" ? 0 : 1,
    intent.notional,
  );
  return `Route for ${intent.side.toUpperCase()} ${intent.symbol} $${intent.notional}:\n` +
    `Venue: ${rec.venue ?? UNDERWRITER_LABELS[rec.underwriter as 0|1|2|3]}\n` +
    `Est. fee: ${fmt(rec.estimatedFee, 4)}\n` +
    `Reason: ${rec.reason ?? "—"}`;
}

async function handleBalances(client: ImperialClient): Promise<string> {
  const bal = await client.getBalances();
  const lines = bal.profiles.map(
    (p) =>
      `  Profile ${p.profileIndex}: $${fixedToUsd(p.usdc).toFixed(2)} USDC` +
      (p.profileIndex === client.config.profileIndex ? " ← active" : ""),
  );
  return `Balances (${bal.wallet.slice(0, 8)}…):\n${lines.join("\n")}`;
}

async function handleHealth(client: ImperialClient): Promise<string> {
  const h = await client.healthCheck();
  const lines = [
    `Imperial Perps Agent`,
    `Wallet: ${h.wallet ? h.wallet.slice(0, 16) + "…" : "not set"}`,
    `Profile: ${h.profileIndex}`,
    `JWT: ${h.jwtPresent ? "present" : "missing"}`,
    `Mode: ${h.live ? "🔴 LIVE" : "👁 DRY-RUN"}`,
    `Symbols: ${h.allowedSymbols.join(", ")}`,
    `Max size: $${h.maxSizeUsd}`,
    `Slippage: ${h.slippageBps}bps`,
  ];
  if (h.warnings.length) {
    lines.push("", "Warnings:");
    lines.push(...h.warnings.map((w) => `  ⚠ ${w}`));
  }
  return lines.join("\n");
}

function handleHelp(): string {
  return `Imperial Perps Agent — Commands

Natural language (say anything like the examples):
  "scan SOL ETH BTC" — score markets
  "long SOL $100 on phoenix" — open long
  "short BTC $50 via flash" — open short
  "long SOL $200 TP @170 SL @140" — entry with TP/SL batch
  "close SOL" — market close
  "funding SOL" — funding rates
  "marks" — all mark prices
  "depth BTC" — Phoenix orderbook
  "route SOL long $100" — venue recommendation
  "balances" — profile USDC
  "positions" — open positions
  "orders" — resting orders
  "history" — last 10 executions
  "health" — agent status

Slash commands:
  /scan /long /short /close /positions /balances
  /funding /marks /depth /route /orders /history /health /help`;
}

// ─── Telegram message sender ──────────────────────────────────────────────────

async function tgSend(
  token: string,
  chatId: string | number,
  text: string,
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4096),
      parse_mode: "HTML",
    }),
  });
}

// ─── Main bot class ───────────────────────────────────────────────────────────

export class ImperialBot {
  private client: ImperialClient;
  private token: string;
  private allowedChats: Set<string>;
  private claudeApiKey: string;
  private stateFile: string;
  private state: BotState;
  private updateOffset = 0;
  private running = false;

  constructor(opts: {
    imperialConfig?: Partial<ImperialConfig>;
    telegramToken?: string;
    allowedChats?: string[];
    claudeApiKey?: string;
    stateFile?: string;
  } = {}) {
    const env = process.env;
    this.token = opts.telegramToken ?? env.TELEGRAM_BOT_TOKEN ?? "";
    this.claudeApiKey = opts.claudeApiKey ?? env.CLAWD_CLAUDE_API_KEY ?? "";
    this.stateFile = opts.stateFile ?? env.IMPERIAL_STATE_FILE ?? "./imperial-state.json";
    this.allowedChats = new Set(
      (opts.allowedChats ??
        (env.TELEGRAM_ALLOWED_CHATS ?? "").split(",").map((s) => s.trim()).filter(Boolean)),
    );

    this.state = loadState(this.stateFile);

    // Restore JWT from state if env didn't provide one
    const cfg: Partial<ImperialConfig> = { ...opts.imperialConfig };
    if (!cfg.jwt && this.state.jwt) cfg.jwt = this.state.jwt;

    this.client = new ImperialClient(cfg);
  }

  private isAllowed(chatId: string | number): boolean {
    if (this.allowedChats.size === 0) return true;
    return this.allowedChats.has(String(chatId));
  }

  private addCtx(chatId: string, message: string): void {
    if (!this.state.conversationCtx[chatId]) this.state.conversationCtx[chatId] = [];
    const ctx = this.state.conversationCtx[chatId];
    ctx.push(message);
    if (ctx.length > 10) ctx.shift();
  }

  private pushRecord(rec: ExecutionRecord): void {
    this.state.executionHistory.unshift(rec);
    if (this.state.executionHistory.length > 50) this.state.executionHistory.length = 50;
  }

  /** Parse intent: regex first, Claude fallback if available and unknown. */
  private async parseIntent(text: string): Promise<BotIntent> {
    const intent = parseIntent(text);
    if (intent.kind !== "unknown" || !this.claudeApiKey) return intent;
    return claudeParseIntent(text, this.claudeApiKey);
  }

  /** Browser-use: fetch a URL and return text content (Clawd capability). */
  async browse(url: string): Promise<string> {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ClawdImperialBot/1.0" },
      });
      const text = await res.text();
      // Strip HTML tags crudely for readability
      return text.replace(/<[^>]*>/g, " ").replace(/\s{2,}/g, " ").slice(0, 2000);
    } catch (err) {
      return `Browse failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  /** Handle a single incoming message. */
  async handleMessage(chatId: string | number, text: string): Promise<string> {
    const cid = String(chatId);
    this.addCtx(cid, `user: ${text}`);

    // Browser-use trigger
    if (/^browse\s+(https?:\/\/\S+)/i.test(text.trim())) {
      const m = text.match(/https?:\/\/\S+/);
      if (m) {
        const content = await this.browse(m[0]);
        const reply = `Browsed ${m[0]}:\n\n${content}`;
        this.addCtx(cid, `bot: ${reply.slice(0, 200)}`);
        return reply;
      }
    }

    const intent = await this.parseIntent(text);
    let reply = "";

    try {
      switch (intent.kind) {
        case "help":
          reply = handleHelp();
          break;

        case "health":
          reply = await handleHealth(this.client);
          break;

        case "scan": {
          reply = await handleScan(this.client, intent);
          break;
        }

        case "long": {
          const { text: t, record } = await handleLong(this.client, intent, this.client.config.live);
          reply = t;
          if (record) this.pushRecord(record);
          break;
        }

        case "short": {
          const { text: t, record } = await handleShort(this.client, intent, this.client.config.live);
          reply = t;
          if (record) this.pushRecord(record);
          break;
        }

        case "close":
          reply = await handleClose(this.client, intent, this.client.config.live);
          break;

        case "cancel": {
          const res = await this.client.cancelOrder({
            wallet: this.client.wallet,
            profileIndex: this.client.config.profileIndex,
            orderPda: intent.orderPda,
          });
          reply = res.success ? `✅ Cancelled ${intent.orderPda.slice(0, 8)}…` : `❌ ${res.error}`;
          break;
        }

        case "positions": {
          const pos = await this.client.getPositions();
          reply = `Positions:\n${JSON.stringify(pos, null, 2).slice(0, 1500)}`;
          break;
        }

        case "balances":
          reply = await handleBalances(this.client);
          break;

        case "orders": {
          const orders = await this.client.getOrders();
          reply = `Orders:\n${JSON.stringify(orders, null, 2).slice(0, 1500)}`;
          break;
        }

        case "history": {
          if (this.state.executionHistory.length === 0) {
            reply = "No execution history yet.";
          } else {
            reply =
              "Last executions:\n\n" +
              this.state.executionHistory.slice(0, 10).map(fmtRecord).join("\n\n");
          }
          break;
        }

        case "funding":
          reply = await handleFunding(this.client, intent.symbol);
          break;

        case "marks":
          reply = await handleMarks(this.client, intent.symbol);
          break;

        case "depth":
          reply = await handleDepth(this.client, intent.symbol);
          break;

        case "route":
          reply = await handleRoute(this.client, intent);
          break;

        case "deposit": {
          if (intent.amount <= 0) {
            reply = "Specify an amount: deposit $100";
          } else {
            const tx = await this.client.buildDepositTx({
              wallet: this.client.wallet,
              profileIndex: this.client.config.profileIndex,
              amount: Math.round(intent.amount * 1_000_000),
              mode: "deposit",
            });
            reply = `Deposit tx built (${intent.amount} USDC). Sign and submit:\n${tx.transaction.slice(0, 64)}…`;
          }
          break;
        }

        case "withdraw": {
          if (intent.amount <= 0) {
            reply = "Specify an amount: withdraw $100";
          } else {
            const tx = await this.client.buildDepositTx({
              wallet: this.client.wallet,
              profileIndex: this.client.config.profileIndex,
              amount: Math.round(intent.amount * 1_000_000),
              mode: "withdraw",
            });
            reply = `Withdraw tx built (${intent.amount} USDC). Sign and submit:\n${tx.transaction.slice(0, 64)}…`;
          }
          break;
        }

        default:
          reply =
            `I didn't understand: "${text.slice(0, 80)}"\n\nType /help for available commands.`;
      }
    } catch (err) {
      reply = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }

    this.addCtx(cid, `bot: ${reply.slice(0, 200)}`);
    saveState(this.stateFile, this.state);
    return reply;
  }

  /** Poll Telegram for updates and dispatch. */
  async poll(): Promise<void> {
    if (!this.token) throw new Error("TELEGRAM_BOT_TOKEN not set.");
    this.running = true;
    console.log("[ImperialBot] Polling started.");

    while (this.running) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.updateOffset}&timeout=30`,
        );
        if (!res.ok) {
          await sleep(5000);
          continue;
        }

        const data = await res.json() as {
          ok: boolean;
          result: {
            update_id: number;
            message?: { chat: { id: number }; text?: string };
          }[];
        };

        for (const update of data.result ?? []) {
          this.updateOffset = update.update_id + 1;
          const msg = update.message;
          if (!msg?.text) continue;
          const chatId = msg.chat.id;
          if (!this.isAllowed(chatId)) continue;

          // Dispatch without awaiting so poll loop continues
          this.handleMessage(chatId, msg.text)
            .then((reply) => tgSend(this.token, chatId, reply))
            .catch((err) =>
              tgSend(this.token, chatId, `Internal error: ${err instanceof Error ? err.message : String(err)}`),
            );
        }
      } catch {
        await sleep(5000);
      }
    }
  }

  /** Subscribe to Imperial /ws/market and push updates to a Telegram chat. */
  async subscribeMarketWs(chatId: string | number, symbols?: string[]): Promise<void> {
    // WebSocket not available in all Node environments — gate on globalThis.WebSocket
    const WS = (globalThis as unknown as { WebSocket?: typeof WebSocket }).WebSocket;
    if (!WS) {
      await tgSend(this.token, chatId, "WebSocket not available in this runtime.");
      return;
    }

    const base = this.client.config.base.replace(/^http/, "ws").replace("/api/v1", "");
    const ws = new WS(`${base}/ws/market`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe_funding_rates" }));
      ws.send(JSON.stringify({ type: "subscribe_mark_prices" }));
      ws.send(
        JSON.stringify({
          type: "subscribe_phoenix_depth",
          ...(symbols ? { symbols } : {}),
        }),
      );
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          symbol?: string;
          venue?: string;
          price?: number;
          longFundingRatePerHourPercent?: number;
        };
        let text = "";
        if (msg.type === "mark_price_update") {
          text = `📊 ${msg.symbol} [${msg.venue}] $${fmt(msg.price ?? null)}`;
        } else if (msg.type === "funding_rate_update") {
          const ann = (msg.longFundingRatePerHourPercent ?? 0) * 8760;
          text = `💸 ${msg.symbol} [${msg.venue}] funding ${fmt(ann, 1)}% ann`;
        }
        if (text) tgSend(this.token, chatId, text).catch(() => {});
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      tgSend(this.token, chatId, "Market WS error — reconnect manually.").catch(() => {});
    };
  }

  stop(): void {
    this.running = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Quick start: create and run the bot. */
export async function startImperialBot(opts: ConstructorParameters<typeof ImperialBot>[0] = {}): Promise<ImperialBot> {
  const bot = new ImperialBot(opts);
  bot.poll().catch(console.error);
  return bot;
}
