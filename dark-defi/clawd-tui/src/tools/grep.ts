import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { glob } from 'glob';
import { readFile } from 'fs/promises';

export const grepTool = tool({
  name: 'grep',
  description: 'Search file contents by regex. Returns matching lines with line numbers.',
  inputSchema: z.object({
    pattern: z.string().describe('Regular expression pattern to search for'),
    path: z.string().optional().describe('Glob pattern for files to search (default: **/*)'),
    cwd: z.string().optional().describe('Directory to search in'),
    caseInsensitive: z.boolean().optional(),
    maxResults: z.number().optional().describe('Max matches to return (default: 100)'),
  }),
  execute: async ({ pattern, path, cwd, caseInsensitive, maxResults }) => {
    try {
      const flags = caseInsensitive ? 'i' : '';
      const re = new RegExp(pattern, flags);
      const files = await glob(path ?? '**/*', {
        cwd: cwd ?? process.cwd(),
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
        nodir: true,
        absolute: true,
      });
      const max = maxResults ?? 100;
      const results: { file: string; line: number; text: string }[] = [];
      for (const file of files) {
        if (results.length >= max) break;
        try {
          const content = await readFile(file, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) {
              results.push({ file, line: i + 1, text: lines[i].slice(0, 200) });
              if (results.length >= max) break;
            }
          }
        } catch {
          // Skip binary or unreadable files
        }
      }
      return { results, count: results.length, ...(results.length >= max && { truncated: true }) };
    } catch (err: unknown) {
      const e = err as { message: string };
      return { error: e.message };
    }
  },
});
