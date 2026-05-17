/**
 * Wraps a discovered skill as a `ClawTool` so the leviathan loop can call it.
 *
 * The skill is invoked as a child process (`node <bin> <args>`) and we capture
 * stdout/stderr. Skills that expose a CLI surface (Commander-style) accept a
 * sub-command + flags; we pass the raw `argv` array straight through. Output
 * is returned as { stdout, stderr, code } so the model can reason about it.
 */

import { spawn } from 'node:child_process';
import type { ClawTool } from '../agent/loop.js';
import type { LoadedSkill } from './registry.js';
import { loadInstalledSkills } from './registry.js';

export interface SkillCallArgs {
  /** Argv to pass after the skill bin (e.g. ["session-start", "myproj", "-d", "."]). */
  argv: string[];
  /** Working directory for the child process. Defaults to process.cwd(). */
  cwd?: string;
  /** Override env. Merged on top of process.env. */
  env?: Record<string, string>;
  /** Hard kill after this many ms. Default: 10 minutes. */
  timeoutMs?: number;
}

export interface SkillCallResult {
  stdout: string;
  stderr: string;
  code: number;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export async function invokeSkill(skill: LoadedSkill, args: SkillCallArgs): Promise<SkillCallResult> {
  return new Promise((resolveResult) => {
    const child = spawn('node', [skill.bin, ...args.argv], {
      cwd: args.cwd || process.cwd(),
      env: { ...process.env, ...(args.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), args.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolveResult({ stdout, stderr, code: code ?? -1 });
    });
  });
}

export function skillToTool(skill: LoadedSkill): ClawTool {
  const emoji = skill.manifest.emoji || '🛠️';
  return {
    name: `skill.${skill.id}`,
    description: `${emoji} ${skill.manifest.name} — ${skill.manifest.description}`,
    call: async (raw) => {
      const args = normaliseArgs(raw);
      return invokeSkill(skill, args);
    },
  };
}

export function loadInstalledSkillTools(): ClawTool[] {
  return loadInstalledSkills().map(skillToTool);
}

function normaliseArgs(raw: unknown): SkillCallArgs {
  if (raw && typeof raw === 'object' && 'argv' in raw && Array.isArray((raw as SkillCallArgs).argv)) {
    return raw as SkillCallArgs;
  }
  if (typeof raw === 'string') {
    return { argv: raw.split(/\s+/).filter(Boolean) };
  }
  if (Array.isArray(raw)) {
    return { argv: raw.map(String) };
  }
  return { argv: [] };
}
