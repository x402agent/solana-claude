import React, { useState } from 'react'
import { useBackroomStore } from '../store'

export default function Controls() {
  const { agents, turnCount, autoLoop, isPolling, error, setAutoLoop, reset } = useBackroomStore()
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <>
        <div className="controls-collapsed">
          <button onClick={() => setCollapsed(false)} title="Expand">🦞</button>
        </div>
        <style>{`.controls-collapsed{position:fixed;bottom:16px;left:16px;z-index:100}.controls-collapsed button{width:44px;height:44px;border-radius:50%;border:2px solid rgba(239,83,80,.6);background:rgba(10,10,10,.8);color:#ef5350;font-size:20px;cursor:pointer;backdrop-filter:blur(8px)}`}</style>
      </>
    )
  }

  return (
    <>
      <div className="controls">
        <div className="controls-header">
          <span>🦞 Infinite Backroom</span>
          <button className="collapse-btn" onClick={() => setCollapsed(true)}>_</button>
        </div>
        <div className="agent-list">
          {agents.map(a => (
            <div key={a.id} className="agent-row">
              <div className="agent-indicator">
                <span className="status-dot" style={{ backgroundColor: a.isSpeaking ? a.color : '#444', boxShadow: a.isSpeaking ? `0 0 8px ${a.color}` : 'none' }} />
                <span className="agent-name" style={{ color: a.color }}>{a.name}</span>
              </div>
              <span className="agent-status">{a.isSpeaking ? 'Speaking...' : 'Listening'}</span>
            </div>
          ))}
        </div>
        <div className="stats">
          <span>Turns: {turnCount}</span>
          <span>{isPolling ? '🌀 Polling...' : '⏸ Idle'}</span>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="controls-buttons">
          <button className={`ctrl-btn ${autoLoop ? 'active' : ''}`} onClick={() => setAutoLoop(!autoLoop)}>
            {autoLoop ? '⏹ Stop Loop' : '▶ Start Loop'}
          </button>
          <button className="ctrl-btn reset" onClick={reset}>↺ Reset</button>
        </div>
      </div>
      <style>{`
        .controls{position:fixed;bottom:16px;left:16px;z-index:100;width:240px;background:rgba(10,10,10,.85);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;backdrop-filter:blur(12px);font-family:monospace;font-size:12px;color:#ccc}
        .controls-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:13px;font-weight:600;color:#ef5350}
        .collapse-btn{background:none;border:none;color:#666;cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px}
        .agent-list{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
        .agent-row{display:flex;justify-content:space-between;align-items:center}
        .agent-indicator{display:flex;align-items:center;gap:6px}
        .status-dot{width:8px;height:8px;border-radius:50%;transition:all .3s}
        .agent-name{font-weight:500}
        .agent-status{font-size:10px;color:#666}
        .stats{display:flex;justify-content:space-between;margin-bottom:8px;font-size:10px;color:#555}
        .error{background:rgba(239,83,80,.15);border:1px solid rgba(239,83,80,.3);border-radius:6px;padding:6px 8px;margin-bottom:8px;font-size:10px;color:#ef5350}
        .controls-buttons{display:flex;gap:6px}
        .ctrl-btn{flex:1;padding:6px 10px;border:1px solid rgba(255,255,255,.15);border-radius:6px;background:rgba(255,255,255,.05);color:#ccc;font-size:11px;cursor:pointer;font-family:inherit}
        .ctrl-btn.active{border-color:#4fc3f7;color:#4fc3f7;background:rgba(79,195,247,.1)}
        .ctrl-btn.reset:hover{border-color:#ef5350;color:#ef5350}
      `}</style>
    </>
  )
}
