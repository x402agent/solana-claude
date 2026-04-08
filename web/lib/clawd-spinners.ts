/**
 * $CLAWD Spinners — Browser-compatible version
 *
 * Same frame data as src/animations/clawd-frames.ts but without Node.js deps.
 * Used by the web app and TailClawd UI.
 */

export interface Spinner {
  frames: readonly string[]
  interval: number
  description: string
}

export const CLAWD_SPINNERS: Record<string, Spinner> = {
  solanaPulse: {
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
    description: 'Heartbeat pulse — Solana TPS vibes',
  },
  clawdSpin: {
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
    description: 'Braille-encoded "C" morphing',
  },
  walletHeartbeat: {
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
    description: 'ECG trace for buddy birth',
  },
  tokenOrbit: {
    frames: ['◆ ·  · ·', '· ◆  · ·', '· ·  ◆ ·', '· ·  · ◆', '· ·  ◆ ·', '· ◆  · ·'],
    interval: 110,
    description: 'Tokens swirling in a bonding curve',
  },
  pumpLoader: {
    frames: [
      '▱▱▱▱▱▱▱▱', '▰▱▱▱▱▱▱▱', '▰▰▱▱▱▱▱▱', '▰▰▰▱▱▱▱▱',
      '▰▰▰▰▱▱▱▱', '▰▰▰▰▰▱▱▱', '▰▰▰▰▰▰▱▱', '▰▰▰▰▰▰▰▱',
      '▰▰▰▰▰▰▰▰', '▰▰▰▰▰▰▰▰', '▱▰▰▰▰▰▰▰', '▱▱▰▰▰▰▰▰',
      '▱▱▱▰▰▰▰▰', '▱▱▱▱▰▰▰▰', '▱▱▱▱▱▰▰▰', '▱▱▱▱▱▱▰▰',
      '▱▱▱▱▱▱▱▰', '▱▱▱▱▱▱▱▱',
    ],
    interval: 60,
    description: 'Bonding curve filling up',
  },
  mevScan: {
    frames: [
      '⠁⠀⠀⠀⠀⠀⠀⠀', '⠂⠁⠀⠀⠀⠀⠀⠀', '⠄⠂⠁⠀⠀⠀⠀⠀',
      '⡀⠄⠂⠁⠀⠀⠀⠀', '⠀⡀⠄⠂⠁⠀⠀⠀', '⠀⠀⡀⠄⠂⠁⠀⠀',
      '⠀⠀⠀⡀⠄⠂⠁⠀', '⠀⠀⠀⠀⡀⠄⠂⠁', '⠀⠀⠀⠀⠀⡀⠄⠂',
      '⠀⠀⠀⠀⠀⠀⡀⠄', '⠀⠀⠀⠀⠀⠀⠀⡀', '⠀⠀⠀⠀⠀⠀⠀⠀',
    ],
    interval: 70,
    description: 'Braille scan-line for snipers',
  },
  degenDice: {
    frames: ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅', '⚄', '⚃', '⚁'],
    interval: 100,
    description: 'Dice roll for stat generation',
  },
  blockFinality: {
    frames: [
      '░░░░', '▒░░░', '▓▒░░', '█▓▒░', '██▓▒', '███▓', '████',
      '████', '███▓', '██▓▒', '█▓▒░', '▓▒░░', '▒░░░', '░░░░',
    ],
    interval: 80,
    description: 'Blocks stacking / confirming',
  },
  rugDetector: {
    frames: [
      '🛡️  scanning',
      '🛡️  scanning.',
      '🛡️  scanning..',
      '🛡️  scanning...',
      '🛡️  CLEAR ✓',
      '🛡️  CLEAR ✓',
    ],
    interval: 200,
    description: 'Rug pull sweep animation',
  },
}

export type ClawdSpinnerName = keyof typeof CLAWD_SPINNERS
