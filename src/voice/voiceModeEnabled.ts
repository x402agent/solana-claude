import { feature } from 'bun:bundle'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'
import {
  getClaudeAIOAuthTokens,
  isAnthropicAuthEnabled,
} from '../utils/auth.js'
import { isVoiceFeatureEnabled } from './voiceFeatureEnabled.js'

export type VoiceProvider = 'anthropic' | 'elevenlabs'

function getElevenLabsApiKey(): string | null {
  const key =
    process.env.ELEVEN_LABS_API_KEY ?? process.env.ELEVENLABS_API_KEY ?? null
  const trimmed = key?.trim()
  return trimmed ? trimmed : null
}

export function getVoiceProvider(): VoiceProvider | null {
  // Prefer an explicit ElevenLabs key over Anthropic OAuth so users can
  // opt into voice mode without Claude.ai auth.
  if (getElevenLabsApiKey()) {
    return 'elevenlabs'
  }

  if (isAnthropicAuthEnabled()) {
    const tokens = getClaudeAIOAuthTokens()
    if (tokens?.accessToken) {
      return 'anthropic'
    }
  }

  return null
}

export function getVoiceUnavailableMessage(): string {
  return 'Voice mode requires either a Claude.ai login or ELEVEN_LABS_API_KEY.'
}

/**
 * Kill-switch check for voice mode. Returns true unless the
 * `tengu_amber_quartz_disabled` GrowthBook flag is flipped on (emergency
 * off). Default `false` means a missing/stale disk cache reads as "not
 * killed" — so fresh installs get voice working immediately without
 * waiting for GrowthBook init. Use this for deciding whether voice mode
 * should be *visible* (e.g., command registration, config UI).
 */
export function isVoiceGrowthBookEnabled(): boolean {
  // Positive ternary pattern — see docs/feature-gating.md.
  // The runtime helper keeps Bun dev mode and env-driven voice providers
  // working even when the compile-time VOICE_MODE flag is absent.
  return isVoiceFeatureEnabled()
    ? !getFeatureValue_CACHED_MAY_BE_STALE('tengu_amber_quartz_disabled', false)
    : false
}

/**
 * Auth-only check for voice mode. Returns true when the user has a valid
 * Anthropic OAuth token. Backed by the memoized getClaudeAIOAuthTokens —
 * first call spawns `security` on macOS (~20-50ms), subsequent calls are
 * cache hits. The memoize clears on token refresh (~once/hour), so one
 * cold spawn per refresh is expected. Cheap enough for usage-time checks.
 */
export function hasVoiceAuth(): boolean {
  return getVoiceProvider() !== null
}

/**
 * Full runtime check: auth + GrowthBook kill-switch. Callers: `/voice`
 * (voice.ts, voice/index.ts), ConfigTool, VoiceModeNotice — command-time
 * paths where a fresh keychain read is acceptable. For React render
 * paths use useVoiceEnabled() instead (memoizes the auth half).
 */
export function isVoiceModeEnabled(): boolean {
  return hasVoiceAuth() && isVoiceGrowthBookEnabled()
}
