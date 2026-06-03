#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - CLI Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { config as dotenvConfig } from 'dotenv';
import chalk from 'chalk';
import figlet from 'figlet';
import boxen from 'boxen';
import ora from 'ora';
import { App } from './App.js';
import { loadConfigFromEnv } from './config/schema.js';
import { SolanaWalletManager, shortenAddress } from './skills/solana-wallet.js';
import { formatBytes, getDarkDefiAutomationSnapshot } from './services/darkdefi-automation.js';

// Load environment variables
dotenvConfig();

// ─────────────────────────────────────────────────────────────────────────────
// CLI Setup
// ─────────────────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('dark-ralph')
  .description('Dark Ralph TUI - Recursive Autonomous Solana Intelligence Agent')
  .version('1.0.0');

// ─────────────────────────────────────────────────────────────────────────────
// Main Run Command
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('run')
  .description('Start Dark Ralph TUI')
  .option('-a, --auto', 'Enable autonomous mode (default)', true)
  .option('-i, --interactive', 'Start in interactive mode')
  .option('-w, --wallet <address>', 'Wallet address to monitor')
  .option('--headless', 'Run without TUI (daemon mode)')
  .action(async (options) => {
    const config = loadConfigFromEnv();

    // Show banner
    if (!options.headless) {
      // MAWD ASCII Art with Lobster
      const lobsterArt = `
${chalk.red(`
       \\          /
        \\   🦞   /
         \\  ||  /
    (\\__/)  ||  (\\__/)
    (o   o) || (o   o)
     \\   /  ||  \\   /
      \`-'  /  \\  \`-'
          /    \\
`)}
${chalk.green(`
 ███╗   ███╗ █████╗ ██╗    ██╗██████╗ 
 ████╗ ████║██╔══██╗██║    ██║██╔══██╗
 ██╔████╔██║███████║██║ █╗ ██║██║  ██║
 ██║╚██╔╝██║██╔══██║██║███╗██║██║  ██║
 ██║ ╚═╝ ██║██║  ██║╚███╔███╔╝██████╔╝
 ╚═╝     ╚═╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝ 
`)}`;
      console.log(lobsterArt);
      console.log(chalk.gray('  🦞 Recursive Autonomous Solana Intelligence\n'));
    }

    // Validate required keys
    const spinner = ora('Initializing MAWD...').start();

    const missingKeys: string[] = [];
    if (!config.apiKeys?.HELIUS_API_KEY) missingKeys.push('HELIUS_API_KEY');

    if (missingKeys.length > 0 && !options.headless) {
      spinner.warn('Some API keys are missing');
      console.log(chalk.yellow(`\n⚠️  Missing keys: ${missingKeys.join(', ')}`));
      console.log(chalk.gray('  Run `dark-ralph setup` to configure\n'));
    } else {
      spinner.succeed('Configuration loaded');
    }

    // Start the TUI
    if (!options.headless) {
      const { waitUntilExit } = render(
        <App
          config={{
            heliusKey: config.apiKeys?.HELIUS_API_KEY,
            heliusRpc: config.apiKeys?.HELIUS_RPC_URL,
            birdeyeKey: config.apiKeys?.BIRDEYE_API_KEY,
            grokKey: config.apiKeys?.XAI_API_KEY,
            perplexityKey: config.apiKeys?.PERPLEXITY_API_KEY,
            openRouterKey: config.apiKeys?.OPENROUTER_API_KEY,
            newsApiKey: config.apiKeys?.NEWS_API_KEY,
            serpApiKey: config.apiKeys?.SERP_API_KEY,
            financialDatasetKey: config.apiKeys?.FINANCIAL_DATASET_API_KEY,
            walletAddress: options.wallet || config.solana?.privateKey,
            autoMode: !options.interactive,
          }}
        />
      );

      await waitUntilExit();
    } else {
      // Headless mode - just log
      console.log(chalk.green('Dark Ralph running in headless mode...'));
      console.log(chalk.gray('Press Ctrl+C to stop'));

      // Keep process alive
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\nDark Ralph shutting down...'));
        process.exit(0);
      });
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Setup Command
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    console.log(
      boxen(chalk.greenBright('Dark Ralph Setup Wizard'), {
        padding: 1,
        borderColor: 'green',
        borderStyle: 'double',
      })
    );

    console.log(chalk.cyan('\nRequired API Keys:'));
    console.log(chalk.gray('─'.repeat(50)));

    const keys = [
      { name: 'HELIUS_API_KEY', url: 'https://helius.xyz/', desc: 'Solana RPC & DAS' },
      { name: 'BIRDEYE_API_KEY', url: 'https://birdeye.so/', desc: 'Token data & analytics' },
      { name: 'XAI_API_KEY', url: 'https://x.ai/api', desc: 'Grok AI for search' },
      { name: 'PERPLEXITY_API_KEY', url: 'https://perplexity.ai/', desc: 'AI research' },
      { name: 'NEWS_API_KEY', url: 'https://newsapi.org/', desc: 'Crypto news' },
      { name: 'SERP_API_KEY', url: 'https://serpapi.com/', desc: 'Search results' },
      { name: 'FINANCIAL_DATASET_API_KEY', url: 'https://financialdatasets.ai/', desc: 'Market data' },
    ];

    keys.forEach((key) => {
      const hasKey = !!process.env[key.name];
      const status = hasKey ? chalk.green('✓') : chalk.red('✗');
      console.log(`${status} ${chalk.white(key.name.padEnd(25))} ${chalk.gray(key.desc)}`);
      if (!hasKey) {
        console.log(chalk.gray(`    Get your key at: ${key.url}`));
      }
    });

    console.log('\n' + chalk.gray('─'.repeat(50)));
    console.log(chalk.yellow('\n📝 Create a .env file with your API keys:'));
    console.log(chalk.gray('   cp .env.example .env'));
    console.log(chalk.gray('   # Edit .env with your keys'));
    console.log(chalk.yellow('\n🚀 Then run:'));
    console.log(chalk.white('   dark-ralph run'));
  });

// ─────────────────────────────────────────────────────────────────────────────
// Wallet Commands
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('wallet')
  .description('Wallet management commands')
  .option('-c, --create', 'Create new wallet')
  .option('-b, --balance', 'Show wallet balance')
  .option('-a, --address', 'Show wallet address')
  .action(async (options) => {
    const config = loadConfigFromEnv();
    const rpcUrl = config.apiKeys?.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';

    const wallet = new SolanaWalletManager(rpcUrl);

    if (options.create) {
      const spinner = ora('Creating wallet...').start();
      const result = await wallet.createWallet();

      if (result.created) {
        spinner.succeed('New wallet created!');
        console.log(chalk.green(`\n📍 Address: ${result.publicKey}`));
        console.log(chalk.yellow('\n⚠️  Your wallet is saved at ~/.darkralph/wallet.json'));
        console.log(chalk.yellow('   Keep this file safe and never share it!'));
      } else {
        spinner.info('Wallet already exists');
        console.log(chalk.cyan(`\n📍 Address: ${result.publicKey}`));
      }
      return;
    }

    // Load existing wallet
    if (!wallet.loadWallet()) {
      console.log(chalk.red('No wallet found. Run `dark-ralph wallet --create` first.'));
      return;
    }

    if (options.address) {
      console.log(chalk.green(`Address: ${wallet.getPublicKey()}`));
      return;
    }

    if (options.balance) {
      const spinner = ora('Fetching balance...').start();
      try {
        const info = await wallet.getWalletInfo();
        spinner.succeed('Balance fetched');

        console.log(
          boxen(
            `${chalk.cyan('Address:')} ${info.publicKey}\n` +
            `${chalk.green('SOL Balance:')} ${info.solBalance.toFixed(4)} SOL\n` +
            `${chalk.yellow('Tokens:')} ${info.tokens.length} holdings`,
            {
              padding: 1,
              borderColor: 'green',
              title: 'Wallet Info',
            }
          )
        );
      } catch (error: any) {
        spinner.fail('Failed to fetch balance');
        console.log(chalk.red(error.message));
      }
      return;
    }

    // Default: show address
    console.log(chalk.green(`Address: ${wallet.getPublicKey()}`));
  });

// ─────────────────────────────────────────────────────────────────────────────
// Status Command
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Check API connection status')
  .action(async () => {
    const config = loadConfigFromEnv();
    const automation = await getDarkDefiAutomationSnapshot();

    console.log(chalk.greenBright('\nDarkDefi Status Check\n'));
    console.log(chalk.gray('─'.repeat(50)));

    const checks = [
      { name: 'Helius', key: config.apiKeys?.HELIUS_API_KEY },
      { name: 'Birdeye', key: config.apiKeys?.BIRDEYE_API_KEY },
      { name: 'xAI Grok', key: config.apiKeys?.XAI_API_KEY },
      { name: 'Perplexity', key: config.apiKeys?.PERPLEXITY_API_KEY },
      { name: 'News API', key: config.apiKeys?.NEWS_API_KEY },
      { name: 'SERP API', key: config.apiKeys?.SERP_API_KEY },
      { name: 'Financial Datasets', key: config.apiKeys?.FINANCIAL_DATASET_API_KEY },
      { name: 'OpenRouter', key: config.apiKeys?.OPENROUTER_API_KEY },
    ];

    for (const check of checks) {
      const status = check.key ? chalk.green('✓ CONFIGURED') : chalk.red('✗ NOT SET');
      console.log(`${check.name.padEnd(20)} ${status}`);
    }

    console.log(chalk.gray('─'.repeat(50)));

    const configured = checks.filter((c) => c.key).length;
    console.log(chalk.cyan(`\n${configured}/${checks.length} APIs configured`));

    console.log('\n' + chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan('Automation loops'));
    for (const loop of automation.loops) {
      const color =
        loop.status === 'live' ? chalk.green :
        loop.status === 'ready' ? chalk.cyan :
        loop.status === 'blocked' ? chalk.red :
        chalk.yellow;
      console.log(`${color(loop.status.toUpperCase().padEnd(8))} ${chalk.white(loop.label)} ${chalk.gray(loop.detail)}`);
    }
  });

program
  .command('automation')
  .description('Show DarkDefi automation loop readiness')
  .action(async () => {
    const automation = await getDarkDefiAutomationSnapshot();

    console.log(
      boxen(chalk.cyanBright('DarkDefi Automation Control Plane'), {
        padding: 1,
        borderColor: 'cyan',
        borderStyle: 'classic',
      })
    );

    console.log(chalk.gray(`Snapshot: ${automation.generatedAt}`));
    console.log(chalk.gray('─'.repeat(72)));

    for (const loop of automation.loops) {
      const color =
        loop.status === 'live' ? chalk.green :
        loop.status === 'ready' ? chalk.cyan :
        loop.status === 'blocked' ? chalk.red :
        chalk.yellow;
      console.log(`${color(loop.status.toUpperCase().padEnd(8))} ${chalk.white.bold(loop.label)}`);
      console.log(chalk.gray(`         ${loop.detail}`));
      console.log(chalk.cyan(`         ${loop.action}`));
    }

    console.log('\n' + chalk.gray('─'.repeat(72)));
    console.log(chalk.yellow('Release gate'));
    console.log(`  Workflow: ${automation.releaseGate.workflowReady ? chalk.green('ready') : chalk.red('missing')}`);
    console.log(`  Birdeye:  ${automation.releaseGate.birdeyeConfigured ? chalk.green('configured') : chalk.red('missing')}`);
    console.log(`  Token:    ${automation.releaseGate.tokenAddressConfigured ? chalk.green('configured') : chalk.red('missing')}`);
    console.log(`  Target:   $${Number(automation.releaseGate.target).toLocaleString()}`);

    console.log('\n' + chalk.gray('─'.repeat(72)));
    console.log(chalk.yellow('Edge API'));
    console.log(`  Staging:    ${automation.cloudflare.stagingHealthy ? chalk.green('healthy') : chalk.red('down')} ${automation.cloudflare.stagingUrl}`);
    console.log(`  Production: ${automation.cloudflare.productionHealthy ? chalk.green('healthy') : chalk.red('down')} ${automation.cloudflare.productionUrl}`);

    console.log('\n' + chalk.gray('─'.repeat(72)));
    console.log(chalk.yellow('Packages'));
    for (const pkg of automation.packages) {
      const status = pkg.present ? chalk.green('ready') : chalk.red('missing');
      const channel = pkg.publishable ? 'npm candidate' : 'internal';
      console.log(`  ${status} ${pkg.name.padEnd(30)} ${pkg.present ? formatBytes(pkg.sizeBytes).padStart(9) : ''.padStart(9)} ${chalk.gray(channel)}`);
    }

    console.log('\n' + chalk.gray('─'.repeat(72)));
    console.log(chalk.yellow('Solana programs'));
    for (const programInfo of automation.solanaPrograms) {
      const status = programInfo.devnetDeployed ? chalk.green('live') : programInfo.deployable ? chalk.red('pending') : chalk.gray('reference');
      const artifact = programInfo.artifactPath ? (programInfo.artifactBuilt ? chalk.green('built') : chalk.red('missing')) : chalk.gray('n/a');
      console.log(`  ${status.padEnd(17)} ${programInfo.name.padEnd(24)} ${shortenAddress(programInfo.programId)} ${artifact}`);
      console.log(chalk.gray(`    ${programInfo.note}`));
    }
    console.log('\n' + chalk.gray('─'.repeat(72)));
    console.log(chalk.yellow('Legacy staking registry'));
    console.log(`  Program:  ${automation.solanaProgram.programId}`);
    console.log(`  Artifact: ${automation.solanaProgram.artifactBuilt ? chalk.green('built') : chalk.red('missing')}`);
    console.log(`  Deploy:   ${automation.solanaProgram.deployBlocked ? chalk.yellow(automation.solanaProgram.blocker) : chalk.green('ready')}`);
  });

// ─────────────────────────────────────────────────────────────────────────────
// Info Command
// ─────────────────────────────────────────────────────────────────────────────

program
  .command('info')
  .description('Display system information')
  .action(() => {
    const info = {
      name: 'Dark Ralph TUI',
      version: '1.0.0',
      runtime: `Bun ${Bun.version}`,
      platform: `${process.platform} ${process.arch}`,
      node: process.version,
    };

    console.log(
      boxen(
        Object.entries(info)
          .map(([k, v]) => `${chalk.cyan(k.padEnd(12))} ${chalk.white(v)}`)
          .join('\n'),
        {
          padding: 1,
          borderColor: 'green',
          title: 'Dark Ralph Info',
          titleAlignment: 'center',
        }
      )
    );
  });

// ─────────────────────────────────────────────────────────────────────────────
// Default Command (run)
// ─────────────────────────────────────────────────────────────────────────────

program.action(() => {
  const runCmd = program.commands.find((c) => c.name() === 'run');
  if (runCmd) runCmd.parseAsync(['run', '--auto'], { from: 'user' });
});

// Parse arguments
program.parse();
