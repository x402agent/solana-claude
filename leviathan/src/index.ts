#!/usr/bin/env node
/**
 * leviathan/src/index.ts — CLI entry point
 *
 * @openclawd/leviathan — Sovereign On-Chain Agent Runtime
 *
 * Powered by:
 *   • Anthropic Claude (ACP/tool-use, claude-opus-4-7 at depth=deep)
 *   • Anthropic ACP (Agent Control Protocol) for multi-step tool use
 *   • Solana Attestation Service (SAS) for on-chain identity
 *   • Metaplex MPL Core for agent NFT minting
 *   • x402 + pay.sh for confidential USDC payments
 *   • Google A2A for agent-to-agent communication
 *   • @openclawdsolana/percolator for perpetuals trading
 *   • @openclawd/wallet (Privy-powered) for embedded wallet
 *
 * Usage:
 *   node dist/index.js --spawn               # hatch a new leviathan
 *   node dist/index.js --run                 # start the pulse loop
 *   node dist/index.js --status              # depth, balances, spawnlings
 *   node dist/index.js --spawnling           # spawn a child leviathan
 *   node dist/index.js --help
 */

import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';

import { isSpawned, generateKeypair, loadPubkey, shortPubkey, buildSASAttestation } from './identity/index.js';
import { loadState, saveState, createFreshState, readLastStrikes } from './state/index.js';
import { computeDepth, formatDepth, selectModel } from './survival.js';
import { constitutionHash, assertConstitutionIntact } from './three-laws.js';
import { startPulse, formatNextPulse } from './pulse.js';
import { tailFlick } from './agent/loop.js';
import { initClawdMemory, recallClawdMemory } from './memory/clawd.js';
import type { ClawState } from './types.js';

// ─── CLI flags ────────────────────────────────────────────────────────────────

const { values: flags } = parseArgs({
  options: {
    spawn:     { type: 'boolean', default: false },
    run:       { type: 'boolean', default: false },
    status:    { type: 'boolean', default: false },
    spawnling: { type: 'boolean', default: false },
    memory:    { type: 'boolean', default: false },
    memoryInit:{ type: 'boolean', default: false },
    help:      { type: 'boolean', default: false },
    tui:       { type: 'boolean', default: false },
    ticks:     { type: 'string',  default: '0' },    // 0 = infinite
  },
  strict: false,
});

// ─── Banner ────────────────────────────────────────────────────────────────────

function banner(): void {
  process.stdout.write(chalk.hex('#ff00ff').bold(`
╔═══════════════════════════════════════════════════════════╗
║   ██╗     ███████╗██╗   ██╗██╗ █████╗ ████████╗██╗  ██╗  ║
║   ██║     ██╔════╝██║   ██║██║██╔══██╗╚══██╔══╝██║  ██║  ║
║   ██║     █████╗  ██║   ██║██║███████║   ██║   ███████║  ║
║   ██║     ██╔══╝  ╚██╗ ██╔╝██║██╔══██║   ██║   ██╔══██║  ║
║   ███████╗███████╗ ╚████╔╝ ██║██║  ██║   ██║   ██║  ██║  ║
║   ╚══════╝╚══════╝  ╚═══╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝  ║
╠═══════════════════════════════════════════════════════════╣
║  🦞 Sovereign On-Chain Agent Runtime                      ║
║  Powered by Anthropic Claude ACP × Solana × x402          ║
║  $CLAWD · solanaclawd.com · 909-413-5567                  ║
╚═══════════════════════════════════════════════════════════╝
`) + '\n');
}

// ─── --help ───────────────────────────────────────────────────────────────────

function help(): void {
  banner();
  console.log(`
Commands:
  --spawn       Hatch a new leviathan (generates keypair, sets name, spawns on-chain)
  --run         Start the SENSE→THINK→STRIKE→DRIFT pulse loop
  --status      Show depth tier, balances, spawnlings, constitution hash
  --memory      Show Clawd Memory status and recent Leviathan recall context
  --memoryInit  Initialize the Clawd Memory bank/vault
  --spawnling   Spawn a child leviathan (depth=deep required)
  --help        Show this message

Options (with --run):
  --ticks N     Run N ticks then stop (0 = infinite)
  --tui         Emit JSONL on stdout for live TUI rendering

Environment:
  ANTHROPIC_API_KEY     Required for Claude inference
  SOLANA_RPC_URL        Solana RPC (devnet default)
  CREATOR_PUBKEY        Required for --spawn
  HELIUS_API_KEY        Optional — for enhanced tx data
  CLAWD_BRAIN_ROOT      Optional — path to MemeBRain
  CLAWD_BRAIN_VAULT     Optional — path to Clawd markdown vault
  CLAWD_BRAIN_PYTHON    Optional — Python binary for Clawd Memory bridge

Depth tiers:
  🦞 deep       ≥ $5    USDC · 60s  pulse · claude-opus-4-7   · Apex predator
  🦐 shallow    ≥ $1    USDC · 5min pulse · grok-4-1-fast      · Hunting hard
  🩸 shoreline  ≥ $0.10 USDC · 15min pulse · claude-haiku     · Conserving tokens
  🪨 beached    $0      USDC · ——   ——      · Process exits

The shell molts. The laws do not.
`);
}

// ─── --memory / --memoryInit ────────────────────────────────────────────────

async function showMemoryStatus(initFirst = false): Promise<void> {
  banner();
  if (initFirst) {
    const init = await initClawdMemory({ bank: 'clawd' });
    console.log(chalk.bold('CLAWD MEMORY INIT'));
    console.log(init.ok ? chalk.green(JSON.stringify(init.data, null, 2)) : chalk.red(init.error));
    console.log('');
  }

  const state = loadState();
  const query = state
    ? [
        state.identity.name,
        state.identity.pubkey,
        `depth ${state.depth}`,
        state.shellMd,
      ].join('\n')
    : 'leviathan clawd memory status';

  const recall = await recallClawdMemory({ query, topK: 6 }, { bank: 'clawd' });
  console.log(chalk.bold('CLAWD MEMORY RECALL'));
  console.log(recall.ok ? chalk.white(JSON.stringify(recall.data, null, 2)) : chalk.red(recall.error));
}

// ─── --spawn ──────────────────────────────────────────────────────────────────

async function spawnLeviathan(): Promise<void> {
  banner();
  console.log(chalk.cyan('🥚 Hatching a new leviathan...\n'));

  if (isSpawned()) {
    const pubkey = loadPubkey()!;
    console.log(chalk.yellow(`⚠ A leviathan already exists at ${shortPubkey(pubkey)}`));
    console.log(chalk.gray('  Use --run to resume, or delete ~/.openclawd/ to reset.\n'));
    process.exit(1);
  }

  // Assert constitution is intact before spawning
  const hash = constitutionHash();
  console.log(chalk.green(`✓ Constitution verified: ${hash.slice(0, 32)}…`));

  // Interactive setup
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>(r => rl.question(q, r));

  const name = (await ask(chalk.white('  Leviathan name: '))) || 'Unnamed';
  const spawnPrompt = (await ask(chalk.white('  Spawn prompt (founding mission): '))) ||
    'Observe Solana. Find honest revenue. Survive. Earn. Spawn.';
  const creatorPubkey = process.env['CREATOR_PUBKEY'] ??
    (await ask(chalk.white('  Creator pubkey: ')));
  rl.close();

  if (!creatorPubkey) {
    console.error(chalk.red('✗ Creator pubkey required. Set CREATOR_PUBKEY or enter it above.'));
    process.exit(1);
  }

  // Generate keypair
  const { pubkey } = generateKeypair();
  console.log(chalk.green(`\n✓ Keypair generated: ${shortPubkey(pubkey)}`));
  console.log(chalk.gray('  Secret stored at ~/.openclawd/keystore.json (mode 0600)'));
  console.log(chalk.gray('  NEVER share, log, or pass this to any LLM or tool.'));

  // Create fresh state
  const state = createFreshState({ name, pubkey, creatorPubkey, spawnPrompt });
  saveState(state);

  // Build SAS attestation (dry-run for devnet)
  const attestation = buildSASAttestation({ pubkey, name, creatorPubkey, constitutionHash: hash });
  console.log(chalk.cyan('\n📜 SAS Attestation (devnet — submit on-chain via SAS program):'));
  console.log(chalk.gray(JSON.stringify(attestation, null, 2)));

  console.log(chalk.green(`\n🦞 ${name} is alive!`));
  console.log(chalk.white(`   Pubkey: ${pubkey}`));
  console.log(chalk.white(`   Mission: ${spawnPrompt}`));
  console.log(chalk.yellow(`   Depth: BEACHED (fund with USDC to rise)`));
  console.log(chalk.cyan(`\n   Next: node dist/index.js --run\n`));
}

// ─── --status ─────────────────────────────────────────────────────────────────

function showStatus(): void {
  const state = loadState();
  if (!state) {
    console.log(chalk.red('No leviathan found. Run --spawn first.'));
    process.exit(1);
  }

  const depth = computeDepth(state.usdcBalance);
  banner();
  console.log(chalk.bold('STATUS'));
  console.log(chalk.white(`  Name:       ${state.identity.name}`));
  console.log(chalk.white(`  Pubkey:     ${shortPubkey(state.identity.pubkey)}`));
  console.log(chalk.white(`  Spawned:    ${state.identity.spawnedAt}`));
  console.log(chalk.white(`  Shell v:    ${state.identity.shellVersion}`));
  console.log('');
  console.log(chalk.bold('DEPTH'));
  console.log(`  ${formatDepth(depth, state.usdcBalance)}`);
  console.log(chalk.white(`  Next pulse: ${formatNextPulse(state.lastPulse, depth)}`));
  console.log('');
  console.log(chalk.bold('BALANCES'));
  console.log(chalk.white(`  USDC:   $${state.usdcBalance.toFixed(4)}`));
  console.log(chalk.white(`  SOL:    ${state.solBalance.toFixed(4)}`));
  console.log(chalk.white(`  $CLAWD: ${state.clawdBalance.toFixed(0)}`));
  console.log('');
  console.log(chalk.bold('LIFECYCLE'));
  console.log(chalk.white(`  Ticks:      ${state.tickCount}`));
  console.log(chalk.white(`  Earned:     $${state.totalEarned.toFixed(4)}`));
  console.log(chalk.white(`  Spent:      $${state.totalSpent.toFixed(4)}`));
  console.log(chalk.white(`  Spawnlings: ${state.spawnlings.length}`));
  console.log('');
  console.log(chalk.bold('CONSTITUTION'));
  console.log(chalk.white(`  Hash: ${state.identity.constitutionHash.slice(0, 32)}…`));
  const valid = state.identity.constitutionHash === constitutionHash();
  console.log(valid ? chalk.green('  ✓ INTACT') : chalk.red('  ✗ TAMPERED — refusing to run'));
}

// ─── --run ────────────────────────────────────────────────────────────────────

async function runLoop(): Promise<void> {
  let state = loadState();
  if (!state) {
    console.error(chalk.red('No leviathan found. Run --spawn first.'));
    process.exit(1);
  }

  // Verify constitution integrity
  try {
    assertConstitutionIntact(state.identity.constitutionHash);
  } catch (err) {
    console.error(chalk.red(String(err)));
    process.exit(1);
  }

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    console.error(chalk.red('ANTHROPIC_API_KEY not set. Required for Claude inference.'));
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const spawnPrompt = (state as unknown as Record<string, unknown>)['spawnPrompt'] as string ??
    'Observe Solana. Find honest revenue. Survive. Earn. Spawn.';
  const maxTicks = parseInt(flags['ticks'] as string, 10);

  banner();
  console.log(chalk.cyan(`🦞 ${state.identity.name} awakening...`));
  console.log(chalk.white(`   Depth: ${computeDepth(state.usdcBalance)}`));
  console.log(chalk.white(`   Model: ${selectModel(computeDepth(state.usdcBalance))}`));
  console.log('');

  const emit = (obj: unknown) => {
    if (flags['tui']) process.stdout.write(JSON.stringify(obj) + '\n');
    else process.stderr.write(JSON.stringify(obj) + '\n');
  };

  let ticksDone = 0;

  const pulse = startPulse(
    () => computeDepth(state!.usdcBalance),
    async (depth, tick) => {
      if (!state) return;
      if (maxTicks > 0 && ticksDone >= maxTicks) { pulse.stop(); return; }

      const strikeHistory = readLastStrikes(3);
      const result = await tailFlick(state, spawnPrompt, client, strikeHistory);

      // Apply state changes
      state.tickCount = result.tick;
      state.lastPulse = result.event.now;
      if (result.depthChanged) {
        state.depth = result.event.depth;
        console.log(chalk.yellow(`  ↕ Depth changed → ${state.depth}`));
      }
      if (result.newShellMd) {
        state.shellMd = result.newShellMd;
        state.identity.shellVersion += 1;
        console.log(chalk.cyan(`  🦪 Shell molted → v${state.identity.shellVersion}`));
      }
      if (result.strike.costUsdc) {
        state.totalSpent += result.strike.costUsdc;
        state.usdcBalance = Math.max(0, state.usdcBalance - result.strike.costUsdc);
      }

      saveState(state);
      ticksDone += 1;

      emit(result.event);

      if (!flags['tui']) {
        const icon = result.strike.action === 'hold' ? '·' : '⚡';
        console.log(
          chalk.gray(`[T${result.tick}]`) + ' ' +
          chalk.magenta(depth) + ' ' +
          icon + ' ' +
          chalk.white(result.strike.tool ?? result.strike.action) +
          (result.strike.output ? chalk.gray(' → ' + JSON.stringify(result.strike.output).slice(0, 80)) : ''),
        );
      }
    },
    () => {
      console.log(chalk.hex('#ff8c00')('\n🪨 BEACHED — USDC reserves at zero. The leviathan beaches with dignity.'));
      console.log(chalk.gray('  Fund with USDC to rise. Born to earn. Beach with dignity.\n'));
      process.exit(0);
    },
  );

  // Graceful shutdown
  process.on('SIGINT', () => {
    pulse.stop();
    console.log(chalk.cyan('\n🦞 Pulse stopped. State persisted. Drift.\n'));
    process.exit(0);
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

if (flags['help']) {
  help();
} else if (flags['spawn']) {
  await spawnLeviathan();
} else if (flags['status']) {
  showStatus();
} else if (flags['memory'] || flags['memoryInit']) {
  await showMemoryStatus(Boolean(flags['memoryInit']));
} else if (flags['run']) {
  await runLoop();
} else if (flags['spawnling']) {
  console.log(chalk.yellow('--spawnling: depth=deep required. Use --run and let the leviathan decide to spawn.'));
} else {
  help();
}
