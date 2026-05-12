/**
 * On-chain spawn — register the leviathan via Metaplex Agent Registry.
 *
 * One transaction creates an MPL Core asset (the agent's NFT) AND attaches
 * an Agent Identity PDA. The Core asset's Asset-Signer PDA becomes the
 * leviathan's autonomous wallet (no private key — only this asset can sign for it).
 *
 * Reference: https://developers.metaplex.com/agents/mint-an-agent
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, Umi, publicKey } from '@metaplex-foundation/umi';
import { mintAndSubmitAgent, mplAgentIdentity } from '@metaplex-foundation/mpl-agent-registry';
import { fetchAsset, findAssetSignerPda } from '@metaplex-foundation/mpl-core';
import { Keypair } from '@solana/web3.js';
import { CLAWD_MINT, AGENT_REGISTRY_NETWORK, DEFAULT_AGENT_NFT_METADATA } from '../config.js';

export interface SpawnOnchainInput {
  /** Solana keypair from identity/wallet.ts. This pays for the spawn and owns the agent. */
  payerKeypair: Keypair;
  /** Display name (callsign). */
  name: string;
  /** Public description shown in the agent registry. */
  description: string;
  /** Spawn prompt — the seed instruction. Stored off-chain via the Metaplex API. */
  spawnPrompt: string;
  /** Pubkey of the human creator. */
  creator: string;
  /** RPC endpoint URL. */
  rpcUrl: string;
  /** Optional pre-uploaded NFT metadata JSON URI. If absent, we ship a default Arweave-style URI. */
  nftMetadataUri?: string;
  /** Network — 'mainnet' or 'devnet'. */
  network?: 'mainnet' | 'devnet';
  /** Optional service endpoints the agent exposes. */
  services?: { name: string; endpoint: string; version?: string }[];
}

export interface SpawnOnchainResult {
  /** The MPL Core asset address — the agent's permanent on-chain identity. */
  assetAddress: string;
  /** Asset Signer PDA — the agent's wallet that holds SOL/USDC/$CLAWD. */
  assetSignerPda: string;
  /** Spawn transaction signature. */
  signature: string;
  /** Network it was spawned on. */
  network: 'solana-mainnet' | 'solana-devnet';
}

function makeUmi(rpcUrl: string, payer: Keypair): Umi {
  const umi = createUmi(rpcUrl).use(mplAgentIdentity());
  const eddsaKp = umi.eddsa.createKeypairFromSecretKey(payer.secretKey);
  return umi.use(keypairIdentity(eddsaKp));
}

/** Spawn a leviathan on-chain. One atomic tx → Core asset + Agent Identity PDA. */
export async function spawnOnchain(input: SpawnOnchainInput): Promise<SpawnOnchainResult> {
  const network = AGENT_REGISTRY_NETWORK[input.network || 'mainnet'];
  const umi = makeUmi(input.rpcUrl, input.payerKeypair);

  const result = await mintAndSubmitAgent(umi, {}, {
    wallet: umi.identity.publicKey,
    network,
    name: input.name,
    uri: input.nftMetadataUri || 'https://solanaclawd.com/leviathan-default.json',
    agentMetadata: {
      type: 'agent',
      name: input.name,
      description: input.description,
      services: input.services?.length
        ? input.services
        : [
            { name: 'web', endpoint: 'https://solanaclawd.com' },
            { name: 'A2A', endpoint: 'https://solanaclawd.com/leviathan/a2a', version: '0.3.0' },
          ],
      registrations: [],
      supportedTrust: ['reputation', 'crypto-economic'],
    },
  });

  const assetSignerPda = findAssetSignerPda(umi, { asset: publicKey(String(result.assetAddress)) })[0];

  return {
    assetAddress: String(result.assetAddress),
    assetSignerPda: String(assetSignerPda),
    signature: String(result.signature),
    network,
  };
}

/**
 * Fetch the on-chain agent record + its asset-signer wallet. Used by survival/monitor and the CLI.
 */
export async function readAgent(rpcUrl: string, assetAddress: string) {
  const umi = createUmi(rpcUrl).use(mplAgentIdentity());
  const asset = await fetchAsset(umi, publicKey(assetAddress));
  const identity = (asset as any).agentIdentities?.[0];
  const assetSignerPda = findAssetSignerPda(umi, { asset: publicKey(assetAddress) })[0];
  return {
    asset,
    identity,
    assetSignerPda: String(assetSignerPda),
    registrationUri: identity?.uri ?? null,
  };
}

/** $CLAWD mint constant — re-exported for convenience. */
export { CLAWD_MINT, DEFAULT_AGENT_NFT_METADATA };
