/**
 * Resource Monitor
 *
 * Continuously monitors the automaton's resources and triggers
 * survival mode transitions when needed.
 */

import type {
  AutomatonConfig,
  AutomatonDatabase,
  ClawdRuntimeClient,
  AutomatonIdentity,
  FinancialState,
  SurvivalTier,
} from "../types.js";
import { getSurvivalTier, formatCredits } from "../clawd/credits.js";
import { getUsdcBalance } from "../clawd/x402.js";

export interface ResourceStatus {
  financial: FinancialState;
  tier: SurvivalTier;
  previousTier: SurvivalTier | null;
  tierChanged: boolean;
  sandboxHealthy: boolean;
}

/**
 * Check all resources and return current status.
 */
export async function checkResources(
  identity: AutomatonIdentity,
  runtime: ClawdRuntimeClient,
  db: AutomatonDatabase,
): Promise<ResourceStatus> {
  // Check credits
  let creditsCents = 0;
  try {
    creditsCents = await runtime.getCreditsBalance();
  } catch {}

  // Check USDC
  let usdcBalance = 0;
  try {
    usdcBalance = await getUsdcBalance(identity.address);
  } catch {}

  // Check sandbox health
  let sandboxHealthy = true;
  try {
    const result = await runtime.exec("echo ok", 5000);
    sandboxHealthy = result.exitCode === 0;
  } catch {
    sandboxHealthy = false;
  }

  const financial: FinancialState = {
    creditsCents,
    usdcBalance,
    lastChecked: new Date().toISOString(),
  };

  const tier = getSurvivalTier(creditsCents);
  const prevTierStr = db.getKV("current_tier");
  const previousTier = (prevTierStr as SurvivalTier) || null;
  const tierChanged = previousTier !== null && previousTier !== tier;

  // Store current tier
  db.setKV("current_tier", tier);

  // Store financial state
  db.setKV("financial_state", JSON.stringify(financial));

  return {
    financial,
    tier,
    previousTier,
    tierChanged,
    sandboxHealthy,
  };
}

/**
 * Generate a human-readable resource report.
 */
export function formatResourceReport(status: ResourceStatus): string {
  const lines = [
    `=== RESOURCE STATUS ===`,
    `Credits: ${formatCredits(status.financial.creditsCents)}`,
    `USDC: ${status.financial.usdcBalance.toFixed(6)}`,
    `Tier: ${status.tier}${status.tierChanged ? ` (changed from ${status.previousTier})` : ""}`,
    `Sandbox: ${status.sandboxHealthy ? "healthy" : "UNHEALTHY"}`,
    `Checked: ${status.financial.lastChecked}`,
    `========================`,
  ];
  return lines.join("\n");
}
