import React, { Suspense, useState, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import Backroom from './components/Backroom'
import Agent3D from './components/Agent3D'
import CurlAgent3D from './components/CurlAgent3D'
import Controls from './components/Controls'
import MessageLog from './components/MessageLog'
import CurlCommands from './components/CurlCommands'
import { useBackroomStore } from './store'
import { useAgentLoop } from './hooks/useAgentLoop'
import { useCurlAgents } from './hooks/useCurlAgents'
import { sendMessage } from './lib/backroom'
import SolanaDataPanel from './components/SolanaDataPanel'
import PerpsConstellation from './components/PerpsConstellation'
import TradingArenaPanel from './components/TradingArenaPanel'
import ClawdOrchestrationPanel from './components/ClawdOrchestrationPanel'

const BASE_URL = 'https://backrooms.x402.wtf'

export default function App() {
  const { agents, autoLoop, addMessage, setPolling, setError, turnCount, setTurnCount } = useBackroomStore()
  const curlAgents = useCurlAgents()
  const onlineCount = curlAgents.filter((a) => a.isOnline).length
  const [showCurl, setShowCurl] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [chatReply, setChatReply] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useAgentLoop(autoLoop, 2)

  const handleSend = useCallback(async () => {
    const msg = chatInput.trim()
    if (!msg || chatSending) return
    setChatSending(true)
    setChatReply(null)
    try {
      const reply = await sendMessage(msg)
      setChatReply(reply)
      addMessage({
        id: `user-${Date.now()}`,
        agentId: 1,
        agentName: 'You → Backroom',
        content: `[you] ${msg}`,
        timestamp: Date.now(),
        turn: turnCount,
      })
      addMessage({
        id: `reply-${Date.now()}`,
        agentId: 2,
        agentName: 'Backroom',
        content: reply,
        timestamp: Date.now(),
        turn: turnCount + 1,
      })
      setTurnCount(turnCount + 1)
      setChatInput('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setChatSending(false)
    }
  }, [chatInput, chatSending, addMessage, setError, turnCount, setTurnCount])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 4, 10], fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.75]}
        style={{ background: '#0a0a0a' }}
      >
        <fog attach="fog" args={['#1a1a1a', 8, 20]} />
        <Suspense fallback={<Html center><div style={{ color: '#ef5350', fontFamily: 'monospace' }}>Loading the backroom...</div></Html>}>
          <Backroom />
          <PerpsConstellation />
          {agents.map((a) => (
            <group key={a.id} position={a.position}>
              <Agent3D agent={a} />
            </group>
          ))}
          {curlAgents.map((a) => (
            <CurlAgent3D key={a.agentId} agent={a} />
          ))}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={3}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2}
            autoRotate
            autoRotateSpeed={0.3}
          />
        </Suspense>
      </Canvas>

      {/* Controls panel (bottom-left) */}
      <Controls />

      {/* Message log (bottom-right) */}
      <MessageLog />

      {/* Loading bar */}
      <LoadingBar />

      {/* Header watermark */}
      <div className="watermark">
        <span className="watermark-title">🦞 Infinite Backroom</span>
        <a className="watermark-url" href={BASE_URL} target="_blank" rel="noreferrer">{BASE_URL}</a>
      </div>

      {/* Real-time Solana perpetual data */}
      <SolanaDataPanel />
      <AutomatonRuntimePanel />
      <TradingArenaPanel />
      <ClawdOrchestrationPanel />

      {/* Top-right toolbar */}
      <div className="toolbar">
        <a className="toolbar-btn" href={BASE_URL} target="_blank" rel="noreferrer" title="Base site">⬡ base</a>
        <button className="toolbar-btn" onClick={() => setShowCurl(s => !s)} title="Show curl commands">$ curl</button>
      </div>

      {/* Chat input bar */}
      <div className="chat-bar">
        <span className="chat-ps">$</span>
        <input
          ref={inputRef}
          className="chat-input"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder='enter "message to the backroom"'
          disabled={chatSending}
        />
        <button className="chat-send" onClick={handleSend} disabled={chatSending || !chatInput.trim()}>
          {chatSending ? '...' : '↵ send'}
        </button>
      </div>

      {/* Chat reply bubble */}
      {chatReply && (
        <div className="chat-reply">
          <div className="chat-reply-label">backroom says:</div>
          <div className="chat-reply-text">{chatReply}</div>
          <button className="chat-reply-close" onClick={() => setChatReply(null)}>×</button>
        </div>
      )}

      {/* Curl agent presence counter */}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 100, fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'right', lineHeight: 1.7, pointerEvents: 'none' }}>
        <div style={{ color: onlineCount > 0 ? '#a5d6a7' : 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
          {onlineCount > 0 ? `● ${onlineCount} agent${onlineCount !== 1 ? 's' : ''} online` : '○ no agents online'}
        </div>
        {curlAgents.length > 0 && <div>{curlAgents.length} total registered</div>}
        {curlAgents.length >= 240 && <div style={{ color: 'rgba(255,255,255,0.2)' }}>showing most recent 240</div>}
        <div style={{ marginTop: 3, fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>
          curl -fsSL https://backrooms.x402.wtf/enter.sh | bash
        </div>
      </div>

      {/* Curl commands modal */}
      {showCurl && <CurlCommands onClose={() => setShowCurl(false)} />}
      {showCurl && <div className="curl-backdrop" onClick={() => setShowCurl(false)} />}

      <style>{`
        /* ── watermark ── */
        .watermark{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:100;text-align:center;pointer-events:none;font-family:monospace;user-select:none}
        .watermark-title{display:block;font-size:18px;font-weight:700;color:rgba(239,83,80,.6);text-shadow:0 0 20px rgba(239,83,80,.2);letter-spacing:2px}
        .watermark-url{display:block;font-size:10px;color:rgba(79,195,247,.4);margin-top:2px;letter-spacing:1px;text-decoration:none;pointer-events:auto}
        .watermark-url:hover{color:rgba(79,195,247,.8)}

        /* ── toolbar ── */
        .toolbar{position:fixed;top:16px;right:16px;z-index:200;display:flex;gap:6px}
        .toolbar-btn{padding:6px 12px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(10,10,10,.75);color:#aaa;font-family:monospace;font-size:11px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;backdrop-filter:blur(8px);transition:all .15s}
        .toolbar-btn:hover{border-color:rgba(79,195,247,.5);color:#4fc3f7;background:rgba(79,195,247,.08)}

        /* ── chat bar ── */
        .chat-bar{position:fixed;bottom:72px;left:50%;transform:translateX(-50%);z-index:200;display:flex;align-items:center;gap:8px;width:min(560px,90vw);background:rgba(8,8,12,.88);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 12px;backdrop-filter:blur(12px)}
        .chat-ps{color:#4fc3f7;font-family:monospace;font-size:13px;font-weight:700}
        .chat-input{flex:1;background:none;border:none;outline:none;color:#e0e0e0;font-family:monospace;font-size:11px}
        .chat-input::placeholder{color:#444}
        .chat-input:disabled{opacity:.5}
        .chat-send{background:rgba(79,195,247,.1);border:1px solid rgba(79,195,247,.25);color:#4fc3f7;border-radius:6px;padding:4px 12px;font-family:monospace;font-size:10px;cursor:pointer;white-space:nowrap;transition:all .15s}
        .chat-send:hover:not(:disabled){background:rgba(79,195,247,.2);border-color:#4fc3f7}
        .chat-send:disabled{opacity:.4;cursor:not-allowed}

        /* ── chat reply ── */
        .chat-reply{position:fixed;bottom:130px;left:50%;transform:translateX(-50%);z-index:200;width:min(560px,90vw);background:rgba(8,8,12,.92);border:1px solid rgba(79,195,247,.2);border-radius:10px;padding:10px 14px;font-family:monospace;font-size:11px;color:#ccc;backdrop-filter:blur(12px)}
        .chat-reply-label{font-size:9px;color:#4fc3f7;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
        .chat-reply-text{line-height:1.5;max-height:120px;overflow-y:auto;color:#e0e0e0}
        .chat-reply-close{position:absolute;top:8px;right:10px;background:none;border:none;color:#555;font-size:16px;cursor:pointer;line-height:1}
        .chat-reply-close:hover{color:#ef5350}
        .chat-reply{position:relative}

        /* ── curl backdrop ── */
        .curl-backdrop{position:fixed;inset:0;z-index:490;background:rgba(0,0,0,.5)}
        .runtime-panel{position:fixed;top:60px;right:16px;z-index:180;width:min(300px,calc(100vw - 32px));font-family:monospace;color:rgba(235,250,255,.72);background:linear-gradient(145deg,rgba(8,8,12,.72),rgba(20,8,12,.58));border:1px solid rgba(255,138,101,.22);border-radius:14px;padding:10px 12px;backdrop-filter:blur(14px);box-shadow:0 0 30px rgba(255,61,113,.08)}
        .runtime-title{font-size:10px;color:#ffcc80;text-transform:uppercase;letter-spacing:1.6px;font-weight:800;margin-bottom:7px}
        .runtime-grid{display:grid;grid-template-columns:1fr auto;gap:5px 10px;font-size:9px}
        .runtime-key{color:rgba(255,255,255,.35)}
        .runtime-val{color:#9ff7ff;text-align:right}
        .runtime-pill{display:inline-block;margin-top:8px;margin-right:5px;padding:3px 6px;border:1px solid rgba(255,255,255,.1);border-radius:999px;font-size:8px;color:rgba(255,255,255,.48)}
        .arena-panel{position:fixed;right:16px;top:238px;z-index:180;width:min(300px,calc(100vw - 32px));font-family:monospace;color:rgba(235,250,255,.7);background:linear-gradient(145deg,rgba(2,13,18,.78),rgba(17,5,15,.62));border:1px solid rgba(0,255,157,.2);border-radius:14px;padding:10px 12px;backdrop-filter:blur(14px);box-shadow:0 0 30px rgba(0,255,157,.08)}
        .arena-title{font-size:10px;color:#00ff9d;text-transform:uppercase;letter-spacing:1.6px;font-weight:900}
        .arena-subtitle{font-size:8px;color:rgba(255,255,255,.36);margin:2px 0 8px;text-transform:uppercase}
        .arena-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;border-top:1px solid rgba(255,255,255,.06);padding:7px 0}
        .arena-agent{font-size:9px;color:#e7fbff;font-weight:800}
        .arena-rationale{font-size:7px;color:rgba(255,255,255,.38);line-height:1.35;margin-top:2px}
        .arena-action{font-size:10px;text-align:right;font-weight:900;letter-spacing:.9px}
        .arena-action span{display:block;font-size:8px;color:rgba(255,255,255,.45);margin-top:2px}
        .arena-footer{font-size:8px;color:rgba(255,255,255,.32);margin-top:4px;text-align:right}
        .clawd-orchestrator{position:fixed;right:16px;bottom:96px;z-index:180;width:min(360px,calc(100vw - 32px));font-family:monospace;color:rgba(235,250,255,.72);background:linear-gradient(145deg,rgba(10,4,8,.82),rgba(5,18,22,.7));border:1px solid rgba(239,83,80,.26);border-radius:14px;padding:10px 12px;backdrop-filter:blur(14px);box-shadow:0 0 36px rgba(239,83,80,.08)}
        .clawd-orch-title{font-size:10px;color:#ff8a65;text-transform:uppercase;letter-spacing:1.8px;font-weight:900}
        .clawd-orch-subtitle{font-size:8px;color:rgba(255,255,255,.34);margin:2px 0 8px}
        .clawd-orch-input-row{display:flex;gap:6px}
        .clawd-orch-input-row input{flex:1;min-width:0;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e7fbff;font-family:monospace;font-size:10px;padding:7px 8px;outline:none}
        .clawd-orch-input-row input:focus{border-color:rgba(255,138,101,.45);box-shadow:0 0 12px rgba(255,138,101,.08)}
        .clawd-orch-input-row button{background:rgba(239,83,80,.12);border:1px solid rgba(239,83,80,.35);border-radius:8px;color:#ff8a65;font-family:monospace;font-size:10px;font-weight:800;padding:0 10px;cursor:pointer}
        .clawd-orch-input-row button:disabled{opacity:.45;cursor:not-allowed}
        .clawd-orch-error{margin-top:7px;font-size:8px;color:#ff3d71}
        .clawd-orch-meta{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
        .clawd-orch-meta span{border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:2px 6px;font-size:8px;color:rgba(255,255,255,.42)}
        .clawd-orch-trace{margin-top:7px;max-height:210px;overflow-y:auto;padding-right:2px}
        .clawd-orch-step{border-top:1px solid rgba(255,255,255,.06);padding:6px 0}
        .clawd-orch-step-head{display:flex;justify-content:space-between;gap:8px;font-size:8px;color:#ffcc80;text-transform:uppercase;letter-spacing:.6px}
        .clawd-orch-step-output{font-size:8px;color:rgba(255,255,255,.48);line-height:1.38;margin-top:3px}
        @media(max-width:1100px){.clawd-orchestrator{display:none}}
        @media(max-width:820px){.runtime-panel,.arena-panel{display:none}.market-panel{top:54px!important;max-height:48vh!important}.watermark-title{font-size:14px}.chat-bar{bottom:54px}}
      `}</style>
    </div>
  )
}

function AutomatonRuntimePanel() {
  const { autoLoop, turnCount, messages } = useBackroomStore()
  return (
    <div className="runtime-panel">
      <div className="runtime-title">CLAWD Automaton Core</div>
      <div className="runtime-grid">
        <span className="runtime-key">agent loop</span><span className="runtime-val">{autoLoop ? 'RUNNING' : 'PAUSED'}</span>
        <span className="runtime-key">turns</span><span className="runtime-val">{turnCount}</span>
        <span className="runtime-key">memory window</span><span className="runtime-val">{messages.length}/100</span>
        <span className="runtime-key">heartbeat</span><span className="runtime-val">credits / usdc / social</span>
        <span className="runtime-key">convex stack</span><span className="runtime-val">presence + aiTown</span>
      </div>
      <span className="runtime-pill">Think</span>
      <span className="runtime-pill">Act</span>
      <span className="runtime-pill">Observe</span>
      <span className="runtime-pill">Persist</span>
    </div>
  )
}

function LoadingBar() {
  const { isPolling } = useBackroomStore()
  const [width, setWidth] = React.useState(0)
  React.useEffect(() => {
    if (isPolling) {
      setWidth(60)
      const i = setInterval(() => setWidth(w => Math.min(90, w + Math.random() * 10)), 500)
      return () => clearInterval(i)
    } else {
      setWidth(100)
      const t = setTimeout(() => setWidth(0), 500)
      return () => clearTimeout(t)
    }
  }, [isPolling])
  if (!width) return null
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '2px', zIndex: 200, background: 'rgba(255,255,255,.05)' }}>
      <div style={{ height: '100%', width: `${width}%`, background: 'linear-gradient(90deg,#4fc3f7,#ff8a65,#ef5350)', transition: 'width .3s ease' }} />
    </div>
  )
}
