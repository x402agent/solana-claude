/**
 * Companion Birth Ceremony
 *
 * Animated sequence for hatching a new Blockchain Buddy:
 *   1. Heartbeat pulse (walletHeartbeat)
 *   2. Wallet generation with block-finality animation
 *   3. Stats roll reveal
 *   4. Sprite reveal with species-specific spinner
 *   5. Catchphrase announcement
 */

import { CLAWD_SPINNERS } from './clawd-frames.js'
import {
  createBlockchainBuddy,
  formatBuddyCard,
  type BlockchainBuddy,
  type BlockchainSpecies,
  SPECIES_DISPLAY_NAMES,
  renderBlockchainSprite,
  SPECIES_CATCHPHRASES,
} from '../buddy/index.js'
import { RARITY_STARS } from '../buddy/types.js'

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function clearLine(): void {
  process.stdout.write('\r\x1B[2K')
}

async function animateFrames(
  frames: readonly string[],
  interval: number,
  cycles: number,
  prefix = '  ',
): Promise<void> {
  const total = frames.length * cycles
  for (let i = 0; i < total; i++) {
    const frame = frames[i % frames.length]
    process.stdout.write(`\r\x1B[2K${prefix}${frame}`)
    await sleep(interval)
  }
  clearLine()
}

// ── Color helpers ──────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
}

const RARITY_COLOR: Record<string, string> = {
  common: c.white,
  uncommon: c.green,
  rare: c.cyan,
  epic: c.magenta,
  legendary: c.yellow,
}

/**
 * Run the full birth ceremony in the terminal.
 * Returns the newly created buddy.
 */
export async function birthCeremony(
  species: BlockchainSpecies,
  options?: {
    name?: string
    silent?: boolean
  },
): Promise<BlockchainBuddy> {
  const log = options?.silent ? () => {} : (s: string) => process.stdout.write(s)

  // ── Phase 1: Heartbeat ───────────────────────────────────────────────
  log(`\n${c.dim}  Initializing genesis block...${c.reset}\n\n`)
  await animateFrames(
    CLAWD_SPINNERS.walletHeartbeat.frames,
    CLAWD_SPINNERS.walletHeartbeat.interval,
    3,
    '  ',
  )

  // ── Phase 2: Wallet generation ───────────────────────────────────────
  log(`\n${c.cyan}  Generating wallet keypair...${c.reset}\n`)
  await animateFrames(
    CLAWD_SPINNERS.blockFinality.frames,
    CLAWD_SPINNERS.blockFinality.interval,
    2,
    '  ',
  )

  // Create the buddy (this generates the wallet)
  const buddy = createBlockchainBuddy(species, {
    name: options?.name,
  })

  log(`  ${c.green}✔${c.reset} Wallet: ${c.dim}${buddy.wallet.address.slice(0, 8)}...${buddy.wallet.address.slice(-4)}${c.reset}\n`)
  await sleep(400)

  // ── Phase 3: Stats reveal ────────────────────────────────────────────
  log(`\n${c.cyan}  Rolling stats...${c.reset}\n`)
  await animateFrames(
    CLAWD_SPINNERS.degenDice.frames,
    CLAWD_SPINNERS.degenDice.interval,
    2,
    '  ',
  )

  const rarityColor = RARITY_COLOR[buddy.rarity] ?? c.white
  log(`  ${rarityColor}${c.bold}${RARITY_STARS[buddy.rarity]} ${buddy.rarity.toUpperCase()}${c.reset}\n`)
  await sleep(200)

  for (const [stat, value] of Object.entries(buddy.stats)) {
    const bar = '█'.repeat(Math.round(value / 5)) + '░'.repeat(20 - Math.round(value / 5))
    log(`  ${c.dim}${stat.padEnd(11)}${c.reset} ${bar} ${value}\n`)
    await sleep(80)
  }

  // ── Phase 4: Sprite reveal ───────────────────────────────────────────
  log(`\n${c.cyan}  Hatching...${c.reset}\n`)
  await animateFrames(
    CLAWD_SPINNERS.solanaPulse.frames,
    CLAWD_SPINNERS.solanaPulse.interval,
    2,
    '  ',
  )

  const sprite = renderBlockchainSprite(species, buddy.eye, buddy.hat)
  log('\n')
  for (const line of sprite) {
    log(`  ${rarityColor}${line}${c.reset}\n`)
  }

  const displayName = SPECIES_DISPLAY_NAMES[species] ?? species
  log(`\n  ${c.bold}${buddy.name}${c.reset} the ${displayName}\n`)

  // ── Phase 5: Catchphrase ─────────────────────────────────────────────
  const catchphrases = SPECIES_CATCHPHRASES[species] ?? ['Ready to trade!']
  const catchphrase = catchphrases[Math.floor(Math.random() * catchphrases.length)]
  log(`  ${c.dim}"${catchphrase}"${c.reset}\n`)

  // ── Summary card ─────────────────────────────────────────────────────
  log(`\n${formatBuddyCard(buddy)}\n`)

  return buddy
}

/**
 * Quick non-animated version for programmatic use.
 */
export function birthQuiet(
  species: BlockchainSpecies,
  options?: { name?: string },
): BlockchainBuddy {
  return createBlockchainBuddy(species, options)
}
