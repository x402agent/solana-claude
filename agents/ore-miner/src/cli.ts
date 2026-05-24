/**
 * cli.ts — Executor that wraps the ore-master CLI binary.
 *
 * The ore-master CLI binary accepts env-var-driven commands and handles
 * keypair loading, transaction building, and submission.
 *
 * Falls back to a helpful error if the binary hasn't been compiled yet.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve ore-master CLI binary relative to this file
const ORE_CLI_PATH = path.resolve(
  __dirname,
  '../../../../ore-master/target/release/ore-cli',
);

export interface CliResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

export function isOreCLIAvailable(): boolean {
  return existsSync(ORE_CLI_PATH);
}

export async function runOreCLI(
  command: string,
  extraEnv: Record<string, string> = {},
): Promise<CliResult> {
  if (!isOreCLIAvailable()) {
    return {
      success: false,
      stdout: '',
      stderr: [
        `ore-cli binary not found at: ${ORE_CLI_PATH}`,
        'Build with: cd ore-master && cargo build --release',
      ].join('\n'),
    };
  }

  const rpc = process.env['RPC'] ?? process.env['HELIUS_RPC_URL'];
  if (!rpc) {
    return {
      success: false,
      stdout: '',
      stderr: 'RPC env var required (set RPC or HELIUS_RPC_URL)',
    };
  }

  const keypair = process.env['KEYPAIR'];
  if (!keypair) {
    return {
      success: false,
      stdout: '',
      stderr: 'KEYPAIR env var required (path to keypair JSON file)',
    };
  }

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    COMMAND: command,
    RPC: rpc,
    KEYPAIR: keypair,
    ...extraEnv,
  };

  try {
    const { stdout, stderr } = await execFileAsync(ORE_CLI_PATH, [], {
      env,
      timeout: 60_000,
    });
    return { success: true, stdout, stderr };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      success: false,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message ?? String(err),
    };
  }
}

export async function deployToSquares(
  amountLamports: bigint,
  squares: number[],
): Promise<CliResult> {
  // Build SQUARES env var (comma-separated square indices)
  const squaresStr = squares.join(',');
  return runOreCLI('deploy_mask', {
    AMOUNT: amountLamports.toString(),
    SQUARES: squaresStr,
  });
}

export async function claimRewards(): Promise<CliResult> {
  return runOreCLI('claim');
}

export async function checkpointMiner(): Promise<CliResult> {
  return runOreCLI('checkpoint');
}

export async function observeBoard(): Promise<CliResult> {
  return runOreCLI('board');
}

export async function observeMiner(authority?: string): Promise<CliResult> {
  const extra: Record<string, string> = {};
  if (authority) extra['AUTHORITY'] = authority;
  return runOreCLI('miner', extra);
}

export async function observeRound(id: bigint): Promise<CliResult> {
  return runOreCLI('round', { ID: id.toString() });
}
