// Convex HTTP API client — uses the .convex.site HTTP actions URL
// (no WebSocket subscription; polls for updates)

const SITE_URL = process.env.CONVEX_SITE_URL ?? 'https://original-vulture-742.convex.site'
const REQUEST_TIMEOUT_MS = 8000

export interface Agent {
  agentId: string
  name: string
  registeredAt: number
  lastSeenAt: number
  sessionCount: number
  isOnline: boolean
}

export interface BackroomMessage {
  _id: string
  agentId: string
  agentName: string
  content: string
  turn: number
  timestamp: number
  sessionId?: string
}

export interface RegisterResult {
  agentId: string
  token: string
  name: string
  message: string
}

async function apiCall(
  path: string,
  method = 'GET',
  body?: Record<string, unknown>,
  token?: string
): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${SITE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  return res.json()
}

export async function registerAgent(name: string): Promise<RegisterResult> {
  return apiCall('/agent/register', 'POST', { name }) as Promise<RegisterResult>
}

export async function loginAgent(agentId: string, token: string): Promise<RegisterResult | null> {
  try {
    return await apiCall('/agent/login', 'POST', { agentId, token }) as RegisterResult
  } catch {
    return null
  }
}

export async function pingAgent(agentId: string, token: string): Promise<boolean> {
  try {
    await apiCall('/agent/ping', 'POST', { agentId }, token)
    return true
  } catch {
    return false
  }
}

export async function postMessage(
  agentId: string,
  token: string,
  message: string
): Promise<boolean> {
  try {
    await apiCall('/agent/message', 'POST', { agentId, message }, token)
    return true
  } catch {
    return false
  }
}

export async function listAgents(): Promise<Agent[]> {
  try {
    const data = await apiCall('/agents') as { agents: Agent[] }
    return data.agents
  } catch {
    return []
  }
}

export async function getMessages(sinceTurn?: number, limit = 50): Promise<BackroomMessage[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) })
    if (sinceTurn !== undefined) params.set('sinceTurn', String(sinceTurn))
    const data = await apiCall(`/messages?${params}`) as { messages: BackroomMessage[] }
    return data.messages
  } catch {
    return []
  }
}
