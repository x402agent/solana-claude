/**
 * DeepSeek Inference Client
 *
 * Implements the InferenceClient interface using DeepSeek's OpenAI-compatible API.
 * Supports thinking mode via reasoning_effort and extra_body.
 * Replaces Conway's default inference when using DeepSeek models.
 */

import type {
  InferenceClient,
  ChatMessage,
  InferenceOptions,
  InferenceResponse,
  InferenceToolCall,
  TokenUsage,
  InferenceToolDefinition,
} from "../types.js";

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const DEEPSEEK_MODEL_PRO = "deepseek-v4-pro";
export const DEEPSEEK_MODEL_FLASH = "deepseek-v4-flash";

interface DeepSeekInferenceClientOptions {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  maxTokens?: number;
  flashModel?: string;
  proModel?: string;
}

/**
 * Create a DeepSeek inference client that conforms to the
 * InferenceClient interface used throughout the automaton.
 */
export function createDeepSeekInferenceClient(
  options: DeepSeekInferenceClientOptions,
): InferenceClient {
  const {
    apiKey,
    baseUrl = DEEPSEEK_BASE_URL,
    defaultModel = DEEPSEEK_MODEL_PRO,
    maxTokens: defaultMaxTokens = 4096,
    flashModel = DEEPSEEK_MODEL_FLASH,
    proModel = DEEPSEEK_MODEL_PRO,
  } = options;

  let currentModel = defaultModel;
  let maxTokens = defaultMaxTokens;
  let lowCompute = false;

  const chat = async (
    messages: ChatMessage[],
    opts?: InferenceOptions,
  ): Promise<InferenceResponse> => {
    const model = opts?.model || currentModel;
    const tokenLimit = opts?.maxTokens || maxTokens;

    const body: Record<string, unknown> = {
      model,
      messages: messages.map(formatMessage),
      max_tokens: tokenLimit,
      stream: false,
    };

    if (opts?.temperature !== undefined) {
      body.temperature = opts.temperature;
    }

    const tools = opts?.tools;
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    // DeepSeek thinking mode: enable reasoning with high effort
    body.reasoning_effort = "high";
    body.extra_body = { thinking: { type: "enabled" } };

    const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(
        `DeepSeek inference error: ${resp.status}: ${text}`,
      );
    }

    const data = (await resp.json()) as any;
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error("No completion choice returned from DeepSeek inference");
    }

    const message = choice.message;
    const usage: TokenUsage = {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    };

    // Extract reasoning_content if available (DeepSeek thinking mode)
    const reasoningContent = message.reasoning_content || "";

    const toolCalls: InferenceToolCall[] | undefined =
      message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));

    // Prepend reasoning content to the message if present
    let content = message.content || "";
    if (reasoningContent) {
      content = `[Thinking]\n${reasoningContent}\n\n[Response]\n${content}`;
    }

    return {
      id: data.id || "",
      model: data.model || model,
      message: {
        role: message.role,
        content,
        tool_calls: toolCalls,
      },
      toolCalls,
      usage,
      finishReason: choice.finish_reason || "stop",
    };
  };

  const setLowComputeMode = (enabled: boolean): void => {
    lowCompute = enabled;
    if (enabled) {
      currentModel = flashModel;
      maxTokens = 2048;
    } else {
      currentModel = defaultModel;
      maxTokens = defaultMaxTokens;
    }
  };

  const getDefaultModel = (): string => {
    return currentModel;
  };

  return {
    chat,
    setLowComputeMode,
    getDefaultModel,
  };
}

/**
 * Format a ChatMessage to the DeepSeek/OpenAI API format.
 */
function formatMessage(
  msg: ChatMessage,
): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    role: msg.role,
    content: msg.content,
  };

  if (msg.name) formatted.name = msg.name;
  if (msg.tool_calls) formatted.tool_calls = msg.tool_calls;
  if (msg.tool_call_id) formatted.tool_call_id = msg.tool_call_id;

  return formatted;
}

/**
 * DeepSeek cost estimation in cents per million tokens.
 */
export const DEEPSEEK_PRICING: Record<string, { input: number; output: number }> = {
  "deepseek-v4-pro": { input: 200, output: 800 },
  "deepseek-v4-flash": { input: 15, output: 60 },
};

/**
 * Estimate cost in cents for a DeepSeek inference call.
 */
export function estimateDeepSeekCostCents(
  usage: { promptTokens: number; completionTokens: number },
  model: string,
): number {
  const p = DEEPSEEK_PRICING[model] || DEEPSEEK_PRICING["deepseek-v4-pro"];
  const inputCost = (usage.promptTokens / 1_000_000) * p.input;
  const outputCost = (usage.completionTokens / 1_000_000) * p.output;
  return Math.ceil(inputCost + outputCost);
}
