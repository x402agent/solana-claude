import React, { useEffect, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Backroom() {
  const lightRef = useRef<THREE.RectAreaLight>(null!)
  const flickerRef = useRef(0)

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
      <pointLight position={[-4, 2, 4]} intensity={1.1} color="#00e5ff" distance={11} />
      <pointLight position={[4, 2, -4]} intensity={0.8} color="#ff3d71" distance={10} />

      <InstancedFloor />

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
      <AutomatonGrid />
      <DataBeams />
    </group>
  )
}

function InstancedFloor() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const size = 24
  const count = size * size
  const colors = useMemo(() => {
    const values: string[] = []
    for (let x = 0; x < size; x += 1) {
      for (let z = 0; z < size; z += 1) {
        const hot = (x + z) % 7 === 0
        const dark = (x + z) % 2 === 0
        values.push(hot ? '#d5f3ff' : dark ? '#bba77f' : '#d4c5a9')
      }
    }
    return values
  }, [])

  useEffect(() => {
    if (!meshRef.current) return
    const matrix = new THREE.Matrix4()
    const color = new THREE.Color()
    let i = 0
    for (let x = 0; x < size; x += 1) {
      for (let z = 0; z < size; z += 1) {
        matrix.makeRotationX(-Math.PI / 2)
        matrix.setPosition(x - size / 2 + 0.5, -0.01, z - size / 2 + 0.5)
        meshRef.current.setMatrixAt(i, matrix)
        meshRef.current.setColorAt(i, color.set(colors[i]))
        i += 1
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  }, [colors])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} receiveShadow>
      <planeGeometry args={[0.985, 0.985]} />
      <meshStandardMaterial roughness={0.86} metalness={0.03} emissive="#081014" emissiveIntensity={0.03} />
    </instancedMesh>
  )
}

function DustMotes() {
  const count = 360
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
  useFrame((state, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.015
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.08
  })
  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#c8fbff" transparent opacity={0.32} sizeAttenuation />
    </points>
  )
}

function AutomatonGrid() {
  const groupRef = useRef<THREE.Group>(null!)
  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const material = mesh.material as THREE.MeshBasicMaterial
      const wave = Math.sin(state.clock.elapsedTime * 1.6 + i * 0.7)
      material.opacity = 0.08 + Math.max(0, wave) * 0.18
    })
  })

  const cells = useMemo(() => {
    const nodes: React.ReactNode[] = []
    for (let i = 0; i < 18; i += 1) {
      const x = -7.6 + i * 0.9
      nodes.push(
        <mesh key={`north-${i}`} position={[x, 3.2 + (i % 3) * 0.35, -7.67]}>
          <planeGeometry args={[0.48, 0.18]} />
          <meshBasicMaterial color={i % 2 ? '#00e5ff' : '#ff8a65'} transparent opacity={0.12} />
        </mesh>
      )
    }
    return nodes
  }, [])

  return <group ref={groupRef}>{cells}</group>
}

function DataBeams() {
  const ref = useRef<THREE.Group>(null!)
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * 0.08
  })
  return (
    <group ref={ref} position={[0, 1.15, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, (i * Math.PI) / 3]}>
          <ringGeometry args={[2.4 + i * 1.1, 2.405 + i * 1.1, 96]} />
          <meshBasicMaterial color={i === 0 ? '#00e5ff' : i === 1 ? '#ff8a65' : '#a5d6a7'} transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
