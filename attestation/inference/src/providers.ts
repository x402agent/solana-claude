import type { InferenceRequest, InferenceResponse, ModelProvider } from './types';

// ─── Provider Adapter Interface ───────────────────────────────────────────────

interface ModelAdapter {
  complete(req: InferenceRequest): Promise<InferenceResponse>;
  available(): boolean;
}

// ─── Claude (Anthropic) ───────────────────────────────────────────────────────

class ClaudeAdapter implements ModelAdapter {
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = 'claude-sonnet-4-6') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  available(): boolean {
    return !!this.apiKey;
  }

  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: this.apiKey });
    const model = req.model ?? this.defaultModel;
    const start = Date.now();

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: req.prompt },
    ];

    const response = await client.messages.create({
      model,
      max_tokens: req.maxTokens ?? 4096,
      ...(req.systemPrompt ? { system: req.systemPrompt } : {}),
      messages,
    });

    const text =
      response.content
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('') ?? '';

    return {
      text,
      model: response.model,
      provider: 'claude',
      promptTokens: response.usage?.input_tokens,
      completionTokens: response.usage?.output_tokens,
      durationMs: Date.now() - start,
    };
  }
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

class OpenAIAdapter implements ModelAdapter {
  private apiKey: string;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = 'gpt-4o') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  available(): boolean {
    return !!this.apiKey;
  }

  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    const model = req.model ?? this.defaultModel;
    const start = Date.now();

    const body = JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 4096,
      messages: [
        ...(req.systemPrompt ? [{ role: 'system', content: req.systemPrompt }] : []),
        { role: 'user', content: req.prompt },
      ],
    });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as {
      model: string;
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      text: json.choices[0]?.message.content ?? '',
      model: json.model,
      provider: 'openai',
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      durationMs: Date.now() - start,
    };
  }
}

// ─── Echo (local / demo fallback) ────────────────────────────────────────────

class EchoAdapter implements ModelAdapter {
  available(): boolean { return true; }

  async complete(req: InferenceRequest): Promise<InferenceResponse> {
    await new Promise(r => setTimeout(r, 100));
    return {
      text: `[demo-echo] You asked: "${req.prompt.slice(0, 120)}${req.prompt.length > 120 ? '...' : ''}"`,
      model: 'demo-echo-v1',
      provider: 'local',
      durationMs: 100,
    };
  }
}

// ─── Provider Registry ────────────────────────────────────────────────────────

export class ProviderRegistry {
  private adapters = new Map<ModelProvider, ModelAdapter>();

  register(provider: ModelProvider, adapter: ModelAdapter): void {
    this.adapters.set(provider, adapter);
  }

  get(provider: ModelProvider): ModelAdapter | undefined {
    return this.adapters.get(provider);
  }

  resolve(preferred: ModelProvider): ModelAdapter {
    const adapter = this.adapters.get(preferred);
    if (adapter?.available()) return adapter;
    // fallback chain: claude → openai → local
    for (const p of ['claude', 'openai', 'local'] as ModelProvider[]) {
      const a = this.adapters.get(p);
      if (a?.available()) return a;
    }
    throw new Error('No available model provider');
  }

  async complete(req: InferenceRequest, provider?: ModelProvider): Promise<InferenceResponse> {
    const target = provider ?? req.provider ?? 'claude';
    const adapter = this.resolve(target);
    return adapter.complete(req);
  }
}

export function buildProviderRegistry(config: {
  claudeApiKey?: string;
  openaiApiKey?: string;
  defaultModel?: string;
}): ProviderRegistry {
  const registry = new ProviderRegistry();
  if (config.claudeApiKey) {
    registry.register('claude', new ClaudeAdapter(config.claudeApiKey, config.defaultModel));
  }
  if (config.openaiApiKey) {
    registry.register('openai', new OpenAIAdapter(config.openaiApiKey));
  }
  registry.register('local', new EchoAdapter());
  return registry;
}
