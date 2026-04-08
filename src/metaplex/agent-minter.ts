/**
 * Metaplex Agent Minter — Mint AI agents on Solana as MPL Core assets
 *
 * Uses the Metaplex API + mpl-agent-registry SDK to:
 *   1. Create an MPL Core asset
 *   2. Register an Agent Identity PDA
 *   3. Store agent metadata off-chain via the Metaplex API
 *
 * All in a single atomic transaction.
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity, publicKey, type Umi } from '@metaplex-foundation/umi'
import {
  mplAgentIdentity,
  mintAndSubmitAgent,
  mintAgent,
  signAndSendAgentTransaction,
  isAgentApiError,
  isAgentApiNetworkError,
  isAgentValidationError,
} from '@metaplex-foundation/mpl-agent-registry'
import { fetchAssetV1 } from '@metaplex-foundation/mpl-core'

import type {
  MetaplexConfig,
  MintAgentInput,
  MintAgentResult,
  AgentMetadata,
  AgentIdentityData,
  SupportedNetwork,
  ClawdAgentRole,
} from './metaplex-types.js'
import {
  NETWORK_RPC_URLS,
  CLAWD_AGENT_TEMPLATES,
} from './metaplex-types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Umi instance management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a configured Umi instance for agent operations.
 */
export function createAgentUmi(config: MetaplexConfig): Umi {
  const rpcUrl = config.rpcUrl || NETWORK_RPC_URLS[config.network]
  const umi = createUmi(rpcUrl).use(mplAgentIdentity())

  if (config.secretKey) {
    const keypair = umi.eddsa.createKeypairFromSecretKey(config.secretKey)
    umi.use(keypairIdentity(keypair))
  }

  return umi
}

/**
 * Create a Umi instance from an RPC URL and optional secret key bytes.
 */
export function createAgentUmiFromEnv(
  network: SupportedNetwork = 'solana-devnet',
): Umi {
  const rpcUrl = process.env.SOLANA_RPC_URL || NETWORK_RPC_URLS[network]
  const umi = createUmi(rpcUrl).use(mplAgentIdentity())

  const secretKeyEnv = process.env.SOLANA_SECRET_KEY
  if (secretKeyEnv) {
    const bytes = Uint8Array.from(JSON.parse(secretKeyEnv))
    const keypair = umi.eddsa.createKeypairFromSecretKey(bytes)
    umi.use(keypairIdentity(keypair))
  }

  return umi
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent minting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mint a new AI agent on Solana — creates an MPL Core asset and registers
 * the Agent Identity PDA in a single atomic transaction.
 *
 * This is the primary entry point for agent creation.
 */
export async function mintClawdAgent(
  umi: Umi,
  input: MintAgentInput,
): Promise<MintAgentResult> {
  const network = input.network ?? 'solana-devnet'

  try {
    const result = await mintAndSubmitAgent(umi, {}, {
      wallet: umi.identity.publicKey,
      network,
      name: input.name,
      uri: input.uri,
      agentMetadata: input.agentMetadata,
    })

    return {
      assetAddress: result.assetAddress,
      signature: Buffer.from(result.signature).toString('base64'),
      network,
    }
  } catch (err) {
    if (isAgentValidationError(err)) {
      throw new Error(`Agent validation error on field "${err.field}": ${err.message}`)
    }
    if (isAgentApiNetworkError(err)) {
      throw new Error(`Cannot reach Metaplex API: ${err.message}`)
    }
    if (isAgentApiError(err)) {
      throw new Error(`Metaplex API error (${err.statusCode}): ${err.message}`)
    }
    throw err
  }
}

/**
 * Mint an agent with manual signing control — returns the unsigned transaction
 * so the caller can add priority fees, use hardware wallets, etc.
 */
export async function mintClawdAgentManual(
  umi: Umi,
  input: MintAgentInput,
): Promise<{ assetAddress: string; sign: () => Promise<string> }> {
  const network = input.network ?? 'solana-devnet'

  const mintResult = await mintAgent(umi, {}, {
    wallet: umi.identity.publicKey,
    network,
    name: input.name,
    uri: input.uri,
    agentMetadata: input.agentMetadata,
  })

  return {
    assetAddress: mintResult.assetAddress,
    sign: async () => {
      const signature = await signAndSendAgentTransaction(umi, mintResult)
      return Buffer.from(signature).toString('base64')
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Template-based agent minting (Clawd presets)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mint a Clawd agent using a built-in role template.
 *
 * Templates provide sensible defaults for name, description, services,
 * and trust models. Pass overrides to customize.
 */
export async function mintClawdAgentFromTemplate(
  umi: Umi,
  role: ClawdAgentRole,
  overrides: {
    name?: string
    description?: string
    uri: string
    network?: SupportedNetwork
    serviceEndpoints?: Record<string, string>
  },
): Promise<MintAgentResult> {
  const template = CLAWD_AGENT_TEMPLATES[role]

  const services = template.services.map(svc => ({
    ...svc,
    endpoint: overrides.serviceEndpoints?.[svc.name] ?? svc.endpoint,
  }))

  const agentMetadata: AgentMetadata = {
    type: 'agent',
    name: overrides.name ?? template.name,
    description: overrides.description ?? template.description,
    services,
    registrations: [],
    supportedTrust: template.supportedTrust,
  }

  return mintClawdAgent(umi, {
    name: overrides.name ?? template.name,
    uri: overrides.uri,
    agentMetadata,
    network: overrides.network,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify that an agent was successfully minted and registered by
 * fetching the Core asset and checking for the AgentIdentity plugin.
 */
export async function verifyAgentMint(
  umi: Umi,
  assetAddress: string,
): Promise<AgentIdentityData> {
  try {
    const assetPubkey = publicKey(assetAddress)
    const assetData = await fetchAssetV1(umi, assetPubkey)

    // Check for AgentIdentity plugin (attached during minting)
    const agentIdentities = (assetData as any).agentIdentities
    const agentIdentity = agentIdentities?.[0]

    if (!agentIdentity) {
      return { isRegistered: false }
    }

    return {
      isRegistered: true,
      registrationUri: agentIdentity.uri,
      lifecycleHooks: {
        transfer: !!agentIdentity.lifecycleChecks?.transfer,
        update: !!agentIdentity.lifecycleChecks?.update,
        execute: !!agentIdentity.lifecycleChecks?.execute,
      },
    }
  } catch {
    return { isRegistered: false }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch minting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mint multiple agents sequentially. Returns results for each,
 * including any that failed.
 */
export async function mintClawdAgentBatch(
  umi: Umi,
  inputs: MintAgentInput[],
): Promise<Array<MintAgentResult | { error: string; name: string }>> {
  const results: Array<MintAgentResult | { error: string; name: string }> = []

  for (const input of inputs) {
    try {
      const result = await mintClawdAgent(umi, input)
      results.push(result)
    } catch (err) {
      results.push({
        error: err instanceof Error ? err.message : String(err),
        name: input.name,
      })
    }
  }

  return results
}
