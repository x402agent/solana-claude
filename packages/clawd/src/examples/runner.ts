import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import type { ExampleSpec } from './registry.js';

function findExamplePath(file: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), '../openclawd-framework/examples', file),
    path.resolve(process.cwd(), '../../openclawd-framework/examples', file),
    path.resolve(process.cwd(), 'openclawd-framework/examples', file),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

export interface ExampleRun {
  kill: () => void;
  done: Promise<number>;
}

export function runExample(spec: ExampleSpec, onLine: (line: string) => void): ExampleRun {
  const target = findExamplePath(spec.file);
  if (!target) {
    onLine(`🪨 example "${spec.file}" not found`);
    return { kill: () => {}, done: Promise.resolve(127) };
  }
  const child = spawn('npx', ['tsx', target], { stdio: ['ignore', 'pipe', 'pipe'] });
  let oBuf = '', eBuf = '';
  child.stdout.on('data', (c) => { oBuf += c.toString(); const lines = oBuf.split('\n'); oBuf = lines.pop() || ''; lines.forEach(onLine); });
  child.stderr.on('data', (c) => { eBuf += c.toString(); const lines = eBuf.split('\n'); eBuf = lines.pop() || ''; lines.forEach((l) => onLine(`⚠️  ${l}`)); });
  const done = new Promise<number>((resolve) => child.on('exit', (code) => { if (oBuf) onLine(oBuf); if (eBuf) onLine(`⚠️  ${eBuf}`); resolve(code ?? 0); }));
  return { kill: () => { try { child.kill('SIGINT'); } catch {} }, done };
}
