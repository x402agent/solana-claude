import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo } from 'react'

export interface CurlAgent {
  agentId: string
  name: string
  registeredAt: number
  lastSeenAt: number
  sessionCount: number
  isOnline: boolean
  position: [number, number, number]
  color: string
}

const CURL_COLORS = [
  '#a5d6a7', '#80cbc4', '#90caf9', '#ce93d8', '#ffcc80',
  '#f48fb1', '#b0bec5', '#fff59d', '#80deea', '#ef9a9a',
]
const MAX_RENDERED_CURL_AGENTS = 240

function stablePosition(agentId: string, index: number): [number, number, number] {
  // Deterministic position seeded by agentId + index
  const seed = agentId.charCodeAt(0) + agentId.charCodeAt(1) + index * 13
  const angle = (seed * 137.508) % 360
  const rad = (angle * Math.PI) / 180
  const r = 5.5 + (seed % 3) * 0.8
  return [
    parseFloat((Math.cos(rad) * r).toFixed(2)),
    0.4 + (seed % 4) * 0.15,
    parseFloat((Math.sin(rad) * r).toFixed(2)),
  ]
}

export function useCurlAgents(): CurlAgent[] {
  const raw = useQuery(api.agents.getPublicAgents)

  type RawAgent = { agentId: string; name: string; registeredAt: number; lastSeenAt: number; sessionCount: number; isOnline: boolean }

  return useMemo(() => {
    if (!raw) return []
    const sorted = (raw as RawAgent[]).slice().sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1
      return b.lastSeenAt - a.lastSeenAt
    })
    return sorted.slice(0, MAX_RENDERED_CURL_AGENTS).map((a, i) => ({
      ...a,
      position: stablePosition(a.agentId, i),
      color: CURL_COLORS[i % CURL_COLORS.length],
    }))
  }, [raw])
}
