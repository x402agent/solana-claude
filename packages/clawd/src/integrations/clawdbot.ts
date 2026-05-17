/**
 * Bridge to the ClawdBot in /X. We shell out to npx tsx for one-shot ops
 * (no in-process protocol changes to X/).
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

function findX(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '../X'),
    path.resolve(process.cwd(), '../../X'),
    path.resolve(process.cwd(), 'X'),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

export interface BotRun {
  kill: () => void;
  done: Promise<number>;
}

function runScript(scriptName: string, extraArgs: string[], onLine: (line: string) => void): BotRun {
  const xRoot = findX();
  if (!xRoot) {
    onLine('🪨 X/ not found in this checkout — clawdbot not present.');
    return { kill: () => {}, done: Promise.resolve(127) };
  }
  const file = path.join(xRoot, 'src/scripts', scriptName);
  if (!fs.existsSync(file)) {
    onLine(`🪨 X/src/scripts/${scriptName} not found.`);
    return { kill: () => {}, done: Promise.resolve(127) };
  }
  const child = spawn('npx', ['tsx', file, ...extraArgs], { stdio: ['ignore', 'pipe', 'pipe'], cwd: xRoot });
  let buf = '', ebuf = '';
  child.stdout.on('data', (c) => { buf += c.toString(); const lines = buf.split('\n'); buf = lines.pop() || ''; lines.forEach(onLine); });
  child.stderr.on('data', (c) => { ebuf += c.toString(); const lines = ebuf.split('\n'); ebuf = lines.pop() || ''; lines.forEach((l) => onLine(`⚠️  ${l}`)); });
  const done = new Promise<number>((resolve) => child.on('exit', (code) => { if (buf) onLine(buf); if (ebuf) onLine(`⚠️  ${ebuf}`); resolve(code ?? 0); }));
  return { kill: () => { try { child.kill('SIGINT'); } catch {} }, done };
}

export const Bot = {
  selfTest: (onLine: (l: string) => void) => runScript('self-test.ts', [], onLine),
  shillToken: (onLine: (l: string) => void) => runScript('shill-token.ts', [], onLine),
  basedTweet: (onLine: (l: string) => void) => runScript('based-tweet.ts', [], onLine),
  firstClawd: (onLine: (l: string) => void) => runScript('first-clawd-tweet.ts', [], onLine),
  testParse:  (onLine: (l: string) => void) => runScript('test-parse.ts', [], onLine),
  status: (onLine: (l: string) => void) => {
    const xRoot = findX();
    if (!xRoot) { onLine('🪨 X/ not found.'); return { kill: () => {}, done: Promise.resolve(127) }; }
    const child = spawn('pgrep', ['-f', 'tsx.*start-bot'], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout.on('data', (c) => { out += c.toString(); });
    const done = new Promise<number>((resolve) => {
      child.on('exit', () => {
        const pids = out.trim().split('\n').filter(Boolean);
        if (pids.length) onLine(`🐦 ClawdBot running (pids: ${pids.join(', ')})`);
        else onLine(`🌫  ClawdBot is not running. Start with: cd X && npm run dev`);
        resolve(0);
      });
    });
    return { kill: () => { try { child.kill(); } catch {} }, done };
  },
};
