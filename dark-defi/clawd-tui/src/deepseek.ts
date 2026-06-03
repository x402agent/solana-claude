// Thin DeepSeek API client (https://api.deepseek.com).
// OpenAI-compatible chat completions + FIM (beta) + models + user balance.
// No external deps — uses native fetch + ReadableStream.

export type DeepSeekModel = 'deepseek-v4-flash' | 'deepseek-v4-pro' | (string & {});

export interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  reasoning_content?: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
  prefix?: boolean;
}

export interface DeepSeekUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}

export interface DeepSeekChatChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string | null;
    reasoning_content?: string | null;
    tool_calls?: unknown[];
  };
  finish_reason: string | null;
  logprobs?: unknown;
}

export interface DeepSeekChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  system_fingerprint?: string;
  choices: DeepSeekChatChoice[];
  usage?: DeepSeekUsage;
}

export interface DeepSeekStreamDelta {
  type: 'text' | 'reasoning' | 'usage' | 'done' | 'error';
  delta?: string;
  usage?: DeepSeekUsage;
  error?: string;
}

export interface DeepSeekChatRequest {
  messages: DeepSeekChatMessage[];
  model?: DeepSeekModel;
  thinking?: { type: 'enabled' | 'disabled' };
  reasoning_effort?: 'high' | 'max';
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[] | null;
  stream?: boolean;
  response_format?: { type: 'text' | 'json_object' };
  tools?: unknown[];
  tool_choice?: unknown;
  user_id?: string;
}

export interface DeepSeekFimRequest {
  prompt: string;
  model?: 'deepseek-v4-pro';
  suffix?: string | null;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  echo?: boolean;
  logprobs?: number | null;
  stop?: string | string[] | null;
  stream?: boolean;
}

export interface DeepSeekFimResponse {
  id: string;
  object: 'text_completion';
  created: number;
  model: string;
  choices: { index: number; text: string; finish_reason: string | null; logprobs?: unknown }[];
  usage?: DeepSeekUsage;
}

export interface DeepSeekModelsResponse {
  object: 'list';
  data: { id: string; object: 'model'; owned_by?: string; created?: number }[];
}

export interface DeepSeekBalanceInfo {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

export interface DeepSeekBalanceResponse {
  is_available: boolean;
  balance_infos: DeepSeekBalanceInfo[];
}

export class DeepSeekError extends Error {
  status?: number;
  body?: string;
  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export interface DeepSeekClientOptions {
  apiKey: string;
  baseUrl?: string; // default 'https://api.deepseek.com'
  defaultModel?: DeepSeekModel; // default 'deepseek-v4-pro'
  fetchImpl?: typeof fetch;
}

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL: DeepSeekModel = 'deepseek-v4-pro';

export class DeepSeekClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: DeepSeekModel;
  private fetchImpl: typeof fetch;

  constructor(opts: DeepSeekClientOptions) {
    if (!opts.apiKey) {
      throw new DeepSeekError('DEEPSEEK_API_KEY is required');
    }
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.defaultModel = opts.defaultModel ?? DEFAULT_MODEL;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  get model(): DeepSeekModel {
    return this.defaultModel;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /** Non-streaming chat completion. */
  async chat(req: DeepSeekChatRequest): Promise<DeepSeekChatResponse> {
    const body = this.buildChatBody({ ...req, stream: false });
    const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new DeepSeekError(
        `DeepSeek chat ${res.status} ${res.statusText}`,
        res.status,
        await safeText(res),
      );
    }
    return (await res.json()) as DeepSeekChatResponse;
  }

  /** Streaming chat completion — yields text/reasoning deltas, then a final usage event. */
  async *chatStream(req: DeepSeekChatRequest): AsyncGenerator<DeepSeekStreamDelta, void, void> {
    const body = this.buildChatBody({ ...req, stream: true, stream_options: { include_usage: true } } as any);
    const res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { ...this.headers(), Accept: 'text/event-stream' },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      throw new DeepSeekError(
        `DeepSeek chat (stream) ${res.status} ${res.statusText}`,
        res.status,
        await safeText(res),
      );
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trimEnd();
          buffer = buffer.slice(nl + 1);
          if (!line || line.startsWith(':')) continue;
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            yield { type: 'done' };
            return;
          }
          try {
            const evt = JSON.parse(payload);
            const choice = evt?.choices?.[0];
            if (choice) {
              const delta = choice.delta ?? {};
              if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
                yield { type: 'reasoning', delta: delta.reasoning_content };
              }
              if (typeof delta.content === 'string' && delta.content) {
                yield { type: 'text', delta: delta.content };
              }
            }
            if (evt?.usage) {
              yield { type: 'usage', usage: evt.usage as DeepSeekUsage };
            }
          } catch (err) {
            yield { type: 'error', error: `failed to parse SSE payload: ${(err as Error).message}` };
          }
        }
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // ignore
      }
    }
  }

  /** FIM (Fill-In-the-Middle) completion — beta endpoint. */
  async fim(req: DeepSeekFimRequest): Promise<DeepSeekFimResponse> {
    const body = {
      model: req.model ?? 'deepseek-v4-pro',
      prompt: req.prompt,
      suffix: req.suffix ?? null,
      max_tokens: req.max_tokens ?? 1024,
      temperature: req.temperature ?? 1,
      top_p: req.top_p ?? 1,
      echo: req.echo ?? false,
      logprobs: req.logprobs ?? null,
      stop: req.stop ?? null,
      stream: false,
    };
    const res = await this.fetchImpl(`${this.baseUrl}/beta/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new DeepSeekError(
        `DeepSeek FIM ${res.status} ${res.statusText}`,
        res.status,
        await safeText(res),
      );
    }
    return (await res.json()) as DeepSeekFimResponse;
  }

  /** List available models. */
  async listModels(): Promise<DeepSeekModelsResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new DeepSeekError(
        `DeepSeek models ${res.status} ${res.statusText}`,
        res.status,
        await safeText(res),
      );
    }
    return (await res.json()) as DeepSeekModelsResponse;
  }

  /** Get user balance — endpoint documented in the API sidebar (Others → Get User Balance). */
  async getBalance(): Promise<DeepSeekBalanceResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/user/balance`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new DeepSeekError(
        `DeepSeek balance ${res.status} ${res.statusText}`,
        res.status,
        await safeText(res),
      );
    }
    return (await res.json()) as DeepSeekBalanceResponse;
  }

  private buildChatBody(req: DeepSeekChatRequest & { stream_options?: unknown }): Record<string, unknown> {
    const thinking = req.thinking ?? { type: 'enabled' };
    const reasoning_effort = req.reasoning_effort ?? 'high';
    const out: Record<string, unknown> = {
      model: req.model ?? this.defaultModel,
      messages: req.messages,
      thinking,
      reasoning_effort,
      stream: !!req.stream,
    };
    if (req.max_tokens != null) out.max_tokens = req.max_tokens;
    if (req.response_format) out.response_format = req.response_format;
    if (req.stop !== undefined) out.stop = req.stop;
    if (req.tools) out.tools = req.tools;
    if (req.tool_choice !== undefined) out.tool_choice = req.tool_choice;
    if (req.user_id) out.user_id = req.user_id;
    if (req.stream_options) out.stream_options = req.stream_options;
    // Thinking mode does not honor temperature/top_p; only forward when thinking is disabled.
    if (thinking.type === 'disabled') {
      if (req.temperature != null) out.temperature = req.temperature;
      if (req.top_p != null) out.top_p = req.top_p;
    }
    return out;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return '';
  }
}

/**
 * Anthropic-compatible base URL helper. DeepSeek exposes the Anthropic API
 * format at `<base>/anthropic`, so set `ANTHROPIC_BASE_URL` to this value
 * when wiring the official `@anthropic-ai/sdk` against DeepSeek.
 */
export function deepseekAnthropicBaseUrl(baseUrl = DEFAULT_BASE_URL): string {
  return `${baseUrl.replace(/\/+$/, '')}/anthropic`;
}
