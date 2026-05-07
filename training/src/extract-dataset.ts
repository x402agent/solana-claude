#!/usr/bin/env node
/**
 * Dataset Extraction Pipeline for Solana CLAWD GGUF Training
 *
 * Extracts trading knowledge from the codebase into instruction-tuning JSONL
 * suitable for fine-tuning LLMs on Solana AI agent trading behavior.
 *
 * Usage:
 *   node dist/extract-dataset.js              # extract all
 *   node dist/extract-dataset.js --validate   # dry-run, print stats
 *   node dist/extract-dataset.js --all        # include synthetic scenarios
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractToolPairs } from './extractors/tools.js'
import { extractBuddyPairs } from './extractors/buddy.js'
import { extractPumpPairs } from './extractors/pump.js'
import { extractOodaPairs } from './extractors/ooda.js'
import { extractRiskPairs } from './extractors/risk.js'
import { extractMemoryPairs } from './extractors/memory.js'
import { extractScenarios } from './extractors/scenarios.js'
import type { InstructionPair, ChatTrainingExample } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const DATA_DIR = path.resolve(__dirname, '..', 'data')

const SYSTEM_PROMPT = `You are solana-clawd, an AI-powered Solana trading agent with 37 MCP tools for on-chain analysis, trading, and portfolio management. You use the OODA loop (Observe-Orient-Decide-Act) methodology for trading decisions. You operate with three memory tiers: KNOWN (verified on-chain data), LEARNED (persistent trade patterns), and INFERRED (tentative signals). You never execute trades without explicit permission. You specialize in Pump.fun bonding curves, Jupiter/Raydium DEX aggregation, Helius on-chain data, and multi-agent coordination.`

function toChatFormat(pair: InstructionPair): ChatTrainingExample {
  const messages: ChatTrainingExample['messages'] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ]
  if (pair.input) {
    messages.push({ role: 'user', content: `${pair.instruction}\n\nContext: ${pair.input}` })
  } else {
    messages.push({ role: 'user', content: pair.instruction })
  }
  messages.push({ role: 'assistant', content: pair.output })
  return { messages }
}

function dedup(pairs: InstructionPair[]): InstructionPair[] {
  const seen = new Set<string>()
  return pairs.filter(p => {
    const key = p.instruction.toLowerCase().trim().replace(/\s+/g, ' ')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function splitDataset<T>(items: T[], trainRatio = 0.85, valRatio = 0.10): { train: T[], val: T[], test: T[] } {
  const shuffled = [...items].sort(() => Math.random() - 0.5)
  const trainEnd = Math.floor(shuffled.length * trainRatio)
  const valEnd = trainEnd + Math.floor(shuffled.length * valRatio)
  return {
    train: shuffled.slice(0, trainEnd),
    val: shuffled.slice(trainEnd, valEnd),
    test: shuffled.slice(valEnd),
  }
}

function writeJsonl(entries: ChatTrainingExample[], filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n'
  fs.writeFileSync(filePath, lines, 'utf-8')
}

async function main() {
  const args = process.argv.slice(2)
  const validateOnly = args.includes('--validate')
  const includeAll = args.includes('--all')

  console.log('\n  \x1b[36m\x1b[1m$CLAWD Training Data Extraction\x1b[0m\n')
  console.log(`  Repo root: ${REPO_ROOT}`)
  console.log(`  Output:    ${DATA_DIR}\n`)

  // Run all extractors
  const extractors = [
    { name: 'MCP Tools', fn: () => extractToolPairs(REPO_ROOT) },
    { name: 'Buddy System', fn: () => extractBuddyPairs(REPO_ROOT) },
    { name: 'Pump.fun DeFi', fn: () => extractPumpPairs(REPO_ROOT) },
    { name: 'OODA Trading', fn: () => extractOodaPairs(REPO_ROOT) },
    { name: 'Risk Assessment', fn: () => extractRiskPairs(REPO_ROOT) },
    { name: 'Memory System', fn: () => extractMemoryPairs(REPO_ROOT) },
  ]

  if (includeAll) {
    extractors.push({ name: 'Scenarios', fn: () => extractScenarios(REPO_ROOT) })
  }

  let allPairs: InstructionPair[] = []
  for (const { name, fn } of extractors) {
    const pairs = await fn()
    console.log(`  \x1b[32m✔\x1b[0m ${name.padEnd(20)} ${pairs.length} pairs`)
    allPairs.push(...pairs)
  }

  // Deduplicate
  const before = allPairs.length
  allPairs = dedup(allPairs)
  console.log(`\n  Total: ${allPairs.length} pairs (${before - allPairs.length} duplicates removed)`)

  // Category breakdown
  const categories: Record<string, number> = {}
  for (const p of allPairs) {
    categories[p.category] = (categories[p.category] ?? 0) + 1
  }
  console.log('\n  \x1b[1mBy category:\x1b[0m')
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat.padEnd(22)} ${count}`)
  }

  // Estimate tokens
  const totalChars = allPairs.reduce((sum, p) => sum + p.instruction.length + p.output.length + (p.input?.length ?? 0), 0)
  console.log(`\n  Estimated tokens: ~${Math.round(totalChars / 3.5).toLocaleString()}`)

  if (validateOnly) {
    console.log('\n  \x1b[33m⚠ Dry run — no files written\x1b[0m\n')
    return
  }

  // Convert to chat format and split
  const chatExamples = allPairs.map(toChatFormat)
  const { train, val, test } = splitDataset(chatExamples)

  writeJsonl(train, path.join(DATA_DIR, 'train.jsonl'))
  writeJsonl(val, path.join(DATA_DIR, 'val.jsonl'))
  writeJsonl(test, path.join(DATA_DIR, 'test.jsonl'))
  writeJsonl(chatExamples, path.join(DATA_DIR, 'all.jsonl'))

  console.log(`\n  \x1b[32m✔\x1b[0m Written to ${DATA_DIR}/`)
  console.log(`    train.jsonl  ${train.length} examples`)
  console.log(`    val.jsonl    ${val.length} examples`)
  console.log(`    test.jsonl   ${test.length} examples`)
  console.log()
}

main().catch(err => {
  console.error(`\n  \x1b[31mError: ${err.message}\x1b[0m\n`)
  process.exit(1)
})
