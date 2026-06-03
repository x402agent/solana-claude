import type { AgentEvent } from './agent.js';
import type { DisplayConfig } from './config.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const ORANGE = '\x1b[38;5;215m';
const GRAY = '\x1b[90m';
const CYAN = '\x1b[36m';

const TOOL_COLOR: Record<string, string> = {
  file_read: CYAN,
  file_write: YELLOW,
  file_edit: YELLOW,
  glob: GREEN,
  grep: GREEN,
  list_dir: CYAN,
  shell: RED,
  web_search: ORANGE,
  datetime: GRAY,
};

const ARG_KEYS: Record<string, string> = {
  shell: 'command',
  file_read: 'path',
  file_write: 'path',
  file_edit: 'path',
  glob: 'pattern',
  grep: 'pattern',
  list_dir: 'path',
  web_search: 'query',
};

function summarizeArgs(name: string, args: Record<string, unknown>): string {
  const key = ARG_KEYS[name] ?? Object.keys(args)[0];
  if (!key || !(key in args)) return '';
  const val = String(args[key]);
  return val.length > 60 ? val.slice(0, 60) + '…' : val;
}

export class TuiRenderer {
  private streaming = false;
  private started = false;
  private readonly toolStart = new Map<string, number>();
  private readonly groupArgs = new Map<string, Record<string, unknown>>();

  constructor(private readonly display: DisplayConfig) {}

  onEvent = (event: AgentEvent): void => {
    switch (event.type) {
      case 'text':
        this.handleText(event.delta);
        break;
      case 'tool_call':
        this.handleToolCall(event.name, event.callId, event.args);
        break;
      case 'tool_result':
        this.handleToolResult(event.name, event.callId, event.output);
        break;
      case 'reasoning':
        if (this.display.reasoning) this.handleReasoning(event.delta);
        break;
    }
  };

  finish(): void {
    if (this.streaming) process.stdout.write(RESET + '\n');
    this.streaming = false;
    this.started = false;
  }

  private markStarted(): void {
    if (!this.started) {
      this.started = true;
      process.stdout.write('\r\x1b[K');
    }
  }

  private handleText(delta: string): void {
    this.markStarted();
    this.streaming = true;
    process.stdout.write(delta);
  }

  private handleReasoning(delta: string): void {
    this.markStarted();
    if (this.streaming) {
      process.stdout.write('\n');
      this.streaming = false;
    }
    process.stdout.write(`${DIM}${delta}${RESET}`);
  }

  private handleToolCall(name: string, callId: string, args: Record<string, unknown>): void {
    this.markStarted();
    if (this.streaming) {
      process.stdout.write('\n');
      this.streaming = false;
    }
    this.toolStart.set(callId, Date.now());
    this.groupArgs.set(callId, args);
    const color = TOOL_COLOR[name] ?? GRAY;
    const summary = summarizeArgs(name, args);

    switch (this.display.toolDisplay) {
      case 'hidden':
        return;
      case 'minimal':
        process.stdout.write(`  ${DIM}${name}${RESET}${summary ? ` ${DIM}${summary}${RESET}` : ''}\n`);
        return;
      case 'emoji':
        process.stdout.write(`  ${color}⚡${RESET} ${DIM}${name}${summary ? ' ' + summary : ''}${RESET}\n`);
        return;
      case 'grouped':
      default:
        process.stdout.write(`  ${color}${BOLD}${name}${RESET}${summary ? `  ${DIM}${summary}${RESET}` : ''}\n`);
        return;
    }
  }

  private handleToolResult(name: string, callId: string, output: string): void {
    const start = this.toolStart.get(callId) ?? Date.now();
    const ms = Date.now() - start;
    this.toolStart.delete(callId);
    this.groupArgs.delete(callId);

    switch (this.display.toolDisplay) {
      case 'hidden':
        return;
      case 'minimal':
        return;
      case 'emoji':
        process.stdout.write(`  ${GREEN}✓${RESET} ${DIM}${name} (${(ms / 1000).toFixed(1)}s)${RESET}\n`);
        return;
      case 'grouped':
      default: {
        const firstLine = output.split('\n')[0] ?? '';
        const preview = firstLine.length > 100 ? firstLine.slice(0, 100) + '…' : firstLine;
        if (preview) {
          process.stdout.write(`  ${DIM}└─ ${preview}${RESET}\n`);
        }
        process.stdout.write(`  ${DIM}${GREEN}✓${RESET} ${DIM}${(ms / 1000).toFixed(1)}s${RESET}\n`);
        return;
      }
    }
  }
}
