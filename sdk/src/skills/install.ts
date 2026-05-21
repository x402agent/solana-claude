/**
 * Wires the OpenClawd default skill set into a freshly-spawned leviathan.
 *
 * Called from setup/wizard.ts at birth. We symlink the bundled OpenClawd skill
 * pack into ~/.openclawd/skills/ so the loop's registry discovers it on the
 * first tail-flick. Symlinks let source installs pick up updates without
 * re-spawning; packaged installs fall back to the SDK-bundled snapshot.
 */

import { existsSync, mkdirSync, statSync, symlinkSync, cpSync, lstatSync, readlinkSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listDefaultSkills } from './registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_SKILLS_DIR = resolve(__dirname, '..', '..', '..', 'skills');
const SDK_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');

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
    const source = resolveSkillSource(id);
    const dest = join(dir, id);
    if (!source) {
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
  rmSync(p, { recursive: true, force: true });
}

function resolveSkillSource(id: string): string | null {
  const candidates = [join(REPO_SKILLS_DIR, id), join(SDK_SKILLS_DIR, id)];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isDirectory()) ?? null;
}
