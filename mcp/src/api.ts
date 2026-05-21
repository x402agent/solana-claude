/**
 * Shared API helpers for all MCP tool modules.
 * Read from env at call time so the module can be imported before env is set.
 */

export const HELIUS_KEY = () => process.env.HELIUS_API_KEY ?? "";
export const HELIUS_RPC = () =>
  process.env.HELIUS_RPC_URL ??
  (HELIUS_KEY()
    ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY()}`
    : "https://api.mainnet-beta.solana.com");

const HELIUS_API_BASE = "https://api-mainnet.helius-rpc.com";

export async function solanaTracker(path: string): Promise<unknown> {
  const res = await fetch(`https://data.solanatracker.io${path}`, {
    headers: {
      Accept: "application/json",
      "x-api-key": process.env.SOLANA_TRACKER_API_KEY ?? "",
    },
  });
  if (!res.ok) throw new Error(`SolanaTracker ${path} → ${res.status}`);
  return res.json();
}

export async function coingeckoPrice(ids: string): Promise<unknown> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`CoinGecko → ${res.status}`);
  return res.json();
}

export async function jupiterPrice(mint: string): Promise<unknown> {
  const res = await fetch(`https://api.jup.ag/price/v2?ids=${mint}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Jupiter price → ${res.status}`);
  return res.json();
}

export async function heliusRPC(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(HELIUS_RPC(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export async function heliusREST(
  endpoint: string,
  opts?: { method?: string; body?: unknown },
): Promise<unknown> {
  const key = HELIUS_KEY();
  if (!key) throw new Error("HELIUS_API_KEY not set — get a free key at https://helius.dev");
  const url = `${HELIUS_API_BASE}${endpoint}${endpoint.includes("?") ? "&" : "?"}api-key=${key}`;
  const res = await fetch(url, {
    method: opts?.method ?? "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Helius REST ${endpoint} → ${res.status}: ${text}`);
  }
  return res.json();
}
