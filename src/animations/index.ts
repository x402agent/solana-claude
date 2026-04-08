/**
 * $CLAWD Animations — Solana-themed unicode spinners and ceremonies
 */

// Custom CLAWD spinner frames
export {
  CLAWD_SPINNERS,
  solanaPulse,
  clawdSpin,
  walletHeartbeat,
  tokenOrbit,
  pumpLoader,
  mevScan,
  degenDice,
  blockFinality,
  rugDetector,
  type ClawdSpinnerName,
} from './clawd-frames.js'

// Reusable spinner utility
export {
  createClawdSpinner,
  withSpinner,
  type ClawdSpinner,
} from './spinner.js'

// Birth ceremony
export {
  birthCeremony,
  birthQuiet,
} from './birth-ceremony.js'
