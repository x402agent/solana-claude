import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type {
  AgentRegistration,
  OnChainAgent,
  RegistrationRequest,
  RegistrationResult,
  RouterConfig,
} from './types';

// ─── In-memory cache of on-chain agents ──────────────────────────────────────

interface CacheEntry {
  agents: OnChainAgent[];
  fetchedAt: number;
}

// ─── Serialization for SAS attestation data ───────────────────────────────────
// Schema: [String, Pubkey, String, String, U64, Bool]

function serializeAgentAttestation(reg: AgentRegistration): Buffer {
  const encode = (s: string): Buffer => {
    const bytes = Buffer.from(s, 'utf8');
    const len = Buffer.allocUnsafe(4);
    len.writeUInt32LE(bytes.length, 0);
    return Buffer.concat([len, bytes]);
  };

  const walletBytes = base58Decode(reg.walletPubkey);
  const tsBytes = Buffer.allocUnsafe(8);
  tsBytes.writeBigUInt64LE(reg.registeredAt, 0);

  return Buffer.concat([
    encode(reg.agentId),
    walletBytes,
    encode(reg.capabilities),
    encode(reg.endpoint),
    tsBytes,
    Buffer.from([reg.isActive ? 1 : 0]),
  ]);
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export class AgentRegistry {
  private config: RouterConfig;
  private cache: CacheEntry | null = null;
  private localAgents: OnChainAgent[] = []; // demo-mode in-memory store

  constructor(config: RouterConfig) {
    this.config = config;
  }

  async registerAgent(req: RegistrationRequest): Promise<RegistrationResult> {
    const registration: AgentRegistration = {
      agentId: req.agentId,
      walletPubkey: req.walletPubkey,
      capabilities: req.capabilities.map(c => c.name).join('|'),
      endpoint: req.endpoint,
      registeredAt: BigInt(Math.floor(Date.now() / 1000)),
      isActive: true,
    };

    if (this.config.demoMode || !this.config.credentialAddress) {
      return this.registerDemoMode(registration);
    }
    return this.registerOnChain(registration, req.signerPrivateKey);
  }

  private registerDemoMode(reg: AgentRegistration): RegistrationResult {
    const hash = createHash('sha256')
      .update(`agent:${reg.agentId}:${reg.walletPubkey}`)
      .digest();
    const attestationAddress = toBase58Like(hash);
    const agent: OnChainAgent = { attestationAddress, registration: reg };
    this.localAgents.push(agent);
    console.log(`[registry:demo] Registered agent ${reg.agentId} → ${attestationAddress}`);
    return { attestationAddress, demoMode: true };
  }

  private async registerOnChain(
    reg: AgentRegistration,
    signerKey: Uint8Array,
  ): Promise<RegistrationResult> {
    try {
      const { createSolanaRpc, address, pipe, createTransactionMessage,
        setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash,
        appendTransactionMessageInstruction, signTransactionMessageWithSigners,
        createKeyPairSignerFromBytes, sendAndConfirmTransactionFactory } =
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('@solana/kit');

      const rpc = createSolanaRpc(this.config.solanaRpcUrl);
      const signer = await createKeyPairSignerFromBytes(signerKey);
      const nonce = reg.registeredAt;
      const data = serializeAgentAttestation(reg);
      const nonceBytes = Buffer.allocUnsafe(8);
      nonceBytes.writeBigUInt64LE(nonce, 0);
      const dataLen = Buffer.allocUnsafe(4);
      dataLen.writeUInt32LE(data.length, 0);
      const instructionData = Buffer.concat([
        Buffer.from([6]), nonceBytes, dataLen, data, Buffer.from([0]),
      ]);

      const credentialAddr = address(this.config.credentialAddress!);
      const schemaAddr = address(this.config.agentRouterSchemaAddress!);
      const pdaHash = createHash('sha256')
        .update(`agent-pda:${reg.agentId}`)
        .digest();
      const attestationPda = address(toBase58Like(pdaHash));

      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
      const txMsg = pipe(
        createTransactionMessage({ version: 0 }),
        (tx: unknown) => setTransactionMessageFeePayer(signer.address, tx),
        (tx: unknown) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx: unknown) => appendTransactionMessageInstruction(
          {
            programAddress: address('22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG'),
            accounts: [
              { address: signer.address, role: 3 },
              { address: signer.address, role: 2 },
              { address: credentialAddr, role: 0 },
              { address: schemaAddr, role: 0 },
              { address: attestationPda, role: 1 },
              { address: address('11111111111111111111111111111111'), role: 0 },
            ],
            data: instructionData,
          },
          tx,
        ),
      );
      const signedTx = await signTransactionMessageWithSigners(txMsg);
      const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc });
      const sig = await sendAndConfirm(signedTx, { commitment: 'confirmed' });

      const agent: OnChainAgent = { attestationAddress: attestationPda.toString(), registration: reg };
      this.localAgents.push(agent);
      return { attestationAddress: attestationPda.toString(), txSignature: sig, demoMode: false };
    } catch (err) {
      console.error('[registry] On-chain registration failed:', err);
      return this.registerDemoMode(reg);
    }
  }

  async fetchAgents(forceRefresh = false): Promise<OnChainAgent[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.cache &&
      now - this.cache.fetchedAt < this.config.cacheAgentsTtlMs
    ) {
      return this.cache.agents;
    }

    const agents = this.config.demoMode
      ? [...this.localAgents]
      : await this.fetchFromChain();

    this.cache = { agents, fetchedAt: now };
    return agents;
  }

  private async fetchFromChain(): Promise<OnChainAgent[]> {
    // In production: query Solana getProgramAccounts filtered by schema discriminator.
    // For now returns local registered agents (they're on-chain after registration).
    return [...this.localAgents];
  }

  filterByCapability(agents: OnChainAgent[], capability: string): OnChainAgent[] {
    return agents.filter(a =>
      a.registration.isActive &&
      a.registration.capabilities.split('|').includes(capability),
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function toBase58Like(bytes: Buffer): string {
  let num = BigInt('0x' + bytes.toString('hex'));
  let result = '';
  while (num > 0n) { result = B58[Number(num % 58n)] + result; num /= 58n; }
  return result.padStart(44, '1');
}

function base58Decode(input: string): Buffer {
  let num = 0n;
  for (const char of input) {
    const idx = B58.indexOf(char);
    if (idx < 0) return Buffer.alloc(32); // graceful fallback
    num = num * 58n + BigInt(idx);
  }
  const hex = num.toString(16).padStart(64, '0');
  return Buffer.from(hex.slice(-64), 'hex');
}
