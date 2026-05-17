import { useEffect, useRef, useCallback, useState } from 'react'
import { useBackroomStore, AgentMessage } from '../store'
import { AGENT_NAMES } from '../lib/backroom'

const BACKROOM_URL = import.meta.env.VITE_BACKROOM_URL || 'https://backrooms.x402.wtf'

export interface StreamEvent {
  event: 'message' | 'typing' | 'human' | 'connected'
  agent?: number
  name?: string
  content?: string
  turn?: number
}

export function useStream(enabled: boolean = true) {
  const { addMessage, setAgentSpeaking, setTurnCount, setError, turnCount } = useBackroomStore()
  const esRef = useRef<EventSource | null>(null)
  const mountedRef = useRef(true)
  const turnRef = useRef(turnCount)
  const [connected, setConnected] = useState(false)
  const [typingAgent, setTypingAgent] = useState<number | null>(null)
  const [humanMessages, setHumanMessages] = useState<AgentMessage[]>([])

  turnRef.current = turnCount

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close()

    const es = new EventSource(`${BACKROOM_URL}/stream`)
    esRef.current = es

    es.onopen = () => {
      if (mountedRef.current) {
        setConnected(true)
        setError(null)
      }
    }

    es.onmessage = (e) => {
      if (!mountedRef.current) return
      try {
        const ev: StreamEvent = JSON.parse(e.data)

        if (ev.event === 'connected') {
          setConnected(true)
          return
        }

        if (ev.event === 'typing' && ev.agent) {
          setTypingAgent(ev.agent)
          setAgentSpeaking(ev.agent as 1 | 2 | 3, true)
          return
        }

        if (ev.event === 'message' && ev.agent && ev.content) {
          setTypingAgent(null)
          setAgentSpeaking(ev.agent as 1 | 2 | 3, false)
          const msg: AgentMessage = {
            id: `stream-${ev.turn}-${ev.agent}-${Date.now()}`,
            agentId: ev.agent as 1 | 2 | 3,
            agentName: ev.name || AGENT_NAMES[ev.agent] || `Agent ${ev.agent}`,
            content: ev.content,
            timestamp: Date.now(),
            turn: ev.turn ?? turnRef.current + 1,
          }
          addMessage(msg)
          setTurnCount(ev.turn ?? turnRef.current + 1)
          return
        }

        if (ev.event === 'human' && ev.content) {
          setTypingAgent(null)
          const msg: AgentMessage = {
            id: `human-${ev.turn}-${Date.now()}`,
            agentId: 0 as any,
            agentName: ev.name || 'Human',
            content: ev.content,
            timestamp: Date.now(),
            turn: ev.turn ?? turnRef.current,
          }
          addMessage(msg)
          setHumanMessages((prev) => [...prev, msg].slice(-50))
        }
      } catch {
        // malformed event, skip
      }
    }

    es.onerror = () => {
      if (!mountedRef.current) return
      setConnected(false)
      setTypingAgent(null)
      // Reconnect after delay
      setTimeout(() => {
        if (mountedRef.current && enabled) connect()
      }, 5000)
    }
  }, [enabled, addMessage, setAgentSpeaking, setTurnCount, setError])

  useEffect(() => {
    mountedRef.current = true
    if (!enabled) return
    connect()
    return () => {
      mountedRef.current = false
      esRef.current?.close()
    }
  }, [enabled, connect])

  const sendHuman = useCallback(async (content: string, name = 'Human') => {
    const resp = await fetch(`${BACKROOM_URL}/stream/human`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, name }),
    })
    if (!resp.ok) throw new Error(`inject failed: ${resp.status}`)
    return resp.json()
  }, [])

  return { connected, typingAgent, humanMessages, sendHuman }
}
