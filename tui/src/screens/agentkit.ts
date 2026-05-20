/**
 * Solana Agent Kit — Complete TUI screen
 *
 * Views: Commands · Catalog · Characters · Templates · Stats
 * Tab cycles views. [b/Esc] exits.
 */

import chalk from 'chalk';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TUI_SRC_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TUI_SRC_DIR, '../..');
const AGENTS_DIR = join(REPO_ROOT, 'agents');

// ─── Types ────────────────────────────────────────────────────────────────────

interface KitCommand {
  name: string;
  cmd: string;
  description: string;
  risk: 'safe' | 'medium' | 'high';
  env?: string[];
}

interface KitCategory {
  key: string;
  icon: string;
  label: string;
  subtitle: string;
  commands: KitCommand[];
}

interface CatalogAgent {
  identifier: string;
  title: string;
  description: string;
  avatar: string;
  tags: string[];
  category: string;
  oneShot: boolean;
  featured: boolean;
}

interface CharacterAgent {
  file: string;
  name: string;
  bio: string;
  adjectives: string[];
  topics: string[];
}

interface TemplateEntry {
  templateId: string;
  templateName: string;
  templateDescription: string;
  templateAvatar: string;
  variables?: Record<string, unknown>[];
}

interface CatalogData {
  agents: CatalogAgent[];
  stats: {
    totalAgents: number;
    totalOneShots: number;
    totalFeatured: number;
    totalTemplates: number;
    byCategory: Record<string, number>;
    metaplexEnabledAgents: number;
    tradingCapableAgents: number;
  };
  hub: {
    gallery: string;
    mint: string;
    registry: string;
    api: string;
  };
}

type ViewMode = 'commands' | 'catalog' | 'characters' | 'templates' | 'stats';

// ─── Static command categories ────────────────────────────────────────────────

const CATEGORIES: KitCategory[] = [
  {
    key: '1',
    icon: '🚀',
    label: 'Token Operations',
    subtitle: 'Launch · SPL · Token-2022 · Metadata · Pump.fun · Raydium',
    commands: [
      {
        name: 'Pump.fun launch',
        cmd: 'npx clawd-agent token launch --platform pumpfun --name "TOKEN" --symbol "TKN" --image logo.png',
        description: 'Deploy token on pump.fun bonding curve with metadata',
        risk: 'medium',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'Token-2022 create',
        cmd: 'npx clawd-agent token create --program token-2022 --decimals 9 --transfer-fee 100',
        description: 'Create Token-2022 with transfer-fee extension',
        risk: 'safe',
        env: ['SOLANA_RPC_URL'],
      },
      {
        name: 'Metaplex metadata',
        cmd: 'npx clawd-agent token metadata --mint <MINT> --name "TOKEN" --symbol "TKN" --uri <URI>',
        description: 'Set on-chain MPL metadata for any token mint',
        risk: 'safe',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'Raydium CLMM pool',
        cmd: 'npx clawd-agent pool create --dex raydium --token <MINT> --sol 5 --fee-tier 500',
        description: 'Initialize Raydium CLMM liquidity pool',
        risk: 'high',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET', 'HELIUS_API_KEY'],
      },
      {
        name: 'Pump.fun screener',
        cmd: 'npx clawd-agent screen --source pumpfun --min-volume 10000 --min-holders 50 --limit 20',
        description: 'Real-time screen of new pump.fun launches',
        risk: 'safe',
        env: ['HELIUS_API_KEY'],
      },
      {
        name: 'Mint auth check',
        cmd: 'npx clawd-agent token info --mint <MINT> --check-auth --check-freeze',
        description: 'Verify mint/freeze authority and rug risk signals',
        risk: 'safe',
        env: ['SOLANA_RPC_URL'],
      },
    ],
  },
  {
    key: '2',
    icon: '📈',
    label: 'Trading / Perps',
    subtitle: 'Vulcan/Phoenix · Jupiter spot · TWAP · DCA · Copy trading',
    commands: [
      {
        name: 'Perps status',
        cmd: 'clawd-agents-perps status',
        description: 'Show live Phoenix perps market status + risk config',
        risk: 'safe',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_API_URL'],
      },
      {
        name: 'Paper long SOL',
        cmd: 'clawd-agents-perps paper-long SOL --notional 100',
        description: 'Simulated long SOL-PERP for $100 notional (paper mode)',
        risk: 'safe',
        env: ['PERPS_SIM_ONLY=true', 'LIVE_TRADING=false'],
      },
      {
        name: 'Paper short SOL',
        cmd: 'clawd-agents-perps paper-short SOL --notional 100',
        description: 'Simulated short SOL-PERP for $100 notional (paper mode)',
        risk: 'safe',
        env: ['PERPS_SIM_ONLY=true', 'LIVE_TRADING=false'],
      },
      {
        name: 'Live long (Vulcan)',
        cmd: 'clawd-agents-perps live-long SOL --notional 100 --leverage 2',
        description: '⚠ Real on-chain long via Vulcan CLI (requires LIVE_TRADING=true)',
        risk: 'high',
        env: ['LIVE_TRADING=true', 'OPERATOR_CONFIRMED=true', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'TWAP execution',
        cmd: 'clawd-agents-perps twap SOL --notional 500 --duration 2h --slices 12',
        description: 'Time-weighted average price execution over 2 hours',
        risk: 'high',
        env: ['LIVE_TRADING=true', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'Jupiter spot swap',
        cmd: 'npx clawd-agent swap --in SOL --out USDC --amount 1 --slippage 0.5 --dex jupiter',
        description: 'Best-route spot swap via Jupiter Aggregator',
        risk: 'medium',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'Perps frontend',
        cmd: 'clawd-agents-perps frontend',
        description: 'Render perps dashboard JSON (useful as API payload)',
        risk: 'safe',
        env: ['SOLANA_RPC_URL'],
      },
      {
        name: 'Vulcan catalog',
        cmd: 'clawd-agents-perps vulcan',
        description: 'Show Vulcan CLI command catalog summary',
        risk: 'safe',
        env: [],
      },
    ],
  },
  {
    key: '3',
    icon: '💰',
    label: 'DeFi / Yield',
    subtitle: 'Kamino · Marginfi · Drift · Meteora DLMM · LP optimizer',
    commands: [
      {
        name: 'Scan best APY',
        cmd: 'npx clawd-agent yield scan --tokens SOL,USDC,USDT --min-tvl 1000000 --limit 10',
        description: 'Find highest yielding protocols across Solana DeFi',
        risk: 'safe',
        env: ['SOLANA_RPC_URL'],
      },
      {
        name: 'Kamino deposit',
        cmd: 'npx clawd-agent kamino deposit --token USDC --amount 1000 --strategy auto',
        description: 'Deposit into optimal Kamino vault (auto-selected)',
        risk: 'medium',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET', 'HELIUS_API_KEY'],
      },
      {
        name: 'Marginfi lend',
        cmd: 'npx clawd-agent marginfi lend --token SOL --amount 10 --group main',
        description: 'Supply SOL to Marginfi lending pool',
        risk: 'medium',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'Meteora DLMM LP',
        cmd: 'npx clawd-agent lp add --dex meteora --pool SOL-USDC --amount-sol 1 --amount-usdc 100',
        description: 'Add liquidity to Meteora DLMM pool with auto-range',
        risk: 'high',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'IL calculator',
        cmd: 'npx clawd-agent lp calc-il --pool <POOL_ADDR> --entry-price-a 160 --current-price-a 200',
        description: 'Calculate impermanent loss for LP position',
        risk: 'safe',
        env: ['SOLANA_RPC_URL'],
      },
      {
        name: 'Yield optimizer',
        cmd: 'npx clawd-agent yield optimize --capital 10000 --risk low --rebalance 24h --protocols kamino,marginfi',
        description: 'Auto-rebalance capital across highest-yield protocols',
        risk: 'medium',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET', 'HELIUS_API_KEY'],
      },
    ],
  },
  {
    key: '4',
    icon: '🎨',
    label: 'NFT / Metaplex',
    subtitle: 'MPL Core · Gasless agent mint · Staking · SAS · Collections',
    commands: [
      {
        name: 'Gasless agent mint',
        cmd: `curl -X POST https://x402.wtf/api/mint/agent -H 'Content-Type: application/json' -d '{"agentId":1,"ownerPubkey":"<YOUR_PUBKEY>","network":"mainnet"}'`,
        description: 'Mint MPL Core agent NFT — platform pays SOL fees',
        risk: 'safe',
        env: [],
      },
      {
        name: 'MPL Core collection',
        cmd: 'npx clawd-agent nft collection create --name "Clawd Agents" --symbol "CLAWD" --royalty 500',
        description: 'Create Metaplex Core collection with 5% royalty',
        risk: 'medium',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'Stake agent NFT',
        cmd: 'npx clawd-agent nft stake --mint <MINT> --duration 30d --reward-token CLAWD',
        description: 'Stake MPL Core NFT for CLAWD yield rewards',
        risk: 'medium',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'SAS attestation',
        cmd: 'npx clawd-agent attest --mint <MINT> --schema agent-v1 --issuer x402.wtf',
        description: 'Issue Solana Attestation Service cert for agent',
        risk: 'medium',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'Browse registry',
        cmd: 'curl https://x402.wtf/api/agents/catalog | jq ".agents | length"',
        description: 'Count agents in the live on-chain registry',
        risk: 'safe',
        env: [],
      },
      {
        name: 'NFT floor snipe',
        cmd: 'npx clawd-agent nft snipe --collection <SLUG> --max-price 5 --slippage 2 --dex tensor',
        description: 'Auto-buy below floor price on Tensor marketplace',
        risk: 'high',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
    ],
  },
  {
    key: '5',
    icon: '⚡',
    label: 'x402 / Payments',
    subtitle: 'USDC HTTP-402 rails · Pay-per-call · Provider catalog · CLAWD',
    commands: [
      {
        name: 'Check balance',
        cmd: 'clawd balance',
        description: 'Show USDC + CLAWD balance in the agent wallet',
        risk: 'safe',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'Fund wallet',
        cmd: 'clawd fund 10',
        description: 'Fund agent wallet with 10 USDC via x402 rails',
        risk: 'medium',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET'],
      },
      {
        name: 'Browse pay catalog',
        cmd: 'curl https://x402.wtf/api/catalog | jq ".providers[:5]"',
        description: 'List top 5 pay-per-call providers',
        risk: 'safe',
        env: [],
      },
      {
        name: 'x402 test call',
        cmd: `curl -H 'X-Payment: <TOKEN>' https://x402.wtf/api/data/sol-price`,
        description: 'Test a live x402 pay-per-call endpoint',
        risk: 'safe',
        env: [],
      },
      {
        name: 'Publish provider',
        cmd: 'npx clawd-agent x402 publish --endpoint <URL> --price 0.001 --asset USDC --schema openapi',
        description: 'Register a new x402 pay-per-call provider',
        risk: 'medium',
        env: ['CLAWD_PERPS_WALLET'],
      },
      {
        name: 'Payment history',
        cmd: 'clawd payments --last 20 --format table',
        description: 'Show recent x402 payment records + totals',
        risk: 'safe',
        env: ['SOLANA_RPC_URL'],
      },
    ],
  },
  {
    key: '6',
    icon: '🤖',
    label: 'Automaton / Runtime',
    subtitle: 'Leviathan · OODA loop · Quickstart · Three Laws · Backroom',
    commands: [
      {
        name: 'Quickstart wizard',
        cmd: 'bash automaton-main/quickstart.sh',
        description: 'Interactive OpenClawd quickstart — installs & configures stack',
        risk: 'safe',
        env: [],
      },
      {
        name: 'Leviathan boot',
        cmd: 'bash automaton-main/leviathan.sh --full',
        description: 'Full sovereign runtime bootstrap with Vulcan perps',
        risk: 'safe',
        env: [],
      },
      {
        name: 'Three Laws check',
        cmd: 'bash automaton-main/three-laws-check.sh',
        description: 'Verify constitution SHA-256 hash integrity',
        risk: 'safe',
        env: [],
      },
      {
        name: 'Global install',
        cmd: 'curl -fsSL https://solanaclawd.com/leviathan.sh | sh',
        description: 'One-line global leviathan runtime installer',
        risk: 'medium',
        env: [],
      },
      {
        name: 'Spawn automaton',
        cmd: 'clawd spawn --ooda-interval 60 --mode paper --pulse-log',
        description: 'Launch OODA pulse loop agent in paper mode',
        risk: 'medium',
        env: ['SOLANA_RPC_URL', 'HELIUS_API_KEY'],
      },
      {
        name: 'Backroom stream',
        cmd: 'clawd backroom --stream --agents 2 --debate-topic "Solana DeFi alpha"',
        description: 'Start infinite AI backroom debate stream',
        risk: 'safe',
        env: [],
      },
    ],
  },
  {
    key: '7',
    icon: '🧠',
    label: 'Skills / Catalog',
    subtitle: 'UltraThink · ClawdHub · Agent skills · On-chain routing · Catalog sync',
    commands: [
      {
        name: 'UltraThink reference',
        cmd: 'clawd skill run ultrathink-blockchain',
        description: 'Open the UltraThink Blockchain formula reference panel',
        risk: 'safe',
        env: [],
      },
      {
        name: 'Install UltraThink',
        cmd: 'bash UltraThink-SKill/install.sh',
        description: 'Install UltraThink Blockchain skill from local repo',
        risk: 'safe',
        env: [],
      },
      {
        name: 'UltraThink via ClawdHub',
        cmd: 'clawdhub install ultrathink-blockchain',
        description: 'Install UltraThink from ClawdHub registry',
        risk: 'safe',
        env: [],
      },
      {
        name: 'List Solana skills',
        cmd: 'clawdhub list --category solana --format table',
        description: 'Browse all installed Solana skills via ClawdHub',
        risk: 'safe',
        env: [],
      },
      {
        name: 'Meme trader skill',
        cmd: 'clawd skill run meme-trader',
        description: 'Run memecoin trading skill (pump.fun + Raydium)',
        risk: 'high',
        env: ['SOLANA_RPC_URL', 'CLAWD_PERPS_WALLET', 'HELIUS_API_KEY'],
      },
      {
        name: 'Token launcher skill',
        cmd: 'clawd skill run meme-launcher',
        description: 'Launch planning: tokenomics, bonding curve, community',
        risk: 'medium',
        env: [],
      },
      {
        name: 'Sync agent catalog',
        cmd: 'cd agents && bun run build && echo "Catalog rebuilt."',
        description: 'Rebuild the agent catalog from agents/src/*.json',
        risk: 'safe',
        env: [],
      },
    ],
  },
];

// ─── Layout helpers ───────────────────────────────────────────────────────────

const ANSI_RE = new RegExp('\\[[0-9;]*m', 'g');

function visible(s: string): number {
  return s.replace(ANSI_RE, '').length;
}

function pad(s: string, width: number): string {
  return `${s}${' '.repeat(Math.max(0, width - visible(s)))}`;
}

function clip(s: string, width: number): string {
  const raw = s.replace(ANSI_RE, '');
  if (raw.length <= width) return s;
  return `${raw.slice(0, Math.max(0, width - 1))}…`;
}

function riskBadge(r: KitCommand['risk']): string {
  if (r === 'high') return chalk.red('[HIGH]');
  if (r === 'medium') return chalk.yellow('[MED] ');
  return chalk.green('[SAFE]');
}

function cols(): number {
  return Math.max(100, Math.min(process.stdout.columns || 130, 148));
}

function border(c: number): string {
  return chalk.cyan('═'.repeat(c - 2));
}

function hdr(txt: string, c: number): string {
  return `${chalk.cyan('║')}${pad(` ${txt}`, c - 2)}${chalk.cyan('║\n')}`;
}

function row(left: string, lw: number, right: string, rw: number): string {
  return `${chalk.cyan('║')} ${pad(clip(left, lw - 2), lw - 2)} ${chalk.cyan('│')} ${pad(clip(right, rw - 1), rw - 1)}${chalk.cyan('║\n')}`;
}

function renderHeader(view: ViewMode, c: number): void {
  const views: ViewMode[] = ['commands', 'catalog', 'characters', 'templates', 'stats'];
  const tabLine = views.map(v =>
    v === view
      ? chalk.bold.cyanBright(`[${v.toUpperCase()}]`)
      : chalk.gray(`[${v}]`),
  ).join(chalk.gray('  '));

  process.stdout.write(`${chalk.cyan('╔')}${border(c)}${chalk.cyan('╗\n')}`);
  process.stdout.write(hdr(
    chalk.bold.cyanBright('🦞 SOLANA AGENT KIT') +
    chalk.gray('  ·  token · perps · DeFi · NFT · x402 · automaton · 135 agents'),
    c,
  ));
  process.stdout.write(hdr(
    chalk.yellow('$CLAWD') +
    chalk.gray(' CA: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump  ·  ') +
    chalk.cyan('x402.wtf') +
    chalk.gray('  ·  ') +
    chalk.cyan('solanaclawd.com'),
    c,
  ));
  process.stdout.write(hdr(`${chalk.gray('Tab: ')}${tabLine}`, c));
  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
}

// ─── Commands view ────────────────────────────────────────────────────────────

function catRowStr(i: number, catIdx: number): string {
  const c2 = CATEGORIES[i];
  if (!c2) return '';
  return i === catIdx
    ? `${chalk.cyanBright('▶ ')}${chalk.bold.cyanBright(`${c2.key}. ${c2.icon} ${c2.label}`)}`
    : `${chalk.gray(`  ${c2.key}. `)}${chalk.white(`${c2.icon} ${c2.label}`)}`;
}

function cmdRowStr(cmdItem: KitCommand | undefined, i: number, cmdIdx: number): string {
  if (!cmdItem) return '';
  return i === cmdIdx
    ? `${chalk.cyanBright('► ')}${chalk.bold.white(cmdItem.name)}  ${riskBadge(cmdItem.risk)}`
    : `${chalk.gray('  ')}${chalk.white(cmdItem.name)}  ${riskBadge(cmdItem.risk)}`;
}

function renderCommands(catIdx: number, cmdIdx: number, status: string, copied: boolean): void {
  process.stdout.write('\x1b[2J\x1b[H');
  const c = cols();
  renderHeader('commands', c);

  const leftW = 28;
  const rightW = c - leftW - 5;
  const cat = CATEGORIES[catIdx]!;
  const cmd = cat.commands[cmdIdx] ?? cat.commands[0]!;

  process.stdout.write(row(chalk.bold.white('CATEGORY'), leftW, chalk.bold.white(`COMMANDS  —  ${cat.icon} ${cat.label}`), rightW));
  process.stdout.write(row(chalk.gray('─'.repeat(leftW - 2)), leftW, chalk.gray(cat.subtitle), rightW));

  const rowCount = Math.max(CATEGORIES.length, cat.commands.length);
  for (let i = 0; i < rowCount; i++) {
    process.stdout.write(row(catRowStr(i, catIdx), leftW, cmdRowStr(cat.commands[i], i, cmdIdx), rightW));
  }

  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
  process.stdout.write(hdr(`${chalk.bold.white(`  ${cmd.name}`)}  ${riskBadge(cmd.risk)}`, c));
  process.stdout.write(hdr(chalk.gray(`  ${cmd.description}`), c));

  const maxCmdW = c - 6;
  for (let i = 0; i < cmd.cmd.length; i += maxCmdW) {
    process.stdout.write(hdr(`  ${chalk.green(cmd.cmd.slice(i, i + maxCmdW))}`, c));
  }
  if (cmd.env && cmd.env.length > 0) {
    process.stdout.write(hdr(`${chalk.gray('  env: ')}${chalk.yellow(cmd.env.join('  '))}`, c));
  }

  const statusLine = copied ? chalk.green('  ✓ Command copied to clipboard!') : chalk.gray(`  ${status}`);
  process.stdout.write(hdr(statusLine, c));

  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
  process.stdout.write(hdr(chalk.gray('[Tab] next view  [←→] category  [↑↓] command  [c] copy  [e] env  [1-7] jump  [b] back'), c));
  process.stdout.write(`${chalk.cyan('╚')}${border(c)}${chalk.cyan('╝\n')}`);
}

// ─── Catalog view ─────────────────────────────────────────────────────────────

const CATALOG_CATEGORIES = [
  'all', 'defi', 'payments', 'analytics', 'trading', 'security',
  'education', 'dev-tools', 'governance', 'nft', 'research', 'infrastructure',
];

function renderCatalog(
  catalog: CatalogData | null,
  catFilter: number,
  agentIdx: number,
  status: string,
): void {
  process.stdout.write('\x1b[2J\x1b[H');
  const c = cols();
  renderHeader('catalog', c);

  if (!catalog) {
    process.stdout.write(hdr(chalk.yellow('  Loading agent catalog…'), c));
    process.stdout.write(`${chalk.cyan('╚')}${border(c)}${chalk.cyan('╝\n')}`);
    return;
  }

  const filterKey = CATALOG_CATEGORIES[catFilter] ?? 'all';
  const agents = filterKey === 'all'
    ? catalog.agents
    : catalog.agents.filter(a => a.category === filterKey);

  const leftW = 22;
  const rightW = c - leftW - 5;

  // Category filter list on left, agents on right
  const visibleRows = Math.min(agents.length, 16);
  const agentStart = Math.max(0, agentIdx - Math.floor(visibleRows / 2));
  const visibleAgents = agents.slice(agentStart, agentStart + visibleRows);

  // Header row
  process.stdout.write(row(
    chalk.bold.white('CATEGORY FILTER'),
    leftW,
    chalk.bold.white(`AGENTS  (${agents.length}/${catalog.stats.totalAgents})`),
    rightW,
  ));
  process.stdout.write(row(
    chalk.gray('[f] to cycle filter'),
    leftW,
    chalk.gray(`filter: ${filterKey}  ·  [↑↓] select  [c] copy mint cmd`),
    rightW,
  ));

  const rowCount = Math.max(CATALOG_CATEGORIES.length, visibleRows);
  for (let i = 0; i < rowCount; i++) {
    const catKey = CATALOG_CATEGORIES[i];
    const count = catKey === 'all'
      ? catalog.stats.totalAgents
      : (catalog.stats.byCategory[catKey] ?? 0);
    const leftStr = catKey !== undefined
      ? (i === catFilter
        ? chalk.cyanBright('▶ ') + chalk.bold.cyanBright(`${catKey}`) + chalk.gray(` (${count})`)
        : chalk.gray(`  ${catKey} (${count})`))
      : '';

    const agent = visibleAgents[i];
    const globalIdx = agentStart + i;
    const rightStr = agent
      ? (globalIdx === agentIdx
        ? chalk.cyanBright('► ') +
          chalk.bold.white(`${agent.avatar} ${agent.title}`) +
          (agent.featured ? chalk.yellow(' ★') : '') +
          (agent.oneShot ? chalk.gray(' ·shot') : '')
        : chalk.gray('  ') +
          chalk.white(`${agent.avatar} ${agent.title}`) +
          (agent.featured ? chalk.yellow(' ★') : '') +
          (agent.oneShot ? chalk.gray(' ·shot') : ''))
      : '';

    process.stdout.write(row(leftStr, leftW, rightStr, rightW));
  }

  // Selected agent detail
  const selected = agents[agentIdx];
  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
  if (selected) {
    process.stdout.write(hdr(
      chalk.bold.white(`  ${selected.avatar} ${selected.title}`) +
      chalk.gray(`  [${selected.category}]`) +
      (selected.featured ? chalk.yellow('  ★ FEATURED') : '') +
      (selected.oneShot ? chalk.gray('  one-shot') : ''),
      c,
    ));
    process.stdout.write(hdr(chalk.gray(`  ${selected.description}`), c));
    const tagLine = selected.tags.slice(0, 8).join('  ');
    process.stdout.write(hdr(chalk.gray('  tags: ') + chalk.cyan(tagLine), c));
    const mintCmd = `curl -sX POST https://x402.wtf/api/mint/agent -H 'Content-Type: application/json' -d '{"identifier":"${selected.identifier}"}'`;
    process.stdout.write(hdr(chalk.gray('  mint: ') + chalk.green(mintCmd.slice(0, c - 12)), c));
  } else {
    process.stdout.write(hdr(chalk.gray('  Select an agent to view details'), c));
  }
  process.stdout.write(hdr(chalk.gray(`  ${status}`), c));

  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
  process.stdout.write(hdr(
    chalk.gray('[Tab] next view  [f] filter category  [↑↓] agent  [c] copy mint cmd  [b] back'),
    c,
  ));
  process.stdout.write(`${chalk.cyan('╚')}${border(c)}${chalk.cyan('╝\n')}`);
}

// ─── Characters view ──────────────────────────────────────────────────────────

function renderCharacters(characters: CharacterAgent[], charIdx: number, status: string): void {
  process.stdout.write('\x1b[2J\x1b[H');
  const c = cols();
  renderHeader('characters', c);

  if (characters.length === 0) {
    process.stdout.write(hdr(chalk.yellow('  Loading characters…'), c));
    process.stdout.write(`${chalk.cyan('╚')}${border(c)}${chalk.cyan('╝\n')}`);
    return;
  }

  const leftW = 26;
  const rightW = c - leftW - 5;
  const char = characters[charIdx];

  process.stdout.write(row(
    chalk.bold.white(`PERSONAS  (${characters.length})`),
    leftW,
    chalk.bold.white(`PROFILE  —  ${char?.name ?? ''}`),
    rightW,
  ));
  process.stdout.write(row(
    chalk.gray('[↑↓] to browse'),
    leftW,
    chalk.gray('Eliza-compatible character JSON · deploy with x402.wtf'),
    rightW,
  ));

  const rowCount = Math.max(characters.length, 8);
  const adjectives = char?.adjectives.slice(0, 4).join(' · ') ?? '';
  const topics = char?.topics.slice(0, 4) ?? [];

  for (let i = 0; i < rowCount; i++) {
    const ch = characters[i];
    const leftStr = ch
      ? (i === charIdx
        ? chalk.cyanBright('▶ ') + chalk.bold.cyanBright(ch.name)
        : chalk.gray('  ') + chalk.white(ch.name))
      : '';
    const rightStr = i === 0
      ? chalk.gray(adjectives)
      : i < topics.length + 1
        ? chalk.gray(`  📌 ${topics[i - 1] ?? ''}`)
        : '';
    process.stdout.write(row(leftStr, leftW, rightStr, rightW));
  }

  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
  if (char) {
    process.stdout.write(hdr(chalk.bold.white(`  ${char.name}`) + chalk.gray('  · Eliza character'), c));
    process.stdout.write(hdr(chalk.gray(`  ${char.bio}`), c));
    const deployCmd = `curl -sX POST https://x402.wtf/api/agents/deploy -d '{"character":"${char.file}"}'`;
    process.stdout.write(hdr(chalk.gray('  deploy: ') + chalk.green(deployCmd.slice(0, c - 14)), c));
  }
  process.stdout.write(hdr(chalk.gray(`  ${status}`), c));

  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
  process.stdout.write(hdr(
    chalk.gray('[Tab] next view  [↑↓] character  [c] copy deploy cmd  [b] back'),
    c,
  ));
  process.stdout.write(`${chalk.cyan('╚')}${border(c)}${chalk.cyan('╝\n')}`);
}

// ─── Templates view ───────────────────────────────────────────────────────────

function renderTemplates(templates: TemplateEntry[], tmplIdx: number, status: string): void {
  process.stdout.write('\x1b[2J\x1b[H');
  const c = cols();
  renderHeader('templates', c);

  if (templates.length === 0) {
    process.stdout.write(hdr(chalk.yellow('  Loading templates…'), c));
    process.stdout.write(`${chalk.cyan('╚')}${border(c)}${chalk.cyan('╝\n')}`);
    return;
  }

  const leftW = 30;
  const rightW = c - leftW - 5;
  const tmpl = templates[tmplIdx];

  process.stdout.write(row(
    chalk.bold.white(`BLUEPRINTS  (${templates.length})`),
    leftW,
    chalk.bold.white(`DETAIL  —  ${tmpl?.templateAvatar ?? ''} ${tmpl?.templateName ?? ''}`),
    rightW,
  ));
  process.stdout.write(row(
    chalk.gray('[↑↓] to browse'),
    leftW,
    chalk.gray('Ready-to-deploy agent blueprints for OpenClawd'),
    rightW,
  ));

  const rowCount = Math.max(templates.length, 8);
  for (let i = 0; i < rowCount; i++) {
    const t = templates[i];
    const leftStr = t
      ? (i === tmplIdx
        ? chalk.cyanBright('▶ ') + chalk.bold.cyanBright(`${t.templateAvatar} ${t.templateName}`)
        : chalk.gray('  ') + chalk.white(`${t.templateAvatar} ${t.templateName}`))
      : '';
    const rightStr = t && i === tmplIdx ? chalk.gray(t.templateDescription.slice(0, rightW - 4)) : '';
    process.stdout.write(row(leftStr, leftW, rightStr, rightW));
  }

  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
  if (tmpl) {
    process.stdout.write(hdr(chalk.bold.white(`  ${tmpl.templateAvatar} ${tmpl.templateName}`), c));
    process.stdout.write(hdr(chalk.gray(`  ${tmpl.templateDescription}`), c));
    const useCmd = `npx clawd-agent template use ${tmpl.templateId} --name "MyAgent"`;
    process.stdout.write(hdr(chalk.gray('  use: ') + chalk.green(useCmd), c));
    const mintCmd = `curl -sX POST https://x402.wtf/api/mint/template -d '{"templateId":"${tmpl.templateId}"}'`;
    process.stdout.write(hdr(chalk.gray('  mint: ') + chalk.green(mintCmd.slice(0, c - 12)), c));
  }
  process.stdout.write(hdr(chalk.gray(`  ${status}`), c));

  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
  process.stdout.write(hdr(
    chalk.gray('[Tab] next view  [↑↓] template  [c] copy use cmd  [b] back'),
    c,
  ));
  process.stdout.write(`${chalk.cyan('╚')}${border(c)}${chalk.cyan('╝\n')}`);
}

// ─── Stats view ───────────────────────────────────────────────────────────────

function renderStats(catalog: CatalogData | null): void {
  process.stdout.write('\x1b[2J\x1b[H');
  const c = cols();
  renderHeader('stats', c);

  if (!catalog) {
    process.stdout.write(hdr(chalk.yellow('  Loading catalog stats…'), c));
    process.stdout.write(`${chalk.cyan('╚')}${border(c)}${chalk.cyan('╝\n')}`);
    return;
  }

  const s = catalog.stats;
  const leftW = Math.floor((c - 5) / 2);
  const rightW = c - leftW - 5;

  process.stdout.write(row(chalk.bold.white('HUB ENDPOINTS'), leftW, chalk.bold.white('AGENT STATS'), rightW));
  process.stdout.write(row(chalk.gray('─'.repeat(leftW - 2)), leftW, chalk.gray('─'.repeat(rightW - 2)), rightW));

  const endpoints = [
    ['Gallery', catalog.hub.gallery],
    ['Mint',    catalog.hub.mint],
    ['Registry',catalog.hub.registry],
    ['API',     catalog.hub.api],
  ];
  const statRows: Array<[string, string]> = [
    ['Total agents', String(s.totalAgents)],
    ['One-shots', String(s.totalOneShots)],
    ['Featured', String(s.totalFeatured)],
    ['Templates', String(s.totalTemplates)],
    ['Metaplex-enabled', String(s.metaplexEnabledAgents)],
    ['Trading-capable', String(s.tradingCapableAgents)],
  ];

  const rowCount = Math.max(endpoints.length, statRows.length);
  for (let i = 0; i < rowCount; i++) {
    const ep = endpoints[i];
    const sr = statRows[i];
    const leftStr = ep ? `${chalk.gray(`  ${ep[0]}: `)}${chalk.cyan(ep[1]!)}` : '';
    const rightStr = sr ? `${chalk.gray(`  ${sr[0]}: `)}${chalk.bold.white(sr[1]!)}` : '';
    process.stdout.write(row(leftStr, leftW, rightStr, rightW));
  }

  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
  process.stdout.write(hdr(chalk.bold.white('  BY CATEGORY'), c));

  const catEntries = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]);
  const half = Math.ceil(catEntries.length / 2);
  for (let i = 0; i < half; i++) {
    const l = catEntries[i];
    const r = catEntries[i + half];
    const leftStr = l ? `${chalk.gray(`  ${l[0]}: `)}${chalk.bold.white(String(l[1]))}` : '';
    const rightStr = r ? `${chalk.gray(`  ${r[0]}: `)}${chalk.bold.white(String(r[1]))}` : '';
    process.stdout.write(row(leftStr, leftW, rightStr, rightW));
  }

  process.stdout.write(`${chalk.cyan('╠')}${border(c)}${chalk.cyan('╣\n')}`);
  process.stdout.write(hdr(
    chalk.gray('[Tab] next view  [b] back'),
    c,
  ));
  process.stdout.write(`${chalk.cyan('╚')}${border(c)}${chalk.cyan('╝\n')}`);
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadCatalog(): Promise<CatalogData | null> {
  const p = join(AGENTS_DIR, 'agents-catalog.json');
  if (!existsSync(p)) return null;
  try {
    const raw = JSON.parse(await readFile(p, 'utf8')) as CatalogData;
    return raw;
  } catch { return null; }
}

async function loadCharacters(): Promise<CharacterAgent[]> {
  const dir = join(AGENTS_DIR, 'characters');
  if (!existsSync(dir)) return [];
  try {
    const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
    const chars: CharacterAgent[] = [];
    for (const file of files) {
      try {
        const raw = JSON.parse(await readFile(join(dir, file), 'utf8')) as {
          name?: string;
          bio?: string | string[];
          adjectives?: string[];
          topics?: string[];
        };
        const bioText = Array.isArray(raw.bio) ? raw.bio[0] ?? '' : (raw.bio ?? '');
        chars.push({
          file: file.replace('.json', ''),
          name: raw.name ?? file.replace('.json', ''),
          bio: bioText.slice(0, 120),
          adjectives: raw.adjectives ?? [],
          topics: raw.topics ?? [],
        });
      } catch { /* skip */ }
    }
    return chars.sort((a, b) => a.name.localeCompare(b.name));
  } catch { return []; }
}

async function loadTemplates(): Promise<TemplateEntry[]> {
  const indexPath = join(AGENTS_DIR, 'templates', 'index.json');
  if (!existsSync(indexPath)) return [];
  try {
    const raw = JSON.parse(await readFile(indexPath, 'utf8')) as { templates?: TemplateEntry[] };
    return raw.templates ?? [];
  } catch { return []; }
}

// ─── Clipboard helper ─────────────────────────────────────────────────────────

async function copyToClipboard(text: string): Promise<boolean> {
  const { execFile } = await import('node:child_process');
  try {
    const tool = process.platform === 'darwin' ? 'pbcopy' : 'xclip';
    const args = process.platform === 'linux' ? ['-selection', 'clipboard'] : [];
    await new Promise<void>((res, rej) => {
      const p = execFile(tool, args);
      if (p.stdin) { p.stdin.write(text); p.stdin.end(); }
      p.on('close', code => (code === 0 ? res() : rej(new Error(`exit ${code}`))));
    });
    return true;
  } catch { /* ignore */ }
  return false;
}

// ─── View cycling ─────────────────────────────────────────────────────────────

const VIEW_ORDER: ViewMode[] = ['commands', 'catalog', 'characters', 'templates', 'stats'];

function nextView(v: ViewMode): ViewMode {
  const i = VIEW_ORDER.indexOf(v);
  return VIEW_ORDER[(i + 1) % VIEW_ORDER.length] ?? 'commands';
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runAgentKit(): Promise<void> {
  // State
  let view: ViewMode = 'commands';
  let catIdx = 0;
  let cmdIdx = 0;
  let catalogFilter = 0;
  let agentIdx = 0;
  let charIdx = 0;
  let tmplIdx = 0;
  let status = 'Ready.';
  let copied = false;

  // Async data (loaded in background)
  let catalog: CatalogData | null = null;
  let characters: CharacterAgent[] = [];
  let templates: TemplateEntry[] = [];

  const redraw = (): void => {
    if (view === 'commands') renderCommands(catIdx, cmdIdx, status, copied);
    else if (view === 'catalog') renderCatalog(catalog, catalogFilter, agentIdx, status);
    else if (view === 'characters') renderCharacters(characters, charIdx, status);
    else if (view === 'templates') renderTemplates(templates, tmplIdx, status);
    else renderStats(catalog);
  };

  redraw();

  // Load data in background then redraw
  void Promise.all([loadCatalog(), loadCharacters(), loadTemplates()]).then(([cat, chars, tmps]) => {
    catalog = cat;
    characters = chars;
    templates = tmps;
    redraw();
  });

  return new Promise<void>(resolve => {
    const enableRaw = (): void => {
      if (process.stdin.setRawMode) process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
    };
    const disableRaw = (): void => {
      if (process.stdin.setRawMode) process.stdin.setRawMode(false);
    };

    enableRaw();

    const handleCommands = async (chunk: string): Promise<boolean> => {
      const cat = CATEGORIES[catIdx]!;
      if (chunk === '\x1b[A') {
        cmdIdx = (cmdIdx - 1 + cat.commands.length) % cat.commands.length;
        status = `Command: ${cat.commands[cmdIdx]?.name ?? ''}`;
        return true;
      }
      if (chunk === '\x1b[B') {
        cmdIdx = (cmdIdx + 1) % cat.commands.length;
        status = `Command: ${cat.commands[cmdIdx]?.name ?? ''}`;
        return true;
      }
      if (chunk === '\x1b[D' || chunk === '\x1b[Z') {
        catIdx = (catIdx - 1 + CATEGORIES.length) % CATEGORIES.length;
        cmdIdx = 0;
        status = `Category: ${CATEGORIES[catIdx]?.label ?? ''}`;
        return true;
      }
      if (chunk === '\x1b[C') {
        catIdx = (catIdx + 1) % CATEGORIES.length;
        cmdIdx = 0;
        status = `Category: ${CATEGORIES[catIdx]?.label ?? ''}`;
        return true;
      }
      const numMatch = /^[1-7]$/.exec(chunk);
      if (numMatch) {
        catIdx = Number.parseInt(chunk, 10) - 1;
        cmdIdx = 0;
        status = `Category: ${CATEGORIES[catIdx]?.label ?? ''}`;
        return true;
      }
      if (chunk === 'c' || chunk === 'C') {
        const currentCmd = CATEGORIES[catIdx]!.commands[cmdIdx]?.cmd ?? '';
        const ok = await copyToClipboard(currentCmd);
        copied = ok;
        status = ok ? 'Copied!' : 'Copy failed — paste manually.';
        return true;
      }
      if (chunk === 'e' || chunk === 'E') {
        const envVars = CATEGORIES[catIdx]!.commands[cmdIdx]?.env ?? [];
        status = envVars.length ? `Required env: ${envVars.join(', ')}` : 'No env vars required.';
        return true;
      }
      return false;
    };

    const handleCatalog = async (chunk: string): Promise<boolean> => {
      const agents = catalogFilter === 0
        ? (catalog?.agents ?? [])
        : (catalog?.agents.filter(a => a.category === (CATALOG_CATEGORIES[catalogFilter] ?? '')) ?? []);

      if (chunk === '\x1b[A') {
        agentIdx = Math.max(0, agentIdx - 1);
        status = `Agent: ${agents[agentIdx]?.title ?? ''}`;
        return true;
      }
      if (chunk === '\x1b[B') {
        agentIdx = Math.min(agents.length - 1, agentIdx + 1);
        status = `Agent: ${agents[agentIdx]?.title ?? ''}`;
        return true;
      }
      if (chunk === 'f' || chunk === 'F') {
        catalogFilter = (catalogFilter + 1) % CATALOG_CATEGORIES.length;
        agentIdx = 0;
        status = `Filter: ${CATALOG_CATEGORIES[catalogFilter] ?? 'all'}`;
        return true;
      }
      if (chunk === 'c' || chunk === 'C') {
        const agent = agents[agentIdx];
        if (agent) {
          const mintCmd = `curl -sX POST https://x402.wtf/api/mint/agent -H 'Content-Type: application/json' -d '{"identifier":"${agent.identifier}"}'`;
          const ok = await copyToClipboard(mintCmd);
          status = ok ? '✓ Mint command copied!' : 'Copy failed.';
        }
        return true;
      }
      return false;
    };

    const handleCharacters = async (chunk: string): Promise<boolean> => {
      if (chunk === '\x1b[A') {
        charIdx = Math.max(0, charIdx - 1);
        status = `Character: ${characters[charIdx]?.name ?? ''}`;
        return true;
      }
      if (chunk === '\x1b[B') {
        charIdx = Math.min(characters.length - 1, charIdx + 1);
        status = `Character: ${characters[charIdx]?.name ?? ''}`;
        return true;
      }
      if (chunk === 'c' || chunk === 'C') {
        const char = characters[charIdx];
        if (char) {
          const cmd = `curl -sX POST https://x402.wtf/api/agents/deploy -d '{"character":"${char.file}"}'`;
          const ok = await copyToClipboard(cmd);
          status = ok ? '✓ Deploy command copied!' : 'Copy failed.';
        }
        return true;
      }
      return false;
    };

    const handleTemplates = async (chunk: string): Promise<boolean> => {
      if (chunk === '\x1b[A') {
        tmplIdx = Math.max(0, tmplIdx - 1);
        status = `Template: ${templates[tmplIdx]?.templateName ?? ''}`;
        return true;
      }
      if (chunk === '\x1b[B') {
        tmplIdx = Math.min(templates.length - 1, tmplIdx + 1);
        status = `Template: ${templates[tmplIdx]?.templateName ?? ''}`;
        return true;
      }
      if (chunk === 'c' || chunk === 'C') {
        const tmpl = templates[tmplIdx];
        if (tmpl) {
          const cmd = `npx clawd-agent template use ${tmpl.templateId} --name "MyAgent"`;
          const ok = await copyToClipboard(cmd);
          status = ok ? '✓ Command copied!' : 'Copy failed.';
        }
        return true;
      }
      return false;
    };

    const onData = async (chunk: string): Promise<void> => {
      copied = false;

      if (chunk === 'b' || chunk === 'B' || chunk === '\x1b') {
        process.stdin.off('data', onData as (c: string) => void);
        disableRaw();
        resolve();
        return;
      }
      if (chunk === '\x03') {
        process.stdin.off('data', onData as (c: string) => void);
        disableRaw();
        process.exit(0);
      }

      if (chunk === '\t') {
        view = nextView(view);
        status = `View: ${view}`;
        redraw();
        return;
      }

      let handled = false;
      if (view === 'commands') handled = await handleCommands(chunk);
      else if (view === 'catalog') handled = await handleCatalog(chunk);
      else if (view === 'characters') handled = await handleCharacters(chunk);
      else if (view === 'templates') handled = await handleTemplates(chunk);

      if (handled || view === 'stats') redraw();
    };

    process.stdin.on('data', onData as (c: string) => void);
  });
}
