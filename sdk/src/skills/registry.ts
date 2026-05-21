/**
 * Discovers OpenClawd skills on disk and exposes them to the leviathan loop.
 *
 * Search order (first match wins for a given skill name):
 *   1. $OPENCLAWD_SKILL_PATH (colon-separated, like $PATH)
 *   2. ~/.openclawd/skills/             — per-user installed skills
 *   3. <sdk>/skills/                    — SDK-bundled catalog + executable skills
 *   4. <repo>/skills/                   — workspace skills bundled in the monorepo
 *
 * A skill can be instruction-only (SKILL.md) or executable (SKILL.md plus a
 * package.json bin/main). Instruction-only skills become prompt/catalog context;
 * executable skills are also exposed as callable tools.
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
  /** Where the skill came from. */
  source: 'env' | 'user' | 'sdk' | 'repo';
  /** Absolute path to the executable entrypoint (CLI bin), if any. */
  bin?: string;
  /** Whether this skill can be invoked as a child-process tool. */
  executable: boolean;
  /** Skill metadata parsed from SKILL.md frontmatter. */
  manifest: SkillFrontmatter;
  /** Optional npm package metadata. */
  pkg?: SkillPackageJson;
}

interface SkillPackageJson {
  name?: string;
  version?: string;
  bin?: string | Record<string, string>;
  main?: string;
}

const USER_SKILLS_DIR = join(homedir(), '.openclawd', 'skills');
const SDK_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');
const REPO_SKILLS_DIR = resolve(__dirname, '..', '..', '..', 'skills');

const DEFAULT_SKILLS = [
  'magicblock',
  'imperial',
  'imperial-market-intel',
  'imperial-trade-execution',
  'oracle',
  'sherpa-onnx-tts',
  'skill-creator',
  'solana-clawd',
  'solana-clawd-agentic-commerce',
  'dflow-spot-trading',
  'dflow-phantom-connect',
  'phantom-wallet-mcp',
] as const;

export type DefaultSkillId = (typeof DEFAULT_SKILLS)[number];

export function listSearchPaths(): string[] {
  const env = process.env.OPENCLAWD_SKILL_PATH;
  const fromEnv = env ? env.split(':').filter(Boolean) : [];
  return [...fromEnv, USER_SKILLS_DIR, SDK_SKILLS_DIR, REPO_SKILLS_DIR]
    .filter((d, index, all) => all.indexOf(d) === index)
    .filter((d) => existsSync(d) && statSync(d).isDirectory());
}

export function loadInstalledSkills(): LoadedSkill[] {
  const out: LoadedSkill[] = [];
  const seen = new Set<string>();
  for (const root of listSearchPaths()) {
    for (const entry of readdirSync(root)) {
      if (seen.has(entry)) continue;
      const dir = join(root, entry);
      const skill = tryLoadSkill(entry, dir, sourceForRoot(root));
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
    const skill = tryLoadSkill(id, dir, sourceForRoot(root));
    if (skill) return skill;
  }
  return null;
}

export function listDefaultSkills(): readonly DefaultSkillId[] {
  return DEFAULT_SKILLS;
}

export function loadExecutableSkills(): LoadedSkill[] {
  return loadInstalledSkills().filter((skill) => skill.executable);
}

function tryLoadSkill(id: string, dir: string, source: LoadedSkill['source']): LoadedSkill | null {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return null;
  const skillMdPath = join(dir, 'SKILL.md');
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(skillMdPath)) return null;

  const manifest = parseSkillMd(skillMdPath);
  if (!manifest) return null;

  let pkg: SkillPackageJson | undefined;
  let bin: string | null = null;
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as SkillPackageJson;
      bin = resolveBin(dir, pkg);
    } catch {
      pkg = undefined;
    }
  }

  return { id, dir, source, bin: bin || undefined, executable: Boolean(bin), manifest, pkg };
}

function sourceForRoot(root: string): LoadedSkill['source'] {
  if (root === USER_SKILLS_DIR) return 'user';
  if (root === SDK_SKILLS_DIR) return 'sdk';
  if (root === REPO_SKILLS_DIR) return 'repo';
  return 'env';
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
