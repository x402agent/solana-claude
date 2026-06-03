import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export const listDirTool = tool({
  name: 'list_dir',
  description: 'List the contents of a directory with type (file/dir) and size.',
  inputSchema: z.object({
    path: z.string().describe('Directory path to list'),
  }),
  execute: async ({ path }) => {
    try {
      const entries = await readdir(path);
      const items = await Promise.all(
        entries.map(async (name) => {
          try {
            const full = join(path, name);
            const s = await stat(full);
            return {
              name,
              type: s.isDirectory() ? 'dir' : 'file',
              ...(s.isFile() && { size: s.size }),
            };
          } catch {
            return { name, type: 'unknown' };
          }
        }),
      );
      return { path, items };
    } catch (err: unknown) {
      const e = err as { code?: string; message: string };
      if (e.code === 'ENOENT') return { error: `Directory not found: ${path}` };
      if (e.code === 'ENOTDIR') return { error: `Not a directory: ${path}` };
      return { error: e.message };
    }
  },
});
