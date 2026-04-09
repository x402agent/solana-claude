/**
 * src/services/grokImageGen.ts
 *
 * Grok image generation using the grok-imagine-image model.
 * Supports text-to-image and image editing via xAI Responses API.
 */

import { getGrokClient, GROK_MODELS } from './grokClient.js'

export interface ImageGenResult {
  /** Base64-encoded image data */
  base64: string
  /** Revised prompt (if model modified the original) */
  revisedPrompt?: string
  /** Response ID for multi-turn editing */
  responseId: string
}

/**
 * Generate an image from a text prompt.
 */
export async function generateImage(opts: {
  prompt: string
  /** Number of images to generate (default: 1) */
  n?: number
  /** Image size: "1024x1024", "1024x1792", "1792x1024" */
  size?: string
}): Promise<ImageGenResult[]> {
  const client = getGrokClient()

  const response = await client.images.generate({
    model: GROK_MODELS.image,
    prompt: opts.prompt,
    n: opts.n ?? 1,
    size: (opts.size as any) ?? '1024x1024',
    response_format: 'b64_json',
  })

  return response.data.map((img) => ({
    base64: img.b64_json ?? '',
    revisedPrompt: img.revised_prompt ?? undefined,
    responseId: '',
  }))
}

/**
 * Edit an existing image with a text prompt.
 * Uses the Responses API with image input for iterative editing.
 */
export async function editImage(opts: {
  /** Base64-encoded source image */
  sourceImageBase64: string
  /** Edit instruction */
  prompt: string
  /** Previous response ID for multi-turn editing */
  previousResponseId?: string
}): Promise<ImageGenResult> {
  const client = getGrokClient()

  const response = await client.responses.create({
    model: GROK_MODELS.image,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_image',
            image_url: `data:image/png;base64,${opts.sourceImageBase64}`,
          } as any,
          {
            type: 'input_text',
            text: opts.prompt,
          } as any,
        ],
      },
    ],
    ...(opts.previousResponseId
      ? { previous_response_id: opts.previousResponseId }
      : {}),
  })

  // Extract image from response output
  const imageOutput = response.output
    ?.flatMap((o: any) => o.content ?? [])
    .find((c: any) => c.type === 'image')

  return {
    base64: imageOutput?.image ?? '',
    responseId: response.id,
  }
}

/**
 * Generate a Clawd character avatar.
 */
export async function generateClawdAvatar(opts?: {
  style?: string
  mood?: string
}): Promise<ImageGenResult[]> {
  const style = opts?.style ?? 'pixel art retro cyberpunk'
  const mood = opts?.mood ?? 'mischievous and confident'
  const prompt = `A ${mood} AI agent character named Clawd, ${style} style. Solana blockchain theme with purple and green neon colors. The character should look like a digital entity with glowing eyes and circuit patterns. Clean background.`

  return generateImage({ prompt, n: 1, size: '1024x1024' })
}
