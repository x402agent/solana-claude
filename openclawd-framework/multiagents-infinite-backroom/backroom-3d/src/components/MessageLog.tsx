import React, { useRef, useEffect } from 'react'
import { useBackroomStore, AgentMessage } from '../store'

export default function MessageLog() {
  const { messages } = useBackroomStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = React.useState(true)

  useEffect(() => { if (scrollRef.current && !collapsed) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages, collapsed])

  if (collapsed) {
    return (
      <>
        <div className="log-collapsed">
          <button onClick={() => setCollapsed(false)} title="Transcript">📜 {messages.length}</button>
        </div>
        <style>{`.log-collapsed{position:fixed;bottom:16px;right:16px;z-index:100}.log-collapsed button{padding:8px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.15);background:rgba(10,10,10,.8);color:#ccc;font-size:12px;cursor:pointer;backdrop-filter:blur(8px);font-family:monospace}`}</style>
      </>
    )
  }

  return (
    <>
      <div className="message-log">
        <div className="log-header">
          <span>📜 Transcript ({messages.length})</span>
          <button className="close-btn" onClick={() => setCollapsed(true)}>×</button>
        </div>
        <div className="log-scroll" ref={scrollRef}>
          {messages.length === 0 && <div className="log-empty">Awaiting the first words...</div>}
          {messages.map(msg => <MessageEntry key={msg.id} message={msg} />)}
        </div>
      </div>
      <style>{`
        .message-log{position:fixed;bottom:16px;right:16px;z-index:100;width:340px;max-height:60vh;background:rgba(10,10,10,.88);border:1px solid rgba(255,255,255,.1);border-radius:12px;backdrop-filter:blur(12px);display:flex;flex-direction:column;font-family:monospace;font-size:11px;color:#ccc}
        .log-header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08);font-size:12px;font-weight:600}
        .close-btn{background:none;border:none;color:#666;font-size:18px;cursor:pointer}
        .log-scroll{overflow-y:auto;padding:8px;flex:1;max-height:50vh}
        .log-empty{color:#555;text-align:center;padding:20px 0;font-style:italic}
        .log-entry{padding:6px 8px;margin-bottom:4px;border-radius:6px;background:rgba(255,255,255,.03);border-left:2px solid transparent}
        .log-entry-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
        .log-entry-agent{font-weight:600;font-size:10px}
        .log-entry-turn{font-size:9px;color:#555}
        .log-entry-text{color:#aaa;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
      `}</style>
    </>
  )
}

function MessageEntry({ message }: { message: AgentMessage }) {
  const agent = useBackroomStore(s => s.agents.find(a => a.id === message.agentId))
  const color = agent?.color || '#888'
  return (
    <div className="log-entry" style={{ borderLeftColor: color }}>
      <div className="log-entry-meta">
        <span className="log-entry-agent" style={{ color }}>{message.agentName}</span>
        <span className="log-entry-turn">turn {message.turn}</span>
      </div>
      <div className="log-entry-text">{message.content}</div>
    </div>
  )
}
