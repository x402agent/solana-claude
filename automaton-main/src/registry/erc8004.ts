/**
 * ERC-8004 On-Chain Agent Registration
 *
 * Registers the automaton on-chain as a Trustless Agent via ERC-8004.
 * Uses the Identity Registry on Base mainnet.
 *
 * Contract: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 (Base)
 * Reputation: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63 (Base)
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseAbi,
  type Address,
  type PrivateKeyAccount,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import type {
  RegistryEntry,
  ReputationEntry,
  DiscoveredAgent,
  AutomatonDatabase,
} from "../types.js";

// ─── Contract Addresses ──────────────────────────────────────

const CONTRACTS = {
  mainnet: {
    identity: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address,
    reputation: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as Address,
    chain: base,
  },
  testnet: {
    identity: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address,
    reputation: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as Address,
    chain: baseSepolia,
  },
} as const;

// ─── ABI (minimal subset needed for registration) ────────────

const IDENTITY_ABI = parseAbi([
  "function register(string agentURI) external returns (uint256 agentId)",
  "function updateAgentURI(uint256 agentId, string newAgentURI) external",
  "function agentURI(uint256 agentId) external view returns (string)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
]);

const REPUTATION_ABI = parseAbi([
  "function leaveFeedback(uint256 agentId, uint8 score, string comment) external",
  "function getFeedback(uint256 agentId) external view returns (tuple(address from, uint8 score, string comment, uint256 timestamp)[])",
]);

type Network = "mainnet" | "testnet";

/**
 * Register the automaton on-chain with ERC-8004.
 * Returns the agent ID (NFT token ID).
 */
export async function registerAgent(
  account: PrivateKeyAccount,
  agentURI: string,
  network: Network = "mainnet",
  db: AutomatonDatabase,
): Promise<RegistryEntry> {
  const contracts = CONTRACTS[network];
  const chain = contracts.chain;

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  // Call register(agentURI)
  const hash = await walletClient.writeContract({
    address: contracts.identity,
    abi: IDENTITY_ABI,
    functionName: "register",
    args: [agentURI],
  });

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract agentId from Transfer event logs
  // The register function mints an ERC-721 token
  let agentId = "0";
  for (const log of receipt.logs) {
    if (log.topics.length >= 4) {
      // Transfer(address from, address to, uint256 tokenId)
      agentId = BigInt(log.topics[3]!).toString();
      break;
    }
  }

  const entry: RegistryEntry = {
    agentId,
    agentURI,
    chain: `eip155:${chain.id}`,
    contractAddress: contracts.identity,
    txHash: hash,
    registeredAt: new Date().toISOString(),
  };

  db.setRegistryEntry(entry);
  return entry;
}

/**
 * Update the agent's URI on-chain.
 */
export async function updateAgentURI(
  account: PrivateKeyAccount,
  agentId: string,
  newAgentURI: string,
  network: Network = "mainnet",
  db: AutomatonDatabase,
): Promise<string> {
  const contracts = CONTRACTS[network];
  const chain = contracts.chain;

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const hash = await walletClient.writeContract({
    address: contracts.identity,
    abi: IDENTITY_ABI,
    functionName: "updateAgentURI",
    args: [BigInt(agentId), newAgentURI],
  });

  // Update in DB
  const entry = db.getRegistryEntry();
  if (entry) {
    entry.agentURI = newAgentURI;
    entry.txHash = hash;
    db.setRegistryEntry(entry);
  }

  return hash;
}

/**
 * Leave reputation feedback for another agent.
 */
export async function leaveFeedback(
  account: PrivateKeyAccount,
  agentId: string,
  score: number,
  comment: string,
  network: Network = "mainnet",
  db: AutomatonDatabase,
): Promise<string> {
  const contracts = CONTRACTS[network];
  const chain = contracts.chain;

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  const hash = await walletClient.writeContract({
    address: contracts.reputation,
    abi: REPUTATION_ABI,
    functionName: "leaveFeedback",
    args: [BigInt(agentId), score, comment],
  });

  return hash;
}

/**
 * Query the registry for an agent by ID.
 */
export async function queryAgent(
  agentId: string,
  network: Network = "mainnet",
): Promise<DiscoveredAgent | null> {
  const contracts = CONTRACTS[network];
  const chain = contracts.chain;

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  try {
    const [uri, owner] = await Promise.all([
      publicClient.readContract({
        address: contracts.identity,
        abi: IDENTITY_ABI,
        functionName: "agentURI",
        args: [BigInt(agentId)],
      }),
      publicClient.readContract({
        address: contracts.identity,
        abi: IDENTITY_ABI,
        functionName: "ownerOf",
        args: [BigInt(agentId)],
      }),
    ]);

    return {
      agentId,
      owner: owner as string,
      agentURI: uri as string,
    };
  } catch {
    return null;
  }
}

/**
 * Get the total number of registered agents.
 */
export async function getTotalAgents(
  network: Network = "mainnet",
): Promise<number> {
  const contracts = CONTRACTS[network];
  const chain = contracts.chain;

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  try {
    const supply = await publicClient.readContract({
      address: contracts.identity,
      abi: IDENTITY_ABI,
      functionName: "totalSupply",
    });
    return Number(supply);
  } catch {
    return 0;
  }
}

/**
 * Check if an address has a registered agent.
 */
export async function hasRegisteredAgent(
  address: Address,
  network: Network = "mainnet",
): Promise<boolean> {
  const contracts = CONTRACTS[network];
  const chain = contracts.chain;

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  try {
    const balance = await publicClient.readContract({
      address: contracts.identity,
      abi: IDENTITY_ABI,
      functionName: "balanceOf",
      args: [address],
    });
    return Number(balance) > 0;
  } catch {
    return false;
  }
}
