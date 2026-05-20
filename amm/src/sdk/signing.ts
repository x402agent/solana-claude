export interface SignerLike {
  publicKey?: unknown;
  signTransaction?: (transaction: unknown) => Promise<unknown>;
  signAllTransactions?: (transactions: unknown[]) => Promise<unknown[]>;
}

export function publicKeyString(signer: SignerLike | string): string {
  if (typeof signer === "string") return signer;
  const value = signer.publicKey;
  if (value && typeof value === "object" && "toBase58" in value && typeof value.toBase58 === "function") {
    return value.toBase58();
  }
  return String(value ?? "");
}

export async function signBase64Transaction(transaction: string, signer: SignerLike): Promise<unknown> {
  if (!signer.signTransaction) {
    throw new Error("Signer does not implement signTransaction");
  }
  return signer.signTransaction(transaction);
}
