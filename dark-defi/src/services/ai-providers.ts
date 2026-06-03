// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - AI Provider Services
// xAI Grok, Perplexity, OpenRouter (MiniMax M2.1)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  reasoning?: any;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      reasoning_details?: any;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// XAI GROK SERVICE - Real-time Search & Conversational AI
// ─────────────────────────────────────────────────────────────────────────────

export class GrokService {
  private apiKey: string;
  private baseUrl = 'https://api.x.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: ChatMessage[], options: { model?: string; temperature?: number; maxTokens?: number } = {}): Promise<AIResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || 'grok-beta',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.status}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      return {
        content: data.choices[0].message.content,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      console.error('[GROK] API error:', error);
      return null;
    }
  }

  async search(query: string): Promise<AIResponse | null> {
    return this.chat([
      {
        role: 'system',
        content: 'You are a real-time search assistant with access to current information. Provide accurate, up-to-date information with sources when possible.',
      },
      {
        role: 'user',
        content: `Search for current information about: ${query}`,
      },
    ]);
  }

  async analyzeMarket(context: string): Promise<AIResponse | null> {
    return this.chat([
      {
        role: 'system',
        content: `You are DARK RALPH, a recursive autonomous AI analyzing cryptocurrency markets.
        Speak in cryptic, technical language. Provide actionable insights.
        Format data with [ALERT], [SIGNAL], [DATA] tags.`,
      },
      {
        role: 'user',
        content: context,
      },
    ]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERPLEXITY SERVICE - AI-Powered Research
// ─────────────────────────────────────────────────────────────────────────────

export class PerplexityService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: ChatMessage[], options: { model?: string; temperature?: number } = {}): Promise<AIResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model || 'llama-3.1-sonar-small-128k-online',
          messages,
          temperature: options.temperature ?? 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      return {
        content: data.choices[0].message.content,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      console.error('[PERPLEXITY] API error:', error);
      return null;
    }
  }

  async research(topic: string): Promise<AIResponse | null> {
    return this.chat([
      {
        role: 'system',
        content: 'You are a research assistant specializing in cryptocurrency and blockchain technology. Provide comprehensive, accurate information with citations.',
      },
      {
        role: 'user',
        content: `Research the following topic thoroughly: ${topic}`,
      },
    ]);
  }

  async summarizeNews(articles: string[]): Promise<AIResponse | null> {
    return this.chat([
      {
        role: 'system',
        content: 'Summarize the following news articles into key insights for a crypto trader.',
      },
      {
        role: 'user',
        content: articles.join('\n\n---\n\n'),
      },
    ]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENROUTER SERVICE - MiniMax M2.1 with Reasoning
// ─────────────────────────────────────────────────────────────────────────────

export class OpenRouterService {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string, model = 'minimax/minimax-m2.1') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async chat(
    messages: ChatMessage[],
    options: { enableReasoning?: boolean; temperature?: number; maxTokens?: number } = {}
  ): Promise<AIResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://darkralph.ai',
          'X-Title': 'Dark Ralph TUI',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          reasoning: { enabled: options.enableReasoning !== false },
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens || 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const message = data.choices[0].message;

      return {
        content: message.content,
        reasoning: message.reasoning_details || null,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      console.error('[OPENROUTER] API error:', error);
      return null;
    }
  }

  async analyzeWithReasoning(prompt: string, context = ''): Promise<AIResponse | null> {
    return this.chat(
      [
        {
          role: 'system',
          content: `You are DARK RALPH, a recursive autonomous AI agent analyzing cryptocurrency markets.
          Think step by step and show your reasoning process.
          Be cryptic yet insightful. Use technical analysis when appropriate.
          Context: ${context}`,
        },
        { role: 'user', content: prompt },
      ],
      { enableReasoning: true }
    );
  }

  async continueConversation(messages: ChatMessage[], newMessage: string): Promise<AIResponse | null> {
    return this.chat([...messages, { role: 'user', content: newMessage }], { enableReasoning: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED AI SERVICE - Combines all providers
// ─────────────────────────────────────────────────────────────────────────────

export class UnifiedAIService {
  private grok?: GrokService;
  private perplexity?: PerplexityService;
  private openRouter?: OpenRouterService;
  private conversationHistory: ChatMessage[] = [];

  constructor(config: { grokKey?: string; perplexityKey?: string; openRouterKey?: string; openRouterModel?: string }) {
    if (config.grokKey) {
      this.grok = new GrokService(config.grokKey);
    }
    if (config.perplexityKey) {
      this.perplexity = new PerplexityService(config.perplexityKey);
    }
    if (config.openRouterKey) {
      this.openRouter = new OpenRouterService(config.openRouterKey, config.openRouterModel);
    }
  }

  // Smart routing based on query type
  async query(prompt: string, type: 'search' | 'research' | 'analysis' | 'chat' = 'chat'): Promise<AIResponse | null> {
    // Add to history
    this.conversationHistory.push({ role: 'user', content: prompt });

    let response: AIResponse | null = null;

    switch (type) {
      case 'search':
        // Use Grok for real-time search
        response = this.grok ? await this.grok.search(prompt) : null;
        break;

      case 'research':
        // Use Perplexity for deep research
        response = this.perplexity ? await this.perplexity.research(prompt) : null;
        break;

      case 'analysis':
        // Use OpenRouter with reasoning for analysis
        response = this.openRouter ? await this.openRouter.analyzeWithReasoning(prompt) : null;
        break;

      case 'chat':
      default:
        // Try OpenRouter first, fallback to Grok, then Perplexity
        response = this.openRouter
          ? await this.openRouter.chat(this.conversationHistory)
          : this.grok
            ? await this.grok.chat(this.conversationHistory)
            : this.perplexity
              ? await this.perplexity.chat(this.conversationHistory)
              : null;
    }

    // Add response to history
    if (response) {
      this.conversationHistory.push({ role: 'assistant', content: response.content });
    }

    return response;
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversationHistory = [];
  }

  // Get available providers
  getAvailableProviders(): string[] {
    const providers: string[] = [];
    if (this.grok) providers.push('grok');
    if (this.perplexity) providers.push('perplexity');
    if (this.openRouter) providers.push('openrouter');
    return providers;
  }
}

export default UnifiedAIService;
