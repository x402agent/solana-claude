import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type OreStrategy = "random" | "preferred" | "discretionary";
export type OreCliCommand =
  | "automate"
  | "automation"
  | "board"
  | "claim"
  | "checkpoint"
  | "deploy_all"
  | "deploy_mask"
  | "miner"
  | "reload_sol";

export interface OreMinerOptions {
  keypairPath: string;
  rpcUrl: string;
  oreRoot: string;
  authority?: string;
  executor?: string;
  amountLamports?: string;
  amountSol?: string;
  depositLamports?: string;
  depositSol?: string;
  feeLamports?: string;
  feeSol?: string;
  strategy: OreStrategy;
  mask?: string;
  square?: string;
  squares?: string;
  numSquares?: string;
  reload: boolean;
  setupAutomation: boolean;
  once: boolean;
  deployAll: boolean;
  dryRun: boolean;
  intervalMs: number;
  commandTimeoutMs: number;
  claimEveryTicks: number;
  minTimeRemainingSec: number;
}

export interface OreCommandResult {
  command: OreCliCommand;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface OreBoardState {
  roundId: number;
  timeRemainingSec?: number;
  startSlot?: number;
  endSlot?: number;
}

export interface OreMinerState {
  roundId: number;
  checkpointId: number;
  deployedLamports: bigint[];
  totalDeployedLamports: bigint;
  rewardsSol?: string;
  rewardsOre?: string;
}

type EnvSource = NodeJS.ProcessEnv | Record<string, string | undefined>;

const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";
const PERMISSIONLESS_EXECUTOR = "executor11111111111111111111111111111111112";

export function defaultOreRoot(): string {
  const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
  return path.join(repoRoot, "ore-master");
}

export function parseOreMinerArgs(
  args: string[],
  env: EnvSource = process.env,
): OreMinerOptions {
  const keypairPath =
    flagValue(args, "--ore-keypair") ??
    firstEnv(env, "ORE_KEYPAIR", "KEYPAIR") ??
    "";
  const rpcUrl =
    flagValue(args, "--ore-rpc") ??
    firstEnv(env, "ORE_RPC_URL", "RPC", "SOLANA_RPC_URL") ??
    DEFAULT_RPC_URL;

  return {
    keypairPath: resolveTilde(keypairPath),
    rpcUrl,
    oreRoot: resolveTilde(
      flagValue(args, "--ore-root") ?? firstEnv(env, "ORE_ROOT") ?? defaultOreRoot(),
    ),
    authority:
      flagValue(args, "--ore-authority") ??
      firstEnv(env, "ORE_AUTHORITY", "AUTHORITY"),
    executor:
      flagValue(args, "--ore-executor") ??
      firstEnv(env, "ORE_EXECUTOR", "EXECUTOR"),
    amountLamports:
      flagValue(args, "--ore-amount-lamports") ??
      firstEnv(env, "ORE_AMOUNT_LAMPORTS", "ORE_AMOUNT", "AMOUNT"),
    amountSol:
      flagValue(args, "--ore-amount-sol") ??
      firstEnv(env, "ORE_AMOUNT_SOL", "AMOUNT_SOL"),
    depositLamports:
      flagValue(args, "--ore-deposit-lamports") ??
      firstEnv(env, "ORE_DEPOSIT_LAMPORTS", "ORE_DEPOSIT", "DEPOSIT"),
    depositSol:
      flagValue(args, "--ore-deposit-sol") ??
      firstEnv(env, "ORE_DEPOSIT_SOL", "DEPOSIT_SOL"),
    feeLamports:
      flagValue(args, "--ore-fee-lamports") ??
      firstEnv(env, "ORE_FEE_LAMPORTS", "ORE_FEE", "FEE"),
    feeSol:
      flagValue(args, "--ore-fee-sol") ??
      firstEnv(env, "ORE_FEE_SOL", "FEE_SOL"),
    strategy: parseStrategy(
      flagValue(args, "--ore-strategy") ??
        firstEnv(env, "ORE_STRATEGY", "STRATEGY") ??
        "random",
    ),
    mask: flagValue(args, "--ore-mask") ?? firstEnv(env, "ORE_MASK", "MASK"),
    square:
      flagValue(args, "--ore-square") ?? firstEnv(env, "ORE_SQUARE", "SQUARE"),
    squares:
      flagValue(args, "--ore-squares") ??
      firstEnv(env, "ORE_SQUARES", "SQUARES"),
    numSquares:
      flagValue(args, "--ore-num-squares") ??
      firstEnv(env, "ORE_NUM_SQUARES", "NUM_SQUARES"),
    reload: !hasFlag(args, "--ore-no-reload") && boolEnv(env, "ORE_RELOAD", true),
    setupAutomation: hasFlag(args, "--ore-setup") || boolEnv(env, "ORE_SETUP", false),
    once: hasFlag(args, "--ore-once") || boolEnv(env, "ORE_ONCE", false),
    deployAll: hasFlag(args, "--ore-deploy-all") || boolEnv(env, "ORE_DEPLOY_ALL", false),
    dryRun: hasFlag(args, "--ore-dry-run") || boolEnv(env, "ORE_DRY_RUN", false),
    intervalMs: numberOption(args, env, "--ore-interval-ms", "ORE_INTERVAL_MS", 30_000),
    commandTimeoutMs: numberOption(
      args,
      env,
      "--ore-command-timeout-ms",
      "ORE_COMMAND_TIMEOUT_MS",
      120_000,
    ),
    claimEveryTicks: numberOption(
      args,
      env,
      "--ore-claim-every",
      "ORE_CLAIM_EVERY",
      0,
    ),
    minTimeRemainingSec: numberOption(
      args,
      env,
      "--ore-min-time-remaining-sec",
      "ORE_MIN_TIME_REMAINING_SEC",
      8,
    ),
  };
}

export async function runOreMiner(options: OreMinerOptions): Promise<void> {
  validateOptions(options);

  console.log(`[ORE] root: ${options.oreRoot}`);
  console.log(`[ORE] rpc: ${options.rpcUrl}`);
  console.log(`[ORE] keypair: ${options.keypairPath}`);

  const runner = new OreCliRunner(options);

  if (options.setupAutomation) {
    console.log("[ORE] configuring on-chain automation");
    await configureAutomation(runner, options);
  }

  if (options.dryRun) {
    console.log("[ORE] dry run complete; no miner loop started");
    return;
  }

  let tick = 0;
  while (true) {
    tick += 1;
    await runOreMinerTick(runner, options, tick);
    if (options.once) {
      break;
    }
    await sleep(options.intervalMs);
  }
}

export async function showOreStatus(options: OreMinerOptions): Promise<void> {
  validateCommonOptions(options);
  const runner = new OreCliRunner(options);
  await runner.run("board");
  await runner.run("miner", authorityEnv(options), { allowFailure: true });
  if (options.authority) {
    await runner.run("automation", authorityEnv(options), { allowFailure: true });
  }
}

export async function runOreMinerTick(
  runner: OreCliRunner,
  options: OreMinerOptions,
  tick: number,
): Promise<void> {
  const boardResult = await runner.run("board");
  const board = parseBoardState(boardResult.stdout);
  if (!board) {
    throw new Error("Unable to parse ORE board output");
  }

  const minerResult = await runner.run("miner", authorityEnv(options), {
    allowFailure: true,
  });
  let miner =
    minerResult.exitCode === 0 ? parseMinerState(minerResult.stdout) : undefined;

  if (miner && miner.roundId < board.roundId && miner.checkpointId < miner.roundId) {
    console.log(
      `[ORE] checkpointing miner round ${miner.roundId} before board round ${board.roundId}`,
    );
    await runner.run("checkpoint", authorityEnv(options));
    miner = undefined;
  }

  if (
    options.claimEveryTicks > 0 &&
    tick % options.claimEveryTicks === 0 &&
    !options.authority
  ) {
    console.log("[ORE] claiming accumulated ORE/SOL rewards");
    await runner.run("claim", {}, { allowFailure: true });
  }

  if (miner && miner.roundId === board.roundId && miner.totalDeployedLamports > 0n) {
    console.log(
      `[ORE] round ${board.roundId} already deployed: ${miner.totalDeployedLamports.toString()} lamports`,
    );
    return;
  }

  if (
    board.timeRemainingSec !== undefined &&
    board.timeRemainingSec < options.minTimeRemainingSec
  ) {
    console.log(
      `[ORE] skipping deploy; only ${board.timeRemainingSec}s remain in round ${board.roundId}`,
    );
    return;
  }

  const deployCommand = selectDeployCommand(options);
  console.log(`[ORE] deploying for round ${board.roundId} via ${deployCommand}`);
  await runner.run(deployCommand, deployEnv(options));
}

export function parseBoardState(output: string): OreBoardState | undefined {
  const roundId = numberFromLine(output, /Id:\s*(\d+)/);
  if (roundId === undefined) {
    return undefined;
  }

  return {
    roundId,
    startSlot: numberFromLine(output, /Start slot:\s*(\d+)/),
    endSlot: numberFromLine(output, /End slot:\s*(\d+)/),
    timeRemainingSec: numberFromLine(output, /Time remaining:\s*([0-9.]+)\s*sec/),
  };
}

export function parseMinerState(output: string): OreMinerState | undefined {
  const roundId = numberFromLine(output, /round_id:\s*(\d+)/);
  const checkpointId = numberFromLine(output, /checkpoint_id:\s*(\d+)/);
  if (roundId === undefined || checkpointId === undefined) {
    return undefined;
  }

  const deployedLamports = bigintArrayFromLine(output, /deployed:\s*\[([^\]]*)\]/);
  return {
    roundId,
    checkpointId,
    deployedLamports,
    totalDeployedLamports: deployedLamports.reduce((sum, value) => sum + value, 0n),
    rewardsSol: stringFromLine(output, /rewards_sol:\s*(.+)/),
    rewardsOre: stringFromLine(output, /rewards_ore:\s*(.+)/),
  };
}

export class OreCliRunner {
  constructor(private readonly options: OreMinerOptions) {}

  async run(
    command: OreCliCommand,
    extraEnv: Record<string, string | undefined> = {},
    opts: { allowFailure?: boolean } = {},
  ): Promise<OreCommandResult> {
    const env = pruneEnv({
      ...process.env,
      KEYPAIR: this.options.keypairPath,
      RPC: this.options.rpcUrl,
      COMMAND: command,
      ...extraEnv,
    });

    if (this.options.dryRun) {
      console.log(`[ORE] dry run command=${command}`);
      return { command, stdout: "", stderr: "", exitCode: 0 };
    }

    const { executable, args } = this.commandInvocation();
    const result = await spawnWithOutput(executable, args, {
      cwd: this.options.oreRoot,
      env,
      timeoutMs: this.options.commandTimeoutMs,
      command,
    });

    if (result.stdout.trim()) {
      console.log(result.stdout.trim());
    }
    if (result.stderr.trim()) {
      console.error(result.stderr.trim());
    }

    if (result.exitCode !== 0 && !opts.allowFailure) {
      throw new Error(`ORE command ${command} failed with exit code ${result.exitCode}`);
    }

    return result;
  }

  private commandInvocation(): { executable: string; args: string[] } {
    const explicit = process.env.ORE_CLI_BIN;
    if (explicit) {
      return { executable: explicit, args: [] };
    }

    const debugBin = path.join(this.options.oreRoot, "target", "debug", "ore-cli");
    if (fs.existsSync(debugBin)) {
      return { executable: debugBin, args: [] };
    }

    return {
      executable: "cargo",
      args: [
        "run",
        "--quiet",
        "--manifest-path",
        path.join(this.options.oreRoot, "Cargo.toml"),
        "-p",
        "ore-cli",
      ],
    };
  }
}

async function configureAutomation(
  runner: OreCliRunner,
  options: OreMinerOptions,
): Promise<void> {
  await runner.run("automate", {
    ...amountEnv(options),
    ...depositEnv(options),
    ...feeEnv(options),
    EXECUTOR: options.executor ?? PERMISSIONLESS_EXECUTOR,
    STRATEGY: options.strategy,
    RELOAD: options.reload ? "true" : "false",
    ...maskEnv(options),
  });
}

function validateOptions(options: OreMinerOptions): void {
  validateCommonOptions(options);

  if (options.setupAutomation && !hasAmount(options)) {
    throw new Error("ORE automation setup requires --ore-amount-sol or --ore-amount-lamports");
  }
  if (options.setupAutomation && !hasDeposit(options)) {
    throw new Error("ORE automation setup requires --ore-deposit-sol or --ore-deposit-lamports");
  }
  if (!hasAmount(options)) {
    throw new Error(
      "ORE deploy requires --ore-amount-sol or --ore-amount-lamports. For existing random/preferred automation, use --ore-amount-lamports 0 as a placeholder.",
    );
  }
  if (
    !options.setupAutomation &&
    !options.authority &&
    !options.deployAll &&
    !hasSquareSelection(options)
  ) {
    throw new Error(
      "Direct ORE mining requires --ore-square, --ore-squares, --ore-mask, or explicit --ore-deploy-all.",
    );
  }
  if (
    options.strategy === "discretionary" &&
    !options.deployAll &&
    !hasSquareSelection(options)
  ) {
    throw new Error("Discretionary ORE automation requires a square selection or --ore-deploy-all");
  }
}

function validateCommonOptions(options: OreMinerOptions): void {
  if (!options.keypairPath) {
    throw new Error("ORE miner requires --ore-keypair or ORE_KEYPAIR/KEYPAIR");
  }
  if (!fs.existsSync(options.keypairPath)) {
    throw new Error(`ORE keypair file not found: ${options.keypairPath}`);
  }
  if (!fs.existsSync(path.join(options.oreRoot, "Cargo.toml"))) {
    throw new Error(`ORE root does not look like a Cargo workspace: ${options.oreRoot}`);
  }
}

function selectDeployCommand(options: OreMinerOptions): OreCliCommand {
  return hasSquareSelection(options) ? "deploy_mask" : "deploy_all";
}

function deployEnv(options: OreMinerOptions): Record<string, string | undefined> {
  return {
    ...amountEnv(options),
    ...authorityEnv(options),
    ...maskEnv(options),
  };
}

function amountEnv(options: OreMinerOptions): Record<string, string | undefined> {
  return options.amountLamports !== undefined
    ? { AMOUNT: options.amountLamports }
    : { AMOUNT_SOL: options.amountSol };
}

function depositEnv(options: OreMinerOptions): Record<string, string | undefined> {
  return options.depositLamports !== undefined
    ? { DEPOSIT: options.depositLamports }
    : { DEPOSIT_SOL: options.depositSol };
}

function feeEnv(options: OreMinerOptions): Record<string, string | undefined> {
  return options.feeLamports !== undefined
    ? { FEE: options.feeLamports }
    : { FEE_SOL: options.feeSol };
}

function authorityEnv(options: OreMinerOptions): Record<string, string | undefined> {
  return { AUTHORITY: options.authority };
}

function maskEnv(options: OreMinerOptions): Record<string, string | undefined> {
  if (options.mask !== undefined) {
    return { MASK: options.mask };
  }
  if (options.square !== undefined) {
    return { SQUARE: options.square };
  }
  if (options.squares !== undefined) {
    return { SQUARES: options.squares };
  }
  if (options.numSquares !== undefined) {
    return { NUM_SQUARES: options.numSquares };
  }
  return {};
}

function hasAmount(options: OreMinerOptions): boolean {
  return options.amountLamports !== undefined || options.amountSol !== undefined;
}

function hasDeposit(options: OreMinerOptions): boolean {
  return options.depositLamports !== undefined || options.depositSol !== undefined;
}

function hasSquareSelection(options: OreMinerOptions): boolean {
  return (
    options.mask !== undefined ||
    options.square !== undefined ||
    options.squares !== undefined
  );
}

function spawnWithOutput(
  executable: string,
  args: string[],
  opts: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    timeoutMs: number;
    command: OreCliCommand;
  },
): Promise<OreCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: opts.cwd,
      env: opts.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`ORE command ${opts.command} timed out after ${opts.timeoutMs}ms`));
    }, opts.timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({
        command: opts.command,
        stdout,
        stderr,
        exitCode,
      });
    });
  });
}

function pruneEnv(env: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const pruned: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      pruned[key] = value;
    }
  }
  return pruned;
}

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function firstEnv(env: EnvSource, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value !== undefined && value !== "") {
      return value;
    }
  }
  return undefined;
}

function boolEnv(env: EnvSource, name: string, defaultValue: boolean): boolean {
  const value = env[name];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  const normalized = value.toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean env var ${name}=${value}`);
}

function numberOption(
  args: string[],
  env: EnvSource,
  flag: string,
  envName: string,
  defaultValue: number,
): number {
  const value = flagValue(args, flag) ?? firstEnv(env, envName);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric option ${flag}/${envName}: ${value}`);
  }
  return parsed;
}

function parseStrategy(value: string): OreStrategy {
  const normalized = value.toLowerCase();
  if (normalized === "0") {
    return "random";
  }
  if (normalized === "1") {
    return "preferred";
  }
  if (normalized === "2") {
    return "discretionary";
  }
  if (normalized === "random" || normalized === "preferred" || normalized === "discretionary") {
    return normalized;
  }
  throw new Error(`Invalid ORE strategy: ${value}`);
}

function numberFromLine(output: string, pattern: RegExp): number | undefined {
  const match = output.match(pattern);
  return match ? Number(match[1]) : undefined;
}

function stringFromLine(output: string, pattern: RegExp): string | undefined {
  const match = output.match(pattern);
  return match ? match[1].trim() : undefined;
}

function bigintArrayFromLine(output: string, pattern: RegExp): bigint[] {
  const match = output.match(pattern);
  if (!match) {
    return [];
  }
  return match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => BigInt(part));
}

function resolveTilde(value: string): string {
  if (!value.startsWith("~")) {
    return value;
  }
  return path.join(process.env.HOME || "", value.slice(1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
