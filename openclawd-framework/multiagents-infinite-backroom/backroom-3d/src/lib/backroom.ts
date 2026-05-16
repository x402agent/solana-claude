/**
 * API client to poll the backrooms.x402.wtf agent backend
 */

const BACKROOM_URL = import.meta.env.VITE_BACKROOM_URL || 'https://backrooms.x402.wtf'

interface AgentResponse {
  agent: number
  name: string
  response: string
}

interface LoopResponse {
  turns: number
  agents: number
  responses: Array<{
    turn: number
    agent: number
    response: string
  }>
}

export async function fetchAgent(agentId: 1 | 2 | 3): Promise<AgentResponse> {
  const resp = await fetch(`${BACKROOM_URL}/agent${agentId}`)
  if (!resp.ok) throw new Error(`Agent ${agentId} returned ${resp.status}`)
  return resp.json()
}

export async function fetchLoop(turns: number = 3): Promise<LoopResponse> {
  const resp = await fetch(`${BACKROOM_URL}/loop?turns=${turns}`)
  if (!resp.ok) throw new Error(`Loop returned ${resp.status}`)
  return resp.json()
}

export async function fetchConversation(): Promise<string> {
  const resp = await fetch(`${BACKROOM_URL}/conversation`)
  if (!resp.ok) throw new Error(`Conversation returned ${resp.status}`)
  const data = await resp.json()
  return data.conversation || ''
}

export async function sendMessage(message: string): Promise<string> {
  const resp = await fetch(`${BACKROOM_URL}/enter?message=${encodeURIComponent(message)}`)
  if (!resp.ok) throw new Error(`Enter returned ${resp.status}`)
  return resp.text()
}

export interface ArenaDecision {
  agent: string
  style: string
  symbol: string
  action: 'long' | 'short' | 'hold'
  confidence: number
  score: number
  rationale: string
}

export interface TradingArenaResponse {
  source: string
  market: string
  mood: string
  decisions: ArenaDecision[]
  summary: {
    long: number
    short: number
    hold: number
    trackedMarkets: number
    generatedAt: number
  }
}

export async function fetchTradingArena(): Promise<TradingArenaResponse> {
  const resp = await fetch(`${BACKROOM_URL}/arena`)
  if (!resp.ok) throw new Error(`Arena returned ${resp.status}`)
  return resp.json()
}

export const AGENT_NAMES: Record<number, string> = {
  1: 'The Analyst',
  2: 'The Satirist',
  3: 'Clawd',
}

export const AGENT_COLORS: Record<number, string> = {
  1: '#4fc3f7',
  2: '#ff8a65',
  3: '#ef5350',
}
