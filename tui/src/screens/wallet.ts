import chalk from 'chalk';

export async function runWallet(): Promise<void> {
  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(chalk.cyanBright.bold('\n  Wallet\n\n'));
  process.stdout.write(chalk.gray('  Wallet funding flows live in the packaged clawd CLI:\n'));
  process.stdout.write(chalk.cyan('  clawd fund <usdc_amount>\n'));
  process.stdout.write(chalk.cyan('  clawd feed <clawd_amount>\n\n'));
  process.stdout.write(chalk.gray('  Press any key to return.\n'));
  await waitForAnyKey();
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
