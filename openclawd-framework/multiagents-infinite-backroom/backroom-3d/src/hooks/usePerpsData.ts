import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export interface PerpsMarket {
  _id: string
  symbol: string
  markPrice?: number
  midPrice?: number
  oraclePrice?: number
  prevDayPrice?: number
  change24hPct?: number
  volume24hUsd?: number
  openInterest?: number
  fundingRate?: number
  timestamp: number
}

export interface PerpsSummary {
  symbol: string
  markPrice?: number
  fundingRate?: number
  openInterest?: number
  change24hPct?: number
  volume24hUsd?: number
  timestamp: number
}

/**
 * Hook providing real-time Phoenix DEX perpetuals market data.
 * Used by the 3D frontend and AI agents.
 */
export function usePerpsData() {
  const [markets, setMarkets] = useState<PerpsSummary[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const convexMarkets = useQuery(api.perpsData.getPerpsSummary, {} as any)

  useEffect(() => {
    if (convexMarkets) {
      setMarkets(convexMarkets as PerpsSummary[])
      setIsConnected(true)
      setError(null)
    }
  }, [convexMarkets])

  // Fallback: direct HTTP polling to the Convex HTTP endpoint
  useEffect(() => {
    if (convexMarkets) return // skip fallback if Convex working

    const pollDirect = async () => {
      try {
        const resp = await fetch('https://original-vulture-742.convex.cloud/perps/summary')
        if (resp.ok) {
          setIsConnected(true)
          setError(null)
        }
      } catch (e) {
        setError('Failed to fetch perps data')
      }
    }

    const timeout = setTimeout(() => {
      pollDirect()
      setInterval(pollDirect, 60000)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [])

  return { markets, isConnected, error }
}

/**
 * Format funding rate for display.
 */
export function formatFundingRate(rate?: number): string {
  if (rate === undefined || rate === null) return '—'
  return `${(rate * 100).toFixed(4)}%`
}

/**
 * Format large USD values.
 */
export function formatUsd(value?: number): string {
  if (value === undefined || value === null) return '—'
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}
