#!/usr/bin/env npx tsx
/**
 * Blockchain Buddies Demo
 * 
 * A fun demo showing off the Solana-native trading companions.
 * Each buddy has a unique wallet, personality, and trading style.
 * 
 * Run: npx tsx examples/blockchain-buddies-demo.ts
 */

import {
  createBlockchainBuddy,
  simulateTrade,
  formatBuddyCard,
  formatBuddyCompact,
  BuddyCollection,
  renderBlockchainSprite,
  BLOCKCHAIN_SPECIES,
  SPECIES_DISPLAY_NAMES,
  type BlockchainBuddy,
  type BlockchainSpecies,
} from '../src/buddy/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// ASCII Art Banner
// ─────────────────────────────────────────────────────────────────────────────

const BANNER = `
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║                                                                           ║
  ║   ██████╗ ██╗███╗   ██╗████████╗ █████╗ ██╗     ██╗     ██████╗ ███████╗ ║
  ║   ██╔══██╗██║████╗  ██║╚══██╔══╝██╔══██╗██║     ██║     ██╔══██╗██╔════╝ ║
  ║   ██████╔╝██║██╔██╗ ██║   ██║   ███████║██║     ██║     ██████╔╝█████╗   ║
  ║   ██╔══██╗██║██║╚██╗██║   ██║   ██╔══██║██║     ██║     ██╔══██╗██╔══╝   ║
  ║   ██████╔╝██║██║ ╚████║   ██║   ██║  ██║███████╗███████╗██║  ██║███████╗ ║
  ║   ╚═════╝ ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝ ║
  ║                                                                           ║
  ║              🐕 Solana-Native Trading Companions 🐕                       ║
  ║                                                                           ║
  ╚═══════════════════════════════════════════════════════════════════════════╝
`

// ─────────────────────────────────────────────────────────────────────────────
// Demo Functions
// ─────────────────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function clearScreen() {
  console.clear()
}

async function typeText(text: string, speed = 20) {
  for (const char of text) {
    process.stdout.write(char)
    await delay(speed)
  }
}

function printSprite(buddy: BlockchainBuddy) {
  const frames = renderBlockchainSprite(buddy.species, buddy.eye, buddy.hat, 0)
  console.log('\n')
  for (const line of frames) {
    console.log('        ' + line)
  }
  console.log('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Demo
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  clearScreen()
  console.log(BANNER)
  await delay(500)
  
  // ── Hatch a random buddy ───────────────────────────────────────────────────
  console.log('🎮  Hatching a new Blockchain Buddy...\n')
  await delay(300)
  
  const randomSpecies = BLOCKCHAIN_SPECIES[Math.floor(Math.random() * BLOCKCHAIN_SPECIES.length)]!
  const buddy = createBlockchainBuddy(randomSpecies as BlockchainSpecies, {
    initialSolBalance: 5.0,
  })
  
  // Show the buddy sprite
  printSprite(buddy)
  
  await typeText(`✨ A wild ${SPECIES_DISPLAY_NAMES[buddy.species]} appeared!\n`, 15)
  await delay(200)
  
  // Show buddy card
  console.log(formatBuddyCard(buddy))
  await delay(500)
  
  // ── Show buddy details ─────────────────────────────────────────────────────
  console.log('\n📋  Buddy Details:')
  console.log('─'.repeat(50))
  console.log(`   Name: ${buddy.name}`)
  console.log(`   Species: ${buddy.species}`)
  console.log(`   Rarity: ${buddy.rarity.toUpperCase()}`)
  console.log(`   Level: ${buddy.level}`)
  console.log(`   Personality: ${buddy.personality.replace('_', ' ').toUpperCase()}`)
  console.log(`   Trading Style: ${buddy.tradingStyle}`)
  console.log(`   Catchphrase: "${buddy.catchphrase}"`)
  console.log(`   Shiny: ${buddy.shiny ? '✨ YES!' : 'No'}`)
  console.log('─'.repeat(50))
  await delay(500)
  
  // ── Show wallet info ───────────────────────────────────────────────────────
  console.log('\n💰  Wallet Info:')
  console.log('─'.repeat(50))
  console.log(`   Address: ${buddy.wallet.address}`)
  console.log(`   SOL Balance: ${buddy.wallet.solBalance.toFixed(4)} SOL`)
  console.log(`   Simulated: ${buddy.wallet.isSimulated ? 'Yes (Paper Trading)' : 'No (Real Wallet)'}`)
  console.log('─'.repeat(50))
  await delay(500)
  
  // ── Show stats ─────────────────────────────────────────────────────────────
  console.log('\n📊  Trading Stats:')
  console.log('─'.repeat(50))
  
  const statBars = Object.entries(buddy.stats).map(([stat, value]) => {
    const bar = '█'.repeat(Math.floor(value / 10)) + '░'.repeat(10 - Math.floor(value / 10))
    return `   ${stat.padEnd(10)} [${bar}] ${value}`
  })
  
  for (const bar of statBars) {
    console.log(bar)
    await delay(100)
  }
  console.log('─'.repeat(50))
  
  // ── Simulate some trades ───────────────────────────────────────────────────
  console.log('\n🔄  Simulating Trades...\n')
  await delay(300)
  
  const tokens = [
    { mint: 'DezXAZ8z7PnrnRJjz4wP5KnJLmP5Yh6Y', symbol: 'BONK', priceUsd: 0.000028 },
    { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', priceUsd: 1.0 },
    { mint: 'JUPyiwrYJFskUPiHa7hkeR8EdUtjdQPJK3jXpNA36iT', symbol: 'JUP', priceUsd: 1.2 },
  ]
  
  for (let i = 0; i < 3; i++) {
    const token = tokens[i % tokens.length]!
    const amountSol = Math.random() * 0.5 + 0.1
    
    console.log(`\n   Trade ${i + 1}: Buying ${token.symbol}...`)
    await delay(200)
    
    const trade = simulateTrade(buddy, {
      type: 'buy',
      tokenMint: token.mint,
      tokenSymbol: token.symbol,
      amountSol,
      amountTokens: amountSol / token.priceUsd,
      priceUsd: token.priceUsd,
    })
    
    if (trade.success) {
      console.log(`   ✅ Success! Spent ${amountSol.toFixed(4)} SOL`)
      if (trade.pnlUsd) {
        const pnlStr = trade.pnlUsd >= 0 
          ? `+$${trade.pnlUsd.toFixed(2)}` 
          : `-$${Math.abs(trade.pnlUsd).toFixed(2)}`
        console.log(`   📈 PnL: ${pnlStr}`)
      }
    } else {
      console.log(`   ❌ Failed - Insufficient balance`)
    }
    
    await delay(300)
  }
  
  // ── Show final stats ───────────────────────────────────────────────────────
  console.log('\n\n📊  Final Stats:')
  console.log('─'.repeat(50))
  console.log(`   Total Trades: ${buddy.wallet.tradeCount}`)
  console.log(`   Win Rate: ${(buddy.wallet.winRate * 100).toFixed(1)}%`)
  console.log(`   Total PnL: ${buddy.wallet.totalPnlUsd >= 0 ? '+' : ''}$${buddy.wallet.totalPnlUsd.toFixed(2)}`)
  console.log(`   SOL Balance: ${buddy.wallet.solBalance.toFixed(4)} SOL`)
  console.log('─'.repeat(50))
  
  // ── Create a collection ────────────────────────────────────────────────────
  console.log('\n\n🎒  Creating a Buddy Collection...\n')
  await delay(300)
  
  const collection = new BuddyCollection()
  collection.add(buddy)
  
  // Add more buddies
  const speciesList: BlockchainSpecies[] = ['soldog', 'bonk', 'wif', 'jupiter', 'whale', 'sniper']
  for (const species of speciesList) {
    const newBuddy = createBlockchainBuddy(species, {
      initialSolBalance: Math.random() * 5 + 1,
    })
    collection.add(newBuddy)
    console.log(`   ✨ Added ${formatBuddyCompact(newBuddy)}`)
    await delay(100)
  }
  
  // ── Show leaderboard ───────────────────────────────────────────────────────
  console.log('\n\n🏆  Top Traders Leaderboard:')
  console.log('═'.repeat(50))
  
  const topTraders = collection.getTopTraders(5)
  for (let i = 0; i < topTraders.length; i++) {
    const b = topTraders[i]!
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '
    console.log(`   ${medal} ${formatBuddyCompact(b)}`)
  }
  
  console.log('\n' + '═'.repeat(50))
  console.log(`   Collection Total PnL: ${collection.getTotalPnl() >= 0 ? '+' : ''}$${collection.getTotalPnl().toFixed(2)}`)
  console.log(`   Collection Total SOL: ${collection.getTotalSol().toFixed(4)} SOL`)
  console.log('═'.repeat(50))
  
  // ── Outro ──────────────────────────────────────────────────────────────────
  console.log('\n\n')
  console.log('  ╔═════════════════════════════════════════════════════════════════════╗')
  console.log('  ║                                                                     ║')
  console.log('  ║   🚀 Thanks for checking out Blockchain Buddies!                    ║')
  console.log('  ║                                                                     ║')
  console.log('  ║   Each buddy has a unique wallet and trading personality.           ║')
  console.log('  ║   Collect them all and build your trading team!                    ║')
  console.log('  ║                                                                     ║')
  console.log('  ║   GitHub: github.com/x402agent/solana-clawd                        ║')
  console.log('  ║                                                                     ║')
  console.log('  ╚═════════════════════════════════════════════════════════════════════╝')
  console.log('\n')
}

// Run the demo
main().catch(console.error)