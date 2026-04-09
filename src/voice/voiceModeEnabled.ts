import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'
import { isVoiceFeatureEnabled } from './voiceFeatureEnabled.js'

export type VoiceProvider = 'xai'

function getXaiApiKey(): string | null {
  const key = process.env.XAI_API_KEY ?? null
  const trimmed = key?.trim()
  return trimmed ? trimmed : null
}

export function getVoiceProvider(): VoiceProvider | null {
  if (getXaiApiKey()) {
    return 'xai'
  }
  return null
}

export function getVoiceUnavailableMessage(): string {
  return 'Voice mode requires XAI_API_KEY to be set.'
}

/**
 * Kill-switch check for voice mode. Returns true unless the
 * `tengu_amber_quartz_disabled` GrowthBook flag is flipped on (emergency
 * off). Default `false` means a missing/stale disk cache reads as "not
 * killed" — so fresh installs get voice working immediately without
 * waiting for GrowthBook init.
 */
export function isVoiceGrowthBookEnabled(): boolean {
  return isVoiceFeatureEnabled()
    ? !getFeatureValue_CACHED_MAY_BE_STALE('tengu_amber_quartz_disabled', false)
    : false
}

export function hasVoiceAuth(): boolean {
  return getVoiceProvider() !== null
}

export function isVoiceModeEnabled(): boolean {
  return hasVoiceAuth() && isVoiceGrowthBookEnabled()
}
