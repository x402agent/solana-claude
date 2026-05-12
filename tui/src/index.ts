#!/usr/bin/env node

import { createInterface } from 'node:readline';
import { initA2AConnections } from './a2a.js';
import { fetchMarketData } from './market.js';
import { disableRawMode, enableRawMode, renderFrame } from './renderer.js';
import { addAgentMessage, addLog, createInitialState, type DashboardState, type ViewMode } from './state.js';

const REFRESH_INTERVAL_MS = 30_000;
const RENDER_INTERVAL_MS = 1_000;
const VIEW_ORDER: ViewMode[] = ['market', 'trading', 'portfolio', 'analytics', 'agent'];

function nextView(current: ViewMode): ViewMode {
  const index = VIEW_ORDER.indexOf(current);
  return VIEW_ORDER[(index + 1) % VIEW_ORDER.length]!;
}

function setView(state: DashboardState, view: ViewMode): void {
  state.view = view;
  state.showHelp = false;
  addLog(state, 'SYSTEM', `Switched to ${view} view`, 'info');
}

function simulatePayment(state: DashboardState): void {
  const amount = 0.5 + Math.random() * 2;
  state.lastPayment = {
    amount,
    asset: 'USDC',
    resource: '/nous/hermes/analyze',
    signature: [...Array(44)]
      .map(() => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'[Math.floor(Math.random() * 58)])
      .join(''),
    protocol: 'ap2',
    timestamp: Date.now(),
    confidential: state.confidentialMode,
  };
  state.totalSpent += amount;
  state.usdcBalance = Math.max(0, state.usdcBalance - amount);
  addLog(state, 'PAY', `pay.sh: ${amount.toFixed(4)} USDC → /nous/hermes/analyze`, 'pay');
  addAgentMessage(state, 'agent', `Settled ${amount.toFixed(2)} USDC through pay.sh ${state.confidentialMode ? 'with confidentiality' : 'in clear mode'}.`);
}

function runCommand(state: DashboardState, command: string): void {
  const raw = command.trim();
  if (!raw) return;
  addAgentMessage(state, 'user', raw);

  if (raw === '/help') {
    state.showHelp = true;
    addAgentMessage(state, 'system', 'Help overlay opened.');
    return;
  }
  if (raw === '/clear') {
    state.agentMessages = [];
    addLog(state, 'SYSTEM', 'Agent messages cleared', 'info');
    return;
  }
  if (raw === '/analyze') {
    addAgentMessage(state, 'agent', `SOL ${pctText(state.solChange24h)} on the day; top mover ${state.topMovers[0]?.symbol ?? 'n/a'} remains the focus.`);
    return;
  }
  if (raw === '/trending') {
    addAgentMessage(state, 'agent', `Trending now: ${state.trending.slice(0, 5).map((token) => token.symbol).join(', ')}.`);
    return;
  }
  if (raw === '/wallet') {
    addAgentMessage(state, 'agent', `Wallet ${state.wallet.address} holds ${state.wallet.solBalance.toFixed(2)} SOL and $${state.wallet.totalValueUsd.toFixed(0)} total value.`);
    return;
  }
  if (raw === '/news') {
    addAgentMessage(state, 'agent', `${state.liveFeed[0]?.text ?? 'No live feed items yet.'}`);
    return;
  }
  if (raw.startsWith('/search ')) {
    addAgentMessage(state, 'agent', `Search queued for: ${raw.slice(8)}.`);
    return;
  }
  if (raw.startsWith('/research ')) {
    addAgentMessage(state, 'agent', `Research brief opened for: ${raw.slice(10)}.`);
    return;
  }
  if (raw === '/prophecy') {
    addAgentMessage(state, 'agent', `Prophecy: ${state.lastSignal ? `${state.lastSignal.symbol} stays ${state.lastSignal.side}` : 'market stays range-bound'} over the next OODA pulse.`);
    return;
  }

  addAgentMessage(state, 'system', `Unknown command: ${raw}`);
}

function pctText(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

async function main() {
  const state = createInitialState();

  addLog(state, 'SYSTEM', 'OpenClawd Dark Ralph booting', 'info');
  addLog(state, 'SYSTEM', 'CLAWD market surface online', 'info');
  addLog(state, 'SYSTEM', 'Confidential mode enabled', 'info');
  addAgentMessage(state, 'system', 'Use 1-5 to switch views, /help for commands.');

  enableRawMode();
  renderFrame(state);

  initA2AConnections(state).catch(() => undefined);
  fetchMarketData(state).catch((err) => {
    state.error = String(err);
    addLog(state, 'SYSTEM', `Market fetch failed: ${String(err).slice(0, 80)}`, 'error');
  });

  const dataTimer = setInterval(() => {
    fetchMarketData(state).catch((err) => {
      addLog(state, 'SYSTEM', `Refresh error: ${String(err).slice(0, 60)}`, 'error');
    });
  }, REFRESH_INTERVAL_MS);

  const renderTimer = setInterval(() => {
    renderFrame(state);
  }, RENDER_INTERVAL_MS);

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });

  process.stdin.on('data', (data: Buffer) => {
    const key = data.toString();

    if (state.commandBuffer) {
      if (key === '\r' || key === '\n') {
        const command = state.commandBuffer;
        state.commandBuffer = '';
        runCommand(state, command);
        return;
      }
      if (key === '\x7f') {
        state.commandBuffer = state.commandBuffer.slice(0, -1);
        return;
      }
      if (key === '\x1b') {
        state.commandBuffer = '';
        return;
      }
      if (/^[ -~]$/.test(key)) {
        state.commandBuffer += key;
      }
      return;
    }

    if (key === 'q' || key === 'Q' || key === '\x03') {
      cleanup();
      process.exit(0);
    }
    if (key === '\x1b') {
      cleanup();
      process.exit(0);
    }
    if (key === '1') setView(state, 'market');
    if (key === '2') setView(state, 'trading');
    if (key === '3') setView(state, 'portfolio');
    if (key === '4') setView(state, 'analytics');
    if (key === '5') setView(state, 'agent');
    if (key === '\t') state.view = nextView(state.view);
    if (key === 'h' || key === 'H') state.showHelp = !state.showHelp;
    if (key === 'r' || key === 'R') {
      addLog(state, 'SYSTEM', 'Manual refresh triggered', 'info');
      fetchMarketData(state).catch(() => undefined);
    }
    if (key === 'd' || key === 'D') {
      state.darkDefiArmed = !state.darkDefiArmed;
      addLog(state, 'SYSTEM', `Dark DeFi ${state.darkDefiArmed ? 'ARMED' : 'DISARMED'}`, state.darkDefiArmed ? 'warn' : 'info');
    }
    if (key === 'c' || key === 'C') {
      state.confidentialMode = !state.confidentialMode;
      addLog(state, 'SYSTEM', `Confidential mode ${state.confidentialMode ? 'ON' : 'OFF'}`, 'info');
    }
    if (key === 'p' || key === 'P') simulatePayment(state);
    if (key === 'a' || key === 'A') {
      state.autoMode = true;
      state.interactiveMode = false;
      addLog(state, 'SYSTEM', 'Autonomous mode enabled', 'info');
    }
    if (key === 'i' || key === 'I') {
      state.autoMode = false;
      state.interactiveMode = true;
      addLog(state, 'SYSTEM', 'Interactive mode enabled', 'info');
    }
    if (key === '/') {
      state.commandBuffer = '/';
      state.view = 'agent';
    }
  });

  function cleanup() {
    clearInterval(dataTimer);
    clearInterval(renderTimer);
    disableRawMode();
    rl.close();
    console.log('\n\x1b[32mOpenClawd Dark Ralph shutdown complete.\x1b[0m\n');
  }

  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
}

main().catch((err) => {
  disableRawMode();
  console.error('Fatal:', err);
  process.exit(1);
});
