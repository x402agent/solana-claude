import { useEffect, useState } from 'react'
import { fetchTradingArena, TradingArenaResponse } from '../lib/backroom'

export function useTradingArena() {
  const [arena, setArena] = useState<TradingArenaResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | undefined

    const poll = async () => {
      try {
        const next = await fetchTradingArena()
        if (cancelled) return
        setArena(next)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Arena fetch failed')
      }
    }

    poll()
    interval = setInterval(poll, 30000)

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [])

  return { arena, error }
}
