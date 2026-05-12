/**
 * xAI Text-to-Speech via /v1/tts.
 * Generates an MP3 buffer; we write it to a tmp file and play via system default.
 */

import { reqEnv } from '../utils/env-validate.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type GrokVoice = 'eve' | 'ara' | 'rex' | 'sal' | 'leo';
export const DEFAULT_VOICE: GrokVoice = 'eve';

export interface TtsOpts {
  voice?: GrokVoice;
  language?: string; // 'en' default
}

export async function ttsToFile(text: string, opts: TtsOpts = {}): Promise<string> {
  const apiKey = reqEnv('XAI_API_KEY');
  const r = await fetch('https://api.x.ai/v1/tts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice_id: opts.voice || DEFAULT_VOICE,
      language: opts.language || 'en',
    }),
  });
  if (!r.ok) throw new Error(`xAI TTS ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const out = path.join(os.tmpdir(), `clawd_tts_${Date.now()}.mp3`);
  fs.writeFileSync(out, buf);
  return out;
}

export async function speak(text: string, opts: TtsOpts = {}): Promise<void> {
  const file = await ttsToFile(text, opts);
  await playFile(file);
}

export function playFile(filePath: string): Promise<void> {
  return new Promise((resolve) => {
    const platform = process.platform;
    let cmd: string; let args: string[];
    if (platform === 'darwin') { cmd = 'afplay'; args = [filePath]; }
    else if (platform === 'win32') { cmd = 'powershell'; args = ['-c', `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`]; }
    else { cmd = 'mpg123'; args = ['-q', filePath]; } // linux: requires mpg123 or ffplay
    const child = spawn(cmd, args, { stdio: 'ignore' });
    child.on('exit', () => resolve());
    child.on('error', () => resolve()); // never block the TUI on missing player
  });
}
