'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  createBlockchainBuddy,
  renderBlockchainSprite,
  BLOCKCHAIN_SPECIES,
  SPECIES_DISPLAY_NAMES,
  type BlockchainBuddy,
  type BlockchainSpecies,
} from '../../lib/buddies'

// ─────────────────────────────────────────────────────────────────────────────
// Terminal Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function generateRandomBuddy(): BlockchainBuddy {
  const species = pickRandom(BLOCKCHAIN_SPECIES)
  return createBlockchainBuddy(species as BlockchainSpecies, {
    initialSolBalance: Math.random() * 10 + 1,
  })
}

function formatSol(n: number): string {
  return n.toFixed(4)
}

function formatPnl(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}$${n.toFixed(2)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Terminal Components
// ─────────────────────────────────────────────────────────────────────────────

function TerminalHeader() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-black border-b border-green-900/50">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
      </div>
      <span className="text-green-500 text-xs font-mono ml-2">
        blockchain-buddies@solana:~$
      </span>
    </div>
  )
}

function TerminalOutput({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-mono text-sm text-green-400 ${className}`}>
      {children}
    </div>
  )
}

function AsciiSprite({ species, eye, hat, frame = 0, shiny = false }: {
  species: BlockchainSpecies
  eye: string
  hat: string
  frame?: number
  shiny?: boolean
}) {
  const lines = renderBlockchainSprite(species, eye, hat, frame)
  return (
    <pre className={`font-mono text-[10px] leading-tight ${shiny ? 'text-yellow-400' : 'text-green-400'}`}>
      {lines.join('\n')}
    </pre>
  )
}

function StatBar({ label, value }: { label: string; value: number }) {
  const filled = Math.floor(value / 10)
  const empty = 10 - filled
  const color = value >= 80 ? '█' : value >= 50 ? '▓' : '░'
  const colorClass = value >= 80 ? 'text-green-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400'
  
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="w-16 text-gray-500 uppercase">{label}</span>
      <span className={colorClass}>
        {[...Array(filled)].map((_, i) => (
          <span key={i}>{color}</span>
        ))}
        {[...Array(empty)].map((_, i) => (
          <span key={i} className="text-gray-700">·</span>
        ))}
      </span>
      <span className="text-gray-600">{value}</span>
    </div>
  )
}

function BuddyTerminalCard({ buddy, onSelect, isSelected }: { 
  buddy: BlockchainBuddy
  onSelect: (id: string) => void
  isSelected: boolean 
}) {
  const [frame, setFrame] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 3)
    }, 600)
    return () => clearInterval(interval)
  }, [])
  
  const rarityBorders: Record<string, string> = {
    common: 'border-gray-700',
    uncommon: 'border-green-600',
    rare: 'border-blue-500',
    epic: 'border-purple-500',
    legendary: 'border-yellow-500',
  }
  
  const pnlColor = buddy.wallet.totalPnlUsd >= 0 ? 'text-green-400' : 'text-red-400'
  
  return (
    <div 
      onClick={() => onSelect(buddy.id)}
      className={`bg-black border ${rarityBorders[buddy.rarity]} ${isSelected ? 'ring-1 ring-green-500' : ''} p-3 cursor-pointer hover:bg-gray-900/50 transition-all`}
    >
      <div className="flex gap-3">
        {/* Sprite */}
        <div className="flex-shrink-0 bg-black border border-gray-800 p-1">
          <AsciiSprite 
            species={buddy.species} 
            eye={buddy.eye} 
            hat={buddy.hat}
            frame={frame}
            shiny={buddy.shiny}
          />
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-green-300 text-sm truncate">{buddy.name}</span>
            {buddy.shiny && <span className="text-yellow-400 text-xs">★SHINY★</span>}
          </div>
          
          <div className="text-gray-500 text-xs mb-1">
            [{buddy.rarity.toUpperCase()}] {SPECIES_DISPLAY_NAMES[buddy.species]} Lv.{buddy.level}
          </div>
          
          <div className="text-cyan-400 text-xs italic mb-2">
            &quot;{buddy.catchphrase}&quot;
          </div>
          
          <div className="flex gap-4 text-xs mb-2">
            <span className="text-gray-400">
              SOL: <span className="text-white">{formatSol(buddy.wallet.solBalance)}</span>
            </span>
            <span className={pnlColor}>
              PnL: {formatPnl(buddy.wallet.totalPnlUsd)}
            </span>
            <span className="text-gray-400">
              WR: <span className="text-white">{(buddy.wallet.winRate * 100).toFixed(0)}%</span>
            </span>
          </div>
          
          <div className="space-y-0.5">
            <StatBar label="ALPHA" value={buddy.stats.ALPHA} />
            <StatBar label="TIMING" value={buddy.stats.TIMING} />
            <StatBar label="CHAOS" value={buddy.stats.CHAOS} />
          </div>
        </div>
      </div>
    </div>
  )
}

function CommandInput({ onCommand }: { onCommand: (cmd: string) => void }) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onCommand(input.trim().toLowerCase())
      setInput('')
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 bg-black border-t border-green-900/50">
      <span className="text-green-500 font-mono text-sm">$</span>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="type 'help' for commands..."
        className="flex-1 bg-transparent text-green-400 font-mono text-sm outline-none placeholder-gray-600"
        spellCheck={false}
        autoComplete="off"
      />
    </form>
  )
}

function TerminalLog({ messages }: { messages: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages])
  
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
      {messages.map((msg, i) => (
        <div key={i} className="text-green-500/80 whitespace-pre-wrap">{msg}</div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Terminal Page
// ─────────────────────────────────────────────────────────────────────────────

export default function BuddiesTerminalPage() {
  const [buddies, setBuddies] = useState<BlockchainBuddy[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([
    '> Blockchain Buddies Terminal v1.0.0',
    '> Connected to Solana devnet (simulated)',
    '> Type "help" for available commands',
    '',
  ])
  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-100), msg])
  }, [])
  
  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('blockchain-buddies')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setBuddies(data.map((b: any) => ({
          ...b,
          wallet: {
            ...b.wallet,
            tokenBalances: new Map(b.wallet.tokenBalances || []),
          },
        })))
        addLog(`> Loaded ${data.length} buddies from storage`)
      } catch (e) {
        addLog('> ERROR: Failed to load buddies')
      }
    }
  }, [addLog])
  
  // Save to localStorage
  useEffect(() => {
    if (buddies.length > 0) {
      const data = buddies.map(b => ({
        ...b,
        wallet: {
          ...b.wallet,
          tokenBalances: Array.from(b.wallet.tokenBalances.entries()),
        },
      }))
      localStorage.setItem('blockchain-buddies', JSON.stringify(data))
    }
  }, [buddies])
  
  const handleCommand = useCallback((cmd: string) => {
    const parts = cmd.split(' ')
    const action = parts[0]
    
    addLog(`$ ${cmd}`)
    
    switch (action) {
      case 'help':
        addLog('')
        addLog('┌─────────────────────────────────────┐')
        addLog('│     BLOCKCHAIN BUDDIES CLI          │')
        addLog('├─────────────────────────────────────┤')
        addLog('│ hatch       - Hatch a new buddy     │')
        addLog('│ list        - List all buddies      │')
        addLog('│ select <id> - Select a buddy        │')
        addLog('│ trade       - Quick trade (selected)│')
        addLog('│ stats       - Show collection stats │')
        addLog('│ clear       - Clear all buddies     │')
        addLog('│ help        - Show this help        │')
        addLog('└─────────────────────────────────────┘')
        addLog('')
        break
        
      case 'hatch':
        addLog('> Hatching new buddy...')
        setTimeout(() => {
          const newBuddy = generateRandomBuddy()
          setBuddies(prev => [...prev, newBuddy])
          addLog(`> HATCHED: ${newBuddy.name}`)
          addLog(`> Species: ${SPECIES_DISPLAY_NAMES[newBuddy.species]}`)
          addLog(`> Rarity:  ${newBuddy.rarity.toUpperCase()}`)
          if (newBuddy.shiny) addLog('> ★ SHINY BUDDY! ★')
          addLog('')
        }, 300)
        break
        
      case 'list':
        if (buddies.length === 0) {
          addLog('> No buddies yet. Use "hatch" to create one.')
        } else {
          addLog('')
          addLog('┌────────────────────────────────────────────────────┐')
          addLog('│ ID         │ NAME            │ SPECIES    │ PnL      │')
          addLog('├────────────────────────────────────────────────────┤')
          buddies.forEach((b, i) => {
            const id = b.id.slice(0, 8).padEnd(10)
            const name = b.name.slice(0, 15).padEnd(16)
            const species = SPECIES_DISPLAY_NAMES[b.species].slice(0, 10).padEnd(11)
            const pnl = formatPnl(b.wallet.totalPnlUsd).padStart(8)
            addLog(`│ ${id}│ ${name}│ ${species}│ ${pnl} │`)
          })
          addLog('└────────────────────────────────────────────────────┘')
          addLog('')
        }
        break
        
      case 'select':
        const selectId = parts[1]
        if (!selectId) {
          addLog('> Usage: select <id>')
        } else {
          const buddy = buddies.find(b => b.id.startsWith(selectId))
          if (buddy) {
            setSelectedId(buddy.id)
            addLog(`> Selected: ${buddy.name}`)
          } else {
            addLog(`> ERROR: Buddy "${selectId}" not found`)
          }
        }
        break
        
      case 'trade':
        const selected = buddies.find(b => b.id === selectedId)
        if (!selected) {
          addLog('> ERROR: No buddy selected. Use "select <id>" first.')
        } else {
          addLog(`> ${selected.name} executing trade...`)
          const tokens = ['BONK', 'USDC', 'JUP', 'WIF', 'PEPE']
          const token = pickRandom(tokens)
          const amount = (Math.random() * 0.5 + 0.1).toFixed(4)
          addLog(`> BUY ${amount} SOL worth of ${token}`)
          
          // Simulate trade result
          const win = Math.random() > 0.4
          const pnl = win ? (Math.random() * 50 + 5) : -(Math.random() * 30 + 5)
          
          setTimeout(() => {
            if (win) {
              addLog(`> SUCCESS! +$${pnl.toFixed(2)} profit`)
            } else {
              addLog(`> REKT! -$${Math.abs(pnl).toFixed(2)} loss`)
            }
            addLog('')
            
            // Update buddy
            setBuddies(prev => prev.map(b => {
              if (b.id === selectedId) {
                return {
                  ...b,
                  wallet: {
                    ...b.wallet,
                    totalPnlUsd: b.wallet.totalPnlUsd + pnl,
                    tradeCount: b.wallet.tradeCount + 1,
                    winRate: (b.wallet.winRate * b.wallet.tradeCount + (win ? 1 : 0)) / (b.wallet.tradeCount + 1),
                  }
                }
              }
              return b
            }))
          }, 500)
        }
        break
        
      case 'stats':
        const totalSol = buddies.reduce((s, b) => s + b.wallet.solBalance, 0)
        const totalPnl = buddies.reduce((s, b) => s + b.wallet.totalPnlUsd, 0)
        const totalTrades = buddies.reduce((s, b) => s + b.wallet.tradeCount, 0)
        const avgWinRate = buddies.length > 0 
          ? buddies.reduce((s, b) => s + b.wallet.winRate, 0) / buddies.length 
          : 0
        
        addLog('')
        addLog('┌─────────────────────────────────┐')
        addLog('│      COLLECTION STATISTICS      │')
        addLog('├─────────────────────────────────┤')
        addLog(`│ Buddies:     ${String(buddies.length).padStart(5)}             │`)
        addLog(`│ Total SOL:   ${totalSol.toFixed(2).padStart(5)}             │`)
        addLog(`│ Total PnL:   ${formatPnl(totalPnl).padStart(5)}             │`)
        addLog(`│ Total Trades:${String(totalTrades).padStart(5)}             │`)
        addLog(`│ Avg Win Rate:${(avgWinRate * 100).toFixed(0).padStart(4)}%            │`)
        addLog('└─────────────────────────────────┘')
        addLog('')
        break
        
      case 'clear':
        if (confirm('Release all buddies?')) {
          setBuddies([])
          setSelectedId(null)
          localStorage.removeItem('blockchain-buddies')
          addLog('> All buddies released.')
        }
        break
        
      default:
        addLog(`> Unknown command: ${action}`)
        addLog('> Type "help" for available commands')
    }
  }, [buddies, selectedId, addLog])
  
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <TerminalHeader />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Buddy List */}
        <div className="w-80 border-r border-green-900/30 flex flex-col bg-black">
          <div className="px-3 py-2 border-b border-green-900/30 text-green-500 font-mono text-xs">
            ═══ BUDDIES [{buddies.length}] ═══
          </div>
          <div className="flex-1 overflow-y-auto">
            {buddies.length === 0 ? (
              <div className="p-4 text-center text-gray-600 font-mono text-xs">
                No buddies yet.
                <br />
                Type &quot;hatch&quot; below.
              </div>
            ) : (
              <div className="divide-y divide-gray-900">
                {buddies.map(buddy => (
                  <BuddyTerminalCard
                    key={buddy.id}
                    buddy={buddy}
                    onSelect={setSelectedId}
                    isSelected={buddy.id === selectedId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel - Terminal */}
        <div className="flex-1 flex flex-col bg-black">
          <div className="px-3 py-2 border-b border-green-900/30 text-green-500 font-mono text-xs">
            ═══ TERMINAL ═══
          </div>
          <TerminalLog messages={logs} />
          <CommandInput onCommand={handleCommand} />
        </div>
      </div>
      
      {/* Footer Status Bar */}
      <div className="px-3 py-1 bg-black border-t border-green-900/30 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            BUDDIES: <span className="text-green-400">{buddies.length}</span>
          </span>
          <span className="text-gray-600">
            SELECTED: <span className="text-cyan-400">{selectedId ? buddies.find(b => b.id === selectedId)?.name : 'none'}</span>
          </span>
        </div>
        <div className="text-gray-600">
          Solana Devnet (Simulated) | <span className="text-green-400">●</span> Connected
        </div>
      </div>
    </div>
  )
}
