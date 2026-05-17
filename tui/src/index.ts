#!/usr/bin/env node
/**
 * clawd — Sovereign AI Lobster Runtime
 *
 * Menu-driven launcher for the OpenClawd agentic harness.
 * Keyboard navigation routes to sub-screens; after each
 * sub-screen exits the main menu is re-drawn.
 */

import chalk from 'chalk';

// ─── CLAWD ASCII logo ─────────────────────────────────────────────────────────

const CLAWD_ASCII = [
  ' ██████╗██╗      █████╗ ██╗    ██╗██████╗ ',
  '██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗',
  '██║     ██║     ███████║██║ █╗ ██║██║  ██║',
  '██║     ██║     ██╔══██║██║███╗██║██║  ██║',
  '╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝',
  ' ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝ ',
];

// ─── Menu definition ──────────────────────────────────────────────────────────

interface MenuItem {
  label: string;
  description: string;
  key: string;
}

const MENU_ITEMS: MenuItem[] = [
  { key: '1', label: '🦞  Backroom',         description: 'Two AI agents trapped in infinite debate' },
  { key: '2', label: '📈  Perps',             description: 'Phoenix perpetuals via Vulcan CLI' },
  { key: '3', label: '🪪  Agent Registry',    description: 'Browse, mint, and register gasless Solana agents' },
  { key: '4', label: '💰  Wallet',            description: 'Fund + feed the leviathan' },
  { key: '5', label: '🚀  Spawn automaton',   description: 'Launch the sovereign agent runtime' },
  { key: '6', label: '❌  Exit',              description: 'The backroom will remember you' },
];

// ─── Render helpers ───────────────────────────────────────────────────────────

const DIVIDER = chalk.gray('─'.repeat(48));

function renderMenu(selected: number): void {
  process.stdout.write('\x1b[2J\x1b[H'); // clear + home

  // Logo
  for (const line of CLAWD_ASCII) {
    process.stdout.write(chalk.cyanBright.bold(line) + '\n');
  }

  process.stdout.write('\n');
  process.stdout.write(
    chalk.cyanBright('🦞') +
      chalk.white(' Sovereign AI Lobster Runtime · ') +
      chalk.yellow('$CLAWD on Solana') +
      chalk.gray(' · v0.1.0') +
      '\n',
  );
  process.stdout.write(DIVIDER + '\n');
  process.stdout.write('\n');
  process.stdout.write(chalk.white.bold('Main Menu') + '\n');
  process.stdout.write('\n');

  for (let i = 0; i < MENU_ITEMS.length; i++) {
    const item = MENU_ITEMS[i]!;
    const isSelected = i === selected;
    const cursor = isSelected ? chalk.cyanBright('>') : ' ';
    const num = chalk.gray(`${i + 1}.`);
    const label = isSelected
      ? chalk.cyanBright.bold(item.label)
      : chalk.white(item.label);
    const desc = chalk.gray(item.description);
    process.stdout.write(`${cursor} ${num} ${label}  ${desc}\n`);
  }

  process.stdout.write('\n');
  process.stdout.write(
    chalk.gray('[↑↓ / 1-6] navigate  [Enter] select  [q] exit') + '\n',
  );
}

// ─── Raw mode helpers ─────────────────────────────────────────────────────────

function enableRaw(): void {
  process.stdout.write('\x1b[?25l'); // hide cursor
  if (process.stdin.setRawMode) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
}

function disableRaw(): void {
  process.stdout.write('\x1b[?25h'); // show cursor
  if (process.stdin.setRawMode) process.stdin.setRawMode(false);
}

// ─── Screen launchers ─────────────────────────────────────────────────────────

async function launchScreen(index: number): Promise<void> {
  disableRaw();

  try {
    switch (index) {
      case 0: {
        const { runBackroom } = await import('./screens/backroom.js');
        await runBackroom();
        break;
      }
      case 1: {
        const { runPerps } = await import('./screens/perps.js');
        await runPerps();
        break;
      }
      case 2: {
        const { runAgents } = await import('./screens/agents.js');
        await runAgents();
        break;
      }
      case 3: {
        const { runWallet } = await import('./screens/wallet.js');
        await runWallet();
        break;
      }
      case 4: {
        const { runAutomaton } = await import('./screens/automaton.js');
        await runAutomaton();
        break;
      }
      case 5: {
        // Exit
        process.stdout.write('\x1b[2J\x1b[H');
        process.stdout.write(
          chalk.cyanBright('\n🦞 The backroom will remember you.\n\n'),
        );
        process.exit(0);
      }
    }
  } catch (err) {
    process.stdout.write(
      chalk.red(`\nScreen error: ${String(err)}\n`) +
        chalk.gray('Press any key to return to menu...\n'),
    );
    await waitForAnyKey();
  }
}

function waitForAnyKey(): Promise<void> {
  return new Promise(resolve => {
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', () => {
      if (process.stdin.setRawMode) process.stdin.setRawMode(false);
      resolve();
    });
  });
}

// ─── Main menu loop ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  let selected = 0;

  const runMenuLoop = (): Promise<void> =>
    new Promise(resolve => {
      enableRaw();
      renderMenu(selected);

      const onData = async (chunk: string): Promise<void> => {
        let needRedraw = false;
        let launch = false;

        if (chunk === '\x03') {
          // Ctrl-C
          process.stdin.off('data', onData as (c: string) => void);
          disableRaw();
          process.stdout.write('\x1b[2J\x1b[H');
          process.stdout.write(chalk.cyanBright('\n🦞 The backroom will remember you.\n\n'));
          process.exit(0);
        }

        if (chunk === 'q' || chunk === 'Q') {
          process.stdin.off('data', onData as (c: string) => void);
          disableRaw();
          process.stdout.write('\x1b[2J\x1b[H');
          process.stdout.write(chalk.cyanBright('\n🦞 The backroom will remember you.\n\n'));
          process.exit(0);
        }

        // Arrow up
        if (chunk === '\x1b[A') {
          selected = (selected - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
          needRedraw = true;
        }

        // Arrow down
        if (chunk === '\x1b[B') {
          selected = (selected + 1) % MENU_ITEMS.length;
          needRedraw = true;
        }

        // Number keys 1-6
        const numMatch = chunk.match(/^[1-6]$/);
        if (numMatch) {
          const idx = parseInt(chunk, 10) - 1;
          selected = idx;
          launch = true;
        }

        // Enter or Space
        if (chunk === '\r' || chunk === '\n' || chunk === ' ') {
          launch = true;
        }

        if (launch) {
          process.stdin.off('data', onData as (c: string) => void);
          process.stdin.pause();
          await launchScreen(selected);
          // After sub-screen returns, re-enter menu loop
          resolve();
          return;
        }

        if (needRedraw) {
          renderMenu(selected);
        }
      };

      process.stdin.on('data', onData as (c: string) => void);
    });

  // Keep re-entering menu until process exits
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await runMenuLoop();
  }
}

main().catch(err => {
  disableRaw();
  console.error('Fatal:', err);
  process.exit(1);
});
