/**
 * ClawdRouter — Slash Command Engine
 * /model, /wallet, /stats, /exclude, /help and more
 */

import type {
  SlashCommand,
  CommandContext,
  RoutingProfile,
} from '../types.js';
import {
  formatModelTable,
  resolveModelAlias,
  getFreeModels,
  MODEL_REGISTRY,
} from '../models/registry.js';
import { formatProfileTable, PROFILE_INFO } from '../router/profiles.js';
import { getTierCostBreakdown } from '../router/tiers.js';
import { formatWalletInfo, getBalance } from '../wallet/solana.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ── Exclusion Persistence ───────────────────────────────────────────

const EXCLUDE_FILE = join(homedir(), '.clawd', 'clawdrouter', 'exclude-models.json');

async function loadExclusions(): Promise<string[]> {
  try {
    const raw = await readFile(EXCLUDE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveExclusions(models: string[]): Promise<void> {
  await mkdir(join(homedir(), '.clawd', 'clawdrouter'), { recursive: true });
  await writeFile(EXCLUDE_FILE, JSON.stringify(models, null, 2));
}

// ── Command Registry ────────────────────────────────────────────────

export function createCommands(): SlashCommand[] {
  return [
    // /model — Switch routing profile or pin a model
    {
      name: 'model',
      aliases: ['/model'],
      description: 'Switch routing profile or pin a specific model',
      usage: '/model [auto|eco|premium|<model-name>]',
      handler: async (args, ctx) => {
        if (args.length === 0) {
          return [
            formatProfileTable(),
            '',
            `  Current profile: ${PROFILE_INFO[ctx.config.profile].emoji} ${ctx.config.profile.toUpperCase()}`,
            '',
            '  Usage:',
            '    /model auto       — Balanced routing (default)',
            '    /model eco        — Maximum savings',
            '    /model premium    — Best quality',
            '    /model free       — Free models only',
            '    /model grok       — Pin to Grok 4.1',
            '    /model claude     — Pin to Claude Sonnet 4.6',
          ].join('\n');
        }

        const arg = args[0]!.toLowerCase();

        // Profile switch
        if (['auto', 'eco', 'premium'].includes(arg)) {
          ctx.config.profile = arg as RoutingProfile;
          const info = PROFILE_INFO[arg as RoutingProfile];
          return `  ${info.emoji} Switched to ${info.name} profile — ${info.description}`;
        }

        // Free model shortcut
        if (arg === 'free') {
          const freeModels = getFreeModels();
          return [
            '  🆓 Free Models:',
            ...freeModels.map(m => `    ${m.id.padEnd(35)} ${m.name}`),
            '',
            `  Total: ${freeModels.length} free models available`,
          ].join('\n');
        }

        // Model alias or direct model
        const resolved = resolveModelAlias(arg) ?? arg;
        return `  📌 Pinned to: ${resolved}`;
      },
    },

    // /wallet — Wallet info and management
    {
      name: 'wallet',
      aliases: ['/wallet', '/chain'],
      description: 'Check wallet balance, export keys, switch network',
      usage: '/wallet [export|recover|solana|base]',
      handler: async (args, ctx) => {
        if (!ctx.wallet) {
          return '  ✗ No wallet loaded';
        }

        if (args.length === 0) {
          const balance = await getBalance(ctx.wallet.publicKey, ctx.config);
          return formatWalletInfo(ctx.wallet, balance);
        }

        const subcmd = args[0]!.toLowerCase();

        if (subcmd === 'export') {
          return [
            '  🔐 Wallet Export (KEEP SECRET)',
            '  ═══════════════════════════════════════',
            '',
            `  Address:   ${ctx.wallet.publicKey}`,
            `  Mnemonic:  ${ctx.wallet.mnemonic ?? 'N/A'}`,
            `  Key (b64): ${Buffer.from(ctx.wallet.secretKey).toString('base64').slice(0, 20)}...`,
            '',
            '  ⚠️  Never share your mnemonic or private key!',
          ].join('\n');
        }

        if (subcmd === 'solana') {
          ctx.config.network = 'solana-mainnet';
          return '  ✓ Switched to Solana mainnet USDC payments';
        }

        if (subcmd === 'devnet') {
          ctx.config.network = 'solana-devnet';
          return '  ✓ Switched to Solana devnet (testing)';
        }

        return `  Unknown wallet command: ${subcmd}`;
      },
    },

    // /stats — Usage statistics
    {
      name: 'stats',
      aliases: ['/stats'],
      description: 'View usage statistics and savings',
      usage: '/stats [clear]',
      handler: async (args, ctx) => {
        if (args[0] === 'clear') {
          ctx.stats = {
            totalRequests: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCostUSDC: 0,
            totalSavedUSDC: 0,
            byModel: {},
            byTier: { SIMPLE: 0, MEDIUM: 0, COMPLEX: 0, REASONING: 0 },
            sessionStart: Date.now(),
          };
          return '  ✓ Usage statistics reset';
        }

        const s = ctx.stats;
        const lines: string[] = [''];
        lines.push('  📊 ClawdRouter Usage Statistics');
        lines.push('  ═══════════════════════════════════════════════════════');
        lines.push('');
        lines.push(`  Session started:   ${new Date(s.sessionStart).toLocaleString()}`);
        lines.push(`  Total requests:    ${s.totalRequests}`);
        lines.push(`  Total tokens:      ${(s.totalInputTokens + s.totalOutputTokens).toLocaleString()}`);
        lines.push(`  Total cost:        $${s.totalCostUSDC.toFixed(4)} USDC`);
        lines.push(`  Total saved:       $${s.totalSavedUSDC.toFixed(4)} USDC`);
        lines.push(`  Savings rate:      ${s.totalCostUSDC > 0 ? ((s.totalSavedUSDC / (s.totalCostUSDC + s.totalSavedUSDC)) * 100).toFixed(0) : 0}%`);
        lines.push('');

        lines.push('  By tier:');
        for (const [tier, count] of Object.entries(s.byTier)) {
          if (count > 0) lines.push(`    ${tier.padEnd(12)} ${count} requests`);
        }
        lines.push('');

        if (Object.keys(s.byModel).length > 0) {
          lines.push('  By model:');
          for (const [model, usage] of Object.entries(s.byModel)) {
            lines.push(`    ${model.padEnd(35)} ${usage.requests} reqs  $${usage.costUSDC.toFixed(4)}`);
          }
        }

        return lines.join('\n');
      },
    },

    // /exclude — Model exclusion management
    {
      name: 'exclude',
      aliases: ['/exclude'],
      description: 'Manage excluded models',
      usage: '/exclude [add|remove|clear] [model]',
      handler: async (args, ctx) => {
        if (args.length === 0) {
          if (ctx.config.excludedModels.length === 0) {
            return '  No models excluded. Use /exclude add <model> to block a model.';
          }
          return [
            '  🚫 Excluded Models:',
            ...ctx.config.excludedModels.map(m => `    • ${m}`),
            '',
            '  /exclude remove <model>  — Unblock',
            '  /exclude clear           — Remove all',
          ].join('\n');
        }

        const subcmd = args[0]!.toLowerCase();

        if (subcmd === 'add' && args[1]) {
          const model = args.slice(1).join(' ');
          ctx.config.excludedModels.push(model);
          await saveExclusions(ctx.config.excludedModels);
          return `  ✓ Excluded: ${model}`;
        }

        if (subcmd === 'remove' && args[1]) {
          const model = args.slice(1).join(' ');
          ctx.config.excludedModels = ctx.config.excludedModels.filter(m => m !== model);
          await saveExclusions(ctx.config.excludedModels);
          return `  ✓ Unblocked: ${model}`;
        }

        if (subcmd === 'clear') {
          ctx.config.excludedModels = [];
          await saveExclusions([]);
          return '  ✓ All exclusions removed';
        }

        return '  Usage: /exclude [add|remove|clear] [model]';
      },
    },

    // /models — List all models
    {
      name: 'models',
      aliases: ['/models'],
      description: 'List all available models and pricing',
      usage: '/models',
      handler: async () => {
        return formatModelTable();
      },
    },

    // /tiers — Show tier cost breakdown
    {
      name: 'tiers',
      aliases: ['/tiers'],
      description: 'Show tier definitions and cost breakdown',
      usage: '/tiers',
      handler: async () => {
        return getTierCostBreakdown();
      },
    },

    // /help — Help
    {
      name: 'help',
      aliases: ['/help', '/?'],
      description: 'Show available commands',
      usage: '/help',
      handler: async () => {
        return [
          '',
          '  🔀 ClawdRouter — Solana-Native LLM Router',
          '  ═══════════════════════════════════════════════════════',
          '',
          '  Commands:',
          '    /model [profile]     Switch routing: auto, eco, premium',
          '    /model [name]        Pin to a specific model: grok, claude, etc.',
          '    /wallet              Show wallet address and balance',
          '    /wallet export       Export mnemonic and keys',
          '    /wallet solana       Switch to Solana USDC payments',
          '    /stats               View usage and savings',
          '    /stats clear         Reset statistics',
          '    /models              List all models with pricing',
          '    /tiers               Show tier breakdown and costs',
          '    /exclude             Show excluded models',
          '    /exclude add <model> Block a model from routing',
          '    /exclude clear       Remove all exclusions',
          '    /help                Show this help',
          '',
          '  Quick model shortcuts:',
          '    /model auto     — Smart routing (default)',
          '    /model eco      — Maximum savings',
          '    /model premium  — Best quality',
          '    /model free     — Free models only',
          '    /model grok     — Grok 4.1 Fast Reasoning',
          '    /model claude   — Claude Sonnet 4.6',
          '    /model opus     — Claude Opus 4.6',
          '    /model gemini   — Gemini 2.5 Pro',
          '',
        ].join('\n');
      },
    },
  ];
}

// ── Command Parser ──────────────────────────────────────────────────

export function parseCommand(input: string): { name: string; args: string[] } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;

  const parts = trimmed.split(/\s+/);
  const name = parts[0]!.slice(1).toLowerCase(); // Remove leading /
  const args = parts.slice(1);

  return { name, args };
}

export function findCommand(name: string, commands: SlashCommand[]): SlashCommand | undefined {
  return commands.find(cmd =>
    cmd.name === name || cmd.aliases.includes(`/${name}`)
  );
}
