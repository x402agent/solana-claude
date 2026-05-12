/**
 * xAI Speech-to-Text via /v1/stt.
 * Records mic input via `sox` (cross-platform), then transcribes.
 *
 * Requires `sox` installed:
 *   macOS:   brew install sox
 *   linux:   apt-get install sox
 *   windows: scoop install sox  (or chocolatey)
 */

import { reqEnv } from '../utils/env-validate.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface SttResult {
  text: string;
  language?: string;
  durationMs: number;
}

/** Records up to `maxSec` seconds of mic input to a wav, returns the path. */
export function recordMic(maxSec = 15): Promise<{ path: string; cancel: () => void }> {
  const out = path.join(os.tmpdir(), `clawd_stt_${Date.now()}.wav`);
  return new Promise((resolve, reject) => {
    const child = spawn('sox', ['-q', '-d', '-r', '16000', '-c', '1', '-b', '16', out, 'trim', '0', String(maxSec)], { stdio: ['ignore', 'ignore', 'pipe'] });
    let cancelled = false;
    child.on('error', (err) => reject(new Error(`sox not installed or mic blocked: ${err.message}`)));
    child.on('exit', () => {
      if (cancelled) return;
      if (!fs.existsSync(out)) reject(new Error('recording failed — no audio captured'));
      else resolve({ path: out, cancel: () => {} });
    });
    // give caller a way to stop early
    setImmediate(() => {
      resolve({
        path: out,
        cancel: () => { cancelled = true; child.kill('SIGINT'); },
      });
    });
  });
}

export async function transcribeFile(audioPath: string): Promise<SttResult> {
  const apiKey = reqEnv('XAI_API_KEY');
  const start = Date.now();
  const fileBuf = fs.readFileSync(audioPath);
  const ext = path.extname(audioPath).slice(1) || 'wav';
  const blob = new Blob([new Uint8Array(fileBuf)], { type: `audio/${ext}` });
  const fd = new FormData();
  fd.append('file', blob, path.basename(audioPath));
  const r = await fetch('https://api.x.ai/v1/stt', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
  });
  if (!r.ok) throw new Error(`xAI STT ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j: any = await r.json();
  return { text: j?.text || '', language: j?.language, durationMs: Date.now() - start };
}

/** Convenience: record N seconds + transcribe. Returns transcript. */
export async function listenAndTranscribe(seconds = 8): Promise<SttResult> {
  const rec = await recordMic(seconds);
  // wait until file lands
  await new Promise((r) => setTimeout(r, seconds * 1000 + 200));
  if (!fs.existsSync(rec.path)) throw new Error('mic capture produced no file');
  return transcribeFile(rec.path);
}
