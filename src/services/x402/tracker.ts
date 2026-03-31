/**
 * src/services/x402/tracker.ts
 *
 * x402 Payment Tracker — adapted from Claude Code's services/x402/tracker.ts.
 * Tracks payments per session for cost display, safety limits, and MCP tool output.
 * Solana-first: records Base58 tx signatures instead of EVM hashes.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { X402PaymentRecord, PaymentNetwork } from "./types.js";
import { tokenAmountToUSD } from "./types.js";

// ─── In-memory session tracking (adapted from Claude Code tracker.ts) ──────

let sessionPayments: X402PaymentRecord[] = [];
let sessionTotalUSD = 0;

export function addX402Payment(record: X402PaymentRecord): void {
  sessionPayments.push(record);
  sessionTotalUSD += record.amountUSD;
  process.stderr.write(
    `[x402] Payment: $${record.amountUSD.toFixed(4)} ${record.token} on ${record.network} → ${record.payTo.slice(0, 8)}... (session total: $${sessionTotalUSD.toFixed(4)})\n`,
  );
}

export function getX402SessionSpentUSD(): number {
  return sessionTotalUSD;
}

export function getX402SessionPayments(): readonly X402PaymentRecord[] {
  return sessionPayments;
}

export function getX402PaymentCount(): number {
  return sessionPayments.length;
}

export function resetX402SessionPayments(): void {
  sessionPayments = [];
  sessionTotalUSD = 0;
}

// ─── Persistent payment log ─────────────────────────────────────────────────

const PAYMENT_LOG_PATH = path.join(
  os.homedir(),
  ".config",
  "solana-claude",
  "x402-payments.jsonl",
);

/** Append payment to persistent JSONL log (fire-and-forget) */
export async function persistPayment(record: X402PaymentRecord): Promise<void> {
  try {
    await fs.mkdir(path.dirname(PAYMENT_LOG_PATH), { recursive: true });
    const line = JSON.stringify(record) + "\n";
    await fs.appendFile(PAYMENT_LOG_PATH, line, "utf-8");
  } catch {
    // Non-blocking — log but don't fail
    process.stderr.write(`[x402] Failed to persist payment log\n`);
  }
}

/** Read historical payments from persistent log */
export async function loadPaymentHistory(limit = 50): Promise<X402PaymentRecord[]> {
  try {
    const content = await fs.readFile(PAYMENT_LOG_PATH, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map(l => JSON.parse(l) as X402PaymentRecord);
  } catch {
    return [];
  }
}

// ─── Cost display (adapted from Claude Code tracker.ts formatX402Cost) ──────

export function formatX402Cost(): string {
  if (sessionPayments.length === 0) return "";

  const lines: string[] = [
    `x402 payments: $${sessionTotalUSD.toFixed(4)} (${sessionPayments.length} payment${sessionPayments.length === 1 ? "" : "s"})`,
  ];

  // Group by network
  const byNetwork: Record<string, { count: number; totalUSD: number }> = {};
  for (const p of sessionPayments) {
    byNetwork[p.network] = byNetwork[p.network] ?? { count: 0, totalUSD: 0 };
    byNetwork[p.network].count++;
    byNetwork[p.network].totalUSD += p.amountUSD;
  }

  for (const [network, stats] of Object.entries(byNetwork)) {
    lines.push(
      `  ${network}: ${stats.count} request${stats.count === 1 ? "" : "s"} ($${stats.totalUSD.toFixed(4)})`,
    );
  }

  // Group by resource domain
  const byDomain: Record<string, { count: number; totalUSD: number }> = {};
  for (const p of sessionPayments) {
    try {
      const domain = new URL(p.resource).hostname;
      byDomain[domain] = byDomain[domain] ?? { count: 0, totalUSD: 0 };
      byDomain[domain].count++;
      byDomain[domain].totalUSD += p.amountUSD;
    } catch { /* skip malformed URLs */ }
  }

  for (const [domain, stats] of Object.entries(byDomain)) {
    lines.push(
      `  ${domain}: ${stats.count} req ($${stats.totalUSD.toFixed(4)})`,
    );
  }

  return lines.join("\n");
}

/** Summary for MCP tool output */
export function getX402Summary(): {
  session: { payments: number; totalUSD: number };
  records: readonly X402PaymentRecord[];
} {
  return {
    session: { payments: sessionPayments.length, totalUSD: sessionTotalUSD },
    records: sessionPayments,
  };
}
