import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AgentRegistry } from './registry';
import type {
  RouteRequest,
  RouteResult,
  OnChainAgent,
  RouterConfig,
  RoutingStrategy,
} from './types';

export class AgentRouter {
  private registry: AgentRegistry;
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
    this.registry = new AgentRegistry(config);
  }

  get agentRegistry(): AgentRegistry {
    return this.registry;
  }

  async route(req: RouteRequest): Promise<RouteResult> {
    const agents = await this.registry.fetchAgents();

    // Direct routing by agent ID
    if (req.agentId) {
      const target = agents.find(a => a.registration.agentId === req.agentId);
      if (!target) throw new Error(`Agent not found: ${req.agentId}`);
      return this.buildResult(target, 'capability');
    }

    // Capability-based routing
    const strategy = req.strategy ?? this.config.defaultStrategy;
    const candidates = req.capability
      ? this.registry.filterByCapability(agents, req.capability)
      : agents.filter(a => a.registration.isActive);

    if (candidates.length === 0) {
      throw new Error(
        req.capability
          ? `No active agents with capability: ${req.capability}`
          : 'No active agents registered',
      );
    }

    const selected = this.selectAgent(candidates, strategy);
    return this.buildResult(selected, strategy);
  }

  private selectAgent(candidates: OnChainAgent[], strategy: RoutingStrategy): OnChainAgent {
    switch (strategy) {
      case 'least-latency': {
        const withLatency = candidates.filter(a => a.latencyMs !== undefined);
        if (withLatency.length > 0) {
          return withLatency.reduce((best, a) =>
            (a.latencyMs ?? Infinity) < (best.latencyMs ?? Infinity) ? a : best,
          );
        }
        // fall through to random if no latency data
      }
      // eslint-disable-next-line no-fallthrough
      case 'random':
        return candidates[Math.floor(Math.random() * candidates.length)];

      case 'round-robin': {
        // Simple hash-based round-robin on current timestamp
        const idx = Math.floor(Date.now() / 1000) % candidates.length;
        return candidates[idx];
      }

      case 'capability':
      default:
        // First active match, stable ordering
        return candidates[0];
    }
  }

  private buildResult(agent: OnChainAgent, strategy: RoutingStrategy): RouteResult {
    return {
      agentId: agent.registration.agentId,
      endpoint: agent.registration.endpoint,
      walletPubkey: agent.registration.walletPubkey,
      attestationAddress: agent.attestationAddress,
      strategy,
    };
  }

  // Health-check all registered agents (updates latency cache)
  async healthCheck(): Promise<void> {
    const agents = await this.registry.fetchAgents(true);
    await Promise.allSettled(
      agents.map(async agent => {
        if (!agent.registration.endpoint) return;
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5_000);
          await fetch(`${agent.registration.endpoint}/health`, {
            method: 'GET',
            signal: controller.signal,
          });
          clearTimeout(timeout);
          agent.latencyMs = Date.now() - start;
          agent.lastSeen = Date.now();
        } catch {
          // Agent unreachable — preserve existing latency data
        }
      }),
    );
  }

  listAgents(): Promise<OnChainAgent[]> {
    return this.registry.fetchAgents();
  }
}
