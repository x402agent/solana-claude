import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { requireKeypair } from '../identity/wallet.js';
import {
  ORE_AUTOMATION_STRATEGY_ID,
  ORE_MASTER_DIR,
  PERMISSIONLESS_ORE_EXECUTOR,
  solToLamports,
  type OreAutomationStrategy,
} from './constants.js';

export type OreReadCommand =
  | 'automations'
  | 'automation'
  | 'board'
  | 'clock'
  | 'config'
  | 'keys'
  | 'miner'
  | 'round'
  | 'treasury';

export type OreWriteCommand =
  | 'automate'
  | 'checkpoint'
  | 'checkpoint_all'
  | 'claim'
  | 'close_all'
  | 'deploy'
  | 'deploy_all'
  | 'reset';

export type OreCommand = OreReadCommand | OreWriteCommand;

export interface OreCliResult {
  command: OreCommand;
  stdout: string;
  stderr: string;
  code: number;
  ms: number;
}

export interface OreCliOptions {
  command: OreCommand;
  rpcUrl: string;
  env?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

export interface OreAutomateInput {
  rpcUrl: string;
  amountSol: number;
  depositSol?: number;
  executor?: string;
  feeSol?: number;
  mask?: number;
  strategy?: OreAutomationStrategy;
  reload?: boolean;
  timeoutMs?: number;
}

export interface OreDeployInput {
  rpcUrl: string;
  amountSol: number;
  square?: number;
  allSquares?: boolean;
  timeoutMs?: number;
}

export async function runOreCli(options: OreCliOptions): Promise<OreCliResult> {
  if (!fs.existsSync(ORE_MASTER_DIR)) {
    throw new Error(`ORE source not found at ${ORE_MASTER_DIR}`);
  }

  const started = Date.now();
  const tempKeypair = writeTempKeypair();
  const env = {
    ...process.env,
    KEYPAIR: tempKeypair.file,
    RPC: options.rpcUrl,
    COMMAND: options.command,
    ...stringifyEnv(options.env ?? {}),
  };

  try {
    const result = await spawnBuffered(
      'cargo',
      ['run', '-q', '-p', 'ore-cli'],
      {
        cwd: ORE_MASTER_DIR,
        env,
        timeoutMs: options.timeoutMs ?? 120_000,
      },
    );

    return {
      command: options.command,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      code: result.code,
      ms: Date.now() - started,
    };
  } finally {
    fs.rmSync(tempKeypair.dir, { recursive: true, force: true });
  }
}

export async function inspectOre(command: OreReadCommand, rpcUrl: string, env?: OreCliOptions['env']) {
  return runOreCli({ command, rpcUrl, env });
}

export async function configureOreAutomation(input: OreAutomateInput): Promise<OreCliResult> {
  return runOreCli({
    command: 'automate',
    rpcUrl: input.rpcUrl,
    timeoutMs: input.timeoutMs,
    env: {
      AMOUNT: solToLamports(input.amountSol),
      DEPOSIT: solToLamports(input.depositSol ?? 0),
      EXECUTOR: input.executor ?? PERMISSIONLESS_ORE_EXECUTOR,
      FEE: solToLamports(input.feeSol ?? 0),
      MASK: input.mask ?? 1,
      STRATEGY: ORE_AUTOMATION_STRATEGY_ID[input.strategy ?? 'random'],
      RELOAD: input.reload ?? true,
    },
  });
}

export async function deployOre(input: OreDeployInput): Promise<OreCliResult> {
  if (input.allSquares) {
    return runOreCli({
      command: 'deploy_all',
      rpcUrl: input.rpcUrl,
      timeoutMs: input.timeoutMs,
      env: { AMOUNT: solToLamports(input.amountSol) },
    });
  }

  const square = input.square ?? 0;
  if (!Number.isInteger(square) || square < 0 || square > 24) {
    throw new Error(`ORE square must be an integer from 0 to 24. Got: ${square}`);
  }

  return runOreCli({
    command: 'deploy',
    rpcUrl: input.rpcUrl,
    timeoutMs: input.timeoutMs,
    env: {
      AMOUNT: solToLamports(input.amountSol),
      SQUARE: square,
    },
  });
}

export async function claimOre(rpcUrl: string): Promise<OreCliResult> {
  return runOreCli({ command: 'claim', rpcUrl });
}

export async function checkpointOre(rpcUrl: string, authority?: string): Promise<OreCliResult> {
  return runOreCli({ command: 'checkpoint', rpcUrl, env: { AUTHORITY: authority } });
}

function writeTempKeypair(): { dir: string; file: string } {
  const keypair = requireKeypair();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'openclawd-ore-'));
  const file = path.join(dir, 'keypair.json');
  fs.writeFileSync(file, JSON.stringify(Array.from(keypair.secretKey)), { mode: 0o600 });
  return { dir, file };
}

function stringifyEnv(input: Record<string, string | number | boolean | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) out[key] = String(value);
  }
  return out;
}

function spawnBuffered(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number },
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`ORE command timed out after ${options.timeoutMs}ms`));
    }, options.timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`ORE command failed (${code})\n${stderr || stdout}`));
      }
    });
  });
}
