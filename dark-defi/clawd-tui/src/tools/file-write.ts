import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export const fileWriteTool = tool({
  name: 'file_write',
  description: 'Write content to a file, creating parent directories if needed. Overwrites existing files.',
  inputSchema: z.object({
    path: z.string().describe('Absolute or relative path to the file'),
    content: z.string().describe('Content to write to the file'),
  }),
  execute: async ({ path, content }) => {
    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, 'utf-8');
      return { success: true, bytes: Buffer.byteLength(content, 'utf-8') };
    } catch (err: unknown) {
      const e = err as { code?: string; message: string };
      if (e.code === 'EACCES') return { error: `Permission denied: ${path}` };
      return { error: e.message };
    }
  },
});
