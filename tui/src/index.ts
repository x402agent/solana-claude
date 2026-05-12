#!/usr/bin/env node
/**
 * HERMES x402 — Neon TUI Dashboard
 *
 * The world's first Solana-native agentic harness with:
 *  • OODA trading loop (Observe → Orient → Decide → Act → Learn)
 *  • x402 / pay.sh / AP2 / MPP payment protocols
 *  • Google A2A agent-to-agent connections
 *  • Confidential dark DeFi execution
 *  • Nous Research model routing
 *
 * Run:  node dist/index.js
 *       npx tsx src/index.ts
 */

import { createInterface } from 'node:readline';
import { createInitialState, addLog } from './state.js';
import { fetchMarketData } from './market.js';
import { initA2AConnections } from './a2a.js';
import { renderFrame, enableRawMode, disableRawMode } from './renderer.js';

const REFRESH_INTERVAL_MS = 30_000; // 30-second OODA cycles
const RENDER_INTERVAL_MS = 1_000;   // 1 fps (live clock + log scroll)

async function main() {
  const state = createInitialState();

  // Boot sequence
  addLog(state, 'SYSTEM', 'HERMES x402 booting — OpenClawd Stack v1.7.0', 'info');
  addLog(state, 'SYSTEM', 'Confidential mode: ENABLED', 'info');
  addLog(state, 'SYSTEM', 'Dark DeFi: DISARMED (requires CLAWD holder gate)', 'warn');
  addLog(state, 'SYSTEM', 'Initializing x402 / pay.sh / AP2 / A2A protocols…', 'info');

  // Initial render
  enableRawMode();
  renderFrame(state);

  // Spawn A2A connections async (don't block first render)
  initA2AConnections(state).catch(() => {/* network not required */});

  // Initial market fetch
  fetchMarketData(state).catch(err => {
    state.error = String(err);
    addLog(state, 'SYSTEM', `Market fetch failed: ${String(err).slice(0, 80)}`, 'error');
  });

  // Recurring market refresh
  const dataTimer = setInterval(() => {
    fetchMarketData(state).catch(err => {
      addLog(state, 'SYSTEM', `Refresh error: ${String(err).slice(0, 60)}`, 'error');
    });
  }, REFRESH_INTERVAL_MS);

  // Re-render every second (for live clock, log updates)
  const renderTimer = setInterval(() => {
    renderFrame(state);
  }, RENDER_INTERVAL_MS);

  // ─── Keyboard input ────────────────────────────────────────────────────────
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });

  process.stdin.on('data', (data: Buffer) => {
    const key = data.toString();

    if (key === 'q' || key === 'Q' || key === '\x03') {
      // Quit
      cleanup();
      process.exit(0);
    }

    if (key === 'r' || key === 'R') {
      // Force refresh
      addLog(state, 'SYSTEM', 'Manual refresh triggered', 'info');
      fetchMarketData(state).catch(() => {});
    }

    if (key === 'd' || key === 'D') {
      // Toggle dark DeFi
      state.darkDefiArmed = !state.darkDefiArmed;
      addLog(
        state,
        'SYSTEM',
        `Dark DeFi ${state.darkDefiArmed ? 'ARMED ⚔' : 'DISARMED'}`,
        state.darkDefiArmed ? 'warn' : 'info',
      );
    }

    if (key === 'c' || key === 'C') {
      // Toggle confidential mode
      state.confidentialMode = !state.confidentialMode;
      addLog(state, 'SYSTEM', `Confidential mode: ${state.confidentialMode ? 'ON' : 'OFF'}`, 'info');
    }

    if (key === 'p' || key === 'P') {
      // Simulate a pay.sh payment
      const amount = 0.5 + Math.random() * 2;
      state.lastPayment = {
        amount,
        asset: 'USDC',
        resource: '/nous/hermes/analyze',
        signature: [...Array(44)].map(() => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'[Math.floor(Math.random() * 58)]).join(''),
        protocol: 'ap2',
        timestamp: Date.now(),
        confidential: state.confidentialMode,
      };
      state.totalSpent += amount;
      state.usdcBalance = Math.max(0, state.usdcBalance - amount);
      addLog(state, 'PAY', `pay.sh: ${amount.toFixed(4)} USDC → /nous/hermes/analyze ${state.confidentialMode ? '🔒' : ''}`, 'pay');
    }
  });

  function cleanup() {
    clearInterval(dataTimer);
    clearInterval(renderTimer);
    disableRawMode();
    rl.close();
    console.log('\n\x1b[0m\x1b[32mHERMES x402 — Shutdown complete. No keys. No KYC. Just crypto.\x1b[0m\n');
  }

  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
}

main().catch(err => {
  disableRawMode();
  console.error('Fatal:', err);
  process.exit(1);
});
