#!/usr/bin/env node
/**
 * ClawdRouter — The LLM Router Built for Autonomous Solana Agents
 *
 * Solana-native smart LLM routing with:
 * • 15-dimension request scoring (<1ms, fully local)
 * • 55+ models across 9 providers
 * • Ed25519 wallet-based authentication (no API keys)
 * • USDC micropayments via x402 protocol on Solana
 * • OpenAI-compatible API proxy on localhost:8402
 *
 * Part of the solana-clawd ecosystem
 * https://github.com/x402agent/solana-clawd
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { ClawdRouterConfig, RoutingProfile } from './types.js';
import { ClawdRouterProxy } from './proxy/server.js';
import { loadOrCreateWallet, formatWalletInfo, getBalance } from './wallet/solana.js';
import { MODEL_REGISTRY, formatModelTable } from './models/registry.js';
import { formatProfileTable } from './router/profiles.js';
import { getTierCostBreakdown } from './router/tiers.js';
import { scoreRequest } from './router/scorer.js';
import { CLAWD_TOKEN_MINT } from './token/clawd-gate.js';

// ── ASCII Banner ────────────────────────────────────────────────────

const BANNER = `
  ╔════════════════════════════════════════════════════════════════╗
  ║                                                                ║
  ║   🔀  ClawdRouter v0.1.0                                      ║
  ║   The LLM Router Built for Autonomous Solana Agents            ║
  ║                                                                ║
  ║   ⚡ 15-dimension scoring  •  <1ms routing  •  55+ models      ║
  ║   🔑 Solana wallet auth    •  💰 USDC x402  •  MIT licensed    ║
  ║                                                                ║
  ╚════════════════════════════════════════════════════════════════╝
`;

// ── Default Configuration ───────────────────────────────────────────

function getDefaultConfig(): ClawdRouterConfig {
  const openRouterApiKey = process.env['OPENROUTER_API_KEY'] ?? process.env['CLAWDROUTER_OPENROUTER_API_KEY'] ?? '';
  const openRouterEnabled =
    process.env['CLAWDROUTER_OPENROUTER_ENABLED'] === 'true' ||
    (process.env['CLAWDROUTER_OPENROUTER_ENABLED'] !== 'false' && openRouterApiKey.length > 0);

  return {
    port: parseInt(process.env['CLAWDROUTER_PORT'] ?? '8402', 10),
    profile: (process.env['CLAWDROUTER_PROFILE'] ?? 'auto') as RoutingProfile,
    solanaRpcUrl: process.env['CLAWDROUTER_SOLANA_RPC_URL'] ?? 'https://api.mainnet-beta.solana.com',
    network: (process.env['CLAWDROUTER_NETWORK'] ?? 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
    maxPerRequest: parseFloat(process.env['CLAWDROUTER_MAX_PER_REQUEST'] ?? '0.10'),
    maxPerSession: parseFloat(process.env['CLAWDROUTER_MAX_PER_SESSION'] ?? '5.00'),
    walletPath: join(homedir(), '.clawd', 'clawdrouter', 'wallet.json'),
    excludedModels: [],
    debug: process.env['CLAWDROUTER_DEBUG'] === 'true',
    upstreamUrl: process.env['CLAWDROUTER_UPSTREAM'] ?? 'https://api.blockrun.ai',
    clawdTokenMint: process.env['CLAWDROUTER_CLAWD_TOKEN_MINT'] ?? CLAWD_TOKEN_MINT,
    heliusApiKey: process.env['HELIUS_API_KEY'] ?? process.env['CLAWDROUTER_HELIUS_API_KEY'] ?? '',
    holderThresholds: {
      whale: parseFloat(process.env['CLAWDROUTER_WHALE_THRESHOLD'] ?? '1000000'),
      diamond: parseFloat(process.env['CLAWDROUTER_DIAMOND_THRESHOLD'] ?? '100000'),
      holder: parseFloat(process.env['CLAWDROUTER_HOLDER_THRESHOLD'] ?? '1000'),
    },
    openRouterApiKey,
    openRouterSiteTitle: process.env['CLAWDROUTER_OPENROUTER_SITE_TITLE'] ?? 'ClawdRouter',
    openRouterSiteUrl: process.env['CLAWDROUTER_OPENROUTER_SITE_URL'] ?? 'https://github.com/x402agent/solana-clawd',
    openRouterCategories: (process.env['CLAWDROUTER_OPENROUTER_CATEGORIES'] ?? 'cli-agent,cloud-agent').split(',').map(s => s.trim()),
    openRouterEnabled,
    x402PayTo: process.env['CLAWDROUTER_X402_PAY_TO'] ?? '',
    x402Price: process.env['CLAWDROUTER_X402_PRICE'] ?? '10000',
    x402Description: process.env['CLAWDROUTER_X402_DESCRIPTION'] ?? 'ClawdRouter access',
  };
}

// ── Load Excluded Models ────────────────────────────────────────────

async function loadExcludedModels(): Promise<string[]> {
  try {
    const path = join(homedir(), '.clawd', 'clawdrouter', 'exclude-models.json');
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ── CLI Entry Point ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  // Sub-commands
  if (command === 'doctor') {
    await runDoctor(args.slice(1));
    return;
  }

  if (command === 'models') {
    console.log(formatModelTable());
    return;
  }

  if (command === 'tiers') {
    console.log(getTierCostBreakdown());
    return;
  }

  if (command === 'profiles') {
    console.log(formatProfileTable());
    return;
  }

  if (command === 'score') {
    const text = args.slice(1).join(' ') || 'Hello, world!';
    const scored = scoreRequest([{ role: 'user', content: text }]);
    console.log('\n  🧠 Request Score Analysis');
    console.log('  ═══════════════════════════════════════');
    console.log(`  Input:    "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`);
    console.log(`  Tier:     ${scored.tier}`);
    console.log(`  Score:    ${scored.totalScore.toFixed(4)}`);
    console.log(`  Reason:   ${scored.reasoning}`);
    console.log('');
    console.log('  Dimensions:');
    for (const [key, value] of Object.entries(scored.scores)) {
      const bar = '█'.repeat(Math.round(value * 20)).padEnd(20, '░');
      console.log(`    ${key.padEnd(22)} ${bar} ${(value * 100).toFixed(0)}%`);
    }
    console.log('');
    return;
  }

  if (command === 'wallet') {
    const wallet = await loadOrCreateWallet();
    const config = getDefaultConfig();
    const balance = await getBalance(wallet.publicKey, config);
    console.log(formatWalletInfo(wallet, balance));
    return;
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    console.log('clawdrouter v0.1.0');
    return;
  }

  // Default: start the proxy server
  await startServer();
}

// ── Start Proxy Server ──────────────────────────────────────────────

async function startServer(): Promise<void> {
  console.log(BANNER);

  const config = getDefaultConfig();
  config.excludedModels = await loadExcludedModels();

  // Load or create wallet
  console.log('  🔑 Loading Solana wallet...');
  const wallet = await loadOrCreateWallet();
  console.log(`  ✓ Wallet: ${wallet.publicKey}`);

  // Check balance
  try {
    const balance = await getBalance(wallet.publicKey, config);
    console.log(`  ✓ Balance: ${balance.sol.toFixed(4)} SOL | $${balance.usdc.toFixed(2)} USDC`);

    if (balance.usdc < 0.01) {
      console.log('');
      console.log('  ⚠️  Low USDC balance. Send USDC on Solana to:');
      console.log(`     ${wallet.publicKey}`);
      console.log('     $5 covers thousands of requests.');
      console.log('');
    }
  } catch {
    console.log('  ⚠ Could not check balance (RPC unavailable)');
  }

  // Start proxy
  console.log('');
  console.log(`  🚀 Starting proxy on http://localhost:${config.port}`);
  console.log(`  ⚡ Profile: ${config.profile.toUpperCase()}`);
  console.log(`  📡 Network: ${config.network}`);
  console.log(`  🧠 Models:  ${MODEL_REGISTRY.filter(m => m.enabled).length} enabled`);

  if (config.excludedModels.length > 0) {
    console.log(`  🚫 Excluded: ${config.excludedModels.join(', ')}`);
  }

  const proxy = new ClawdRouterProxy(config, wallet);
  await proxy.start();

  console.log('');
  console.log('  ════════════════════════════════════════════════════════');
  console.log('  ✓ ClawdRouter is running!');
  console.log('');
  console.log('  Point your client at:');
  console.log(`    Base URL:  http://localhost:${config.port}`);
  console.log('    API Key:   x402');
  console.log('    Model:     clawdrouter/auto');
  console.log('');
  console.log('  Example (Python):');
  console.log('    client = OpenAI(base_url="http://localhost:8402", api_key="x402")');
  console.log('    client.chat.completions.create(model="clawdrouter/auto", messages=[...])');
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('  ════════════════════════════════════════════════════════');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n  🛑 Shutting down ClawdRouter...');
    const stats = proxy.getStats();
    console.log(`  📊 Session: ${stats.totalRequests} requests | $${stats.totalCostUSDC.toFixed(4)} spent | $${stats.totalSavedUSDC.toFixed(4)} saved`);
    await proxy.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await proxy.stop();
    process.exit(0);
  });
}

// ── Doctor Command ──────────────────────────────────────────────────

async function runDoctor(args: string[]): Promise<void> {
  console.log('');
  console.log('  🩺 ClawdRouter Doctor v0.1.0');
  console.log('  ═══════════════════════════════════════════════════════');
  console.log('');

  // System
  console.log('  System');
  console.log(`    ✓ OS: ${process.platform} ${process.arch}`);
  console.log(`    ✓ Node: ${process.version}`);
  console.log('');

  // Wallet
  const wallet = await loadOrCreateWallet();
  console.log('  Wallet');
  console.log(`    ✓ Address: ${wallet.publicKey}`);

  const config = getDefaultConfig();
  try {
    const balance = await getBalance(wallet.publicKey, config);
    console.log(`    ✓ SOL: ${balance.sol.toFixed(4)}`);
    console.log(`    ${balance.usdc > 0.01 ? '✓' : '✗'} USDC: $${balance.usdc.toFixed(2)}`);
  } catch {
    console.log('    ✗ Could not check balance');
  }
  console.log('');

  // Network
  console.log('  Network');
  try {
    const resp = await fetch(`${config.upstreamUrl}/health`, { signal: AbortSignal.timeout(5000) });
    console.log(`    ✓ Upstream API: reachable (${resp.status})`);
  } catch {
    console.log('    ✗ Upstream API: unreachable');
  }

  try {
    const resp = await fetch(`http://localhost:${config.port}/health`, { signal: AbortSignal.timeout(2000) });
    console.log(`    ✓ Local proxy: running on :${config.port}`);
  } catch {
    console.log(`    ✗ Local proxy: not running on :${config.port}`);
  }

  // RPC
  try {
    const resp = await fetch(config.solanaRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
      signal: AbortSignal.timeout(5000),
    });
    console.log(`    ✓ Solana RPC: reachable`);
  } catch {
    console.log('    ✗ Solana RPC: unreachable');
  }
  console.log('');

  // Models
  console.log('  Models');
  console.log(`    ✓ Registry: ${MODEL_REGISTRY.length} models`);
  console.log(`    ✓ Free: ${MODEL_REGISTRY.filter(m => m.free).length} models`);
  console.log(`    ✓ Providers: ${new Set(MODEL_REGISTRY.map(m => m.provider)).size}`);
  console.log('');

  // Question
  if (args.length > 0) {
    const question = args.join(' ');
    console.log(`  📤 Question: "${question}"`);
    console.log('  (AI analysis would require upstream connection)');
  }

  console.log('  ═══════════════════════════════════════════════════════');
}

// ── Help ────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
  ClawdRouter — The LLM Router Built for Autonomous Solana Agents

  USAGE:
    clawdrouter                 Start the proxy server (default)
    clawdrouter doctor          Run diagnostics
    clawdrouter models          List all models and pricing
    clawdrouter tiers           Show tier cost breakdown
    clawdrouter profiles        Show routing profiles
    clawdrouter score <text>    Score a request (test the classifier)
    clawdrouter wallet          Show wallet info and balance
    clawdrouter help            Show this help
    clawdrouter version         Show version

  ENVIRONMENT:
    CLAWDROUTER_PORT            Proxy port (default: 8402)
    CLAWDROUTER_PROFILE         Routing profile: auto|eco|premium (default: auto)
    CLAWDROUTER_SOLANA_RPC_URL  Solana RPC endpoint
    CLAWDROUTER_NETWORK         Network: solana-mainnet|solana-devnet
    CLAWDROUTER_MAX_PER_REQUEST Max USDC per request (default: 0.10)
    CLAWDROUTER_MAX_PER_SESSION Max USDC per session (default: 5.00)
    CLAWDROUTER_DEBUG           Enable debug logging (true/false)
    CLAWDROUTER_UPSTREAM        Upstream API URL

  EXAMPLES:
    # Start with default settings
    clawdrouter

    # Score a test request
    clawdrouter score "Write a Solana program for token staking"

    # List all models
    clawdrouter models

    # Run diagnostics
    clawdrouter doctor
  `);
}

// ── Run ─────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('  ✗ Fatal error:', err.message);
  process.exit(1);
});
