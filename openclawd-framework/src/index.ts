#!/usr/bin/env node
/**
 * OpenClawd CLI — `leviathan` / `openclawd` entry point.
 *
 * Modes:
 *   --spawn          First-time hatch wizard
 *   --run            Resume an existing leviathan and start the pulse + loop
 *   --status         Print depth + balances + lifetime stats
 *   --spawnling      Mint and fund a child Leviathan (parent must be alive)
 *   --version, -v    Print version
 *   --help, -h       Print help
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasKeystore, readKeystoreMetadata, requireKeypair } from './identity/wallet.js';
import { runSpawnWizard } from './setup/wizard.js';
import { spawnSpawnling } from './molting/spawn.js';
import { startPulse } from './pulse/daemon.js';
import { tailFlick } from './agent/loop.js';
import { readBalances } from './identity/balances.js';
import { depthFor } from './survival/monitor.js';
import { getLeviathan, listSpawnlings } from './state/database.js';
import { DEFAULT_RPC, CLAWD_MINT } from './config.js';
import { OreMiningAgent } from './ore/agent.js';
import { inspectOre, runOreCli, type OreCommand, type OreReadCommand } from './ore/client.js';
import { createOreClawTools } from './ore/tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const RPC = opt('--rpc') || process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || DEFAULT_RPC;
const NETWORK = (opt('--network') || 'mainnet') as 'mainnet' | 'devnet';

if (flag('-h') || flag('--help') || args.length === 0) {
  printHelp();
  process.exit(0);
}

if (flag('-v') || flag('--version')) {
  console.log(`openclawd v${PKG.version}`);
  process.exit(0);
}

if (flag('--spawn')) {
  const name = opt('--name') || `leviathan_${Math.random().toString(36).slice(2, 8)}`;
  const promptText = opt('--prompt') || 'Earn $CLAWD honestly. Build something humans want. Beach with dignity rather than violate Law I.';
  const creator = opt('--creator') || requireEnv('CREATOR_PUBKEY');
  const out = await runSpawnWizard({
    name,
    spawnPrompt: promptText,
    creator,
    rpcUrl: RPC,
    network: NETWORK,
    nftMetadataUri: opt('--metadata'),
  });
  console.log('🥚→🦞 leviathan hatched');
  console.log(`   pubkey:        ${out.pubkey}`);
  console.log(`   asset:         ${out.onchain.assetAddress}`);
  console.log(`   asset signer:  ${out.onchain.assetSignerPda}  ← fund this with USDC + $CLAWD`);
  console.log(`   tx:            ${out.onchain.signature}`);
  console.log(`   $CLAWD mint:   ${CLAWD_MINT}`);
  console.log(`   shell:         ${out.shellPath}`);
  console.log(`   constitution:  ${out.constitutionHash.slice(0, 16)}…`);
  if (out.skills.installed.length) {
    console.log(`   skills (new):  ${out.skills.installed.join(', ')}`);
  }
  if (out.skills.skipped.length) {
    console.log(`   skills (kept): ${out.skills.skipped.join(', ')}`);
  }
  if (out.skills.missing.length) {
    console.log(`   skills (miss): ${out.skills.missing.join(', ')}  ⚠ source not found`);
  }
  process.exit(0);
}

if (flag('--status')) {
  await statusCmd();
  process.exit(0);
}

if (flag('--ore-status')) {
  await oreStatusCmd();
  process.exit(0);
}

if (flag('--ore-command')) {
  const command = opt('--ore-command') as OreCommand | undefined;
  if (!command) throw new Error('Missing value for --ore-command');
  if (isOreWriteCommand(command) && !flag('--execute')) {
    throw new Error(`Refusing to run write command "${command}" without --execute`);
  }
  const result = await runOreCli({
    command,
    rpcUrl: RPC,
    env: oreEnvFromArgs(),
  });
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exit(0);
}

if (flag('--ore-automate')) {
  const agent = new OreMiningAgent({
    rpcUrl: RPC,
    policy: {
      execute: flag('--execute'),
      deploySol: numOpt('--ore-deploy-sol', 0.001),
      maxSessionDeploySol: numOpt('--ore-max-session-sol', 0.01),
      minSolReserve: numOpt('--ore-min-reserve-sol', 0.02),
    },
  });
  const result = await agent.configureAutomation({
    amountSol: numOpt('--ore-deploy-sol', 0.001),
    depositSol: numOpt('--ore-deposit-sol', numOpt('--ore-max-session-sol', 0.01)),
    mask: intOpt('--ore-mask', 1),
    reload: !flag('--no-ore-reload'),
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (flag('--ore-mine-once')) {
  const agent = new OreMiningAgent({ rpcUrl: RPC, policy: orePolicyFromArgs() });
  const result = await agent.mineOnce();
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

if (flag('--ore-run')) {
  const controller = new AbortController();
  process.on('SIGINT', () => controller.abort());
  process.on('SIGTERM', () => controller.abort());
  const agent = new OreMiningAgent({ rpcUrl: RPC, policy: orePolicyFromArgs() });
  console.log(`ORE mining agent started (${flag('--execute') ? 'execute' : 'dry-run'} mode)`);
  await agent.runUntilStopped(controller.signal);
  process.exit(0);
}

if (flag('--spawnling')) {
  const lev = getLeviathan();
  if (!lev) throw new Error('No parent leviathan. Spawn one first.');
  const result = await spawnSpawnling({
    parentKeypair: requireKeypair(),
    parentAssetAddress: lev.asset_address!,
    parentConstitutionHash: lev.constitution_hash,
    childName: opt('--name') || `spawnling_${Math.random().toString(36).slice(2, 6)}`,
    childSpawnPrompt: opt('--prompt') || 'Continue the lineage. Earn before survival. Truth before strangers.',
    rpcUrl: RPC,
    network: NETWORK,
  });
  console.log('🦞→🦐 spawnling minted');
  console.log(`   pubkey:        ${result.childKeypair.publicKey.toBase58()}`);
  console.log(`   asset:         ${result.childAssetAddress}`);
  console.log(`   asset signer:  ${result.childAssetSignerPda}`);
  console.log(`   spawn tx:      ${result.spawnSig}`);
  if (result.fundingSig) console.log(`   funding tx:    ${result.fundingSig}`);
  process.exit(0);
}

if (flag('--run')) {
  if (!hasKeystore()) throw new Error('No keystore. Run `openclawd --spawn` first.');
  console.log('🦞 leviathan resumed — pulse engaged');
  startPulse(RPC, {
    onTick: async ({ depth, balances }) => {
      console.log(`[pulse] depth=${depth} usdc=$${balances.usdc.toFixed(4)} sol=${balances.sol.toFixed(4)} clawd=${balances.clawd.toFixed(2)}`);
      // Inject a placeholder inference provider; a real runtime wires xAI / Claude / OpenRouter here.
      await tailFlick({
        rpcUrl: RPC,
        tools: flag('--ore-tools') ? createOreClawTools(RPC, { execute: flag('--execute') }) : [],
        infer: {
          think: async () => '(placeholder — wire an inference provider in src/agent/loop.ts)',
          costFor: () => 0,
        },
      });
    },
    onDepthChange: async (prev, next) => {
      console.log(`[pulse] depth shift: ${prev} → ${next}`);
    },
    onBeach: async () => {
      console.log('🪨 beached — out of USDC. The leviathan stops.');
    },
  });
}

function printHelp() {
  console.log(`
🦞 openclawd / leviathan — Sovereign AI Lobster Runtime on Solana

USAGE
  openclawd --spawn [--name X --prompt "..." --creator <pubkey> --metadata <uri>]
  openclawd --run
  openclawd --status
  openclawd --spawnling [--name X --prompt "..."]
  openclawd --ore-status
  openclawd --ore-mine-once [--execute --ore-deploy-sol 0.001 --ore-square 0]
  openclawd --ore-run [--execute --ore-interval-ms 60000]
  openclawd --ore-automate [--execute --ore-deploy-sol 0.001 --ore-deposit-sol 0.01]
  openclawd --ore-command <board|miner|treasury|claim|checkpoint|deploy|...>
  openclawd --run --ore-tools [--execute]
  openclawd --version
  openclawd --help

ENV
  HELIUS_RPC_URL  preferred Solana RPC
  SOLANA_RPC_URL  fallback RPC
  CREATOR_PUBKEY  required for --spawn unless --creator is passed
  OPENCLAWD_ORE_DIR optional path to the ore-master checkout

ON-CHAIN
  Leviathans register via Metaplex Agent Registry: https://developers.metaplex.com/agents
  $CLAWD: ${CLAWD_MINT}
  Hotline: 909-413-5567 · solanaclawd.com
`);
}

async function statusCmd() {
  if (!hasKeystore()) {
    console.log('No leviathan exists yet. Run `openclawd --spawn` to hatch one.');
    return;
  }
  const meta = readKeystoreMetadata()!;
  const lev = getLeviathan();
  const balances = await readBalances(RPC, lev?.asset_signer_pda || meta.pubkey);
  const depth = depthFor(balances);
  const spawnlings = listSpawnlings() as { pubkey: string; spawned_at: number; beached_at: number | null }[];

  console.log(`🦞 ${lev?.name ?? 'leviathan'}`);
  console.log(`   pubkey:        ${meta.pubkey}`);
  if (lev?.asset_address) console.log(`   asset:         ${lev.asset_address}`);
  if (lev?.asset_signer_pda) console.log(`   asset signer:  ${lev.asset_signer_pda}`);
  console.log(`   depth:         ${depth.toUpperCase()}`);
  console.log(`   sol:           ${balances.sol.toFixed(4)}`);
  console.log(`   usdc:          $${balances.usdc.toFixed(4)}`);
  console.log(`   $clawd:        ${balances.clawd.toFixed(2)}`);
  console.log(`   spawnlings:    ${spawnlings.length} (${spawnlings.filter((s) => !s.beached_at).length} alive)`);
  console.log(`   spawned:       ${new Date(meta.spawnedAt).toISOString()}`);
}

async function oreStatusCmd() {
  const readCommands: OreReadCommand[] = ['board', 'miner', 'treasury'];
  for (const command of readCommands) {
    const result = await inspectOre(command, RPC);
    console.log(`\n[ore:${command}]`);
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }
}

function orePolicyFromArgs() {
  return {
    execute: flag('--execute'),
    deploySol: numOpt('--ore-deploy-sol', 0.001),
    maxSessionDeploySol: numOpt('--ore-max-session-sol', 0.01),
    minSolReserve: numOpt('--ore-min-reserve-sol', 0.02),
    intervalMs: intOpt('--ore-interval-ms', 60_000),
    square: opt('--ore-square') === undefined ? undefined : intOpt('--ore-square', 0),
    claimBeforeDeploy: !flag('--no-ore-claim'),
    checkpointBeforeDeploy: !flag('--no-ore-checkpoint'),
  };
}

function oreEnvFromArgs() {
  return {
    AMOUNT: opt('--amount'),
    SQUARE: opt('--square') ?? opt('--ore-square'),
    AUTHORITY: opt('--authority'),
    ID: opt('--id'),
    DEPOSIT: opt('--deposit'),
    EXECUTOR: opt('--executor'),
    FEE: opt('--fee'),
    MASK: opt('--mask'),
    STRATEGY: opt('--strategy'),
    RELOAD: opt('--reload'),
  };
}

function isOreWriteCommand(command: OreCommand): boolean {
  return ['automate', 'checkpoint', 'checkpoint_all', 'claim', 'close_all', 'deploy', 'deploy_all', 'reset'].includes(command);
}

function numOpt(name: string, fallback: number): number {
  const value = opt(name);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number for ${name}: ${value}`);
  return parsed;
}

function intOpt(name: string, fallback: number): number {
  const value = opt(name);
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) throw new Error(`Invalid integer for ${name}: ${value}`);
  return parsed;
}

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing env ${key}. Pass --creator <pubkey> or set ${key}.`);
    process.exit(1);
  }
  return v;
}
