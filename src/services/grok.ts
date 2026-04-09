/**
 * src/services/grok.ts
 *
 * Unified export for all xAI Grok services.
 *
 * Usage:
 *   import { grok } from './services/grok.js'
 *
 *   // Chat
 *   const { text } = await grok.chat('What is SOL trading at?')
 *
 *   // Stream
 *   for await (const chunk of grok.stream('Analyze $BONK')) { ... }
 *
 *   // Vision
 *   const analysis = await grok.vision(chartUrl, 'Analyze this chart')
 *
 *   // Image generation
 *   const images = await grok.imagine('A Solana astronaut on the moon')
 *
 *   // Multi-agent research (16 agents)
 *   const research = await grok.research('Deep dive on Jupiter DEX')
 *
 *   // Function calling
 *   const result = await grok.callTools(prompt, functions, executor)
 *
 *   // Clawd character
 *   const session = grok.clawd.spawn()
 *   const reply = await grok.clawd.chat(session, 'What's the alpha today?')
 */

export {
  getGrokClient,
  getXaiApiKey,
  generateGrokText,
  streamGrokText,
  GROK_MODELS,
} from './grokClient.js'

export {
  generateImage,
  editImage,
  generateClawdAvatar,
} from './grokImageGen.js'

export {
  analyzeImage,
  analyzeImageBase64,
  analyzeChart,
} from './grokVision.js'

export {
  runMultiAgentResearch,
  deepSolanaResearch,
  quickMarketScan,
} from './grokMultiAgent.js'

export {
  callWithFunctions,
  submitToolResults,
  runAgentLoop,
  SOLANA_FUNCTIONS,
} from './grokFunctionCalling.js'

export {
  generateStructured,
  analyzeTokenStructured,
  analyzeWalletStructured,
  getMarketRegime,
  TOKEN_ANALYSIS_SCHEMA,
  WALLET_ANALYSIS_SCHEMA,
  MARKET_REGIME_SCHEMA,
} from './grokStructuredOutput.js'

export type {
  ImageGenResult,
} from './grokImageGen.js'

export type {
  VisionResult,
} from './grokVision.js'

export type {
  MultiAgentResult,
  AgentCount,
} from './grokMultiAgent.js'

export type {
  FunctionDefinition,
  FunctionCallResult,
  GrokToolResponse,
} from './grokFunctionCalling.js'

// ─── Convenience namespace ──────────────────────────────────────────

import { generateGrokText, streamGrokText } from './grokClient.js'
import { generateImage } from './grokImageGen.js'
import { analyzeImage } from './grokVision.js'
import { runMultiAgentResearch, deepSolanaResearch } from './grokMultiAgent.js'
import { runAgentLoop, SOLANA_FUNCTIONS } from './grokFunctionCalling.js'
import {
  spawnClawd,
  clawdChat,
  clawdStream,
  clawdVision,
  clawdImageGen,
  clawdResearch,
  clawdAvatar,
  clawdIntro,
} from '../agents/clawd-character.js'

import type { FunctionDefinition } from './grokFunctionCalling.js'

export const grok = {
  /** Chat with Grok */
  chat: (prompt: string, opts?: { system?: string; model?: string }) =>
    generateGrokText({ prompt, ...opts }),

  /** Stream Grok response */
  stream: (prompt: string, opts?: { system?: string; model?: string }) =>
    streamGrokText({ prompt, ...opts }),

  /** Analyze an image */
  vision: (imageUrl: string, prompt: string) =>
    analyzeImage({ imageUrl, prompt }),

  /** Generate images */
  imagine: (prompt: string, opts?: { n?: number; size?: string }) =>
    generateImage({ prompt, ...opts }),

  /** Multi-agent research */
  research: (prompt: string, opts?: { agentCount?: 4 | 16 }) =>
    runMultiAgentResearch({ prompt, ...opts }),

  /** Deep Solana research with 16 agents */
  deepResearch: (query: string) => deepSolanaResearch({ query }),

  /** Function calling with auto-execution */
  callTools: (
    prompt: string,
    functions: FunctionDefinition[],
    executor: (name: string, args: Record<string, any>) => Promise<string>,
  ) => runAgentLoop({ prompt, functions, executor }),

  /** Structured output with JSON schema enforcement */
  structured: async (prompt: string, schema: Record<string, any>, opts?: { system?: string }) => {
    const { generateStructured: gen } = await import('./grokStructuredOutput.js')
    return gen({ prompt, schema, ...opts })
  },

  /** Quick token analysis with structured output */
  analyzeToken: async (token: string) => {
    const { analyzeTokenStructured: analyze } = await import('./grokStructuredOutput.js')
    return analyze(token)
  },

  /** Get current market regime */
  marketRegime: async () => {
    const { getMarketRegime: regime } = await import('./grokStructuredOutput.js')
    return regime()
  },

  /** Pre-built Solana functions */
  solanaFunctions: SOLANA_FUNCTIONS,

  /** Clawd character */
  clawd: {
    spawn: spawnClawd,
    chat: clawdChat,
    stream: clawdStream,
    vision: clawdVision,
    imagine: clawdImageGen,
    research: clawdResearch,
    avatar: clawdAvatar,
    intro: clawdIntro,
  },
} as const
