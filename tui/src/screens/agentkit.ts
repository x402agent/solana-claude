/**
 * Solana Agent Kit — Complete TUI screen
 *
 * 7 categories: Token Ops · Trading/Perps · DeFi/Yield · NFT/MPL ·
 *               x402/Payments · Automaton/Runtime · Skills/Catalog
 *
 * Sources: agents/src/*.json, Perps/clawd-agents-perps, automaton-main scripts
 */

import chalk from 'chalk';

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

// ─── Categories ───────────────────────────────────────────────────────────────

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
        cmd: "curl -X POST https://x402.wtf/api/mint/agent -H 'Content-Type: application/json' -d '{\"agentId\":1,\"ownerPubkey\":\"<YOUR_PUBKEY>\",\"network\":\"mainnet\"}'",
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
        cmd: "curl -H 'X-Payment: <TOKEN>' https://x402.wtf/api/data/sol-price",
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
    subtitle: 'ClawdHub · Agent skills · On-chain routing · Catalog sync',
    commands: [
      {
        name: 'List Solana skills',
        cmd: 'clawdhub list --category solana --format table',
        description: 'Browse all installed Solana skills via ClawdHub',
        risk: 'safe',
        env: [],
      },
      {
        name: 'Install skill',
        cmd: 'clawdhub install <SKILL_SLUG>',
        description: 'Install a skill from ClawdHub registry',
        risk: 'safe',
        env: [],
      },
      {
        name: 'Vulcan quickstart skill',
        cmd: 'clawd skill run vulcan-quickstart',
        description: 'Load the Vulcan perps quickstart skill',
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

function visible(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function pad(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - visible(s)));
}

function clip(s: string, width: number): string {
  const raw = s.replace(/\x1b\[[0-9;]*m/g, ''); // eslint-disable-line no-control-regex
  if (raw.length <= width) return s;
  return raw.slice(0, Math.max(0, width - 1)) + '…';
}

function riskBadge(r: KitCommand['risk']): string {
  if (r === 'high') return chalk.red('[HIGH]');
  if (r === 'medium') return chalk.yellow('[MED] ');
  return chalk.green('[SAFE]');
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(
  catIdx: number,
  cmdIdx: number,
  status: string,
  copied: boolean,
): void {
  process.stdout.write('\x1b[2J\x1b[H');
  const cols = Math.max(100, Math.min(process.stdout.columns || 130, 148));
  const border = chalk.cyan('═'.repeat(cols - 2));
  const cat = CATEGORIES[catIdx]!;
  const cmd = cat.commands[cmdIdx] ?? cat.commands[0]!;

  // ── Header ──────────────────────────────────────────────────────────────────
  const hdr = (txt: string) => chalk.cyan('║') + pad(' ' + txt, cols - 2) + chalk.cyan('║');
  process.stdout.write(chalk.cyan('╔') + border + chalk.cyan('╗\n'));
  process.stdout.write(
    hdr(
      chalk.bold.cyanBright('🦞 SOLANA AGENT KIT') +
      chalk.gray('  ·  Complete toolkit: token · perps · DeFi · NFT · x402 · automaton'),
    ),
  );
  process.stdout.write('\n');
  process.stdout.write(
    hdr(
      chalk.yellow('$CLAWD') +
      chalk.gray(' CA: 8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump  ·  ') +
      chalk.cyan('x402.wtf') +
      chalk.gray('  ·  ') +
      chalk.cyan('solanaclawd.com'),
    ),
  );
  process.stdout.write('\n');
  process.stdout.write(chalk.cyan('╠') + border + chalk.cyan('╣\n'));

  // ── Two-column body ─────────────────────────────────────────────────────────
  const leftW = 28;
  const rightW = cols - leftW - 5; // │ padding

  process.stdout.write(
    chalk.cyan('║') +
    ' ' + pad(chalk.bold.white('CATEGORY'), leftW - 2) + ' ' +
    chalk.cyan('│') +
    ' ' + pad(chalk.bold.white(`COMMANDS  —  ${cat.icon} ${cat.label}`), rightW - 1) +
    chalk.cyan('║\n'),
  );
  process.stdout.write(
    chalk.cyan('║') +
    ' ' + pad(chalk.gray('─'.repeat(leftW - 2)), leftW - 2) + ' ' +
    chalk.cyan('│') +
    ' ' + pad(chalk.gray(cat.subtitle), rightW - 1) +
    chalk.cyan('║\n'),
  );

  const rowCount = Math.max(CATEGORIES.length, cat.commands.length);

  for (let i = 0; i < rowCount; i++) {
    const c = CATEGORIES[i];
    const leftStr = c
      ? (i === catIdx
        ? chalk.cyanBright('▶ ') + chalk.bold.cyanBright(`${c.key}. ${c.icon} ${c.label}`)
        : chalk.gray(`  ${c.key}. `) + chalk.white(`${c.icon} ${c.label}`))
      : '';

    const cmdItem = cat.commands[i];
    const rightStr = cmdItem
      ? (i === cmdIdx
        ? chalk.cyanBright('► ') + chalk.bold.white(cmdItem.name) + '  ' + riskBadge(cmdItem.risk)
        : chalk.gray('  ') + chalk.white(cmdItem.name) + '  ' + riskBadge(cmdItem.risk))
      : '';

    process.stdout.write(
      chalk.cyan('║') +
      ' ' + pad(clip(leftStr, leftW - 2), leftW - 2) + ' ' +
      chalk.cyan('│') +
      ' ' + pad(clip(rightStr, rightW - 1), rightW - 1) +
      chalk.cyan('║\n'),
    );
  }

  // ── Command detail ───────────────────────────────────────────────────────────
  process.stdout.write(chalk.cyan('╠') + border + chalk.cyan('╣\n'));

  const labelLine = chalk.bold.white(`  ${cmd.name}`) + '  ' + riskBadge(cmd.risk);
  process.stdout.write(chalk.cyan('║') + pad(' ' + labelLine, cols - 2) + chalk.cyan('║\n'));

  const descLine = chalk.gray(`  ${cmd.description}`);
  process.stdout.write(chalk.cyan('║') + pad(' ' + descLine, cols - 2) + chalk.cyan('║\n'));

  // Command line (may be long — wrap at cols-4)
  const cmdRaw = cmd.cmd;
  const maxCmdW = cols - 6;
  const chunks: string[] = [];
  for (let i = 0; i < cmdRaw.length; i += maxCmdW) {
    chunks.push(cmdRaw.slice(i, i + maxCmdW));
  }
  for (const chunk of chunks) {
    process.stdout.write(
      chalk.cyan('║') + pad('  ' + chalk.green(chunk), cols - 2) + chalk.cyan('║\n'),
    );
  }

  // Env vars required
  if (cmd.env && cmd.env.length > 0) {
    const envLine = chalk.gray('  env: ') + chalk.yellow(cmd.env.join('  '));
    process.stdout.write(chalk.cyan('║') + pad(' ' + clip(envLine, cols - 3), cols - 2) + chalk.cyan('║\n'));
  }

  // Status / copy confirmation
  const statusLine = copied
    ? chalk.green('  ✓ Command copied to clipboard!')
    : chalk.gray('  ' + status);
  process.stdout.write(chalk.cyan('║') + pad(' ' + statusLine, cols - 2) + chalk.cyan('║\n'));

  // ── Footer ───────────────────────────────────────────────────────────────────
  process.stdout.write(chalk.cyan('╠') + border + chalk.cyan('╣\n'));
  process.stdout.write(
    chalk.cyan('║') +
    pad(
      ' ' + chalk.gray('[Tab/←→] category  [↑↓] command  [c] copy cmd  [e] show env  [b/Esc] back'),
      cols - 2,
    ) +
    chalk.cyan('║\n'),
  );
  process.stdout.write(chalk.cyan('╚') + border + chalk.cyan('╝\n'));
}

// ─── Clipboard helper (best-effort) ──────────────────────────────────────────

async function copyToClipboard(text: string): Promise<boolean> {
  const { execFile } = await import('node:child_process');
  try {
    const tool = process.platform === 'darwin' ? 'pbcopy' : 'xclip';
    const args = process.platform === 'linux' ? ['-selection', 'clipboard'] : [];
    await new Promise<void>((res, rej) => {
      const p = execFile(tool, args);
      if (p.stdin) { p.stdin.write(text); p.stdin.end(); }
      p.on('close', c => (c === 0 ? res() : rej(new Error(`exit ${c}`))));
    });
    return true;
  } catch { /* ignore */ }
  return false;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runAgentKit(): Promise<void> {
  let catIdx = 0;
  let cmdIdx = 0;
  let status = 'Ready — browse categories and commands.';
  let copied = false;

  const redraw = () => render(catIdx, cmdIdx, status, copied);
  redraw();

  return new Promise<void>(resolve => {
    const enableRaw = () => {
      if (process.stdin.setRawMode) process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
    };
    const disableRaw = () => {
      if (process.stdin.setRawMode) process.stdin.setRawMode(false);
    };

    enableRaw();

    const onData = async (chunk: string): Promise<void> => {
      copied = false;

      // Exit
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

      const cat = CATEGORIES[catIdx]!;

      // Arrow up — previous command
      if (chunk === '\x1b[A') {
        cmdIdx = (cmdIdx - 1 + cat.commands.length) % cat.commands.length;
        status = `Command: ${cat.commands[cmdIdx]?.name}`;
        redraw();
        return;
      }
      // Arrow down — next command
      if (chunk === '\x1b[B') {
        cmdIdx = (cmdIdx + 1) % cat.commands.length;
        status = `Command: ${cat.commands[cmdIdx]?.name}`;
        redraw();
        return;
      }
      // Arrow left / Tab — previous category
      if (chunk === '\x1b[D' || chunk === '\x1b[Z') {
        catIdx = (catIdx - 1 + CATEGORIES.length) % CATEGORIES.length;
        cmdIdx = 0;
        status = `Category: ${CATEGORIES[catIdx]?.label}`;
        redraw();
        return;
      }
      // Arrow right / Tab forward — next category
      if (chunk === '\x1b[C' || chunk === '\t') {
        catIdx = (catIdx + 1) % CATEGORIES.length;
        cmdIdx = 0;
        status = `Category: ${CATEGORIES[catIdx]?.label}`;
        redraw();
        return;
      }

      // Number keys 1-7 jump to category
      const numMatch = chunk.match(/^[1-7]$/);
      if (numMatch) {
        catIdx = parseInt(chunk, 10) - 1;
        cmdIdx = 0;
        status = `Category: ${CATEGORIES[catIdx]?.label}`;
        redraw();
        return;
      }

      // Copy command
      if (chunk === 'c' || chunk === 'C') {
        const currentCmd = CATEGORIES[catIdx]!.commands[cmdIdx]?.cmd ?? '';
        const ok = await copyToClipboard(currentCmd);
        copied = ok;
        status = ok ? 'Copied!' : 'Copy failed — paste manually from detail above.';
        redraw();
        return;
      }

      // Show env vars
      if (chunk === 'e' || chunk === 'E') {
        const envVars = CATEGORIES[catIdx]!.commands[cmdIdx]?.env ?? [];
        status = envVars.length
          ? `Required env: ${envVars.join(', ')}`
          : 'No env vars required for this command.';
        redraw();
        return;
      }
    };

    process.stdin.on('data', onData as (c: string) => void);
  });
}
