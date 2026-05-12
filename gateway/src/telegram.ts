/**
 * Minimal Telegram Bot API client — zero external dependencies.
 * Uses long-polling (getUpdates) for simplicity and reliability.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const ALLOW_FROM = (process.env.TELEGRAM_ALLOW_FROM ?? '').split(',').map(s => s.trim()).filter(Boolean);
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export type TelegramMessage = {
  message_id: number;
  from: { id: number; first_name: string; username?: string };
  chat: { id: number; type: string };
  text?: string;
  date: number;
};

type Update = {
  update_id: number;
  message?: TelegramMessage;
};

export type CommandHandler = (msg: TelegramMessage, args: string) => Promise<void>;

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function tgCall(method: string, body?: Record<string, unknown>): Promise<unknown> {
  const resp = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await resp.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!json.ok) throw new Error(`Telegram API ${method}: ${json.description}`);
  return json.result;
}

export async function sendMessage(
  chatId: number,
  text: string,
  opts?: { parse_mode?: string; reply_to_message_id?: number },
): Promise<unknown> {
  return tgCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: opts?.parse_mode ?? 'Markdown',
    ...opts,
  });
}

export async function sendTyping(chatId: number): Promise<void> {
  await tgCall('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
}

export async function getMe(): Promise<{ id: number; first_name: string; username: string }> {
  return tgCall('getMe') as Promise<{ id: number; first_name: string; username: string }>;
}

// ---------------------------------------------------------------------------
// Bot runner with long polling
// ---------------------------------------------------------------------------
export class TelegramBot {
  private commands = new Map<string, CommandHandler>();
  private defaultHandler: CommandHandler | null = null;
  private offset = 0;
  private running = false;

  /** Register a /command handler */
  command(cmd: string, handler: CommandHandler): this {
    this.commands.set(cmd.toLowerCase(), handler);
    return this;
  }

  /** Handler for non-command messages */
  onMessage(handler: CommandHandler): this {
    this.defaultHandler = handler;
    return this;
  }

  /** Start long-polling loop */
  async start(): Promise<void> {
    if (!BOT_TOKEN) {
      console.error('[TelegramBot] No TELEGRAM_BOT_TOKEN — bot disabled');
      return;
    }
    const me = await getMe();
    console.log(`[TelegramBot] Logged in as @${me.username} (${me.id})`);
    this.running = true;
    this.poll();
  }

  stop(): void {
    this.running = false;
  }

  private async poll(): Promise<void> {
    while (this.running) {
      try {
        const updates = (await tgCall('getUpdates', {
          offset: this.offset,
          timeout: 30,
          allowed_updates: ['message'],
        })) as Update[];

        for (const update of updates) {
          this.offset = update.update_id + 1;
          if (update.message) {
            this.handleMessage(update.message).catch((err) => {
              console.error('[TelegramBot] Handler error:', err.message);
            });
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[TelegramBot] Poll error:', msg);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  private async handleMessage(msg: TelegramMessage): Promise<void> {
    // Access control
    if (ALLOW_FROM.length > 0 && !ALLOW_FROM.includes(String(msg.from.id))) {
      await sendMessage(msg.chat.id, '⛔ Unauthorized. Contact the bot owner.');
      return;
    }

    const text = msg.text?.trim() ?? '';

    // Command dispatch
    if (text.startsWith('/')) {
      const [rawCmd, ...rest] = text.split(/\s+/);
      const cmd = rawCmd.replace(/^\//, '').replace(/@.*$/, '').toLowerCase();
      const args = rest.join(' ');

      const handler = this.commands.get(cmd);
      if (handler) {
        await sendTyping(msg.chat.id);
        await handler(msg, args);
        return;
      }
    }

    // Fallback to default handler
    if (this.defaultHandler) {
      await sendTyping(msg.chat.id);
      await this.defaultHandler(msg, text);
    }
  }
}
