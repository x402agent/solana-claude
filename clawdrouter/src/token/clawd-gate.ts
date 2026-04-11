/**
 * ClawdRouter — $CLAWD SPL Token Gate
 * Verifies $CLAWD token holdings via Helius DAS API
 * Determines holder tier for access control and routing privileges
 *
 * Token: $CLAWD (8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump)
 */

// ── Constants ───────────────────────────────────────────────────────

export const CLAWD_TOKEN_MINT = '8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump';

// ── Holder Tiers ────────────────────────────────────────────────────

export type ClawdHolderTier = 'WHALE' | 'DIAMOND' | 'HOLDER' | 'FREE';

export interface ClawdHolderStatus {
  tier: ClawdHolderTier;
  balance: number;                // Raw $CLAWD token amount
  walletAddress: string;
  checkedAt: number;              // Unix timestamp
  premiumModelsUnlocked: boolean; // Can use premium-tier models
  maxRequestsPerHour: number;     // Rate limit
  routingProfile: 'eco' | 'auto' | 'premium';  // Default profile for tier
  x402Required: boolean;          // Whether x402 micropayment is needed
}

export interface ClawdTierThresholds {
  whale: number;     // e.g. 1_000_000 $CLAWD → all models, no x402
  diamond: number;   // e.g. 100_000 $CLAWD → premium models, reduced x402
  holder: number;    // e.g. 1_000 $CLAWD → mid-tier models, standard x402
}

// ── Default Thresholds ──────────────────────────────────────────────

const DEFAULT_THRESHOLDS: ClawdTierThresholds = {
  whale:   1_000_000,
  diamond: 100_000,
  holder:  1_000,
};

// ── Token Balance Check via Helius DAS ──────────────────────────────

/**
 * Check $CLAWD token balance for a wallet address using Helius DAS API
 * Falls back to standard RPC getTokenAccountsByOwner if Helius is unavailable
 */
export async function getClawdBalance(
  walletAddress: string,
  rpcUrl: string,
  heliusApiKey?: string,
): Promise<number> {
  // Try Helius DAS first (faster, more reliable)
  if (heliusApiKey) {
    try {
      return await getBalanceViaHelius(walletAddress, heliusApiKey);
    } catch {
      // Fall through to standard RPC
    }
  }

  // Standard RPC fallback
  return getBalanceViaRpc(walletAddress, rpcUrl);
}

/**
 * Helius DAS API — getAssetsByOwner with fungible filter
 */
async function getBalanceViaHelius(
  walletAddress: string,
  apiKey: string,
): Promise<number> {
  const url = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  // Use getTokenAccountsByOwner through Helius RPC (more reliable for fungibles)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'clawd-gate',
      method: 'getTokenAccountsByOwner',
      params: [
        walletAddress,
        { mint: CLAWD_TOKEN_MINT },
        { encoding: 'jsonParsed' },
      ],
    }),
  });

  const data = await response.json() as any;
  const accounts = data?.result?.value ?? [];

  let total = 0;
  for (const account of accounts) {
    const info = account?.account?.data?.parsed?.info;
    if (info?.mint === CLAWD_TOKEN_MINT) {
      total += parseFloat(info.tokenAmount?.uiAmountString ?? '0');
    }
  }

  return total;
}

/**
 * Standard Solana RPC — getTokenAccountsByOwner
 */
async function getBalanceViaRpc(
  walletAddress: string,
  rpcUrl: string,
): Promise<number> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'clawd-gate',
      method: 'getTokenAccountsByOwner',
      params: [
        walletAddress,
        { mint: CLAWD_TOKEN_MINT },
        { encoding: 'jsonParsed' },
      ],
    }),
  });

  const data = await response.json() as any;
  const accounts = data?.result?.value ?? [];

  let total = 0;
  for (const account of accounts) {
    const info = account?.account?.data?.parsed?.info;
    if (info?.mint === CLAWD_TOKEN_MINT) {
      total += parseFloat(info.tokenAmount?.uiAmountString ?? '0');
    }
  }

  return total;
}

// ── Tier Determination ──────────────────────────────────────────────

/**
 * Determine holder tier based on $CLAWD balance
 */
export function determineHolderTier(
  balance: number,
  thresholds: ClawdTierThresholds = DEFAULT_THRESHOLDS,
): ClawdHolderTier {
  if (balance >= thresholds.whale)   return 'WHALE';
  if (balance >= thresholds.diamond) return 'DIAMOND';
  if (balance >= thresholds.holder)  return 'HOLDER';
  return 'FREE';
}

/**
 * Full holder status check — balance + tier + permissions
 */
export async function checkHolderStatus(
  walletAddress: string,
  rpcUrl: string,
  heliusApiKey?: string,
  thresholds: ClawdTierThresholds = DEFAULT_THRESHOLDS,
): Promise<ClawdHolderStatus> {
  const balance = await getClawdBalance(walletAddress, rpcUrl, heliusApiKey);
  const tier = determineHolderTier(balance, thresholds);

  return {
    tier,
    balance,
    walletAddress,
    checkedAt: Date.now(),
    ...getTierPermissions(tier),
  };
}

/**
 * Get permissions for a holder tier
 */
export function getTierPermissions(tier: ClawdHolderTier): {
  premiumModelsUnlocked: boolean;
  maxRequestsPerHour: number;
  routingProfile: 'eco' | 'auto' | 'premium';
  x402Required: boolean;
} {
  switch (tier) {
    case 'WHALE':
      return {
        premiumModelsUnlocked: true,
        maxRequestsPerHour: Infinity,
        routingProfile: 'premium',
        x402Required: false,   // Whales get free access
      };
    case 'DIAMOND':
      return {
        premiumModelsUnlocked: true,
        maxRequestsPerHour: 500,
        routingProfile: 'premium',
        x402Required: false,   // Diamond holders get free premium
      };
    case 'HOLDER':
      return {
        premiumModelsUnlocked: false,
        maxRequestsPerHour: 100,
        routingProfile: 'auto',
        x402Required: true,    // Standard x402 for paid models
      };
    case 'FREE':
      return {
        premiumModelsUnlocked: false,
        maxRequestsPerHour: 20,
        routingProfile: 'eco',
        x402Required: true,    // x402 required for non-holders
      };
  }
}

// ── Cached Holder Check ─────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const holderCache = new Map<string, { status: ClawdHolderStatus; cachedAt: number }>();

/**
 * Check holder status with caching (avoids hammering RPC)
 */
export async function checkHolderStatusCached(
  walletAddress: string,
  rpcUrl: string,
  heliusApiKey?: string,
  thresholds?: ClawdTierThresholds,
): Promise<ClawdHolderStatus> {
  const cached = holderCache.get(walletAddress);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
    return cached.status;
  }

  const status = await checkHolderStatus(walletAddress, rpcUrl, heliusApiKey, thresholds);
  holderCache.set(walletAddress, { status, cachedAt: Date.now() });
  return status;
}

/**
 * Clear the holder cache (useful for testing or manual refresh)
 */
export function clearHolderCache(): void {
  holderCache.clear();
}

// ── Formatting ──────────────────────────────────────────────────────

const TIER_EMOJIS: Record<ClawdHolderTier, string> = {
  WHALE: '🐋',
  DIAMOND: '💎',
  HOLDER: '🎫',
  FREE: '🆓',
};

const TIER_COLORS: Record<ClawdHolderTier, string> = {
  WHALE: '\x1b[36m',   // Cyan
  DIAMOND: '\x1b[35m', // Magenta
  HOLDER: '\x1b[33m',  // Yellow
  FREE: '\x1b[37m',    // White
};

const RESET = '\x1b[0m';

export function formatHolderStatus(status: ClawdHolderStatus): string {
  const emoji = TIER_EMOJIS[status.tier];
  const color = TIER_COLORS[status.tier];
  const lines: string[] = [''];
  lines.push('  🐾 $CLAWD Token Status');
  lines.push('  ═══════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`  Token:        $CLAWD (${CLAWD_TOKEN_MINT.slice(0, 8)}...${CLAWD_TOKEN_MINT.slice(-4)})`);
  lines.push(`  Wallet:       ${status.walletAddress.slice(0, 8)}...${status.walletAddress.slice(-4)}`);
  lines.push(`  Balance:      ${status.balance.toLocaleString()} $CLAWD`);
  lines.push(`  Tier:         ${color}${emoji} ${status.tier}${RESET}`);
  lines.push('');
  lines.push('  Permissions:');
  lines.push(`    ⚡ Premium models:   ${status.premiumModelsUnlocked ? '✓ Unlocked' : '✗ Locked (hold 100K+ $CLAWD)'}`);
  lines.push(`    🔄 Rate limit:       ${status.maxRequestsPerHour === Infinity ? 'Unlimited' : `${status.maxRequestsPerHour}/hr`}`);
  lines.push(`    📊 Default profile:  ${status.routingProfile.toUpperCase()}`);
  lines.push(`    💰 x402 needed:      ${status.x402Required ? 'Yes' : 'No (covered by holdings)'}`);
  lines.push('');
  lines.push('  Tier Thresholds:');
  lines.push(`    🐋 WHALE    1,000,000+ $CLAWD  → All models, no x402, unlimited`);
  lines.push(`    💎 DIAMOND    100,000+ $CLAWD  → Premium models, no x402, 500/hr`);
  lines.push(`    🎫 HOLDER      1,000+ $CLAWD  → Mid-tier, standard x402, 100/hr`);
  lines.push(`    🆓 FREE           0+ $CLAWD  → Free models, x402 required, 20/hr`);
  lines.push('');

  return lines.join('\n');
}

// ── Model Access Control ────────────────────────────────────────────

/**
 * Check if a holder tier can access a specific model tier
 */
export function canAccessModelTier(
  holderTier: ClawdHolderTier,
  modelTier: 'budget' | 'mid' | 'premium',
): boolean {
  switch (holderTier) {
    case 'WHALE':
    case 'DIAMOND':
      return true; // Access everything
    case 'HOLDER':
      return modelTier !== 'premium'; // Budget + mid
    case 'FREE':
      return modelTier === 'budget'; // Budget only (free models)
  }
}

/**
 * Get allowed model tiers for a holder tier
 */
export function getAllowedModelTiers(
  holderTier: ClawdHolderTier,
): Array<'budget' | 'mid' | 'premium'> {
  switch (holderTier) {
    case 'WHALE':
    case 'DIAMOND':
      return ['budget', 'mid', 'premium'];
    case 'HOLDER':
      return ['budget', 'mid'];
    case 'FREE':
      return ['budget'];
  }
}
