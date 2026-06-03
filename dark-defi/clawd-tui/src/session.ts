import { mkdirSync, appendFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import type { ChatMessage } from './agent.js';

export interface SessionEntry {
  t: number;
  type: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'meta';
  data: unknown;
}

export class Session {
  readonly id: string;
  readonly path: string;
  private readonly dir: string;
  private messages: ChatMessage[] = [];
  private usageTokens = { input: 0, output: 0 };

  constructor(dir: string, id?: string) {
    this.dir = resolve(dir);
    this.id = id ?? new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 6);
    this.path = resolve(this.dir, `${this.id}.jsonl`);
    mkdirSync(this.dir, { recursive: true });
    this.append({ t: Date.now(), type: 'meta', data: { event: 'session_start', id: this.id } });
  }

  append(entry: SessionEntry): void {
    try {
      appendFileSync(this.path, JSON.stringify(entry) + '\n');
    } catch {
      // Non-fatal — don't break the REPL if disk is full.
    }
  }

  addUser(content: string): void {
    this.messages.push({ role: 'user', content });
    this.append({ t: Date.now(), type: 'user', data: { content } });
  }

  addAssistant(content: string): void {
    this.messages.push({ role: 'assistant', content });
    this.append({ t: Date.now(), type: 'assistant', data: { content } });
  }

  recordToolCall(name: string, args: Record<string, unknown>): void {
    this.append({ t: Date.now(), type: 'tool_call', data: { name, args } });
  }

  recordToolResult(name: string, output: string): void {
    this.append({ t: Date.now(), type: 'tool_result', data: { name, output } });
  }

  addUsage(input: number, output: number): void {
    this.usageTokens.input += input;
    this.usageTokens.output += output;
  }

  getUsage(): { input: number; output: number } {
    return { ...this.usageTokens };
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
    this.append({ t: Date.now(), type: 'meta', data: { event: 'session_clear' } });
  }

  static load(dir: string, id: string): Session | null {
    const path = resolve(dir, `${id}.jsonl`);
    if (!existsSync(path)) return null;
    const session = new Session(dir, id);
    const content = readFileSync(path, 'utf-8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry: SessionEntry = JSON.parse(line);
        if (entry.type === 'user' || entry.type === 'assistant') {
          const data = entry.data as { content: string };
          session.messages.push({ role: entry.type, content: data.content });
        }
      } catch {
        // Skip malformed lines
      }
    }
    return session;
  }
}
