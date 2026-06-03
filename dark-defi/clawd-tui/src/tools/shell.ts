import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { spawn } from 'child_process';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT = 20_000;

export const shellTool = tool({
  name: 'shell',
  description:
    'Execute a shell command and return stdout/stderr. Commands run in the current working directory. Default timeout 30s.',
  inputSchema: z.object({
    command: z.string().describe('Shell command to execute'),
    cwd: z.string().optional().describe('Working directory for the command'),
    timeout_ms: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
  }),
  execute: async ({ command, cwd, timeout_ms }) => {
    return new Promise((resolvePromise) => {
      const child = spawn(command, {
        shell: true,
        cwd: cwd ?? process.cwd(),
        env: process.env,
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, timeout_ms ?? DEFAULT_TIMEOUT_MS);

      child.stdout?.on('data', (chunk: Buffer) => {
        if (stdout.length < MAX_OUTPUT) stdout += chunk.toString('utf-8');
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        if (stderr.length < MAX_OUTPUT) stderr += chunk.toString('utf-8');
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        const truncate = (s: string) =>
          s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + '\n…[truncated]' : s;
        resolvePromise({
          exitCode: code ?? -1,
          stdout: truncate(stdout),
          stderr: truncate(stderr),
          ...(timedOut && { timedOut: true }),
        });
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        resolvePromise({ error: err.message });
      });
    });
  },
});
