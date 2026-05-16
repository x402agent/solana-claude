import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export interface DflowQuote {
  _id: string
  pair: string
  priceUsd: number
  priceImpactPct?: string
  routeLegs?: number
  timestamp: number
}

export interface DflowMarket {
  _id: string
  marketId: string
  name: string
  yesPrice?: number
  volume?: number
  status?: string
  timestamp: number
}

export function useDflowData() {
  const quotes = useQuery(api.dflowData.getLatestQuotes) as DflowQuote[] | undefined
  const markets = useQuery(api.dflowData.getLatestMarkets) as DflowMarket[] | undefined

  return {
    quotes: quotes ?? [],
    markets: markets ?? [],
    isConnected: quotes !== undefined,
  }
}
