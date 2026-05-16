import React from 'react'
import { useTradingArena } from '../hooks/useTradingArena'

const actionColor: Record<string, string> = {
  long: '#00ff9d',
  short: '#ff3d71',
  hold: '#ffcc80',
}

export default function TradingArenaPanel() {
  const { arena, error } = useTradingArena()

  return (
    <div className="arena-panel">
      <div className="arena-title">Agent Trading Arena</div>
      <div className="arena-subtitle">
        {arena ? `${arena.market} · ${arena.mood}` : error || 'warming up signal tape'}
      </div>
      {arena?.decisions.slice(0, 4).map((decision) => (
        <div className="arena-row" key={`${decision.agent}-${decision.symbol}`}>
          <div>
            <div className="arena-agent">{decision.agent}</div>
            <div className="arena-rationale">{decision.rationale}</div>
          </div>
          <div className="arena-action" style={{ color: actionColor[decision.action] }}>
            {decision.action.toUpperCase()}
            <span>{decision.symbol}</span>
          </div>
        </div>
      ))}
      {arena && (
        <div className="arena-footer">
          L {arena.summary.long} / S {arena.summary.short} / H {arena.summary.hold} · {arena.summary.trackedMarkets} markets
        </div>
      )}
    </div>
  )
}
