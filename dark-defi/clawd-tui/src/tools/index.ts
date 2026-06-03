import { serverTool } from '@openrouter/agent';
import type { Tool } from '@openrouter/agent';
import { fileReadTool } from './file-read.js';
import { fileWriteTool } from './file-write.js';
import { fileEditTool } from './file-edit.js';
import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import { listDirTool } from './list-dir.js';
import { shellTool } from './shell.js';
import type { AgentConfig } from '../config.js';

type ApproveFn = (name: string, args: Record<string, unknown>) => Promise<boolean>;

export function buildTools(_config: AgentConfig, _approve?: ApproveFn): Tool[] {
  // Approval is handled by the cli layer by prompting before the model's tool
  // call is executed. We don't gate here because the SDK's requireApproval is
  // a pause/resume pattern that doesn't fit an inline REPL prompt.
  return [
    fileReadTool,
    fileWriteTool,
    fileEditTool,
    globTool,
    grepTool,
    listDirTool,
    shellTool,
    serverTool({ type: 'openrouter:web_search' }),
    serverTool({ type: 'openrouter:datetime', parameters: { timezone: 'UTC' } }),
  ] as Tool[];
}
