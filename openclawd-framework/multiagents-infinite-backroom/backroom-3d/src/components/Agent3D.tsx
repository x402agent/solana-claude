import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { AgentState } from '../store'
import ChatBubble from './ChatBubble'

interface Props { agent: AgentState }

export default function Agent3D({ agent }: Props) {
  const groupRef = useRef<THREE.Group>(null!)
  const floatRef = useRef(0)
  const color = new THREE.Color(agent.color)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    floatRef.current += delta
    groupRef.current.position.y += Math.sin(floatRef.current * 1.5) * delta * 0.02
    if (agent.isSpeaking) {
      const pulse = Math.sin(floatRef.current * 4) * 0.1 + 1
      groupRef.current.scale.setScalar(pulse)
    } else {
      groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05)
    }
  })

  return (
    <group>
      <group ref={groupRef}>
        <AgentBody color={color} agentId={agent.id} />
        {agent.isSpeaking && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
            <ringGeometry args={[0.6, 0.8, 32]} />
            <meshBasicMaterial color={agent.color} transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        )}
        <Text position={[0, 1.8, 0]} fontSize={0.2} color={agent.color} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
          {agent.name}
        </Text>
      </group>
      <ChatBubble agentId={agent.id} text={agent.lastMessage} color={agent.color} isSpeaking={agent.isSpeaking} />
    </group>
  )
}

function AgentBody({ color, agentId }: { color: THREE.Color; agentId: number }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame((_, delta) => { if (ref.current) { ref.current.rotation.y += delta * 0.3; ref.current.rotation.x += delta * 0.1 } })

  if (agentId === 3) {
    return (
      <group ref={ref} position={[0, 0.5, 0]}>
        <mesh><sphereGeometry args={[0.4, 16, 16]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.4} emissive={color} emissiveIntensity={0.1} /></mesh>
        <mesh position={[0, -0.3, 0.3]} rotation={[0.5, 0, 0]}><coneGeometry args={[0.25, 0.3, 8]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.4} /></mesh>
        <mesh position={[-0.5, 0.1, 0]} rotation={[0, 0, -0.3]}><boxGeometry args={[0.3, 0.1, 0.1]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.4} /></mesh>
        <mesh position={[0.5, 0.1, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.3, 0.1, 0.1]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.4} /></mesh>
        <mesh position={[-0.15, 0.15, -0.35]}><sphereGeometry args={[0.06, 8, 8]} /><meshBasicMaterial color="#fff" /></mesh>
        <mesh position={[0.15, 0.15, -0.35]}><sphereGeometry args={[0.06, 8, 8]} /><meshBasicMaterial color="#fff" /></mesh>
        <mesh position={[-0.15, 0.13, -0.4]}><sphereGeometry args={[0.03, 8, 8]} /><meshBasicMaterial color="#000" /></mesh>
        <mesh position={[0.15, 0.13, -0.4]}><sphereGeometry args={[0.03, 8, 8]} /><meshBasicMaterial color="#000" /></mesh>
      </group>
    )
  }

  const geo = agentId === 1 ? <icosahedronGeometry args={[0.5, 0]} /> : <torusKnotGeometry args={[0.4, 0.15, 32, 16]} />
  return (
    <group ref={ref} position={[0, 0.5, 0]}>
      <mesh>
        {geo}
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} emissive={color} emissiveIntensity={0.08} />
      </mesh>
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[0.55, 0.6, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
