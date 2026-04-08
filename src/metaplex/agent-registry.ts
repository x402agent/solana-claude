/**
 * Metaplex Agent Registry — Register, read, and delegate agent execution
 *
 * Handles the full lifecycle after minting:
 *   - Register an identity on an existing Core asset
 *   - Read agent identity data and wallet balance
 *   - Register an executive profile and delegate execution
 *   - Verify delegation status
 */

import { publicKey, type Umi } from '@metaplex-foundation/umi'
import { createCollection, create, fetchAssetV1, findAssetSignerPda } from '@metaplex-foundation/mpl-core'
import { generateSigner } from '@metaplex-foundation/umi'
import {
  mplAgentTools,
  registerIdentityV1,
  registerExecutiveV1,
  delegateExecutionV1,
  findAgentIdentityV1Pda,
  findExecutiveProfileV1Pda,
  findExecutionDelegateRecordV1Pda,
  safeFetchAgentIdentityV1,
} from '@metaplex-foundation/mpl-agent-registry'

import type {
  RegisterAgentInput,
  RegisterAgentResult,
  AgentIdentityData,
  DelegateExecutionInput,
  DelegateExecutionResult,
  AgentRegistrationDocument,
} from './metaplex-types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Agent registration (attach identity to existing Core asset)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register an agent identity on an existing MPL Core asset.
 * Creates an Agent Identity PDA and attaches lifecycle hooks.
 *
 * Use this when you already own a Core asset and want to make it an agent.
 * For creating a new asset + identity in one call, use mintClawdAgent instead.
 */
export async function registerAgentIdentity(
  umi: Umi,
  input: RegisterAgentInput,
): Promise<RegisterAgentResult> {
  const assetPubkey = publicKey(input.assetAddress)
  const collectionPubkey = input.collectionAddress
    ? publicKey(input.collectionAddress)
    : undefined

  const builder = registerIdentityV1(umi, {
    asset: assetPubkey,
    collection: collectionPubkey,
    agentRegistrationUri: input.agentRegistrationUri,
  })

  const result = await builder.sendAndConfirm(umi)

  return {
    signature: Buffer.from(result.signature).toString('base64'),
    assetAddress: input.assetAddress,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create a Core asset + collection for agent registration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new MPL Core asset and collection, then register the agent identity.
 * This is the full manual flow (vs. the API-based mintClawdAgent).
 */
export async function createAndRegisterAgent(
  umi: Umi,
  params: {
    collectionName: string
    collectionUri: string
    assetName: string
    assetUri: string
    agentRegistrationUri: string
  },
): Promise<{
  collectionAddress: string
  assetAddress: string
  signature: string
}> {
  // 1. Create collection
  const collection = generateSigner(umi)
  await createCollection(umi, {
    collection,
    name: params.collectionName,
    uri: params.collectionUri,
  }).sendAndConfirm(umi)

  // 2. Create asset
  const asset = generateSigner(umi)
  await create(umi, {
    asset,
    name: params.assetName,
    uri: params.assetUri,
    collection,
  }).sendAndConfirm(umi)

  // 3. Register identity
  const result = await registerIdentityV1(umi, {
    asset: asset.publicKey,
    collection: collection.publicKey,
    agentRegistrationUri: params.agentRegistrationUri,
  }).sendAndConfirm(umi)

  return {
    collectionAddress: collection.publicKey.toString(),
    assetAddress: asset.publicKey.toString(),
    signature: Buffer.from(result.signature).toString('base64'),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read agent identity data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether an asset has a registered agent identity.
 */
export async function checkAgentRegistration(
  umi: Umi,
  assetAddress: string,
): Promise<boolean> {
  const assetPubkey = publicKey(assetAddress)
  const pda = findAgentIdentityV1Pda(umi, { asset: assetPubkey })
  const identity = await safeFetchAgentIdentityV1(umi, pda)
  return identity !== null
}

/**
 * Read full agent identity data including wallet balance.
 */
export async function readAgentData(
  umi: Umi,
  assetAddress: string,
): Promise<AgentIdentityData> {
  const assetPubkey = publicKey(assetAddress)

  // Check identity PDA
  const pda = findAgentIdentityV1Pda(umi, { asset: assetPubkey })
  const identity = await safeFetchAgentIdentityV1(umi, pda)

  if (!identity) {
    return { isRegistered: false }
  }

  // Fetch Core asset to read the AgentIdentity plugin
  const assetData = await fetchAssetV1(umi, assetPubkey)
  const agentIdentities = (assetData as any).agentIdentities
  const agentIdentity = agentIdentities?.[0]

  // Derive the agent's built-in wallet (Asset Signer PDA)
  const assetSignerPda = findAssetSignerPda(umi, { asset: assetPubkey })
  const walletPubkey = publicKey(assetSignerPda)
  let walletBalance: bigint | undefined
  try {
    const balance = await umi.rpc.getBalance(walletPubkey)
    walletBalance = balance.basisPoints
  } catch {
    // Wallet may not exist yet
  }

  return {
    isRegistered: true,
    registrationUri: agentIdentity?.uri,
    lifecycleHooks: agentIdentity
      ? {
          transfer: !!agentIdentity.lifecycleChecks?.transfer,
          update: !!agentIdentity.lifecycleChecks?.update,
          execute: !!agentIdentity.lifecycleChecks?.execute,
        }
      : undefined,
    walletAddress: walletPubkey.toString(),
    walletBalance,
  }
}

/**
 * Fetch the off-chain agent registration document from the registration URI.
 */
export async function fetchAgentRegistrationDocument(
  registrationUri: string,
): Promise<AgentRegistrationDocument | null> {
  try {
    const response = await fetch(registrationUri)
    if (!response.ok) return null
    return (await response.json()) as AgentRegistrationDocument
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent wallet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive the agent's built-in wallet address (Asset Signer PDA).
 * Deterministic — same result for the same asset address on any network.
 */
export function deriveAgentWallet(
  umi: Umi,
  assetAddress: string,
): string {
  const assetPubkey = publicKey(assetAddress)
  const pda = findAssetSignerPda(umi, { asset: assetPubkey })
  return pda.toString()
}

/**
 * Get the SOL balance of an agent's built-in wallet.
 */
export async function getAgentWalletBalance(
  umi: Umi,
  assetAddress: string,
): Promise<{ address: string; lamports: bigint }> {
  const assetPubkey = publicKey(assetAddress)
  const pda = findAssetSignerPda(umi, { asset: assetPubkey })
  const walletPubkey = publicKey(pda)
  const balance = await umi.rpc.getBalance(walletPubkey)

  return {
    address: walletPubkey.toString(),
    lamports: balance.basisPoints,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution delegation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register an executive profile for the current wallet.
 * One-time setup — each wallet can only have one profile.
 */
export async function registerExecutive(
  umi: Umi,
): Promise<{ signature: string; profileAddress: string }> {
  // Ensure mplAgentTools plugin is loaded
  umi.use(mplAgentTools())

  const result = await registerExecutiveV1(umi, {
    payer: umi.payer,
  }).sendAndConfirm(umi)

  const profilePda = findExecutiveProfileV1Pda(umi, {
    authority: umi.payer.publicKey,
  })

  return {
    signature: Buffer.from(result.signature).toString('base64'),
    profileAddress: profilePda.toString(),
  }
}

/**
 * Delegate execution of an agent to a specific executive.
 * Only the asset owner can delegate.
 */
export async function delegateAgentExecution(
  umi: Umi,
  input: DelegateExecutionInput,
): Promise<DelegateExecutionResult> {
  umi.use(mplAgentTools())

  const agentAssetPubkey = publicKey(input.agentAssetAddress)
  const executiveAuthPubkey = publicKey(input.executiveAuthorityAddress)

  const agentIdentity = findAgentIdentityV1Pda(umi, {
    asset: agentAssetPubkey,
  })
  const executiveProfile = findExecutiveProfileV1Pda(umi, {
    authority: executiveAuthPubkey,
  })

  try {
    const result = await delegateExecutionV1(umi, {
      agentAsset: agentAssetPubkey,
      agentIdentity,
      executiveProfile,
    }).sendAndConfirm(umi)

    return {
      signature: Buffer.from(result.signature).toString('base64'),
      delegated: true,
    }
  } catch (err) {
    return {
      signature: '',
      delegated: false,
    }
  }
}

/**
 * Check whether an agent has been delegated to an executive.
 */
export async function checkDelegation(
  umi: Umi,
  agentAssetAddress: string,
  executiveAuthorityAddress: string,
): Promise<boolean> {
  umi.use(mplAgentTools())

  const executiveProfilePda = findExecutiveProfileV1Pda(umi, {
    authority: publicKey(executiveAuthorityAddress),
  })

  const delegateRecord = findExecutionDelegateRecordV1Pda(umi, {
    executiveProfile: publicKey(executiveProfilePda),
    agentAsset: publicKey(agentAssetAddress),
  })

  const account = await umi.rpc.getAccount(publicKey(delegateRecord))
  return account.exists
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Build an ERC-8004 registration document
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a standard ERC-8004 agent registration document.
 * Upload this JSON to Arweave or another permanent store, then pass
 * the URI to registerAgentIdentity or createAndRegisterAgent.
 */
export function buildRegistrationDocument(params: {
  name: string
  description: string
  imageUri: string
  assetAddress: string
  services?: Array<{ name: string; endpoint: string; version?: string }>
  supportedTrust?: string[]
}): AgentRegistrationDocument {
  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: params.name,
    description: params.description,
    image: params.imageUri,
    services: params.services ?? [],
    active: true,
    registrations: [
      {
        agentId: params.assetAddress,
        agentRegistry: 'solana:101:metaplex',
      },
    ],
    supportedTrust: params.supportedTrust ?? ['reputation'],
  }
}
