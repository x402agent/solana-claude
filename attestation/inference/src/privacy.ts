import { createHash, randomBytes } from 'crypto';
import type { PrivateInferenceRecord, InferenceRequest } from './types';

// ─── Commitment Scheme ────────────────────────────────────────────────────────
//
// Privacy model:
//   prompt_hash = SHA-256(prompt_bytes || salt_bytes)
//   response_hash = SHA-256(response_bytes)
//
// The prompt itself is never stored on-chain.
// Anyone can VERIFY a known prompt: hash(candidate || salt) == on-chain_hash.
// Without the salt, brute-forcing the prompt hash is infeasible for long prompts.
// For short prompts the salt provides rainbow-table resistance.

export function hashPrompt(prompt: string, salt: Buffer): Buffer {
  return createHash('sha256')
    .update(Buffer.from(prompt, 'utf8'))
    .update(salt)
    .digest();
}

export function hashResponse(response: string): Buffer {
  return createHash('sha256')
    .update(Buffer.from(response, 'utf8'))
    .digest();
}

export function generateSalt(): Buffer {
  return randomBytes(32);
}

export function verifyPromptHash(
  promptCandidate: string,
  saltHex: string,
  expectedHashHex: string,
): boolean {
  const salt = Buffer.from(saltHex, 'hex');
  const computed = hashPrompt(promptCandidate, salt);
  return computed.toString('hex') === expectedHashHex;
}

// ─── Record Builder ──────────────────────────────────────────────────────────

export function buildPrivateRecord(
  inferenceId: string,
  req: InferenceRequest,
  response: string,
  model: string,
  provider: string,
  durationMs: number,
): { record: PrivateInferenceRecord; salt: Buffer } {
  const salt = generateSalt();
  const promptHash = hashPrompt(req.prompt, salt);
  const responseHash = hashResponse(response);
  const record: PrivateInferenceRecord = {
    inferenceId,
    promptHash: promptHash.toString('hex'),
    promptSalt: salt.toString('hex'),
    responseHash: responseHash.toString('hex'),
    timestamp: Math.floor(Date.now() / 1000),
    model,
    provider: provider as PrivateInferenceRecord['provider'],
    durationMs,
  };
  return { record, salt };
}

// ─── Serialization for Solana attestation data ───────────────────────────────
//
// Schema: [String, Pubkey, ProofHash, ProofHash, U64, Bool]
// Encoding: SAS little-endian format

export function serializeInferenceAttestation(
  inferenceId: string,
  modelPubkeyBytes: Uint8Array,
  promptHashBytes: Uint8Array,
  responseHashBytes: Uint8Array,
  timestampSecs: bigint,
  isVerified: boolean,
): Buffer {
  const idBytes = Buffer.from(inferenceId, 'utf8');
  const idLen = Buffer.allocUnsafe(4);
  idLen.writeUInt32LE(idBytes.length, 0);

  const tsBytes = Buffer.allocUnsafe(8);
  tsBytes.writeBigUInt64LE(timestampSecs, 0);

  return Buffer.concat([
    idLen,
    idBytes,
    Buffer.from(modelPubkeyBytes),
    Buffer.from(promptHashBytes),
    Buffer.from(responseHashBytes),
    tsBytes,
    Buffer.from([isVerified ? 1 : 0]),
  ]);
}
