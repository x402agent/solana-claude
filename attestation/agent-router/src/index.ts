import * as dotenv from 'dotenv';
import { AgentRouter } from './router';
import { AgentRegistry } from './registry';
import type {
  RouterConfig,
  RegistrationRequest,
  RouteRequest,
  AgentCapability,
} from './types';

dotenv.config();

export { AgentRouter } from './router';
export { AgentRegistry } from './registry';
export type { RouterConfig, RouteRequest, RouteResult, RegistrationRequest, AgentCapability, OnChainAgent } from './types';

// ─── Default Config ───────────────────────────────────────────────────────────

export function buildRouterConfig(overrides: Partial<RouterConfig> = {}): RouterConfig {
  return {
    solanaRpcUrl: process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
    network: (process.env.SOLANA_NETWORK ?? 'demo') as RouterConfig['network'],
    sasProgram: '22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG',
    credentialAddress: process.env.CREDENTIAL_ADDRESS,
    agentRouterSchemaAddress: process.env.AGENT_ROUTER_SCHEMA_ADDRESS,
    defaultStrategy: 'capability',
    demoMode: process.env.AGENT_ROUTER_DEMO_MODE !== 'false',
    cacheAgentsTtlMs: 30_000,
    healthCheckIntervalMs: 60_000,
    ...overrides,
  };
}

// ─── CLI entry point ─────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'list';

  const config = buildRouterConfig();
  const router = new AgentRouter(config);

  (async () => {
    switch (command) {
      case 'list': {
        const agents = await router.listAgents();
        if (agents.length === 0) {
          console.log('No agents registered. Use: register <agentId> <endpoint> <capabilities>');
          break;
        }
        console.log(`\nRegistered Agents (${agents.length})\n${'─'.repeat(60)}`);
        for (const agent of agents) {
          const r = agent.registration;
          console.log(`  ${r.agentId.padEnd(20)} ${r.capabilities.padEnd(20)} ${r.endpoint}`);
          console.log(`  ${''.padEnd(20)} Attested: ${agent.attestationAddress.slice(0, 12)}...`);
        }
        break;
      }

      case 'register': {
        const [, agentId, endpoint, ...caps] = args;
        if (!agentId || !endpoint) {
          console.error('Usage: register <agentId> <endpoint> <cap1> [cap2...]');
          process.exit(1);
        }
        const capabilities: AgentCapability[] = (caps.length > 0 ? caps : ['general'])
          .map(c => ({ name: c, version: '1.0.0', description: c }));

        const walletPubkey = process.env.AGENT_WALLET_PUBKEY
          ?? '11111111111111111111111111111111';
        const signerKey = process.env.SIGNER_PRIVATE_KEY
          ? Buffer.from(process.env.SIGNER_PRIVATE_KEY, 'hex')
          : new Uint8Array(64);

        const req: RegistrationRequest = {
          agentId, capabilities, endpoint, walletPubkey,
          signerPrivateKey: signerKey,
        };

        const result = await router.agentRegistry.registerAgent(req);
        console.log(`\nAgent registered!`);
        console.log(`  Attestation: ${result.attestationAddress}`);
        console.log(`  Demo mode:   ${result.demoMode}`);
        if (result.txSignature) console.log(`  TX:          ${result.txSignature}`);
        break;
      }

      case 'route': {
        const [, capability] = args;
        const routeReq: RouteRequest = {
          capability,
          payload: { query: 'route test', timestamp: Date.now() },
          strategy: config.defaultStrategy,
        };
        try {
          const result = await router.route(routeReq);
          console.log(`\nRoute result:`);
          console.log(`  Agent:       ${result.agentId}`);
          console.log(`  Endpoint:    ${result.endpoint}`);
          console.log(`  Strategy:    ${result.strategy}`);
          console.log(`  Attestation: ${result.attestationAddress}`);
        } catch (err: unknown) {
          console.error(`Routing failed: ${(err as Error).message}`);
        }
        break;
      }

      case 'health': {
        console.log('Running health checks...');
        await router.healthCheck();
        const agents = await router.listAgents();
        for (const agent of agents) {
          const latency = agent.latencyMs !== undefined ? `${agent.latencyMs}ms` : 'unreachable';
          console.log(`  ${agent.registration.agentId}: ${latency}`);
        }
        break;
      }

      default:
        console.log('Usage: agent-router [list|register|route|health]');
    }
  })().catch(console.error);
}
