/**
 * src/services/grokMultiAgent.ts
 *
 * Grok multi-agent orchestration using grok-4.20-multi-agent.
 * Enables deep research with 4 or 16 collaborating agents,
 * with optional web search and X search capabilities.
 */

import { getGrokClient, GROK_MODELS } from './grokClient.js'

export type AgentCount = 4 | 16
export type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh'

export interface MultiAgentResult {
  text: string
  responseId: string
  usage: {
    promptTokens: number
    completionTokens: number
    reasoningTokens: number
    totalTokens: number
  }
}

function agentCountToEffort(count: AgentCount): ReasoningEffort {
  return count === 16 ? 'high' : 'low'
}

/**
 * Run a multi-agent research query.
 *
 * @param opts.prompt - The research question
 * @param opts.agentCount - 4 (quick) or 16 (deep) agents
 * @param opts.tools - Built-in tools to enable: web_search, x_search, code_execution
 * @param opts.previousResponseId - Continue a multi-turn conversation
 */
export async function runMultiAgentResearch(opts: {
  prompt: string
  system?: string
  agentCount?: AgentCount
  tools?: Array<'web_search' | 'x_search' | 'code_execution'>
  previousResponseId?: string
}): Promise<MultiAgentResult> {
  const client = getGrokClient()
  const effort = agentCountToEffort(opts.agentCount ?? 4)

  const input: any[] = []
  if (opts.system) {
    input.push({ role: 'system', content: opts.system })
  }
  input.push({ role: 'user', content: opts.prompt })

  // Build tools array for built-in server-side tools
  const tools: any[] = []
  if (opts.tools?.includes('web_search')) {
    tools.push({ type: 'web_search_preview' })
  }
  if (opts.tools?.includes('x_search')) {
    tools.push({ type: 'x_search' })
  }
  if (opts.tools?.includes('code_execution')) {
    tools.push({ type: 'code_interpreter' })
  }

  const response = await client.responses.create({
    model: GROK_MODELS.multiAgent,
    input,
    reasoning: { effort } as any,
    ...(tools.length > 0 ? { tools } : {}),
    ...(opts.previousResponseId
      ? { previous_response_id: opts.previousResponseId }
      : {}),
  })

  const text =
    response.output
      ?.filter((o: any) => o.type === 'message')
      .flatMap((o: any) => o.content)
      .filter((c: any) => c.type === 'output_text')
      .map((c: any) => c.text)
      .join('') ?? ''

  const usage = (response as any).usage ?? {}

  return {
    text,
    responseId: response.id,
    usage: {
      promptTokens: usage.input_tokens ?? 0,
      completionTokens: usage.output_tokens ?? 0,
      reasoningTokens: usage.reasoning_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    },
  }
}

/**
 * Deep Solana research using 16 agents with web + X search.
 */
export async function deepSolanaResearch(opts: {
  query: string
  previousResponseId?: string
}): Promise<MultiAgentResult> {
  return runMultiAgentResearch({
    prompt: opts.query,
    system: `You are a team of expert Solana blockchain researchers. Use web search and X search to find the most up-to-date information. Focus on:
- On-chain data and metrics
- Developer activity and protocol updates
- Community sentiment from X/Twitter
- DeFi TVL, volume, and yield opportunities
- New token launches and memecoin trends
- Security incidents and rug pull patterns

Provide well-sourced, actionable intelligence.`,
    agentCount: 16,
    tools: ['web_search', 'x_search'],
    previousResponseId: opts.previousResponseId,
  })
}

/**
 * Quick market scan using 4 agents.
 */
export async function quickMarketScan(opts: {
  tokens?: string[]
  previousResponseId?: string
}): Promise<MultiAgentResult> {
  const tokenList = opts.tokens?.length
    ? `Focus on these tokens: ${opts.tokens.join(', ')}`
    : 'Scan for trending Solana tokens'

  return runMultiAgentResearch({
    prompt: `${tokenList}. Give me a quick market overview with prices, sentiment, and any breaking news.`,
    system:
      'You are a fast crypto market scanner. Be concise. Use bullet points. Include prices and percentage changes.',
    agentCount: 4,
    tools: ['web_search', 'x_search'],
    previousResponseId: opts.previousResponseId,
  })
}
