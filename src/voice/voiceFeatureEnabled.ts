import { feature } from 'bun:bundle'
import { isEnvTruthy } from '../utils/envUtils.js'

export function isVoiceFeatureEnabled(): boolean {
  if (feature('VOICE_MODE')) {
    return true
  }

  return (
    isEnvTruthy(process.env.CLAUDE_CODE_VOICE_MODE) ||
    Boolean(process.env.XAI_API_KEY?.trim())
  )
}
