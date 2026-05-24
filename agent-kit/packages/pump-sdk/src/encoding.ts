// Dependency-free base58 + borsh-lite primitives for building instruction data.

const B58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP: Record<string, number> = {};
for (let i = 0; i < B58_ALPHABET.length; i++) {
  B58_MAP[B58_ALPHABET[i]!] = i;
}

export function base58Decode(input: string): Uint8Array {
  if (input.length === 0) return new Uint8Array(0);
  const bytes: number[] = [0];
  for (const ch of input) {
    const value = B58_MAP[ch];
    if (value === undefined) {
      throw new Error(`Invalid base58 character: ${ch}`);
    }
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j]! * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading zeros.
  for (let k = 0; k < input.length && input[k] === "1"; k++) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j]! << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "";
  for (let k = 0; k < bytes.length && bytes[k] === 0; k++) out += "1";
  for (let q = digits.length - 1; q >= 0; q--) out += B58_ALPHABET[digits[q]!];
  return out;
}

/** Decode a base58 pubkey to its 32-byte form, validating length. */
export function pubkeyToBytes(address: string): Uint8Array {
  const bytes = base58Decode(address);
  if (bytes.length !== 32) {
    throw new Error(`Address is not 32 bytes: ${address}`);
  }
  return bytes;
}

// --- borsh-lite writer ---

export class ByteWriter {
  private chunks: number[] = [];

  u8(value: number): this {
    this.chunks.push(value & 0xff);
    return this;
  }

  bool(value: boolean): this {
    return this.u8(value ? 1 : 0);
  }

  u64(value: bigint): this {
    let v = value;
    for (let i = 0; i < 8; i++) {
      this.chunks.push(Number(v & 0xffn));
      v >>= 8n;
    }
    return this;
  }

  bytes(value: Uint8Array): this {
    for (const b of value) this.chunks.push(b);
    return this;
  }

  /** Borsh string: u32 LE length prefix + utf-8 bytes. */
  string(value: string): this {
    const utf8 = new TextEncoder().encode(value);
    const len = utf8.length;
    this.chunks.push(len & 0xff, (len >> 8) & 0xff, (len >> 16) & 0xff, (len >> 24) & 0xff);
    return this.bytes(utf8);
  }

  pubkey(address: string): this {
    return this.bytes(pubkeyToBytes(address));
  }

  toBytes(): Uint8Array {
    return Uint8Array.from(this.chunks);
  }
}

// --- borsh-lite reader ---

export class ByteReader {
  private offset: number;

  constructor(
    private readonly buf: Uint8Array,
    offset = 0,
  ) {
    this.offset = offset;
  }

  skip(n: number): this {
    this.offset += n;
    return this;
  }

  u8(): number {
    return this.buf[this.offset++]!;
  }

  bool(): boolean {
    return this.u8() === 1;
  }

  u64(): bigint {
    let value = 0n;
    for (let i = 0; i < 8; i++) {
      value |= BigInt(this.buf[this.offset + i]!) << BigInt(8 * i);
    }
    this.offset += 8;
    return value;
  }

  pubkey(): string {
    const slice = this.buf.subarray(this.offset, this.offset + 32);
    this.offset += 32;
    return base58Encode(slice);
  }
}
