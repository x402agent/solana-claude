/**
 * Blockchain Buddy Sprites — ASCII art for Solana-native companions
 * 
 * Each sprite is 5 lines tall, 12 wide (after {E}→1char substitution).
 * Multiple frames per species for idle fidget animation.
 * Line 0 is the hat slot — must be blank in frames 0-1; frame 2 may use it.
 */

import type { BlockchainSpecies } from './blockchain-types.js'
import type { Eye } from './types.js'

// ─────────────────────────────────────────────────────────────────────────────
// Blockchain-native species sprites
// ─────────────────────────────────────────────────────────────────────────────

export const BLOCKCHAIN_BODIES: Record<BlockchainSpecies, string[][]> = {
  // Solana natives
  soldog: [
    [
      '            ',
      '   /\\__/\\   ',
      '  ( {E}  {E} )  ',
      '   (ωωω)    ',
      '  /|    |\\  ',
    ],
    [
      '            ',
      '   /\\__/\\   ',
      '  ( {E}  {E} )  ',
      '   (ωωω)~   ',
      '  /|    |\\  ',
    ],
    [
      '   ★    ★   ',
      '   /\\__/\\   ',
      '  ( {E}  {E} )  ',
      '   (ωωω)    ',
      '  /|SOL |\\  ',
    ],
  ],
  
  bonk: [
    [
      '            ',
      '  /\\___/\\   ',
      ' (  {E} {E}  ) ',
      '  \\  ▼  /   ',
      '   `---´    ',
    ],
    [
      '            ',
      '  /\\___/\\   ',
      ' (  {E} {E}  ) ',
      '  \\  ▼  /~  ',
      '   `---´    ',
    ],
    [
      '   💫       ',
      '  /\\___/\\   ',
      ' (  {E} {E}  ) ',
      '  \\BONK/   ',
      '   `---´    ',
    ],
  ],
  
  wif: [
    [
      '   [___]    ',
      '  /\\___/\\   ',
      ' (  {E} {E}  ) ',
      '  (  ω  )   ',
      '  /|    |\\  ',
    ],
    [
      '   [___]    ',
      '  /\\___/\\   ',
      ' (  {E} {E}  ) ',
      '  (  ω  )~  ',
      '  /|    |\\  ',
    ],
    [
      '   [WIF]    ',
      '  /\\___/\\   ',
      ' (  {E} {E}  ) ',
      '  (  ω  )   ',
      '  /|HAT |\\  ',
    ],
  ],
  
  jupiter: [
    [
      '            ',
      '   .--.     ',
      '  / {E}  {E} \\   ',
      ' |  ~~  |   ',
      '  \\_🪐_/    ',
    ],
    [
      '            ',
      '   .--.     ',
      '  / {E}  {E} \\   ',
      ' |  ==  |   ',
      '  \\_🪐_/    ',
    ],
    [
      '    ⚡      ',
      '   .--.     ',
      '  / {E}  {E} \\   ',
      ' |JUP AGG|  ',
      '  \\_🪐_/    ',
    ],
  ],
  
  raydium: [
    [
      '            ',
      '   \\  /     ',
      '   ( {E}{E} )   ',
      '  /|~~~~|\\  ',
      '   ^^^^^    ',
    ],
    [
      '            ',
      '   \\  /     ',
      '   ( {E}{E} )   ',
      '  /|~~~~|\\  ',
      '   ^^^^^~   ',
    ],
    [
      '   💧💧     ',
      '   \\  /     ',
      '   ( {E}{E} )   ',
      '  /|RAY  |\\ ',
      '   ^^^^^    ',
    ],
  ],
  
  // DeFi archetypes
  whale: [
    [
      '            ',
      '   ~~~~~    ',
      '  ( {E}  {E} )  ',
      ' (________) ',
      '  WHALE 🐳  ',
    ],
    [
      '            ',
      '   ~~~~~    ',
      '  ( {E}  {E} )  ',
      ' (________)~',
      '  WHALE 🐳  ',
    ],
    [
      '   💰💰💰   ',
      '   ~~~~~    ',
      '  ( {E}  {E} )  ',
      ' (________) ',
      '  WHALE 🐳  ',
    ],
  ],
  
  bull: [
    [
      '            ',
      '  /\\  /\\    ',
      ' ( {E}  {E} )  ',
      '  (    )    ',
      '   ^^^^     ',
    ],
    [
      '            ',
      '  /\\  /\\    ',
      ' ( {E}  {E} )  ',
      '  (    )~   ',
      '   ^^^^     ',
    ],
    [
      '   📈📈     ',
      '  /\\  /\\    ',
      ' ( {E}  {E} )  ',
      '  (BULL)    ',
      '   ^^^^     ',
    ],
  ],
  
  bear: [
    [
      '            ',
      '  .---.     ',
      ' ( {E}  {E} )  ',
      '  (    )    ',
      '   `--´     ',
    ],
    [
      '            ',
      '  .---.     ',
      ' ( {E}  {E} )  ',
      '  (    )~   ',
      '   `--´     ',
    ],
    [
      '   📉📉     ',
      '  .---.     ',
      ' ( {E}  {E} )  ',
      '  (BEAR)    ',
      '   `--´     ',
    ],
  ],
  
  shark: [
    [
      '            ',
      '  >({E})>   ',
      '     /|     ',
      '    / |     ',
      '   ~~~~~    ',
    ],
    [
      '            ',
      '  >({E})>   ',
      '     /|     ',
      '    / |~    ',
      '   ~~~~~    ',
    ],
    [
      '   ⚡⚡⚡    ',
      '  >({E})>   ',
      '     /|     ',
      '   MEV|     ',
      '   ~~~~~    ',
    ],
  ],
  
  // NFT ecosystem
  degod: [
    [
      '            ',
      '   /\\__/\\   ',
      '  ( {E}  {E} )  ',
      '   \\~~~/    ',
      '   DEGOD    ',
    ],
    [
      '            ',
      '   /\\__/\\   ',
      '  ( {E}  {E} )  ',
      '   \\~~~/~   ',
      '   DEGOD    ',
    ],
    [
      '   👑       ',
      '   /\\__/\\   ',
      '  ( {E}  {E} )  ',
      '   \\~~~/    ',
      '   DEGOD    ',
    ],
  ],
  
  y00t: [
    [
      '            ',
      '  .------.  ',
      ' |  {E}  {E}  | ',
      ' |  ====  | ',
      '  `y00ts´   ',
    ],
    [
      '            ',
      '  .------.  ',
      ' |  {E}  {E}  | ',
      ' |  ====  | ',
      '  `y00ts´~  ',
    ],
    [
      '   ✨✨     ',
      '  .------.  ',
      ' |  {E}  {E}  | ',
      ' |  ====  | ',
      '  `y00ts´   ',
    ],
  ],
  
  okaybear: [
    [
      '            ',
      '  .--.      ',
      ' ( {E}  {E} )  ',
      '  (    )    ',
      '   OKAY     ',
    ],
    [
      '            ',
      '  .--.      ',
      ' ( {E}  {E} )  ',
      '  (    )~   ',
      '   OKAY     ',
    ],
    [
      '   🐻      ',
      '  .--.      ',
      ' ( {E}  {E} )  ',
      '  (BEAR)    ',
      '   OKAY     ',
    ],
  ],
  
  // Memecoin culture
  pepe: [
    [
      '            ',
      '   ____     ',
      '  / {E}  {E} \\   ',
      ' (  ~~  )   ',
      '   FROG     ',
    ],
    [
      '            ',
      '   ____     ',
      '  / {E}  {E} \\   ',
      ' (  ~~  )~  ',
      '   FROG     ',
    ],
    [
      '   💚💚     ',
      '   ____     ',
      '  / {E}  {E} \\   ',
      ' (PEPE )   ',
      '   FROG     ',
    ],
  ],
  
  pumpfun: [
    [
      '            ',
      '   /\\__/\\   ',
      '  ( {E}  {E} )  ',
      '   \\~~~/    ',
      '   PUMP!    ',
    ],
    [
      '            ',
      '   /\\__/\\   ',
      '  ( {E}  {E} )  ',
      '   \\~~~/~   ',
      '   PUMP!    ',
    ],
    [
      '   🚀🚀     ',
      '   /\\__/\\   ',
      '  ( {E}  {E} )  ',
      '   \\~~~/    ',
      '   PUMP!    ',
    ],
  ],
  
  sniper: [
    [
      '            ',
      '   .--.     ',
      '  [ {E}  {E} ]  ',
      '  [====]    ',
      '   `--´     ',
    ],
    [
      '            ',
      '   .--.     ',
      '  [ {E}  {E} ]  ',
      '  [====]~   ',
      '   `--´     ',
    ],
    [
      '   🎯       ',
      '   .--.     ',
      '  [ {E}  {E} ]  ',
      '  [LOCK]    ',
      '   `--´     ',
    ],
  ],
  
  // Technical
  validator: [
    [
      '            ',
      '   [====]   ',
      '  [ {E}  {E} ]  ',
      '  [====]    ',
      '   NODE     ',
    ],
    [
      '            ',
      '   [====]   ',
      '  [ {E}  {E} ]  ',
      '  [====]~   ',
      '   NODE     ',
    ],
    [
      '   ⚡⚡⚡    ',
      '   [====]   ',
      '  [ {E}  {E} ]  ',
      '  [SYNC]    ',
      '   NODE     ',
    ],
  ],
  
  rpc: [
    [
      '            ',
      '   .----.   ',
      '  ( {E}  {E} )  ',
      '  |~~~~|    ',
      '   RPC      ',
    ],
    [
      '            ',
      '   .----.   ',
      '  ( {E}  {E} )  ',
      '  |~~~~|~   ',
      '   RPC      ',
    ],
    [
      '   📡       ',
      '   .----.   ',
      '  ( {E}  {E} )  ',
      '  |CONN|    ',
      '   RPC      ',
    ],
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Hat lines for blockchain buddies
// ─────────────────────────────────────────────────────────────────────────────

export const BLOCKCHAIN_HAT_LINES: Record<string, string> = {
  none: '',
  crown: '   \\^^^/    ',
  tophat: '   [___]    ',
  propeller: '    -+-     ',
  halo: '   (   )    ',
  wizard: '    /^\\     ',
  beanie: '   (___)    ',
  tinyduck: '    ,>      ',
  solana: '   ◆ SOL ◆  ',
  bitcoin: '   ₿ BTC ₿  ',
  ethereum: '   Ξ ETH Ξ  ',
  degen: '   🎰🎰🎰   ',
  whale: '   💰💰💰   ',
  sniper: '   🎯🎯🎯   ',
}

// ─────────────────────────────────────────────────────────────────────────────
// Render functions
// ─────────────────────────────────────────────────────────────────────────────

export function renderBlockchainSprite(
  species: BlockchainSpecies,
  eye: Eye,
  hat: string = 'none',
  frame = 0,
): string[] {
  const frames = BLOCKCHAIN_BODIES[species]
  if (!frames) {
    // Fallback to soldog if species not found
    return renderBlockchainSprite('soldog', eye, hat, frame)
  }
  
  const body = frames[frame % frames.length]!.map(line =>
    line.replaceAll('{E}', eye),
  )
  
  const lines = [...body]
  
  // Apply hat if line 0 is empty
  if (hat !== 'none' && !lines[0]!.trim()) {
    const hatLine = BLOCKCHAIN_HAT_LINES[hat] ?? ''
    if (hatLine) lines[0] = hatLine
  }
  
  // Drop blank hat slot if all frames have blank line 0
  if (!lines[0]!.trim() && frames.every(f => !f[0]!.trim())) {
    lines.shift()
  }
  
  return lines
}

export function blockchainSpriteFrameCount(species: BlockchainSpecies): number {
  return BLOCKCHAIN_BODIES[species]?.length ?? 3
}

export function renderBlockchainFace(species: BlockchainSpecies, eye: Eye): string {
  switch (species) {
    case 'soldog':
    case 'bonk':
    case 'wif':
      return `(${eye}ω${eye})`
    case 'jupiter':
    case 'raydium':
      return `(${eye}${eye})`
    case 'whale':
      return `~(${eye}${eye})~`
    case 'bull':
      return `(${eye}++${eye})`
    case 'bear':
      return `(${eye}--${eye})`
    case 'shark':
      return `>(${eye})>`
    case 'degod':
    case 'y00t':
    case 'okaybear':
      return `(${eye}..${eye})`
    case 'pepe':
    case 'pumpfun':
      return `(${eye}~~${eye})`
    case 'sniper':
      return `[${eye}${eye}]`
    case 'validator':
    case 'rpc':
      return `[${eye}..${eye}]`
    default:
      return `(${eye}${eye})`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Species display names
// ─────────────────────────────────────────────────────────────────────────────

export const SPECIES_DISPLAY_NAMES: Record<BlockchainSpecies, string> = {
  soldog: 'SolDog',
  bonk: 'BONK Dog',
  wif: 'dogwifhat',
  jupiter: 'Jupiter Agg',
  raydium: 'Raydium LP',
  whale: 'Whale',
  bull: 'Bull',
  bear: 'Bear',
  shark: 'MEV Shark',
  degod: 'DeGod',
  y00t: 'y00t',
  okaybear: 'Okay Bear',
  pepe: 'Pepe',
  pumpfun: 'Pump.fun',
  sniper: 'Sniper Bot',
  validator: 'Validator',
  rpc: 'RPC Node',
}