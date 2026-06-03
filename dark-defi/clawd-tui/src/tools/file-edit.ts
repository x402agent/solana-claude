import { tool } from '@openrouter/agent/tool';
import { z } from 'zod';
import { readFile, writeFile } from 'fs/promises';

export const fileEditTool = tool({
  name: 'file_edit',
  description:
    'Replace the first occurrence of old_string with new_string in a file. The old_string must match exactly, including whitespace and indentation. Use a larger chunk with more surrounding context if the match is not unique.',
  inputSchema: z.object({
    path: z.string().describe('Path to the file to edit'),
    old_string: z.string().describe('Exact text to find'),
    new_string: z.string().describe('Replacement text'),
    replace_all: z.boolean().optional().describe('Replace all occurrences instead of just the first'),
  }),
  execute: async ({ path, old_string, new_string, replace_all }) => {
    try {
      const content = await readFile(path, 'utf-8');
      if (!content.includes(old_string)) {
        return { error: `old_string not found in ${path}` };
      }
      if (!replace_all) {
        const first = content.indexOf(old_string);
        const rest = content.indexOf(old_string, first + old_string.length);
        if (rest !== -1) {
          return { error: 'old_string is not unique — provide more context or set replace_all: true' };
        }
      }
      const updated = replace_all
        ? content.split(old_string).join(new_string)
        : content.replace(old_string, new_string);
      await writeFile(path, updated, 'utf-8');
      const replacements = replace_all ? content.split(old_string).length - 1 : 1;
      return { success: true, replacements };
    } catch (err: unknown) {
      const e = err as { code?: string; message: string };
      if (e.code === 'ENOENT') return { error: `File not found: ${path}` };
      return { error: e.message };
    }
  },
});
