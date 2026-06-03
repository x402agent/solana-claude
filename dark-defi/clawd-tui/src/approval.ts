import { createInterface } from 'readline';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';

export type ApprovalDecision = 'yes' | 'no' | 'session';

export class ApprovalGate {
  private readonly allowedThisSession = new Set<string>();

  async prompt(name: string, args: Record<string, unknown>): Promise<boolean> {
    const key = this.cacheKey(name, args);
    if (this.allowedThisSession.has(key) || this.allowedThisSession.has(name)) {
      return true;
    }

    const summary = this.summarize(name, args);
    process.stdout.write(
      `\n  ${YELLOW}⚠${RESET}  ${BOLD}${name}${RESET} ${DIM}wants to run:${RESET}\n` +
        `  ${DIM}${summary}${RESET}\n` +
        `  ${DIM}[${RESET}${GREEN}y${RESET}${DIM}] allow once  [${RESET}${GREEN}a${RESET}${DIM}] allow all this session  [${RESET}${RED}n${RESET}${DIM}] deny${RESET}${DIM}]${RESET} `,
    );

    const answer = await this.readOne();
    process.stdout.write('\n');
    if (answer === 'y') return true;
    if (answer === 'a') {
      this.allowedThisSession.add(name);
      return true;
    }
    return false;
  }

  private cacheKey(name: string, args: Record<string, unknown>): string {
    return `${name}:${JSON.stringify(args)}`;
  }

  private summarize(name: string, args: Record<string, unknown>): string {
    const preferred: Record<string, string> = {
      shell: 'command',
      file_write: 'path',
      file_edit: 'path',
    };
    const key = preferred[name] ?? Object.keys(args)[0];
    if (!key || !(key in args)) return JSON.stringify(args).slice(0, 200);
    const val = String(args[key]);
    return val.length > 300 ? val.slice(0, 300) + '…' : val;
  }

  private readOne(): Promise<string> {
    return new Promise((resolvePromise) => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      rl.question('', (answer) => {
        rl.close();
        resolvePromise(answer.trim().toLowerCase().slice(0, 1));
      });
    });
  }
}
