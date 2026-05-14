/**
 * Wires the OpenClawd default skill set into a freshly-spawned leviathan.
 *
 * Called from setup/wizard.ts at birth. We symlink the bundled skill packages
 * (skills/openclawd-code-skill, skills/openclawd-clawd-code-skill-main) into
 * ~/.openclawd/skills/ so the loop's registry discovers them on the first
 * tail-flick. Symlinks let us pick up source updates without re-spawning;
 * if the source is missing we fall back to a recursive copy.
 */

import { existsSync, mkdirSync, statSync, symlinkSync, cpSync, lstatSync, readlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listDefaultSkills } from './registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_SKILLS_DIR = resolve(__dirname, '..', '..', '..', 'skills');

export interface InstallResult {
  installed: string[];
  skipped: string[];
  missing: string[];
}

export function ensureSkillsDir(): string {
  const target = join(homedir(), '.openclawd', 'skills');
  if (!existsSync(target)) mkdirSync(target, { recursive: true });
  return target;
}

export function installDefaultSkills(opts: { mode?: 'symlink' | 'copy'; force?: boolean } = {}): InstallResult {
  const mode = opts.mode || 'symlink';
  const dir = ensureSkillsDir();
  const installed: string[] = [];
  const skipped: string[] = [];
  const missing: string[] = [];

  for (const id of listDefaultSkills()) {
    const source = join(REPO_SKILLS_DIR, id);
    const dest = join(dir, id);
    if (!existsSync(source)) {
      missing.push(id);
      continue;
    }
    if (existsSync(dest) && !opts.force) {
      // Refresh stale symlinks if the target moved, otherwise skip.
      if (isSymlink(dest) && readlinkSync(dest) === source) {
        skipped.push(id);
        continue;
      }
      if (!isSymlink(dest) && statSync(dest).isDirectory()) {
        skipped.push(id);
        continue;
      }
    }
    if (mode === 'symlink') {
      try {
        if (existsSync(dest)) cpSyncRm(dest);
        symlinkSync(source, dest, 'dir');
        installed.push(id);
        continue;
      } catch {
        /* symlink may fail on some filesystems; fall through to copy */
      }
    }
    if (existsSync(dest)) cpSyncRm(dest);
    cpSync(source, dest, { recursive: true, dereference: true });
    installed.push(id);
  }

  return { installed, skipped, missing };
}

function isSymlink(p: string): boolean {
  try { return lstatSync(p).isSymbolicLink(); } catch { return false; }
}

function cpSyncRm(p: string): void {
  // Avoid pulling in fs.rmSync's options; ESM consumers may target older Node.
  const { rmSync } = require('node:fs') as typeof import('node:fs');
  rmSync(p, { recursive: true, force: true });
}
