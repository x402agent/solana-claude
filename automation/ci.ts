/**
 * automation/ci.ts — CI/CD pipeline
 *
 * Runs the full quality gate used in automation:
 *   1. typecheck (tsc --noEmit)
 *   2. lint      (biome check src/)
 *   3. build     (tsc -p tsconfig.build.json)
 *
 * Invoked by:
 *   npm run automation:ci
 *   bash automation/leviathan.sh --ci
 *   npx tsx automation/index.ts --ci
 */

import { execSync } from 'node:child_process';
import chalk from 'chalk';

const GREEN  = chalk.hex('#14F195');
const RED    = chalk.red;

export interface CiOptions {
  quiet?: boolean;
}

type Step = { label: string; cmd: string };

const STEPS: Step[] = [
  { label: 'typecheck', cmd: 'npm run typecheck' },
  { label: 'lint',      cmd: 'npm run lint'      },
  { label: 'build',     cmd: 'npm run build'     },
];

export async function runCi(opts: CiOptions = {}): Promise<void> {
  const { quiet = false } = opts;

  if (!quiet) {
    console.log(chalk.bold('\n  automation/ci.ts — CI pipeline\n'));
  }

  const results: Array<{ label: string; ok: boolean; ms: number }> = [];

  for (const s of STEPS) {
    const t0 = Date.now();
    let passed = false;
    try {
      execSync(s.cmd, { stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
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
