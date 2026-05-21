#!/usr/bin/env node
import process from 'node:process';
import chalk from 'chalk';
import { remember, recall, forget, stats, getContext } from './memory.js';
import type { MemoryKind, MemoryOptions } from './types.js';

const BANNER = `
${chalk.cyan.bold('  ╔══════════════════════════════════════╗')}
${chalk.cyan.bold('  ║')} ${chalk.magenta.bold('  🦞  Clawd Memory  — cm CLI')}          ${chalk.cyan.bold('║')}
${chalk.cyan.bold('  ║')} ${chalk.gray('  local-first agent memory on Solana')} ${chalk.cyan.bold('║')}
${chalk.cyan.bold('  ╚══════════════════════════════════════╝')}
`;

const KIND_NAMES: MemoryKind[] = ['agent','research','signal','trade','protocol','wallet','perp','note'];

function usage(): void {
  console.log(BANNER);
  console.log(chalk.bold('Usage:'));
  console.log(`  ${chalk.cyan('cm init')}                        Initialize memory bank`);
  console.log(`  ${chalk.cyan('cm status')}                      Show memory stats`);
  console.log(`  ${chalk.cyan('cm remember <title> <content>')}  Store a memory`);
  console.log(`  ${chalk.cyan('cm recall <query>')}              Search memories`);
  console.log(`  ${chalk.cyan('cm context <query>')}             Get formatted context block`);
  console.log(`  ${chalk.cyan('cm forget <id>')}                 Delete a memory by ID`);
  console.log();
  console.log(chalk.bold('Flags:'));
  console.log(`  ${chalk.gray('--kind')}   one of: ${KIND_NAMES.join(', ')}`);
  console.log(`  ${chalk.gray('--bank')}   memory bank name (default: "default")`);
  console.log(`  ${chalk.gray('--top')}    number of results (default: 8)`);
  console.log(`  ${chalk.gray('--tags')}   comma-separated tags`);
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log(`  ${chalk.gray('cm remember "Solana RPC" "Use Helius for reliable RPC calls" --kind research')}`);
  console.log(`  ${chalk.gray('cm recall "helius rpc" --top 5')}`);
  console.log(`  ${chalk.gray('cm context "what do I know about wallets?"')}`);
}

function parseArgs(args: string[]): { cmd: string; pos: string[]; flags: Record<string, string> } {
  const [cmd = 'help', ...rest] = args;
  const pos: string[] = [];
  const flags: Record<string, string> = {};
  let i = 0;
  while (i < rest.length) {
    const arg = rest[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = rest[i + 1] && !rest[i + 1]!.startsWith('--') ? rest[++i]! : 'true';
      flags[key] = val;
    } else {
      pos.push(arg);
    }
    i++;
  }
  return { cmd, pos, flags };
}

function optsFromFlags(flags: Record<string, string>): MemoryOptions {
  return { bank: flags['bank'] };
}

async function main(): Promise<void> {
  const { cmd, pos, flags } = parseArgs(process.argv.slice(2));

  if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage();
    return;
  }

  if (cmd === 'init') {
    const bank = flags['bank'] ?? 'default';
    const s = stats({ bank });
    console.log(chalk.green(`✅  Memory bank "${bank}" ready`));
    console.log(chalk.gray(`    ${s.dbPath}`));
    console.log(chalk.gray(`    ${s.total} memories`));
    return;
  }

  if (cmd === 'status') {
    const bank = flags['bank'] ?? 'default';
    const s = stats({ bank });
    console.log(chalk.cyan.bold('\n  Memory Status'));
    console.log(chalk.gray(`  Bank    : `) + chalk.white(s.bank));
    console.log(chalk.gray(`  DB      : `) + chalk.white(s.dbPath));
    console.log(chalk.gray(`  Total   : `) + chalk.white(String(s.total)));
    console.log(chalk.gray(`  Working : `) + chalk.yellow(String(s.working)));
    console.log(chalk.gray(`  Episodic: `) + chalk.blue(String(s.episodic)));
    if (Object.keys(s.byKind).length > 0) {
      console.log(chalk.gray(`\n  By kind:`));
      for (const [k, n] of Object.entries(s.byKind)) {
        console.log(`    ${chalk.magenta(k.padEnd(10))} ${n}`);
      }
    }
    console.log();
    return;
  }

  if (cmd === 'remember') {
    const [title, ...contentParts] = pos;
    if (!title) { console.error(chalk.red('Usage: cm remember <title> <content> [--kind <kind>]')); process.exit(1); }
    const content = contentParts.join(' ') || title;
    const kind = (flags['kind'] as MemoryKind) ?? 'note';
    const tags = flags['tags'] ? flags['tags'].split(',').map((t) => t.trim()) : [];
    const entry = remember({ title, content, kind, tags }, optsFromFlags(flags));
    console.log(chalk.green(`✅  Stored: ${entry.id}`));
    console.log(chalk.gray(`   [${entry.kind}] ${entry.title}`));
    return;
  }

  if (cmd === 'recall') {
    const query = pos.join(' ');
    if (!query) { console.error(chalk.red('Usage: cm recall <query>')); process.exit(1); }
    const topK = flags['top'] ? parseInt(flags['top'], 10) : 8;
    const kind = flags['kind'] as MemoryKind | undefined;
    const result = recall({ query, topK, kind }, optsFromFlags(flags));
    if (result.entries.length === 0) {
      console.log(chalk.yellow(`  No memories found for "${query}"`));
      return;
    }
    console.log(chalk.cyan(`\n  ${result.entries.length} result(s) for "${query}":\n`));
    for (const e of result.entries) {
      console.log(`  ${chalk.bold(e.title)} ${chalk.gray(`[${e.kind}]`)} ${chalk.gray(e.id)}`);
      console.log(`  ${chalk.white(e.content.slice(0, 200))}${e.content.length > 200 ? chalk.gray('…') : ''}`);
      if (e.tags.length > 0) console.log(`  ${chalk.gray('tags:')} ${e.tags.join(', ')}`);
      console.log();
    }
    return;
  }

  if (cmd === 'context') {
    const query = pos.join(' ');
    if (!query) { console.error(chalk.red('Usage: cm context <query>')); process.exit(1); }
    const ctx = getContext(query, optsFromFlags(flags));
    if (!ctx) { console.log(chalk.yellow('  No context found.')); return; }
    console.log(ctx);
    return;
  }

  if (cmd === 'forget') {
    const id = pos[0];
    if (!id) { console.error(chalk.red('Usage: cm forget <memory-id>')); process.exit(1); }
    const ok = forget(id, optsFromFlags(flags));
    if (ok) console.log(chalk.green(`✅  Forgotten: ${id}`));
    else console.log(chalk.yellow(`  Not found: ${id}`));
    return;
  }

  console.error(chalk.red(`Unknown command: ${cmd}`));
  usage();
  process.exit(1);
}

main().catch((err) => {
  console.error(chalk.red('Error:'), err instanceof Error ? err.message : String(err));
  process.exit(1);
});
