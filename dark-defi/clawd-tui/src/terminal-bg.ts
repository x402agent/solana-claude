// Detect terminal background color for adaptive input styling.
// Queries the terminal via OSC 11, falls back to a neutral dim background.

const FALLBACK_DARK = '\x1b[48;5;236m';
const FALLBACK_LIGHT = '\x1b[48;5;254m';

function rgbToAnsiBg(r: number, g: number, b: number): string {
  const avg = (r + g + b) / 3;
  const step = avg < 128 ? 12 : -12;
  const nr = Math.max(0, Math.min(255, r + step));
  const ng = Math.max(0, Math.min(255, g + step));
  const nb = Math.max(0, Math.min(255, b + step));
  return `\x1b[48;2;${nr};${ng};${nb}m`;
}

export async function detectBg(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return FALLBACK_DARK;
  }

  return new Promise((resolvePromise) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolvePromise(FALLBACK_DARK);
    }, 150);

    const onData = (buf: Buffer) => {
      const s = buf.toString('utf8');
      const match = s.match(/\x1b\]11;rgb:([0-9a-f]{2,4})\/([0-9a-f]{2,4})\/([0-9a-f]{2,4})/i);
      if (match) {
        cleanup();
        const r = parseInt(match[1].padEnd(2, '0').slice(0, 2), 16);
        const g = parseInt(match[2].padEnd(2, '0').slice(0, 2), 16);
        const b = parseInt(match[3].padEnd(2, '0').slice(0, 2), 16);
        const isDark = (r + g + b) / 3 < 128;
        resolvePromise(rgbToAnsiBg(r, g, b) || (isDark ? FALLBACK_DARK : FALLBACK_LIGHT));
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      process.stdin.removeListener('data', onData);
      if (wasRaw === false) {
        try { process.stdin.setRawMode(false); } catch {}
      }
      try { process.stdin.pause(); } catch {}
    };

    const wasRaw = process.stdin.isRaw;
    try { process.stdin.setRawMode(true); } catch {}
    process.stdin.resume();
    process.stdin.on('data', onData);
    process.stdout.write('\x1b]11;?\x07');
  });
}
