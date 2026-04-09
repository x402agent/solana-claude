'use client'

import { BrowserSDK, AddressType } from '@phantom/browser-sdk'

let sdkInstance: BrowserSDK | null = null

export function getPhantomSDK(): BrowserSDK {
  if (sdkInstance) return sdkInstance

  const appId = process.env.NEXT_PUBLIC_PHANTOM_APP_ID
  if (!appId) throw new Error('NEXT_PUBLIC_PHANTOM_APP_ID is required')

  // Determine redirect URL based on environment
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vault.solanaclawd.com'

  sdkInstance = new BrowserSDK({
    providers: ['phantom'],
    addressTypes: [AddressType.solana],
    appId,
    authOptions: {
      authUrl: 'https://connect.phantom.app/login',
      redirectUrl: `${origin}/auth/callback`,
    },
  })

  return sdkInstance
}

export { AddressType }
