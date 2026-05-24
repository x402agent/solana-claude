#!/usr/bin/env node
/**
 * Clawd ORE Mining Agent — Entry Point
 *
 * The world's first AI-driven autonomous miner for the ORE v3 protocol.
 * Claude-powered OODA loop: Observe → Orient → Decide → Act.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... RPC=... KEYPAIR=~/.config/solana/id.json \
 *     node --import tsx/esm src/index.ts [--mine] [--dry-run] [--observe]
 *
 * Environment:
 *   ANTHROPIC_API_KEY   Claude API key (required)
 *   RPC                 Solana RPC URL (or HELIUS_RPC_URL)
 *   KEYPAIR             Path to Solana keypair JSON file (required for mining)
 *   MAX_DEPLOY_SOL      Max SOL to deploy per round (default: 0.1)
 *   MIN_RESERVE_SOL     Min SOL to keep in wallet (default: 0.05)
 *   TICK_INTERVAL_MS    OODA loop interval in ms (default: 60000)
 *   DRY_RUN             Set to "true" to observe without executing (default: false)
 */

import chalk from 'chalk';
import { Connection, PublicKey } from '@solana/web3.js';

import { getBoard, getRound, getMiner, getCurrentSlot, getSolBalance } from './rpc.js';
import { analyzeBoard, formatBoardForClaude } from './strategy.js';
import { isOreCLIAvailable } from './cli.js';
import { runAgent } from './agent.js';
import { solAmount, oreAmount } from './constants.js';

const args = process.argv.slice(2);
const mode = args.includes('--mine')
  ? 'mine'
  : args.includes('--observe')
  ? 'observe'
  : args.includes('--status')
  ? 'status'
  : 'mine'; // default to mine

const dryRun = args.includes('--dry-run') || process.env['DRY_RUN'] === 'true';

async function main(): Promise<void> {
  const rpcUrl = process.env['RPC'] ?? process.env['HELIUS_RPC_URL'];
  const keypairPath = process.env['KEYPAIR'];
  const apiKey = process.env['ANTHROPIC_API_KEY'];

  if (!rpcUrl) {
    console.error(chalk.red('Error: RPC env var required (set RPC or HELIUS_RPC_URL)'));
    process.exit(1);
  }

  if (mode === 'observe') {
    await observeMode(rpcUrl, keypairPath);
    return;
  }

  if (mode === 'status') {
    await statusMode(rpcUrl, keypairPath);
    return;
  }

  // Mine mode
  if (!keypairPath) {
    console.error(chalk.red('Error: KEYPAIR env var required for mining'));
    process.exit(1);
  }
  if (!apiKey && !process.env['OPENROUTER_API_KEY']) {
    console.error(chalk.red('Error: ANTHROPIC_API_KEY or OPENROUTER_API_KEY env var required'));
    process.exit(1);
  }

  const maxDeploySol = parseFloat(process.env['MAX_DEPLOY_SOL'] ?? '0.1');
  const minReserveSol = parseFloat(process.env['MIN_RESERVE_SOL'] ?? '0.05');
  const tickIntervalMs = parseInt(process.env['TICK_INTERVAL_MS'] ?? '60000', 10);

  await runAgent({
    rpcUrl,
    keypairPath,
    maxDeployPerRound: maxDeploySol,
    minReserve: minReserveSol,
    tickIntervalMs,
    dryRun,
  });
}

async function observeMode(rpcUrl: string, keypairPath?: string): Promise<void> {
  console.log(chalk.cyan('━━━ CLAWD ORE OBSERVER ━━━'));
  const conn = new Connection(rpcUrl, 'confirmed');

  try {
    const board = await getBoard(conn);
    const currentSlot = await getCurrentSlot(conn);
    const round = await getRound(conn, board.roundId);
    const analysis = analyzeBoard(round, currentSlot, board.endSlot);

    console.log(chalk.bold(`\nBoard: Round ${board.roundId}`));
    console.log(`  Start slot: ${board.startSlot}`);
    console.log(`  End slot:   ${board.endSlot}`);
    console.log(`  Current:    ${currentSlot}`);
    console.log(`  Mining:     ${analysis.miningOpen ? chalk.green(`OPEN — ${analysis.miningSecondsRemaining.toFixed(0)}s left`) : chalk.yellow('CLOSED — claim window open')}`);
    console.log('');
    console.log(formatBoardForClaude(analysis));

    if (keypairPath) {
      const { Keypair } = await import('@solana/web3.js');
      const { readFileSync } = await import('node:fs');
      const raw = JSON.parse(readFileSync(keypairPath, 'utf-8')) as number[];
      const keypair = Keypair.fromSecretKey(Uint8Array.from(raw));
      const lamports = await getSolBalance(conn, keypair.publicKey);
      const miner = await getMiner(conn, keypair.publicKey);

      console.log(chalk.bold('\nWallet:'));
      console.log(`  Pubkey:  ${keypair.publicKey.toBase58()}`);
      console.log(`  Balance: ${solAmount(lamports)} SOL`);

      if (miner) {
        console.log(chalk.bold('\nMiner Account:'));
        console.log(`  Address:      ${miner.address}`);
        console.log(`  Round ID:     ${miner.roundId}`);
        console.log(`  Checkpoint:   ${miner.checkpointId} (needed: ${miner.checkpointNeeded})`);
        console.log(`  Rewards SOL:  ${solAmount(miner.rewardsSol)} SOL`);
        console.log(`  Rewards ORE:  ${oreAmount(miner.rewardsOre)} ORE`);
        console.log(`  Refined ORE:  ${oreAmount(miner.refinedOre)} ORE`);
        console.log(`  Lifetime SOL: ${solAmount(miner.lifetimeSol)} SOL`);
        console.log(`  Lifetime ORE: ${oreAmount(miner.lifetimeOre)} ORE`);
      } else {
        console.log(chalk.yellow('\nNo miner account yet — first deploy will create one'));
      }
    }
  } catch (err) {
    console.error(chalk.red(`Observe failed: ${err}`));
    process.exit(1);
  }
}

async function statusMode(rpcUrl: string, keypairPath?: string): Promise<void> {
  console.log(chalk.cyan('━━━ CLAWD ORE STATUS ━━━'));
  const conn = new Connection(rpcUrl, 'confirmed');
  const cliAvailable = isOreCLIAvailable();

  try {
    const board = await getBoard(conn);
    const currentSlot = await getCurrentSlot(conn);
    const round = await getRound(conn, board.roundId);
    const miningOpen = currentSlot < board.endSlot;
    const miningSlotsLeft = miningOpen ? board.endSlot - currentSlot : 0n;
    const claimSlotsLeft = round.expiresAt > currentSlot ? round.expiresAt - currentSlot : 0n;

    console.log(`ORE Program: oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv`);
    console.log(`Board:       ${board.address}`);
    console.log(`Round:       ${board.roundId}`);
    console.log(`Mining:      ${miningOpen ? chalk.green(`OPEN — ${(Number(miningSlotsLeft) * 0.4).toFixed(0)}s left`) : chalk.yellow('CLOSED')}`);
    console.log(`Claim:       ${(Number(claimSlotsLeft) * 0.4 / 3600).toFixed(1)}h left`);
    console.log(`Miners:      ${round.totalMiners}`);
    console.log(`Deployed:    ${solAmount(round.totalDeployed)} SOL`);
    console.log(`Motherlode:  ${oreAmount(round.motherlode)} ORE`);
    console.log(`Settled:     ${round.slotHashRevealed}`);
    console.log(`CLI binary:  ${cliAvailable ? chalk.green('compiled ✓') : chalk.yellow('not compiled (run: cd ore-master && cargo build --release)')}`);

    if (keypairPath) {
      const { Keypair } = await import('@solana/web3.js');
      const { readFileSync } = await import('node:fs');
      const raw = JSON.parse(readFileSync(keypairPath, 'utf-8')) as number[];
      const kp = Keypair.fromSecretKey(Uint8Array.from(raw));
      const lamports = await getSolBalance(conn, kp.publicKey);
      const miner = await getMiner(conn, kp.publicKey);
      console.log(`\nWallet:      ${kp.publicKey.toBase58()}`);
      console.log(`Balance:     ${solAmount(lamports)} SOL`);
      if (miner) {
        console.log(`Miner SOL:   ${solAmount(miner.rewardsSol)} pending`);
        console.log(`Miner ORE:   ${oreAmount(miner.rewardsOre + miner.refinedOre)} claimable`);
        console.log(`Checkpoint:  ${miner.checkpointNeeded ? chalk.yellow('NEEDED') : chalk.green('OK')}`);
      }
    }
  } catch (err) {
    console.error(chalk.red(`Status failed: ${err}`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(chalk.red(`Fatal: ${err}`));
  process.exit(1);
});
