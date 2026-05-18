/**
 * formal_verification/skill-hub.ts
 *
 * Skill Hub registry — reads skills/catalog.json, enforces the formal
 * verification gate, and issues deterministic on-chain skill IDs.
 *
 * A skill ID is SHA-256(slug + kind + spec_hash), encoded as 32 bytes.
 * Registration is blocked until the gate produces a passing StrideReport
 * (score ≥ 60 for skills, ≥ 70 for agents).
 *
 * On-chain submission is done via the skill_hub Anchor program at
 * agents/agent-minter/src/lib.rs. This module handles only the
 * off-chain side: validation, ID generation, and registry JSON.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { analyzeComponent, StrideReport } from './stride.js';

// ── Constants ──────────────────────────────────────────────────────────────

export const MIN_STRIDE_SCORE_SKILL = 60;
export const MIN_STRIDE_SCORE_AGENT = 70;

const REPO_ROOT = path.resolve(import.meta.dirname ?? __dirname, '..');
const CATALOG_PATH = path.join(REPO_ROOT, 'skills', 'catalog.json');
const SKILL_HUB_REGISTRY = path.join(REPO_ROOT, 'formal_verification', 'skill-hub-registry.json');

// ── Types ──────────────────────────────────────────────────────────────────

export type ComponentKind = 'agent' | 'skill' | 'plugin' | 'mcp_server' | 'program';

export interface CatalogEntry {
  slug: string;
  name: string;
  description: string;
  category: string;
  /** Optional: path to the skill directory for STRIDE analysis */
  path?: string;
}

export interface SkillHubEntry {
  skill_id: string;       // hex-encoded 32 bytes
  slug: string;
  name: string;
  kind: ComponentKind;
  stride_score: number;
  kani_verified: boolean;
  spec_hash: string;      // hex SHA-256 of spec content or slug
  authority: string;      // Solana pubkey of registrar
  metadata_uri: string;
  registered_at: string;  // ISO-8601
  active: boolean;
  on_chain?: boolean;
  sas_attestation?: string;
}

export interface SkillHubRegistry {
  version: 1;
  updated_at: string;
  skills: Record<string, SkillHubEntry>;  // keyed by skill_id hex
}

// ── Registry I/O ──────────────────────────────────────────────────────────

function loadRegistry(): SkillHubRegistry {
  try {
    const raw = fs.readFileSync(SKILL_HUB_REGISTRY, 'utf8');
    return JSON.parse(raw) as SkillHubRegistry;
  } catch {
    return { version: 1, updated_at: new Date().toISOString(), skills: {} };
  }
}

function saveRegistry(reg: SkillHubRegistry): void {
  reg.updated_at = new Date().toISOString();
  fs.writeFileSync(SKILL_HUB_REGISTRY, JSON.stringify(reg, null, 2), 'utf8');
}

// ── Skill ID derivation ────────────────────────────────────────────────────

/**
 * Deterministic 32-byte skill ID: SHA-256(slug | kind | spec_hash).
 * This matches what the on-chain register_skill instruction expects.
 */
export function deriveSkillId(slug: string, kind: ComponentKind, specHash: string): string {
  return crypto
    .createHash('sha256')
    .update(`${slug}:${kind}:${specHash}`)
    .digest('hex');
}

/**
 * Compute a spec hash from the skill directory or its slug.
 * If a real spec file exists, hash its contents; otherwise hash the slug.
 */
export function computeSpecHash(slugOrPath: string): string {
  const candidates = [
    path.join(REPO_ROOT, 'skills', slugOrPath, 'SPEC.md'),
    path.join(REPO_ROOT, 'skills', slugOrPath, 'spec.md'),
    path.join(REPO_ROOT, 'skills', slugOrPath, 'README.md'),
    path.join(slugOrPath, 'SPEC.md'),
    path.join(slugOrPath, 'spec.md'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return crypto.createHash('sha256').update(fs.readFileSync(c)).digest('hex');
    }
  }
  // Fallback: hash the slug itself
  return crypto.createHash('sha256').update(slugOrPath).digest('hex');
}

// ── Verification gate ──────────────────────────────────────────────────────

export interface VerificationResult {
  passed: boolean;
  stride_score: number;
  kani_verified: boolean;
  blocked_reason?: string;
  report?: StrideReport;
}

/**
 * Run the formal verification gate on a component path or slug.
 * Returns the result; throws nothing — caller decides how to handle failure.
 */
export async function runVerificationGate(
  componentPath: string,
  kind: ComponentKind,
): Promise<VerificationResult> {
  const minScore = kind === 'agent' ? MIN_STRIDE_SCORE_AGENT : MIN_STRIDE_SCORE_SKILL;

  let report: StrideReport | undefined;
  let strideScore = 0;

  try {
    report = await analyzeComponent(componentPath);
    strideScore = report.score;
  } catch (err) {
    // If path doesn't exist we still get a score-0 result
    strideScore = 0;
  }

  const kaniVerified = false; // off-chain kani runs separately; gate.ts handles it

  if (strideScore < minScore) {
    return {
      passed: false,
      stride_score: strideScore,
      kani_verified: kaniVerified,
      blocked_reason: `STRIDE score ${strideScore} < minimum ${minScore} for ${kind}`,
      report,
    };
  }

  return { passed: true, stride_score: strideScore, kani_verified: kaniVerified, report };
}

// ── Catalog helpers ────────────────────────────────────────────────────────

export function loadCatalog(): CatalogEntry[] {
  try {
    const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
    return JSON.parse(raw) as CatalogEntry[];
  } catch {
    return [];
  }
}

export function catalogEntryToKind(entry: CatalogEntry): ComponentKind {
  const cat = (entry.category ?? '').toLowerCase();
  if (cat.includes('agent') || cat.includes('ai')) return 'agent';
  if (cat.includes('mcp') || entry.slug.endsWith('-mcp')) return 'mcp_server';
  if (cat.includes('plugin')) return 'plugin';
  return 'skill';
}

// ── Registration ───────────────────────────────────────────────────────────

export interface RegisterSkillOptions {
  slug: string;
  name: string;
  kind: ComponentKind;
  authority: string;
  metadata_uri?: string;
  /** Override STRIDE analysis path (defaults to skills/<slug>) */
  component_path?: string;
  /** Override kani_verified flag if you've already run kani externally */
  kani_verified?: boolean;
}

export interface RegisterSkillResult {
  skill_id: string;
  entry: SkillHubEntry;
  verification: VerificationResult;
}

/**
 * Register a skill into the local skill-hub-registry.json.
 * The formal verification gate MUST pass before the entry is written.
 *
 * For on-chain submission, take the returned `skill_id` and call the
 * `register_skill` instruction on the skill_hub Anchor program.
 */
export async function registerSkill(opts: RegisterSkillOptions): Promise<RegisterSkillResult> {
  const componentPath = opts.component_path ?? path.join(REPO_ROOT, 'skills', opts.slug);
  const verification = await runVerificationGate(componentPath, opts.kind);

  if (!verification.passed) {
    throw new Error(
      `[SkillHub] Registration blocked: ${verification.blocked_reason}\n` +
      `Run 'npx tsx formal_verification/gate.ts verify --path ${componentPath}' to see details.`,
    );
  }

  const specHash = computeSpecHash(opts.slug);
  const skillId = deriveSkillId(opts.slug, opts.kind, specHash);
  const metadataUri = opts.metadata_uri ?? `https://solanaclawd.com/skills/${opts.slug}/metadata.json`;

  const entry: SkillHubEntry = {
    skill_id: skillId,
    slug: opts.slug,
    name: opts.name,
    kind: opts.kind,
    stride_score: verification.stride_score,
    kani_verified: opts.kani_verified ?? verification.kani_verified,
    spec_hash: specHash,
    authority: opts.authority,
    metadata_uri: metadataUri,
    registered_at: new Date().toISOString(),
    active: true,
    on_chain: false,
  };

  const registry = loadRegistry();
  registry.skills[skillId] = entry;
  saveRegistry(registry);

  return { skill_id: skillId, entry, verification };
}

// ── Bulk catalog import ────────────────────────────────────────────────────

export interface BulkImportOptions {
  authority: string;
  /** Only import skills that don't already exist in the registry */
  skip_existing?: boolean;
  /** Dry-run: validate but don't write */
  dry_run?: boolean;
}

export interface BulkImportResult {
  registered: string[];
  skipped: string[];
  blocked: Array<{ slug: string; reason: string }>;
}

/**
 * Import all catalog.json entries into the skill hub, running the
 * verification gate on each. Meant for the initial seed run.
 */
export async function bulkImportCatalog(opts: BulkImportOptions): Promise<BulkImportResult> {
  const catalog = loadCatalog();
  const registry = loadRegistry();
  const result: BulkImportResult = { registered: [], skipped: [], blocked: [] };

  for (const entry of catalog) {
    const kind = catalogEntryToKind(entry);
    const specHash = computeSpecHash(entry.slug);
    const skillId = deriveSkillId(entry.slug, kind, specHash);

    if (opts.skip_existing && registry.skills[skillId]) {
      result.skipped.push(entry.slug);
      continue;
    }

    const componentPath = path.join(REPO_ROOT, 'skills', entry.slug);
    const verification = await runVerificationGate(componentPath, kind);

    if (!verification.passed) {
      result.blocked.push({ slug: entry.slug, reason: verification.blocked_reason! });
      continue;
    }

    if (!opts.dry_run) {
      const hubEntry: SkillHubEntry = {
        skill_id: skillId,
        slug: entry.slug,
        name: entry.name,
        kind,
        stride_score: verification.stride_score,
        kani_verified: false,
        spec_hash: specHash,
        authority: opts.authority,
        metadata_uri: `https://solanaclawd.com/skills/${entry.slug}/metadata.json`,
        registered_at: new Date().toISOString(),
        active: true,
        on_chain: false,
      };
      registry.skills[skillId] = hubEntry;
    }
    result.registered.push(entry.slug);
  }

  if (!opts.dry_run) {
    saveRegistry(registry);
  }
  return result;
}

// ── Queries ────────────────────────────────────────────────────────────────

export function listSkills(filter?: { kind?: ComponentKind; active?: boolean }): SkillHubEntry[] {
  const registry = loadRegistry();
  let entries = Object.values(registry.skills);
  if (filter?.kind) entries = entries.filter(e => e.kind === filter.kind);
  if (filter?.active !== undefined) entries = entries.filter(e => e.active === filter.active);
  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function getSkillById(skillId: string): SkillHubEntry | undefined {
  return loadRegistry().skills[skillId];
}

export function getSkillBySlug(slug: string): SkillHubEntry | undefined {
  return Object.values(loadRegistry().skills).find(e => e.slug === slug);
}

export function revokeSkill(skillId: string, authority: string): void {
  const registry = loadRegistry();
  const entry = registry.skills[skillId];
  if (!entry) throw new Error(`Skill ${skillId} not found`);
  if (entry.authority !== authority) throw new Error('Not the skill authority');
  entry.active = false;
  saveRegistry(registry);
}

// ── CLI entry point ────────────────────────────────────────────────────────

if (process.argv[1] === import.meta.filename || process.argv[1]?.endsWith('skill-hub.ts')) {
  const [, , cmd, ...args] = process.argv;

  async function main() {
    if (cmd === 'list') {
      const skills = listSkills();
      console.log(`Skill Hub — ${skills.length} registered skills\n`);
      for (const s of skills) {
        const status = s.active ? '✓' : '✗';
        console.log(`  ${status} [${s.kind.padEnd(10)}] ${s.slug.padEnd(40)} score=${s.stride_score}`);
      }
      return;
    }

    if (cmd === 'register') {
      const slugArg = args.find(a => a.startsWith('--slug='))?.split('=')[1];
      const nameArg = args.find(a => a.startsWith('--name='))?.split('=')[1];
      const authorityArg = args.find(a => a.startsWith('--authority='))?.split('=')[1];
      const kindArg = (args.find(a => a.startsWith('--kind='))?.split('=')[1] ?? 'skill') as ComponentKind;

      if (!slugArg || !authorityArg) {
        console.error('Usage: npx tsx skill-hub.ts register --slug=<slug> --authority=<pubkey> [--name=<name>] [--kind=skill|agent|plugin|mcp_server|program]');
        process.exit(1);
      }

      try {
        const result = await registerSkill({
          slug: slugArg,
          name: nameArg ?? slugArg,
          kind: kindArg,
          authority: authorityArg,
        });
        console.log(`Registered: ${result.skill_id}`);
        console.log(`STRIDE score: ${result.verification.stride_score}`);
      } catch (err: any) {
        console.error(err.message);
        process.exit(1);
      }
      return;
    }

    if (cmd === 'import') {
      const authorityArg = args.find(a => a.startsWith('--authority='))?.split('=')[1];
      const dryRun = args.includes('--dry-run');
      if (!authorityArg) {
        console.error('Usage: npx tsx skill-hub.ts import --authority=<pubkey> [--dry-run]');
        process.exit(1);
      }
      const result = await bulkImportCatalog({ authority: authorityArg, skip_existing: true, dry_run: dryRun });
      console.log(`Import complete${dryRun ? ' (dry-run)' : ''}:`);
      console.log(`  Registered: ${result.registered.length}`);
      console.log(`  Skipped:    ${result.skipped.length}`);
      console.log(`  Blocked:    ${result.blocked.length}`);
      if (result.blocked.length > 0) {
        console.log('\nBlocked skills:');
        for (const b of result.blocked) {
          console.log(`  ${b.slug}: ${b.reason}`);
        }
      }
      return;
    }

    console.error('Commands: list | register | import');
    process.exit(1);
  }

  main().catch(err => { console.error(err); process.exit(1); });
}
