import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { glob } from 'glob';

export const globTool = tool({
  name: 'glob',
  description: 'Find files matching a glob pattern. Example patterns: "**/*.ts", "src/**/*.tsx".',
  inputSchema: z.object({
    pattern: z.string().describe('Glob pattern to match'),
    cwd: z.string().optional().describe('Directory to search in (defaults to current working directory)'),
    limit: z.number().optional().describe('Maximum number of results to return'),
  }),
  execute: async ({ pattern, cwd, limit }) => {
    try {
      const matches = await glob(pattern, {
        cwd: cwd ?? process.cwd(),
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
        nodir: true,
      });
      const sliced = limit ? matches.slice(0, limit) : matches;
      return {
        matches: sliced,
        total: matches.length,
        ...(limit && matches.length > limit && { truncated: true }),
      };
    } catch (err: unknown) {
      const e = err as { message: string };
      return { error: e.message };
    }
  },
});
