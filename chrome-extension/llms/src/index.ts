/**
 * @page-agent/llms — LLM abstraction layer for page-agent.
 *
 * Uses OpenAI-compatible API format. Works with xAI Grok via
 * baseURL: "https://api.x.ai/v1".
 */

import OpenAI from 'openai'
import type * as z from 'zod/v4'

// ─── Types ──────────────────────────────────────────────────────────

export interface LLMConfig {
  baseURL: string
  model: string
  apiKey?: string
  temperature?: number
  maxRetries?: number
  disableNamedToolChoice?: boolean
  customFetch?: typeof globalThis.fetch
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_calls?: {
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }[]
  tool_call_id?: string
  name?: string
}

export interface Tool<TParams = any, TResult = any> {
  description?: string
  inputSchema: z.ZodType<TParams>
  execute: (args: TParams) => Promise<TResult>
}

export interface InvokeOptions {
  toolChoiceName?: string
  normalizeResponse?: (response: any) => any
}

export interface InvokeResult<TResult = unknown> {
  toolCall: {
    name: string
    args: any
  }
  toolResult: TResult
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cachedTokens?: number
    reasoningTokens?: number
  }
  rawResponse?: unknown
  rawRequest?: unknown
}

export interface LLMClient {
  invoke(
    messages: Message[],
    tools: Record<string, Tool>,
    abortSignal?: AbortSignal,
    options?: InvokeOptions,
  ): Promise<InvokeResult>
}

// ─── Error Types ────────────────────────────────────────────────────

export const InvokeErrorType = {
  NETWORK_ERROR: 'network_error',
  RATE_LIMIT: 'rate_limit',
  SERVER_ERROR: 'server_error',
  NO_TOOL_CALL: 'no_tool_call',
  INVALID_TOOL_ARGS: 'invalid_tool_args',
  TOOL_EXECUTION_ERROR: 'tool_execution_error',
  UNKNOWN: 'unknown',
  AUTH_ERROR: 'auth_error',
  CONTEXT_LENGTH: 'context_length',
  CONTENT_FILTER: 'content_filter',
} as const

export type InvokeErrorType = (typeof InvokeErrorType)[keyof typeof InvokeErrorType]

export class InvokeError extends Error {
  type: InvokeErrorType
  retryable: boolean
  statusCode?: number
  rawError?: unknown
  rawResponse?: unknown

  constructor(type: InvokeErrorType, message: string, rawError?: unknown, rawResponse?: unknown) {
    super(message)
    this.name = 'InvokeError'
    this.type = type
    this.rawError = rawError
    this.rawResponse = rawResponse
    this.retryable = this.isRetryable(type)
  }

  private isRetryable(type: InvokeErrorType): boolean {
    return type === InvokeErrorType.NETWORK_ERROR
      || type === InvokeErrorType.RATE_LIMIT
      || type === InvokeErrorType.SERVER_ERROR
  }
}

// ─── Config ─────────────────────────────────────────────────────────

export function parseLLMConfig(config: LLMConfig): Required<LLMConfig> {
  return {
    baseURL: config.baseURL,
    model: config.model,
    apiKey: config.apiKey ?? '',
    temperature: config.temperature ?? 0,
    maxRetries: config.maxRetries ?? 3,
    disableNamedToolChoice: config.disableNamedToolChoice ?? false,
    customFetch: config.customFetch ?? globalThis.fetch,
  }
}

// ─── LLM Class ──────────────────────────────────────────────────────

export class LLM extends EventTarget implements LLMClient {
  config: Required<LLMConfig>
  client: OpenAI

  constructor(config: LLMConfig) {
    super()
    this.config = parseLLMConfig(config)
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      maxRetries: this.config.maxRetries,
      fetch: this.config.customFetch,
      dangerouslyAllowBrowser: true,
    })
  }

  async invoke(
    messages: Message[],
    tools: Record<string, Tool>,
    abortSignal: AbortSignal,
    options?: InvokeOptions,
  ): Promise<InvokeResult> {
    const openaiTools = Object.entries(tools).map(([name, tool]) => ({
      type: 'function' as const,
      function: {
        name,
        description: tool.description ?? '',
        parameters: (tool.inputSchema as any)._def?.typeName
          ? JSON.parse(JSON.stringify((tool.inputSchema as any).shape ?? {}))
          : {},
      },
    }))

    const toolChoice = options?.toolChoiceName
      ? { type: 'function' as const, function: { name: options.toolChoiceName } }
      : 'required' as const

    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.config.model,
          messages: messages as any,
          tools: openaiTools.length > 0 ? openaiTools : undefined,
          tool_choice: this.config.disableNamedToolChoice ? undefined : toolChoice as any,
          temperature: this.config.temperature,
        },
        { signal: abortSignal },
      )

      let processed = response
      if (options?.normalizeResponse) {
        processed = options.normalizeResponse(processed)
      }

      const choice = processed.choices?.[0]
      const toolCalls = choice?.message?.tool_calls

      if (!toolCalls || toolCalls.length === 0) {
        throw new InvokeError(
          InvokeErrorType.NO_TOOL_CALL,
          'Model did not return a tool call',
          undefined,
          response,
        )
      }

      const tc = toolCalls[0]
      let args: any
      try {
        args = JSON.parse(tc.function.arguments)
      } catch {
        throw new InvokeError(
          InvokeErrorType.INVALID_TOOL_ARGS,
          `Failed to parse tool arguments: ${tc.function.arguments}`,
          undefined,
          response,
        )
      }

      const toolDef = tools[tc.function.name]
      if (!toolDef) {
        throw new InvokeError(
          InvokeErrorType.INVALID_TOOL_ARGS,
          `Unknown tool: ${tc.function.name}`,
          undefined,
          response,
        )
      }

      const parsed = toolDef.inputSchema.safeParse(args)
      if (!parsed.success) {
        throw new InvokeError(
          InvokeErrorType.INVALID_TOOL_ARGS,
          `Invalid arguments for ${tc.function.name}: ${String(parsed.error)}`,
          parsed.error,
          response,
        )
      }

      const toolResult = await toolDef.execute(parsed.data)

      return {
        toolCall: { name: tc.function.name, args: parsed.data },
        toolResult,
        usage: {
          promptTokens: processed.usage?.prompt_tokens ?? 0,
          completionTokens: processed.usage?.completion_tokens ?? 0,
          totalTokens: processed.usage?.total_tokens ?? 0,
        },
        rawResponse: response,
      }
    } catch (error) {
      if (error instanceof InvokeError) throw error

      if (error instanceof OpenAI.APIError) {
        const status = error.status ?? 0
        if (status === 401 || status === 403) {
          throw new InvokeError(InvokeErrorType.AUTH_ERROR, error.message, error)
        }
        if (status === 429) {
          throw new InvokeError(InvokeErrorType.RATE_LIMIT, error.message, error)
        }
        if (status >= 500) {
          throw new InvokeError(InvokeErrorType.SERVER_ERROR, error.message, error)
        }
      }

      throw new InvokeError(
        InvokeErrorType.UNKNOWN,
        error instanceof Error ? error.message : String(error),
        error,
      )
    }
  }
}
