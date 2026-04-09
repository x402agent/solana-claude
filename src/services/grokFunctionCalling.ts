/**
 * src/services/grokFunctionCalling.ts
 *
 * Grok function calling / tool use via the Responses API.
 * Enables Grok to call custom functions you define, with
 * structured parameters and type-safe responses.
 */

import { getGrokClient, GROK_MODELS } from './grokClient.js'

// ─── Types ──────────────────────────────────────────────────────────

export interface FunctionDefinition {
  name: string
  description: string
  parameters: Record<string, any> // JSON Schema
}

export interface FunctionCallResult {
  /** The function name Grok wants to call */
  name: string
  /** Parsed arguments */
  args: Record<string, any>
  /** Raw arguments string */
  rawArgs: string
  /** Tool call ID for sending results back */
  callId: string
}

export interface GrokToolResponse {
  /** Text response from Grok (if any) */
  text: string
  /** Function calls Grok wants to make */
  functionCalls: FunctionCallResult[]
  /** Response ID for multi-turn */
  responseId: string
  /** Whether Grok is done or waiting for tool results */
  status: 'done' | 'requires_action'
}

// ─── Function Calling ───────────────────────────────────────────────

/**
 * Send a message with available functions. Grok may respond with
 * text, function calls, or both.
 */
export async function callWithFunctions(opts: {
  prompt: string
  system?: string
  functions: FunctionDefinition[]
  model?: string
  previousResponseId?: string
}): Promise<GrokToolResponse> {
  const client = getGrokClient()

  const input: any[] = []
  if (opts.system) {
    input.push({ role: 'system', content: opts.system })
  }
  input.push({ role: 'user', content: opts.prompt })

  const tools = opts.functions.map((fn) => ({
    type: 'function' as const,
    function: {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters,
    },
  }))

  const response = await client.responses.create({
    model: opts.model || GROK_MODELS.reasoning,
    input,
    tools: tools as any,
    ...(opts.previousResponseId
      ? { previous_response_id: opts.previousResponseId }
      : {}),
  })

  return parseToolResponse(response)
}

/**
 * Submit tool results back to Grok after executing function calls.
 */
export async function submitToolResults(opts: {
  responseId: string
  results: Array<{
    callId: string
    output: string
  }>
  model?: string
}): Promise<GrokToolResponse> {
  const client = getGrokClient()

  const input = opts.results.map((r) => ({
    type: 'function_call_output' as const,
    call_id: r.callId,
    output: r.output,
  }))

  const response = await client.responses.create({
    model: opts.model || GROK_MODELS.reasoning,
    previous_response_id: opts.responseId,
    input: input as any,
  })

  return parseToolResponse(response)
}

/**
 * Run a full agentic loop: send prompt, execute function calls,
 * submit results, repeat until Grok is done.
 */
export async function runAgentLoop(opts: {
  prompt: string
  system?: string
  functions: FunctionDefinition[]
  /** Function executor — called for each function call */
  executor: (name: string, args: Record<string, any>) => Promise<string>
  model?: string
  maxIterations?: number
}): Promise<{ text: string; responseId: string; iterations: number }> {
  const maxIter = opts.maxIterations ?? 10
  let iteration = 0

  let response = await callWithFunctions({
    prompt: opts.prompt,
    system: opts.system,
    functions: opts.functions,
    model: opts.model,
  })

  while (response.status === 'requires_action' && iteration < maxIter) {
    iteration++

    const results: Array<{ callId: string; output: string }> = []
    for (const call of response.functionCalls) {
      const output = await opts.executor(call.name, call.args)
      results.push({ callId: call.callId, output })
    }

    response = await submitToolResults({
      responseId: response.responseId,
      results,
      model: opts.model,
    })
  }

  return {
    text: response.text,
    responseId: response.responseId,
    iterations: iteration,
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function parseToolResponse(response: any): GrokToolResponse {
  const functionCalls: FunctionCallResult[] = []
  let text = ''

  for (const output of response.output ?? []) {
    if (output.type === 'function_call') {
      let args: Record<string, any> = {}
      try {
        args = JSON.parse(output.arguments ?? '{}')
      } catch {
        args = {}
      }
      functionCalls.push({
        name: output.name,
        args,
        rawArgs: output.arguments ?? '',
        callId: output.call_id ?? output.id ?? '',
      })
    } else if (output.type === 'message') {
      for (const content of output.content ?? []) {
        if (content.type === 'output_text') {
          text += content.text
        }
      }
    }
  }

  return {
    text,
    functionCalls,
    responseId: response.id,
    status: functionCalls.length > 0 ? 'requires_action' : 'done',
  }
}

// ─── Pre-built Solana Functions ─────────────────────────────────────

/** Common Solana tool definitions for Grok function calling */
export const SOLANA_FUNCTIONS: FunctionDefinition[] = [
  {
    name: 'get_token_price',
    description: 'Get the current price and 24h change for a Solana token',
    parameters: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token symbol or mint address' },
      },
      required: ['token'],
    },
  },
  {
    name: 'get_wallet_balance',
    description: 'Get SOL balance and token holdings for a wallet',
    parameters: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Solana wallet address' },
      },
      required: ['address'],
    },
  },
  {
    name: 'search_trending_tokens',
    description: 'Search for trending Solana tokens by volume, price change, or social mentions',
    parameters: {
      type: 'object',
      properties: {
        sortBy: {
          type: 'string',
          enum: ['volume', 'price_change', 'social'],
          description: 'Sort criteria',
        },
        limit: { type: 'integer', description: 'Max results (default 10)' },
      },
    },
  },
  {
    name: 'analyze_token_security',
    description: 'Run security analysis on a token: check for rug pull indicators, contract risks, holder concentration',
    parameters: {
      type: 'object',
      properties: {
        mint: { type: 'string', description: 'Token mint address' },
      },
      required: ['mint'],
    },
  },
  {
    name: 'generate_meme',
    description: 'Generate a meme image about a crypto topic',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'The meme topic or caption' },
        style: { type: 'string', description: 'Visual style (default: dank crypto meme)' },
      },
      required: ['topic'],
    },
  },
]
