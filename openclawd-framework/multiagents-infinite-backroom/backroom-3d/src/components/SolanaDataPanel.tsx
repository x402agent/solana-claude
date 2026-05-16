import React from 'react'
import { useSolanaData, formatSlot, formatPrice } from '../hooks/useSolanaData'
import { usePerpsData, formatFundingRate, formatUsd } from '../hooks/usePerpsData'
import { useDflowData } from '../hooks/useDflowData'

/**
 * Solana perpetual data panel for the 3D backroom.
 * Shows real-time slot, token prices, whale alerts,
 * AND Phoenix DEX perpetuals market data.
 */
export default function SolanaDataPanel() {
  const { data, whaleAlerts, latestSlot, isConnected, error } = useSolanaData()
  const { markets: perpsMarkets, isConnected: perpsConnected, error: perpsError } = usePerpsData()
  const { quotes: dflowQuotes, markets: dflowMarkets, isConnected: dflowConnected } = useDflowData()
  const sortedPerps = [...perpsMarkets].sort((a, b) => (b.openInterest ?? 0) - (a.openInterest ?? 0))
  const totalOi = sortedPerps.reduce((sum, market) => sum + (market.openInterest ?? 0), 0)
  const totalVolume = sortedPerps.reduce((sum, market) => sum + (market.volume24hUsd ?? 0), 0)
  const hotFunding = sortedPerps.reduce((max, market) => Math.abs(market.fundingRate ?? 0) > Math.abs(max.fundingRate ?? 0) ? market : max, sortedPerps[0])
  const topOi = Math.max(...sortedPerps.map((m) => m.openInterest ?? 0), 1)

  return (
    <div className="market-panel" style={{
      position: 'fixed',
      top: 60,
      left: 16,
      zIndex: 200,
      fontFamily: 'monospace',
      fontSize: 10,
      color: 'rgba(235,250,255,0.72)',
      background: 'linear-gradient(135deg, rgba(3,8,12,0.86), rgba(4,16,24,0.74))',
      border: '1px solid rgba(79,195,247,0.28)',
      borderRadius: 14,
      padding: '10px 12px',
      width: 'min(420px, calc(100vw - 32px))',
      maxHeight: 'calc(100vh - 138px)',
      overflow: 'hidden',
      backdropFilter: 'blur(14px) saturate(1.25)',
      boxShadow: '0 0 32px rgba(0,229,255,0.12), inset 0 0 28px rgba(79,195,247,0.05)',
    }}>
      <div className="market-scanline" />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: '#8ff7ff', textTransform: 'uppercase', letterSpacing: 1.8, fontWeight: 800 }}>
            Phoenix Perps Command
          </div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.34)', letterSpacing: 1 }}>
            convex / automaton / x402 runtime telemetry
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 8, color: perpsConnected ? '#00ff9d' : '#ff3d71' }}>
          {perpsConnected ? 'STREAMING' : 'STALE'} {perpsConnected ? '●' : '○'}
        </div>
      </div>

      {/* Connection status */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isConnected ? '#a5d6a7' : '#ef5350',
          boxShadow: isConnected ? '0 0 6px rgba(165,214,167,0.5)' : '0 0 6px rgba(239,83,80,0.5)',
        }} />
        <span style={{ color: isConnected ? '#a5d6a7' : '#ef5350', fontSize: 9 }}>
          {isConnected ? 'LIVE' : 'DISCONNECTED'}
        </span>
        {latestSlot && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>
            slot {formatSlot(latestSlot.slot)}
          </span>
        )}
        <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: 9 }}>OI {formatUsd(totalOi)}</span>
        <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: 9 }}>VOL {formatUsd(totalVolume)}</span>
        {hotFunding && <span style={{ color: '#ffcc80', fontSize: 9 }}>HOT {hotFunding.symbol} {formatFundingRate(hotFunding.fundingRate)}</span>}
      </div>

      {error && (
        <div style={{ color: '#ef5350', fontSize: 9, marginBottom: 4 }}>{error}</div>
      )}

      {/* Phoenix DEX Perps Markets */}
      {sortedPerps.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '46px 76px 60px 60px 1fr', gap: 6, fontSize: 7, color: 'rgba(255,255,255,0.28)', marginBottom: 4, letterSpacing: 0.8 }}>
            <span>MARKET</span>
            <span>MARK/MID</span>
            <span>FUND</span>
            <span>BASIS</span>
            <span>OI HEAT</span>
          </div>
          {sortedPerps.slice(0, 10).map((m, i) => {
            const basis = m.markPrice && m.oraclePrice ? ((m.markPrice - m.oraclePrice) / m.oraclePrice) * 100 : undefined
            const heat = Math.max(4, ((m.openInterest ?? 0) / topOi) * 100)
            const color = (m.change24hPct ?? 0) < -0.25 || (m.fundingRate ?? 0) < -0.0001 ? '#ff3d71' : (m.change24hPct ?? 0) > 0.25 || (m.fundingRate ?? 0) > 0.0001 ? '#00ff9d' : '#4fc3f7'
            return (
            <div key={m.symbol || i} className="perps-row" style={{ display: 'grid', gridTemplateColumns: '46px 76px 60px 60px 1fr', gap: 6, alignItems: 'center', fontSize: 9, marginBottom: 3 }}>
              <span style={{ color, fontWeight: 900, letterSpacing: 0.7 }}>{m.symbol}</span>
              <span style={{ color: '#e7fbff', lineHeight: 1.1 }}>
                {m.markPrice ? formatPrice(m.markPrice) : '—'}
                <br />
                <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: 7 }}>{m.midPrice ? formatPrice(m.midPrice) : 'mid —'}</span>
              </span>
              <span style={{
                color,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatFundingRate(m.fundingRate)}
              </span>
              <span style={{ color: basis === undefined ? 'rgba(255,255,255,0.28)' : basis >= 0 ? '#00ff9d' : '#ff3d71', fontVariantNumeric: 'tabular-nums' }}>
                {basis === undefined ? '—' : `${basis >= 0 ? '+' : ''}${basis.toFixed(3)}%`}
              </span>
              <span>
                <span style={{ display: 'block', height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <span className="heat-fill" style={{ display: 'block', width: `${heat}%`, height: '100%', background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.8))`, boxShadow: `0 0 12px ${color}` }} />
                </span>
                <span style={{ color: 'rgba(255,255,255,0.34)', fontSize: 7 }}>{formatUsd(m.openInterest)} / {formatUsd(m.volume24hUsd)}</span>
              </span>
            </div>
          )})}
          {perpsError && (
            <div style={{ color: '#ef5350', fontSize: 8, marginTop: 2 }}>{perpsError}</div>
          )}
        </div>
      )}

      {/* DFlow DEX Quotes */}
      {dflowQuotes.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>
            DFLOW QUOTES {dflowConnected ? '●' : '○'}
          </div>
          {dflowQuotes.slice(0, 5).map((q, i) => (
            <div key={q._id || i} style={{ display: 'flex', justifyContent: 'space-between', gap: 4, fontSize: 9 }}>
              <span style={{ color: '#ce93d8', fontWeight: 'bold', minWidth: 48 }}>{q.pair}</span>
              <span style={{ color: '#a5d6a7' }}>${q.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              {q.priceImpactPct && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>
                  {parseFloat(q.priceImpactPct).toFixed(3)}% impact
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DFlow Prediction Markets */}
      {dflowMarkets.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>DFLOW PRED. MARKETS</div>
          {dflowMarkets.slice(0, 4).map((m, i) => (
            <div key={m._id || i} style={{ display: 'flex', justifyContent: 'space-between', gap: 4, fontSize: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                {m.name}
              </span>
              {m.yesPrice !== undefined && (
                <span style={{ color: m.yesPrice >= 0.5 ? '#a5d6a7' : '#ef5350' }}>
                  {(m.yesPrice * 100).toFixed(0)}% YES
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Latest prices */}
      {data.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>TOKEN PRICES</div>
          {data.slice(0, 5).map((d, i) => (
            <div key={d._id || i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                {d.tokenAddress.slice(0, 8)}...
              </span>
              <span style={{ color: d.price ? '#a5d6a7' : 'rgba(255,255,255,0.3)' }}>
                {d.price ? formatPrice(d.price) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Whale alerts */}
      {whaleAlerts.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>WHALE ALERTS</div>
          {whaleAlerts.slice(0, 3).map((w, i) => (
            <div key={w._id || i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: w.type === 'buy' ? '#a5d6a7' : '#ef5350' }}>
                {w.type.toUpperCase()}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                {w.valueUsd ? `$${(w.valueUsd / 1000).toFixed(0)}K` : `${w.amount.toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Last slot update time */}
      {latestSlot && (
        <div style={{ marginTop: 4, fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
          updated {new Date(latestSlot.timestamp).toLocaleTimeString()}
        </div>
      )}
      <style>{`
        .market-panel:before{content:"";position:absolute;inset:-1px;border-radius:14px;pointer-events:none;background:linear-gradient(120deg,rgba(0,229,255,.22),transparent 38%,rgba(255,61,113,.18));mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);padding:1px;opacity:.9}
        .market-scanline{position:absolute;left:0;right:0;top:0;height:42px;background:linear-gradient(180deg,rgba(143,247,255,.08),transparent);animation:scan 3.2s linear infinite;pointer-events:none}
        .perps-row{border-radius:8px;padding:4px 5px;background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.035)}
        .perps-row:hover{background:rgba(79,195,247,.08);border-color:rgba(79,195,247,.22)}
        .heat-fill{animation:heatPulse 1.8s ease-in-out infinite alternate}
        @keyframes scan{0%{transform:translateY(-48px)}100%{transform:translateY(520px)}}
        @keyframes heatPulse{from{filter:saturate(1)}to{filter:saturate(1.8) brightness(1.25)}}
      `}</style>
    </div>
  )
}
