import { Connection, type ConnectionConfig } from '@solana/web3.js';

export interface SolanaConnectionEnv {
  rpcUrl: string;
  wsEndpoint?: string;
}

export function resolveSolanaConnectionEnv(env: NodeJS.ProcessEnv = process.env): SolanaConnectionEnv | null {
  const rpcUrl = env.RPC
    ?? env.SOLANA_TRACKER_RPC
    ?? env.HELIUS_RPC_URL;

  if (!rpcUrl) return null;

  const wsEndpoint = env.RPC_WS
    ?? env.WSS_RPC
    ?? env.SOLANA_TRACKER_WSS
    ?? undefined;

  return { rpcUrl, wsEndpoint };
}

export function createSolanaConnection(config: SolanaConnectionEnv, commitment: ConnectionConfig['commitment'] = 'confirmed'): Connection {
  const options: ConnectionConfig = { commitment };
  if (config.wsEndpoint) options.wsEndpoint = config.wsEndpoint;
  return new Connection(config.rpcUrl, options);
}
