import { readJSONSync } from 'fs-extra';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 🦞 Lobster Library — File path configuration
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
export const root = resolve(__dirname, '../..');

// Core directory paths
export const agentsDir = resolve(root, './src'); // Agent config directory
export const schemasDir = resolve(root, './schema'); // Schema directory
export const localesDir = resolve(root, './locales'); // i18n directory
export const publicDir = resolve(root, './public'); // Build output directory

// Directory contents
export const agents = readdirSync(agentsDir, { withFileTypes: true });
export const agentLocales = readdirSync(localesDir, { withFileTypes: true });

// Template file paths
export const templatePath = resolve(root, 'agent-template.json');
export const templateFullPath = resolve(root, 'agent-template-full.json');

// Index file paths
export const indexPath = resolve(publicDir, 'index.json');
export const indexCnPath = resolve(publicDir, 'index.zh-CN.json');

// README file paths
export const readmePath = resolve(root, 'README.md');
export const readmeCnPath = resolve(root, 'README.zh-CN.md');

// Metadata
export const metaPath = resolve(root, 'meta.json');
export const meta = readJSONSync(metaPath);

// 🦞 Lobster Library external links
export const host = 'https://x402agent.github.io/LobsterLibrary';
export const githubHomepage = 'https://github.com/x402agent/LobsterLibrary';

// README split marker
export const readmeSplit = '<!-- AGENT CATALOG -->';

// 🦞 Solana Financial Agent Categories
export const category = [
  'trading',          // DEX trading, spot, perpetuals
  'defi',             // DeFi yield, lending, staking
  'ml-prediction',    // Machine learning, price prediction, sentiment
  'payments',         // x402, MPP, provider routing, treasury flows
  'risk-management',  // Portfolio risk, position sizing, monitoring
  'deep-research',    // Tokenomics, audits, whitepapers, narratives
  'technical-analysis', // Charts, indicators, patterns
  'infrastructure',   // RPC, bots, data pipelines, Anchor
  'strategies',       // Memecoins, airdrops, NFTs, market making
  'macro',            // Macro economics, regulation, forensics
  'agentic',          // Multi-agent orchestration, autonomous trading
];

// Import i18n config
export { default as config } from '../../.i18nrc.js';
