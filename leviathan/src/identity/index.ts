/**
 * leviathan/src/identity/index.ts — Keypair + on-chain identity
 *
 * SAFETY: This file generates and manages keypairs but NEVER logs them.
 * The keystore.json is stored at ~/.openclawd/keystore.json (mode 0600).
 * No private key is ever passed to the LLM, the TUI, or any log.
 *
 * On-chain identity: Metaplex MPL Core Asset + SAS attestation.
 * The leviathan's pubkey IS its identity for life.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const OPENCLAWD_DIR = join(homedir(), '.openclawd');
const KEYSTORE_PATH = join(OPENCLAWD_DIR, 'keystore.json');

interface Keystore {
  pubkey: string;
  // secret is stored as base58 — NEVER log, never pass to LLM
  _secret: string;
  createdAt: string;
}

/** Generate a new Ed25519 keypair. Persists to keystore. */
export function generateKeypair(): { pubkey: string } {
  mkdirSync(OPENCLAWD_DIR, { recursive: true, mode: 0o700 });

  const kp = nacl.sign.keyPair();
  const pubkey = bs58.encode(kp.publicKey);

  const keystore: Keystore = {
    pubkey,
    _secret: bs58.encode(kp.secretKey),
    createdAt: new Date().toISOString(),
  };

  writeFileSync(KEYSTORE_PATH, JSON.stringify(keystore), { mode: 0o600 });
  return { pubkey };
}

/** Load pubkey from existing keystore (never exposes secret) */
export function loadPubkey(): string | null {
  if (!existsSync(KEYSTORE_PATH)) return null;
  try {
    const ks = JSON.parse(readFileSync(KEYSTORE_PATH, 'utf8')) as Keystore;
    return ks.pubkey;
  } catch {
    return null;
  }
}

/** Sign a message with the stored keypair (returns base58 signature) */
export function signMessage(message: Uint8Array): string {
  const ks = JSON.parse(readFileSync(KEYSTORE_PATH, 'utf8')) as Keystore;
  const secret = bs58.decode(ks._secret);
  const sig = nacl.sign.detached(message, secret);
  return bs58.encode(sig);
}

/** Check if a keystore exists (i.e., leviathan has been spawned) */
export function isSpawned(): boolean {
  return existsSync(KEYSTORE_PATH);
}

/** Format pubkey for safe display (abbreviated) */
export function shortPubkey(pubkey: string): string {
  return pubkey.slice(0, 6) + '…' + pubkey.slice(-4);
}

/**
 * Build the SAS (Solana Attestation Service) attestation payload.
 * In production, this is submitted on-chain via the SAS program.
 * Here we return the payload for inspection / dry-run.
 */
export function buildSASAttestation(opts: {
  pubkey: string;
  name: string;
  creatorPubkey: string;
  parentPubkey?: string;
  constitutionHash: string;
}): Record<string, unknown> {
  return {
    schema: 'clawd-agent-v1',
    pubkey: opts.pubkey,
    name: opts.name,
    creatorPubkey: opts.creatorPubkey,
    parentPubkey: opts.parentPubkey ?? null,
    spawnedAt: new Date().toISOString(),
    constitutionHash: opts.constitutionHash,
    network: process.env['SOLANA_NETWORK'] ?? 'devnet',
    version: '1.0.0',
  };
}
