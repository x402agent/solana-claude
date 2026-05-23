import { createHash } from 'crypto';
import type { InferenceAttestation, AttestationResult, InferenceConfig } from './types';
import { serializeInferenceAttestation } from './privacy';

// ─── SAS Program Constants ────────────────────────────────────────────────────

const SAS_PROGRAM_ID = '22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG';
const ATTESTATION_SEED = Buffer.from('attestation');
const CREATE_ATTESTATION_DISCRIMINATOR = 6; // SAS instruction index

// ─── PDA Derivation (simplified deterministic, matches SAS program logic) ────

export function deriveAttestationPda(
  credentialAddress: string,
  schemaAddress: string,
  nonce: bigint,
): string {
  const nonceBytes = Buffer.allocUnsafe(8);
  nonceBytes.writeBigUInt64LE(nonce, 0);
  const hash = createHash('sha256')
    .update(ATTESTATION_SEED)
    .update(Buffer.from(credentialAddress, 'utf8'))
    .update(Buffer.from(schemaAddress, 'utf8'))
    .update(nonceBytes)
    .digest();
  // Return a base58-like deterministic address (for demo mode — real mode uses actual PDA)
  return toBase58Like(hash);
}

// ─── On-chain Recording ───────────────────────────────────────────────────────

export async function recordInferenceOnChain(
  attestation: InferenceAttestation,
  config: InferenceConfig,
): Promise<AttestationResult> {
  if (config.demoMode || !config.solanaRpcUrl || !config.credentialAddress) {
    return recordDemoMode(attestation, config);
  }
  return recordRealChain(attestation, config);
}

async function recordDemoMode(
  attestation: InferenceAttestation,
  _config: InferenceConfig,
): Promise<AttestationResult> {
  const promptHashHex = Buffer.from(attestation.promptHash).toString('hex');
  const pdaInput = `demo:${attestation.inferenceId}:${promptHashHex}`;
  const pdaHash = createHash('sha256').update(pdaInput).digest();
  const attestationAddress = toBase58Like(pdaHash);
  await simulateDelay(50);
  return { attestationAddress, demoMode: true };
}

async function recordRealChain(
  attestation: InferenceAttestation,
  config: InferenceConfig,
): Promise<AttestationResult> {
  try {
    const { createSolanaRpc, address, pipe, createTransactionMessage,
      setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash,
      appendTransactionMessageInstruction, signTransactionMessageWithSigners,
      createKeyPairSignerFromBytes, sendAndConfirmTransactionFactory,
      getBase64EncodedWireTransaction } =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@solana/kit');

    const rpc = createSolanaRpc(config.solanaRpcUrl);
    const signer = await createKeyPairSignerFromBytes(config.signerPrivateKeyBytes!);

    const nonce = BigInt(Math.floor(Date.now() / 1000));
    const modelPubkeyBytes = base58Decode(attestation.modelPubkey);
    const data = serializeInferenceAttestation(
      attestation.inferenceId,
      modelPubkeyBytes,
      attestation.promptHash,
      attestation.responseHash,
      attestation.timestamp,
      attestation.isVerified,
    );

    const nonceBytes = Buffer.allocUnsafe(8);
    nonceBytes.writeBigUInt64LE(nonce, 0);
    const instructionData = Buffer.concat([
      Buffer.from([CREATE_ATTESTATION_DISCRIMINATOR]),
      nonceBytes,
      Buffer.from([data.length & 0xff, (data.length >> 8) & 0xff,
                   (data.length >> 16) & 0xff, (data.length >> 24) & 0xff]),
      data,
      Buffer.from([0]), // no expire time
    ]);

    const credentialAddr = address(config.credentialAddress!);
    const schemaAddr = address(config.inferenceSchemaAddress!);
    const attestationPda = address(deriveAttestationPda(
      config.credentialAddress!,
      config.inferenceSchemaAddress!,
      nonce,
    ));

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const txMsg = pipe(
      createTransactionMessage({ version: 0 }),
      (tx: unknown) => setTransactionMessageFeePayer(signer.address, tx),
      (tx: unknown) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx: unknown) => appendTransactionMessageInstruction(
        {
          programAddress: address(SAS_PROGRAM_ID),
          accounts: [
            { address: signer.address, role: 3 }, // WRITABLE_SIGNER
            { address: signer.address, role: 2 }, // READONLY_SIGNER
            { address: credentialAddr, role: 0 },
            { address: schemaAddr, role: 0 },
            { address: attestationPda, role: 1 }, // WRITABLE
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

    return {
      attestationAddress: attestationPda.toString(),
      txSignature: sig,
      demoMode: false,
    };
  } catch (err) {
    console.error('[chain] Failed to record on-chain, falling back to demo mode:', err);
    return recordDemoMode(attestation, config);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function toBase58Like(bytes: Buffer): string {
  let num = BigInt('0x' + bytes.toString('hex'));
  let result = '';
  const base = BigInt(58);
  while (num > 0n) {
    result = BASE58_ALPHABET[Number(num % base)] + result;
    num /= base;
  }
  return result.padStart(44, '1');
}

function base58Decode(input: string): Uint8Array {
  let num = 0n;
  for (const char of input) {
    const idx = BASE58_ALPHABET.indexOf(char);
    if (idx < 0) throw new Error(`Invalid base58 char: ${char}`);
    num = num * 58n + BigInt(idx);
  }
  const hex = num.toString(16).padStart(64, '0');
  return Buffer.from(hex, 'hex');
}
