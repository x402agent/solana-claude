import { spawn } from 'node:child_process';
import {
  DEFAULT_PAY_SPEND_POLICY,
  evaluatePaySpend,
  makePaySpendPolicy,
  recordPaySpend,
  type PayRunLedger,
  type PaySpendPolicy,
  type PaySpendRequest,
} from './pay-policy.js';

export interface PayCallInput extends PaySpendRequest {
  body?: unknown;
  headers?: Record<string, string>;
  payBinary?: string;
  dryRun?: boolean;
  timeoutMs?: number;
}

export interface PayCallResult {
  ok: boolean;
  status: 'planned' | 'paid' | 'refused' | 'failed';
  command: string[];
  stdout: string;
  stderr: string;
  policyReasons: string[];
  ledger: PayRunLedger;
}

export class PayAutonomyClient {
  readonly policy: PaySpendPolicy;
  private ledger: PayRunLedger;

  constructor(policy: Partial<PaySpendPolicy> = {}, ledger: PayRunLedger = { spentUsd: 0, calls: 0 }) {
    this.policy = makePaySpendPolicy(policy);
    this.ledger = ledger;
  }

  getLedger(): PayRunLedger {
    return { ...this.ledger };
  }

  plan(input: PaySpendRequest) {
    return evaluatePaySpend(this.policy, input, this.ledger);
  }

  async call(input: PayCallInput): Promise<PayCallResult> {
    const decision = this.plan(input);
    const command = buildPayCurlCommand(this.policy, input);

    if (!decision.ok) {
      return {
        ok: false,
        status: 'refused',
        command,
        stdout: '',
        stderr: '',
        policyReasons: decision.reasons,
        ledger: this.getLedger(),
      };
    }

    if (input.dryRun ?? true) {
      return {
        ok: true,
        status: 'planned',
        command,
        stdout: '',
        stderr: '',
        policyReasons: [],
        ledger: this.getLedger(),
      };
    }

    const run = await execFile(command[0], command.slice(1), input.timeoutMs ?? 60_000);
    if (run.code === 0) {
      this.ledger = recordPaySpend(this.ledger, input);
    }

    return {
      ok: run.code === 0,
      status: run.code === 0 ? 'paid' : 'failed',
      command,
      stdout: run.stdout,
      stderr: run.stderr,
      policyReasons: [],
      ledger: this.getLedger(),
    };
  }
}

export function buildPayCurlCommand(policy: PaySpendPolicy, input: PayCallInput): string[] {
  const command = [input.payBinary ?? 'pay'];

  if (policy.mode === 'sandbox') {
    command.push('--sandbox');
  }

  command.push('curl', '-fsSL', '-X', (input.method ?? 'GET').toUpperCase());

  for (const [key, value] of Object.entries(input.headers ?? {})) {
    command.push('-H', `${key}: ${value}`);
  }

  if (input.body !== undefined) {
    command.push('-H', 'content-type: application/json', '-d', JSON.stringify(input.body));
  }

  command.push(input.url);
  return command;
}

export { DEFAULT_PAY_SPEND_POLICY, makePaySpendPolicy };

function execFile(bin: string, args: string[], timeoutMs: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      stderr += `\nTimed out after ${timeoutMs}ms`;
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: `${stderr}\n${err.message}` });
    });
  });
}
