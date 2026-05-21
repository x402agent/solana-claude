/**
 * Local Skill Hub catalog access for SDK consumers.
 *
 * The SDK ships a static snapshot under sdk/skills and also understands the
 * monorepo-level skills catalog when running from source. Network calls are
 * opt-in; public x402.wtf endpoints are exposed as URLs only.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPENCLAWD_PUBLIC_ENDPOINTS } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CATALOG_CANDIDATES = [
  resolve(__dirname, '..', '..', 'skills', 'catalog.json'),
  resolve(__dirname, '..', '..', '..', 'skills', 'catalog.json'),
];

const INDEX_CANDIDATES = [
  resolve(__dirname, '..', '..', 'skills', 'index.json'),
  resolve(__dirname, '..', '..', '..', 'skills', 'index.json'),
];

export interface SkillCatalogEntry {
  slug: string;
  name: string;
  description: string;
  category: string;
  version?: string;
  emoji?: string;
}

export interface SkillHubEntry {
  skillId: string;
  name: string;
  description: string;
  category: string;
  path: string;
  url: string;
  homepage: string;
  tags: string[];
  requiredEnv: string[];
  attestation?: {
    status: string;
    isFormallyVerified: boolean;
    attestationPda: string | null;
    verificationTimestamp: string | null;
  };
}

export interface SkillHubManifest {
  $schema: string;
  apiVersion: string;
  generatedAt: string;
  hub: Record<string, unknown>;
  stats: {
    totalSkills: number;
    verifiedSkills: number;
    pendingVerification: number;
    byCategory: Record<string, number>;
  };
  skills: SkillHubEntry[];
}

export interface SkillGatewayManifest {
  endpoints: ReturnType<typeof getSkillHubEndpoints>;
  localCatalog: SkillCatalogEntry[];
  localHub: SkillHubManifest | null;
  route: 'local-first';
  privacy: {
    networkCalls: 'opt-in';
    secrets: 'never-included';
  };
}

export function getSkillHubEndpoints() {
  return {
    gallery: OPENCLAWD_PUBLIC_ENDPOINTS.skillGallery,
    api: OPENCLAWD_PUBLIC_ENDPOINTS.skillApi,
    catalog: OPENCLAWD_PUBLIC_ENDPOINTS.skillCatalog,
    x402: OPENCLAWD_PUBLIC_ENDPOINTS.x402,
  } as const;
}

export function loadLocalSkillCatalog(): SkillCatalogEntry[] {
  return readFirstJson<SkillCatalogEntry[]>(CATALOG_CANDIDATES) ?? [];
}

export function loadLocalSkillHubManifest(): SkillHubManifest | null {
  return readFirstJson<SkillHubManifest>(INDEX_CANDIDATES);
}

export function buildSkillGatewayManifest(): SkillGatewayManifest {
  return {
    endpoints: getSkillHubEndpoints(),
    localCatalog: loadLocalSkillCatalog(),
    localHub: loadLocalSkillHubManifest(),
    route: 'local-first',
    privacy: {
      networkCalls: 'opt-in',
      secrets: 'never-included',
    },
  };
}

export function findLocalSkill(slug: string): SkillCatalogEntry | null {
  return loadLocalSkillCatalog().find((entry) => entry.slug === slug) ?? null;
}

export function listLocalSkillsByCategory(category: string): SkillCatalogEntry[] {
  return loadLocalSkillCatalog().filter((entry) => entry.category === category);
}

export async function fetchPublicSkillCatalog(fetchFn: typeof fetch = fetch): Promise<SkillCatalogEntry[]> {
  const response = await fetchFn(OPENCLAWD_PUBLIC_ENDPOINTS.skillCatalog);
  if (!response.ok) {
    throw new Error(`Failed to fetch public skill catalog: HTTP ${response.status}`);
  }
  const body = await response.json() as SkillCatalogEntry[] | { skills?: SkillCatalogEntry[] };
  return Array.isArray(body) ? body : body.skills ?? [];
}

function readFirstJson<T>(candidates: string[]): T | null {
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      return JSON.parse(readFileSync(candidate, 'utf8')) as T;
    } catch {
      return null;
    }
  }
  return null;
}
