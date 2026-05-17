import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { fetchDreamsStories, DreamsStory } from '../lib/backroom'

const ORBIT_RADIUS = 5.5
const ORB_COUNT_MAX = 12

function useOrbitPositions(count: number, radius: number) {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2
      const height = Math.sin(i * 1.3) * 1.2 + 2.5
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      )
    })
  }, [count, radius])
}

interface OrbProps {
  story: DreamsStory
  basePosition: THREE.Vector3
  index: number
  total: number
  onHover: (story: DreamsStory | null) => void
}

function DreamOrb({ story, basePosition, index, total, onHover }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const t = useRef(Math.random() * Math.PI * 2)
  const [hovered, setHovered] = useState(false)

  const hue = (index / total) * 0.22 + 0.72  // violet to purple range
  const color = new THREE.Color().setHSL(hue, 0.85, 0.55)
  const glowColor = new THREE.Color().setHSL(hue, 0.9, 0.35)

  useFrame((_, delta) => {
    t.current += delta * (0.3 + index * 0.03)
    if (meshRef.current) {
      meshRef.current.position.x = basePosition.x + Math.sin(t.current * 0.7 + index) * 0.3
      meshRef.current.position.y = basePosition.y + Math.sin(t.current * 0.5) * 0.25
      meshRef.current.position.z = basePosition.z + Math.cos(t.current * 0.6 + index) * 0.3
      const pulse = 1 + Math.sin(t.current * 2) * 0.08
      meshRef.current.scale.setScalar(hovered ? pulse * 1.4 : pulse)
      if (glowRef.current) {
        glowRef.current.position.copy(meshRef.current.position)
        glowRef.current.scale.setScalar((hovered ? 2.2 : 1.8) * pulse)
      }
    }
  })

  const sizeKb = Math.min(1, story.content_chars / 8000)
  const orbRadius = 0.08 + sizeKb * 0.1

  return (
    <group>
      {/* glow sphere */}
      <mesh ref={glowRef} position={basePosition}>
        <sphereGeometry args={[orbRadius * 1.8, 8, 8]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.15} depthWrite={false} />
      </mesh>

      {/* main orb */}
      <mesh
        ref={meshRef}
        position={basePosition}
        onPointerOver={() => { setHovered(true); onHover(story) }}
        onPointerOut={() => { setHovered(false); onHover(null) }}
      >
        <sphereGeometry args={[orbRadius, 16, 16]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.9 : 0.5}
          transparent
          opacity={0.88}
          shininess={120}
        />
      </mesh>
    </group>
  )
}

interface TooltipProps {
  story: DreamsStory
}

function DreamTooltip({ story }: TooltipProps) {
  return (
    <div style={{
      background: 'rgba(10, 5, 30, 0.92)',
      border: '1px solid rgba(168, 85, 247, 0.5)',
      borderRadius: 6,
      padding: '8px 12px',
      maxWidth: 220,
      pointerEvents: 'none',
      fontFamily: 'monospace',
      fontSize: 11,
      color: '#e9d5ff',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{ color: '#d8b4fe', fontWeight: 700, marginBottom: 4, fontSize: 12 }}>
        {story.title || story.slug}
      </div>
      {story.description && (
        <div style={{ color: '#a78bfa', fontSize: 10, marginBottom: 4 }}>
          {story.description.slice(0, 100)}{story.description.length > 100 ? '…' : ''}
        </div>
      )}
      <div style={{ color: '#7c3aed', fontSize: 9 }}>
        {story.content_chars.toLocaleString()} chars · ⚡ electric dream
      </div>
    </div>
  )
}

function CrawlRing({ active }: { active: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null!)
  const t = useRef(0)

  useFrame((_, delta) => {
    t.current += delta
    if (ringRef.current) {
      ringRef.current.rotation.y = t.current * (active ? 1.5 : 0.4)
      ringRef.current.rotation.x = Math.sin(t.current * 0.3) * 0.2
      const opacity = active ? 0.5 + Math.sin(t.current * 3) * 0.2 : 0.12
      ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = opacity
    }
  })

  return (
    <mesh ref={ringRef} position={[0, 2.5, 0]}>
      <torusGeometry args={[ORBIT_RADIUS, 0.015, 4, 80]} />
      <meshBasicMaterial color={active ? '#a855f7' : '#4b2d8f'} transparent opacity={0.12} depthWrite={false} />
    </mesh>
  )
}

export default function DreamsOrbs() {
  const [stories, setStories] = useState<DreamsStory[]>([])
  const [hovered, setHovered] = useState<DreamsStory | null>(null)
  const [crawling, setCrawling] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchDreamsStories(ORB_COUNT_MAX)
        if (!cancelled) setStories(data.stories.slice(0, ORB_COUNT_MAX))
      } catch {
        // silent — panel shows errors
      }
    }
    load()
    const interval = setInterval(load, 90000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  // Briefly flash crawling ring when stories update
  const prevCount = useRef(0)
  useEffect(() => {
    if (stories.length !== prevCount.current && prevCount.current > 0) {
      setCrawling(true)
      setTimeout(() => setCrawling(false), 4000)
    }
    prevCount.current = stories.length
  }, [stories.length])

  const positions = useOrbitPositions(Math.max(stories.length, 1), ORBIT_RADIUS)

  return (
    <group>
      <CrawlRing active={crawling} />

      {stories.map((story, i) => (
        <DreamOrb
          key={story.slug}
          story={story}
          basePosition={positions[i] || positions[0]}
          index={i}
          total={stories.length}
          onHover={setHovered}
        />
      ))}

      {hovered && (
        <Html
          position={[0, 5.5, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <DreamTooltip story={hovered} />
        </Html>
      )}

      {stories.length === 0 && (
        <Html position={[0, 2.5, 0]} center>
          <div style={{
            color: '#4b2d8f',
            fontFamily: 'monospace',
            fontSize: 10,
            opacity: 0.7,
            textAlign: 'center',
          }}>
            ⚡ no dreams yet<br />sync via panel →
          </div>
        </Html>
      )}
    </group>
  )
}
