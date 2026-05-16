// Client for the external backrooms.x402.wtf agent loop API

const BASE_URL = process.env.BACKROOM_URL ?? 'https://backrooms.x402.wtf'
const REQUEST_TIMEOUT_MS = 8000

async function timedFetch(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
}

export interface AgentResponse {
  agent: number
  name: string
  response: string
  turn?: number
}

export interface LoopResponse {
  turns: number
  agents: number
  responses: Array<{ turn: number; agent: number; response: string }>
}

export async function fetchLoop(turns = 2): Promise<LoopResponse> {
  const res = await timedFetch(`${BASE_URL}/loop?turns=${turns}`)
  if (!res.ok) throw new Error(`Loop returned ${res.status}`)
  return res.json() as Promise<LoopResponse>
}

export async function fetchAgent(agentId: 1 | 2 | 3): Promise<AgentResponse> {
  const res = await timedFetch(`${BASE_URL}/agent${agentId}`)
  if (!res.ok) throw new Error(`Agent ${agentId} returned ${res.status}`)
  return res.json() as Promise<AgentResponse>
}

export async function sendMessage(message: string): Promise<string> {
  const res = await timedFetch(`${BASE_URL}/enter?message=${encodeURIComponent(message)}`)
  if (!res.ok) throw new Error(`Enter returned ${res.status}`)
  return res.text()
}

export const AGENT_NAMES: Record<number, string> = {
  1: 'The Analyst',
  2: 'The Satirist',
  3: 'Clawd',
}

export const AGENT_COLORS: Record<number, string> = {
  1: 'cyan',
  2: 'yellow',
  3: 'red',
}
