/**
 * src/services/grokVision.ts
 *
 * Grok vision / image understanding using grok-4.20-reasoning.
 * Supports image URLs and base64-encoded images.
 */

import { getGrokClient, GROK_MODELS } from './grokClient.js'

export interface VisionResult {
  text: string
  responseId: string
}

/**
 * Analyze an image with a text prompt.
 */
export async function analyzeImage(opts: {
  /** URL or base64 data URI of the image */
  imageUrl: string
  /** Question or instruction about the image */
  prompt: string
  /** System prompt for context */
  system?: string
  model?: string
}): Promise<VisionResult> {
  const client = getGrokClient()

  const input: any[] = []
  if (opts.system) {
    input.push({ role: 'system', content: opts.system })
  }

  input.push({
    role: 'user',
    content: [
      {
        type: 'input_image',
        image_url: opts.imageUrl,
      },
      {
        type: 'input_text',
        text: opts.prompt,
      },
    ],
  })

  const response = await client.responses.create({
    model: opts.model || GROK_MODELS.reasoning,
    input,
    store: false, // Don't store image data on server
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
 * Analyze a base64-encoded image.
 */
export async function analyzeImageBase64(opts: {
  /** Raw base64 image data (no data URI prefix) */
  base64: string
  /** Image MIME type */
  mimeType?: 'image/jpeg' | 'image/png'
  prompt: string
  system?: string
}): Promise<VisionResult> {
  const mime = opts.mimeType ?? 'image/jpeg'
  const dataUri = `data:${mime};base64,${opts.base64}`
  return analyzeImage({
    imageUrl: dataUri,
    prompt: opts.prompt,
    system: opts.system,
  })
}

/**
 * Analyze a Solana token chart screenshot.
 * Specialized vision prompt for trading context.
 */
export async function analyzeChart(opts: {
  imageUrl: string
  tokenSymbol?: string
}): Promise<VisionResult> {
  const tokenCtx = opts.tokenSymbol ? ` for ${opts.tokenSymbol}` : ''
  return analyzeImage({
    imageUrl: opts.imageUrl,
    prompt: `Analyze this trading chart${tokenCtx}. Identify:
1. Current trend direction and strength
2. Key support and resistance levels
3. Volume patterns
4. Any notable candlestick patterns
5. Short-term price prediction (bullish/bearish/neutral)
Return a structured analysis.`,
    system:
      'You are a professional crypto chart analyst. Be precise with price levels and percentages.',
  })
}
