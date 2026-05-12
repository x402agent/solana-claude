/**
 * Discovers OpenClawd skills on disk and exposes them to the leviathan loop.
 *
 * Search order (first match wins for a given skill name):
 *   1. $OPENCLAWD_SKILL_PATH (colon-separated, like $PATH)
 *   2. ~/.openclawd/skills/             — per-user installed skills
 *   3. <repo>/skills/                   — workspace skills bundled in the monorepo
 *
 * A "skill" is any directory that contains a SKILL.md and a `package.json`
 * with a `bin` entry. We honour the `dist/` build output if present.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSkillMd, type SkillFrontmatter } from './skill-md-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface LoadedSkill {
  /** Stable identifier — derived from the directory name. */
  id: string;
  /** Absolute path to the skill directory. */
  dir: string;
  /** Absolute path to the executable entrypoint (CLI bin). */
  bin: string;
  /** Skill metadata parsed from SKILL.md frontmatter. */
  manifest: SkillFrontmatter;
  /** Optional npm package metadata. */
  pkg: SkillPackageJson;
}

interface SkillPackageJson {
  name?: string;
  version?: string;
  bin?: string | Record<string, string>;
  main?: string;
}

const DEFAULT_SEARCH_DIRS = [
  join(homedir(), '.openclawd', 'skills'),
  resolve(__dirname, '..', '..', '..', 'skills'),
];

const DEFAULT_SKILLS = ['openclawd-code-skill', 'openclawd-clawd-code-skill-main'] as const;

export type DefaultSkillId = (typeof DEFAULT_SKILLS)[number];

export function listSearchPaths(): string[] {
  const env = process.env.OPENCLAWD_SKILL_PATH;
  const fromEnv = env ? env.split(':').filter(Boolean) : [];
  return [...fromEnv, ...DEFAULT_SEARCH_DIRS].filter((d) => existsSync(d) && statSync(d).isDirectory());
}

export function loadInstalledSkills(): LoadedSkill[] {
  const out: LoadedSkill[] = [];
  const seen = new Set<string>();
  for (const root of listSearchPaths()) {
    for (const entry of readdirSync(root)) {
      if (seen.has(entry)) continue;
      const dir = join(root, entry);
      const skill = tryLoadSkill(entry, dir);
      if (skill) {
        out.push(skill);
        seen.add(entry);
      }
    }
  }
  return out;
}

export function loadSkill(id: string): LoadedSkill | null {
  for (const root of listSearchPaths()) {
    const dir = join(root, id);
    const skill = tryLoadSkill(id, dir);
    if (skill) return skill;
  }
  return null;
}

export function listDefaultSkills(): readonly DefaultSkillId[] {
  return DEFAULT_SKILLS;
}

function tryLoadSkill(id: string, dir: string): LoadedSkill | null {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
  const skillMdPath = join(dir, 'SKILL.md');
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(skillMdPath) || !existsSync(pkgPath)) return null;

  const manifest = parseSkillMd(skillMdPath);
  if (!manifest) return null;

  let pkg: SkillPackageJson = {};
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as SkillPackageJson;
  } catch {
    return null;
  }

  const bin = resolveBin(dir, pkg);
  if (!bin) return null;

  return { id, dir, bin, manifest, pkg };
}

function resolveBin(dir: string, pkg: SkillPackageJson): string | null {
  let rel: string | undefined;
  if (typeof pkg.bin === 'string') rel = pkg.bin;
  else if (pkg.bin && typeof pkg.bin === 'object') {
    const first = Object.values(pkg.bin)[0];
    if (typeof first === 'string') rel = first;
  } else if (pkg.main) {
    rel = pkg.main;
  }
  if (!rel) return null;
  const abs = resolve(dir, rel);
  return existsSync(abs) ? abs : null;
}
