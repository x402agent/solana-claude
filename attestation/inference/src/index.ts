import { v4 as uuidv4 } from 'uuid';
import { buildPrivateRecord } from './privacy';
import { recordInferenceOnChain } from './chain';
import { buildProviderRegistry } from './providers';
import type {
  InferenceRequest,
  InferenceConfig,
  PrivateInferenceRecord,
  AttestationResult,
  VerificationRequest,
  VerificationResult,
  InferenceAttestation,
} from './types';

export type { InferenceConfig } from './types';

// ─── Private Inference Service ────────────────────────────────────────────────
//
// Privacy guarantee:
//   1. Prompt is hashed with a random salt before any chain interaction
//   2. The hash (not the plaintext) is stored on Solana
//   3. The user receives the salt → they can always prove "I sent this prompt"
//   4. Third parties cannot reconstruct the prompt from the hash alone

export interface InferenceResult {
  response: string;
  record: PrivateInferenceRecord;
  attestation: AttestationResult;
  verifyUrl: string;
}

export class PrivateInferenceService {
  private config: InferenceConfig;
  private providers: ReturnType<typeof buildProviderRegistry>;

  constructor(config: Partial<InferenceConfig> & { claudeApiKey?: string }) {
    this.config = {
      solanaRpcUrl: process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
      network: 'devnet',
      sasProgram: '22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG',
      demoMode: true,
      defaultProvider: 'claude',
      defaultModel: 'claude-sonnet-4-6',
      ...config,
      claudeApiKey: config.claudeApiKey ?? process.env.ANTHROPIC_API_KEY,
    };

    if (!this.config.demoMode && process.env.SIGNER_PRIVATE_KEY) {
      this.config.signerPrivateKeyBytes = Buffer.from(
        process.env.SIGNER_PRIVATE_KEY, 'hex',
      );
    }

    this.providers = buildProviderRegistry({
      claudeApiKey: this.config.claudeApiKey,
      openaiApiKey: process.env.OPENAI_API_KEY,
      defaultModel: this.config.defaultModel,
    });
  }

  async infer(prompt: string, options: Partial<InferenceRequest> = {}): Promise<InferenceResult> {
    const inferenceId = uuidv4();
    const req: InferenceRequest = { prompt, ...options };

    // 1. Call the model
    const modelResponse = await this.providers.complete(req, req.provider);

    // 2. Build the private record (creates prompt hash + salt)
    const { record } = buildPrivateRecord(
      inferenceId,
      req,
      modelResponse.text,
      modelResponse.model,
      modelResponse.provider,
      modelResponse.durationMs,
    );

    // 3. Determine the model provider pubkey
    const modelPubkey = this.config.modelProviderPubkey
      ?? '11111111111111111111111111111111'; // system program as placeholder in demo

    const modelPubkeyBytes = base58Decode(modelPubkey);

    // 4. Build on-chain attestation data
    const attestationData: InferenceAttestation = {
      inferenceId,
      modelPubkey,
      promptHash: Buffer.from(record.promptHash, 'hex'),
      responseHash: Buffer.from(record.responseHash, 'hex'),
      timestamp: BigInt(record.timestamp),
      isVerified: false, // set to true after external verification
    };

    // 5. Record on Solana (demo or real)
    const attestation = await recordInferenceOnChain(attestationData, this.config);

    // 6. Log the proof for the user
    const mode = attestation.demoMode ? 'demo' : `tx:${attestation.txSignature?.slice(0, 8)}`;
    console.log(
      `[inference] ${inferenceId.slice(0, 8)} | prompt_hash=${record.promptHash.slice(0, 16)}... | ` +
      `pda=${attestation.attestationAddress.slice(0, 8)}... | mode=${mode}`,
    );

    return {
      response: modelResponse.text,
      record,
      attestation,
      verifyUrl: buildVerifyUrl(attestation.attestationAddress, this.config.network),
    };
  }

  async verify(req: VerificationRequest): Promise<VerificationResult> {
    const { verifyPromptHash } = await import('./privacy');

    // Compute what the prompt hash should be
    const promptMatches = verifyPromptHash(
      req.promptCandidate,
      req.salt,
      req.attestationAddress, // attestation address used as expected hash in demo
    );

    return {
      verified: promptMatches,
      promptMatches,
      attestationFound: true, // in real mode: query Solana
      computedPromptHash: require('crypto')
        .createHash('sha256')
        .update(Buffer.from(req.promptCandidate, 'utf8'))
        .update(Buffer.from(req.salt, 'hex'))
        .digest('hex'),
    };
  }
}

// ─── CLI entry point ─────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const prompt = args.join(' ') || 'Hello! Please introduce yourself briefly.';

  console.log('Private Inference Service — demo mode\n');
  console.log(`Prompt: ${prompt}\n`);

  const svc = new PrivateInferenceService({ demoMode: true });
  svc.infer(prompt)
    .then(result => {
      console.log('Response:', result.response);
      console.log('\nPrivacy Proof:');
      console.log('  Inference ID:', result.record.inferenceId);
      console.log('  Prompt Hash: ', result.record.promptHash.slice(0, 32) + '...');
      console.log('  Prompt Salt: ', result.record.promptSalt.slice(0, 16) + '...');
      console.log('  Resp. Hash:  ', result.record.responseHash.slice(0, 32) + '...');
      console.log('  Attestation: ', result.attestation.attestationAddress);
      console.log('  Demo Mode:   ', result.attestation.demoMode);
    })
    .catch(console.error);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildVerifyUrl(attestationAddress: string, network: string): string {
  if (network === 'mainnet-beta') {
    return `https://solscan.io/account/${attestationAddress}`;
  }
  return `https://solscan.io/account/${attestationAddress}?cluster=${network}`;
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(input: string): Buffer {
  let num = 0n;
  for (const char of input) {
    const idx = B58.indexOf(char);
    if (idx < 0) return Buffer.alloc(32);
    num = num * 58n + BigInt(idx);
  }
  const hex = num.toString(16).padStart(64, '0');
  return Buffer.from(hex.slice(-64), 'hex');
}
