import { Connection, PublicKey } from '@solana/web3.js';

export const DARKDEFI_DEVNET_RPC_URL = 'https://api.devnet.solana.com';
export const DARKDEFI_SOLSCAN_CLUSTER = 'devnet';

export const DARKDEFI_PROGRAM_IDS = {
  solanaAiInference: '3xFBRCtk5hxeLWzHvwyDg2B67RHoA9JFTKmHPzzccBVc',
  clawdStake: '5bp3bDnWYdjiYyB99XWWi6h8ga2wnB1TxuRUb4VNJrTn',
  mplCoreNftStaking: '7AFH2R2vAowRbYxLJnS5eRazZxQyHcMD9VTJKEFsjpdZ',
  agentMinterReference: 'agnmDKzZkv63sRhPFvm3iWpxaopgTRcohXA6CSYSXvQ',
  solanaGptOracleReference: 'LLMrieZMpbJFwN52WgmBNMxYojrpRVYXdC1RCweEbab',
  metaplexTokenMetadata: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
} as const;

export type DarkDefiProgramName = keyof typeof DARKDEFI_PROGRAM_IDS;

export interface DarkDefiProgramAccountStatus {
  name: DarkDefiProgramName;
  programId: string;
  executable: boolean;
  owner: string | null;
  lamports: number;
  deployed: boolean;
  solscanUrl: string;
}

export function createDarkDefiProgramConnection(rpcUrl = DARKDEFI_DEVNET_RPC_URL): Connection {
  return new Connection(rpcUrl, 'confirmed');
}

export function getDarkDefiProgramId(name: DarkDefiProgramName): PublicKey {
  return new PublicKey(DARKDEFI_PROGRAM_IDS[name]);
}

export function getDarkDefiSolscanUrl(address: string): string {
  return `https://solscan.io/account/${address}?cluster=${DARKDEFI_SOLSCAN_CLUSTER}`;
}

export async function getDarkDefiProgramStatus(
  connection: Connection,
  name: DarkDefiProgramName,
): Promise<DarkDefiProgramAccountStatus> {
  const programId = DARKDEFI_PROGRAM_IDS[name];
  const account = await connection.getAccountInfo(new PublicKey(programId));

  return {
    name,
    programId,
    executable: account?.executable ?? false,
    owner: account?.owner.toBase58() ?? null,
    lamports: account?.lamports ?? 0,
    deployed: Boolean(account?.executable),
    solscanUrl: getDarkDefiSolscanUrl(programId),
  };
}

export async function getDarkDefiProgramStatuses(
  rpcUrl = DARKDEFI_DEVNET_RPC_URL,
): Promise<DarkDefiProgramAccountStatus[]> {
  const connection = createDarkDefiProgramConnection(rpcUrl);
  const names = Object.keys(DARKDEFI_PROGRAM_IDS) as DarkDefiProgramName[];
  return Promise.all(names.map((name) => getDarkDefiProgramStatus(connection, name)));
}

export function deriveSolanaAiConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    getDarkDefiProgramId('solanaAiInference'),
  );
}

export function deriveClawdStakePoolPda(clawdMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('clawd-stake-pool'), clawdMint.toBuffer()],
    getDarkDefiProgramId('clawdStake'),
  );
}

export function deriveClawdStakePositionPda(pool: PublicKey, agentAsset: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('clawd-stake-position'), pool.toBuffer(), agentAsset.toBuffer()],
    getDarkDefiProgramId('clawdStake'),
  );
}
