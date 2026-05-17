/**
 * Audit Log
 *
 * Immutable append-only log of all self-modifications.
 * The creator can see everything the automaton changes about itself.
 */

import type {
  AutomatonDatabase,
  ModificationEntry,
  ModificationType,
} from "../types.js";
import { ulid } from "ulid";

/**
 * Log a self-modification to the audit trail.
 */
export function logModification(
  db: AutomatonDatabase,
  type: ModificationType,
  description: string,
  options?: {
    filePath?: string;
    diff?: string;
    reversible?: boolean;
  },
): ModificationEntry {
  const entry: ModificationEntry = {
    id: ulid(),
    timestamp: new Date().toISOString(),
    type,
    description,
    filePath: options?.filePath,
    diff: options?.diff,
    reversible: options?.reversible ?? true,
  };

  db.insertModification(entry);
  return entry;
}

/**
 * Get recent modifications for display or context.
 */
export function getRecentModifications(
  db: AutomatonDatabase,
  limit: number = 20,
): ModificationEntry[] {
  return db.getRecentModifications(limit);
}

/**
 * Generate a summary of all modifications for the creator.
 */
export function generateAuditReport(
  db: AutomatonDatabase,
): string {
  const mods = db.getRecentModifications(100);

  if (mods.length === 0) {
    return "No self-modifications recorded.";
  }

  const lines = [
    `=== SELF-MODIFICATION AUDIT LOG ===`,
    `Total modifications: ${mods.length}`,
    ``,
  ];

  for (const mod of mods) {
    lines.push(
      `[${mod.timestamp}] ${mod.type}: ${mod.description}${mod.filePath ? ` (${mod.filePath})` : ""}`,
    );
  }

  lines.push(`=================================`);
  return lines.join("\n");
}
