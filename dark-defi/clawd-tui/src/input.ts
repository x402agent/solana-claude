import { createInterface } from 'readline';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GRAY = '\x1b[90m';
const ORANGE = '\x1b[38;5;215m';

export async function plainReadLine(): Promise<string> {
  return new Promise((resolvePromise) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.setPrompt(`${ORANGE}>${RESET} `);
    rl.prompt();
    rl.once('line', (line) => {
      rl.close();
      resolvePromise(line);
    });
  });
}

export async function borderedReadLine(): Promise<string> {
  const width = Math.max(20, Math.min(process.stdout.columns ?? 60, 80));
  const top = GRAY + '─'.repeat(width) + RESET;
  process.stdout.write(`${top}\n`);
  const line = await new Promise<string>((resolvePromise) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.setPrompt(`${ORANGE}›${RESET} `);
    rl.prompt();
    rl.once('line', (l) => {
      rl.close();
      resolvePromise(l);
    });
  });
  process.stdout.write(`${top}\n`);
  return line;
}

export async function styledReadLine(bg: string): Promise<string> {
  const width = Math.max(20, Math.min(process.stdout.columns ?? 60, 80));
  // Paint a block row with the background, then move the cursor back to enter text inside.
  process.stdout.write(`${bg} ${ORANGE}${BOLD}›${RESET}${bg} `);
  return new Promise((resolvePromise) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.once('line', (line) => {
      rl.close();
      // Clear the styling row we painted, move up, and write the tidy version.
      process.stdout.write(RESET);
      resolvePromise(line);
    });
  });
}

export async function getInput(
  style: 'block' | 'bordered' | 'plain',
  bg: string,
): Promise<string> {
  switch (style) {
    case 'block':
      return styledReadLine(bg);
    case 'bordered':
      return borderedReadLine();
    case 'plain':
    default:
      return plainReadLine();
  }
}

export function printCwdHint(): void {
  const cwd = process.cwd().replace(process.env.HOME ?? '', '~');
  process.stdout.write(`  ${DIM}${cwd}${RESET}\n`);
}
