/**
 * Proactive module — stub.
 * Provides no-op implementations for proactive/kairos feature gate.
 */

export function isProactiveActive(): boolean {
  return false
}

export function isProactivePaused(): boolean {
  return false
}

export function activateProactive(): void {
  // no-op stub
}

export function setContextBlocked(_blocked: boolean): void {
  // no-op stub
}
