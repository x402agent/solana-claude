import React, { useState } from 'react'
import { useDreams } from '../hooks/useDreams'
import { DreamsStory } from '../lib/backroom'

const PANEL_STYLE: React.CSSProperties = {
  position: 'fixed',
  bottom: '1rem',
  left: '1rem',
  width: '380px',
  maxHeight: '70vh',
  background: 'rgba(10, 10, 30, 0.92)',
  border: '1px solid rgba(140, 90, 255, 0.35)',
  borderRadius: '8px',
  color: '#e0d0ff',
  fontFamily: '"JetBrains Mono", "Courier New", monospace',
  fontSize: '11px',
  backdropFilter: 'blur(8px)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 20,
}

const HEADER_STYLE: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid rgba(140, 90, 255, 0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  flexShrink: 0,
}

const TITLE_STYLE: React.CSSProperties = {
  color: '#c084fc',
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
}

const LIST_STYLE: React.CSSProperties = {
  overflowY: 'auto',
  flex: 1,
  padding: '6px 0',
}

const STORY_ROW_STYLE: React.CSSProperties = {
  padding: '7px 12px',
  cursor: 'pointer',
  borderBottom: '1px solid rgba(140, 90, 255, 0.1)',
  transition: 'background 0.15s',
}

const DETAIL_STYLE: React.CSSProperties = {
  padding: '10px 14px',
  overflowY: 'auto',
  flex: 1,
  lineHeight: 1.55,
}

const BTN_STYLE: React.CSSProperties = {
  background: 'rgba(140, 90, 255, 0.18)',
  border: '1px solid rgba(140, 90, 255, 0.4)',
  borderRadius: '4px',
  color: '#c084fc',
  cursor: 'pointer',
  fontSize: '10px',
  padding: '3px 8px',
  letterSpacing: '0.04em',
}

function timeAgo(isoOrMs: string | number | null): string {
  if (!isoOrMs) return 'never'
  const ms = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs)
  if (isNaN(ms)) return 'unknown'
  const diff = Math.floor((Date.now() - ms) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function StoryItem({ story, onClick }: { story: DreamsStory; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        ...STORY_ROW_STYLE,
        background: hovered ? 'rgba(140, 90, 255, 0.12)' : 'transparent',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ color: '#d8b4fe', fontWeight: 600, marginBottom: 2, fontSize: '11px' }}>
        {story.title || story.slug}
      </div>
      {story.description && (
        <div style={{ color: '#a78bfa', fontSize: '10px', opacity: 0.8, marginBottom: 2 }}>
          {story.description.slice(0, 80)}{story.description.length > 80 ? '…' : ''}
        </div>
      )}
      <div style={{ color: '#7c3aed', fontSize: '9px', opacity: 0.7, display: 'flex', gap: 8 }}>
        <span>{story.content_chars.toLocaleString()} chars</span>
        <span>·</span>
        <span>{timeAgo(story.scraped_at)}</span>
      </div>
    </div>
  )
}

function StoryDetail({ story, onBack }: { story: DreamsStory; onBack: () => void }) {
  return (
    <>
      <div style={HEADER_STYLE}>
        <button style={BTN_STYLE} onClick={onBack}>← back</button>
        <div style={{ ...TITLE_STYLE, fontSize: '11px', flex: 1, textAlign: 'center' }}>
          {story.title || story.slug}
        </div>
      </div>
      <div style={DETAIL_STYLE}>
        {story.description && (
          <div style={{ color: '#a78bfa', marginBottom: 8, fontSize: '11px' }}>
            {story.description}
          </div>
        )}
        {story.scenario && (
          <div style={{
            background: 'rgba(140, 90, 255, 0.08)',
            border: '1px solid rgba(140, 90, 255, 0.2)',
            borderRadius: 4,
            padding: '6px 10px',
            marginBottom: 10,
            color: '#c084fc',
            fontSize: '10px',
          }}>
            <strong style={{ color: '#d8b4fe' }}>Scenario:</strong> {story.scenario}
          </div>
        )}
        <div style={{ color: '#9ca3af', fontSize: '10px', marginBottom: 8, display: 'flex', gap: 12 }}>
          <span>{story.content_chars.toLocaleString()} chars</span>
          <span>synced {timeAgo(story.scraped_at)}</span>
        </div>
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#7c3aed', fontSize: '10px', textDecoration: 'none', opacity: 0.8 }}
        >
          ↗ {story.url}
        </a>
      </div>
    </>
  )
}

export default function ElectricDreamsPanel() {
  const { stories, status, loading, syncing, error, syncNow } = useDreams(90000)
  const [selected, setSelected] = useState<DreamsStory | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const lastSync = status?.state?.last_sync_at

  return (
    <div style={{ ...PANEL_STYLE, maxHeight: collapsed ? '40px' : '70vh' }}>
      <div style={HEADER_STYLE}>
        <div style={TITLE_STYLE}>⚡ Electric Dreams</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {!collapsed && (
            <>
              <span style={{ color: '#7c3aed', fontSize: '9px' }}>
                {loading ? 'loading…' : syncing ? 'syncing…' : `${stories.length} stories`}
              </span>
              <span style={{ color: '#4b2d8f', fontSize: '9px' }}>
                {timeAgo(typeof lastSync === 'number' ? lastSync : lastSync ?? null)}
              </span>
              <button style={BTN_STYLE} onClick={syncNow} disabled={syncing}>
                {syncing ? '…' : '↻ sync'}
              </button>
            </>
          )}
          <button style={{ ...BTN_STYLE, padding: '3px 7px' }} onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {error && (
            <div style={{ padding: '6px 12px', color: '#f87171', fontSize: '10px', flexShrink: 0 }}>
              {error}
            </div>
          )}

          {selected ? (
            <StoryDetail story={selected} onBack={() => setSelected(null)} />
          ) : (
            <div style={LIST_STYLE}>
              {stories.length === 0 && !loading && !error && (
                <div style={{ padding: '20px 14px', color: '#7c3aed', textAlign: 'center', opacity: 0.7 }}>
                  No stories cached yet.<br />
                  <button style={{ ...BTN_STYLE, marginTop: 10 }} onClick={syncNow}>
                    ↻ crawl dreams now
                  </button>
                </div>
              )}
              {stories.map((story) => (
                <StoryItem
                  key={story.slug}
                  story={story}
                  onClick={() => setSelected(story)}
                />
              ))}
            </div>
          )}

          <div style={{
            borderTop: '1px solid rgba(140, 90, 255, 0.15)',
            padding: '5px 12px',
            color: '#4b2d8f',
            fontSize: '9px',
            flexShrink: 0,
          }}>
            dreams-of-an-electric-mind.webflow.io · firecrawl powered
          </div>
        </>
      )}
    </div>
  )
}
