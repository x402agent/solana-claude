/**
 * Honcho.ai memory integration hook.
 * Each agent gets a Peer → Session for storing conversation memory.
 */

const HONCHO_API_URL = 'https://api.honcho.ai/v1'
const HONCHO_API_KEY = import.meta.env.VITE_HONCHO_API_KEY || ''

interface HonchoPeer {
  id: string
  name: string
}

interface HonchoSession {
  id: string
  peer_id: string
  created_at: string
}

interface HonchoMessage {
  id: string
  session_id: string
  content: string
  role: string
  created_at: string
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${HONCHO_API_KEY}`,
}

export async function initAgentPeer(agentName: string): Promise<HonchoPeer> {
  const resp = await fetch(`${HONCHO_API_URL}/peers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: agentName }),
  })
  if (!resp.ok) throw new Error(`Failed to create Honcho peer: ${resp.status}`)
  return resp.json()
}

export async function createAgentSession(peerId: string): Promise<HonchoSession> {
  const resp = await fetch(`${HONCHO_API_URL}/peers/${peerId}/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })
  if (!resp.ok) throw new Error(`Failed to create Honcho session: ${resp.status}`)
  return resp.json()
}

export async function storeMemory(
  sessionId: string,
  role: string,
  content: string
): Promise<HonchoMessage> {
  const resp = await fetch(`${HONCHO_API_URL}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ role, content }),
  })
  if (!resp.ok) throw new Error(`Failed to store Honcho message: ${resp.status}`)
  return resp.json()
}

export async function getMemorySummary(sessionId: string): Promise<string> {
  const resp = await fetch(`${HONCHO_API_URL}/sessions/${sessionId}/memories`, { headers })
  if (!resp.ok) throw new Error(`Failed to get Honcho memories: ${resp.status}`)
  const data = await resp.json()
  return data.summary || ''
}

export async function getOrCreateSession(peerId: string): Promise<HonchoSession> {
  const resp = await fetch(`${HONCHO_API_URL}/peers/${peerId}/sessions`, { headers })
  if (resp.ok) {
    const sessions: HonchoSession[] = await resp.json()
    if (sessions.length > 0) return sessions[0]
  }
  return createAgentSession(peerId)
}
