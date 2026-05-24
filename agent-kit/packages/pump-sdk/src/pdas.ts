import { PUMP_PROGRAM_ID, PUMP_FEES_PROGRAM_ID } from "./constants.js";
import { pubkeyToBytes } from "./encoding.js";
import type { Address } from "./types.js";

export type Seed = Uint8Array;

export interface ProgramSeeds {
  programId: Address;
  seeds: Seed[];
}

const utf8 = (s: string): Seed => new TextEncoder().encode(s);

// Each helper returns the seeds + program id. Derive the actual PDA at the
// call site with web3.js: `PublicKey.findProgramAddressSync(seeds.map(Buffer.from), new PublicKey(programId))`.

export function globalPda(): ProgramSeeds {
  return { programId: PUMP_PROGRAM_ID, seeds: [utf8("global")] };
}

export function bondingCurvePda(mint: Address): ProgramSeeds {
  return {
    programId: PUMP_PROGRAM_ID,
    seeds: [utf8("bonding-curve"), pubkeyToBytes(mint)],
  };
}

export function creatorVaultPda(creator: Address): ProgramSeeds {
  return {
    programId: PUMP_PROGRAM_ID,
    seeds: [utf8("creator-vault"), pubkeyToBytes(creator)],
  };
}

export function metadataPdaSeeds(mint: Address): ProgramSeeds {
  // mpl-token-metadata derives ["metadata", METADATA_PROGRAM, mint].
  return {
    programId: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    seeds: [
      utf8("metadata"),
      pubkeyToBytes("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
      pubkeyToBytes(mint),
    ],
  };
}

export function feeSharingConfigPda(mint: Address): ProgramSeeds {
  return {
    programId: PUMP_FEES_PROGRAM_ID,
    seeds: [utf8("fee-sharing-config"), pubkeyToBytes(mint)],
  };
}

export function userVolumeAccumulatorPda(user: Address): ProgramSeeds {
  return {
    programId: PUMP_PROGRAM_ID,
    seeds: [utf8("user-volume-accumulator"), pubkeyToBytes(user)],
  };
}
