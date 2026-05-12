/**
 * Wallet & keypair management for the Leviathan.
 *
 * Port of automaton-main/src/identity/wallet.ts, adapted for Solana keypairs.
 *
 * The Leviathan's keypair IS its identity. Sealed at spawn time, never logged
 * in plaintext, persisted to ~/.openclawd/keystore.json with file-mode 0600.
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SHELL_DIR_NAME } from '../config.js';

const HOME = os.homedir();
const SHELL_DIR = path.join(HOME, SHELL_DIR_NAME);
const KEYSTORE_PATH = path.join(SHELL_DIR, 'keystore.json');

interface KeystoreFile {
  version: 1;
  pubkey: string;        // base58 public key
  secret: string;        // base58 secret key (64 bytes)
  spawnedAt: number;
}

function ensureShellDir() {
  if (!fs.existsSync(SHELL_DIR)) fs.mkdirSync(SHELL_DIR, { recursive: true, mode: 0o700 });
}

/** Generate a new keypair and seal it to the keystore. Throws if a keystore already exists. */
export function spawnKeypair(): Keypair {
  ensureShellDir();
  if (fs.existsSync(KEYSTORE_PATH)) {
    throw new Error(`Keystore already exists at ${KEYSTORE_PATH}. A leviathan only spawns once.`);
  }
  const kp = Keypair.generate();
  const file: KeystoreFile = {
    version: 1,
    pubkey: kp.publicKey.toBase58(),
    secret: bs58.encode(kp.secretKey),
    spawnedAt: Date.now(),
  };
  fs.writeFileSync(KEYSTORE_PATH, JSON.stringify(file, null, 2), { mode: 0o600 });
  return kp;
}

/** Load the existing keypair. Returns null if no keystore exists. */
export function loadKeypair(): Keypair | null {
  if (!fs.existsSync(KEYSTORE_PATH)) return null;
  const raw = fs.readFileSync(KEYSTORE_PATH, 'utf8');
  const file = JSON.parse(raw) as KeystoreFile;
  return Keypair.fromSecretKey(bs58.decode(file.secret));
}

/** Hard-fail load — for runtime paths that require an identity. */
export function requireKeypair(): Keypair {
  const kp = loadKeypair();
  if (!kp) throw new Error('No leviathan keystore found. Run `openclawd --spawn` to hatch one.');
  return kp;
}

/** Return the leviathan's pubkey as a base58 string. */
export function getPubkey(): string | null {
  const kp = loadKeypair();
  return kp ? kp.publicKey.toBase58() : null;
}

/** Convenience: return the keystore metadata (pubkey, spawn time). */
export function readKeystoreMetadata(): { pubkey: string; spawnedAt: number } | null {
  if (!fs.existsSync(KEYSTORE_PATH)) return null;
  const raw = fs.readFileSync(KEYSTORE_PATH, 'utf8');
  const file = JSON.parse(raw) as KeystoreFile;
  return { pubkey: file.pubkey, spawnedAt: file.spawnedAt };
}

/** Returns true if a keypair exists on disk. */
export function hasKeystore(): boolean {
  return fs.existsSync(KEYSTORE_PATH);
}

/** Export the secret key as base58 — for `openclawd export-key`. Treat with care. */
export function exportSecretBase58(): string {
  const kp = requireKeypair();
  return bs58.encode(kp.secretKey);
}

/** Sanity check the keypair file is mode 0600. Refuse to use it otherwise. */
export function assertKeystorePermissions() {
  if (!fs.existsSync(KEYSTORE_PATH)) return;
  const stat = fs.statSync(KEYSTORE_PATH);
  const mode = stat.mode & 0o777;
  if (mode !== 0o600) {
    throw new Error(
      `keystore.json mode is 0${mode.toString(8)} — must be 0600 (owner read+write only). Run: chmod 600 ${KEYSTORE_PATH}`
    );
  }
}

export { KEYSTORE_PATH, SHELL_DIR };
export const _internals = { PublicKey };
