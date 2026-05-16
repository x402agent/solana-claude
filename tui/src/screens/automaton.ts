import chalk from 'chalk';

export async function runAutomaton(): Promise<void> {
  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(chalk.cyanBright.bold('\n  Automaton\n\n'));
  process.stdout.write(chalk.gray('  Build and launch the runtime from the repo checkout:\n'));
  process.stdout.write(chalk.cyan('  cd openclawd-framework/multiagents-infinite-backroom/automaton-main && npm install && npm run build\n'));
  process.stdout.write(chalk.cyan('  clawd spawn\n\n'));
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
