/**
 * Memory shape telemetry — stub.
 * Provides no-op implementations for memory recall/write shape logging.
 */

import type { MemoryHeader } from './memoryTypes.js'

export function logMemoryRecallShape(
  _memories: MemoryHeader[],
  _selected: MemoryHeader[],
): void {
  // no-op stub
}

export function logMemoryWriteShape(..._args: unknown[]): void {
  // no-op stub
}
