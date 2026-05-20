/**
 * UltraThink Blockchain — TUI Reference Panel
 *
 * Interactive browser for the Ultrathink Blockchain Formula:
 * depth ladder · 8-phase protocol · antipatterns · templates
 *
 * Source: agents/skills/ultrathink-blockchain/SKILL.md
 */

import chalk from 'chalk';

// ─── Sections ─────────────────────────────────────────────────────────────────

interface Section {
  key: string;
  icon: string;
  label: string;
  lines: string[][];  // pages of lines
}

const FORMULA_SECTION: Section = {
  key: '1',
  icon: '🧠',
  label: 'Formula',
  lines: [[
    chalk.bold.cyanBright('  CONTEXT → INTENT → INTERVIEW → ULTRATHINK → PLAN → EXECUTE → ITERATE'),
    '',
    chalk.bold.white('  Phase 1  CONTEXT DUMP'),
    chalk.gray('  Prime every session with chain-native defaults. Prevents web2 patterns leaking in.'),
    '',
    chalk.green('  Context: Solana mainnet-beta production environment.'),
    chalk.green('  Stack: TypeScript, Helius RPC + websockets, Birdeye data, Jito execution.'),
    chalk.green('  Constraints:'),
    chalk.green('  - All RPC calls through retry wrapper with exponential backoff'),
    chalk.green('  - All transactions simulated before sending'),
    chalk.green('  - Dynamic priority fees via Helius priority fee API'),
    chalk.green('  - Value transactions through Jito bundles'),
    chalk.green('  - Explicit timeouts on all network operations'),
    '',
    chalk.bold.white('  Phase 2  INTENT DECLARATION'),
    chalk.gray('  Extract dimensional goals, not flat descriptions.'),
    '',
    chalk.red('  BAD:  "build me a sniper"'),
    chalk.green('  GOOD: "sub-200ms execution via Jito with trailing stops and terminal UI"'),
    chalk.red('  BAD:  "make a swap"'),
    chalk.green('  GOOD: "atomic multi-hop swap with slippage protection and MEV shielding"'),
    '',
    chalk.yellow('  Goal formula: "I want [WHAT] that [HOW] with [CONSTRAINTS] targeting [METRICS]"'),
    '',
    chalk.bold.white('  Phase 3  EXTRACTION INTERVIEW'),
    chalk.gray('  Ask 3-5 questions at a time. Cover:'),
    chalk.cyan('  Architecture') + chalk.gray(' — program (Rust) or client (TS)? which programs/accounts?'),
    chalk.cyan('  Execution') + chalk.gray('  — latency? batch or single? confirmation strategy?'),
    chalk.cyan('  Data') + chalk.gray('       — on-chain state? real-time? historical depth?'),
    chalk.cyan('  Risk') + chalk.gray('       — max value per tx? MEV concerns? 3am failure?'),
    chalk.cyan('  Existing') + chalk.gray('   — greenfield or integrating? what\'s already built?'),
    chalk.gray('  Reflect requirements back for confirmation before proceeding.'),
  ]],
};

const DEPTH_SECTION: Section = {
  key: '2',
  icon: '⚡',
  label: 'Depth Ladder',
  lines: [[
    chalk.bold.cyanBright('  ULTRATHINK DEPTH LADDER'),
    '',
    chalk.gray('  Invocation              Budget     Best For'),
    chalk.gray('  ' + '─'.repeat(60)),
    chalk.white('  think') + chalk.gray('                  ~500 tok   simple decisions, quick fixes'),
    chalk.white('  think step by step') + chalk.gray('    ~1000 tok  multi-step, debugging'),
    chalk.white('  think hard') + chalk.gray('             ~2000 tok  architecture, complex logic'),
    chalk.white('  think harder') + chalk.gray('           ~4000 tok  system design, security analysis'),
    chalk.cyanBright.bold('  ultrathink') + chalk.gray('             ~8000 tok  production systems, critical code'),
    chalk.magenta.bold('  megathink') + chalk.gray('              maximum    novel problems, research-grade'),
    '',
    chalk.bold.white('  Activation patterns that reliably trigger deep reasoning:'),
    '',
    chalk.green('  ultrathink about...'),
    chalk.green('  think very carefully about...'),
    chalk.green('  before answering, deeply consider...'),
    chalk.green('  explore multiple approaches before deciding...'),
    chalk.green('  reason through this step by step, considering edge cases...'),
    chalk.green('  think like a senior blockchain engineer would...'),
    '',
    chalk.bold.white('  Stacking for maximum depth:'),
    '',
    chalk.green('  ultrathink. Consider from multiple angles:'),
    chalk.green('  - Performance implications on-chain'),
    chalk.green('  - Security attack vectors'),
    chalk.green('  - MEV exposure'),
    chalk.green('  - Failure modes under load'),
    chalk.green('  - Compute unit optimization'),
    chalk.green('  Then give me your recommended approach with justification.'),
    '',
    chalk.bold.white('  Focused ultrathink (don\'t waste tokens on obvious parts):'),
    '',
    chalk.red('  BAD: "Build me a swap aggregator. ultrathink."'),
    '',
    chalk.green('  GOOD: "Build a Solana swap aggregator.'),
    chalk.green('  ultrathink specifically about:'),
    chalk.green('  - Route optimization across Jupiter, Raydium, Orca'),
    chalk.green('  - Slippage calculation with real-time liquidity depth'),
    chalk.green('  - Transaction assembly for atomic multi-hop swaps'),
    chalk.green('  - Priority fee estimation using recent block data"'),
  ]],
};

const BLOCKCHAIN_SECTION: Section = {
  key: '3',
  icon: '🔗',
  label: 'Blockchain Focus',
  lines: [[
    chalk.bold.cyanBright('  ULTRATHINK FOCUS AREAS FOR BLOCKCHAIN'),
    chalk.gray('  Always ultrathink about these 5 areas. Focus, don\'t spray.'),
    '',
    chalk.bold.yellow('  1. TRANSACTION ATOMICITY'),
    chalk.gray('     • Instruction ordering and dependencies'),
    chalk.gray('     • Account validation (signer, writable, PDA derivation)'),
    chalk.gray('     • Compute unit estimation with buffer'),
    chalk.gray('     • Lookup tables for address compression'),
    chalk.gray('     • Blockhash freshness and retry strategy'),
    '',
    chalk.bold.yellow('  2. MEV EXPOSURE'),
    chalk.gray('     • What can a searcher extract from this transaction?'),
    chalk.gray('     • Should this go through Jito bundles?'),
    chalk.gray('     • Is there a backrun opportunity we\'re creating?'),
    chalk.gray('     • Can the transaction be sandwiched? How do we prevent it?'),
    chalk.gray('     • What\'s worst-case slippage if frontrun?'),
    '',
    chalk.bold.yellow('  3. STATE RACE CONDITIONS'),
    chalk.gray('     • What if the account state changes between read and write?'),
    chalk.gray('     • How do we handle stale blockhash?'),
    chalk.gray('     • What if another transaction touches this account first?'),
    chalk.gray('     • Should we use durable nonces?'),
    chalk.gray('     • Retry strategy that doesn\'t double-spend?'),
    '',
    chalk.bold.yellow('  4. SECURITY'),
    chalk.gray('     • Can instruction data be manipulated to drain funds?'),
    chalk.gray('     • Are all account constraints validated on-chain?'),
    chalk.gray('     • Is there a reentrancy path?'),
    chalk.gray('     • Can authority checks be bypassed?'),
    chalk.gray('     • What happens if accounts are passed in wrong order?'),
    '',
    chalk.bold.yellow('  5. FAILURE MODES'),
    chalk.gray('     • What breaks at 3am with no one watching?'),
    chalk.gray('     • RPC provider outages'),
    chalk.gray('     • Cascading failures'),
    chalk.gray('     • Orphaned state / open positions'),
  ]],
};

const ANTIPATTERNS_SECTION: Section = {
  key: '4',
  icon: '🚫',
  label: 'Antipatterns',
  lines: [[
    chalk.bold.cyanBright('  TOP 5 BLOCKCHAIN ANTIPATTERNS — WHAT CLAUDE GETS WRONG BY DEFAULT'),
    '',
    chalk.bold.red('  1. NO RETRY LOGIC ON RPC CALLS'),
    chalk.gray('     Claude\'s default — direct RPC call, no error handling.'),
    chalk.red('     BAD:  const balance = await connection.getBalance(pubkey);'),
    chalk.green('     GOOD: const balance = await withRetry('),
    chalk.green('               () => connection.getBalance(pubkey),'),
    chalk.green('               { maxRetries: 3, backoffMs: 200 }'),
    chalk.green('           );'),
    chalk.yellow('     Fix prompt: "All RPC calls through retry wrapper with exponential backoff."'),
    '',
    chalk.bold.red('  2. NO TRANSACTION SIMULATION'),
    chalk.gray('     Sending transactions without simulating costs money on failures.'),
    chalk.red('     BAD:  await sendAndConfirmTransaction(connection, tx, [signer]);'),
    chalk.green('     GOOD: const sim = await connection.simulateTransaction(tx);'),
    chalk.green('           if (sim.value.err) throw new SimulationError(sim.value.err, sim.value.logs);'),
    chalk.green('           // then send with CU from simulation'),
    chalk.yellow('     Fix prompt: "Simulate every transaction before sending."'),
    '',
    chalk.bold.red('  3. BLOCKING ON CONFIRMATION'),
    chalk.gray('     sendAndConfirmTransaction() can hang for 60s+ during congestion.'),
    chalk.red('     BAD:  await sendAndConfirmTransaction(...);  // blocks forever'),
    chalk.green('     GOOD: const sig = await sendWithTimeout(tx, { timeoutMs: 5000 });'),
    chalk.green('           const ok = await pollConfirmation(sig, { maxAttempts: 10 });'),
    chalk.yellow('     Fix prompt: "Explicit timeouts on all network operations."'),
    '',
    chalk.bold.red('  4. HARDCODED PRIORITY FEES'),
    chalk.gray('     Network conditions change. Hardcoded fees get txs stuck or overpay.'),
    chalk.red('     BAD:  setComputeUnitPrice({ microLamports: 1000 })  // stale number'),
    chalk.green('     GOOD: const fee = await helius.getPriorityFeeEstimate(tx);'),
    chalk.green('           setComputeUnitPrice({ microLamports: fee.high })'),
    chalk.yellow('     Fix prompt: "Dynamic priority fees via Helius API."'),
    '',
    chalk.bold.red('  5. NO MEV PROTECTION FOR SWAPS'),
    chalk.gray('     Public mempool = sandwichable. Any swap over $500 needs Jito.'),
    chalk.red('     BAD:  await sendTransaction(swapTx);  // public mempool'),
    chalk.green('     GOOD: await jito.sendBundle([swapTx], { tip: 10000 });'),
    chalk.yellow('     Fix prompt: "Value transactions through Jito bundles."'),
  ]],
};

const CONSTRAINTS_SECTION: Section = {
  key: '5',
  icon: '✅',
  label: 'Never Ship Without',
  lines: [[
    chalk.bold.cyanBright('  NEVER SHIP WITHOUT — THE PRODUCTION CHECKLIST'),
    '',
    chalk.green('  ✓') + chalk.white(' Retry logic on all RPC calls') +
      chalk.gray('  — exponential backoff, 3+ retries, classify transient vs permanent errors'),
    '',
    chalk.green('  ✓') + chalk.white(' Transaction simulation before send') +
      chalk.gray('  — use simulation CU to set ComputeUnitLimit accurately'),
    '',
    chalk.green('  ✓') + chalk.white(' Dynamic priority fees') +
      chalk.gray('  — Helius getPriorityFeeEstimate(), pick medium/high based on urgency'),
    '',
    chalk.green('  ✓') + chalk.white(' Jito bundles for value transactions') +
      chalk.gray('  — any swap, liquidation, or arb > $100 goes through Jito'),
    '',
    chalk.green('  ✓') + chalk.white(' Explicit timeouts on network ops') +
      chalk.gray('  — no indefinite blocking, poll confirmation with maxAttempts'),
    '',
    chalk.green('  ✓') + chalk.white(' Graceful shutdown / position cleanup') +
      chalk.gray('  — SIGINT handler, cancel open orders, close positions, exit cleanly'),
    '',
    chalk.green('  ✓') + chalk.white(' Comprehensive error types') +
      chalk.gray('  — no generic throws. SimulationError, RpcError, InsufficientFunds, etc.'),
    '',
    chalk.green('  ✓') + chalk.white(' Structured logging with correlation IDs') +
      chalk.gray('  — every operation has a traceId, logs are parseable JSON'),
    '',
    chalk.bold.white('  The complete one-shot prompt:'),
    '',
    chalk.green('  Context: Solana mainnet-beta.'),
    chalk.green('  Stack: TypeScript, Helius RPC + websockets, Birdeye, Jito.'),
    chalk.green('  I want [GOAL].'),
    '',
    chalk.green('  Interview me about requirements (3-5 questions at a time).'),
    chalk.green('  ultrathink about: TX structure, MEV, state races, security, failure modes.'),
    chalk.green('  Present plan. Wait for approval. Then implement.'),
    '',
    chalk.green('  Constraints:'),
    chalk.green('  - All RPC calls through retry wrapper'),
    chalk.green('  - All transactions simulated before sending'),
    chalk.green('  - Dynamic priority fees via Helius'),
    chalk.green('  - Value transactions through Jito'),
    chalk.green('  - Explicit timeout on all network ops'),
    chalk.green('  - Full files, no stubs. Ship this to mainnet.'),
  ]],
};

const TEMPLATES_SECTION: Section = {
  key: '6',
  icon: '📋',
  label: 'Templates',
  lines: [
    [
      chalk.bold.cyanBright('  TEMPLATE 1 OF 4 — Token Sniper / Trading Bot'),
      '',
      chalk.green('  I want a production Solana token sniper that:'),
      chalk.green('  - Monitors [Raydium/Pump.fun] for new pools via websocket'),
      chalk.green('  - Evaluates tokens against [criteria: liquidity, holder distribution]'),
      chalk.green('  - Executes buys within [X]ms of detection using Jito bundles'),
      chalk.green('  - Implements [trailing stop / take profit / time-based exit]'),
      chalk.green('  - Exposes a terminal UI with real-time PnL'),
      '',
      chalk.green('  Interview me about:'),
      chalk.green('  - RPC setup (Helius tier, dedicated nodes?)'),
      chalk.green('  - Risk parameters (max position size, daily loss limit)'),
      chalk.green('  - Specific signals to filter on'),
      chalk.green('  - Existing infra this needs to integrate with'),
      '',
      chalk.green('  ultrathink about:'),
      chalk.green('  - Latency budget from detection → execution'),
      chalk.green('  - Race conditions between monitor and executor'),
      chalk.green('  - State management for open positions'),
      chalk.green('  - Failure modes when RPC lags or Jito rejects bundles'),
      chalk.green('  - How to avoid rugs and honeypots'),
      '',
      chalk.green('  plan mode: on — see architecture before code.'),
      '',
      chalk.gray('  [Page 1/4] — press → for next template'),
    ],
    [
      chalk.bold.cyanBright('  TEMPLATE 2 OF 4 — DeFi Protocol Integration'),
      '',
      chalk.green('  I want to integrate with [Protocol] to [action: swap/stake/lend].'),
      '',
      chalk.green('  Context:'),
      chalk.green('  - Protocol address: [address]'),
      chalk.green('  - IDL available: [yes/no, location]'),
      chalk.green('  - Documentation: [link]'),
      '',
      chalk.green('  Interview me about:'),
      chalk.green('  - The specific user flow I\'m building'),
      chalk.green('  - Whether I need to handle [ATAs, wrapping SOL]'),
      chalk.green('  - Expected transaction frequency'),
      chalk.green('  - Error handling requirements'),
      '',
      chalk.green('  ultrathink about:'),
      chalk.green('  - The exact instruction sequence this protocol expects'),
      chalk.green('  - Account validation — what PDAs need derivation?'),
      chalk.green('  - Edge cases: no ATA? insufficient balance?'),
      chalk.green('  - How to simulate this transaction before sending'),
      '',
      chalk.green('  Before writing code, show me:'),
      chalk.green('  1. Account schema for each instruction'),
      chalk.green('  2. Instruction data layout'),
      chalk.green('  3. Example transaction structure'),
      '',
      chalk.gray('  [Page 2/4] — press → for next template'),
    ],
    [
      chalk.bold.cyanBright('  TEMPLATE 3 OF 4 — Anchor Program (Rust)'),
      '',
      chalk.green('  I want an Anchor program that [functionality].'),
      '',
      chalk.green('  Interview me about:'),
      chalk.green('  - The accounts this program will manage'),
      chalk.green('  - Who can call which instructions (authority model)'),
      chalk.green('  - Fee structure if any'),
      chalk.green('  - Upgrade authority plan'),
      '',
      chalk.green('  ultrathink about:'),
      chalk.green('  - Account sizing and rent implications'),
      chalk.green('  - PDA derivation strategy (seeds, bump handling)'),
      chalk.green('  - Access control vulnerabilities'),
      chalk.green('  - Integer overflow/underflow risks'),
      chalk.green('  - Reentrancy potential'),
      chalk.green('  - Wrong account ordering'),
      '',
      chalk.green('  plan mode: on — show me:'),
      chalk.green('  1. Account struct definitions'),
      chalk.green('  2. Instruction signatures'),
      chalk.green('  3. Error enum'),
      chalk.green('  4. Events emitted'),
      chalk.green('  5. Key security invariants'),
      '',
      chalk.green('  Constraints: Anchor 0.29+, checked math, events on all state changes.'),
      '',
      chalk.gray('  [Page 3/4] — press → for next template'),
    ],
    [
      chalk.bold.cyanBright('  TEMPLATE 4 OF 4 — Multi-Agent Trading System'),
      '',
      chalk.green('  I want a multi-agent system where:'),
      chalk.green('  - Agent A monitors [data source] for signals'),
      chalk.green('  - Agent B evaluates signals against [strategy]'),
      chalk.green('  - Agent C executes approved trades via [venue]'),
      chalk.green('  - Agent D manages risk and position limits'),
      chalk.green('  - All agents coordinate via [message bus / shared state]'),
      '',
      chalk.green('  Interview me about:'),
      chalk.green('  - Signal sources and their data format'),
      chalk.green('  - Strategy parameters (what makes a "good" signal?)'),
      chalk.green('  - Execution requirements (speed, MEV protection)'),
      chalk.green('  - Risk limits (position size, correlation, drawdown)'),
      chalk.green('  - How to monitor and intervene'),
      '',
      chalk.green('  ultrathink about:'),
      chalk.green('  - Agent coordination — avoiding race conditions'),
      chalk.green('  - State consistency across agents'),
      chalk.green('  - Failure isolation — one crash shouldn\'t kill the system'),
      chalk.green('  - Human override mechanisms'),
      chalk.green('  - Backtest vs live mode switching'),
      '',
      chalk.green('  plan mode: on — show message schemas, state machines,'),
      chalk.green('  and coordination protocol before implementation.'),
      '',
      chalk.gray('  [Page 4/4] — press ← to go back'),
    ],
  ],
};

const INSTALL_SECTION: Section = {
  key: '7',
  icon: '📦',
  label: 'Install / Use',
  lines: [[
    chalk.bold.cyanBright('  ULTRATHINK SKILL — INSTALL & USAGE'),
    '',
    chalk.bold.white('  Skill location:'),
    chalk.green('  agents/skills/ultrathink-blockchain/SKILL.md'),
    chalk.gray('  agents/skills/ultrathink-blockchain/references/antipatterns.md'),
    chalk.gray('  agents/skills/ultrathink-blockchain/references/templates.md'),
    '',
    chalk.bold.white('  Install via install.sh:'),
    chalk.green('  bash UltraThink-SKill/install.sh'),
    '',
    chalk.bold.white('  Install via ClawdHub:'),
    chalk.green('  clawdhub install ultrathink-blockchain'),
    '',
    chalk.bold.white('  Use in Claude Code session:'),
    chalk.green('  /ultrathink-blockchain'),
    chalk.gray('  (loads the skill, primes context for Solana dev)'),
    '',
    chalk.bold.white('  Use formula directly in any prompt:'),
    chalk.green('  Context: Solana mainnet-beta.'),
    chalk.green('  Stack: TypeScript, Helius, Birdeye, Jito.'),
    chalk.green('  [describe goal]'),
    chalk.green('  Interview me → ultrathink → plan → execute.'),
    '',
    chalk.bold.white('  Catalog entry (agents/skills/catalog.json):'),
    chalk.green('  {'),
    chalk.green('    "slug": "ultrathink-blockchain",'),
    chalk.green('    "name": "ultrathink-blockchain",'),
    chalk.green('    "category": "Solana / Blockchain"'),
    chalk.green('  }'),
    '',
    chalk.bold.white('  Full formula doc:'),
    chalk.green('  agents/skills/ultrathink-blockchain/ultrathink-blockchain-formula.md'),
    '',
    chalk.bold.white('  Quick reference card (one-liner):'),
    chalk.yellow('  CONTEXT → INTENT → INTERVIEW → ULTRATHINK → PLAN → EXECUTE → ITERATE'),
  ]],
};

const SECTIONS: Section[] = [
  FORMULA_SECTION,
  DEPTH_SECTION,
  BLOCKCHAIN_SECTION,
  ANTIPATTERNS_SECTION,
  CONSTRAINTS_SECTION,
  TEMPLATES_SECTION,
  INSTALL_SECTION,
];

// ─── Render ───────────────────────────────────────────────────────────────────

function visible(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

function pad(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - visible(s)));
}

function render(secIdx: number, pageIdx: number): void {
  process.stdout.write('\x1b[2J\x1b[H');
  const cols = Math.max(100, Math.min(process.stdout.columns || 130, 148));
  const border = chalk.magenta('═'.repeat(cols - 2));
  const box = (txt: string) => chalk.magenta('║') + pad(' ' + txt, cols - 2) + chalk.magenta('║');
  const sec = SECTIONS[secIdx]!;
  const page = sec.lines[pageIdx] ?? sec.lines[0]!;

  // Header
  process.stdout.write(chalk.magenta('╔') + border + chalk.magenta('╗\n'));
  process.stdout.write(
    box(chalk.bold.magenta('🧠 ULTRATHINK BLOCKCHAIN') +
      chalk.gray(' — production methodology for shipping Solana code that survives mainnet')),
  );
  process.stdout.write('\n');
  process.stdout.write(
    box(chalk.gray('CONTEXT → INTENT → INTERVIEW → ') +
      chalk.bold.cyanBright('ULTRATHINK') +
      chalk.gray(' → PLAN → EXECUTE → ITERATE')),
  );
  process.stdout.write('\n');
  process.stdout.write(chalk.magenta('╠') + border + chalk.magenta('╣\n'));

  // Section tabs
  const tabLine = SECTIONS.map((s, i) => {
    const active = i === secIdx;
    const label = `${s.key}. ${s.icon} ${s.label}`;
    return active
      ? chalk.bold.magenta('[' + label + ']')
      : chalk.gray(' ' + label + ' ');
  }).join(chalk.gray(' │ '));
  process.stdout.write(box(' ' + tabLine));
  process.stdout.write('\n');
  process.stdout.write(chalk.magenta('╠') + border + chalk.magenta('╣\n'));

  // Content
  const contentHeight = 24;
  for (let i = 0; i < contentHeight; i++) {
    const line = page[i] ?? '';
    process.stdout.write(
      chalk.magenta('║') + pad(line || '', cols - 2) + chalk.magenta('║\n'),
    );
  }

  // Footer
  const pageInfo = sec.lines.length > 1
    ? chalk.cyan(`  Page ${pageIdx + 1}/${sec.lines.length}  [←→ pages]  `)
    : '  ';
  process.stdout.write(chalk.magenta('╠') + border + chalk.magenta('╣\n'));
  process.stdout.write(
    box(chalk.gray('[1-7] section  [←→] page  [↑↓] section  [b/Esc] back') + pageInfo),
  );
  process.stdout.write('\n');
  process.stdout.write(chalk.magenta('╚') + border + chalk.magenta('╝\n'));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runUltraThink(): Promise<void> {
  let secIdx = 0;
  let pageIdx = 0;

  render(secIdx, pageIdx);

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

      const sec = SECTIONS[secIdx]!;

      // Arrow up — previous section
      if (chunk === '\x1b[A') {
        secIdx = (secIdx - 1 + SECTIONS.length) % SECTIONS.length;
        pageIdx = 0;
        render(secIdx, pageIdx);
        return;
      }
      // Arrow down — next section
      if (chunk === '\x1b[B') {
        secIdx = (secIdx + 1) % SECTIONS.length;
        pageIdx = 0;
        render(secIdx, pageIdx);
        return;
      }
      // Arrow left — previous page
      if (chunk === '\x1b[D') {
        pageIdx = Math.max(0, pageIdx - 1);
        render(secIdx, pageIdx);
        return;
      }
      // Arrow right — next page
      if (chunk === '\x1b[C') {
        pageIdx = Math.min(sec.lines.length - 1, pageIdx + 1);
        render(secIdx, pageIdx);
        return;
      }

      // Number keys 1-7 jump to section
      const numMatch = chunk.match(/^[1-7]$/);
      if (numMatch) {
        secIdx = parseInt(chunk, 10) - 1;
        pageIdx = 0;
        render(secIdx, pageIdx);
      }
    };

    process.stdin.on('data', onData);
  });
}
