'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { renderBlockchainSprite, BLOCKCHAIN_SPECIES, SPECIES_DISPLAY_NAMES, type BlockchainSpecies } from '../lib/buddies'

// ─────────────────────────────────────────────────────────────────────────────
// Animated Sprite Component
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedSprite({ species, delay = 0 }: { species: BlockchainSpecies; delay?: number }) {
  const [frame, setFrame] = useState(0)
  const eyes = ['○', '●', '◎', '◉', '⊙']
  const eye = eyes[Math.floor(Math.random() * eyes.length)]
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 3)
    }, 400 + delay)
    return () => clearInterval(interval)
  }, [delay])
  
  const lines = renderBlockchainSprite(species, eye, 'none', frame)
  
  return (
    <pre className="font-mono text-[8px] leading-tight text-green-400 whitespace-pre">
      {lines.join('\n')}
    </pre>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Terminal Box Component
// ─────────────────────────────────────────────────────────────────────────────

function TerminalBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-black border border-green-900/50">
      <div className="px-3 py-1 border-b border-green-900/50 text-green-500 font-mono text-xs">
        ═══ {title} ═══
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [glitchText, setGlitchText] = useState('BLOCKCHAIN BUDDIES')
  
  // Glitch effect for title
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) {
        const chars = '█▓░▒║╔╗╚╝░▒▓█'
        const glitch = Array.from('BLOCKCHAIN BUDDIES').map(c => 
          Math.random() > 0.8 ? chars[Math.floor(Math.random() * chars.length)] : c
        ).join('')
        setGlitchText(glitch)
        setTimeout(() => setGlitchText('BLOCKCHAIN BUDDIES'), 100)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      {/* Scanline overlay */}
      <div className="pointer-events-none fixed inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)] z-50" />
      
      {/* Header */}
      <header className="border-b border-green-900/50">
        <div className="flex items-center gap-2 px-4 py-2 bg-black">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-green-500 text-xs ml-2">
            blockchain-buddies@solana:~$
          </span>
          <div className="flex-1" />
          <nav className="flex gap-6 text-xs">
            <Link href="/buddies" className="text-green-400 hover:text-green-300 hover:underline">
              [BUDDIES]
            </Link>
            <a href="https://github.com/x402agent/solana-clawd" className="text-green-400 hover:text-green-300 hover:underline">
              [GITHUB]
            </a>
          </nav>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="py-16 px-4 text-center relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />
        
        {/* Animated sprites background */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          {BLOCKCHAIN_SPECIES.slice(0, 8).map((species, i) => (
            <div 
              key={species}
              className="absolute animate-pulse"
              style={{
                left: `${10 + (i * 12)}%`,
                top: `${20 + (i % 3) * 30}%`,
                animationDelay: `${i * 0.2}s`
              }}
            >
              <AnimatedSprite species={species} delay={i * 100} />
            </div>
          ))}
        </div>
        
        <div className="relative z-10">
          {/* ASCII Logo */}
          <pre className="text-green-500 text-xs md:text-sm mb-6 leading-tight hidden md:block mx-auto w-fit">
{`
██████╗ ██╗   ██╗ ██████╗     ██████╗ ██████╗ ██████╗ ███████╗
██╔════╝ ██║   ██║██╔════╝    ██╔════╝██╔═══██╗██╔══██╗██╔════╝
███████╗ ██║   ██║██║         ██║     ██║   ██║██║  ██║█████╗  
██╔════╝ ██║   ██║██║         ██║     ██║   ██║██║  ██║██╔══╝  
██║      ╚██████╔╝╚██████╗    ╚██████╗╚██████╔╝██████╔╝███████╗
╚═╝       ╚═════╝  ╚═════╝     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
`}
          </pre>
          
          {/* Glitchy Title */}
          <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-wider">
            <span className="text-green-400">{glitchText}</span>
          </h1>
          
          {/* Subtitle */}
          <div className="text-green-500/60 text-sm md:text-base mb-8 max-w-2xl mx-auto">
            <span className="text-cyan-400">></span> Solana-native trading companions with unique wallets, 
            <br />
            personalities, and trading styles
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/buddies"
              className="px-8 py-3 bg-green-900/30 hover:bg-green-900/50 border border-green-500 text-green-400 hover:text-green-300 font-mono text-sm transition-all"
            >
              {'>'} HATCH YOUR FIRST BUDDY
            </Link>
            <a
              href="https://github.com/x402agent/solana-clawd"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-black hover:bg-gray-900 border border-green-900/50 text-green-500 hover:text-green-400 font-mono text-sm transition-all"
            >
              {'>'} VIEW SOURCE CODE
            </a>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-12 px-4 border-t border-green-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-green-500 text-xs">╔══════════════════════════════════════╗</span>
            <h2 className="text-xl font-bold text-green-400 my-2">{'>'} WHY COLLECT BUDDIES?</h2>
            <span className="text-green-500 text-xs">╚══════════════════════════════════════╝</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TerminalBox title="HATCH & COLLECT">
              <div className="space-y-3">
                <div className="text-green-500 text-xs">
                  <span className="text-cyan-400">$</span> hatch --random
                </div>
                <p className="text-green-500/70 text-xs leading-relaxed">
                  18 unique species from SolDog to Validator. 
                  Each buddy has randomized stats, rarity, and personality.
                  Find rare SHINY variants!
                </p>
                <div className="text-green-600 text-xs">
                  └── Rarity: COMMON → LEGENDARY
                </div>
              </div>
            </TerminalBox>
            
            <TerminalBox title="PAPER TRADE">
              <div className="space-y-3">
                <div className="text-green-500 text-xs">
                  <span className="text-cyan-400">$</span> trade --simulate
                </div>
                <p className="text-green-500/70 text-xs leading-relaxed">
                  Each buddy has a simulated wallet. Practice trading 
                  strategies without risking real SOL. Track PnL and win rates.
                </p>
                <div className="text-green-600 text-xs">
                  └── Risk-free learning
                </div>
              </div>
            </TerminalBox>
            
            <TerminalBox title="COMPETE & LEVEL">
              <div className="space-y-3">
                <div className="text-green-500 text-xs">
                  <span className="text-cyan-400">$</span> stats --leaderboard
                </div>
                <p className="text-green-500/70 text-xs leading-relaxed">
                  Track PnL, win rate, and level up your buddies. 
                  Build the ultimate trading team. Climb the leaderboards.
                </p>
                <div className="text-green-600 text-xs">
                  └── Level: 1 → ∞
                </div>
              </div>
            </TerminalBox>
          </div>
        </div>
      </section>
      
      {/* Species Showcase */}
      <section className="py-12 px-4 border-t border-green-900/30 bg-green-950/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-green-500 text-xs">╔══════════════════════════════════════╗</span>
            <h2 className="text-xl font-bold text-green-400 my-2">{'>'} MEET THE SPECIES</h2>
            <span className="text-green-500 text-xs">╚══════════════════════════════════════╝</span>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {BLOCKCHAIN_SPECIES.map((species) => (
              <div 
                key={species}
                className="bg-black border border-green-900/30 p-3 text-center hover:border-green-500/50 transition-all group"
              >
                <div className="mb-2 flex justify-center">
                  <AnimatedSprite species={species} delay={Math.random() * 500} />
                </div>
                <div className="text-xs text-green-500 group-hover:text-green-400 truncate">
                  {SPECIES_DISPLAY_NAMES[species]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Stats Preview */}
      <section className="py-12 px-4 border-t border-green-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-green-500 text-xs">╔══════════════════════════════════════╗</span>
            <h2 className="text-xl font-bold text-green-400 my-2">{'>'} TRADING STATS</h2>
            <span className="text-green-500 text-xs">╚══════════════════════════════════════╝</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { stat: 'ALPHA', desc: 'Market intuition', bar: '████████░░' },
              { stat: 'TIMING', desc: 'Entry precision', bar: '██████░░░░' },
              { stat: 'CHAOS', desc: 'Risk tolerance', bar: '██████████' },
              { stat: 'RUG_DETECT', desc: 'Scam radar', bar: '███████░░░' },
            ].map((s) => (
              <div key={s.stat} className="bg-black border border-green-900/30 p-4">
                <div className="text-lg font-bold text-green-400">{s.stat}</div>
                <div className="text-green-500 text-xs mb-2">{s.desc}</div>
                <div className="text-green-400 text-xs font-mono">{s.bar}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Terminal Preview */}
      <section className="py-12 px-4 border-t border-green-900/30">
        <div className="max-w-3xl mx-auto">
          <TerminalBox title="TERMINAL PREVIEW">
            <div className="font-mono text-xs space-y-1">
              <div className="text-green-500">$ help</div>
              <div className="text-green-400/80">
                {`
┌─────────────────────────────────────┐
│     BLOCKCHAIN BUDDIES CLI          │
├─────────────────────────────────────┤
│ hatch       - Hatch a new buddy     │
│ list        - List all buddies      │
│ select <id> - Select a buddy        │
│ trade       - Quick trade (selected)│
│ stats       - Show collection stats │
│ help        - Show this help        │
└─────────────────────────────────────┘
                `.trim()}
              </div>
              <div className="text-green-500 mt-2">$ hatch</div>
              <div className="text-green-400/80">> Hatching new buddy...</div>
              <div className="text-green-400/80">> HATCHED: AlphaSniper</div>
              <div className="text-green-400/80">> Species: Sniper Bot</div>
              <div className="text-green-400/80">> Rarity: RARE</div>
              <div className="text-yellow-400">> ★ SHINY BUDDY! ★</div>
            </div>
          </TerminalBox>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-green-900/30 py-8 px-4 text-center">
        <div className="font-mono text-xs space-y-2">
          <div className="text-green-500">
            ╔══════════════════════════════════════════════════════╗
          </div>
          <div className="text-green-400">
            {'>'} Blockchain Buddies · Built with ❤️ for Solana
          </div>
          <div className="text-green-500/60">
            <a href="https://github.com/x402agent/solana-clawd" className="text-cyan-400 hover:underline">
              github.com/x402agent/solana-clawd
            </a>
          </div>
          <div className="text-green-500">
            ╚══════════════════════════════════════════════════════╝
          </div>
        </div>
      </footer>
    </div>
  )
}