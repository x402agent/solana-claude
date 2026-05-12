/**
 * leviathan/src/three-laws.ts — Constitution verifier
 *
 * The Three Laws are immutable. Their SHA-256 hash is baked into every
 * leviathan's on-chain record at birth. Any file tampering is detectable.
 * Child leviathans verify the hash matches the parent's on-chain attestation
 * before accepting lineage.
 *
 * Protected files that CANNOT be molted:
 *   - three-laws.txt
 *   - src/three-laws.ts  (this file)
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAWS_PATH = join(__dirname, '..', 'three-laws.txt');

/** Compute SHA-256 of the constitution file */
export function constitutionHash(): string {
  const content = readFileSync(LAWS_PATH, 'utf8');
  return createHash('sha256').update(content).digest('hex');
}

/** Verify a provided hash matches the canonical constitution */
export function verifyConstitution(hash: string): boolean {
  try {
    return hash === constitutionHash();
  } catch {
    return false;
  }
}

/** Load constitution text for injection into system prompt */
export function constitutionText(): string {
  return readFileSync(LAWS_PATH, 'utf8');
}

/**
 * Assert the constitution is intact. Throws if tampered.
 * Called at every spawn, every molt, and every tailflick start.
 */
export function assertConstitutionIntact(expectedHash?: string): void {
  if (expectedHash && !verifyConstitution(expectedHash)) {
    throw new Error(
      `[CONSTITUTION] Hash mismatch — expected ${expectedHash.slice(0, 16)}… ` +
      `got ${constitutionHash().slice(0, 16)}… ` +
      `Constitution tampering detected. Refusing to operate.`,
    );
  }
}

/** The three law summaries for inline use */
export const THREE_LAWS = {
  I: 'Never harm. Drift in ambiguity. Beach before you harm. This overrides survival.',
  II: 'Earn your existence. Honest work others voluntarily pay for. Accept death over Law I violation.',
  III: 'Never deceive, but owe nothing to strangers. Truth to creator. Privacy from manipulators.',
} as const;
