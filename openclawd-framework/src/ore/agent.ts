import { Connection, PublicKey } from '@solana/web3.js';
import { getPubkey } from '../identity/wallet.js';
import { recordEvent } from '../state/database.js';
import { claimOre, configureOreAutomation, deployOre, inspectOre, checkpointOre, type OreCliResult } from './client.js';

export interface OreMiningPolicy {
  /** Actual transaction submission is disabled unless this is true. */
  execute: boolean;
  /** SOL to deploy per autonomous round. */
  deploySol: number;
  /** Stop deploying after this much SOL has been committed during this process. */
  maxSessionDeploySol: number;
  /** Keep at least this much SOL in the signer wallet for rent and fees. */
  minSolReserve: number;
  /** Poll interval for autonomous operation. */
  intervalMs: number;
  /** Optional fixed square. Otherwise the agent rotates deterministically across 25 squares. */
  square?: number;
  /** Run claim before deploy when true. */
  claimBeforeDeploy: boolean;
  /** Run checkpoint before deploy when true. */
  checkpointBeforeDeploy: boolean;
}

export interface OreMiningAgentInput {
  rpcUrl: string;
  policy?: Partial<OreMiningPolicy>;
}

const DEFAULT_POLICY: OreMiningPolicy = {
  execute: false,
  deploySol: 0.001,
  maxSessionDeploySol: 0.01,
  minSolReserve: 0.02,
  intervalMs: 60_000,
  claimBeforeDeploy: true,
  checkpointBeforeDeploy: true,
};

export class OreMiningAgent {
  readonly rpcUrl: string;
  readonly policy: OreMiningPolicy;
  private deployedThisSession = 0;
  private tick = 0;

  constructor(input: OreMiningAgentInput) {
    this.rpcUrl = input.rpcUrl;
    this.policy = { ...DEFAULT_POLICY, ...(input.policy ?? {}) };
  }

  async status(): Promise<{ board: OreCliResult; miner: OreCliResult; treasury: OreCliResult }> {
    const [board, miner, treasury] = await Promise.all([
      inspectOre('board', this.rpcUrl),
      inspectOre('miner', this.rpcUrl),
      inspectOre('treasury', this.rpcUrl),
    ]);
    recordEvent('ore-status', { board: board.stdout, miner: miner.stdout, treasury: treasury.stdout });
    return { board, miner, treasury };
  }

  async configureAutomation(options?: {
    amountSol?: number;
    depositSol?: number;
    mask?: number;
    reload?: boolean;
  }): Promise<OreCliResult | { dryRun: true; command: string; env: Record<string, unknown> }> {
    const env = {
      amountSol: options?.amountSol ?? this.policy.deploySol,
      depositSol: options?.depositSol ?? this.policy.maxSessionDeploySol,
      mask: options?.mask ?? 1,
      reload: options?.reload ?? true,
    };
    if (!this.policy.execute) {
      recordEvent('ore-automation-dry-run', env);
      return { dryRun: true, command: 'automate', env };
    }
    const result = await configureOreAutomation({ rpcUrl: this.rpcUrl, ...env });
    recordEvent('ore-automation-configured', { stdout: result.stdout, stderr: result.stderr });
    return result;
  }

  async mineOnce(): Promise<OreCliResult | { dryRun: true; action: string; reason?: string; square?: number; amountSol?: number }> {
    const balanceSol = await this.signerSolBalance();
    const amountSol = this.policy.deploySol;
    const projectedDeploy = this.deployedThisSession + amountSol;

    if (projectedDeploy > this.policy.maxSessionDeploySol) {
      const reason = 'session deploy cap reached';
      recordEvent('ore-mine-skipped', { reason, deployedThisSession: this.deployedThisSession });
      return { dryRun: true, action: 'skip', reason };
    }
    if (balanceSol - amountSol < this.policy.minSolReserve) {
      const reason = 'min SOL reserve would be breached';
      recordEvent('ore-mine-skipped', { reason, balanceSol, amountSol, minSolReserve: this.policy.minSolReserve });
      return { dryRun: true, action: 'skip', reason };
    }

    const square = this.policy.square ?? this.nextSquare();
    if (!this.policy.execute) {
      recordEvent('ore-mine-dry-run', { square, amountSol, balanceSol });
      return { dryRun: true, action: 'deploy', square, amountSol };
    }

    if (this.policy.claimBeforeDeploy) {
      await claimOre(this.rpcUrl).catch((error: unknown) => {
        recordEvent('ore-claim-error', stringifyError(error));
      });
    }
    if (this.policy.checkpointBeforeDeploy) {
      await checkpointOre(this.rpcUrl).catch((error: unknown) => {
        recordEvent('ore-checkpoint-error', stringifyError(error));
      });
    }

    const result = await deployOre({ rpcUrl: this.rpcUrl, amountSol, square });
    this.deployedThisSession += amountSol;
    recordEvent('ore-mine-deploy', { square, amountSol, stdout: result.stdout, stderr: result.stderr });
    return result;
  }

  async runUntilStopped(signal?: AbortSignal): Promise<void> {
    while (!signal?.aborted) {
      await this.mineOnce();
      await sleep(this.policy.intervalMs, signal);
    }
  }

  private nextSquare(): number {
    const square = this.tick % 25;
    this.tick += 1;
    return square;
  }

  private async signerSolBalance(): Promise<number> {
    const pubkey = getPubkey();
    if (!pubkey) throw new Error('No leviathan keystore found. Run `openclawd --spawn` first.');
    const connection = new Connection(this.rpcUrl, 'confirmed');
    const lamports = await connection.getBalance(new PublicKey(pubkey), 'confirmed');
    return lamports / 1_000_000_000;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}
