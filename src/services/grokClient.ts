/**
 * src/services/grokClient.ts
 *
 * Core xAI/Grok API client. Uses the OpenAI-compatible Responses API
 * at https://api.x.ai/v1. All Grok services (chat, vision, image gen,
 * multi-agent, voice) build on this client.
 */

import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getXaiApiKey(): string {
  const key = process.env.XAI_API_KEY?.trim()
  if (!key) {
    throw new Error('XAI_API_KEY is not set. Get one at https://console.x.ai')
  }
  return key
}

export function getGrokClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: getXaiApiKey(),
      baseURL: 'https://api.x.ai/v1',
      timeout: 360_000, // 6min for reasoning models
    })
  }
  return _client
}

/** Default models */
export const GROK_MODELS = {
  reasoning: process.env.XAI_MODEL || 'grok-4.20-reasoning',
  fast: 'grok-4-1-fast',
  multiAgent: process.env.XAI_MULTI_AGENT_MODEL || 'grok-4.20-multi-agent',
  image: process.env.XAI_IMAGE_MODEL || 'grok-imagine-image',
} as const

export type GrokModel = keyof typeof GROK_MODELS

/**
 * Simple text generation via Responses API.
 */
export async function generateGrokText(opts: {
  prompt: string
  system?: string
  model?: string
  previousResponseId?: string
  store?: boolean
}): Promise<{ text: string; responseId: string }> {
  const client = getGrokClient()
  const input: Array<{ role: string; content: string }> = []

  if (opts.system) {
    input.push({ role: 'system', content: opts.system })
  }
  input.push({ role: 'user', content: opts.prompt })

  const response = await client.responses.create({
    model: opts.model || GROK_MODELS.reasoning,
    input,
    ...(opts.previousResponseId
      ? { previous_response_id: opts.previousResponseId }
      : {}),
    ...(opts.store === false ? { store: false } : {}),
  })

  const text =
    response.output
      ?.filter((o: any) => o.type === 'message')
      .flatMap((o: any) => o.content)
      .filter((c: any) => c.type === 'output_text')
      .map((c: any) => c.text)
      .join('') ?? ''

  return { text, responseId: response.id }
}

/**
 * Streaming text generation.
 */
export async function* streamGrokText(opts: {
  prompt: string
  system?: string
  model?: string
  previousResponseId?: string
}): AsyncGenerator<string> {
  const client = getGrokClient()
  const input: Array<{ role: string; content: string }> = []

  if (opts.system) {
    input.push({ role: 'system', content: opts.system })
  }
  input.push({ role: 'user', content: opts.prompt })

  const stream = await client.responses.create({
    model: opts.model || GROK_MODELS.reasoning,
    input,
    stream: true,
    ...(opts.previousResponseId
      ? { previous_response_id: opts.previousResponseId }
      : {}),
  })

  for await (const event of stream as any) {
    if (event.type === 'response.output_text.delta') {
      yield event.delta ?? ''
    }
  }
}
