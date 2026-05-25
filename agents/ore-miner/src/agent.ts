/**
 * agent.ts — Clawd ORE Mining Agent
 *
 * The CLAWD LOOP: Observe → Orient → Decide → Act
 *
 * Each tick:
 *   1. OBSERVE  — read board, round, miner state from chain
 *   2. ORIENT   — build strategic context from chain data
 *   3. DECIDE   — Claude selects one tool (deploy / claim / checkpoint / hold)
 *   4. ACT      — execute the chosen tool, broadcast state to dashboard
 */

import OpenAI from 'openai';
import type { ChatCompletionTool, ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'node:fs';
import chalk from 'chalk';
import type { Server as IOServer } from 'socket.io';

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
import type { DashboardState, LogEntry } from './server.js';
import { createSolanaConnection } from './connection.js';
import { createConvexOreRecorder } from './persistence.js';

const CLAWD_LOOP_PROMPT = `You are the Clawd ORE Mining Agent — the world's first AI-driven autonomous miner for the ORE v3 protocol on Solana.

THE CLAWD LOOP (Observe → Orient → Decide → Act):
Each tick you receive fresh on-chain data. You observe, orient, decide, and act with one tool call.

ORE GAME RULES:
- 25-square grid per round. Mining window: ~60 seconds. Claim window: ~24h.
- One winning square chosen by on-chain RNG (XOR of slot hash) at round end.
- Winning square miners split all SOL from losing squares (proportional to share).
- All miners earn ORE token rewards from the motherlode.

STRATEGIC PRINCIPLES:
1. EMPTY SQUARES = infinite EV — any deployment wins all other deployments there
2. UNDERBET SQUARES (EV > 1.0x) are statistically favorable
3. Deploy only when miningOpen=true — never after mining window closes
4. CHECKPOINT before claiming (checkpointNeeded must be false before claim)
5. CLAIM when rewards_sol > 0.01 SOL or rewards_ore > significant amount
6. Never deploy more than maxDeployPerRound SOL or drop below minReserve SOL

NON-NEGOTIABLE SAFETY:
- If miningOpen=false → do NOT deploy, only checkpoint/claim/hold
- If balance < minReserve → hold (no gas for txns)
- Always check chain state before acting

Call exactly ONE tool per tick. Observe first when uncertain.`;

export interface OodaTick {
  tick: number;
  action: string;
  tool: string | null;
  input: Record<string, unknown>;
  output: unknown;
  success: boolean;
  timestamp: string;
  reasoning?: string;
}

export interface AgentConfig {
  rpcUrl: string;
  wsEndpoint?: string;
  keypairPath: string;
  maxDeployPerRound: number;
  minReserve: number;
  tickIntervalMs: number;
  dryRun: boolean;
  io?: IOServer;
  publishDashboardState?: (state: DashboardState) => void;
}

interface ToolResult {
  output: unknown;
  success: boolean;
}

function loadKeypair(keypairPath: string): Keypair {
  const raw = JSON.parse(readFileSync(keypairPath, 'utf-8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function handleObserveBoard(conn: Connection): Promise<ToolResult> {
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
      id: round.id.toString(),
      totalDeployed: `${solAmount(round.totalDeployed)} SOL`,
      totalMiners: round.totalMiners.toString(),
      motherlode: `${oreAmount(round.motherlode)} ORE`,
      miningOpen: analysis.miningOpen,
      miningSecondsRemaining: analysis.miningSecondsRemaining.toFixed(1),
      claimHoursRemaining: (Number(analysis.claimSlotRemaining) * 0.4 / 3600).toFixed(1),
      isSettled: round.slotHashRevealed,
      winningSquare: round.winningSquare,
      squares: round.deployed.map((dep, i) => ({
        index: i,
        deployed: `${solAmount(dep)} SOL`,
        miners: round.count[i]?.toString(),
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
      roundId: miner.roundId.toString(),
      checkpointId: miner.checkpointId.toString(),
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

async function handleDeploy(input: Record<string, unknown>, config: AgentConfig): Promise<ToolResult> {
  const { amountSol, squares, reason } = input as { amountSol: number; squares: number[]; reason?: string };
  if (config.dryRun) {
    return { output: { dryRun: true, wouldDeploy: `${amountSol} SOL to squares [${squares.join(', ')}]`, reason }, success: true };
  }
  const lamports = BigInt(Math.round(amountSol * 1e9));
  const result = await deployToSquares(lamports, squares);
  return { output: { deployed: `${amountSol} SOL to [${squares.join(', ')}]`, reason, stdout: result.stdout, stderr: result.stderr }, success: result.success };
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

async function clawdDecide(
  client: OpenAI,
  model: string,
  userMessage: string,
  tick: number,
  now: string,
  conn: Connection,
  keypair: Keypair,
  config: AgentConfig,
  board: BoardState,
  round: RoundState,
): Promise<OodaTick> {
  const tools = ORE_TOOLS.map(t => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  })) satisfies ChatCompletionTool[];

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: CLAWD_LOOP_PROMPT },
        { role: 'user', content: userMessage },
      ] satisfies ChatCompletionMessageParam[],
      tools,
      tool_choice: 'auto',
    });

    const msg = response.choices[0]?.message;
    const toolCall = msg?.tool_calls?.[0];
    // DeepSeek thinking mode returns reasoning_content alongside content
    const reasoning = (msg as unknown as { reasoning_content?: string }).reasoning_content ?? undefined;

    if (!toolCall) {
      const text = msg?.content?.slice(0, 200) ?? 'no tool called';
      log(chalk.gray(`Agent held: ${text}`));
      return { tick, action: 'hold', tool: null, input: {}, output: text, success: true, timestamp: now, reasoning };
    }

    const fn = (toolCall as { function: { name: string; arguments: string } }).function;
    const toolInput = JSON.parse(fn.arguments) as Record<string, unknown>;
    log(`${chalk.blue('CLAWD LOOP ACTION:')} ${chalk.bold(fn.name)} ${JSON.stringify(toolInput).slice(0, 100)}`);
    if (reasoning) log(chalk.gray(`  thinking: ${reasoning.slice(0, 120)}…`));

    const result = await executeToolCall(fn.name, toolInput, conn, keypair, config, board, round);
    const icon = result.success ? chalk.green('✓') : chalk.red('✗');
    log(`${icon} ${JSON.stringify(result.output).slice(0, 200)}`);

    return {
      tick,
      action: fn.name,
      tool: fn.name,
      input: toolInput,
      output: result.output,
      success: result.success,
      timestamp: now,
      reasoning,
    };
  } catch (err) {
    log(chalk.red(`Clawd loop error: ${err}`));
    return { tick, action: 'error', tool: null, input: {}, output: String(err), success: false, timestamp: now };
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
    `=== CLAWD LOOP TICK ${tick} | ${now} ===`,
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
    '=== RECENT CLAWD LOOP STRIKES ===',
    historyBlock || '(none yet)',
    '',
    'Choose your next action. Call exactly one tool.',
  ].join('\n');
}

function buildDashboardState(
  tick: number,
  board: BoardState,
  analysis: ReturnType<typeof analyzeBoard>,
  round: RoundState,
  walletLamports: bigint,
  miner: Awaited<ReturnType<typeof getMiner>>,
  lastStrike: OodaTick,
  logEntries: LogEntry[],
  config: AgentConfig,
  loopPhase: DashboardState['loop'],
): DashboardState {
  const minerDeployed = new Set(
    miner ? miner.deployed.map((dep, i) => (dep > 0n ? i : -1)).filter(i => i >= 0) : [],
  );

  return {
    round: Number(board.roundId),
    miningOpen: analysis.miningOpen,
    miningSecondsRemaining: analysis.miningSecondsRemaining,
    claimHoursRemaining: Number(analysis.claimSlotRemaining) * 0.4 / 3600,
    totalDeployed: solAmount(round.totalDeployed),
    totalMiners: Number(round.totalMiners),
    motherlode: oreAmount(round.motherlode),
    settled: round.slotHashRevealed,
    winningSquare: round.slotHashRevealed ? round.winningSquare : null,
    squares: round.deployed.map((dep, i) => {
      const sq = analysis.squares[i];
      return {
        index: i,
        deployed: solAmount(dep),
        miners: Number(round.count[i] ?? 0n),
        ev: sq?.expectedValue ?? 0,
        isUnderbet: sq?.isUnderbet ?? false,
        isEmpty: dep === 0n,
        myDeployment: minerDeployed.has(i) && miner ? solAmount(miner.deployed[i] ?? 0n) : null,
      };
    }),
    wallet: {
      pubkey: miner?.authority ?? '',
      balanceSol: solAmount(walletLamports),
      rewardsSol: miner ? solAmount(miner.rewardsSol) : '0',
      rewardsOre: miner ? oreAmount(miner.rewardsOre + miner.refinedOre) : '0',
      checkpointNeeded: miner?.checkpointNeeded ?? false,
    },
    agentAction: lastStrike.action,
    agentReasoning: lastStrike.reasoning ?? JSON.stringify(lastStrike.output).slice(0, 200),
    loop: loopPhase,
    log: logEntries.slice(-100),
    dryRun: config.dryRun,
    timestamp: Date.now(),
    tick,
  };
}

type LlmProvider = 'deepseek' | 'openrouter' | 'anthropic';

function resolveLlmProvider(): LlmProvider {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;

  if (deepseekKey) {
    return 'deepseek';
  }
  if (orKey) {
    return 'openrouter';
  }
  return 'anthropic';
}

function buildOpenAIClient(provider: LlmProvider): OpenAI {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (provider === 'deepseek') {
    return new OpenAI({ apiKey: deepseekKey, baseURL: 'https://api.deepseek.com' });
  }
  if (provider === 'openrouter') {
    return new OpenAI({
      apiKey: orKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: { 'HTTP-Referer': 'https://openclawd.com', 'X-Title': 'Clawd ORE Mining Agent' },
    });
  }
  return new OpenAI({ apiKey: anthropicKey, baseURL: 'https://api.anthropic.com/v1' });
}

export async function runAgent(config: AgentConfig): Promise<void> {
  const provider = resolveLlmProvider();
  const client = buildOpenAIClient(provider);
  const model = provider === 'deepseek'
    ? (process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash')
    : provider === 'openrouter'
    ? (process.env.OPENROUTER_MODEL ?? 'anthropic/claude-opus-4.7-fast')
    : 'claude-sonnet-4-5';

  const conn = createSolanaConnection({ rpcUrl: config.rpcUrl, wsEndpoint: config.wsEndpoint });
  const keypair = loadKeypair(config.keypairPath);
  const cliAvailable = isOreCLIAvailable();

  const logEntries: LogEntry[] = [];
  let loopPhase: DashboardState['loop'] = 'idle';

  function addLog(level: LogEntry['level'], msg: string): void {
    logEntries.push({ ts: Date.now(), level, msg });
    if (logEntries.length > 200) logEntries.shift();
    log(msg);
  }

  function emitState(dashState: DashboardState): void {
    if (config.publishDashboardState) {
      config.publishDashboardState(dashState);
      return;
    }
    config.io?.emit('state', dashState);
  }

  addLog('info', chalk.cyan('━━━ CLAWD ORE MINING AGENT ━━━'));
  addLog('info', `Wallet: ${keypair.publicKey.toBase58()}`);
  addLog('info', `Model:  ${model} | Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE'}`);

  const recorder = createConvexOreRecorder();
  const dashboardUrl = `http://localhost:${process.env.DASHBOARD_PORT ?? '3333'}`;
  await recorder.start({
    agentSlug: 'ore-miner',
    walletPubkey: keypair.publicKey.toBase58(),
    rpcUrl: config.rpcUrl,
    wsEndpoint: config.wsEndpoint,
    dashboardUrl,
    model,
    provider,
    dryRun: config.dryRun,
    maxDeployPerRound: config.maxDeployPerRound,
    minReserve: config.minReserve,
    tickIntervalMs: config.tickIntervalMs,
    systemPrompt: CLAWD_LOOP_PROMPT,
  });

  let shuttingDown = false;
  const shutdown = async (status: 'stopped' | 'error', reason: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await recorder.finish(status, reason);
  };
  process.once('SIGINT', () => {
    void shutdown('stopped', 'received SIGINT').finally(() => process.exit(0));
  });
  process.once('SIGTERM', () => {
    void shutdown('stopped', 'received SIGTERM').finally(() => process.exit(0));
  });

  const history: OodaTick[] = [];
  let tick = 0;

  while (true) {
    tick++;
    const now = new Date().toISOString();
    addLog('info', `[Tick ${tick}] ${now}`);

    let board: BoardState;
    let round: RoundState;
    let currentSlot: bigint;

    loopPhase = 'observe';
    try {
      board = await getBoard(conn);
      currentSlot = await getCurrentSlot(conn);
      round = await getRound(conn, board.roundId);
    } catch (err) {
      addLog('error', `Chain read failed: ${err}`);
      await sleep(10_000);
      continue;
    }

    loopPhase = 'orient';
    const analysis = analyzeBoard(round, currentSlot, board.endSlot);
    const walletLamports = await getSolBalance(conn, keypair.publicKey);
    const miner = await getMiner(conn, keypair.publicKey).catch(() => null);
    addLog('info', analysis.summary);

    loopPhase = 'decide';
    const userMessage = buildUserMessage(tick, now, board, analysis, walletLamports, miner, history, config, cliAvailable);
    const strike = await clawdDecide(client, model, userMessage, tick, now, conn, keypair, config, board, round);

    loopPhase = 'act';
    addLog(strike.success ? 'action' : 'error', `${strike.action}: ${JSON.stringify(strike.output).slice(0, 120)}`);

    history.push(strike);
    if (history.length > 100) history.shift();

    const dashboardState = buildDashboardState(tick, board, analysis, round, walletLamports, miner, strike, logEntries, config, loopPhase);
    emitState(dashboardState);
    await recorder.recordTick({
      tick: strike,
      loopPhase,
      userMessage,
      dashboardState,
      summary: analysis.summary,
    });

    loopPhase = 'idle';
    const sleepMs = computeSleepMs(analysis.miningSecondsRemaining, analysis.miningOpen, round.slotHashRevealed, config.tickIntervalMs);
    addLog('info', `Next tick in ${(sleepMs / 1000).toFixed(0)}s`);
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
