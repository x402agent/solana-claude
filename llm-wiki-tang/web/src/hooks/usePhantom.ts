'use client'

import { useState, useCallback } from 'react'
import { getPhantomSDK, AddressType } from '@/lib/phantom'

interface PhantomState {
  connected: boolean
  connecting: boolean
  solanaAddress: string | null
  error: string | null
}

export function usePhantom() {
  const [state, setState] = useState<PhantomState>({
    connected: false,
    connecting: false,
    solanaAddress: null,
    error: null,
  })

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true, error: null }))
    try {
      const sdk = getPhantomSDK()
      const result = await sdk.connect({ provider: 'phantom' })
      const addresses = result.addresses ?? sdk.getAddresses()

      const solAddr = addresses.find((a) => a.addressType === AddressType.solana)
      setState({
        connected: true,
        connecting: false,
        solanaAddress: solAddr?.address ?? null,
        error: null,
      })

      return { addresses, solanaAddress: solAddr?.address ?? null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet'
      setState((s) => ({ ...s, connecting: false, error: message }))
      return null
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      const sdk = getPhantomSDK()
      await sdk.disconnect()
    } catch {
      // ignore disconnect errors
    }
    setState({ connected: false, connecting: false, solanaAddress: null, error: null })
  }, [])

  const signMessage = useCallback(async (message: string) => {
    try {
      const sdk = getPhantomSDK()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signature = await (sdk as any).signMessage({ message, networkId: 'solana:mainnet' })
      return signature
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign message'
      setState((s) => ({ ...s, error: msg }))
      return null
    }
  }, [])

  return {
    ...state,
    connect,
    disconnect,
    signMessage,
  }
}
