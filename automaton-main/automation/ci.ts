/**
 * automaton-main/automation/ci.ts — CI/CD pipeline
 *
 * Runs the full quality gate used in automation:
 *   1. build automaton-main runtime and dashboard
 *   2. run automaton-main tests
 *
 * Invoked by:
 *   npm run automation:ci
 *   bash automaton-main/automation/leviathan.sh --ci
 *   npx tsx automaton-main/automation/index.ts --ci
 */

import { execSync } from 'node:child_process';
import { join } from 'node:path';
import chalk from 'chalk';

const GREEN  = chalk.hex('#14F195');
const RED    = chalk.red;
const REPO_ROOT = join(import.meta.dirname, '..', '..');

export interface CiOptions {
  quiet?: boolean;
}

type Step = { label: string; cmd: string };

const STEPS: Step[] = [
  { label: 'build', cmd: 'npm run automaton:build' },
  { label: 'test',  cmd: 'npm run automaton:test'  },
];

export async function runCi(opts: CiOptions = {}): Promise<void> {
  const { quiet = false } = opts;

  if (!quiet) {
    console.log(chalk.bold('\n  automaton-main/automation/ci.ts — CI pipeline\n'));
  }

  const results: Array<{ label: string; ok: boolean; ms: number }> = [];

  for (const s of STEPS) {
    const t0 = Date.now();
    let passed = false;
    try {
      execSync(s.cmd, {
        stdio: quiet ? 'pipe' : 'inherit',
        encoding: 'utf8',
        cwd: REPO_ROOT,
      });
      passed = true;
    } catch {
      // fall through
    }
    const ms = Date.now() - t0;
    results.push({ label: s.label, ok: passed, ms });

    const icon = passed ? GREEN('✓') : RED('✗');
    console.log(`  ${icon} ${s.label.padEnd(12)} ${chalk.dim(`${ms}ms`)}`);

    if (!passed) {
      console.error(RED(`\n  CI failed at step: ${s.label}\n`));
      process.exit(1);
    }
  }

  const total = results.reduce((acc, r) => acc + r.ms, 0);
  console.log(`\n  ${GREEN('✓')} All CI checks passed ${chalk.dim(`(${total}ms)`)}`);
}
