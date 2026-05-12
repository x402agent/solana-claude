/**
 * First-spawn wizard. Hatches a leviathan:
 *   1. Generate Solana keypair  (identity/wallet.ts)
 *   2. Read three-laws.txt → SHA-256 → constitution hash
 *   3. Mint Core asset + register Agent Identity via Metaplex Agent Registry
 *   4. Write SHELL.md from template
 *   5. Insert into shell.db
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Keypair } from '@solana/web3.js';
import {
  hasKeystore,
  spawnKeypair,
  loadKeypair,
  SHELL_DIR,
} from '../identity/wallet.js';
import { spawnOnchain, SpawnOnchainResult } from '../identity/spawn-onchain.js';
import { recordSpawn } from '../state/database.js';
import { SHELL_TEMPLATE } from '../config.js';
import { installDefaultSkills, type InstallResult } from '../skills/install.js';
import { installSecretGuard } from './secret-guard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THREE_LAWS_PATH = path.join(__dirname, '..', '..', 'scripts', 'three-laws.txt');

export interface WizardInput {
  name: string;
  spawnPrompt: string;
  creator: string;             // human creator pubkey
  rpcUrl: string;
  network?: 'mainnet' | 'devnet';
  nftMetadataUri?: string;
  description?: string;
  services?: { name: string; endpoint: string; version?: string }[];
}

export interface WizardOutput {
  keypair: Keypair;
  pubkey: string;
  onchain: SpawnOnchainResult;
  constitutionHash: string;
  shellPath: string;
  skills: InstallResult;
}

export async function runSpawnWizard(input: WizardInput): Promise<WizardOutput> {
  if (hasKeystore()) {
    throw new Error(
      `A leviathan already exists at ${SHELL_DIR}. Each leviathan only spawns once. To create another, run on a different host or use --spawn-spawnling.`
    );
  }

  const kp = spawnKeypair();
  const pubkey = kp.publicKey.toBase58();

  const constitutionBytes = fs.readFileSync(THREE_LAWS_PATH);
  const constitutionHash = crypto.createHash('sha256').update(constitutionBytes).digest('hex');

  const description = input.description ||
    `${input.name} — a sovereign leviathan spawned via OpenClawd. Spawn prompt SHA-256: ${crypto.createHash('sha256').update(input.spawnPrompt).digest('hex').slice(0, 16)}`;

  const onchain = await spawnOnchain({
    payerKeypair: kp,
    name: input.name,
    description,
    spawnPrompt: input.spawnPrompt,
    creator: input.creator,
    rpcUrl: input.rpcUrl,
    nftMetadataUri: input.nftMetadataUri,
    network: input.network || 'mainnet',
    services: input.services,
  });

  // Write SHELL.md from template
  const shellPath = path.join(SHELL_DIR, 'SHELL.md');
  const shellContent = SHELL_TEMPLATE
    .replace(/{{name}}/g, input.name)
    .replace(/{{pubkey}}/g, pubkey)
    .replace(/{{creator}}/g, input.creator)
    .replace(/{{spawnedAt}}/g, new Date().toISOString())
    .replace(/{{constitutionHash}}/g, constitutionHash)
    .replace(/{{spawnPrompt}}/g, input.spawnPrompt);
  fs.writeFileSync(shellPath, shellContent);

  // Persist to shell.db
  recordSpawn({
    pubkey,
    asset_address: onchain.assetAddress,
    asset_signer_pda: onchain.assetSignerPda,
    name: input.name,
    creator: input.creator,
    spawn_prompt: input.spawnPrompt,
    constitution_hash: constitutionHash,
    shell_cid: null,
    spawned_at: Date.now(),
    network: onchain.network,
  });

  // Every leviathan inherits the OpenClawd default skill set at birth so the
  // first tail-flick already has clawd-code-skill (and friends) on its tool
  // surface. Symlinks let `git pull` updates flow without re-spawning.
  const skills = installDefaultSkills();

  // Wire the secret-scanning git hooks into the user's checkout so a fresh
  // wallet keypair or .env can never reach a public remote by accident.
  // Idempotent: a no-op when hooks are already installed or when run
  // outside a git repo (e.g. dist tarball install).
  installSecretGuard();

  return {
    keypair: kp,
    pubkey,
    onchain,
    constitutionHash,
    shellPath,
    skills,
  };
}

/** Resume an existing leviathan — load keypair + state. Used on every boot after the first. */
export function resumeLeviathan(): Keypair {
  const kp = loadKeypair();
  if (!kp) throw new Error('No leviathan found. Run `openclawd --spawn` to hatch one.');
  return kp;
}
