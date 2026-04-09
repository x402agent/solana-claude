'use client'

import { usePhantom } from '@/hooks/usePhantom'
import { Wallet } from 'lucide-react'

interface WalletConnectButtonProps {
  variant?: 'full' | 'compact'
  className?: string
  onConnected?: (address: string) => void
}

export function WalletConnectButton({ variant = 'full', className = '', onConnected }: WalletConnectButtonProps) {
  const { connected, connecting, solanaAddress, connect, disconnect, error } = usePhantom()

  async function handleClick() {
    if (connected) {
      await disconnect()
      return
    }

    const result = await connect()
    if (result?.solanaAddress && onConnected) {
      onConnected(result.solanaAddress)
    }
  }

  const truncatedAddress = solanaAddress
    ? `${solanaAddress.slice(0, 4)}...${solanaAddress.slice(-4)}`
    : null

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        disabled={connecting}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          connected
            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20'
            : 'bg-purple-600 text-white hover:bg-purple-500'
        } disabled:opacity-50 ${className}`}
      >
        <Wallet className="size-3.5" />
        {connecting ? 'Connecting...' : connected ? truncatedAddress : 'Connect Wallet'}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={connecting}
        className={`flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
          connected
            ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
            : 'border-purple-500/40 bg-gradient-to-r from-purple-600/20 to-green-500/20 text-foreground hover:from-purple-600/30 hover:to-green-500/30'
        } disabled:opacity-50 ${className}`}
      >
        <svg width="20" height="20" viewBox="0 0 128 128" fill="none">
          <rect width="128" height="128" rx="26" fill="url(#phantom-gradient)" />
          <path
            d="M110.584 64.914H99.142C99.142 41.154 79.986 22 56.226 22C32.876 22 14 40.514 13.424 63.668C12.83 87.578 33.948 108 57.862 108H62.774C84.274 108 110.584 88.33 110.584 64.914Z"
            fill="url(#phantom-white)"
          />
          <circle cx="46" cy="62" r="7" fill="#4C3B96" />
          <circle cx="74" cy="62" r="7" fill="#4C3B96" />
          <defs>
            <linearGradient id="phantom-gradient" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
              <stop stopColor="#534BB1" />
              <stop offset="1" stopColor="#551BF9" />
            </linearGradient>
            <linearGradient id="phantom-white" x1="64" y1="22" x2="64" y2="108" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#F0F0F0" />
            </linearGradient>
          </defs>
        </svg>
        {connecting
          ? 'Connecting Phantom...'
          : connected
            ? `Connected: ${truncatedAddress}`
            : 'Connect with Phantom'}
      </button>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
      {connected && solanaAddress && (
        <p className="text-xs text-center text-muted-foreground">
          <span className="text-green-400">●</span> {solanaAddress}
        </p>
      )}
    </div>
  )
}
