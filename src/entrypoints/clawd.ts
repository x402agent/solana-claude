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

const VERSION = '1.3.0'

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
    ${c.cyan}train${c.reset}  [subcmd]     GGUF training pipeline (extract/finetune/export/serve)

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

  const validSpecies = species && (BLOCKCHAIN_SPECIES as readonly string[]).includes(species)
    ? species
    : BLOCKCHAIN_SPECIES[Math.floor(Math.random() * BLOCKCHAIN_SPECIES.length)]

  console.log(BANNER)
  await birthCeremony(validSpecies as any)
}

async function runTrain(args: string[]): Promise<void> {
  const { execSync, spawn } = await import('node:child_process')
  const { resolve, dirname } = await import('node:path')
  const { fileURLToPath } = await import('node:url')

  const __fn = fileURLToPath(import.meta.url)
  const trainingDir = resolve(dirname(__fn), '..', '..', 'training')

  const subcmd = args[0] ?? 'help'

  const TRAIN_HELP = `
${BANNER}
  ${c.bold}Training Pipeline — GGUF Model Training for Solana AI Agents${c.reset}

  ${c.bold}Subcommands:${c.reset}

    ${c.cyan}extract${c.reset}              Extract training data from codebase → JSONL
    ${c.cyan}extract --validate${c.reset}   Dry-run: show stats without writing files
    ${c.cyan}extract --all${c.reset}        Include synthetic multi-turn scenarios
    ${c.cyan}validate${c.reset}             Validate extracted dataset files
    ${c.cyan}finetune${c.reset}             Fine-tune base model with LoRA
    ${c.cyan}merge${c.reset}                Merge LoRA adapters into base model
    ${c.cyan}export${c.reset}               Convert merged model to GGUF format
    ${c.cyan}serve${c.reset}                Start OpenRouter-compatible inference server
    ${c.cyan}status${c.reset}               Show pipeline status

  ${c.bold}Full pipeline:${c.reset}

    ${c.green}npx solana-clawd train extract --all${c.reset}
    ${c.green}npx solana-clawd train finetune --preset llama3${c.reset}
    ${c.green}npx solana-clawd train merge${c.reset}
    ${c.green}npx solana-clawd train export --quantize Q4_K_M${c.reset}
    ${c.green}npx solana-clawd train serve${c.reset}

  ${c.dim}See training/README.md for full documentation${c.reset}
`

  switch (subcmd) {
    case 'help':
    case '--help':
    case '-h':
      console.log(TRAIN_HELP)
      break

    case 'extract': {
      console.log(`\n  ${c.cyan}Building extraction pipeline...${c.reset}\n`)
      try {
        execSync('npx tsc -p tsconfig.json', { cwd: resolve(trainingDir), stdio: 'inherit' })
      } catch { /* type errors are non-fatal, tsc still emits */ }
      const extractArgs = args.slice(1).join(' ')
      const child = spawn('node', [`dist/extract-dataset.js`, ...args.slice(1)], {
        cwd: trainingDir,
        stdio: 'inherit',
      })
      child.on('close', code => process.exit(code ?? 0))
      break
    }

    case 'validate': {
      try {
        execSync('npx tsc -p tsconfig.json', { cwd: resolve(trainingDir), stdio: 'ignore' })
      } catch { /* non-fatal */ }
      const child = spawn('node', ['dist/validate-dataset.js'], {
        cwd: trainingDir,
        stdio: 'inherit',
      })
      child.on('close', code => process.exit(code ?? 0))
      break
    }

    case 'finetune':
    case 'ft': {
      const scriptPath = resolve(trainingDir, 'scripts', 'train.py')
      const pyArgs = args.slice(1)
      if (pyArgs.length === 0) pyArgs.push('--preset', 'llama3')
      const child = spawn('python3', [scriptPath, ...pyArgs], {
        cwd: trainingDir,
        stdio: 'inherit',
      })
      child.on('close', code => process.exit(code ?? 0))
      break
    }

    case 'merge': {
      const scriptPath = resolve(trainingDir, 'scripts', 'merge_lora.py')
      const child = spawn('python3', [scriptPath, ...args.slice(1)], {
        cwd: trainingDir,
        stdio: 'inherit',
      })
      child.on('close', code => process.exit(code ?? 0))
      break
    }

    case 'export':
    case 'gguf': {
      const scriptPath = resolve(trainingDir, 'scripts', 'to_gguf.py')
      const child = spawn('python3', [scriptPath, ...args.slice(1)], {
        cwd: trainingDir,
        stdio: 'inherit',
      })
      child.on('close', code => process.exit(code ?? 0))
      break
    }

    case 'serve': {
      const serverDir = resolve(trainingDir, 'openrouter')
      console.log(`\n  ${c.cyan}Starting OpenRouter provider server...${c.reset}\n`)
      const child = spawn('node', ['--loader', 'ts-node/esm', 'server.ts'], {
        cwd: serverDir,
        stdio: 'inherit',
        env: { ...process.env },
      })
      child.on('close', code => process.exit(code ?? 0))
      break
    }

    case 'status': {
      const { existsSync, readdirSync, statSync } = await import('node:fs')
      console.log(`\n  ${c.bold}$CLAWD Training Pipeline Status${c.reset}\n`)

      // Check datasets
      const dataDir = resolve(trainingDir, 'data')
      if (existsSync(resolve(dataDir, 'train.jsonl'))) {
        const stat = statSync(resolve(dataDir, 'train.jsonl'))
        console.log(`  ${c.green}✔${c.reset} Dataset extracted (${(stat.size / 1024).toFixed(0)} KB)`)
        for (const f of ['train.jsonl', 'val.jsonl', 'test.jsonl']) {
          if (existsSync(resolve(dataDir, f))) {
            const s = statSync(resolve(dataDir, f))
            console.log(`    ${f.padEnd(16)} ${(s.size / 1024).toFixed(0)} KB`)
          }
        }
      } else {
        console.log(`  ${c.yellow}○${c.reset} Dataset not yet extracted`)
        console.log(`    Run: ${c.cyan}npx solana-clawd train extract --all${c.reset}`)
      }

      // Check checkpoints
      const cpDir = resolve(trainingDir, 'checkpoints')
      if (existsSync(cpDir) && readdirSync(cpDir).length > 0) {
        console.log(`  ${c.green}✔${c.reset} Checkpoints found`)
      } else {
        console.log(`  ${c.yellow}○${c.reset} No training checkpoints`)
      }

      // Check models
      const modelsDir = resolve(trainingDir, 'models')
      if (existsSync(modelsDir)) {
        const ggufFiles = existsSync(resolve(modelsDir, 'gguf'))
          ? readdirSync(resolve(modelsDir, 'gguf')).filter(f => f.endsWith('.gguf'))
          : []
        if (ggufFiles.length > 0) {
          console.log(`  ${c.green}✔${c.reset} GGUF models exported:`)
          for (const f of ggufFiles) {
            const s = statSync(resolve(modelsDir, 'gguf', f))
            console.log(`    ${f.padEnd(30)} ${(s.size / (1024 * 1024)).toFixed(0)} MB`)
          }
        } else {
          console.log(`  ${c.yellow}○${c.reset} No GGUF models exported`)
        }
      } else {
        console.log(`  ${c.yellow}○${c.reset} No models directory`)
      }
      console.log()
      break
    }

    default:
      console.log(`  ${c.red}Unknown train subcommand: ${subcmd}${c.reset}`)
      console.log(TRAIN_HELP)
      process.exit(1)
  }
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
    case 'train':
    case 'finetune':
      await runTrain(args.slice(1))
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
