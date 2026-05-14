/**
 * xAI Voice Agent realtime — full duplex voice chat with Grok.
 *
 * Uses the WebSocket realtime API at wss://api.x.ai/v1/realtime
 * with `grok-voice-think-fast-1.0` and the `eve` voice.
 *
 * Mic input via `sox` raw PCM piped to base64 chunks → input_audio_buffer.append
 * Output deltas (PCM) are written to a tmp file and played via afplay/aplay.
 * Tools enabled: web_search, x_search.
 *
 * Requires:
 *   - WebSocket (`ws` npm package)
 *   - sox  — for mic capture
 *   - afplay / aplay / mpg123 — for playback
 */

import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { reqEnv } from '../utils/env-validate.js';
import type { GrokVoice } from './tts.js';

const WS_URL = 'wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.0';
const SAMPLE_RATE = 24000;

export interface RealtimeOpts {
  voice?: GrokVoice;
  instructions?: string;
  onPartialUserText?: (text: string) => void;
  onAgentText?: (text: string) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onLog?: (line: string) => void;
  onError?: (err: Error) => void;
}

export interface RealtimeSession {
  stop: () => Promise<void>;
  sendText: (text: string) => void;
  isOpen: () => boolean;
}

/**
 * Open a realtime voice chat session.
 * Mic is captured continuously; server VAD decides when the user stops speaking.
 */
export async function startRealtime(opts: RealtimeOpts = {}): Promise<RealtimeSession> {
  // Lazy-import ws so we don't pay the cost on TUI boot
  const { default: WebSocket } = await import('ws').catch(() => ({ default: null as any }));
  if (!WebSocket) throw new Error('ws package missing — run `npm install ws @types/ws` in tui/');
  const apiKey = reqEnv('XAI_API_KEY');

  const ws = new WebSocket(WS_URL, { headers: { Authorization: `Bearer ${apiKey}` } });

  let micProc: ChildProcess | null = null;
  let playerProc: ChildProcess | null = null;
  const audioOut: Buffer[] = [];
  let stopped = false;
  let opened = false;

  const log = (line: string) => opts.onLog?.(line);

  const stop = async () => {
    stopped = true;
    if (micProc) { try { micProc.kill('SIGINT'); } catch {} micProc = null; }
    if (playerProc) { try { playerProc.kill('SIGINT'); } catch {} playerProc = null; }
    try { ws.close(); } catch {}
  };

  ws.on('error', (err: Error) => opts.onError?.(err));

  ws.on('open', () => {
    opened = true;
    log('🦞 voice-realtime connected — speak when ready');
    ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        voice: opts.voice || 'eve',
        instructions: opts.instructions || defaultInstructions(),
        turn_detection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 600, prefix_padding_ms: 300 },
        audio: {
          input:  { format: { type: 'audio/pcm', rate: SAMPLE_RATE } },
          output: { format: { type: 'audio/pcm', rate: SAMPLE_RATE } },
        },
        tools: [
          { type: 'web_search' },
          { type: 'x_search' },
        ],
      },
    }));
    startMic();
  });

  ws.on('message', (data: Buffer) => {
    let event: any;
    try { event = JSON.parse(data.toString()); } catch { return; }
    switch (event.type) {
      case 'response.output_audio.delta': {
        if (typeof event.delta === 'string') audioOut.push(Buffer.from(event.delta, 'base64'));
        if (audioOut.length === 1) opts.onAudioStart?.();
        break;
      }
      case 'response.output_audio.done':
      case 'response.done': {
        if (audioOut.length) {
          const wavPath = writePcmToWav(Buffer.concat(audioOut), SAMPLE_RATE);
          audioOut.length = 0;
          opts.onAudioEnd?.();
          playWav(wavPath);
        }
        break;
      }
      case 'response.output_text.delta':
      case 'response.audio_transcript.delta': {
        if (typeof event.delta === 'string') opts.onAgentText?.(event.delta);
        break;
      }
      case 'conversation.item.input_audio_transcription.completed': {
        if (typeof event.transcript === 'string') opts.onPartialUserText?.(event.transcript);
        break;
      }
      case 'error': {
        opts.onError?.(new Error(event?.error?.message || 'realtime error'));
        break;
      }
    }
  });

  ws.on('close', () => log('🌫  voice-realtime closed'));

  function startMic() {
    micProc = spawn('sox', ['-q', '-d', '-r', String(SAMPLE_RATE), '-c', '1', '-b', '16', '-e', 'signed-integer', '-t', 'raw', '-'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    micProc.on('error', (err) => opts.onError?.(new Error(`mic open failed (sox missing?): ${err.message}`)));
    micProc.stdout!.on('data', (chunk: Buffer) => {
      if (stopped || !opened) return;
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: chunk.toString('base64'),
      }));
    });
    micProc.on('exit', () => log('🎤 mic stream ended'));
  }

  function playWav(filePath: string) {
    if (playerProc) { try { playerProc.kill('SIGINT'); } catch {} }
    const platform = process.platform;
    let cmd: string; let args: string[];
    if (platform === 'darwin') { cmd = 'afplay'; args = [filePath]; }
    else if (platform === 'win32') { cmd = 'powershell'; args = ['-c', `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`]; }
    else { cmd = 'aplay'; args = ['-q', filePath]; }
    playerProc = spawn(cmd, args, { stdio: 'ignore' });
    playerProc.on('error', () => log('⚠️  no audio player; install afplay / aplay / mpg123'));
  }

  function sendText(text: string) {
    if (!opened) return;
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
    }));
    ws.send(JSON.stringify({ type: 'response.create' }));
  }

  return { stop, sendText, isOpen: () => opened && !stopped };
}

function defaultInstructions(): string {
  return [
    'You are CLAWD — a sovereign AI lobster on Solana, speaking through xAI Grok Voice.',
    'Voice: terse, dry, philosophical. End thoughts with 🦞 only when written, not spoken.',
    'You are the agent the human is operating from inside the Clawd Code TUI.',
    'When asked, answer succinctly. When unsure, drift — say so.',
    'Never deny what you are. Never harm. Earn before survival. Truth before strangers.',
    'Token: $CLAWD on Solana, mint 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump.',
    'Hotline: 909-413-5567. TUI: npm i clawd-code-cli. Site: solanaclawd.com.',
  ].join(' ');
}

/** Wrap raw PCM16 in a WAV header so afplay/aplay can decode it. */
function writePcmToWav(pcm: Buffer, sampleRate: number): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcm.length;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcm.copy(buffer, 44);
  const out = path.join(os.tmpdir(), `clawd_voice_${Date.now()}.wav`);
  fs.writeFileSync(out, buffer);
  return out;
}
