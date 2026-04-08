#!/usr/bin/env node
/**
 * $CLAWD — One-shot Solana agentic CLI
 *
 * Usage:
 *   npx solana-clawd              # interactive mode
 *   npx solana-clawd birth        # hatch a new buddy
 *   npx solana-clawd birth bonk   # hatch a specific species
 *   npx solana-clawd spinners     # preview all CLAWD spinners
 *   npx solana-clawd demo         # full animated demo
 *   npx solana-clawd wallet       # show buddy wallet
 *   npx solana-clawd --version    # version
 */

const VERSION = '1.1.0'

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
}

const BANNER = `
${c.cyan}${c.bold}
   ██████╗██╗      █████╗ ██╗    ██╗██████╗
  ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗
  ██║     ██║     ███████║██║ █╗ ██║██║  ██║
  ██║     ██║     ██╔══██║██║███╗██║██║  ██║
  ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝
${c.reset}
  ${c.dim}Solana Agentic Engine — 31 MCP tools${c.reset}
  ${c.dim}v${VERSION}${c.reset}
`

const HELP = `
${BANNER}
  ${c.bold}Commands:${c.reset}

    ${c.cyan}birth${c.reset} [species]     Hatch a new Blockchain Buddy
    ${c.cyan}spinners${c.reset}            Preview all $CLAWD unicode animations
    ${c.cyan}demo${c.reset}               Full animated walkthrough
    ${c.cyan}wallet${c.reset}             Show buddy wallet & PnL
    ${c.cyan}species${c.reset}            List all available species
    ${c.cyan}start${c.reset}              Launch the full agentic engine

  ${c.bold}Flags:${c.reset}

    --version, -v       Show version
    --help, -h          Show this help

  ${c.bold}One-shot install:${c.reset}

    ${c.green}npx solana-clawd${c.reset}
    ${c.green}npm i -g solana-clawd${c.reset}

  ${c.dim}Built on Claude Code + Solana${c.reset}
`

async function showSpinners(): Promise<void> {
  const { CLAWD_SPINNERS } = await import('../animations/clawd-frames.js')

  console.log(`\n  ${c.bold}$CLAWD Spinners${c.reset}\n`)

  for (const [name, spinner] of Object.entries(CLAWD_SPINNERS)) {
    const { frames, interval } = spinner as { frames: string[]; interval: number }
    const totalMs = 2500
    const totalFrames = Math.ceil(totalMs / interval)

    process.stdout.write(`  ${c.cyan}${name.padEnd(18)}${c.reset} `)

    for (let i = 0; i < totalFrames; i++) {
      const frame = frames[i % frames.length]
      process.stdout.write(`\r  ${c.cyan}${name.padEnd(18)}${c.reset} ${frame}`)
      await new Promise(r => setTimeout(r, interval))
    }
    process.stdout.write(`\r  ${c.green}✔${c.reset} ${name.padEnd(18)} ${frames[0]} (${frames.length} frames, ${interval}ms)\n`)
  }

  console.log(`\n  ${c.dim}Also includes all 18 spinners from unicode-animations${c.reset}\n`)
}

async function showSpecies(): Promise<void> {
  const { BLOCKCHAIN_SPECIES, SPECIES_TRADING_CONFIG, SPECIES_DISPLAY_NAMES } = await import('../buddy/index.js')

  console.log(`\n  ${c.bold}Available Species${c.reset}\n`)

  for (const species of BLOCKCHAIN_SPECIES) {
    const config = SPECIES_TRADING_CONFIG[species]
    const display = SPECIES_DISPLAY_NAMES[species] ?? species
    const risk = config?.riskTolerance ?? 'medium'
    const riskColor = risk === 'degen' ? c.red : risk === 'high' ? c.yellow : risk === 'low' ? c.green : c.cyan
    console.log(`  ${c.bold}${display.padEnd(16)}${c.reset} ${riskColor}${risk.padEnd(8)}${c.reset} ${c.dim}${config?.preferredVenues?.join(', ') ?? ''}${c.reset}`)
  }
  console.log()
}

async function runBirth(species?: string): Promise<void> {
  const { BLOCKCHAIN_SPECIES } = await import('../buddy/index.js')
  const { birthCeremony } = await import('../animations/birth-ceremony.js')
  const { BlockchainSpecies } = await import('../buddy/blockchain-types.js') as any

  const validSpecies = species && (BLOCKCHAIN_SPECIES as readonly string[]).includes(species)
    ? species
    : BLOCKCHAIN_SPECIES[Math.floor(Math.random() * BLOCKCHAIN_SPECIES.length)]

  console.log(BANNER)
  await birthCeremony(validSpecies as any)
}

async function runDemo(): Promise<void> {
  const { createClawdSpinner } = await import('../animations/spinner.js')

  console.log(BANNER)

  // Phase 1: Init
  const s1 = createClawdSpinner('Connecting to Solana RPC...', 'solanaPulse')
  await new Promise(r => setTimeout(r, 2000))
  s1.stop('Connected to mainnet-beta')

  // Phase 2: Scan
  const s2 = createClawdSpinner('Scanning mempool for alpha...', 'mevScan')
  await new Promise(r => setTimeout(r, 2000))
  s2.stop('3 opportunities found')

  // Phase 3: Load
  const s3 = createClawdSpinner('Loading bonding curve data...', 'pumpLoader')
  await new Promise(r => setTimeout(r, 2500))
  s3.stop('Bonding curve analyzed')

  // Phase 4: Confirm
  const s4 = createClawdSpinner('Confirming transaction...', 'blockFinality')
  await new Promise(r => setTimeout(r, 2000))
  s4.stop('Transaction confirmed (slot 298,421,337)')

  // Phase 5: Birth
  console.log(`\n  ${c.bold}Now hatching a buddy...${c.reset}\n`)
  await runBirth()
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(HELP)
    return
  }

  if (cmd === '--version' || cmd === '-v') {
    console.log(`solana-clawd v${VERSION}`)
    return
  }

  switch (cmd) {
    case 'birth':
    case 'hatch':
      await runBirth(args[1])
      break
    case 'spinners':
    case 'animations':
      await showSpinners()
      break
    case 'species':
    case 'list':
      await showSpecies()
      break
    case 'demo':
      await runDemo()
      break
    case 'start':
    case 'run':
      // Delegate to the main CLI
      await import('./cli.js')
      break
    default:
      console.log(`  ${c.red}Unknown command: ${cmd}${c.reset}`)
      console.log(HELP)
      process.exit(1)
  }
}

main().catch(err => {
  console.error(`\n  ${c.red}Error: ${err.message}${c.reset}\n`)
  process.exit(1)
})
