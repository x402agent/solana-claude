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
  ReplyOptions,
} from "./types.js";

import {
  cmdStart, cmdHelp, cmdSol, cmdPrice, cmdTrending,
  cmdToken, cmdWallet, cmdScanToggle, cmdGrad, cmdMcap,
  cmdCashback, cmdSignals, cmdStatus, cmdOODA, cmdResearch,
  cmdMemory, cmdDream, cmdSkills, cmdTailscale,
  cmdSnipe, cmdStop, cmdAgent,
  cmdBalance, cmdTokens, cmdTxs, cmdSlot, cmdAssets,
  cmdBirdeyePrice, cmdBirdeyeSearch, cmdBirdeyeOverview,
  cmdVault,
  cmdGrok, cmdXSearch, cmdWebSearch, cmdImagine, cmdVideo, cmdVision, cmdFile,
  cmdTweet, cmdReply, cmdDelTweet, cmdLike, cmdRT,
  cmdTSearch, cmdMyTweets, cmdAutoTweet, cmdSmartTweet,
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
  caption?: string;
  photo?: Array<{ file_id: string; file_unique_id: string; width: number; height: number }>;
  document?: { file_id: string; file_name?: string; mime_type?: string };
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
    parseMode?: string;
    disablePreview?: boolean;
    replyMarkup?: unknown;
  }): Promise<{ message_id: number }> {
    const payload = {
      chat_id: chatId,
      text: text.slice(0, 4096),
      parse_mode: opts?.parseMode ?? "Markdown",
      disable_web_page_preview: opts?.disablePreview ?? true,
      reply_markup: opts?.replyMarkup,
    };

    let result: { message_id: number };
    try {
      result = await this.request<{ message_id: number }>("sendMessage", payload);
    } catch (error) {
      if (
        payload.parse_mode &&
        error instanceof Error &&
        error.message.includes("can't parse entities")
      ) {
        result = await this.request<{ message_id: number }>("sendMessage", {
          ...payload,
          parse_mode: undefined,
        });
      } else {
        throw error;
      }
    }

    this.lastSentMessageId.set(chatId, result.message_id);
    return result;
  }

  async editMessage(chatId: number, messageId: number, text: string, opts?: {
    parseMode?: string;
    disablePreview?: boolean;
  }): Promise<void> {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text.slice(0, 4096),
      parse_mode: opts?.parseMode ?? "Markdown",
      disable_web_page_preview: opts?.disablePreview ?? true,
    };

    await this.request("editMessageText", payload).catch(async (error) => {
      if (
        payload.parse_mode &&
        error instanceof Error &&
        error.message.includes("can't parse entities")
      ) {
        await this.request("editMessageText", {
          ...payload,
          parse_mode: undefined,
        }).catch(() => {});
        return;
      }
      /* ignore if message unchanged */
    });
  }

  async sendChatAction(chatId: number, action: string): Promise<void> {
    await this.request("sendChatAction", { chat_id: chatId, action }).catch(() => {});
  }

  async sendPhoto(chatId: number, photoUrl: string, caption?: string): Promise<void> {
    const payload = {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption?.slice(0, 1024),
      parse_mode: "Markdown",
    };

    try {
      await this.request("sendPhoto", payload);
    } catch (error) {
      if (
        payload.parse_mode &&
        error instanceof Error &&
        error.message.includes("can't parse entities")
      ) {
        await this.request("sendPhoto", {
          ...payload,
          parse_mode: undefined,
        });
        return;
      }
      throw error;
    }
  }

  async sendVideo(chatId: number, videoUrl: string, caption?: string): Promise<void> {
    const payload = {
      chat_id: chatId,
      video: videoUrl,
      caption: caption?.slice(0, 1024),
      parse_mode: "Markdown",
    };

    try {
      await this.request("sendVideo", payload);
    } catch (error) {
      if (
        payload.parse_mode &&
        error instanceof Error &&
        error.message.includes("can't parse entities")
      ) {
        await this.request("sendVideo", {
          ...payload,
          parse_mode: undefined,
        });
        return;
      }
      throw error;
    }
  }

  async getFileUrl(fileId: string): Promise<string> {
    const file = await this.request<{ file_path: string }>("getFile", { file_id: fileId });
    return `https://api.telegram.org/file/bot${this.baseUrl.split("/bot")[1]}/${file.file_path}`;
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
        { command: "balance", description: "SOL balance via Helius RPC" },
        { command: "tokens", description: "Token accounts for a wallet" },
        { command: "txs", description: "Recent transactions for a wallet" },
        { command: "slot", description: "Current slot and block height" },
        { command: "assets", description: "Helius DAS assets by owner" },
        { command: "bprice", description: "Birdeye token price" },
        { command: "bsearch", description: "Birdeye token search" },
        { command: "btoken", description: "Birdeye token overview" },
        { command: "vault", description: "Encrypted secret vault" },
        { command: "status", description: "Bot status" },
        { command: "skills", description: "Available skills" },
        { command: "tailscale", description: "Tailscale setup guide" },
        { command: "grok", description: "Chat with Grok AI" },
        { command: "xsearch", description: "Search X/Twitter in real-time" },
        { command: "wsearch", description: "Search the web in real-time" },
        { command: "imagine", description: "Generate images with Grok" },
        { command: "video", description: "Generate video with Grok" },
        { command: "vision", description: "Analyze an image with Grok" },
        { command: "file", description: "Chat with a file (PDF, CSV)" },
      ],
    });
  }
}

// ─── Bot Class ────────────────────────────────────────────────────────────────

export class SolanaClaudeBot {
  private api: TelegramAPI;
  private config: TelegramBotConfig;
  private state: BotState;
  private scanner: PumpSniper | null = null;
  private sniper: PumpSniper | null = null;
  private signals: TradingSignal[] = [];
  private memories: Array<{ tier: string; content: string; timestamp: string }> = [];
  private updateOffset = 0;
  private running = false;
  private scannerChatIds = new Set<number>();
  private sniperChatIds = new Set<number>();

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

  private buildCtx(
    msg: TgMessage,
    args: string[],
    extras?: { text?: string; imageUrl?: string },
  ): CommandContext {
    const chatId = msg.chat.id;
    const userId = msg.from?.id ?? 0;
    const username = msg.from?.username;
    const session = this.getSession(chatId, userId, username);
    let lastMessageId = 0;

    const reply = async (text: string, opts?: ReplyOptions) => {
      const m = await this.api.sendMessage(chatId, text, {
        parseMode: opts?.parseMode,
        disablePreview: opts?.disablePreview,
        replyMarkup: opts?.replyMarkup,
      });
      lastMessageId = m.message_id;
    };
    const replyHTML = async (html: string) => {
      const m = await this.api.sendMessage(chatId, html, { parseMode: "HTML" });
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
    const sendPhoto = async (photoUrl: string, caption?: string) => {
      await this.api.sendPhoto(chatId, photoUrl, caption);
    };
    const sendVideo = async (videoUrl: string, caption?: string) => {
      await this.api.sendVideo(chatId, videoUrl, caption);
    };

    return {
      chatId,
      userId,
      username,
      session,
      args,
      text: extras?.text ?? msg.text ?? "",
      reply,
      replyHTML,
      editLast,
      typing,
      sendPhoto,
      sendVideo,
      imageUrl: extras?.imageUrl,
    };
  }

  private async dispatch(msg: TgMessage): Promise<void> {
    // Route photo messages through /vision so command behavior stays consistent.
    if (msg.photo && msg.photo.length > 0) {
      const caption = (msg.caption ?? "").trim();
      if (caption.startsWith("/") && !caption.toLowerCase().startsWith("/vision")) {
        return;
      }

      const session = this.getSession(msg.chat.id, msg.from?.id ?? 0, msg.from?.username);
      if (!this.isAuthorized(session)) {
        await this.api.sendMessage(
          msg.chat.id,
          "⛔ This bot is restricted. Contact the owner for access."
        );
        return;
      }

      const largestPhoto = msg.photo[msg.photo.length - 1];
      const question = caption.replace(/^\/vision\s*/i, "").trim();
      const text = question ? `/vision ${question}` : "/vision";
      const args = question ? question.split(/\s+/) : [];

      try {
        const imageUrl = await this.api.getFileUrl(largestPhoto.file_id);
        const ctx = this.buildCtx(msg, args, { text, imageUrl });
        this.state.messageCount++;
        await cmdVision(ctx);
      } catch (err) {
        await this.api.sendMessage(
          msg.chat.id,
          `❌ Vision error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      return;
    }

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
      if (rawCmd === "snipe" && !this.isAdmin(ctx.userId)) {
        await ctx.reply("⛔ This command is restricted to configured admin users.");
        return;
      }

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
            if (running) {
              this.startPumpScanner(msg.chat.id);
            } else {
              this.scannerChatIds.delete(msg.chat.id);
              if (this.scannerChatIds.size === 0) {
                this.stopPumpScanner();
              } else {
                this.state.scannerRunning = true;
              }
            }
          },
          () => this.scannerChatIds.has(msg.chat.id),
        );
        case "signal":
        case "signals":
          return void cmdSignals(ctx, () => this.signals as unknown as Array<Record<string, unknown>>);
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
        case "balance": return void cmdBalance(ctx);
        case "tokens": return void cmdTokens(ctx);
        case "txs": return void cmdTxs(ctx);
        case "slot": return void cmdSlot(ctx);
        case "assets": return void cmdAssets(ctx);
        case "bprice": return void cmdBirdeyePrice(ctx);
        case "bsearch": return void cmdBirdeyeSearch(ctx);
        case "btoken": return void cmdBirdeyeOverview(ctx);
        case "vault": return void cmdVault(ctx);
        case "grok": return void cmdGrok(ctx);
        case "xsearch": return void cmdXSearch(ctx);
        case "wsearch": return void cmdWebSearch(ctx);
        case "imagine": return void cmdImagine(ctx);
        case "video": return void cmdVideo(ctx);
        case "vision": return void cmdVision(ctx);
        case "file": return void cmdFile(ctx);
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

  private startPumpScanner(chatId: number): void {
    this.scannerChatIds.add(chatId);
    this.state.scannerRunning = true;
    if (this.scanner) return;

    const config = defaultSniperConfig();
    config.executionEnabled = false;
    config.minScore = parseInt(process.env.PUMP_MIN_SCORE ?? "60", 10);

    this.scanner = new PumpSniper(config, {
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
      onBuy: () => {},
      onSell: () => {},
      onError: (err) => {
        console.error("[PumpSniper]", err);
      },
      onSkip: (signal, reason) => {
        if (process.env.PUMP_VERBOSE === "true") {
          console.log(`[Scanner] Skip ${signal.symbol} (${signal.score}/100): ${reason}`);
        }
      },
    });

    this.scanner.start();
    console.log("[Bot] Pump scanner started");
  }

  private stopPumpScanner(): void {
    this.scannerChatIds.clear();
    this.scanner?.stop();
    this.scanner = null;
    this.state.scannerRunning = false;
    console.log("[Bot] Pump scanner stopped");
  }

  private startSniper(chatId: number, cfgOverrides: Record<string, unknown>): void {
    this.sniperChatIds.add(chatId);
    this.state.sniperRunning = true;

    const config = defaultSniperConfig();
    config.executionEnabled = true;
    if (cfgOverrides.solAmount) config.solAmount = Number(cfgOverrides.solAmount);
    if (cfgOverrides.tp) config.takeProfitPct = Number(cfgOverrides.tp);
    if (cfgOverrides.sl) config.stopLossPct = Number(cfgOverrides.sl);
    if (cfgOverrides.mayhemOnly) config.mayhemOnly = Boolean(cfgOverrides.mayhemOnly);

    this.sniper = new PumpSniper(config, {
      onNewToken: (signal) => {
        this.signals.unshift(signal);
        if (this.signals.length > 200) this.signals.pop();
      },
      onBuy: (position, signal) => {
        position.chatId = chatId;
        const msg =
          `🛒 *Sniper Buy Executed*\n\n` +
          `*${position.symbol}*\n` +
          `Mint: \`${position.mint}\`\n` +
          `Amount: ${position.buySolAmount} SOL\n` +
          `TP: +${config.takeProfitPct}% | SL: -${config.stopLossPct}%\n` +
          `Signal: ${signal.score}/100`;
        for (const cid of this.sniperChatIds) {
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
        for (const cid of this.sniperChatIds) {
          this.api.sendMessage(cid, msg).catch(console.error);
        }
      },
      onError: (err) => {
        console.error("[Sniper]", err);
      },
      onSkip: (signal, reason) => {
        if (process.env.PUMP_VERBOSE === "true") {
          console.log(`[Sniper] Skip ${signal.symbol} (${signal.score}/100): ${reason}`);
        }
      },
    });

    this.sniper.start();
  }

  private stopForChat(chatId: number): void {
    this.scannerChatIds.delete(chatId);
    this.sniperChatIds.delete(chatId);
    const session = this.state.sessions.get(chatId);
    if (session) session.mode = "idle";

    if (this.sniperChatIds.size === 0) {
      this.sniper?.stop();
      this.sniper = null;
      this.state.sniperRunning = false;
    }

    if (this.scannerChatIds.size === 0) {
      this.stopPumpScanner();
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
    this.sniper?.stop();
    this.sniper = null;
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
