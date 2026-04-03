'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-4xl">
          {/* Logo */}
          <div className="text-8xl mb-6 animate-bounce">🐕</div>
          
          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-green-400 bg-clip-text text-transparent">
              Blockchain Buddies
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-400 mb-8">
            Solana-native trading companions with unique wallets, personalities, and trading styles
          </p>
          
          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/buddies"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 rounded-lg font-bold text-lg transition-all transform hover:scale-105"
            >
              🥚 Hatch Your First Buddy
            </Link>
            <a
              href="https://github.com/x402agent/solana-clawd"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg font-bold text-lg transition-all"
            >
              📦 View on GitHub
            </a>
          </div>
        </div>
      </div>
      
      {/* Features */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            Why Collect Blockchain Buddies?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-black/30 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">🥚</div>
              <h3 className="text-xl font-bold mb-2 text-white">Hatch & Collect</h3>
              <p className="text-gray-400">
                18 unique species from SolDog to Validator. Each buddy has randomized stats, rarity, and personality.
              </p>
            </div>
            
            <div className="bg-black/30 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2 text-white">Paper Trade</h3>
              <p className="text-gray-400">
                Each buddy has a simulated wallet. Practice trading strategies without risking real SOL.
              </p>
            </div>
            
            <div className="bg-black/30 rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-xl font-bold mb-2 text-white">Compete & Level</h3>
              <p className="text-gray-400">
                Track PnL, win rate, and level up your buddies. Build the ultimate trading team.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Species Preview */}
      <div className="py-16 px-4 bg-black/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            🐾 Meet the Species
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { emoji: '🐕', name: 'SolDog' },
              { emoji: '🦴', name: 'BONK' },
              { emoji: '🎩', name: 'WIF' },
              { emoji: '🪐', name: 'Jupiter' },
              { emoji: '🐋', name: 'Whale' },
              { emoji: '🎯', name: 'Sniper' },
              { emoji: '🐂', name: 'Bull' },
              { emoji: '🐻', name: 'Bear' },
              { emoji: '🦈', name: 'Shark' },
              { emoji: '🐙', name: 'Octopus' },
              { emoji: '🚀', name: 'PumpFun' },
              { emoji: '⚡', name: 'Validator' },
            ].map((species) => (
              <div 
                key={species.name}
                className="bg-gray-800/50 rounded-lg p-4 text-center hover:bg-gray-700/50 transition-all"
              >
                <div className="text-3xl mb-2">{species.emoji}</div>
                <div className="text-sm text-gray-300">{species.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Stats Preview */}
      <div className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8 text-white">
            📊 Trading Stats
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { stat: 'ALPHA', desc: 'Market intuition' },
              { stat: 'TIMING', desc: 'Entry precision' },
              { stat: 'CHAOS', desc: 'Risk tolerance' },
              { stat: 'RUG_DETECT', desc: 'Scam radar' },
            ].map((s) => (
              <div key={s.stat} className="bg-black/30 rounded-lg p-4">
                <div className="text-xl font-bold text-cyan-400">{s.stat}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4 text-center text-gray-500 text-sm">
        <p>🐕 Blockchain Buddies · Built with ❤️ for Solana</p>
        <p className="mt-2">
          <a href="https://github.com/x402agent/solana-clawd" className="text-purple-400 hover:underline">
            github.com/x402agent/solana-clawd
          </a>
        </p>
      </footer>
    </div>
  )
}