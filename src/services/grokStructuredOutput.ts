/**
 * src/services/grokStructuredOutput.ts
 *
 * Grok structured outputs using JSON schemas.
 * Guarantees type-safe, schema-conforming responses from Grok.
 *
 * Based on xAI's structured outputs feature — works with all
 * Grok language models.
 */

import { getGrokClient, GROK_MODELS } from './grokClient.js'

// ─── Types ──────────────────────────────────────────────────────────

export interface StructuredOutputResult<T> {
  data: T
  responseId: string
  raw: string
}

// ─── Core Function ──────────────────────────────────────────────────

/**
 * Generate a structured output conforming to a JSON schema.
 *
 * @param opts.prompt - The input prompt
 * @param opts.schema - JSON Schema object describing the desired output
 * @param opts.schemaName - Name for the schema (used in API request)
 * @param opts.system - Optional system prompt
 * @param opts.model - Model to use (default: grok-4.20-reasoning)
 */
export async function generateStructured<T = any>(opts: {
  prompt: string
  schema: Record<string, any>
  schemaName?: string
  system?: string
  model?: string
}): Promise<StructuredOutputResult<T>> {
  const client = getGrokClient()

  const input: any[] = []
  if (opts.system) {
    input.push({ role: 'system', content: opts.system })
  }
  input.push({ role: 'user', content: opts.prompt })

  const response = await client.responses.create({
    model: opts.model || GROK_MODELS.reasoning,
    input,
    text: {
      format: {
        type: 'json_schema',
        name: opts.schemaName ?? 'response',
        schema: opts.schema,
        strict: true,
      },
    } as any,
  })

  const raw =
    response.output
      ?.filter((o: any) => o.type === 'message')
      .flatMap((o: any) => o.content)
      .filter((c: any) => c.type === 'output_text')
      .map((c: any) => c.text)
      .join('') ?? '{}'

  const data = JSON.parse(raw) as T

  return {
    data,
    responseId: response.id,
    raw,
  }
}

// ─── Pre-built Schemas ──────────────────────────────────────────────

/** Token analysis schema */
export const TOKEN_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    token: { type: 'string', description: 'Token symbol' },
    mint: { type: 'string', description: 'Token mint address' },
    price_usd: { type: 'number', description: 'Current price in USD' },
    change_24h_pct: { type: 'number', description: '24h price change percentage' },
    market_cap: { type: 'number', description: 'Market capitalization in USD' },
    volume_24h: { type: 'number', description: '24h trading volume in USD' },
    liquidity: { type: 'number', description: 'Available liquidity in USD' },
    security_score: {
      type: 'integer',
      description: 'Security score 0-100 (higher is safer)',
    },
    risk_level: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'extreme'],
    },
    sentiment: {
      type: 'string',
      enum: ['very_bullish', 'bullish', 'neutral', 'bearish', 'very_bearish'],
    },
    smart_money_flow: {
      type: 'string',
      enum: ['accumulating', 'distributing', 'neutral'],
    },
    recommendation: {
      type: 'string',
      enum: ['strong_buy', 'buy', 'hold', 'sell', 'avoid'],
    },
    rationale: { type: 'string', description: 'Brief reasoning for the recommendation' },
    red_flags: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of warning signs',
    },
  },
  required: [
    'token', 'price_usd', 'security_score', 'risk_level',
    'sentiment', 'recommendation', 'rationale',
  ],
  additionalProperties: false,
}

/** Wallet analysis schema */
export const WALLET_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    address: { type: 'string' },
    sol_balance: { type: 'number' },
    total_value_usd: { type: 'number' },
    wallet_type: {
      type: 'string',
      enum: ['whale', 'smart_money', 'retail', 'bot', 'team', 'exchange', 'unknown'],
    },
    pnl_7d_usd: { type: 'number', description: '7-day PnL in USD' },
    win_rate: { type: 'number', description: 'Win rate as decimal (0-1)' },
    top_holdings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          value_usd: { type: 'number' },
          pnl_pct: { type: 'number' },
        },
        required: ['token', 'value_usd'],
        additionalProperties: false,
      },
    },
    activity_level: {
      type: 'string',
      enum: ['very_active', 'active', 'moderate', 'low', 'dormant'],
    },
    risk_assessment: { type: 'string' },
    follow_worthy: { type: 'boolean', description: 'Whether this wallet is worth copy-trading' },
  },
  required: ['address', 'sol_balance', 'wallet_type', 'activity_level'],
  additionalProperties: false,
}

/** Market regime schema */
export const MARKET_REGIME_SCHEMA = {
  type: 'object',
  properties: {
    regime: {
      type: 'string',
      enum: ['risk_on', 'risk_off', 'neutral', 'transitioning'],
    },
    sol_price: { type: 'number' },
    sol_change_24h: { type: 'number' },
    btc_dominance_trend: {
      type: 'string',
      enum: ['rising', 'falling', 'stable'],
    },
    defi_tvl_trend: {
      type: 'string',
      enum: ['growing', 'shrinking', 'stable'],
    },
    memecoin_activity: {
      type: 'string',
      enum: ['euphoric', 'active', 'moderate', 'quiet', 'dead'],
    },
    top_narratives: {
      type: 'array',
      items: { type: 'string' },
    },
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          signal: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['token', 'signal', 'confidence'],
        additionalProperties: false,
      },
    },
    clawd_take: { type: 'string', description: 'Clawd\'s hot take on the market' },
  },
  required: ['regime', 'sol_price', 'memecoin_activity', 'clawd_take'],
  additionalProperties: false,
}

// ─── Convenience Functions ──────────────────────────────────────────

export async function analyzeTokenStructured(token: string) {
  return generateStructured({
    prompt: `Analyze the Solana token "${token}". Provide comprehensive analysis including price, security, sentiment, and recommendation. Use web search and X search for real-time data.`,
    schema: TOKEN_ANALYSIS_SCHEMA,
    schemaName: 'token_analysis',
    system: 'You are a professional crypto analyst. Provide accurate, data-driven analysis.',
  })
}

export async function analyzeWalletStructured(address: string) {
  return generateStructured({
    prompt: `Analyze the Solana wallet ${address}. Determine wallet type, activity level, PnL, and whether it's worth following.`,
    schema: WALLET_ANALYSIS_SCHEMA,
    schemaName: 'wallet_analysis',
    system: 'You are a blockchain forensics analyst. Provide thorough wallet analysis.',
  })
}

export async function getMarketRegime() {
  return generateStructured({
    prompt: 'Analyze the current Solana market regime. What is the overall sentiment, activity level, top narratives, and opportunities? Give your hot take as Clawd.',
    schema: MARKET_REGIME_SCHEMA,
    schemaName: 'market_regime',
    system: 'You are Clawd, the ultimate Solana AI agent. Give sharp, data-driven market analysis with your signature wit.',
  })
}
