/**
 * Streaming xAI chat — yields token chunks as they arrive.
 * Used by /clawd and freeform chat.
 */

import { reqEnv, optEnv } from '../utils/env-validate.js';

const BASE = 'https://api.x.ai/v1';

export interface StreamChunk {
  text: string;
  done: boolean;
}

export async function* streamChat(
  prompt: string,
  model = optEnv('GROK_MODEL', 'grok-4-1-fast'),
  systemPrompt?: string
): AsyncGenerator<StreamChunk, void, void> {
  const apiKey = reqEnv('XAI_API_KEY');
  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: prompt },
  ];
  const r = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`xAI stream ${r.status}: ${txt.slice(0, 200)}`);
  }
  const reader = r.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      yield { text: '', done: true };
      return;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') {
        yield { text: '', done: true };
        return;
      }
      try {
        const j = JSON.parse(payload);
        const delta = j?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length) {
          yield { text: delta, done: false };
        }
      } catch {
        // ignore malformed line
      }
    }
  }
}
