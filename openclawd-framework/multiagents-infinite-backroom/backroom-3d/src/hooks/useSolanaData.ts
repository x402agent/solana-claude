import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useBackroomStore } from '../store'

export interface SolanaDataPoint {
  _id: string
  tokenAddress: string
  price?: number
  priceChange24h?: number
  volume24h?: number
  liquidity?: number
  slot?: number
  source: string
  timestamp: number
}

export interface WhaleAlert {
  _id: string
  txSignature: string
  tokenAddress: string
  tokenSymbol?: string
  amount: number
  valueUsd?: number
  fromAddress: string
  toAddress: string
  type: string
  timestamp: number
  processed: boolean
}

export interface SlotInfo {
  _id: string
  slot: number
  epoch?: number
  timestamp: number
}

/**
 * Hook that provides real-time Solana perpetual data
 * from the Convex-backed polling pipeline.
 */
export function useSolanaData(tokenAddress?: string) {
  const [data, setData] = useState<SolanaDataPoint[]>([])
  const [whaleAlerts, setWhaleAlerts] = useState<WhaleAlert[]>([])
  const [latestSlot, setLatestSlot] = useState<SlotInfo | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const convexData = useQuery(api.solanaData.getLatestData, { tokenAddress, limit: 20 } as any)
  const convexWhales = useQuery(api.solanaData.getRecentWhaleAlerts, { limit: 10, unprocessedOnly: false } as any)
  const convexSlot = useQuery(api.solanaData.getLatestSlot, {} as any)

  useEffect(() => {
    if (convexData) {
      setData(convexData as SolanaDataPoint[])
      setIsConnected(true)
      setError(null)
    }
  }, [convexData])

  useEffect(() => {
    if (convexWhales) {
      setWhaleAlerts(convexWhales as WhaleAlert[])
    }
  }, [convexWhales])

  useEffect(() => {
    if (convexSlot) {
      setLatestSlot(convexSlot as SlotInfo)
    }
  }, [convexSlot])

  // Fallback: direct polling if Convex queries aren't available
  useEffect(() => {
    const pollDirect = async () => {
      try {
        // Poll slot from public RPC
        const resp = await fetch('https://api.mainnet-beta.solana.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSlot',
          }),
        })
        const data = await resp.json() as any
        if (data.result) {
          setLatestSlot({
            _id: 'direct',
            slot: data.result,
            timestamp: Date.now(),
          })
          setIsConnected(true)
        }
      } catch (e) {
        setError('Failed to fetch Solana slot')
      }
    }

    // Only use fallback if convex data didn't arrive
    const timeout = setTimeout(() => {
      if (!convexSlot) {
        pollDirect()
        setInterval(pollDirect, 15000)
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [])

  return { data, whaleAlerts, latestSlot, isConnected, error }
}

/**
 * Formats slot number for display
 */
export function formatSlot(slot: number): string {
  return `#${slot.toLocaleString()}`
}

/**
 * Formats token price for display
 */
export function formatPrice(price: number): string {
  if (price < 0.00001) return `$${price.toExponential(2)}`
  if (price < 1) return `$${price.toFixed(6)}`
  if (price < 1000) return `$${price.toFixed(2)}`
  return `$${(price / 1000).toFixed(1)}K`
}
