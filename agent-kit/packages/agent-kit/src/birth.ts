// birth.ts — the "name your clawd at birth" wizard.
//
// Writes an identity record to $OPENCLAWD_HOME/.clawd/identity.json so every
// later CLI ("clawd", "clawd-perps", "clawd-agent", etc.) can read the same
// name, avatar, and birth metadata. Idempotent: re-running --auto keeps the
// existing identity unless --rename or --force is passed.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, env, hrtime } from "node:process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import {
  ansi,
  clawdBanner,
  convergence,
  drawBox,
  oreBoardDance,
  paint,
  progressBar,
  pulse,
  sleep,
  spinner,
  typewriter,
  writeln,
} from "./animate.js";

export interface ClawdIdentity {
  name: string;
  avatar: string;
  pronoun: "he" | "she" | "they" | "it";
  bornAt: string;
  bornEpochMs: number;
  generation: number;
  shellColor: string;
  motherTongue: string;
  workspace: string;
  installedAgents: string[];
  autoMine: boolean;
  perpsEnabled: boolean;
  notes?: string;
}

const DEFAULT_AVATAR_POOL = ["🦞", "🦀", "🐙", "🪸", "🌊", "🔱", "⚓"];
const ADJECTIVES = [
  "Sovereign",
  "Crimson",
  "Onyx",
  "Tidal",
  "Phantom",
  "Solar",
  "Nebular",
  "Photon",
  "Hadal",
  "Verdant",
];
const NOUNS = [
  "Crustacean",
  "Pincer",
  "Currents",
  "Reef",
  "Mariner",
  "Sentinel",
  "Lobster",
  "Cipher",
  "Tide",
  "Vault",
];

export function workspaceDir(): string {
  return resolve(env.OPENCLAWD_HOME ?? join(homedir(), ".openclawdsolana"));
}

export function identityPath(): string {
  return join(workspaceDir(), ".clawd", "identity.json");
}

export function readIdentity(): ClawdIdentity | undefined {
  const path = identityPath();
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ClawdIdentity;
  } catch {
    return undefined;
  }
}

export function writeIdentity(identity: ClawdIdentity): string {
  const path = identityPath();
  mkdirSync(join(workspaceDir(), ".clawd"), { recursive: true });
  writeFileSync(path, `${JSON.stringify(identity, null, 2)}\n`, "utf8");
  return path;
}

function randomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] ?? "Clawd";
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)] ?? "Lobster";
  return `${adj} ${noun}`;
}

function randomAvatar(): string {
  return DEFAULT_AVATAR_POOL[Math.floor(Math.random() * DEFAULT_AVATAR_POOL.length)] ?? "🦞";
}

function generationFromHrTime(): number {
  const [s, ns] = hrtime();
  return Number(((BigInt(s) * 1_000_000_000n + BigInt(ns)) % 9999n)) + 1;
}

export interface BirthOptions {
  name?: string;
  avatar?: string;
  pronoun?: ClawdIdentity["pronoun"];
  shellColor?: string;
  auto?: boolean;
  rename?: boolean;
  installAgents?: string[];
  autoMine?: boolean;
  perpsEnabled?: boolean;
}

async function askLine(prompt: string, fallback: string): Promise<string> {
  if (!stdin.isTTY) return fallback;
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`  ${paint("cyan", "?")} ${prompt} ${paint("gray", `[${fallback}]`)} `);
    return answer.trim() || fallback;
  } finally {
    rl.close();
  }
}

export async function birthClawd(options: BirthOptions): Promise<ClawdIdentity> {
  const existing = readIdentity();
  if (existing && !options.rename && options.auto) {
    writeln(
      `  ${paint("green", "✓")} ${paint("bold", existing.name)} is already alive (generation ${existing.generation}) — keeping existing identity.`,
    );
    return existing;
  }

  await clawdBanner();
  writeln("");
  await typewriter("  A new Clawd is hatching.", { color: "cyan", delayMs: 22 });
  await typewriter("  Pick a name — this name follows the shell for life.", { color: "gray", delayMs: 14 });
  writeln("");

  const suggested = options.name ?? existing?.name ?? randomName();
  const name = options.auto && !options.rename
    ? suggested
    : await askLine("Name your Clawd", suggested);

  const avatar = options.avatar ?? existing?.avatar ?? randomAvatar();
  const pronoun: ClawdIdentity["pronoun"] = options.pronoun ?? existing?.pronoun ?? "they";
  const shellColor = options.shellColor ?? existing?.shellColor ?? "carapace-crimson";

  const sp = spinner("imprinting carapace…");
  await sleep(420);
  sp.update("registering on Solana-native runtime…");
  await sleep(380);
  sp.update("entangling Clawd Loop OODA…");
  await sleep(340);
  sp.stop(`Clawd identity sealed: ${paint("bold", name)} ${avatar}`);

  await progressBar("hatching sequence complete", [
    { label: "seeding identity bytes", ms: 180 },
    { label: "writing wallet stub", ms: 180 },
    { label: "linking agent-kit catalog", ms: 180 },
    { label: "binding to /agents folder", ms: 180 },
    { label: "stamping birth certificate", ms: 220 },
  ]);

  const identity: ClawdIdentity = {
    name,
    avatar,
    pronoun,
    bornAt: new Date().toISOString(),
    bornEpochMs: Date.now(),
    generation: existing?.generation ?? generationFromHrTime(),
    shellColor,
    motherTongue: env.LANG?.split(".")[0] ?? "en_US",
    workspace: workspaceDir(),
    installedAgents: existing?.installedAgents ?? [],
    autoMine: options.autoMine ?? existing?.autoMine ?? false,
    perpsEnabled: options.perpsEnabled ?? existing?.perpsEnabled ?? false,
  };

  const path = writeIdentity(identity);

  drawBox(`birth certificate — ${name}`, [
    `${paint("gray", "name      :")} ${paint("bold", name)} ${avatar}`,
    `${paint("gray", "generation:")} ${paint("cyan", String(identity.generation))}`,
    `${paint("gray", "born      :")} ${identity.bornAt}`,
    `${paint("gray", "shell     :")} ${paint("purple", shellColor)}`,
    `${paint("gray", "workspace :")} ${identity.workspace}`,
    `${paint("gray", "saved to  :")} ${path}`,
  ]);

  await pulse(`${name} is breathing`, 3);
  await oreBoardDance(1500);
  await convergence();

  return identity;
}

export function updateIdentity(patch: Partial<ClawdIdentity>): ClawdIdentity | undefined {
  const existing = readIdentity();
  if (!existing) return undefined;
  const next: ClawdIdentity = { ...existing, ...patch };
  writeIdentity(next);
  return next;
}

export function ensureWorkspace(): void {
  mkdirSync(join(workspaceDir(), ".clawd"), { recursive: true });
}
