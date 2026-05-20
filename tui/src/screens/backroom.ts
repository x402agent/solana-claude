/**
 * clawd — Backroom Screen
 *
 * Launches the existing HERMES x402 full-screen dashboard.
 * Press [b] or Escape to return to the main menu.
 */

import { createInitialState, addLog } from '../state.js';
import { fetchMarketData } from '../market.js';
import { initA2AConnections } from '../a2a.js';
import { renderFrame, enableRawMode, disableRawMode } from '../renderer.js';
import { loadPackageInfo, readVaultInfo } from '../sdk.js';

export async function runBackroom(): Promise<void> {
  const state = createInitialState();

  addLog(state, 'SYSTEM', 'HERMES x402 booting — OpenClawd Stack v1.7.0', 'info');
  addLog(state, 'SYSTEM', 'Confidential mode: ENABLED', 'info');
  addLog(state, 'SYSTEM', 'Dark DeFi: DISARMED (requires CLAWD holder gate)', 'warn');
  addLog(state, 'SYSTEM', 'Initializing x402 / pay.sh / AP2 / A2A protocols…', 'info');
  addLog(state, 'SYSTEM', 'Press [b] or Escape to return to main menu', 'info');

  enableRawMode();
  renderFrame(state);

  initA2AConnections(state).catch(() => {/* network not required */});

  Promise.all([loadPackageInfo(), readVaultInfo()])
    .then(([packages, vault]) => {
      state.sdkPackages = packages.map(pkg => ({
        name: pkg.name,
        version: pkg.version,
        status: pkg.status,
        hasDist: pkg.hasDist,
      }));
      state.sdkPackageCount = packages.length;
      state.walletVault = {
        available: vault.available,
        path: vault.path,
        walletCount: vault.wallets.length,
        activeAddress: vault.wallets[0]?.address ?? null,
        error: vault.error ?? null,
      };
      if (state.walletVault.activeAddress) {
        state.walletPubkey = state.walletVault.activeAddress;
      }
      addLog(state, 'SDK', `Loaded ${packages.length} packages; vault wallets: ${vault.wallets.length}`, 'info');
      renderFrame(state);
    })
    .catch(err => {
      addLog(state, 'SDK', `SDK probe failed: ${String(err).slice(0, 70)}`, 'warn');
    });

  fetchMarketData(state).catch(err => {
    state.error = String(err);
    addLog(state, 'SYSTEM', `Market fetch failed: ${String(err).slice(0, 80)}`, 'error');
  });

  const dataTimer = setInterval(() => {
    fetchMarketData(state).catch(err => {
      addLog(state, 'SYSTEM', `Refresh error: ${String(err).slice(0, 60)}`, 'error');
    });
  }, 30_000);

  const renderTimer = setInterval(() => {
    renderFrame(state);
  }, 1_000);

  return new Promise<void>(resolve => {
    const cleanup = (): void => {
      clearInterval(dataTimer);
      clearInterval(renderTimer);
      disableRawMode();
      process.stdin.off('data', onData);
      resolve();
    };

    const onData = (data: Buffer): void => {
      const key = data.toString();

      if (key === 'b' || key === 'B' || key === '\x1b' || key === '\x03') {
        cleanup();
        return;
      }

      if (key === 'q' || key === 'Q') {
        cleanup();
        process.exit(0);
      }

      if (key === 'r' || key === 'R') {
        addLog(state, 'SYSTEM', 'Manual refresh triggered', 'info');
        fetchMarketData(state).catch(() => {});
      }

      if (key === 'd' || key === 'D') {
        state.darkDefiArmed = !state.darkDefiArmed;
        addLog(
          state,
          'SYSTEM',
          `Dark DeFi ${state.darkDefiArmed ? 'ARMED ⚔' : 'DISARMED'}`,
          state.darkDefiArmed ? 'warn' : 'info',
        );
      }

      if (key === 'c' || key === 'C') {
        state.confidentialMode = !state.confidentialMode;
        addLog(state, 'SYSTEM', `Confidential mode: ${state.confidentialMode ? 'ON' : 'OFF'}`, 'info');
      }

      if (key === 'p' || key === 'P') {
        const amount = 0.5 + Math.random() * 2;
        state.lastPayment = {
          amount,
          asset: 'USDC',
          resource: '/nous/hermes/analyze',
          signature: [...Array(44)].map(() =>
            'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'[Math.floor(Math.random() * 58)],
          ).join(''),
          protocol: 'ap2',
          timestamp: Date.now(),
          confidential: state.confidentialMode,
        };
        state.totalSpent += amount;
        state.usdcBalance = Math.max(0, state.usdcBalance - amount);
        addLog(state, 'PAY', `pay.sh: ${amount.toFixed(4)} USDC → /nous/hermes/analyze`, 'pay');
      }

      renderFrame(state);
    };

    process.stdin.on('data', onData);
  });
}
