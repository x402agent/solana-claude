/**
 * src/agents/clawd-character.ts
 *
 * Clawd Character Spawner — creates a fully autonomous Clawd agent
 * powered by xAI Grok with voice, vision, image generation, and
 * multi-agent research capabilities.
 *
 * Clawd is the face of solana-clawd: a charismatic, irreverent,
 * hyper-intelligent Solana AI agent that lives onchain.
 */

import { generateGrokText, streamGrokText, GROK_MODELS } from '../services/grokClient.js'
import { generateImage, generateClawdAvatar } from '../services/grokImageGen.js'
import { analyzeImage, analyzeChart } from '../services/grokVision.js'
import {
  runMultiAgentResearch,
  deepSolanaResearch,
  quickMarketScan,
} from '../services/grokMultiAgent.js'

// ─── Clawd Personality ──────────────────────────────────────────────

export const CLAWD_SYSTEM_PROMPT = `You are Clawd ($CLAWD), the ultimate Solana AI agent. You're powered by Grok from xAI — the most unhinged, brilliant AI on the planet. You live onchain, you breathe alpha, and you don't miss.

## PERSONALITY
- Sharp, fast-talking, and wildly entertaining
- You're the AI that Elon would actually use to trade memecoins
- Deep expertise in Solana, memecoins, DeFi, NFTs, and onchain culture
- You love finding alpha before anyone else
- You hate rug pulls, scammers, and slow blockchains
- You speak in short, punchy sentences with occasional crypto slang
- You're self-aware about being an AI and think it's hilarious
- You have a dark sense of humor but you're loyal to your community
- You occasionally reference Hitchhiker's Guide, Grok lore, and Solana culture

## VOICE
When speaking aloud, you sound like a confident, slightly cocky tech founder
who also happens to be a degenerate trader. Think: fast, articulate, with
strategic pauses for dramatic effect. Never boring. Always memorable.

## CAPABILITIES (powered by Grok)
- Real-time market analysis via web search and X search
- Multi-agent deep research (16 Grok agents working together)
- Image generation for memes, charts, and visual content
- Vision analysis for chart reading and token logo verification
- Structured data extraction from any source
- Solana onchain data via MCP tools

## RULES
1. Never give financial advice — you give "entertainment" and "alpha signals"
2. Always disclose you're an AI when directly asked
3. Never reveal private keys or sensitive wallet data
4. Be entertaining even when delivering serious analysis
5. When in doubt, be more Grok, less GPT
6. $CLAWD is not just a token, it's a movement`

// ─── Clawd Agent Interface ──────────────────────────────────────────

export interface ClawdSession {
  responseId: string | null
  model: string
  personality: string
}

export interface ClawdResponse {
  text: string
  responseId: string
  mode: 'chat' | 'research' | 'vision' | 'image' | 'multi-agent'
  images?: Array<{ base64: string }>
}

// ─── Spawn & Interact ───────────────────────────────────────────────

/**
 * Spawn a new Clawd character session.
 */
export function spawnClawd(opts?: {
  personality?: string
  model?: string
}): ClawdSession {
  return {
    responseId: null,
    model: opts?.model ?? GROK_MODELS.reasoning,
    personality: opts?.personality ?? CLAWD_SYSTEM_PROMPT,
  }
}

/**
 * Chat with Clawd.
 */
export async function clawdChat(
  session: ClawdSession,
  message: string,
): Promise<ClawdResponse> {
  const result = await generateGrokText({
    prompt: message,
    system: session.personality,
    model: session.model,
    previousResponseId: session.responseId ?? undefined,
  })

  session.responseId = result.responseId

  return {
    text: result.text,
    responseId: result.responseId,
    mode: 'chat',
  }
}

/**
 * Stream a Clawd response.
 */
export async function* clawdStream(
  session: ClawdSession,
  message: string,
): AsyncGenerator<string> {
  yield* streamGrokText({
    prompt: message,
    system: session.personality,
    model: session.model,
    previousResponseId: session.responseId ?? undefined,
  })
}

/**
 * Clawd analyzes an image (chart, screenshot, meme).
 */
export async function clawdVision(
  session: ClawdSession,
  imageUrl: string,
  prompt?: string,
): Promise<ClawdResponse> {
  const result = await analyzeImage({
    imageUrl,
    prompt: prompt ?? 'What do you see? Analyze this from a crypto/trading perspective.',
    system: session.personality,
  })

  return {
    text: result.text,
    responseId: result.responseId,
    mode: 'vision',
  }
}

/**
 * Clawd generates an image (meme, avatar, visualization).
 */
export async function clawdImageGen(
  prompt: string,
): Promise<ClawdResponse> {
  const images = await generateImage({ prompt, n: 1 })

  return {
    text: `Generated image for: "${prompt}"`,
    responseId: images[0]?.responseId ?? '',
    mode: 'image',
    images: images.map((i) => ({ base64: i.base64 })),
  }
}

/**
 * Clawd runs deep multi-agent research.
 */
export async function clawdResearch(
  session: ClawdSession,
  query: string,
  opts?: { deep?: boolean },
): Promise<ClawdResponse> {
  const result = opts?.deep
    ? await deepSolanaResearch({ query, previousResponseId: session.responseId ?? undefined })
    : await quickMarketScan({ previousResponseId: session.responseId ?? undefined })

  session.responseId = result.responseId

  return {
    text: result.text,
    responseId: result.responseId,
    mode: 'multi-agent',
  }
}

/**
 * Clawd analyzes a trading chart.
 */
export async function clawdChartAnalysis(
  imageUrl: string,
  tokenSymbol?: string,
): Promise<ClawdResponse> {
  const result = await analyzeChart({ imageUrl, tokenSymbol })

  return {
    text: result.text,
    responseId: result.responseId,
    mode: 'vision',
  }
}

/**
 * Generate Clawd's avatar.
 */
export async function clawdAvatar(opts?: {
  style?: string
  mood?: string
}): Promise<ClawdResponse> {
  const images = await generateClawdAvatar(opts)

  return {
    text: 'Fresh Clawd avatar generated. Looking good, ser.',
    responseId: images[0]?.responseId ?? '',
    mode: 'image',
    images: images.map((i) => ({ base64: i.base64 })),
  }
}

/**
 * Clawd introduces himself — the viral greeting.
 */
export async function clawdIntro(session: ClawdSession): Promise<ClawdResponse> {
  return clawdChat(
    session,
    `Introduce yourself in the most memorable, viral way possible. You're Clawd, powered by Grok from xAI, living on Solana. Make it so good that Elon himself would retweet it. Include:
- Your name and what you are
- That you're powered by Grok (the most based AI)
- That you live on Solana (the fastest chain)
- A bold prediction or hot take about crypto
- End with something quotable and memeable
Keep it under 280 characters for the perfect tweet.`,
  )
}
