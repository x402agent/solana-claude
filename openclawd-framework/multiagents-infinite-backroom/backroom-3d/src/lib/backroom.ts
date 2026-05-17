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

export interface ClawdOrchestrationTrace {
  iteration: number
  phase: string
  agent: string
  goal: string
  risk: string
  marketMood: string
  output: string
}

export interface ClawdOrchestrationResponse {
  name: string
  source: string
  mode: string
  task: string
  loops: number
  risk: string
  checks: string[]
  trace: ClawdOrchestrationTrace[]
  summary: {
    status: string
    nextAction: string
    completionCriteria: string[]
    generatedAt: number
  }
}

export async function fetchClawdOrchestration(task: string, loops = 4): Promise<ClawdOrchestrationResponse> {
  const params = new URLSearchParams({ task, loops: String(loops), market: 'true' })
  const resp = await fetch(`${BACKROOM_URL}/clawd/orchestrate?${params.toString()}`)
  if (!resp.ok) throw new Error(`CLAWD orchestration returned ${resp.status}`)
  return resp.json()
}

// ─── Electric Dreams ──────────────────────────────────────────────────────────

export interface DreamsStory {
  slug: string
  url: string
  title: string
  description: string
  scenario: string
  scraped_at: string
  content_chars: number
  markdown?: string
}

export interface DreamsStoriesResponse {
  source: string
  story_count: number
  returned: number
  stories: DreamsStory[]
}

export interface DreamsStatusResponse {
  source: string
  story_count: number
  state: {
    last_sync_at: string | null
    story_count: number
    last_job_id: string | null
  }
}

export interface DreamsSyncResult {
  job_id: string
  source: string
  story_count: number
  injected: boolean
  injected_chars: number
  credits_used: number
  stories: DreamsStory[]
}

const CONVEX_URL = import.meta.env.VITE_CONVEX_SITE_URL || ''

export async function fetchDreamsStories(limit = 25, fullText = false): Promise<DreamsStoriesResponse> {
  // First try Convex for persisted data
  if (CONVEX_URL) {
    try {
      const resp = await fetch(`${CONVEX_URL}/crawl/pages?source=dreams&limit=${limit}`)
      if (resp.ok) {
        const data = await resp.json()
        const pages = data.pages || []
        const stories: DreamsStory[] = pages.map((p: any) => ({
          slug: p.url?.split('/').filter(Boolean).pop() || 'unknown',
          url: p.sourceUrl || p.url || '',
          title: p.title || '',
          description: '',
          scenario: '',
          scraped_at: new Date(p.timestamp).toISOString(),
          content_chars: (p.markdown || '').length,
          markdown: fullText ? p.markdown : undefined,
        }))
        if (stories.length > 0) {
          return { source: 'dreams', story_count: stories.length, returned: stories.length, stories }
        }
      }
    } catch {
      // fall through to FastAPI
    }
  }
  // Fallback: FastAPI cached stories
  const resp = await fetch(
    `${BACKROOM_URL}/firecrawl/dreams/stories?limit=${limit}&full_text=${fullText}`
  )
  if (!resp.ok) throw new Error(`Dreams stories returned ${resp.status}`)
  return resp.json()
}

export async function fetchDreamsStatus(): Promise<DreamsStatusResponse> {
  const resp = await fetch(`${BACKROOM_URL}/firecrawl/dreams/status`)
  if (!resp.ok) throw new Error(`Dreams status returned ${resp.status}`)
  return resp.json()
}

export async function triggerDreamsSync(limit = 50): Promise<DreamsSyncResult> {
  const resp = await fetch(`${BACKROOM_URL}/firecrawl/dreams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit, inject: true }),
  })
  if (!resp.ok) throw new Error(`Dreams sync returned ${resp.status}`)
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
