import { readFile } from 'node:fs/promises';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  keypairIdentity,
  publicKey,
  type PublicKey,
  type Umi,
} from '@metaplex-foundation/umi';
import {
  isAgentApiError,
  isAgentApiNetworkError,
  isAgentValidationError,
  mintAndSubmitAgent,
  mplAgentIdentity,
  safeFetchAgentIdentityV1FromSeeds,
} from '@metaplex-foundation/mpl-agent-registry';
import {
  fetchAsset,
  findAssetSignerPda,
  mplCore,
} from '@metaplex-foundation/mpl-core';
import bs58 from 'bs58';

export type AgentNetwork =
  | 'solana-mainnet'
  | 'solana-devnet'
  | 'localnet'
  | 'eclipse-mainnet'
  | 'sonic-mainnet'
  | 'sonic-devnet'
  | 'fogo-mainnet'
  | 'fogo-testnet';

export interface AgentServiceInput {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface AgentRegistrationInput {
  agentId: string;
  agentRegistry: string;
}

export interface AgentMetadataInput {
  type: 'agent' | 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';
  name: string;
  description: string;
  image?: string;
  services: AgentServiceInput[];
  registrations: AgentRegistrationInput[];
  supportedTrust: string[];
  active?: boolean;
  x402Support?: boolean;
}

export interface MintRegisteredAgentOptions {
  keypairPath: string;
  rpcUrl?: string;
  network?: AgentNetwork;
  name: string;
  uri: string;
  description: string;
  image?: string;
  services?: AgentServiceInput[];
  registrations?: AgentRegistrationInput[];
  supportedTrust?: string[];
  x402Support?: boolean;
  baseUrl?: string;
}

export interface MintRegisteredAgentResult {
  assetAddress: string;
  signature: string;
  owner: string;
  agentWallet: string;
  network: AgentNetwork;
  rpcUrl: string;
  explorerUrl: string;
  registered: boolean;
  registrationUri?: string;
}

export interface ReadRegisteredAgentResult {
  assetAddress: string;
  registered: boolean;
  registrationUri?: string;
  agentWallet: string;
  owner?: string;
  name?: string;
  uri?: string;
  lifecycleChecks?: unknown;
}

export function defaultRpcForNetwork(network: AgentNetwork): string {
  if (network === 'solana-devnet') return 'https://api.devnet.solana.com';
  if (network === 'solana-mainnet') return 'https://api.mainnet-beta.solana.com';
  return 'https://api.mainnet-beta.solana.com';
}

export function inferNetwork(value: string | undefined): AgentNetwork {
  if (!value || value === 'mainnet') return 'solana-mainnet';
  if (value === 'devnet') return 'solana-devnet';
  return value as AgentNetwork;
}

export function buildAgentMetadata(input: {
  name: string;
  description: string;
  image?: string;
  services?: AgentServiceInput[];
  registrations?: AgentRegistrationInput[];
  supportedTrust?: string[];
  x402Support?: boolean;
}): AgentMetadataInput {
  return {
    type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
    name: input.name,
    description: input.description,
    image: input.image,
    services: input.services ?? [],
    active: true,
    registrations: input.registrations ?? [],
    supportedTrust: input.supportedTrust ?? ['reputation', 'crypto-economic'],
    x402Support: input.x402Support ?? true,
  };
}

export async function createAgentUmi(opts: {
  keypairPath?: string;
  rpcUrl?: string;
  network?: AgentNetwork;
}): Promise<{ umi: Umi; owner?: PublicKey; rpcUrl: string }> {
  const network = opts.network ?? 'solana-devnet';
  const rpcUrl = opts.rpcUrl ?? defaultRpcForNetwork(network);
  const umi = createUmi(rpcUrl).use(mplCore()).use(mplAgentIdentity());

  if (!opts.keypairPath) return { umi, rpcUrl };

  const secretBytes = await readSecretKey(opts.keypairPath);
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretBytes);
  umi.use(keypairIdentity(keypair));
  return { umi, owner: keypair.publicKey, rpcUrl };
}

export async function mintRegisteredAgent(
  opts: MintRegisteredAgentOptions,
): Promise<MintRegisteredAgentResult> {
  const network = opts.network ?? 'solana-devnet';
  const { umi, owner, rpcUrl } = await createAgentUmi({
    keypairPath: opts.keypairPath,
    rpcUrl: opts.rpcUrl,
    network,
  });

  if (!owner) throw new Error('A funded keypair is required to mint an agent');

  const result = await mintAndSubmitAgent(
    umi,
    opts.baseUrl ? { baseUrl: opts.baseUrl } : {},
    {
      wallet: owner,
      network,
      name: opts.name,
      uri: opts.uri,
      agentMetadata: buildAgentMetadata({
        name: opts.name,
        description: opts.description,
        image: opts.image,
        services: opts.services,
        registrations: opts.registrations,
        supportedTrust: opts.supportedTrust,
        x402Support: opts.x402Support,
      }),
    },
  );

  const assetAddress = result.assetAddress.toString();
  const assetPublicKey = publicKey(assetAddress);
  const agentWallet = findAssetSignerPda(umi, { asset: assetPublicKey })[0].toString();
  const read = await readRegisteredAgent({
    assetAddress,
    rpcUrl,
    network,
  }).catch(() => null);

  return {
    assetAddress,
    signature: formatSignature(result.signature),
    owner: owner.toString(),
    agentWallet,
    network,
    rpcUrl,
    explorerUrl: explorerUrl(assetAddress, network),
    registered: read?.registered ?? false,
    registrationUri: read?.registrationUri,
  };
}

export async function readRegisteredAgent(opts: {
  assetAddress: string;
  rpcUrl?: string;
  network?: AgentNetwork;
}): Promise<ReadRegisteredAgentResult> {
  const network = opts.network ?? 'solana-devnet';
  const { umi } = await createAgentUmi({ rpcUrl: opts.rpcUrl, network });
  const asset = publicKey(opts.assetAddress);
  const identity = await safeFetchAgentIdentityV1FromSeeds(umi, { asset });
  const assetData = await fetchAsset(umi, asset).catch(() => null);
  const agentIdentity = assetData?.agentIdentities?.[0];

  return {
    assetAddress: opts.assetAddress,
    registered: identity !== null || agentIdentity !== undefined,
    registrationUri: agentIdentity?.uri,
    agentWallet: findAssetSignerPda(umi, { asset })[0].toString(),
    owner: assetData?.owner?.toString(),
    name: assetData?.name,
    uri: assetData?.uri,
    lifecycleChecks: agentIdentity?.lifecycleChecks,
  };
}

export function formatAgentError(err: unknown): string {
  if (isAgentValidationError(err)) {
    return `Validation error${err.field ? ` on ${err.field}` : ''}: ${err.message}`;
  }
  if (isAgentApiNetworkError(err)) {
    return `Metaplex API network error: ${err.message}`;
  }
  if (isAgentApiError(err)) {
    return `Metaplex API error ${err.statusCode}: ${err.message}\n${String(err.responseBody ?? '')}`;
  }
  return err instanceof Error ? err.message : String(err);
}

function explorerUrl(assetAddress: string, network: AgentNetwork): string {
  const cluster = network === 'solana-devnet' ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/address/${assetAddress}${cluster}`;
}

function formatSignature(signature: unknown): string {
  if (typeof signature === 'string') return signature;
  if (signature instanceof Uint8Array) return bs58.encode(signature);
  if (Array.isArray(signature)) return bs58.encode(Uint8Array.from(signature as number[]));
  return String(signature);
}

async function readSecretKey(path: string): Promise<Uint8Array> {
  const raw = (await readFile(expandHome(path), 'utf8')).trim();
  if (raw.startsWith('[')) return Uint8Array.from(JSON.parse(raw) as number[]);
  return bs58.decode(raw);
}

function expandHome(path: string): string {
  if (!path.startsWith('~/')) return path;
  return `${process.env['HOME'] ?? ''}${path.slice(1)}`;
}
