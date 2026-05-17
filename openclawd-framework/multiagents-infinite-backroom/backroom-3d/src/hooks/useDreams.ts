import { useEffect, useState, useCallback } from 'react'
import {
  fetchDreamsStories,
  fetchDreamsStatus,
  triggerDreamsSync,
  DreamsStory,
  DreamsStatusResponse,
} from '../lib/backroom'

export function useDreams(autoRefreshMs = 60000) {
  const [stories, setStories] = useState<DreamsStory[]>([])
  const [status, setStatus] = useState<DreamsStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [storiesData, statusData] = await Promise.all([
        fetchDreamsStories(50),
        fetchDreamsStatus(),
      ])
      setStories(storiesData.stories)
      setStatus(statusData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dreams')
    } finally {
      setLoading(false)
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    setError(null)
    try {
      const result = await triggerDreamsSync(50)
      setStories(result.stories)
      await fetchDreamsStatus().then(setStatus).catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, autoRefreshMs)
    return () => clearInterval(interval)
  }, [loadData, autoRefreshMs])

  return { stories, status, loading, syncing, error, syncNow, refresh: loadData }
}
