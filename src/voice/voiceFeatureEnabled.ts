import { feature } from 'bun:bundle'
import { isEnvTruthy } from '../utils/envUtils.js'

export function isVoiceFeatureEnabled(): boolean {
  if (feature('VOICE_MODE')) {
    return true
  }

  return (
    isEnvTruthy(process.env.CLAUDE_CODE_VOICE_MODE) ||
    Boolean(process.env.ELEVEN_LABS_API_KEY?.trim()) ||
    Boolean(process.env.ELEVENLABS_API_KEY?.trim())
  )
}
