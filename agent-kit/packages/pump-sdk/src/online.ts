import { ByteReader } from "./encoding.js";
import {
  getBuySolAmountFromTokenAmount,
  getBuyTokenAmountFromSolAmount,
  getSellSolAmountFromTokenAmount,
} from "./math.js";
import type { Address, Amount, BondingCurve, Quote } from "./types.js";

// Minimal account fetcher so the SDK stays dependency-free. Back it with
// @solana/web3.js: `getAccountData: async (a) => (await connection.getAccountInfo(new PublicKey(a)))?.data ?? null`.
export interface AccountFetcher {
  getAccountData(address: Address): Promise<Uint8Array | null>;
}

/** Decode a raw bonding-curve account (8-byte anchor discriminator + fields). */
export function decodeBondingCurve(data: Uint8Array): BondingCurve {
  const r = new ByteReader(data, 8);
  const virtualTokenReserves = r.u64();
  const virtualSolReserves = r.u64();
  const realTokenReserves = r.u64();
  const realSolReserves = r.u64();
  const tokenTotalSupply = r.u64();
  const complete = r.bool();
  const creator = data.length >= 8 + 41 + 32 ? r.pubkey() : null;
  return {
    virtualTokenReserves,
    virtualSolReserves,
    realTokenReserves,
    realSolReserves,
    tokenTotalSupply,
    complete,
    creator,
  };
}

/**
 * Online wrapper: fetches and decodes bonding-curve state, then quotes trades
 * using the offline math. Pair with PumpSdk for instruction building.
 */
export class OnlinePumpSdk {
  constructor(private readonly fetcher: AccountFetcher) {}

  async fetchBondingCurve(bondingCurveAddress: Address): Promise<BondingCurve> {
    const data = await this.fetcher.getAccountData(bondingCurveAddress);
    if (!data) {
      throw new Error(`No bonding curve account at ${bondingCurveAddress}`);
    }
    return decodeBondingCurve(data);
  }

  async quoteBuyFromSol(
    bondingCurveAddress: Address,
    solAmount: Amount,
  ): Promise<Quote> {
    return getBuyTokenAmountFromSolAmount(
      await this.fetchBondingCurve(bondingCurveAddress),
      solAmount,
    );
  }

  async quoteBuyForTokens(
    bondingCurveAddress: Address,
    tokenAmount: Amount,
  ): Promise<Quote> {
    return getBuySolAmountFromTokenAmount(
      await this.fetchBondingCurve(bondingCurveAddress),
      tokenAmount,
    );
  }

  async quoteSell(
    bondingCurveAddress: Address,
    tokenAmount: Amount,
  ): Promise<Quote> {
    return getSellSolAmountFromTokenAmount(
      await this.fetchBondingCurve(bondingCurveAddress),
      tokenAmount,
    );
  }
}
