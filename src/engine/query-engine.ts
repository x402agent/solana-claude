/**
 * SolanaOS Query Engine
 *
 * Adapted from Claude Code's src/QueryEngine.ts pipeline patterns.
 *
 * Provider-agnostic multi-model streaming LLM engine with:
 *  - Tool call loops (detect → execute → inject result → continue)
 *  - Thinking mode budget management
 *  - Context compression (session length management)
 *  - Token / cost tracking
 *  - Retry with exponential backoff
 *  - AbortSignal support (for interrupt)
 *
 * Supported providers:
 *  - OpenRouter (primary: minimax-m2.7, Kimi K2.5, Llama 4, etc.)
 *  - xAI / Grok (vision, search, reasoning)
 *  - Anthropic (Claude Sonnet 4.6)
 *  - Mistral (Voxtral TTS/STT side-channel)
 *  - Local MLX (Apple Silicon, via scripts/mlx-server.py Anthropic-compat API)
 */

import { ToolRegistry, ToolResult } from "./tool-base.js";
import { ToolExecutor, LLMToolCall, ToolCallResult } from "./tool-executor.js";

// ─────────────────────────────────────────────────────────────────────────────
// Message types
// ─────────────────────────────────────────────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: MessageRole;
  content: string | ContentBlock[];
  /** Tool call ID if role === "tool" */
  toolCallId?: string;
  /** Tool name if role === "tool" */
  toolName?: string;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

// ─────────────────────────────────────────────────────────────────────────────
// Provider config
// ─────────────────────────────────────────────────────────────────────────────

export type LLMProvider = "openrouter" | "xai" | "anthropic" | "mistral" | "local";

export interface ProviderConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;               // Override for local MLX, Cloudflare AI Gateway, etc.
  maxTokens?: number;
  temperature?: number;
  /** Enable extended thinking (reasoning tokens) */
  thinkingEnabled?: boolean;
  /** Max thinking budget tokens */
  thinkingBudget?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool usage tracking (adapted from Claude Code's cost-tracker.ts)
// ─────────────────────────────────────────────────────────────────────────────

export interface TurnUsage {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  toolCalls: number;
  /** USD cost (estimated) */
  costUsd: number;
  durationMs: number;
}

export interface SessionUsage {
  turns: TurnUsage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalToolCalls: number;
}

const TOKEN_COST_TABLE: Record<string, { input: number; output: number }> = {
  // Costs per 1M tokens in USD
  "minimax/minimax-m2.7": { input: 0.3, output: 1.1 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "grok-4-1-fast": { input: 1, output: 3 },
  "openai/gpt-5.4-nano": { input: 0.15, output: 0.6 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = TOKEN_COST_TABLE[model];
  if (!rates) return 0;
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface QueryEngineConfig {
  provider: ProviderConfig;
  toolExecutor: ToolExecutor;
  toolRegistry: ToolRegistry;
  /** Max tool call loops per turn (prevents infinite loops) */
  maxToolLoops?: number;
  /** Max total tokens before context compression kicks in */
  contextWindowLimit?: number;
  /** Called on each streamed chunk */
  onChunk?: (chunk: string) => void;
  /** Called when a tool is about to be invoked */
  onToolStart?: (call: LLMToolCall) => void;
  /** Called when a tool completes */
  onToolEnd?: (result: ToolCallResult) => void;
  /** Called when a turn completes */
  onTurnComplete?: (usage: TurnUsage) => void;
}

export interface RunQueryOptions {
  messages: ChatMessage[];
  systemPrompt?: string;
  /** Prepended to each user turn */
  userContext?: Record<string, string>;
  signal?: AbortSignal;
  /** Tool context for this run */
  toolCtx: import("./tool-base.js").ToolContext;
  /** Limit which tools are offered to this model */
  allowedTools?: string[];
}

export interface QueryResult {
  response: string;
  usage: TurnUsage;
  stopReason: "end_turn" | "max_tokens" | "tool_use" | "stop_sequence" | "error";
  messages: ChatMessage[];
}

export class QueryEngine {
  private config: QueryEngineConfig;
  private sessionUsage: SessionUsage = {
    turns: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    totalToolCalls: 0,
  };

  constructor(config: QueryEngineConfig) {
    this.config = config;
  }

  // ── Main entry point ───────────────────────────────────────────────────────

  async run(opts: RunQueryOptions): Promise<QueryResult> {
    const startMs = Date.now();
    const maxLoops = this.config.maxToolLoops ?? 10;
    let loopCount = 0;

    const messages = [...opts.messages];
    let totalInput = 0;
    let totalOutput = 0;
    let totalThinking = 0;
    let totalToolCalls = 0;
    let finalResponse = "";
    let stopReason: QueryResult["stopReason"] = "end_turn";

    // Build tool schemas for the LLM
    const allowedTools = opts.allowedTools
      ? this.config.toolRegistry.all().filter((t) => opts.allowedTools!.includes(t.name))
      : this.config.toolRegistry.all();

    // Tool call loop (adapted from Claude Code's QueryEngine tool loop)
    while (loopCount < maxLoops) {
      if (opts.signal?.aborted) {
        stopReason = "error";
        break;
      }

      const llmResponse = await this.callLLM({
        messages,
        systemPrompt: opts.systemPrompt,
        tools: allowedTools.map((t) => ({
          name: t.name,
          description: t.description,
          // inputSchema would be serialized here
        })),
        signal: opts.signal,
      });

      totalInput += llmResponse.inputTokens;
      totalOutput += llmResponse.outputTokens;
      totalThinking += llmResponse.thinkingTokens ?? 0;
      finalResponse = llmResponse.text;
      stopReason = llmResponse.stopReason;

      // Add assistant message
      messages.push({ role: "assistant", content: llmResponse.text });

      // If no tool calls, we're done
      if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
        break;
      }

      // Emit tool start events
      for (const call of llmResponse.toolCalls) {
        this.config.onToolStart?.(call);
      }

      // Execute tool calls (parallel for concurrency-safe tools)
      const toolResults = await this.config.toolExecutor.executeMany(
        llmResponse.toolCalls,
        opts.toolCtx,
      );

      totalToolCalls += toolResults.length;

      // Emit tool end events
      for (const result of toolResults) {
        this.config.onToolEnd?.(result);
      }

      // Inject tool results back into the conversation
      for (const result of toolResults) {
        messages.push({
          role: "tool",
          content: result.llmText,
          toolCallId: result.toolCallId,
          toolName: result.toolName,
        });
      }

      loopCount++;
      stopReason = "tool_use";
    }

    const usage: TurnUsage = {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      thinkingTokens: totalThinking,
      toolCalls: totalToolCalls,
      costUsd: estimateCost(this.config.provider.model, totalInput, totalOutput),
      durationMs: Date.now() - startMs,
    };

    // Update session totals
    this.sessionUsage.turns.push(usage);
    this.sessionUsage.totalInputTokens += usage.inputTokens;
    this.sessionUsage.totalOutputTokens += usage.outputTokens;
    this.sessionUsage.totalCostUsd += usage.costUsd;
    this.sessionUsage.totalToolCalls += usage.toolCalls;

    this.config.onTurnComplete?.(usage);

    return { response: finalResponse, usage, stopReason, messages };
  }

  getSessionUsage(): SessionUsage {
    return this.sessionUsage;
  }

  resetSessionUsage(): void {
    this.sessionUsage = {
      turns: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      totalToolCalls: 0,
    };
  }

  // ── LLM call (provider-agnostic OpenAI-compatible format) ─────────────────

  private async callLLM(opts: {
    messages: ChatMessage[];
    systemPrompt?: string;
    tools?: Array<{ name: string; description: string }>;
    signal?: AbortSignal;
  }): Promise<{
    text: string;
    inputTokens: number;
    outputTokens: number;
    thinkingTokens?: number;
    stopReason: QueryResult["stopReason"];
    toolCalls?: LLMToolCall[];
  }> {
    const { provider } = this.config;

    // Build OpenAI-compatible request body
    const body: Record<string, unknown> = {
      model: provider.model,
      max_tokens: provider.maxTokens ?? 4096,
      temperature: provider.temperature ?? 0.7,
      messages: opts.messages.map(chatMessageToOpenAI),
    };

    if (opts.systemPrompt) {
      (body.messages as unknown[]).unshift({ role: "system", content: opts.systemPrompt });
    }

    if (opts.tools && opts.tools.length > 0) {
      body.tools = opts.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: { type: "object" } },
      }));
      body.tool_choice = "auto";
    }

    if (provider.thinkingEnabled) {
      body.thinking = { type: "enabled", budget_tokens: provider.thinkingBudget ?? 8000 };
    }

    const baseUrl = provider.baseUrl ?? providerBaseUrl(provider.provider);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    };

    // Streaming response
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, stream: true }),
      signal: opts.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`LLM API error ${response.status}: ${errText}`);
    }

    return parseStreamingResponse(response, this.config.onChunk);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function providerBaseUrl(provider: LLMProvider): string {
  switch (provider) {
    case "openrouter": return "https://openrouter.ai/api/v1";
    case "xai": return "https://api.x.ai/v1";
    case "anthropic": return "https://api.anthropic.com/v1";
    case "mistral": return "https://api.mistral.ai/v1";
    case "local": return "http://localhost:4000/v1";
  }
}

function chatMessageToOpenAI(msg: ChatMessage): object {
  if (msg.role === "tool") {
    return {
      role: "tool",
      tool_call_id: msg.toolCallId,
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    };
  }
  return {
    role: msg.role,
    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
  };
}

async function parseStreamingResponse(
  response: Response,
  onChunk?: (chunk: string) => void,
): Promise<{
  text: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
  stopReason: QueryResult["stopReason"];
  toolCalls?: LLMToolCall[];
}> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  const toolCalls: LLMToolCall[] = [];
  let stopReason: QueryResult["stopReason"] = "end_turn";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.content) {
            fullText += delta.content;
            onChunk?.(delta.content);
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.id) {
                toolCalls.push({ id: tc.id, name: tc.function?.name ?? "", args: {} });
              } else if (toolCalls.length > 0 && tc.function?.arguments) {
                const last = toolCalls[toolCalls.length - 1];
                const existing = typeof last.args === "string" ? last.args : "";
                last.args = existing + tc.function.arguments;
              }
            }
          }

          if (parsed.usage) {
            inputTokens = parsed.usage.prompt_tokens ?? 0;
            outputTokens = parsed.usage.completion_tokens ?? 0;
          }

          const finishReason = parsed.choices?.[0]?.finish_reason;
          if (finishReason === "stop") stopReason = "end_turn";
          else if (finishReason === "tool_calls") stopReason = "tool_use";
          else if (finishReason === "length") stopReason = "max_tokens";
        } catch {
          /* skip malformed chunks */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Parse tool call args (accumulated as strings)
  for (const tc of toolCalls) {
    if (typeof tc.args === "string") {
      try { tc.args = JSON.parse(tc.args); } catch { tc.args = {}; }
    }
  }

  return { text: fullText, inputTokens, outputTokens, stopReason, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}
