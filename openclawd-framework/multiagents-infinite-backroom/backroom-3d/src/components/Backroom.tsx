import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Backroom() {
  const lightRef = useRef<THREE.RectAreaLight>(null!)
  const flickerRef = useRef(0)

  const floorTiles = useMemo(() => {
    const tiles: React.ReactNode[] = []
    const size = 12
    for (let x = -size; x <= size; x += 1) {
      for (let z = -size; z <= size; z += 1) {
        const isDark = (Math.floor(x) + Math.floor(z)) % 2 === 0
        tiles.push(
          <mesh key={`f-${x}-${z}`} position={[x + 0.5, -0.01, z + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.98, 0.98]} />
            <meshStandardMaterial color={isDark ? '#c9b896' : '#d4c5a9'} roughness={0.9} metalness={0} />
          </mesh>
        )
      }
    }
    return tiles
  }, [])

  useFrame((_, delta) => {
    if (!lightRef.current) return
    flickerRef.current += delta
    const flicker = Math.sin(flickerRef.current * 7) * 0.05 +
      Math.sin(flickerRef.current * 13.7) * 0.03 +
      Math.sin(flickerRef.current * 3.1) * 0.02
    lightRef.current.intensity = 1.5 + flicker
  })

  return (
    <group>
      <ambientLight intensity={0.4} color="#f5e6c8" />
      <rectAreaLight ref={lightRef} position={[0, 5.5, 0]} width={4} height={0.5} intensity={1.5} color="#fffde7" rotation={[-Math.PI / 2, 0, 0]} />
      <pointLight position={[0, -1, 0]} intensity={0.3} color="#ff8a65" distance={10} />

      {floorTiles}

      {/* Walls */}
      <mesh position={[0, 3, -8]}><boxGeometry args={[16, 6, 0.3]} /><meshStandardMaterial color="#e8d5a3" roughness={0.8} /></mesh>
      <mesh position={[-8, 3, 0]} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[16, 6, 0.3]} /><meshStandardMaterial color="#e8d5a3" roughness={0.8} /></mesh>
      <mesh position={[8, 3, 0]} rotation={[0, -Math.PI / 2, 0]}><boxGeometry args={[16, 6, 0.3]} /><meshStandardMaterial color="#e8d5a3" roughness={0.8} /></mesh>

      {/* Wainscoting */}
      <mesh position={[0, 1, -7.85]}><boxGeometry args={[16, 2, 0.1]} /><meshStandardMaterial color="#5c4033" roughness={0.7} metalness={0.1} /></mesh>
      <mesh position={[-7.85, 1, 0]}><boxGeometry args={[0.1, 2, 16]} /><meshStandardMaterial color="#5c4033" roughness={0.7} metalness={0.1} /></mesh>
      <mesh position={[7.85, 1, 0]}><boxGeometry args={[0.1, 2, 16]} /><meshStandardMaterial color="#5c4033" roughness={0.7} metalness={0.1} /></mesh>

      {/* Ceiling */}
      <mesh position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#d4c5a9" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Light fixture */}
      <group position={[0, 5.8, 0]}>
        <mesh><boxGeometry args={[3, 0.1, 0.5]} /><meshStandardMaterial color="#444" roughness={0.5} metalness={0.3} /></mesh>
        <mesh position={[0, -0.1, 0]}><planeGeometry args={[2.8, 0.3]} /><meshBasicMaterial color="#fffde7" transparent opacity={0.9} /></mesh>
      </group>

      <DustMotes />
    </group>
  )
}

function DustMotes() {
  const count = 200
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14
      pos[i * 3 + 1] = Math.random() * 6
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14
    }
    return pos
  }, [])
  const meshRef = useRef<THREE.Points>(null!)
  useFrame((_, delta) => { if (meshRef.current) meshRef.current.rotation.y += delta * 0.01 })
  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#fffde7" transparent opacity={0.3} sizeAttenuation />
    </points>
  )
}
