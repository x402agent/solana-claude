/**
 * HERMES x402 TUI — A2A Simulation & Status
 *
 * Simulates Google A2A (Agent-to-Agent) handshakes and
 * updates the dashboard state with connection info.
 * Real A2A calls go through x402/a2a-agent.ts in the main lib.
 */

import { addLog, type DashboardState, type A2AConnection } from './state.js';

const KNOWN_PEERS: A2AConnection[] = [
  {
    agentId: 'clawd-router',
    endpoint: 'https://router.solanaclawd.com/a2a',
    status: 'disconnected',
    latencyMs: 0,
    protocol: 'x402',
  },
  {
    agentId: 'paysh-gate',
    endpoint: 'https://pay.sh/a2a',
    status: 'disconnected',
    latencyMs: 0,
    protocol: 'ap2',
  },
];

export async function initA2AConnections(state: DashboardState): Promise<void> {
  state.a2aConnections = KNOWN_PEERS.map(p => ({ ...p }));

  for (const conn of state.a2aConnections) {
    conn.status = 'handshaking';
    addLog(state, 'A2A', `Handshaking ${conn.agentId} via ${conn.protocol.toUpperCase()}…`, 'a2a');

    try {
      const start = Date.now();
      const agentCardUrl = `${conn.endpoint}/.well-known/agent.json`;
      const r = await fetch(agentCardUrl, {
        signal: AbortSignal.timeout(4000),
        headers: { 'x-clawd-version': '1.7.0', 'x-protocol': conn.protocol },
      });
      conn.latencyMs = Date.now() - start;

      if (r.ok) {
        conn.status = 'connected';
        addLog(state, 'A2A', `${conn.agentId} ESTABLISHED (${conn.latencyMs}ms)`, 'a2a');
      } else {
        // 402 means the endpoint is alive but requires payment — still count as "connected"
        if (r.status === 402) {
          conn.status = 'connected';
          conn.latencyMs = Date.now() - start;
          addLog(state, 'A2A', `${conn.agentId} READY (402 gated, ${conn.latencyMs}ms)`, 'a2a');
        } else {
          conn.status = 'disconnected';
          addLog(state, 'A2A', `${conn.agentId} ${r.status} — unreachable`, 'warn');
        }
      }
    } catch {
      conn.status = 'disconnected';
      addLog(state, 'A2A', `${conn.agentId} timeout — offline`, 'warn');
    }
  }

  // pay.sh status inferred from paysh-gate connection
  const paysh = state.a2aConnections.find(c => c.agentId === 'paysh-gate');
  state.payshStatus = paysh?.status === 'connected' ? 'online' : 'offline';

}
