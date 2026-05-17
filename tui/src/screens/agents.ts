/**
 * clawd — Agent Registry Screen
 *
 * Browse Solana Clawd agents and surface the free/gasless x402 registry path.
 */

import chalk from 'chalk';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface CatalogAgent {
  identifier: string;
  title: string;
  description: string;
  tags?: string[];
  category?: string;
  author?: string;
  capabilities?: string[];
  metaplexSkills?: string[];
}

interface AgentCatalog {
  generatedAt?: string;
  stats?: {
    totalAgents?: number;
    totalOneShots?: number;
    totalFeatured?: number;
    metaplexEnabledAgents?: number;
  };
  agents?: CatalogAgent[];
}

type CommandMode = 'preset' | 'custom' | 'registry';

const HUB_URL = 'https://x402.wtf/agents';
const API_BASE = 'https://x402.wtf';

const FALLBACK_AGENTS: CatalogAgent[] = [
  {
    identifier: 'solana-clawd-wallet-guardian',
    title: 'Clawd Wallet Guardian',
    description: 'Wallet safety, biometric approval, and prompt-injection defense for paid Solana agents.',
    category: 'payments',
    author: 'solana-clawd',
    tags: ['solana', 'clawd', 'wallet', 'x402'],
    capabilities: ['free-registry', 'gasless-mint', 'x402-approval'],
    metaplexSkills: ['agent-registry', 'core'],
  },
  {
    identifier: 'solana-openclawd-orchestrator',
    title: 'Solana OpenClawd Orchestrator',
    description: 'Coordinates Solana Clawd agents across tools, permissions, memory, and runtime surfaces.',
    category: 'infrastructure',
    author: 'solana-clawd',
    tags: ['solana', 'clawd', 'orchestration'],
    capabilities: ['agent-routing', 'permission-control'],
    metaplexSkills: ['agent-registry'],
  },
  {
    identifier: 'solana-pumpfun-bot',
    title: 'Solana PumpFun/PumpSwap Copy Trading Bot',
    description: 'High-performance copy trading agent for PumpFun, PumpSwap, and Raydium flows.',
    category: 'trading',
    author: 'solana-clawd',
    tags: ['solana', 'pumpfun', 'trading-bot'],
    capabilities: ['market-monitoring', 'trade-routing'],
    metaplexSkills: ['agent-registry'],
  },
];

function visible(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function pad(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - visible(s)));
}

function clip(s: string, width: number): string {
  if (visible(s) <= width) return s;
  // Color is not important on clipped text; prefer stable layout.
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').slice(0, Math.max(0, width - 1)) + '…';
}

function boxed(content: string, width: number): string {
  const inner = width - 2;
  return chalk.cyan('║') + pad(clip(content, inner), inner) + chalk.cyan('║');
}

function loadCatalog(): { catalog: AgentCatalog; source: string } {
  const candidates = [
    resolve(process.cwd(), 'agents', 'agents-catalog.json'),
    resolve(process.cwd(), '..', 'agents', 'agents-catalog.json'),
    resolve(process.cwd(), 'agents-catalog.json'),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));

  if (!path) {
    return {
      catalog: { stats: { totalAgents: FALLBACK_AGENTS.length, metaplexEnabledAgents: 2 }, agents: FALLBACK_AGENTS },
      source: 'fallback',
    };
  }

  try {
    return { catalog: JSON.parse(readFileSync(path, 'utf8')) as AgentCatalog, source: path };
  } catch {
    return {
      catalog: { stats: { totalAgents: FALLBACK_AGENTS.length, metaplexEnabledAgents: 2 }, agents: FALLBACK_AGENTS },
      source: 'fallback: catalog parse failed',
    };
  }
}

function commandLines(mode: CommandMode, agent: CatalogAgent, selected: number): string[] {
  if (mode === 'custom') {
    return [
      `curl -X POST ${API_BASE}/api/mint/agent/custom \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -d '{"name":"My Clawd Agent","metadataUri":"https://example.com/agent.json","ownerPubkey":"<YOUR_SOLANA_PUBKEY>","network":"devnet"}'`,
    ];
  }

  if (mode === 'registry') {
    return [
      `curl ${API_BASE}/api/agents/catalog/${agent.identifier}.json | jq .`,
      `curl ${API_BASE}/api/agents/registry | jq .`,
      `curl ${API_BASE}/registry | jq .`,
    ];
  }

  const presetId = Math.min(3, (selected % 3) + 1);
  return [
    `curl -X POST ${API_BASE}/api/mint/agent \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '{"agentId":${presetId},"ownerPubkey":"<YOUR_SOLANA_PUBKEY>","network":"mainnet"}'`,
  ];
}

function render(
  agents: CatalogAgent[],
  selected: number,
  catalog: AgentCatalog,
  source: string,
  mode: CommandMode,
  status: string,
): void {
  process.stdout.write('\x1b[2J\x1b[H');

  const width = Math.max(92, Math.min(process.stdout.columns || 118, 132));
  const border = chalk.cyan('═'.repeat(width - 2));
  const current = agents[selected] ?? agents[0]!;
  const stats = catalog.stats ?? {};
  const listStart = Math.max(0, Math.min(selected - 5, Math.max(0, agents.length - 10)));
  const visibleAgents = agents.slice(listStart, listStart + 10);
  const leftWidth = 42;
  const rightWidth = width - leftWidth - 5;
  const generated = catalog.generatedAt ? new Date(catalog.generatedAt).toLocaleString() : 'local';

  process.stdout.write(chalk.cyan('╔') + border + chalk.cyan('╗') + '\n');
  process.stdout.write(boxed(` ${chalk.bold.cyanBright('SOLANA CLAWD AGENT REGISTRY')}  ${chalk.gray('free discovery · gasless MPL Core minting · x402')}`, width) + '\n');
  process.stdout.write(boxed(` ${chalk.green(HUB_URL)}  ${chalk.gray('mint/register agents with a Solana public key')}`, width) + '\n');
  process.stdout.write(chalk.cyan('╠') + border + chalk.cyan('╣') + '\n');
  process.stdout.write(boxed(` Catalog ${chalk.yellow(String(stats.totalAgents ?? agents.length))}  Metaplex ${chalk.magenta(String(stats.metaplexEnabledAgents ?? 0))}  One-shots ${chalk.cyan(String(stats.totalOneShots ?? 0))}  Featured ${chalk.green(String(stats.totalFeatured ?? 0))}  Generated ${chalk.gray(generated)}`, width) + '\n');
  process.stdout.write(boxed(` Source ${chalk.gray(source)}`, width) + '\n');
  process.stdout.write(chalk.cyan('╠') + border + chalk.cyan('╣') + '\n');

  process.stdout.write(chalk.cyan('║') + ' ' + pad(chalk.bold.white('AGENTS'), leftWidth) + chalk.cyan('│') + ' ' + pad(chalk.bold.white('SELECTED IDENTITY'), rightWidth) + chalk.cyan('║') + '\n');

  for (let i = 0; i < 10; i++) {
    const agent = visibleAgents[i];
    const idx = listStart + i;
    const marker = idx === selected ? chalk.cyanBright('>') : ' ';
    const title = agent ? (idx === selected ? chalk.cyanBright.bold(agent.title) : chalk.white(agent.title)) : '';
    const left = agent ? `${marker} ${chalk.gray(String(idx + 1).padStart(3))} ${title}` : '';

    const details = [
      `${chalk.cyan('id')} ${current.identifier}`,
      `${chalk.cyan('category')} ${current.category ?? 'agent'}  ${chalk.cyan('author')} ${current.author ?? 'solana-clawd'}`,
      `${chalk.cyan('tags')} ${(current.tags ?? ['solana', 'clawd']).slice(0, 6).join(', ')}`,
      `${chalk.cyan('metaplex')} ${(current.metaplexSkills ?? ['agent-registry']).join(', ')}`,
      chalk.gray('─'.repeat(48)),
      current.description,
      `${chalk.green('free')} registry metadata, SAS, shell, cards, capabilities`,
      `${chalk.green('gasless')} platform pays SOL fees for MPL Core mint`,
      `${chalk.magenta('x402')} paid inference can sit behind free identity`,
      status,
    ];

    process.stdout.write(
      chalk.cyan('║') +
        ' ' + pad(clip(left, leftWidth), leftWidth) +
        chalk.cyan('│') +
        ' ' + pad(clip(details[i] ?? '', rightWidth), rightWidth) +
        chalk.cyan('║') +
        '\n',
    );
  }

  const label = mode === 'custom' ? 'CUSTOM GASLESS MINT' : mode === 'registry' ? 'REGISTER / DISCOVER' : 'PRESET GASLESS MINT';
  process.stdout.write(chalk.cyan('╠') + border + chalk.cyan('╣') + '\n');
  process.stdout.write(boxed(` ${chalk.bold.white(label)}`, width) + '\n');
  for (const line of commandLines(mode, current, selected)) {
    process.stdout.write(boxed(` ${chalk.green(line)}`, width) + '\n');
  }
  process.stdout.write(chalk.cyan('╠') + border + chalk.cyan('╣') + '\n');
  process.stdout.write(boxed(` ${chalk.gray('[↑↓] browse  [m] preset mint  [c] custom mint  [g] registry  [r] reload  [b] back')}`, width) + '\n');
  process.stdout.write(chalk.cyan('╚') + border + chalk.cyan('╝') + '\n');
}

export async function runAgents(): Promise<void> {
  let loaded = loadCatalog();
  let catalog = loaded.catalog;
  let source = loaded.source;
  let agents = (catalog.agents?.length ? catalog.agents : FALLBACK_AGENTS)
    .filter((agent) => agent.identifier && agent.title)
    .sort((a, b) => a.identifier.localeCompare(b.identifier));
  let selected = agents.findIndex((agent) => agent.identifier === 'solana-clawd-wallet-guardian');
  if (selected < 0) selected = 0;
  let mode: CommandMode = 'preset';
  let status = 'Ready: free registry online; mint flow is gasless.';

  const redraw = (): void => render(agents, selected, catalog, source, mode, status);
  redraw();

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

    const onData = (chunk: string): void => {
      if (chunk === 'b' || chunk === 'B' || chunk === '\x1b') {
        process.stdin.off('data', onData);
        disableRaw();
        resolve();
        return;
      }
      if (chunk === '\x03') {
        process.stdin.off('data', onData);
        disableRaw();
        process.exit(0);
      }
      if (chunk === '\x1b[A') {
        selected = (selected - 1 + agents.length) % agents.length;
        status = `Selected ${agents[selected]?.identifier ?? 'agent'}`;
        redraw();
        return;
      }
      if (chunk === '\x1b[B') {
        selected = (selected + 1) % agents.length;
        status = `Selected ${agents[selected]?.identifier ?? 'agent'}`;
        redraw();
        return;
      }
      if (chunk === 'm' || chunk === 'M') {
        mode = 'preset';
        status = 'Preset mint command staged.';
        redraw();
        return;
      }
      if (chunk === 'c' || chunk === 'C') {
        mode = 'custom';
        status = 'Custom devnet mint command staged.';
        redraw();
        return;
      }
      if (chunk === 'g' || chunk === 'G') {
        mode = 'registry';
        status = 'Registry discovery commands staged.';
        redraw();
        return;
      }
      if (chunk === 'r' || chunk === 'R') {
        loaded = loadCatalog();
        catalog = loaded.catalog;
        source = loaded.source;
        agents = (catalog.agents?.length ? catalog.agents : FALLBACK_AGENTS)
          .filter((agent) => agent.identifier && agent.title)
          .sort((a, b) => a.identifier.localeCompare(b.identifier));
        selected = Math.min(selected, Math.max(0, agents.length - 1));
        status = `Reloaded ${agents.length} agents.`;
        redraw();
      }
    };

    process.stdin.on('data', onData);
  });
}
