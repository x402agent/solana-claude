/**
 * $CLAWD Custom Unicode Animations
 *
 * Braille-grid spinners themed around the Solana ecosystem.
 * Each spinner is a { frames: string[], interval: number } conforming
 * to the unicode-animations Spinner interface so they can be used
 * interchangeably with built-in spinners.
 */

import type { Spinner } from 'unicode-animations'

// ── Solana chain-pulse ─────────────────────────────────────────────────
// A heartbeat-style pulse that evokes the Solana TPS counter.
export const solanaPulse: Spinner = {
  frames: [
    '⠀⠀⠀⣀⠀⠀⠀',
    '⠀⠀⣠⣿⣄⠀⠀',
    '⠀⣴⣿⣿⣿⣦⠀',
    '⣾⣿⣿⣿⣿⣿⣷',
    '⠻⣿⣿⣿⣿⣿⠟',
    '⠀⠙⣿⣿⣿⠋⠀',
    '⠀⠀⠙⣿⠋⠀⠀',
    '⠀⠀⠀⠁⠀⠀⠀',
  ],
  interval: 100,
}

// ── CLAWD logo spin ────────────────────────────────────────────────────
// Braille-encoded "C" that rotates / morphs.
export const clawdSpin: Spinner = {
  frames: [
    '⣰⣿⣿⡆',
    '⣿⡏⠀⠀',
    '⣿⡇⠀⠀',
    '⣿⡏⠀⠀',
    '⠹⣿⣿⠃',
    '⠀⠈⠉⠀',
    '⠹⣿⣿⠃',
    '⣿⡏⠀⠀',
    '⣿⡇⠀⠀',
    '⣿⡏⠀⠀',
    '⣰⣿⣿⡆',
    '⠀⠉⠉⠀',
  ],
  interval: 90,
}

// ── Wallet heartbeat ───────────────────────────────────────────────────
// ECG-style heartbeat trace rendered in braille — used during buddy birth.
export const walletHeartbeat: Spinner = {
  frames: [
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⠀⠀⠀⠀⠀',
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⠞⠁⠀⠀⠀⠀⠀',
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡴⠞⠁⠀⠀⠀⠀⠀⠀⠀',
    '⠤⠤⠤⠤⠤⠤⣤⠴⠚⠁⠀⠀⠀⠀⠹⠤⠤⠤⠤⠤',
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
    '⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤⠤',
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⠀⠀⠀⠀⠀',
    '⠤⠤⠤⠤⠤⠤⣤⠴⠚⠁⠀⠀⠀⠀⠹⠤⠤⠤⠤⠤',
  ],
  interval: 120,
}

// ── Token orbit ────────────────────────────────────────────────────────
// Dots orbiting like tokens swirling in a bonding curve.
export const tokenOrbit: Spinner = {
  frames: [
    '◆ ·  · ·',
    '· ◆  · ·',
    '· ·  ◆ ·',
    '· ·  · ◆',
    '· ·  ◆ ·',
    '· ◆  · ·',
  ],
  interval: 110,
}

// ── Pump loader ────────────────────────────────────────────────────────
// Bonding curve filling up — used for launch animations.
export const pumpLoader: Spinner = {
  frames: [
    '▱▱▱▱▱▱▱▱',
    '▰▱▱▱▱▱▱▱',
    '▰▰▱▱▱▱▱▱',
    '▰▰▰▱▱▱▱▱',
    '▰▰▰▰▱▱▱▱',
    '▰▰▰▰▰▱▱▱',
    '▰▰▰▰▰▰▱▱',
    '▰▰▰▰▰▰▰▱',
    '▰▰▰▰▰▰▰▰',
    '▰▰▰▰▰▰▰▰',
    '▱▰▰▰▰▰▰▰',
    '▱▱▰▰▰▰▰▰',
    '▱▱▱▰▰▰▰▰',
    '▱▱▱▱▰▰▰▰',
    '▱▱▱▱▱▰▰▰',
    '▱▱▱▱▱▱▰▰',
    '▱▱▱▱▱▱▱▰',
    '▱▱▱▱▱▱▱▱',
  ],
  interval: 60,
}

// ── MEV shark scan ─────────────────────────────────────────────────────
// Braille scan-line for the sniper/shark species.
export const mevScan: Spinner = {
  frames: [
    '⠁⠀⠀⠀⠀⠀⠀⠀',
    '⠂⠁⠀⠀⠀⠀⠀⠀',
    '⠄⠂⠁⠀⠀⠀⠀⠀',
    '⡀⠄⠂⠁⠀⠀⠀⠀',
    '⠀⡀⠄⠂⠁⠀⠀⠀',
    '⠀⠀⡀⠄⠂⠁⠀⠀',
    '⠀⠀⠀⡀⠄⠂⠁⠀',
    '⠀⠀⠀⠀⡀⠄⠂⠁',
    '⠀⠀⠀⠀⠀⡀⠄⠂',
    '⠀⠀⠀⠀⠀⠀⡀⠄',
    '⠀⠀⠀⠀⠀⠀⠀⡀',
    '⠀⠀⠀⠀⠀⠀⠀⠀',
  ],
  interval: 70,
}

// ── Degen dice ─────────────────────────────────────────────────────────
export const degenDice: Spinner = {
  frames: ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅', '⚄', '⚃', '⚁'],
  interval: 100,
}

// ── Block finality ─────────────────────────────────────────────────────
// Blocks stacking / confirming — validator species.
export const blockFinality: Spinner = {
  frames: [
    '░░░░',
    '▒░░░',
    '▓▒░░',
    '█▓▒░',
    '██▓▒',
    '███▓',
    '████',
    '████',
    '███▓',
    '██▓▒',
    '█▓▒░',
    '▓▒░░',
    '▒░░░',
    '░░░░',
  ],
  interval: 80,
}

// ── Rug pull detector ──────────────────────────────────────────────────
export const rugDetector: Spinner = {
  frames: [
    '🛡️  scanning',
    '🛡️  scanning.',
    '🛡️  scanning..',
    '🛡️  scanning...',
    '🛡️  CLEAR ✓',
    '🛡️  CLEAR ✓',
  ],
  interval: 200,
}

// ── All CLAWD spinners ─────────────────────────────────────────────────
export const CLAWD_SPINNERS = {
  solanaPulse,
  clawdSpin,
  walletHeartbeat,
  tokenOrbit,
  pumpLoader,
  mevScan,
  degenDice,
  blockFinality,
  rugDetector,
} as const

export type ClawdSpinnerName = keyof typeof CLAWD_SPINNERS
