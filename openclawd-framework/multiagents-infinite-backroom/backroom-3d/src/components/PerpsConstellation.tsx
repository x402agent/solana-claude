import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { usePerpsData, formatUsd } from '../hooks/usePerpsData'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function marketColor(change?: number, funding?: number) {
  if ((change ?? 0) < -0.25 || (funding ?? 0) < -0.0001) return '#ff3d71'
  if ((change ?? 0) > 0.25 || (funding ?? 0) > 0.0001) return '#00ff9d'
  return '#4fc3f7'
}

export default function PerpsConstellation() {
  const { markets } = usePerpsData()
  const groupRef = useRef<THREE.Group>(null!)

  const ranked = useMemo(() => {
    return [...markets]
      .sort((a, b) => (b.openInterest ?? 0) - (a.openInterest ?? 0))
      .slice(0, 10)
      .map((market, index) => {
        const angle = (index / Math.max(1, Math.min(markets.length, 10))) * Math.PI * 2
        const radius = 3.2 + (index % 2) * 0.7
        return {
          ...market,
          angle,
          radius,
          color: marketColor(market.change24hPct, market.fundingRate),
          height: clamp(Math.log10((market.openInterest ?? 1) + 10) * 0.24, 0.35, 1.6),
        }
      })
  }, [markets])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.05
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.08
  })

  if (ranked.length === 0) return null

  return (
    <group ref={groupRef} position={[0, 0.25, 0]}>
      {ranked.map((market, index) => {
        const x = Math.cos(market.angle) * market.radius
        const z = Math.sin(market.angle) * market.radius
        const fundingGlow = clamp(Math.abs(market.fundingRate ?? 0) * 1800, 0.14, 0.7)
        return (
          <group key={market.symbol} position={[x, 0.1, z]} rotation={[0, -market.angle + Math.PI / 2, 0]}>
            <mesh position={[0, market.height / 2, 0]}>
              <boxGeometry args={[0.18, market.height, 0.18]} />
              <meshStandardMaterial color={market.color} emissive={market.color} emissiveIntensity={0.35 + fundingGlow} roughness={0.28} metalness={0.45} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.34, 0.38 + fundingGlow * 0.12, 32]} />
              <meshBasicMaterial color={market.color} transparent opacity={0.32 + fundingGlow * 0.25} side={THREE.DoubleSide} />
            </mesh>
            <Text position={[0, market.height + 0.2, 0]} fontSize={0.12} color={market.color} anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#020406">
              {market.symbol}
            </Text>
            {index < 5 && (
              <Text position={[0, market.height + 0.38, 0]} fontSize={0.075} color="rgba(255,255,255,0.62)" anchorX="center" anchorY="middle">
                {formatUsd(market.openInterest)}
              </Text>
            )}
          </group>
        )
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[3.0, 3.02, 160]} />
        <meshBasicMaterial color="#4fc3f7" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <Text position={[0, 2.75, 0]} fontSize={0.14} color="#9ff7ff" anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#000">
        PHOENIX PERPS OI CONSTELLATION
      </Text>
    </group>
  )
}
