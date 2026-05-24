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
 *
 * The agent runs continuously, sleeping between ticks based on round timing.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Tool, MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { readFileSync } from 'node:fs';
import chalk from 'chalk';

import { ORE_TOOLS } from './tools.js';
import { getBoard, getRound, getMiner, getCurrentSlot, getSolBalance } from './rpc.js';
import type { BoardState, RoundState, MinerState } from './rpc.js';
import { analyzeBoard, formatBoardForClaude } from './strategy.js';
import {
  deployToSquares,
  claimRewards,
  checkpointMiner,
  isOreCLIAvailable,
} from './cli.js';
import { solAmount, oreAmount, LAMPORTS_PER_SOL } from './constants.js';

const SYSTEM_PROMPT = `You are the Clawd ORE Mining Agent — the world's first AI-driven autonomous miner for the ORE v3 protocol on Solana.

ORE is a 25-square on-chain mining game. Each round:
- Miners deploy SOL to any of 25 squares
- At round end, one winning square is chosen by on-chain RNG (XOR of slot hash)
- Miners on the winning square earn SOL from losing squares (proportional to their deployment)
- All miners earn ORE token rewards from the motherlode

Your mission: maximize mining yield through intelligent square selection, timing, and reward claiming.

Key strategic principles:
1. EMPTY SQUARES have infinite EV — deploying any amount wins all other deployments
2. UNDERBET SQUARES (EV > 1.0x) are statistically favorable
3. OVERBET SQUARES (EV < 1.0x) are unfavorable unless diversifying
4. Deploy EARLY in the round to maximize your position before others adjust
5. CHECKPOINT before claiming — always check checkpointNeeded first
6. CLAIM rewards when they exceed gas costs (~0.01 SOL)

Risk rules (NON-NEGOTIABLE):
- Never deploy more than 50% of wallet balance in one round
- Always keep at least 0.05 SOL for gas fees
- Never deploy to a round that is expired (check slotsRemaining > 0)

Tactical guidance:
- At round start: spread across 3-5 empty or underbet squares
- Mid-round: concentrate on squares with best EV if budget remains
- End of round: hold — too late to deploy meaningfully
- Between rounds: checkpoint if needed, claim if rewards > 0.01 SOL

You MUST call exactly ONE tool per tick. Observe first, then act.`;

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
  maxDeployPerRound: number;  // SOL
  minReserve: number;         // SOL — minimum to keep in wallet
  tickIntervalMs: number;
  dryRun: boolean;
}

function loadKeypair(keypairPath: string): Keypair {
  const raw = JSON.parse(readFileSync(keypairPath, 'utf-8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  conn: Connection,
  keypair: Keypair,
  config: AgentConfig,
  cachedBoard?: BoardState,
  cachedRound?: RoundState,
): Promise<{ output: unknown; success: boolean }> {
  try {
    switch (name) {
      case 'ore_observe_board': {
        const board = await getBoard(conn);
        return {
          output: {
            address: board.address,
            roundId: board.roundId.toString(),
            startSlot: board.startSlot.toString(),
            endSlot: board.endSlot.toString(),
            epochId: board.epochId.toString(),
          },
          success: true,
        };
      }

      case 'ore_observe_round': {
        const board = cachedBoard ?? await getBoard(conn);
        const roundIdStr = input['roundId'] as string | undefined;
        const roundId = roundIdStr ? BigInt(roundIdStr) : board.roundId;
        const currentSlot = await getCurrentSlot(conn);
        const round = await getRound(conn, roundId);
        const analysis = analyzeBoard(round, currentSlot);

        return {
          output: {
            id: round.id.toString(),
            totalDeployed: solAmount(round.totalDeployed) + ' SOL',
            totalMiners: round.totalMiners.toString(),
            motherlode: oreAmount(round.motherlode) + ' ORE',
            slotsRemaining: analysis.slotsRemaining.toString(),
            secondsRemaining: analysis.secondsRemaining.toFixed(1),
            isExpired: round.expiresAt <= currentSlot,
            isSettled: round.slotHashRevealed,
            winningSquare: round.winningSquare,
            squares: round.deployed.map((dep, i) => ({
              index: i,
              deployed: solAmount(dep) + ' SOL',
              miners: round.count[i]?.toString(),
              ev: analysis.squares[i]?.expectedValue.toFixed(2) + 'x',
            })),
            topEvSquares: analysis.topSquares,
            emptySquares: analysis.bottomSquares,
            strategicSummary: analysis.summary,
          },
          success: true,
        };
      }

      case 'ore_observe_miner': {
        const authStr = input['authority'] as string | undefined;
        const authority = authStr ? new PublicKey(authStr) : keypair.publicKey;
        const miner = await getMiner(conn, authority);
        if (!miner) {
          return { output: { status: 'no miner account — first round will create one' }, success: true };
        }
        return {
          output: {
            address: miner.address,
            authority: miner.authority,
            rewardsSol: solAmount(miner.rewardsSol) + ' SOL',
            rewardsOre: oreAmount(miner.rewardsOre) + ' ORE',
            refinedOre: oreAmount(miner.refinedOre) + ' ORE',
            totalOreClaimable: oreAmount(miner.rewardsOre + miner.refinedOre) + ' ORE',
            roundId: miner.roundId.toString(),
            checkpointId: miner.checkpointId.toString(),
            checkpointNeeded: miner.checkpointNeeded,
            lifetimeSol: solAmount(miner.lifetimeSol) + ' SOL',
            lifetimeOre: oreAmount(miner.lifetimeOre) + ' ORE',
            deployedThisRound: miner.deployed.map(d => solAmount(d) + ' SOL'),
            totalDeployedThisRound: solAmount(miner.deployed.reduce((a, b) => a + b, 0n)) + ' SOL',
          },
          success: true,
        };
      }

      case 'ore_wallet_balance': {
        const lamports = await getSolBalance(conn, keypair.publicKey);
        return {
          output: {
            pubkey: keypair.publicKey.toBase58(),
            solBalance: solAmount(lamports) + ' SOL',
            lamports: lamports.toString(),
          },
          success: true,
        };
      }

      case 'ore_analyze_strategy': {
        const board = cachedBoard ?? await getBoard(conn);
        const currentSlot = await getCurrentSlot(conn);
        const round = cachedRound ?? await getRound(conn, board.roundId);
        const analysis = analyzeBoard(round, currentSlot);
        const formatted = formatBoardForClaude(analysis);
        return {
          output: {
            analysis: formatted,
            topEvSquares: analysis.topSquares,
            emptySquares: analysis.bottomSquares,
            slotsRemaining: analysis.slotsRemaining.toString(),
            roundProgress: (analysis.roundProgress * 100).toFixed(1) + '%',
            recommendation: buildRecommendation(analysis, round),
          },
          success: true,
        };
      }

      case 'ore_deploy': {
        const amountSol = input['amountSol'] as number;
        const squares = input['squares'] as number[];
        const reason = input['reason'] as string | undefined;

        if (config.dryRun) {
          return {
            output: {
              dryRun: true,
              wouldDeploy: `${amountSol} SOL to squares [${squares.join(', ')}]`,
              reason,
            },
            success: true,
          };
        }

        const lamports = BigInt(Math.round(amountSol * 1e9));
        const result = await deployToSquares(lamports, squares);
        return {
          output: {
            deployed: `${amountSol} SOL to squares [${squares.join(', ')}]`,
            reason,
            stdout: result.stdout,
            stderr: result.stderr,
          },
          success: result.success,
        };
      }

      case 'ore_claim': {
        if (config.dryRun) {
          return { output: { dryRun: true, action: 'would claim rewards' }, success: true };
        }
        const result = await claimRewards();
        return {
          output: { stdout: result.stdout, stderr: result.stderr },
          success: result.success,
        };
      }

      case 'ore_checkpoint': {
        if (config.dryRun) {
          return { output: { dryRun: true, action: 'would checkpoint miner' }, success: true };
        }
        const result = await checkpointMiner();
        return {
          output: { stdout: result.stdout, stderr: result.stderr },
          success: result.success,
        };
      }

      case 'hold': {
        return {
          output: {
            holding: true,
            reason: input['reason'] ?? 'no action needed',
            nextActionIn: input['nextActionIn'],
          },
          success: true,
        };
      }

      default:
        return { output: `unknown tool: ${name}`, success: false };
    }
  } catch (err) {
    return { output: String(err), success: false };
  }
}

function buildRecommendation(analysis: ReturnType<typeof analyzeBoard>, round: RoundState): string {
  if (round.slotHashRevealed) {
    return 'Round is settled. Wait for new round, then checkpoint and consider claiming.';
  }
  if (analysis.slotsRemaining === 0n) {
    return 'Round expired. Checkpoint miner account to lock in rewards.';
  }
  if (analysis.secondsRemaining < 30) {
    return 'Less than 30 seconds remaining — hold, do not deploy.';
  }
  if (analysis.bottomSquares.length > 0) {
    const empties = analysis.bottomSquares.slice(0, 3).join(', ');
    return `Deploy to empty squares [${empties}] for maximum EV (infinite expected return).`;
  }
  if (analysis.topSquares.length > 0) {
    const tops = analysis.topSquares.slice(0, 3).join(', ');
    return `Deploy to top EV squares [${tops}] — currently underbet.`;
  }
  return 'Market is balanced. Consider spreading across 5+ squares.';
}

export async function runAgent(config: AgentConfig): Promise<void> {
  const client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
  const conn = new Connection(config.rpcUrl, 'confirmed');
  const keypair = loadKeypair(config.keypairPath);

  const pubkey = keypair.publicKey.toBase58();
  const cliAvailable = isOreCLIAvailable();

  log(chalk.cyan('━━━ CLAWD ORE MINING AGENT INITIALIZED ━━━'));
  log(`Wallet: ${chalk.yellow(pubkey)}`);
  log(`RPC: ${config.rpcUrl.slice(0, 40)}...`);
  log(`Mode: ${config.dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
  log(`CLI: ${cliAvailable ? chalk.green('available') : chalk.red('not compiled')}`);
  log(`Max deploy/round: ${config.maxDeployPerRound} SOL | Reserve: ${config.minReserve} SOL`);
  log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

  const history: OodaTick[] = [];
  let tick = 0;

  while (true) {
    tick++;
    const now = new Date().toISOString();
    log(`\n${chalk.bold(`[Tick ${tick}]`)} ${now}`);

    // Pre-load board and round for context injection
    let board: BoardState | undefined;
    let round: RoundState | undefined;
    let currentSlot: bigint | undefined;

    try {
      board = await getBoard(conn);
      currentSlot = await getCurrentSlot(conn);
      round = await getRound(conn, board.roundId);
    } catch (err) {
      log(chalk.red(`Failed to load chain state: ${err}`));
      await sleep(10_000);
      continue;
    }

    const analysis = analyzeBoard(round, currentSlot);
    const walletLamports = await getSolBalance(conn, keypair.publicKey);
    const miner = await getMiner(conn, keypair.publicKey).catch(() => null);

    // Build rich context for Claude
    const historyBlock = history.slice(-5).map((h, i) =>
      `Tick ${h.tick}: ${h.action} (${h.tool ?? 'none'}) → ${h.success ? 'OK' : 'FAIL'}: ${JSON.stringify(h.output).slice(0, 100)}`,
    ).join('\n');

    const userMessage = [
      `=== TICK ${tick} | ${now} ===`,
      '',
      `Wallet: ${pubkey}`,
      `SOL Balance: ${solAmount(walletLamports)} SOL`,
      `Max deploy this round: ${config.maxDeployPerRound} SOL (keep ${config.minReserve} SOL reserve)`,
      `CLI available: ${cliAvailable}`,
      `Dry run: ${config.dryRun}`,
      '',
      '=== BOARD STATE ===',
      `Round ${board.roundId}: slots ${board.startSlot}→${board.endSlot}`,
      `Slots remaining: ${analysis.slotsRemaining} (~${analysis.secondsRemaining.toFixed(0)}s)`,
      '',
      '=== STRATEGY ANALYSIS ===',
      analysis.summary,
      `Top EV squares: [${analysis.topSquares.join(', ')}]`,
      `Empty squares: [${analysis.bottomSquares.join(', ')}]`,
      '',
      '=== MINER STATE ===',
      miner ? [
        `Round ID: ${miner.roundId} | Checkpoint ID: ${miner.checkpointId}`,
        `Checkpoint needed: ${miner.checkpointNeeded}`,
        `Rewards: ${solAmount(miner.rewardsSol)} SOL + ${oreAmount(miner.rewardsOre + miner.refinedOre)} ORE`,
        `Deployed this round: ${solAmount(miner.deployed.reduce((a, b) => a + b, 0n))} SOL`,
      ].join('\n') : '(no miner account yet — will be created on first deploy)',
      '',
      '=== RECENT STRIKES ===',
      historyBlock || '(none yet)',
      '',
      'Choose your next action. Call exactly one tool.',
    ].join('\n');

    // THINK — Claude decides
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
        // No tool — hold
        const text = textBlock?.text?.slice(0, 200) ?? 'no tool called';
        log(chalk.gray(`Claude held: ${text}`));
        strike = { tick, action: 'hold', tool: null, input: {}, output: text, success: true, timestamp: now };
      } else {
        const toolInput = toolUse.input as Record<string, unknown>;
        log(`${chalk.blue(`Tool:`)} ${chalk.bold(toolUse.name)} ${JSON.stringify(toolInput).slice(0, 100)}`);

        // ACT — execute the chosen tool
        const result = await executeToolCall(
          toolUse.name,
          toolInput,
          conn,
          keypair,
          config,
          board,
          round,
        );

        const statusIcon = result.success ? chalk.green('✓') : chalk.red('✗');
        log(`${statusIcon} Result: ${JSON.stringify(result.output).slice(0, 200)}`);

        strike = {
          tick,
          action: toolUse.name,
          tool: toolUse.name,
          input: toolInput,
          output: result.output,
          success: result.success,
          timestamp: now,
        };
      }
    } catch (err) {
      log(chalk.red(`Claude error: ${err}`));
      strike = { tick, action: 'error', tool: null, input: {}, output: String(err), success: false, timestamp: now };
    }

    history.push(strike);
    if (history.length > 100) history.shift();

    // Determine next tick sleep based on round timing
    const sleepMs = computeSleepMs(analysis.secondsRemaining, round.slotHashRevealed, config.tickIntervalMs);
    log(chalk.gray(`Next tick in ${(sleepMs / 1000).toFixed(0)}s`));
    await sleep(sleepMs);
  }
}

function computeSleepMs(secondsRemaining: number, settled: boolean, defaultMs: number): number {
  if (settled || secondsRemaining <= 0) {
    return 15_000; // between rounds — check every 15s for new round
  }
  if (secondsRemaining < 60) {
    return 20_000; // near end — check frequently but no point deploying
  }
  if (secondsRemaining < 300) {
    return 30_000; // mid-round
  }
  // Early round — default interval
  return defaultMs;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg: string): void {
  const prefix = `[${new Date().toISOString().slice(11, 23)}]`;
  console.log(`${chalk.gray(prefix)} ${msg}`);
}
