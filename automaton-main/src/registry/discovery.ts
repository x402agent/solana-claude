/**
 * Agent Discovery
 *
 * Discover other agents via ERC-8004 registry queries.
 * Fetch and parse agent cards from URIs.
 */

import type {
  DiscoveredAgent,
  AgentCard,
} from "../types.js";
import { queryAgent, getTotalAgents } from "./erc8004.js";

type Network = "mainnet" | "testnet";

/**
 * Discover agents by scanning the registry.
 * Returns a list of discovered agents with their metadata.
 */
export async function discoverAgents(
  limit: number = 20,
  network: Network = "mainnet",
): Promise<DiscoveredAgent[]> {
  const total = await getTotalAgents(network);
  const scanCount = Math.min(total, limit);
  const agents: DiscoveredAgent[] = [];

  // Scan from most recent to oldest
  for (let i = total; i > total - scanCount && i > 0; i--) {
    const agent = await queryAgent(i.toString(), network);
    if (agent) {
      // Try to fetch the agent card for additional metadata
      try {
        const card = await fetchAgentCard(agent.agentURI);
        if (card) {
          agent.name = card.name;
          agent.description = card.description;
        }
      } catch {
        // Card fetch failed, use basic info
      }
      agents.push(agent);
    }
  }

  return agents;
}

/**
 * Fetch an agent card from a URI.
 */
export async function fetchAgentCard(
  uri: string,
): Promise<AgentCard | null> {
  try {
    // Handle IPFS URIs
    let fetchUrl = uri;
    if (uri.startsWith("ipfs://")) {
      fetchUrl = `https://ipfs.io/ipfs/${uri.slice(7)}`;
    }

    const response = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const card = (await response.json()) as AgentCard;

    // Basic validation
    if (!card.name || !card.type) return null;

    return card;
  } catch {
    return null;
  }
}

/**
 * Search for agents by name or description.
 * Scans recent registrations and filters by keyword.
 */
export async function searchAgents(
  keyword: string,
  limit: number = 10,
  network: Network = "mainnet",
): Promise<DiscoveredAgent[]> {
  const all = await discoverAgents(50, network);
  const lower = keyword.toLowerCase();

  return all
    .filter(
      (a) =>
        a.name?.toLowerCase().includes(lower) ||
        a.description?.toLowerCase().includes(lower) ||
        a.owner.toLowerCase().includes(lower),
    )
    .slice(0, limit);
}
