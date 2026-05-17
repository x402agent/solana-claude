import React, { useRef, useEffect, useState, useCallback, KeyboardEvent } from 'react'
import { useBackroomStore, AgentMessage } from '../store'
import { useStream } from '../hooks/useStream'

const AGENT_COLORS: Record<number, string> = {
  1: '#4fc3f7',
  2: '#ff8a65',
  3: '#ef5350',
  0: '#a3e635', // human
}

const AGENT_ICONS: Record<number, string> = {
  1: '🤖',
  2: '👾',
  3: '🦞',
  0: '🧑',
}

function TypingDots({ color }: { color: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 4 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
            animation: `blink 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
    </span>
  )
}

function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isHuman = msg.agentId === (0 as any)
  const color = AGENT_COLORS[msg.agentId as number] ?? '#888'
  const icon = AGENT_ICONS[msg.agentId as number] ?? '❓'

  return (
    <div style={{
      display: 'flex',
      flexDirection: isHuman ? 'row-reverse' : 'row',
      gap: 8,
      marginBottom: 10,
      alignItems: 'flex-start',
    }}>
      <div style={{
        flexShrink: 0,
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: `${color}22`,
        border: `1px solid ${color}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
      }}>
        {icon}
      </div>
      <div style={{ maxWidth: '78%' }}>
        <div style={{
          fontSize: 9,
          color: color,
          marginBottom: 3,
          textAlign: isHuman ? 'right' : 'left',
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}>
          {msg.agentName} · turn {msg.turn}
        </div>
        <div style={{
          background: isHuman ? `${color}18` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${color}30`,
          borderRadius: isHuman ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
          padding: '8px 12px',
          fontSize: 12,
          lineHeight: 1.55,
          color: '#e2e8f0',
          wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator({ agentId }: { agentId: number }) {
  const color = AGENT_COLORS[agentId] ?? '#888'
  const icon = AGENT_ICONS[agentId] ?? '❓'
  const names = { 1: 'The Analyst', 2: 'The Satirist', 3: 'Clawd' } as Record<number, string>

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, opacity: 0.75 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: `${color}22`, border: `1px solid ${color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`,
        borderRadius: '2px 12px 12px 12px', padding: '8px 14px', fontSize: 12, color: color,
      }}>
        {names[agentId] ?? `Agent ${agentId}`} is thinking
        <TypingDots color={color} />
      </div>
    </div>
  )
}

export default function LiveStreamPanel() {
  const { messages } = useBackroomStore()
  const { connected, typingAgent, sendHuman } = useStream(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typingAgent, collapsed])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setSendError(null)
    try {
      await sendHuman(text)
      setInput('')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'send failed')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, sending, sendHuman])

  const handleKey = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const dotColor = connected ? '#4ade80' : '#f87171'

  if (collapsed) {
    return (
      <>
        <div style={{
          position: 'fixed', bottom: '1rem', right: '1rem',
          zIndex: 30, display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: dotColor,
            boxShadow: `0 0 6px ${dotColor}`,
            animation: connected ? 'pulse 2s infinite' : 'none',
          }} />
          <button
            onClick={() => setCollapsed(false)}
            style={{
              padding: '6px 14px', borderRadius: 20,
              border: '1px solid rgba(255,255,255,.15)',
              background: 'rgba(10,10,10,.85)', color: '#ccc',
              fontSize: 12, cursor: 'pointer',
              backdropFilter: 'blur(8px)', fontFamily: 'monospace',
            }}
          >
            💬 {messages.length} · {connected ? 'live' : 'disconnected'}
          </button>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      </>
    )
  }

  return (
    <>
      <style>{`
        @keyframes blink { 0%,80%,100% { opacity:0 } 40% { opacity:1 } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
        .stream-scroll::-webkit-scrollbar { width: 4px }
        .stream-scroll::-webkit-scrollbar-track { background: transparent }
        .stream-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px }
      `}</style>
      <div style={{
        position: 'fixed', bottom: '1rem', right: '1rem',
        width: 380, maxHeight: '72vh',
        background: 'rgba(8,8,18,0.93)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 12,
        backdropFilter: 'blur(14px)',
        display: 'flex', flexDirection: 'column',
        fontFamily: '"JetBrains Mono", "Courier New", monospace',
        zIndex: 30,
        boxShadow: '0 8px 32px rgba(0,0,0,.6)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,.08)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: dotColor,
              boxShadow: `0 0 6px ${dotColor}`,
              animation: connected ? 'pulse 2s infinite' : 'none',
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.05em' }}>
              INFINITE BACKROOM
            </span>
            <span style={{ fontSize: 9, color: '#64748b' }}>
              {connected ? 'live' : 'reconnecting…'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#475569' }}>{messages.length} msgs</span>
            <button
              onClick={() => setCollapsed(true)}
              style={{
                background: 'none', border: 'none', color: '#475569',
                fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0,
              }}
            >×</button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="stream-scroll"
          style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 6px' }}
        >
          {messages.length === 0 && (
            <div style={{
              color: '#334155', textAlign: 'center', padding: '24px 0',
              fontSize: 11, fontStyle: 'italic',
            }}>
              {connected ? 'Waiting for the first words…' : 'Connecting to the backroom…'}
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {typingAgent && <TypingIndicator agentId={typingAgent} />}
        </div>

        {/* Input */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,.06)',
          padding: '8px 10px',
          flexShrink: 0,
        }}>
          {sendError && (
            <div style={{ fontSize: 10, color: '#f87171', marginBottom: 4 }}>{sendError}</div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ color: '#a3e635', fontSize: 12, alignSelf: 'center' }}>🧑</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="interrupt the conversation…"
              disabled={sending || !connected}
              maxLength={2000}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 6,
                color: '#e2e8f0',
                fontFamily: 'inherit',
                fontSize: 12,
                padding: '6px 10px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim() || !connected}
              style={{
                background: sending || !connected ? 'rgba(163,230,53,.1)' : 'rgba(163,230,53,.2)',
                border: '1px solid rgba(163,230,53,.4)',
                borderRadius: 6,
                color: '#a3e635',
                cursor: sending || !connected ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                fontSize: 11,
                padding: '6px 12px',
                transition: 'background 0.15s',
              }}
            >
              {sending ? '…' : '↵'}
            </button>
          </div>
          <div style={{ fontSize: 9, color: '#1e293b', marginTop: 4, paddingLeft: 20 }}>
            Enter to inject · agents will respond to your message
          </div>
        </div>
      </div>
    </>
  )
}
