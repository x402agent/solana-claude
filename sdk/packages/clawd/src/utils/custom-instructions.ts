import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function loadCustomInstructions(workingDirectory: string = process.cwd()): string | null {
  try {
    const candidatePaths = [
      path.join(workingDirectory, '.clawd', 'CLAWD.md'),
      path.join(workingDirectory, '.clawd', 'GROK.md'),
      path.join(workingDirectory, '.grok', 'GROK.md'),
      path.join(os.homedir(), '.clawd', 'CLAWD.md'),
      path.join(os.homedir(), '.clawd', 'GROK.md'),
      path.join(os.homedir(), '.grok', 'GROK.md'),
    ];

    for (const instructionsPath of candidatePaths) {
      if (!fs.existsSync(instructionsPath)) {
        continue;
      }

      const customInstructions = fs.readFileSync(instructionsPath, 'utf-8');
      return customInstructions.trim();
    }

    return null;
  } catch (error) {
    console.warn('Failed to load custom instructions:', error);
    return null;
  }
}
