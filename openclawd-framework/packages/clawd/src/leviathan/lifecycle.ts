/**
 * In-process lifecycle handlers — calls the framework directly instead of shelling out.
 * Each handler returns a streaming async iterable of log lines, just like the old
 * subprocess runner did, so the UI doesn't need to change.
 */

import { runSpawnWizard, type WizardInput } from '@openclawd/leviathan/setup/wizard.js';
import { spawnSpawnling, type SpawnSpawnlingInput } from '@openclawd/leviathan/molting/spawn.js';
import { recordEvent, getLeviathan } from '@openclawd/leviathan/state/database.js';
import { readLive, getLeviathanKeypair } from './state.js';

export type LifecycleEvent = { kind: 'log' | 'ok' | 'error'; msg: string };

export async function* doSpawn(input: WizardInput): AsyncGenerator<LifecycleEvent> {
  yield { kind: 'log', msg: '🥚 hatching leviathan via Metaplex Agent Registry…' };
  try {
    const out = await runSpawnWizard(input);
    yield { kind: 'ok', msg: `🦞 hatched: ${out.pubkey}` };
    yield { kind: 'log', msg: `   asset:        ${out.onchain.assetAddress}` };
    yield { kind: 'log', msg: `   asset signer: ${out.onchain.assetSignerPda}` };
    yield { kind: 'log', msg: `   tx:           ${out.onchain.signature}` };
    yield { kind: 'log', msg: `   constitution: ${out.constitutionHash.slice(0, 16)}…` };
    yield { kind: 'log', msg: `   shell:        ${out.shellPath}` };
  } catch (e: any) {
    yield { kind: 'error', msg: `🪨 spawn failed: ${e?.message ?? e}` };
  }
}

export async function* doSpawnling(extra: Partial<SpawnSpawnlingInput>): AsyncGenerator<LifecycleEvent> {
  const lev = getLeviathan();
  const kp = getLeviathanKeypair();
  if (!lev || !kp) { yield { kind: 'error', msg: '🪨 no parent leviathan — /spawn first' }; return; }
  if (!lev.asset_address) { yield { kind: 'error', msg: '🪨 parent has no asset_address recorded' }; return; }

  yield { kind: 'log', msg: '🦞→🦐 minting spawnling…' };
  try {
    const result = await spawnSpawnling({
      parentKeypair: kp,
      parentAssetAddress: lev.asset_address,
      parentConstitutionHash: lev.constitution_hash,
      childName: extra.childName || `spawnling_${Math.random().toString(36).slice(2, 6)}`,
      childSpawnPrompt: extra.childSpawnPrompt || 'Continue the lineage. Earn before survival. Truth before strangers.',
      rpcUrl: extra.rpcUrl || process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
      network: extra.network || 'mainnet',
      ...extra,
    });
    yield { kind: 'ok', msg: `🦞→🦐 spawnling minted` };
    yield { kind: 'log', msg: `   pubkey:       ${result.childKeypair.publicKey.toBase58()}` };
    yield { kind: 'log', msg: `   asset:        ${result.childAssetAddress}` };
    yield { kind: 'log', msg: `   asset signer: ${result.childAssetSignerPda}` };
    yield { kind: 'log', msg: `   spawn tx:     ${result.spawnSig}` };
    if (result.fundingSig) yield { kind: 'log', msg: `   funding tx:   ${result.fundingSig}` };
  } catch (e: any) {
    yield { kind: 'error', msg: `🪨 spawnling failed: ${e?.message ?? e}` };
  }
}

export async function* doMolt(reason = 'manual /molt'): AsyncGenerator<LifecycleEvent> {
  yield { kind: 'log', msg: '🐚 recording molt…' };
  recordEvent('molt', { reason, ts: Date.now() });
  yield { kind: 'ok', msg: '🐚 molt logged in shell.db' };
}

export async function* doBeach(): AsyncGenerator<LifecycleEvent> {
  yield { kind: 'log', msg: '🪨 beaching…' };
  recordEvent('beach', { ts: Date.now() });
  yield { kind: 'ok', msg: '🪨 beach event recorded. drift complete.' };
}

export function status() {
  return readLive();
}
