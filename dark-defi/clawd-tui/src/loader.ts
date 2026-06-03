const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const ORANGE = '\x1b[38;5;215m';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Loader {
  private interval: NodeJS.Timeout | null = null;
  private idx = 0;
  private active = false;
  private readonly text: string;

  constructor(text = 'Clawing') {
    this.text = text;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.idx = 0;
    this.render();
    this.interval = setInterval(() => {
      this.idx = (this.idx + 1) % FRAMES.length;
      this.render();
    }, 80);
  }

  private render(): void {
    process.stdout.write(`\r\x1b[K  ${ORANGE}${FRAMES[this.idx]}${RESET} ${DIM}${this.text}…${RESET}`);
  }

  stop(): void {
    if (!this.active) return;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.active = false;
    process.stdout.write('\r\x1b[K');
  }
}
