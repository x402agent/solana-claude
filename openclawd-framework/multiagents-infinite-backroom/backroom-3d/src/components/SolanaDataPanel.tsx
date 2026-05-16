import React from 'react'
import { useSolanaData, formatSlot, formatPrice } from '../hooks/useSolanaData'
import { usePerpsData, formatFundingRate } from '../hooks/usePerpsData'
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

  return (
    <div style={{
      position: 'fixed',
      top: 60,
      left: 16,
      zIndex: 200,
      fontFamily: 'monospace',
      fontSize: 10,
      color: 'rgba(255,255,255,0.6)',
      background: 'rgba(0,0,0,0.6)',
      border: '1px solid rgba(79,195,247,0.15)',
      borderRadius: 8,
      padding: '8px 12px',
      minWidth: 220,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: 9, color: '#4fc3f7', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
        ⚡ Solana Perpetual Data
      </div>

      {/* Connection status */}
      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
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
          <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>
            slot {formatSlot(latestSlot.slot)}
          </span>
        )}
      </div>

      {error && (
        <div style={{ color: '#ef5350', fontSize: 9, marginBottom: 4 }}>{error}</div>
      )}

      {/* Phoenix DEX Perps Markets */}
      {perpsMarkets.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>
            PHOENIX PERPS {perpsConnected ? '●' : '○'}
          </div>
          {perpsMarkets.slice(0, 6).map((m, i) => (
            <div key={m.symbol || i} style={{ display: 'flex', justifyContent: 'space-between', gap: 4, fontSize: 9 }}>
              <span style={{ color: '#ffab40', fontWeight: 'bold', minWidth: 32 }}>
                {m.symbol}
              </span>
              <span style={{ color: '#a5d6a7' }}>
                {m.markPrice ? formatPrice(m.markPrice) : '—'}
              </span>
              <span style={{
                color: m.change24hPct !== undefined
                  ? (m.change24hPct >= 0 ? '#a5d6a7' : '#ef5350')
                  : 'rgba(255,255,255,0.3)',
              }}>
                {m.change24hPct !== undefined
                  ? `${m.change24hPct >= 0 ? '+' : ''}${m.change24hPct.toFixed(2)}%`
                  : '—'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>
                {formatFundingRate(m.fundingRate)}
              </span>
            </div>
          ))}
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
          {dflowQuotes.map((q, i) => (
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
    </div>
  )
}
