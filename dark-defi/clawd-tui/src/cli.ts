#!/usr/bin/env node
import { loadConfig } from './config.js';
import { runAgentWithRetry, type ChatMessage, type AgentEvent } from './agent.js';
import { Session } from './session.js';
import { ApprovalGate } from './approval.js';
import { TuiRenderer } from './renderer.js';
import { Loader } from './loader.js';
import { printBanner } from './banner.js';
import { detectBg } from './terminal-bg.js';
import { getInput, printCwdHint } from './input.js';
import { handleCommand, maybeAnalyzeAddress } from './commands.js';
import { resolveApiKey } from './oauth.js';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GRAY = '\x1b[90m';
const ORANGE = '\x1b[38;5;215m';
const RED = '\x1b[31m';

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

async function main() {
  const argv = process.argv.slice(2);
  const oauthMode: 'web' | 'local' = argv.includes('--local-callback') ? 'local' : 'web';
  const forceLogin = argv.includes('--login');

  let config;
  try {
    config = loadConfig();
  } catch (err: unknown) {
    const e = err as { message: string };
    console.error(`${RED}${e.message}${RESET}`);
    process.exit(1);
  }

  if (forceLogin || !config.apiKey) {
    try {
      config.apiKey = await resolveApiKey({ mode: oauthMode, forceLogin });
    } catch (err: unknown) {
      const e = err as { message: string };
      console.error(`${RED}OpenRouter login failed: ${e.message}${RESET}`);
      console.error(
        `${DIM}Try \`clawd --login\` to retry, or \`clawd --login --local-callback\` to use the localhost flow.${RESET}`,
      );
      process.exit(1);
    }
  }

  if (config.showBanner) {
    printBanner(config.model);
  } else {
    const width = Math.min(process.stdout.columns ?? 60, 60);
    const line = GRAY + '─'.repeat(width) + RESET;
    console.log(`\n${line}`);
    console.log(`  ${BOLD}Clawd${RESET}  ${DIM}v0.1.0${RESET}`);
    console.log(`  ${DIM}model${RESET}  ${ORANGE}${config.model}${RESET}`);
    if (config.slashCommands) console.log(`  ${DIM}/help for commands${RESET}`);
    console.log(`${line}\n`);
  }

  const bg = config.display.inputStyle === 'block' ? await detectBg() : '';
  let session = new Session(config.sessionDir);
  const approval = new ApprovalGate();

  const newSession = () => {
    session = new Session(config.sessionDir);
    return session;
  };

  while (true) {
    const input = await getInput(config.display.inputStyle, bg);
    const trimmed = input.trim();
    if (!trimmed) continue;

    if (config.display.inputStyle !== 'plain') {
      printCwdHint();
    }

    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      console.log(`\n  ${DIM}👋 later${RESET}\n`);
      process.exit(0);
    }

    if (config.slashCommands && trimmed.startsWith('/')) {
      const result = await handleCommand(trimmed, { config, session, newSession });
      if (result.handled) continue;
    }

    if (await maybeAnalyzeAddress(trimmed, { config, session, newSession })) {
      continue;
    }

    session.addUser(trimmed);

    const renderer = new TuiRenderer(config.display);
    const loader = new Loader(config.loaderText);
    loader.start();
    let first = true;

    const onEvent = (event: AgentEvent) => {
      if (first) {
        loader.stop();
        first = false;
      }
      if (event.type === 'tool_call') {
        session.recordToolCall(event.name, event.args);
      } else if (event.type === 'tool_result') {
        session.recordToolResult(event.name, event.output);
      }
      renderer.onEvent(event);
    };

    console.log();
    try {
      const result = await runAgentWithRetry(
        config,
        session.getMessages() as ChatMessage[],
        {
          onEvent,
          approve: (name, args) => approval.prompt(name, args),
        },
      );
      loader.stop();
      renderer.finish();

      if (result.text) {
        session.addAssistant(result.text);
      }

      const inT = result.usage?.inputTokens ?? 0;
      const outT = result.usage?.outputTokens ?? 0;
      session.addUsage(inT, outT);
      console.log(`${GRAY}  ${formatTokens(inT)} in · ${formatTokens(outT)} out${RESET}\n`);
    } catch (err: unknown) {
      loader.stop();
      renderer.finish();
      const e = err as { message: string };
      console.log(`\n  ${RED}error${RESET} ${DIM}${e.message}${RESET}\n`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
