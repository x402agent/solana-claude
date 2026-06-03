import { OpenRouter } from '@openrouter/agent';
import type { Item } from '@openrouter/agent';
import { stepCountIs, maxCost } from '@openrouter/agent/stop-conditions';
import type { AgentConfig } from './config.js';
import { buildTools } from './tools/index.js';

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_call'; name: string; callId: string; args: Record<string, unknown> }
  | { type: 'tool_result'; name: string; callId: string; output: string }
  | { type: 'reasoning'; delta: string };

export interface RunOptions {
  onEvent?: (event: AgentEvent) => void;
  signal?: AbortSignal;
  approve?: (name: string, args: Record<string, unknown>) => Promise<boolean>;
}

function extractOutputText(response: { outputText?: string; output?: unknown[] }): string {
  if (response.outputText) return response.outputText;

  return (response.output ?? [])
    .flatMap((item) => {
      if (!item || typeof item !== 'object' || !('content' in item)) return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .flatMap((part) => {
      if (!part || typeof part !== 'object' || !('text' in part)) return [];
      const text = (part as { text?: unknown }).text;
      return typeof text === 'string' ? [text] : [];
    })
    .join('');
}

export async function runAgent(
  config: AgentConfig,
  input: string | ChatMessage[],
  options?: RunOptions,
) {
  const client = new OpenRouter({ apiKey: config.apiKey });
  const tools = buildTools(config, options?.approve);

  const result = client.callModel({
    model: config.model,
    instructions: config.systemPrompt.replace('{cwd}', process.cwd()),
    input: input as string | Item[],
    tools,
    stopWhen: [stepCountIs(config.maxSteps), maxCost(config.maxCost)],
  });

  if (options?.onEvent) {
    let lastTextLen = 0;
    const callNames = new Map<string, string>();

    for await (const item of result.getItemsStream()) {
      if (options.signal?.aborted) break;
      if (item.type === 'message') {
        const text = item.content
          ?.filter((c: { type: string; text?: string }): c is { type: 'output_text'; text: string } => 'text' in c)
          .map((c: { text: string }) => c.text)
          .join('') ?? '';
        if (text.length > lastTextLen) {
          options.onEvent({ type: 'text', delta: text.slice(lastTextLen) });
          lastTextLen = text.length;
        }
      } else if (item.type === 'function_call') {
        callNames.set(item.callId, item.name);
        if (item.status === 'completed') {
          const args = (() => {
            try { return item.arguments ? JSON.parse(item.arguments) : {}; } catch { return {}; }
          })();
          options.onEvent({ type: 'tool_call', name: item.name, callId: item.callId, args });
        }
      } else if (item.type === 'function_call_output') {
        const out = typeof item.output === 'string' ? item.output : JSON.stringify(item.output);
        options.onEvent({
          type: 'tool_result',
          name: callNames.get(item.callId) ?? 'unknown',
          callId: item.callId,
          output: out.length > 200 ? out.slice(0, 200) + '…' : out,
        });
      } else if (item.type === 'reasoning') {
        const text = item.summary?.map((s: { text: string }) => s.text).join('') ?? '';
        if (text) options.onEvent({ type: 'reasoning', delta: text });
      }
    }
  }

  const response = await result.getResponse();
  return { text: extractOutputText(response), usage: response.usage, output: response.output };
}

export async function runAgentWithRetry(
  config: AgentConfig,
  input: string | ChatMessage[],
  options?: RunOptions & { maxRetries?: number },
) {
  const max = options?.maxRetries ?? 3;
  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      return await runAgent(config, input, options);
    } catch (err: unknown) {
      const e = err as { status?: number; statusCode?: number };
      const s = e.status ?? e.statusCode;
      const retriable = s === 429 || (typeof s === 'number' && s >= 500 && s < 600);
      if (!retriable || attempt === max) throw err;
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 30000)));
    }
  }
  throw new Error('Unreachable');
}
