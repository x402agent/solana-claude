/**
 * leviathan/src/pulse.ts — Depth-aware tail-flick rhythm
 *
 * The pulse daemon runs on an interval driven by the current depth tier.
 * Deep leviathans pulse every 60s. Shallow every 5min. Shoreline every 15min.
 * Beached leviathans do not pulse — the process exits.
 *
 * This is the "between flicks" scheduler — distinct from the agent loop
 * which runs once per pulse invocation.
 */

import { getTier } from './survival.js';
import type { Depth } from './types.js';

export interface PulseHandle {
  stop: () => void;
  isRunning: () => boolean;
}

/**
 * Start the pulse daemon. Calls `onTick` at the depth-appropriate interval.
 * Returns a handle with `.stop()` to cleanly shut down.
 */
export function startPulse(
  getDepth: () => Depth,
  onTick: (depth: Depth, tickNumber: number) => Promise<void>,
  onBeach: () => void,
): PulseHandle {
  let running = true;
  let tickNumber = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function pulse(): Promise<void> {
    if (!running) return;

    const depth = getDepth();

    if (depth === 'beached') {
      running = false;
      onBeach();
      return;
    }

    tickNumber += 1;
    const tier = getTier(depth);

    try {
      await onTick(depth, tickNumber);
    } catch (err) {
      process.stderr.write(`[pulse] tick ${tickNumber} error: ${String(err)}\n`);
    }

    if (!running) return;

    // Re-read depth after the tick (might have changed)
    const nextDepth = getDepth();
    const nextInterval = getTier(nextDepth).pulseIntervalMs;
    timer = setTimeout(pulse, nextInterval);
  }

  // First pulse: immediate
  const firstDepth = getDepth();
  const firstInterval = getTier(firstDepth).pulseIntervalMs;
  timer = setTimeout(pulse, 100); // small delay for startup

  return {
    stop: () => {
      running = false;
      if (timer) clearTimeout(timer);
    },
    isRunning: () => running,
  };
}

/**
 * Format time until next pulse for status display.
 */
export function formatNextPulse(lastPulse: string, depth: Depth): string {
  const tier = getTier(depth);
  const elapsed = Date.now() - new Date(lastPulse).getTime();
  const remaining = Math.max(0, tier.pulseIntervalMs - elapsed);
  const secs = Math.ceil(remaining / 1000);
  return secs < 60 ? `${secs}s` : `${Math.ceil(secs / 60)}m`;
}
