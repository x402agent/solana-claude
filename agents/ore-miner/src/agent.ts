/**
 * agent.ts — Clawd ORE Mining Agent OODA Loop
 *
 * OBSERVE → ORIENT → DECIDE → ACT
 *
 * Each tick:
 *   1. OBSERVE  — read board, round, miner state from chain
 *   2. ORIENT   — build strategic context from chain data
 *   3. DECIDE   — Claude selects one tool (deploy / claim / checkpoint / hold)
 *   4. ACT      — execute the chosen tool, log the result
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Tool, MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import { Connection, Keypair } from '@solana/web3.js';
import { readFileSync } from 'node:fs';
import chalk from 'chalk';

import { ORE_TOOLS } from './tools.js';
import { getBoard, getRound, getMiner, getCurrentSlot, getSolBalance } from './rpc.js';
import type { BoardState, RoundState } from './rpc.js';
import { analyzeBoard, formatBoardForClaude } from './strategy.js';
import {
  deployToSquares,
  claimRewards,
  checkpointMiner,
  isOreCLIAvailable,
} from './cli.js';
import { solAmount, oreAmount } from './constants.js';
import { PublicKey } from '@solana/web3.js';

const SYSTEM_PROMPT = `You are the Clawd ORE Mining Agent — the world's first AI-driven autonomous miner for the ORE v3 protocol on Solana.

ORE is a 25-square on-chain mining game. Each round has a ~60 second MINING WINDOW then a ~24h CLAIM WINDOW:
- During mining: deploy SOL to squares. One winning square is picked by on-chain RNG at round end.
- Miners on the winning square earn SOL from losing squares (proportional to their share).
- All miners earn ORE token rewards from the motherlode.
- After mining: checkpoint your account, then claim SOL + ORE rewards.

Strategic principles:
1. EMPTY SQUARES have infinite EV — any deployment wins all other deployments on that square
2. UNDERBET SQUARES (EV > 1.0x) are statistically favorable
3. Deploy only when miningOpen=true — never after the mining window closes
4. CHECKPOINT before claiming (checkpointNeeded must be false before claim)
5. CLAIM when rewards exceed gas costs (~0.01 SOL)
6. Never deploy more than maxDeployPerRound SOL or drop below minReserve SOL

Call exactly ONE tool per tick. Start by observing before acting.`;

export interface OodaTick {
  tick: number;
  action: string;
  tool: string | null;
  input: Record<string, unknown>;
  output: unknown;
  success: boolean;
  timestamp: string;
}

export interface AgentConfig {
  rpcUrl: string;
  keypairPath: string;
  maxDeployPerRound: number;
  minReserve: number;
  tickIntervalMs: number;
  dryRun: boolean;
}

interface ToolResult {
  output: unknown;
  success: boolean;
}

function loadKeypair(keypairPath: string): Keypair {
  const raw = JSON.parse(readFileSync(keypairPath, 'utf-8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// ── Tool handlers (split to keep complexity manageable) ──────────────────────

async function handleObserveBoard(conn: Connection): Promise<ToolResult> {
  const board = await getBoard(conn);
  return {
    output: {
      address: board.address,
      roundId: `${board.roundId}`,
      startSlot: `${board.startSlot}`,
      endSlot: `${board.endSlot}`,
      epochId: `${board.epochId}`,
    },
    success: true,
  };
}

async function handleObserveRound(
  conn: Connection,
  input: Record<string, unknown>,
  cachedBoard?: BoardState,
): Promise<ToolResult> {
  const board = cachedBoard ?? await getBoard(conn);
  const roundIdStr = (input as { roundId?: string }).roundId;
  const roundId = roundIdStr ? BigInt(roundIdStr) : board.roundId;
  const currentSlot = await getCurrentSlot(conn);
  const round = await getRound(conn, roundId);
  const analysis = analyzeBoard(round, currentSlot, board.endSlot);

  return {
    output: {
      id: `${round.id}`,
      totalDeployed: `${solAmount(round.totalDeployed)} SOL`,
      totalMiners: `${round.totalMiners}`,
      motherlode: `${oreAmount(round.motherlode)} ORE`,
      miningOpen: analysis.miningOpen,
      miningSecondsRemaining: analysis.miningSecondsRemaining.toFixed(1),
      claimHoursRemaining: (Number(analysis.claimSlotRemaining) * 0.4 / 3600).toFixed(1),
      isSettled: round.slotHashRevealed,
      winningSquare: round.winningSquare,
      squares: round.deployed.map((dep, i) => ({
        index: i,
        deployed: `${solAmount(dep)} SOL`,
        miners: `${round.count[i] ?? 0n}`,
        ev: `${analysis.squares[i]?.expectedValue.toFixed(2)}x`,
      })),
      topEvSquares: analysis.topSquares,
      emptySquares: analysis.bottomSquares,
      strategicSummary: analysis.summary,
    },
    success: true,
  };
}

async function handleObserveMiner(
  conn: Connection,
  input: Record<string, unknown>,
  keypair: Keypair,
): Promise<ToolResult> {
  const authStr = (input as { authority?: string }).authority;
  const authority = authStr ? new PublicKey(authStr) : keypair.publicKey;
  const miner = await getMiner(conn, authority);
  if (!miner) {
    return { output: { status: 'no miner account — first deploy will create one' }, success: true };
  }
  const totalOre = miner.rewardsOre + miner.refinedOre;
  const totalDeployedThisRound = miner.deployed.reduce((a, b) => a + b, 0n);
  return {
    output: {
      address: miner.address,
      authority: miner.authority,
      rewardsSol: `${solAmount(miner.rewardsSol)} SOL`,
      rewardsOre: `${oreAmount(miner.rewardsOre)} ORE`,
      refinedOre: `${oreAmount(miner.refinedOre)} ORE`,
      totalOreClaimable: `${oreAmount(totalOre)} ORE`,
      roundId: `${miner.roundId}`,
      checkpointId: `${miner.checkpointId}`,
      checkpointNeeded: miner.checkpointNeeded,
      lifetimeSol: `${solAmount(miner.lifetimeSol)} SOL`,
      lifetimeOre: `${oreAmount(miner.lifetimeOre)} ORE`,
      totalDeployedThisRound: `${solAmount(totalDeployedThisRound)} SOL`,
    },
    success: true,
  };
}

async function handleAnalyzeStrategy(
  conn: Connection,
  cachedBoard?: BoardState,
  cachedRound?: RoundState,
): Promise<ToolResult> {
  const board = cachedBoard ?? await getBoard(conn);
  const currentSlot = await getCurrentSlot(conn);
  const round = cachedRound ?? await getRound(conn, board.roundId);
  const analysis = analyzeBoard(round, currentSlot, board.endSlot);
  const formatted = formatBoardForClaude(analysis);

  const rec = buildRecommendation(analysis, round);
  return {
    output: {
      analysis: formatted,
      topEvSquares: analysis.topSquares,
      emptySquares: analysis.bottomSquares,
      miningOpen: analysis.miningOpen,
      miningSecondsRemaining: analysis.miningSecondsRemaining.toFixed(1),
      roundProgress: `${(analysis.roundProgress * 100).toFixed(1)}%`,
      recommendation: rec,
    },
    success: true,
  };
}

async function handleDeploy(
  input: Record<string, unknown>,
  config: AgentConfig,
): Promise<ToolResult> {
  const { amountSol, squares, reason } = input as { amountSol: number; squares: number[]; reason?: string };

  if (config.dryRun) {
    return {
      output: { dryRun: true, wouldDeploy: `${amountSol} SOL to squares [${squares.join(', ')}]`, reason },
      success: true,
    };
  }

  const lamports = BigInt(Math.round(amountSol * 1e9));
  const result = await deployToSquares(lamports, squares);
  return {
    output: { deployed: `${amountSol} SOL to [${squares.join(', ')}]`, reason, stdout: result.stdout, stderr: result.stderr },
    success: result.success,
  };
}

async function handleClaim(config: AgentConfig): Promise<ToolResult> {
  if (config.dryRun) return { output: { dryRun: true, action: 'would claim rewards' }, success: true };
  const result = await claimRewards();
  return { output: { stdout: result.stdout, stderr: result.stderr }, success: result.success };
}

async function handleCheckpoint(config: AgentConfig): Promise<ToolResult> {
  if (config.dryRun) return { output: { dryRun: true, action: 'would checkpoint miner' }, success: true };
  const result = await checkpointMiner();
  return { output: { stdout: result.stdout, stderr: result.stderr }, success: result.success };
}

async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  conn: Connection,
  keypair: Keypair,
  config: AgentConfig,
  cachedBoard?: BoardState,
  cachedRound?: RoundState,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'ore_observe_board':    return handleObserveBoard(conn);
      case 'ore_observe_round':    return handleObserveRound(conn, input, cachedBoard);
      case 'ore_observe_miner':    return handleObserveMiner(conn, input, keypair);
      case 'ore_analyze_strategy': return handleAnalyzeStrategy(conn, cachedBoard, cachedRound);
      case 'ore_deploy':           return handleDeploy(input, config);
      case 'ore_claim':            return handleClaim(config);
      case 'ore_checkpoint':       return handleCheckpoint(config);
      case 'ore_wallet_balance': {
        const lamports = await getSolBalance(conn, keypair.publicKey);
        return { output: { pubkey: keypair.publicKey.toBase58(), solBalance: `${solAmount(lamports)} SOL`, lamports: lamports.toString() }, success: true };
      }
      case 'hold': {
        const { reason: holdReason, nextActionIn } = input as { reason?: string; nextActionIn?: number };
        return { output: { holding: true, reason: holdReason ?? 'no action needed', nextActionIn }, success: true };
      }
      default:
        return { output: `unknown tool: ${name}`, success: false };
    }
  } catch (err) {
    return { output: String(err), success: false };
  }
}

function buildRecommendation(analysis: ReturnType<typeof analyzeBoard>, round: RoundState): string {
  if (round.slotHashRevealed) return 'Round settled. Checkpoint if needed, then claim rewards.';
  if (!analysis.miningOpen) return 'Mining window closed. Checkpoint miner, then claim when ready.';
  if (analysis.miningSecondsRemaining < 15) return 'Under 15s left — hold, do not deploy now.';
  if (analysis.bottomSquares.length > 0) {
    return `Deploy to empty squares [${analysis.bottomSquares.slice(0, 3).join(', ')}] — infinite EV.`;
  }
  return `Deploy to top EV squares [${analysis.topSquares.slice(0, 3).join(', ')}] — underbet.`;
}

function buildUserMessage(
  tick: number,
  now: string,
  board: BoardState,
  analysis: ReturnType<typeof analyzeBoard>,
  walletLamports: bigint,
  miner: Awaited<ReturnType<typeof getMiner>>,
  history: OodaTick[],
  config: AgentConfig,
  cliAvailable: boolean,
): string {
  const historyBlock = history.slice(-5).map(h =>
    `Tick ${h.tick}: ${h.action} → ${h.success ? 'OK' : 'FAIL'}: ${JSON.stringify(h.output).slice(0, 80)}`,
  ).join('\n');

  const minerBlock = miner
    ? [
        `Round ID: ${miner.roundId} | Checkpoint ID: ${miner.checkpointId}`,
        `Checkpoint needed: ${miner.checkpointNeeded}`,
        `Rewards: ${solAmount(miner.rewardsSol)} SOL + ${oreAmount(miner.rewardsOre + miner.refinedOre)} ORE`,
        `Deployed this round: ${solAmount(miner.deployed.reduce((a, b) => a + b, 0n))} SOL`,
      ].join('\n')
    : '(no miner account yet — first deploy will create one)';

  return [
    `=== TICK ${tick} | ${now} ===`,
    `SOL Balance: ${solAmount(walletLamports)} SOL | Max deploy: ${config.maxDeployPerRound} SOL | Reserve: ${config.minReserve} SOL`,
    `CLI: ${cliAvailable} | Dry run: ${config.dryRun}`,
    '',
    '=== BOARD ===',
    `Round ${board.roundId} | Mining: ${analysis.miningOpen ? `OPEN (${analysis.miningSecondsRemaining.toFixed(0)}s left)` : 'CLOSED'} | Claim: ${(Number(analysis.claimSlotRemaining) * 0.4 / 3600).toFixed(1)}h left`,
    analysis.summary,
    `Top EV: [${analysis.topSquares.join(', ')}] | Empty: [${analysis.bottomSquares.join(', ')}]`,
    '',
    '=== MINER ===',
    minerBlock,
    '',
    '=== RECENT STRIKES ===',
    historyBlock || '(none yet)',
    '',
    'Choose your next action. Call exactly one tool.',
  ].join('\n');
}

export async function runAgent(config: AgentConfig): Promise<void> {
  const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
  const conn = new Connection(config.rpcUrl, 'confirmed');
  const keypair = loadKeypair(config.keypairPath);
  const cliAvailable = isOreCLIAvailable();

  log(chalk.cyan('━━━ CLAWD ORE MINING AGENT ━━━'));
  log(`Wallet: ${chalk.yellow(keypair.publicKey.toBase58())}`);
  log(`Mode:   ${config.dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
  log(`CLI:    ${cliAvailable ? chalk.green('compiled ✓') : chalk.red('not compiled')}`);
  log(`Limits: ${config.maxDeployPerRound} SOL/round | ${config.minReserve} SOL reserve`);
  log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

  const history: OodaTick[] = [];
  let tick = 0;

  while (true) {
    tick++;
    const now = new Date().toISOString();
    log(`\n${chalk.bold(`[Tick ${tick}]`)} ${now}`);

    let board: BoardState;
    let round: RoundState;
    let currentSlot: bigint;

    try {
      board = await getBoard(conn);
      currentSlot = await getCurrentSlot(conn);
      round = await getRound(conn, board.roundId);
    } catch (err) {
      log(chalk.red(`Chain read failed: ${err}`));
      await sleep(10_000);
      continue;
    }

    const analysis = analyzeBoard(round, currentSlot, board.endSlot);
    const walletLamports = await getSolBalance(conn, keypair.publicKey);
    const miner = await getMiner(conn, keypair.publicKey).catch(() => null);

    const userMessage = buildUserMessage(
      tick, now, board, analysis, walletLamports, miner, history, config, cliAvailable,
    );

    let strike: OodaTick;
    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: ORE_TOOLS as Tool[],
        messages: [{ role: 'user', content: userMessage }] as MessageParam[],
        tool_choice: { type: 'auto' },
      });

      const toolUse = response.content.find(b => b.type === 'tool_use');
      const textBlock = response.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined;

      if (!toolUse || toolUse.type !== 'tool_use') {
        const text = textBlock?.text?.slice(0, 200) ?? 'no tool called';
        log(chalk.gray(`Claude held: ${text}`));
        strike = { tick, action: 'hold', tool: null, input: {}, output: text, success: true, timestamp: now };
      } else {
        const toolInput = toolUse.input as Record<string, unknown>;
        log(`${chalk.blue('Tool:')} ${chalk.bold(toolUse.name)} ${JSON.stringify(toolInput).slice(0, 100)}`);

        const result = await executeToolCall(toolUse.name, toolInput, conn, keypair, config, board, round);
        const icon = result.success ? chalk.green('✓') : chalk.red('✗');
        log(`${icon} ${JSON.stringify(result.output).slice(0, 200)}`);

        strike = {
          tick, action: toolUse.name, tool: toolUse.name,
          input: toolInput, output: result.output,
          success: result.success, timestamp: now,
        };
      }
    } catch (err) {
      log(chalk.red(`Claude error: ${err}`));
      strike = { tick, action: 'error', tool: null, input: {}, output: String(err), success: false, timestamp: now };
    }

    history.push(strike);
    if (history.length > 100) history.shift();

    const sleepMs = computeSleepMs(analysis.miningSecondsRemaining, analysis.miningOpen, round.slotHashRevealed, config.tickIntervalMs);
    log(chalk.gray(`Next tick in ${(sleepMs / 1000).toFixed(0)}s`));
    await sleep(sleepMs);
  }
}

function computeSleepMs(miningSecondsRemaining: number, miningOpen: boolean, settled: boolean, defaultMs: number): number {
  if (settled || !miningOpen) return 15_000;
  if (miningSecondsRemaining < 30) return 10_000;
  return defaultMs;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg: string): void {
  const prefix = `[${new Date().toISOString().slice(11, 23)}]`;
  console.log(`${chalk.gray(prefix)} ${msg}`);
}
