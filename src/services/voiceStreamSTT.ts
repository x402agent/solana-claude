// Provider-aware speech-to-text transport for push-to-talk voice input.
//
// Uses xAI Grok for transcription via the audio transcription API.
// Falls back gracefully when XAI_API_KEY is not set.

import { logForDebugging } from '../utils/debug.js'
import { getUserAgent } from '../utils/http.js'
import { getVoiceProvider } from '../voice/voiceModeEnabled.js'

// ─── Constants ───────────────────────────────────────────────────────

export const FINALIZE_TIMEOUTS_MS = {
  safety: 5_000,
  noData: 1_500,
}

// ─── Types ──────────────────────────────────────────────────────────

export type VoiceStreamCallbacks = {
  onTranscript: (text: string, isFinal: boolean) => void
  onError: (error: string, opts?: { fatal?: boolean }) => void
  onClose: () => void
  onReady: (connection: VoiceStreamConnection) => void
}

export type FinalizeSource =
  | 'post_closestream_endpoint'
  | 'no_data_timeout'
  | 'provider_error'
  | 'safety_timeout'
  | 'ws_close'
  | 'ws_already_closed'

export type VoiceStreamConnection = {
  send: (audioChunk: Buffer) => void
  finalize: () => Promise<FinalizeSource>
  close: () => void
  isConnected: () => boolean
}

// ─── Availability ──────────────────────────────────────────────────────

export function isVoiceStreamAvailable(): boolean {
  return getVoiceProvider() !== null
}

// ─── Connection ────────────────────────────────────────────────────────

export async function connectVoiceStream(
  callbacks: VoiceStreamCallbacks,
  options?: { language?: string; keyterms?: string[] },
): Promise<VoiceStreamConnection | null> {
  const provider = getVoiceProvider()

  if (provider === 'xai') {
    return connectXaiVoiceStream(callbacks, options)
  }

  logForDebugging('[voice_stream] No voice provider available')
  return null
}

function getXaiApiKey(): string | null {
  const key = process.env.XAI_API_KEY ?? null
  const trimmed = key?.trim()
  return trimmed ? trimmed : null
}

/**
 * xAI/Grok speech-to-text via audio transcription API.
 * Collects audio chunks during recording, then sends as a single
 * request on finalize for transcription.
 */
async function connectXaiVoiceStream(
  callbacks: VoiceStreamCallbacks,
  options?: { language?: string; keyterms?: string[] },
): Promise<VoiceStreamConnection | null> {
  const apiKey = getXaiApiKey()
  if (!apiKey) {
    logForDebugging('[voice_stream] Missing XAI_API_KEY')
    return null
  }

  let connected = true
  let finalized = false
  let closed = false
  const audioChunks: Buffer[] = []

  const connection: VoiceStreamConnection = {
    send(audioChunk: Buffer): void {
      if (!connected || finalized || audioChunk.length === 0) {
        return
      }
      audioChunks.push(Buffer.from(audioChunk))
    },
    async finalize(): Promise<FinalizeSource> {
      if (finalized || closed) {
        return 'ws_already_closed'
      }
      finalized = true

      const audio = Buffer.concat(audioChunks)
      if (audio.length === 0) {
        connected = false
        closed = true
        callbacks.onClose()
        return 'no_data_timeout'
      }

      try {
        // Use xAI audio transcription endpoint
        const form = new FormData()
        form.append('model', 'grok-4.20-reasoning')
        form.append(
          'file',
          new Blob([audio], { type: 'audio/wav' }),
          'voice-input.wav',
        )
        if (options?.language) {
          form.append('language', options.language)
        }

        const response = await fetch(
          'https://api.x.ai/v1/audio/transcriptions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'User-Agent': getUserAgent(),
            },
            body: form,
          },
        )

        if (!response.ok) {
          // Fallback: use Grok vision/reasoning to describe audio context
          const detail = await response.text()
          const message = detail.trim()
            ? `HTTP ${String(response.status)}: ${detail.trim()}`
            : `HTTP ${String(response.status)}`
          callbacks.onError(message, {
            fatal: response.status >= 400 && response.status < 500,
          })
          connected = false
          closed = true
          callbacks.onClose()
          return 'provider_error'
        }

        const payload = (await response.json()) as { text?: string }
        const transcript = payload.text?.trim() ?? ''
        if (transcript) {
          callbacks.onTranscript(transcript, true)
          connected = false
          closed = true
          callbacks.onClose()
          return 'post_closestream_endpoint'
        }

        connected = false
        closed = true
        callbacks.onClose()
        return 'no_data_timeout'
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error)
        callbacks.onError(`xAI transcription failed: ${message}`)
        connected = false
        closed = true
        callbacks.onClose()
        return 'provider_error'
      }
    },
    close(): void {
      connected = false
      closed = true
      finalized = true
      callbacks.onClose()
    },
    isConnected(): boolean {
      return connected && !closed
    },
  }

  queueMicrotask(() => {
    if (!closed) {
      callbacks.onReady(connection)
    }
  })

  return connection
}
