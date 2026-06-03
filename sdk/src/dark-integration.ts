/**
 * sdk/src/dark-integration.ts
 *
 * Connects @openclawdsolana/dark-sdk and @openclawdsolana/dark-tee-agents
 * into the CLAWD runtime. Provides:
 *
 *   - DarkClawdClient — shielded wallets, private swaps, oracle pricing
 *   - DarkTeeAgent   — TEE-attested confidential inference with x402 payments + SAS
 *   - darkMcpTools   — read-only MCP tool stubs for the dark-sdk surface
 *
 * Sub-path imports avoid the broken DarkSwap React component
 * (jupiverse-kit does not export `Swap` — only the full index triggers it).
 *
 * Usage:
 *   import { DarkClawdClient, DarkTeeAgent } from './dark-integration.js';
 *
 *   const dark = await DarkClawdClient.create({ heliusApiKey: '...' });
 *   const bundle = DarkTeeAgent.spawn({ agentId: 'hermes-01', owner: walletAddress });
 */

import { DarkProtocolClient } from '@openclawdsolana/dark-sdk/dist/client.js';
import { DarkWallet } from '@openclawdsolana/dark-sdk/dist/wallet.js';
import { PrivacyUtils } from '@openclawdsolana/dark-sdk/dist/privacy.js';
import { PrivateSwapManager } from '@openclawdsolana/dark-sdk/dist/swap.js';
import { PriceOracle, type OracleConfig } from '@openclawdsolana/dark-sdk/dist/oracle.js';
// ShieldedWallet omitted: shielded-wallet.js has broken internal ESM (./sapling missing .js)

import type {
  DarkProtocolConfig,
  Network as DarkNetwork,
} from '@openclawdsolana/dark-sdk/dist/client.js';
import type { SaplingHDWallet } from '@openclawdsolana/dark-sdk/dist/sapling.js';

import {
  ConfidentialAgent,
  ConfidentialInferenceClient,
  DarkAttestationService,
  DARK_SCHEMAS,
  PAYMENT_ASSETS,
  generateSigningKeypair,
  toBase58,
} from '@openclawdsolana/dark-tee-agents';

import type { ConfidentialAgentConfig } from '@openclawdsolana/dark-tee-agents';
import type { TransactionSigner } from '@solana/kit';

// ─── DarkClawdClient ──────────────────────────────────────────────────────────

export interface DarkClawdConfig {
  heliusApiKey: string;
  network?: DarkNetwork;
  jupiterApiKey?: string;
  redpillApiKey?: string;
  rpcUrl?: string;
}

export class DarkClawdClient {
  readonly protocol: DarkProtocolClient;
  private _swap?: PrivateSwapManager;
  private _oracle?: PriceOracle;

  private constructor(
    protocol: DarkProtocolClient,
    private readonly cfg: DarkClawdConfig,
  ) {
    this.protocol = protocol;
  }

  static async create(cfg: DarkClawdConfig): Promise<DarkClawdClient> {
    const sdkCfg: DarkProtocolConfig = {
      heliusApiKey: cfg.heliusApiKey,
      network: cfg.network ?? 'mainnet',
      useSecureRpc: true,
      jupiterApiKey: cfg.jupiterApiKey,
      redpillApiKey: cfg.redpillApiKey,
      rpcUrl: cfg.rpcUrl,
    };
    const protocol = await DarkProtocolClient.create(sdkCfg);
    return new DarkClawdClient(protocol, cfg);
  }

  async generateWallet(): Promise<{ wallet: DarkWallet; mnemonic: string }> {
    return DarkWallet.generate(this.protocol);
  }

  async restoreWallet(mnemonic: string, accountIndex = 0): Promise<DarkWallet> {
    return DarkWallet.fromMnemonic(this.protocol, mnemonic, accountIndex);
  }

  async generateSaplingWallet(): Promise<{ wallet: SaplingHDWallet; mnemonic: string }> {
    const { SaplingUtils } = await import('@openclawdsolana/dark-sdk/dist/sapling.js');
    return SaplingUtils.generateWallet();
  }

  get swap(): PrivateSwapManager {
    if (!this._swap) {
      this._swap = new PrivateSwapManager(this.protocol, { jupiterApiKey: this.cfg.jupiterApiKey });
    }
    return this._swap;
  }

  get oracle(): PriceOracle {
    if (!this._oracle) {
      const oracleCfg: OracleConfig = {
        heliusApiKey: this.cfg.heliusApiKey,
        jupiterApiKey: this.cfg.jupiterApiKey,
      };
      this._oracle = new PriceOracle(oracleCfg);
    }
    return this._oracle;
  }

  generatePrivacyPrimitives() {
    return {
      commitment: PrivacyUtils.generateCommitment(),
      nullifier: PrivacyUtils.generateNullifier(),
      viewingKey: PrivacyUtils.generateViewingKey(),
    };
  }

  async shieldSol(wallet: DarkWallet, lamports: bigint): Promise<string> {
    const { PublicKey } = await import('@solana/web3.js');
    return wallet.shieldTokens(lamports, PublicKey.default);
  }
}

// ─── DarkTeeAgent ─────────────────────────────────────────────────────────────

export interface DarkTeeAgentSpawnParams {
  agentId: string;
  owner: string;
  model?: string;
  policy?: string;
  network?: 'solana-mainnet' | 'solana-devnet';
  inferencePrice?: bigint;
}

export interface TeeAgentBundle {
  agent: ConfidentialAgent;
  keypair: ReturnType<typeof generateSigningKeypair>;
  address: string;
}

function spawnTeeAgent(params: DarkTeeAgentSpawnParams): TeeAgentBundle {
  const keypair = generateSigningKeypair();
  const address = toBase58(keypair.publicKey);
  const agentCfg: ConfidentialAgentConfig = {
    agentId: params.agentId,
    owner: params.owner,
    model: params.model ?? 'phala/deepseek-r1-70b-tee',
    policy: params.policy,
    network: params.network ?? 'solana-devnet',
  };
  const agent = ConfidentialAgent.spawn(agentCfg);
  return { agent, keypair, address };
}

function teePaymentRequirements(
  agent: ConfidentialAgent,
  payTo: string,
  atomicPrice = 10_000n,
) {
  return agent.paymentRequirements({
    payTo,
    asset: PAYMENT_ASSETS.USDC,
    atomicPrice,
    resource: `clawd-tee-inference/${agent.config.agentId}`,
  });
}

async function localInfer(
  bundle: TeeAgentBundle,
  prompt: string,
  atomicPrice = 10_000n,
): Promise<{ text: string; receiptNonce: string }> {
  const { agent, address } = bundle;
  const requirements = teePaymentRequirements(agent, address, atomicPrice);
  const { LocalSignerPayer } = await import('@openclawdsolana/dark-tee-agents');
  const localPayer = new LocalSignerPayer(bundle.keypair, true);
  const provider = agent.localProvider(
    (req: { prompt: string }) => `[clawd-tee] ${req.prompt}`,
    requirements,
  );
  const client = new ConfidentialInferenceClient({
    enclave: agent.quote,
    payer: localPayer,
    verify: { allowedProviders: ['local-dev'] },
  });
  const { result } = await client.infer(
    { prompt },
    provider,
    requirements.accepts[0]!,
  );
  return {
    text: result.text,
    receiptNonce: agent.attestationNonce.toString(),
  };
}

async function anchorOnChain(params: {
  agent: ConfidentialAgent;
  heliusApiKey: string;
  network?: 'mainnet' | 'devnet';
  payer: TransactionSigner;
  authority: TransactionSigner;
}) {
  const { agent, heliusApiKey, network = 'devnet', payer, authority } = params;
  const sas = DarkAttestationService.fromNetwork(network, heliusApiKey);
  const { credential } = await sas.createCredential({
    payer, authority, authorizedSigners: [authority.address],
  });
  const { schema } = await sas.createSchema({
    payer, authority, credential, def: DARK_SCHEMAS.agentIdentity,
  });
  await sas.attest({
    payer, authority, credential, schema,
    nonce: agent.attestationNonce,
    data: agent.identityData() as unknown as Record<string, unknown>,
    expiryUnixSeconds: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
  });
  return { credential, schema };
}

export const DarkTeeAgent = {
  spawn: spawnTeeAgent,
  paymentRequirements: teePaymentRequirements,
  localInfer,
  anchorOnChain,
};

// ─── MCP tool stubs ───────────────────────────────────────────────────────────

export type DarkMcpToolResult = { ok: boolean; data?: unknown; error?: string };

export const darkMcpTools = {
  async getTokenPrice(mint: string, heliusApiKey: string): Promise<DarkMcpToolResult> {
    try {
      const oracle = new PriceOracle({ heliusApiKey });
      const price = await oracle.getPrice(mint);
      return { ok: true, data: price };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  },

  async generateSaplingAddresses(count = 5): Promise<DarkMcpToolResult> {
    try {
      const { SaplingUtils } = await import('@openclawdsolana/dark-sdk/dist/sapling.js');
      const { wallet } = await SaplingUtils.generateWallet();
      return {
        ok: true,
        data: {
          defaultAddress: wallet.getDefaultAddress().toBase58(),
          diversified: wallet.generateDiversifiedAddresses(count).map((a) => a.toBase58()),
        },
      };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  },

  async spawnTeeAgent(agentId: string, owner: string): Promise<DarkMcpToolResult> {
    try {
      const bundle = DarkTeeAgent.spawn({ agentId, owner });
      return {
        ok: true,
        data: {
          agentId,
          address: bundle.address,
          quote: bundle.agent.quote,
          identityData: bundle.agent.identityData(),
          attestationNonce: bundle.agent.attestationNonce.toString(),
        },
      };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  },

  async sealedInfer(agentId: string, owner: string, prompt: string): Promise<DarkMcpToolResult> {
    try {
      const bundle = DarkTeeAgent.spawn({ agentId, owner });
      const result = await DarkTeeAgent.localInfer(bundle, prompt);
      return { ok: true, data: result };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  },
};

export { PrivacyUtils, PAYMENT_ASSETS, DARK_SCHEMAS, generateSigningKeypair, toBase58 };
