import chalk from 'chalk';
import { readVaultInfo, shortAddress, type VaultInfo } from '../sdk.js';

export async function runWallet(): Promise<void> {
  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(chalk.cyanBright.bold('\n  Wallet\n\n'));

  const vault = await readVaultInfo();
  renderVault(vault);

  process.stdout.write('\n');
  process.stdout.write(chalk.gray('  Wallet funding flows live in the packaged clawd CLI:\n'));
  process.stdout.write(chalk.cyan('  clawd fund <usdc_amount>\n'));
  process.stdout.write(chalk.cyan('  clawd feed <clawd_amount>\n\n'));
  process.stdout.write(chalk.gray('  Press any key to return.\n'));
  await waitForAnyKey();
}

function renderVault(vault: VaultInfo): void {
  process.stdout.write(chalk.white.bold('  Agentwallet Vault\n'));
  process.stdout.write(chalk.gray(`  Path: ${vault.path || '(not resolved)'}\n`));

  if (!vault.available) {
    process.stdout.write(chalk.red(`  Status: unavailable${vault.error ? ` (${vault.error})` : ''}\n`));
    return;
  }

  process.stdout.write(chalk.green(`  Status: online · ${vault.wallets.length} wallet(s)\n\n`));

  if (vault.wallets.length === 0) {
    process.stdout.write(chalk.yellow('  No vault wallets found.\n'));
    return;
  }

  process.stdout.write(chalk.gray('  Label                  Chain     Address              Status\n'));
  process.stdout.write(chalk.gray('  ' + '-'.repeat(68) + '\n'));

  for (const wallet of vault.wallets.slice(0, 8)) {
    const label = wallet.label.slice(0, 22).padEnd(22);
    const chain = wallet.chainType.slice(0, 8).padEnd(8);
    const status = wallet.paused ? chalk.red('paused') : chalk.green('active');
    process.stdout.write(
      `  ${chalk.white(label)} ${chalk.cyan(chain)} ${chalk.yellow(shortAddress(wallet.address).padEnd(20))} ${status}\n`,
    );
  }

  if (vault.wallets.length > 8) {
    process.stdout.write(chalk.gray(`  ... and ${vault.wallets.length - 8} more\n`));
  }
}

function waitForAnyKey(): Promise<void> {
  return new Promise(resolve => {
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      if (process.stdin.setRawMode) process.stdin.setRawMode(false);
      resolve();
    });
  });
}
