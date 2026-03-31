/**
 * src/telegram/bot.ts
 *
 * solana-claude Telegram Gateway.
 *
 * Uses the Telegram Bot API via long-polling (no public URL needed)
 * OR webhook mode with Tailscale Funnel for zero-config HTTPS.
 *
 * Features:
 *   - All 20+ /commands for market data, pump tools, sniper, scanner
 *   - Real-time pump signal alerts to chat
 *   - Sniper position open/close notifications
 *   - Memory read/write via Telegram
 *   - Tailscale Funnel setup instructions
 *   - Works on iOS/Android via Tailscale mobile client
 *
 * Setup:
 *   1. Get token from @BotFather → set TELEGRAM_BOT_TOKEN
 *   2. npm run telegram (or: npx tsx src/telegram/bot.ts)
 *   3. Open your bot in Telegram and send /start
 */

import type {
  TelegramBotConfig,
  BotState,
  TelegramSession,
  CommandContext,
  TradingSignal,
  SniperPosition,
} from "./types.js";

import {
  cmdStart, cmdHelp, cmdSol, cmdPrice, cmdTrending,
  cmdToken, cmdWallet, cmdScanToggle, cmdGrad, cmdMcap,
  cmdCashback, cmdSignals, cmdStatus, cmdOODA, cmdResearch,
  cmdMemory, cmdDream, cmdSkills, cmdTailscale,
  cmdSnipe, cmdStop, cmdAgent,
} from "./commands.js";

import { PumpSniper, defaultSniperConfig } from "./pump-sniper.js";

// ─── Telegram API Types (minimal, no deps) ────────────────────────────────────

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

interface TgMessage {
  message_id: number;
  from?: { id: number; username?: string; first_name?: string };
  chat: { id: number; type: string };
  text?: string;
  date: number;
}

interface TgCallbackQuery {
  id: string;
  from: { id: number; username?: string };
  message?: TgMessage;
  data?: string;
}

// ─── Telegram HTTP Client ────────────────────────────────────────────────────

class TelegramAPI {
  private baseUrl: string;
  private lastSentMessageId = new Map<number, number>();

  constructor(token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async request<T>(method: string, body?: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${method}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json() as { ok: boolean; result?: T; description?: string };
    if (!data.ok) throw new Error(`Telegram API ${method}: ${data.description}`);
    return data.result as T;
  }

  async sendMessage(chatId: number, text: string, opts?: {
    parse_mode?: string;
    disable_web_page_preview?: boolean;
    reply_markup?: unknown;
  }): Promise<{ message_id: number }> {
    const result = await this.request<{ message_id: number }>("sendMessage", {
      chat_id: chatId,
      text: text.slice(0, 4096),
      parse_mode: opts?.parse_mode ?? "Markdown",
      disable_web_page_preview: opts?.disable_web_page_preview ?? true,
      reply_markup: opts?.reply_markup,
    });
    this.lastSentMessageId.set(chatId, result.message_id);
    return result;
  }

  async editMessage(chatId: number, messageId: number, text: string): Promise<void> {
    await this.request("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: text.slice(0, 4096),
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }).catch(() => { /* ignore if message unchanged */ });
  }

  async sendChatAction(chatId: number, action: string): Promise<void> {
    await this.request("sendChatAction", { chat_id: chatId, action }).catch(() => {});
  }

  async getUpdates(offset: number, timeout = 25): Promise<TgUpdate[]> {
    return this.request<TgUpdate[]>("getUpdates", {
      offset,
      timeout,
      allowed_updates: ["message", "callback_query"],
    });
  }

  async setWebhook(url: string, secretToken?: string): Promise<void> {
    await this.request("setWebhook", { url, secret_token: secretToken });
  }

  async deleteWebhook(): Promise<void> {
    await this.request("deleteWebhook");
  }

  async setMyCommands(): Promise<void> {
    await this.request("setMyCommands", {
      commands: [
        { command: "start", description: "Welcome + auth check" },
        { command: "help", description: "Full command reference" },
        { command: "sol", description: "Quick SOL price" },
        { command: "price", description: "Token price by mint or symbol" },
        { command: "trending", description: "Trending tokens" },
        { command: "token", description: "Token info + security" },
        { command: "wallet", description: "Wallet PnL" },
        { command: "scan", description: "Toggle Pump.fun scanner" },
        { command: "signal", description: "Active pump signals" },
        { command: "snipe", description: "Start sniper bot" },
        { command: "stop", description: "Stop sniper/scanner" },
        { command: "grad", description: "Graduation progress" },
        { command: "mcap", description: "Token market cap" },
        { command: "cashback", description: "Cashback mechanics" },
        { command: "ooda", description: "Run OODA trading loop" },
        { command: "research", description: "Deep token analysis" },
        { command: "memory", description: "Recall/write memory" },
        { command: "dream", description: "Memory consolidation" },
        { command: "agent", description: "Agent fleet management" },
        { command: "status", description: "Bot status" },
        { command: "skills", description: "Available skills" },
        { command: "tailscale", description: "Tailscale setup guide" },
      ],
    });
  }
}

// ─── Bot Class ────────────────────────────────────────────────────────────────

export class SolanaClaudeBot {
  private api: TelegramAPI;
  private config: TelegramBotConfig;
  private state: BotState;
  private sniper: PumpSniper | null = null;
  private signals: TradingSignal[] = [];
  private memories: Array<{ tier: string; content: string; timestamp: string }> = [];
  private updateOffset = 0;
  private running = false;

  constructor(config: TelegramBotConfig) {
    this.config = config;
    this.api = new TelegramAPI(config.token);
    this.state = {
      sessions: new Map(),
      sniperRunning: false,
      scannerRunning: false,
      startedAt: Date.now(),
      messageCount: 0,
    };
  }

  // ─── Session Management ────────────────────────────────────────────────────

  private getSession(chatId: number, userId: number, username?: string): TelegramSession {
    if (!this.state.sessions.has(chatId)) {
      const allowed = this.config.allowedChatIds.length === 0 ||
        this.config.allowedChatIds.includes(chatId);
      this.state.sessions.set(chatId, {
        chatId,
        userId,
        username,
        authorized: allowed,
        mode: "idle",
        context: [],
        lastActive: Date.now(),
        activeTasks: [],
      });
    }
    const session = this.state.sessions.get(chatId)!;
    session.lastActive = Date.now();
    session.userId = userId;
    return session;
  }

  private isAuthorized(session: TelegramSession): boolean {
    if (this.config.allowedChatIds.length === 0) return true;
    return session.authorized;
  }

  private isAdmin(userId: number): boolean {
    if (this.config.adminUserIds.length === 0) return true;
    return this.config.adminUserIds.includes(userId);
  }

  // ─── Command Dispatch ──────────────────────────────────────────────────────

  private buildCtx(msg: TgMessage, args: string[]): CommandContext {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? 0;
    const username = msg.from?.username;
    const session = this.getSession(chatId, userId, username);
    let lastMessageId = 0;

    const reply = async (text: string) => {
      const m = await this.api.sendMessage(chatId, text);
      lastMessageId = m.message_id;
    };
    const replyHTML = async (html: string) => {
      const m = await this.api.sendMessage(chatId, html, { parse_mode: "HTML" });
      lastMessageId = m.message_id;
    };
    const editLast = async (text: string) => {
      if (lastMessageId) {
        await this.api.editMessage(chatId, lastMessageId, text);
      }
    };
    const typing = async () => {
      await this.api.sendChatAction(chatId, "typing");
    };

    return {
      chatId,
      userId,
      username,
      session,
      args,
      text: msg.text ?? "",
      reply,
      replyHTML,
      editLast,
      typing,
    };
  }

  private async dispatch(msg: TgMessage): Promise<void> {
    if (!msg.text) return;
    const text = msg.text.trim();
    if (!text.startsWith("/")) return;

    const parts = text.split(/\s+/);
    const rawCmd = parts[0].toLowerCase().replace(/^\//, "").split("@")[0];
    const args = parts.slice(1);

    const session = this.getSession(msg.chat.id, msg.from?.id ?? 0, msg.from?.username);
    if (!this.isAuthorized(session) && rawCmd !== "start") {
      await this.api.sendMessage(
        msg.chat.id,
        "⛔ This bot is restricted. Contact the owner for access."
      );
      return;
    }

    const ctx = this.buildCtx(msg, args);
    this.state.messageCount++;

    try {
      switch (rawCmd) {
        case "start": return void cmdStart(ctx);
        case "help": return void cmdHelp(ctx);
        case "sol": return void cmdSol(ctx);
        case "price": return void cmdPrice(ctx);
        case "trending": return void cmdTrending(ctx);
        case "token": return void cmdToken(ctx);
        case "wallet": return void cmdWallet(ctx);
        case "scan": return void cmdScanToggle(
          ctx,
          (running) => {
            this.state.scannerRunning = running;
            if (running) this.startPumpScanner(msg.chat.id);
            else this.stopPumpScanner();
          },
          () => this.state.scannerRunning,
        );
        case "signal": return void cmdSignals(ctx, () => this.signals as unknown as Array<Record<string, unknown>>);
        case "snipe": return void cmdSnipe(
          ctx,
          (chatId, cfg) => this.startSniper(chatId, cfg as Record<string, unknown>),
          () => this.state.sniperRunning,
        );
        case "stop": return void cmdStop(ctx, (chatId) => this.stopForChat(chatId));
        case "grad": return void cmdGrad(ctx);
        case "mcap": return void cmdMcap(ctx);
        case "cashback": return void cmdCashback(ctx);
        case "ooda": return void cmdOODA(ctx);
        case "research": return void cmdResearch(ctx);
        case "memory": return void cmdMemory(
          ctx,
          () => this.memories,
          (tier, content) => this.memories.push({ tier, content, timestamp: new Date().toISOString() }),
        );
        case "dream": return void cmdDream(ctx, () => this.memories, () => {});
        case "skills": return void cmdSkills(ctx);
        case "tailscale": return void cmdTailscale(ctx);
        case "agent": return void cmdAgent(ctx);
        case "status": return void cmdStatus(ctx, this.state);
        default:
          await ctx.reply(`❓ Unknown command: \`/${rawCmd}\`\n\nUse /help for the full list.`);
      }
    } catch (err) {
      console.error(`[Bot] Command error /${rawCmd}:`, err);
      await ctx.reply(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─── Pump Scanner (signal-only, no key needed) ────────────────────────────

  private scannerChatIds = new Set<number>();

  private startPumpScanner(chatId: number): void {
    this.scannerChatIds.add(chatId);
    if (this.sniper) return; // scanner re-uses sniper connection

    const config = defaultSniperConfig();
    config.minScore = parseInt(process.env.PUMP_MIN_SCORE ?? "60", 10);

    this.sniper = new PumpSniper(config, {
      onNewToken: (signal) => {
        this.signals.unshift(signal);
        if (this.signals.length > 200) this.signals.pop();

        // Only broadcast STRONG/MODERATE signals
        if (signal.strength === "STRONG" || signal.strength === "MODERATE") {
          const emoji = signal.strength === "STRONG" ? "🟢" : "🟡";
          const bar = "█".repeat(Math.round(signal.score / 10)) + "░".repeat(10 - Math.round(signal.score / 10));
          const msg =
            `${emoji} *Pump Signal — ${signal.strength}*\n\n` +
            `*${signal.symbol}*\n` +
            `Score: ${bar} ${signal.score}/100\n` +
            `Mint: \`${signal.mint}\`\n` +
            (signal.reasons.length ? `✅ ${signal.reasons.join(" | ")}\n` : "") +
            (signal.risks.length ? `⚠️ ${signal.risks.join(" | ")}\n` : "") +
            `\n[View on Pump.fun](https://pump.fun/${signal.mint})`;

          // Store in memory
          this.memories.push({
            tier: "INFERRED",
            content: `Pump signal ${signal.strength} ${signal.score}/100: ${signal.symbol} (${signal.mint}) — ${signal.reasons.join(", ")}`,
            timestamp: new Date().toISOString(),
          });

          // Broadcast to all scanner chats
          for (const cid of this.scannerChatIds) {
            this.api.sendMessage(cid, msg).catch(console.error);
          }
        }
      },
      onBuy: (position, signal) => {
        const msg =
          `🛒 *Sniper Buy Executed*\n\n` +
          `*${position.symbol}*\n` +
          `Mint: \`${position.mint}\`\n` +
          `Amount: ${position.buySolAmount} SOL\n` +
          `TP: +${this.sniper ? (this.config as unknown as Record<string, unknown>) : "50"}% | SL: -${15}%\n` +
          `Signal: ${signal.score}/100`;
        for (const cid of this.scannerChatIds) {
          this.api.sendMessage(cid, msg).catch(console.error);
        }
      },
      onSell: (position, reason, solOut) => {
        const pnl = solOut - position.buySolAmount;
        const emoji = pnl > 0 ? "✅" : "❌";
        const msg =
          `${emoji} *Sniper ${reason} — ${position.symbol}*\n\n` +
          `SOL in: ${position.buySolAmount.toFixed(4)}\n` +
          `SOL out: ${solOut.toFixed(4)}\n` +
          `PnL: ${pnl > 0 ? "+" : ""}${pnl.toFixed(4)} SOL\n` +
          `Reason: ${reason}`;
        for (const cid of this.scannerChatIds) {
          this.api.sendMessage(cid, msg).catch(console.error);
        }
      },
      onError: (err) => {
        console.error("[PumpSniper]", err);
      },
      onSkip: (signal, reason) => {
        if (process.env.PUMP_VERBOSE === "true") {
          console.log(`[Scanner] Skip ${signal.symbol} (${signal.score}/100): ${reason}`);
        }
      },
    });

    this.sniper.start();
    console.log("[Bot] Pump scanner started");
  }

  private stopPumpScanner(): void {
    this.scannerChatIds.clear();
    this.sniper?.stop();
    this.sniper = null;
    this.state.scannerRunning = false;
    console.log("[Bot] Pump scanner stopped");
  }

  private startSniper(chatId: number, cfgOverrides: Record<string, unknown>): void {
    this.state.sniperRunning = true;

    const config = defaultSniperConfig();
    if (cfgOverrides.solAmount) config.solAmount = Number(cfgOverrides.solAmount);
    if (cfgOverrides.tp) config.takeProfitPct = Number(cfgOverrides.tp);
    if (cfgOverrides.sl) config.stopLossPct = Number(cfgOverrides.sl);
    if (cfgOverrides.mayhemOnly) config.mayhemOnly = Boolean(cfgOverrides.mayhemOnly);

    if (!this.sniper) {
      this.startPumpScanner(chatId);
    }
  }

  private stopForChat(chatId: number): void {
    this.scannerChatIds.delete(chatId);
    const session = this.state.sessions.get(chatId);
    if (session) session.mode = "idle";

    // If no more chats using scanner, stop it
    if (this.scannerChatIds.size === 0) {
      this.stopPumpScanner();
      this.state.sniperRunning = false;
    }
  }

  // ─── Long-Polling Loop ────────────────────────────────────────────────────

  async startPolling(): Promise<void> {
    await this.api.deleteWebhook();
    await this.api.setMyCommands();
    this.running = true;

    console.log("🤖 solana-claude Telegram bot started (long-polling)");
    console.log(`📊 Allowed chats: ${this.config.allowedChatIds.length > 0 ? this.config.allowedChatIds.join(", ") : "ALL (open)"}`);

    while (this.running) {
      try {
        const updates = await this.api.getUpdates(this.updateOffset);
        for (const update of updates) {
          this.updateOffset = update.update_id + 1;
          if (update.message) {
            await this.dispatch(update.message).catch(console.error);
          }
        }
      } catch (err) {
        if (!String(err).includes("terminated")) {
          console.error("[Bot] Polling error:", err);
        }
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  // ─── Webhook Mode (Tailscale Funnel) ─────────────────────────────────────

  async startWebhook(): Promise<void> {
    if (!this.config.webhookUrl) throw new Error("webhookUrl is required for webhook mode");

    const port = this.config.webhookPort ?? 3000;
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET ?? "solana-claude-secret";
    const webhookPath = "/telegram/webhook";

    await this.api.setWebhook(`${this.config.webhookUrl}${webhookPath}`, secretToken);
    await this.api.setMyCommands();

    // Minimal HTTP server (no deps)
    const http = await import("node:http");
    const server = http.createServer(async (req, res) => {
      if (req.method !== "POST" || req.url !== webhookPath) {
        res.writeHead(200);
        res.end("solana-claude bot is running");
        return;
      }

      // Verify secret
      const secret = req.headers["x-telegram-bot-api-secret-token"];
      if (secret !== secretToken) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", async () => {
        res.writeHead(200);
        res.end("OK");
        try {
          const update = JSON.parse(body) as TgUpdate;
          if (update.message) {
            await this.dispatch(update.message).catch(console.error);
          }
        } catch { /* ignore */ }
      });
    });

    server.listen(port, () => {
      console.log(`🤖 solana-claude bot running in webhook mode`);
      console.log(`🌐 Webhook URL: ${this.config.webhookUrl}${webhookPath}`);
      console.log(`📡 Local port: ${port}`);
      console.log(`🛡 Tailscale Funnel: tailscale funnel ${port}`);
    });
  }

  stop(): void {
    this.running = false;
    this.stopPumpScanner();
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function startTelegramBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not set.\n" +
      "1. Open Telegram → search @BotFather\n" +
      "2. /newbot → follow steps\n" +
      "3. Copy the token → set TELEGRAM_BOT_TOKEN=<token>"
    );
  }

  const allowedChatIds = (process.env.TELEGRAM_ALLOWED_CHATS ?? "")
    .split(",")
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));

  const adminUserIds = (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL ?? "";
  const useWebhook = Boolean(webhookUrl) && process.env.TELEGRAM_USE_WEBHOOK === "true";

  const config: TelegramBotConfig = {
    token,
    allowedChatIds,
    adminUserIds,
    webhookUrl: webhookUrl || undefined,
    webhookPort: parseInt(process.env.TELEGRAM_WEBHOOK_PORT ?? "3000", 10),
    useLongPolling: !useWebhook,
  };

  if (allowedChatIds.length === 0) {
    console.warn("⚠️  TELEGRAM_ALLOWED_CHATS not set — bot is OPEN to all users");
    console.warn("   Set TELEGRAM_ALLOWED_CHATS=<chat_id1>,<chat_id2> to restrict access");
  }

  const bot = new SolanaClaudeBot(config);

  // Graceful shutdown
  process.on("SIGINT", () => { bot.stop(); process.exit(0); });
  process.on("SIGTERM", () => { bot.stop(); process.exit(0); });

  if (useWebhook) {
    await bot.startWebhook();
  } else {
    await bot.startPolling();
  }
}
