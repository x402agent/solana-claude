/**
 * src/telegram/types.ts
 *
 * Telegram gateway type definitions for solana-claude.
 */

// ─── Session ────────────────────────────────────────────────────────────────

export interface TelegramSession {
  chatId: number;
  userId: number;
  username?: string;
  /** Whether this chat has passed the access check */
  authorized: boolean;
  /** Active bot mode */
  mode: BotMode;
  /** In-session memory (cleared per session) */
  context: string[];
  /** Last activity timestamp */
  lastActive: number;
  /** Active background tasks started by this chat */
  activeTasks: string[];
}

export type BotMode =
  | "idle"
  | "research"       // OODA observe only
  | "sniper"         // Pump.fun sniper mode
  | "scanner"        // background pump scanner
  | "analyst"        // deep analysis mode
  | "monitor"        // onchain event monitor
  | "dream";         // memory consolidation

// ─── Bot Config ─────────────────────────────────────────────────────────────

export interface TelegramBotConfig {
  /** Telegram Bot API token from @BotFather */
  token: string;
  /** Allowed chat IDs (empty = open, warn in logs) */
  allowedChatIds: number[];
  /** Optional admin user IDs (can run trade execution) */
  adminUserIds: number[];
  /** Optional Tailscale Funnel URL for webhook mode */
  webhookUrl?: string;
  /** Port to listen on in webhook mode (default: 3000) */
  webhookPort?: number;
  /** Whether to use long-polling (default: true, no public URL needed) */
  useLongPolling: boolean;
  /** MCP server URL (if using HTTP transport) */
  mcpServerUrl?: string;
}

// ─── Bot State ───────────────────────────────────────────────────────────────

export interface BotState {
  /** All active sessions keyed by chatId */
  sessions: Map<number, TelegramSession>;
  /** Is the pump sniper running (across all chats) */
  sniperRunning: boolean;
  /** Is the pump scanner running */
  scannerRunning: boolean;
  /** Bot start time */
  startedAt: number;
  /** Total messages processed */
  messageCount: number;
}

// ─── Command Context ─────────────────────────────────────────────────────────

export interface CommandContext {
  chatId: number;
  chatType: string;
  userId: number;
  username?: string;
  session: TelegramSession;
  /** Parsed command args (everything after /command) */
  args: string[];
  /** Full message text */
  text: string;
  /** Reply function — sends text in Markdown */
  reply: (text: string, opts?: ReplyOptions) => Promise<void>;
  /** Reply with HTML */
  replyHTML: (html: string) => Promise<void>;
  /** Edit the last sent message */
  editLast: (text: string) => Promise<void>;
  /** Send a typing action */
  typing: () => Promise<void>;
  /** Send a remote image URL as a Telegram photo */
  sendPhoto?: (photoUrl: string, caption?: string) => Promise<void>;
  /** Send a remote video URL as a Telegram video */
  sendVideo?: (videoUrl: string, caption?: string) => Promise<void>;
  /** Attached image URL resolved by the bot layer */
  imageUrl?: string;
}

export interface ReplyOptions {
  parseMode?: "Markdown" | "HTML" | "MarkdownV2";
  disablePreview?: boolean;
  replyMarkup?: InlineKeyboard;
}

// ─── Inline keyboards ────────────────────────────────────────────────────────

export interface InlineKeyboard {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

// ─── Trade Signal (from scanner → bot) ──────────────────────────────────────

export interface TradingSignal {
  mint: string;
  symbol: string;
  score: number;
  strength: "STRONG" | "MODERATE" | "WEAK" | "AVOID";
  progressPct: number;
  isGraduated: boolean;
  reasons: string[];
  risks: string[];
  marketCapUSD?: number;
  vol24hUSD?: number;
  detectedAt: number;
}

// ─── Sniper State ────────────────────────────────────────────────────────────

export interface SniperPosition {
  mint: string;
  symbol: string;
  buySignature: string;
  tokenAmount: number;
  buySolAmount: number;
  buyTimestamp: number;
  takeProfitSol: number;
  stopLossSol: number;
  timeoutMs: number;
  chatId: number;
}
