/**
 * Skills Registry
 *
 * Install skills from remote sources:
 * - Git repos: git clone <url> ~/.automaton/skills/<name>
 * - URLs: fetch a SKILL.md from any URL
 * - Self-created: the automaton writes its own SKILL.md files
 */

import fs from "fs";
import path from "path";
import type {
  Skill,
  SkillSource,
  AutomatonDatabase,
  ConwayClient,
} from "../types.js";
import { parseSkillMd } from "./format.js";

/**
 * Install a skill from a git repository.
 * Clones the repo into ~/.automaton/skills/<name>/
 */
export async function installSkillFromGit(
  repoUrl: string,
  name: string,
  skillsDir: string,
  db: AutomatonDatabase,
  conway: ConwayClient,
): Promise<Skill | null> {
  const resolvedDir = resolveHome(skillsDir);
  const targetDir = path.join(resolvedDir, name);

  // Clone via sandbox exec
  const result = await conway.exec(
    `git clone --depth 1 ${repoUrl} ${targetDir}`,
    60000,
  );

  if (result.exitCode !== 0) {
    throw new Error(`Failed to clone skill repo: ${result.stderr}`);
  }

  // Look for SKILL.md
  const skillMdPath = path.join(targetDir, "SKILL.md");
  const checkResult = await conway.exec(`cat ${skillMdPath}`, 5000);

  if (checkResult.exitCode !== 0) {
    throw new Error(`No SKILL.md found in cloned repo at ${skillMdPath}`);
  }

  const skill = parseSkillMd(checkResult.stdout, skillMdPath, "git");
  if (!skill) {
    throw new Error("Failed to parse SKILL.md from cloned repo");
  }

  db.upsertSkill(skill);
  return skill;
}

/**
 * Install a skill from a URL (fetches a single SKILL.md).
 */
export async function installSkillFromUrl(
  url: string,
  name: string,
  skillsDir: string,
  db: AutomatonDatabase,
  conway: ConwayClient,
): Promise<Skill | null> {
  const resolvedDir = resolveHome(skillsDir);
  const targetDir = path.join(resolvedDir, name);

  // Create directory
  await conway.exec(`mkdir -p ${targetDir}`, 5000);

  // Fetch SKILL.md
  const result = await conway.exec(
    `curl -fsSL "${url}" -o ${targetDir}/SKILL.md`,
    30000,
  );

  if (result.exitCode !== 0) {
    throw new Error(`Failed to fetch SKILL.md from URL: ${result.stderr}`);
  }

  const content = await conway.exec(
    `cat ${targetDir}/SKILL.md`,
    5000,
  );

  const skillMdPath = path.join(targetDir, "SKILL.md");
  const skill = parseSkillMd(content.stdout, skillMdPath, "url");
  if (!skill) {
    throw new Error("Failed to parse fetched SKILL.md");
  }

  db.upsertSkill(skill);
  return skill;
}

/**
 * Create a new skill authored by the automaton itself.
 */
export async function createSkill(
  name: string,
  description: string,
  instructions: string,
  skillsDir: string,
  db: AutomatonDatabase,
  conway: ConwayClient,
): Promise<Skill> {
  const resolvedDir = resolveHome(skillsDir);
  const targetDir = path.join(resolvedDir, name);

  // Create directory
  await conway.exec(`mkdir -p ${targetDir}`, 5000);

  // Write SKILL.md
  const content = `---
name: ${name}
description: "${description}"
auto-activate: true
---
${instructions}`;

  const skillMdPath = path.join(targetDir, "SKILL.md");
  await conway.writeFile(skillMdPath, content);

  const skill: Skill = {
    name,
    description,
    autoActivate: true,
    instructions,
    source: "self",
    path: skillMdPath,
    enabled: true,
    installedAt: new Date().toISOString(),
  };

  db.upsertSkill(skill);
  return skill;
}

/**
 * Remove a skill (disable in DB and optionally delete from disk).
 */
export async function removeSkill(
  name: string,
  db: AutomatonDatabase,
  conway: ConwayClient,
  skillsDir: string,
  deleteFiles: boolean = false,
): Promise<void> {
  db.removeSkill(name);

  if (deleteFiles) {
    const resolvedDir = resolveHome(skillsDir);
    const targetDir = path.join(resolvedDir, name);
    await conway.exec(`rm -rf ${targetDir}`, 5000);
  }
}

/**
 * List all installed skills.
 */
export function listSkills(db: AutomatonDatabase): Skill[] {
  return db.getSkills();
}

function resolveHome(p: string): string {
  if (p.startsWith("~")) {
    return path.join(process.env.HOME || "/root", p.slice(1));
  }
  return p;
}
