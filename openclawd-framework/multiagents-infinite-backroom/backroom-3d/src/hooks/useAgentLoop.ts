import { useEffect, useRef, useCallback } from 'react'
import { useBackroomStore, AgentMessage } from '../store'
import { fetchLoop, AGENT_NAMES } from '../lib/backroom'

const POLL_INTERVAL = 8000
const MIN_WAIT = 3000

/**
 * Polls the backend loop endpoint and updates local state.
 */
export function useAgentLoop(enabled: boolean = true, turns: number = 2) {
  const { addMessage, setAgentSpeaking, setPolling, setError, setTurnCount, turnCount } =
    useBackroomStore()
  const prevTurnRef = useRef(0)
  const pollingRef = useRef(false)
  const mountedRef = useRef(true)

  const poll = useCallback(async () => {
    if (pollingRef.current) return
    pollingRef.current = true
    setPolling(true)

    try {
      const data = await fetchLoop(turns)

      for (const resp of data.responses) {
        if (!mountedRef.current) break

        const turn = resp.turn
        if (turn <= prevTurnRef.current) continue

        setAgentSpeaking(resp.agent as 1 | 2 | 3, true)

        const msg: AgentMessage = {
          id: `${turn}-${resp.agent}-${Date.now()}`,
          agentId: resp.agent as 1 | 2 | 3,
          agentName: AGENT_NAMES[resp.agent] || `Agent ${resp.agent}`,
          content: resp.response,
          timestamp: Date.now(),
          turn: turn,
        }

        addMessage(msg)
        await new Promise((r) => setTimeout(r, MIN_WAIT))
        setAgentSpeaking(resp.agent as 1 | 2 | 3, false)

        if (turn > prevTurnRef.current) {
          prevTurnRef.current = turn
        }
      }

      if (data.turns > 0 && mountedRef.current) {
        setTurnCount(turnCount + data.responses.length)
      }
      setError(null)
    } catch (err) {
      console.error('Poll error:', err)
      setError(err instanceof Error ? err.message : 'Poll failed')
    } finally {
      pollingRef.current = false
      if (mountedRef.current) setPolling(false)
    }
  }, [turns, addMessage, setAgentSpeaking, setPolling, setError, setTurnCount, turnCount])

  useEffect(() => {
    if (!enabled) return

    const initTimeout = setTimeout(() => poll(), 1000)
    const interval = setInterval(() => poll(), POLL_INTERVAL)

    return () => {
      mountedRef.current = false
      clearTimeout(initTimeout)
      clearInterval(interval)
    }
  }, [enabled, poll])
}
