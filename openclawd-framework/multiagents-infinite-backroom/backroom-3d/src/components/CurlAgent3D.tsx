import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { CurlAgent } from '../hooks/useCurlAgents'

interface Props {
  agent: CurlAgent
}

export default function CurlAgent3D({ agent }: Props) {
  const groupRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)
  const t = useRef(Math.random() * Math.PI * 2)
  const color = useMemo(() => new THREE.Color(agent.color), [agent.color])

  useFrame((_, delta) => {
    t.current += delta
    if (groupRef.current) {
      groupRef.current.position.y = agent.position[1] + Math.sin(t.current * 1.2) * 0.08
    }
    if (meshRef.current && agent.isOnline) {
      const pulse = 0.9 + Math.sin(t.current * 3) * 0.08
      meshRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group ref={groupRef} position={agent.position}>
      {/* Body */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.6}
          emissive={color}
          emissiveIntensity={agent.isOnline ? 0.4 : 0.05}
          transparent={!agent.isOnline}
          opacity={agent.isOnline ? 1 : 0.35}
        />
      </mesh>

      {/* Online glow ring */}
      {agent.isOnline && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.28, 16]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Name label */}
      <Text
        position={[0, 0.42, 0]}
        fontSize={0.1}
        color={agent.isOnline ? agent.color : '#666'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000"
      >
        {agent.name.length > 18 ? agent.name.slice(0, 17) + '…' : agent.name}
      </Text>

      {/* Session count badge */}
      {agent.isOnline && agent.sessionCount > 1 && (
        <Text
          position={[0, -0.32, 0]}
          fontSize={0.07}
          color="rgba(255,255,255,0.5)"
          anchorX="center"
          anchorY="middle"
        >
          {`×${agent.sessionCount}`}
        </Text>
      )}
    </group>
  )
}
