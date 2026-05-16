import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, publicKey, type Umi } from '@metaplex-foundation/umi';
import {
  delegateExecutionV1,
  fetchAgentIdentityV1FromSeeds,
  findAgentIdentityV1Pda,
  findExecutionDelegateRecordV1Pda,
  findExecutiveProfileV1Pda,
  mintAndSubmitAgent,
  mplAgentIdentity,
  mplAgentTools,
  registerExecutiveV1,
  safeFetchAgentIdentityV1,
} from '@metaplex-foundation/mpl-agent-registry';
import { fetchAsset, findAssetSignerPda } from '@metaplex-foundation/mpl-core';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { AGENT_REGISTRY_NETWORK, METAPLEX_API } from '../config.js';

export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface ClawdAgentMetadata {
  type: 'agent';
  name: string;
  description: string;
  services: AgentService[];
  registrations: { agentId: string; agentRegistry: string }[];
  supportedTrust: string[];
}

export interface MintClawdAgentInput {
  payerKeypair: Keypair;
  rpcUrl: string;
  network?: 'mainnet' | 'devnet';
  name: string;
  description: string;
  uri: string;
  services?: AgentService[];
  supportedTrust?: string[];
  metaplexApiBaseUrl?: string;
}

export interface MintClawdAgentResult {
  assetAddress: string;
  assetSignerPda: string;
  signature: string;
  network: 'solana-mainnet' | 'solana-devnet';
}

export interface AgentReadResult {
  registered: boolean;
  assetAddress: string;
  assetSignerPda: string;
  registrationUri: string | null;
  lifecycleChecks: unknown;
  agentIdentityPda: string;
}

export interface LaunchAgentTokenInput {
  payerKeypair: Keypair;
  rpcUrl: string;
  network?: 'mainnet' | 'devnet';
  agentAssetAddress: string;
  setToken: boolean;
  token: {
    name: string;
    symbol: string;
    image: string;
    description?: string;
    externalLinks?: {
      website?: string;
      twitter?: string;
      telegram?: string;
    };
  };
  firstBuyAmount?: number;
  acknowledgedPermanentToken?: boolean;
  metaplexApiBaseUrl?: string;
}

export interface LaunchAgentTokenResult {
  mintAddress: string;
  launchLink?: string;
  raw: unknown;
}

export function buildClawdAgentMetadata(input: {
  name: string;
  description: string;
  services?: AgentService[];
  supportedTrust?: string[];
}): ClawdAgentMetadata {
  return {
    type: 'agent',
    name: input.name,
    description: input.description,
    services: input.services?.length
      ? input.services
      : [
          { name: 'web', endpoint: 'https://solanaclawd.com' },
          { name: 'MCP', endpoint: 'https://solanaclawd.com/mcp', version: '2025-06-18' },
          { name: 'A2A', endpoint: 'https://solanaclawd.com/a2a', version: '0.3.0' },
          { name: 'commerce', endpoint: 'https://pay.solanaclawd.com' },
        ],
    registrations: [],
    supportedTrust: input.supportedTrust ?? ['reputation', 'crypto-economic'],
  };
}

export async function mintClawdAgent(input: MintClawdAgentInput): Promise<MintClawdAgentResult> {
  const network = AGENT_REGISTRY_NETWORK[input.network ?? 'mainnet'];
  const umi = makeAgentUmi(input.rpcUrl, input.payerKeypair);

  const result = await mintAndSubmitAgent(
    umi,
    { baseUrl: input.metaplexApiBaseUrl ?? METAPLEX_API },
    {
      wallet: umi.identity.publicKey,
      network,
      name: input.name,
      uri: input.uri,
      agentMetadata: buildClawdAgentMetadata(input),
    },
  );

  const assetAddress = String(result.assetAddress);
  const assetSignerPda = findAssetSignerPda(umi, { asset: publicKey(assetAddress) })[0];

  return {
    assetAddress,
    assetSignerPda: String(assetSignerPda),
    signature: String(result.signature),
    network,
  };
}

export async function readClawdAgent(rpcUrl: string, agentAssetAddress: string): Promise<AgentReadResult> {
  const umi = createUmi(rpcUrl).use(mplAgentIdentity());
  const assetAddress = publicKey(agentAssetAddress);
  const agentIdentityPda = findAgentIdentityV1Pda(umi, { asset: assetAddress })[0];
  const identity = await safeFetchAgentIdentityV1(umi, agentIdentityPda);
  const asset = await fetchAsset(umi, assetAddress);
  const plugin = (asset as { agentIdentities?: Array<{ uri?: string; lifecycleChecks?: unknown }> }).agentIdentities?.[0];
  const assetSignerPda = findAssetSignerPda(umi, { asset: assetAddress })[0];

  return {
    registered: identity !== null,
    assetAddress: agentAssetAddress,
    assetSignerPda: String(assetSignerPda),
    registrationUri: plugin?.uri ?? null,
    lifecycleChecks: plugin?.lifecycleChecks ?? null,
    agentIdentityPda: String(agentIdentityPda),
  };
}

export async function fetchClawdAgentIdentityFromSeeds(rpcUrl: string, agentAssetAddress: string) {
  const umi = createUmi(rpcUrl).use(mplAgentIdentity());
  return fetchAgentIdentityV1FromSeeds(umi, { asset: publicKey(agentAssetAddress) });
}

export async function registerClawdExecutive(input: {
  payerKeypair: Keypair;
  rpcUrl: string;
}): Promise<{ executiveProfile: string; signature: string }> {
  const umi = makeAgentUmi(input.rpcUrl, input.payerKeypair);
  const builder = registerExecutiveV1(umi, { payer: umi.payer });
  const result = await builder.sendAndConfirm(umi);
  const executiveProfile = findExecutiveProfileV1Pda(umi, { authority: umi.identity.publicKey })[0];
  return { executiveProfile: String(executiveProfile), signature: bytesToBase58Like(result.signature) };
}

export async function delegateClawdExecution(input: {
  payerKeypair: Keypair;
  rpcUrl: string;
  agentAssetAddress: string;
  executiveAuthority: string;
}): Promise<{ delegateRecord: string; signature: string }> {
  const umi = makeAgentUmi(input.rpcUrl, input.payerKeypair);
  const agentAsset = publicKey(input.agentAssetAddress);
  const agentIdentity = findAgentIdentityV1Pda(umi, { asset: agentAsset });
  const executiveProfile = findExecutiveProfileV1Pda(umi, { authority: publicKey(input.executiveAuthority) });
  const builder = delegateExecutionV1(umi, {
    agentAsset,
    agentIdentity,
    executiveProfile,
  });
  const result = await builder.sendAndConfirm(umi);
  const delegateRecord = findExecutionDelegateRecordV1Pda(umi, {
    executiveProfile: executiveProfile[0],
    agentAsset,
  })[0];
  return { delegateRecord: String(delegateRecord), signature: bytesToBase58Like(result.signature) };
}

export async function launchClawdAgentToken(input: LaunchAgentTokenInput): Promise<LaunchAgentTokenResult> {
  if (input.setToken && !input.acknowledgedPermanentToken) {
    throw new Error('setToken=true is permanent. Pass acknowledgedPermanentToken=true only for the final canonical agent token.');
  }
  if (!input.token.image.startsWith('https://gateway.irys.xyz/')) {
    throw new Error('Metaplex Genesis requires token.image to be an Irys gateway URL.');
  }

  const umi = makeAgentUmi(input.rpcUrl, input.payerKeypair);
  const { createAndRegisterLaunch } = await import('@metaplex-foundation/genesis/dist/src/api/index.js');
  const result = await createAndRegisterLaunch(
    umi,
    { baseUrl: input.metaplexApiBaseUrl ?? METAPLEX_API },
    {
      wallet: umi.identity.publicKey,
      network: AGENT_REGISTRY_NETWORK[input.network ?? 'mainnet'],
      agent: {
        mint: publicKey(input.agentAssetAddress),
        setToken: input.setToken,
      },
      launchType: 'bondingCurve',
      token: input.token,
      launch: input.firstBuyAmount ? { firstBuyAmount: input.firstBuyAmount } : {},
    },
  );

  return {
    mintAddress: String(result.mintAddress),
    launchLink: result.launch?.link,
    raw: result,
  };
}

function makeAgentUmi(rpcUrl: string, payer: Keypair): Umi {
  const umi = createUmi(rpcUrl).use(mplAgentIdentity()).use(mplAgentTools());
  const eddsaKp = umi.eddsa.createKeypairFromSecretKey(payer.secretKey);
  return umi.use(keypairIdentity(eddsaKp));
}

function bytesToBase58Like(signature: Uint8Array | string): string {
  return typeof signature === 'string'
    ? signature
    : bs58.encode(signature);
}
