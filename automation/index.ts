#!/usr/bin/env node
/**
 * automation/index.ts — Leviathan automation entrypoint
 *
 * The /automation folder is the central build + runtime orchestration
 * layer for solana-clawd. It owns:
 *
 *   • leviathan.sh   — one-liner runtime bootstrap (solanaclawd.com/leviathan.sh)
 *   • runtime.ts     — Node-side runtime builder called by leviathan.sh
 *   • ci.ts          — CI/CD pipeline (typecheck → lint → build → test)
 *   • index.ts       — CLI dispatcher (this file)
 *
 * Quick start:
 *   curl -fsSL https://solanaclawd.com/leviathan.sh | sh
 *
 * Local:
 *   npx tsx automation/index.ts [flags]
 *   bash automation/leviathan.sh [flags]
 *   npm run automation:build
 *   npm run automation:ci
 *   npm run automation:spawn
 *   npm run automation:full
 */

import { parseArgs } from 'node:util';
import { buildRuntime } from './runtime.js';
import { runCi } from './ci.js';

const { values } = parseArgs({
  options: {
    build:      { type: 'boolean', default: false },
    spawn:      { type: 'boolean', default: false },
    run:        { type: 'boolean', default: false },
    hermes:     { type: 'boolean', default: false },
    brain:      { type: 'boolean', default: false },
    mcp:        { type: 'boolean', default: false },
    full:       { type: 'boolean', default: false },
    ci:         { type: 'boolean', default: false },
    'no-install': { type: 'boolean', default: false },
    quiet:      { type: 'boolean', default: false },
    help:       { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
});

if (values.help) {
  console.log(`
automation/index.ts — Leviathan runtime dispatcher

  curl -fsSL https://solanaclawd.com/leviathan.sh | sh

Flags:
  --build       Compile TypeScript to dist/
  --spawn       Hatch a new Leviathan identity
  --run         Start the OODA pulse loop
  --hermes      Launch HERMES x402 terminal (TUI)
  --brain       Init Clawd memory subsystem
  --mcp         Start MCP tool server
  --full        All of the above
  --ci          Type-check + lint + build (CI mode)
  --no-install  Skip npm install
  --quiet       Suppress banners
  -h|--help     Show this message
`);
  process.exit(0);
}

async function main(): Promise<void> {
  if (values.ci) {
    await runCi({ quiet: values.quiet });
    return;
  }

  const full = values.full ?? false;

  await buildRuntime({
    install: !(values['no-install'] ?? false),
    build:   full || (values.build ?? false),
    spawn:   full || (values.spawn ?? false),
    brain:   full || (values.brain ?? false),
    mcp:     full || (values.mcp ?? false),
    hermes:  full || (values.hermes ?? false),
    run:     values.run ?? false,
    quiet:   values.quiet ?? false,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
