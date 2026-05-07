#!/usr/bin/env node
/**
 * Validate extracted JSONL dataset files.
 * Checks structure, token counts, and category distribution.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ChatTrainingExample } from './types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '..', 'data')

function readJsonl(filePath: string): ChatTrainingExample[] {
  if (!fs.existsSync(filePath)) return []
  return fs.readFileSync(filePath, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line))
}

function main() {
  console.log('\n  \x1b[36m\x1b[1m$CLAWD Dataset Validation\x1b[0m\n')

  const files = ['train.jsonl', 'val.jsonl', 'test.jsonl', 'all.jsonl']
  let hasErrors = false

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file)
    if (!fs.existsSync(filePath)) {
      console.log(`  \x1b[33m⚠\x1b[0m ${file} — not found`)
      continue
    }

    const examples = readJsonl(filePath)
    let errors = 0
    let totalChars = 0
    const roles = new Set<string>()

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i]!
      if (!ex.messages || !Array.isArray(ex.messages)) {
        console.log(`    \x1b[31m✗\x1b[0m Line ${i + 1}: missing messages array`)
        errors++
        continue
      }
      if (ex.messages.length < 2) {
        console.log(`    \x1b[31m✗\x1b[0m Line ${i + 1}: need at least 2 messages (system+user or user+assistant)`)
        errors++
        continue
      }
      for (const msg of ex.messages) {
        if (!msg.role || !msg.content) {
          console.log(`    \x1b[31m✗\x1b[0m Line ${i + 1}: message missing role or content`)
          errors++
        }
        roles.add(msg.role)
        totalChars += msg.content.length
      }
    }

    const estimatedTokens = Math.round(totalChars / 3.5)
    const status = errors === 0 ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✗\x1b[0m'

    console.log(`  ${status} ${file.padEnd(14)} ${examples.length} examples, ~${estimatedTokens.toLocaleString()} tokens${errors > 0 ? `, ${errors} errors` : ''}`)
    if (errors > 0) hasErrors = true
  }

  // Check all.jsonl for category distribution
  const allPath = path.join(DATA_DIR, 'all.jsonl')
  if (fs.existsSync(allPath)) {
    const all = readJsonl(allPath)
    console.log('\n  \x1b[1mSample distribution:\x1b[0m')

    // Count by first user message keyword
    const categories: Record<string, number> = {}
    for (const ex of all) {
      const userMsg = ex.messages.find(m => m.role === 'user')
      if (!userMsg) continue
      const firstWord = userMsg.content.split(/[\s?!.]/)[0]!.toLowerCase()
      categories[firstWord] = (categories[firstWord] ?? 0) + 1
    }

    const avgLen = all.reduce((sum, ex) => {
      const assistantMsg = ex.messages.find(m => m.role === 'assistant')
      return sum + (assistantMsg?.content.length ?? 0)
    }, 0) / all.length

    console.log(`    Average assistant response: ${Math.round(avgLen)} chars (~${Math.round(avgLen / 3.5)} tokens)`)
    console.log(`    Unique question starters: ${Object.keys(categories).length}`)
  }

  console.log()
  if (hasErrors) {
    console.log('  \x1b[31mValidation failed — fix errors above\x1b[0m\n')
    process.exit(1)
  } else {
    console.log('  \x1b[32mAll files valid!\x1b[0m\n')
  }
}

main()
