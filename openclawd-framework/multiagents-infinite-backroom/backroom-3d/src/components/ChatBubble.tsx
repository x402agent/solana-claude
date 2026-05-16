import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface Props {
  agentId: number
  text: string
  color: string
  isSpeaking: boolean
  maxLength?: number
}

export default function ChatBubble({ agentId, text, color, isSpeaking, maxLength = 200 }: Props) {
  const ref = useRef<THREE.Group>(null!)
  const [displayText, setDisplayText] = useState('')
  const prevTextRef = useRef('')
  const charIndexRef = useRef(0)
  const opacityRef = useRef(0)
  const [visible, setVisible] = useState(false)

  const truncated = useMemo(() => text.length > maxLength ? text.slice(0, maxLength) + '...' : text, [text, maxLength])

  useEffect(() => {
    if (truncated !== prevTextRef.current && truncated) {
      prevTextRef.current = truncated
      charIndexRef.current = 0
      setDisplayText('')
      setVisible(true)
    }
  }, [truncated])

  useFrame((_, delta) => {
    if (!ref.current) return
    if (charIndexRef.current < truncated.length) {
      charIndexRef.current += Math.ceil(delta * 30)
      if (charIndexRef.current > truncated.length) charIndexRef.current = truncated.length
      setDisplayText(truncated.slice(0, charIndexRef.current))
    }
    opacityRef.current = visible ? Math.min(1, opacityRef.current + delta * 2) : Math.max(0, opacityRef.current - delta * 2)
    const bob = Math.sin(Date.now() * 0.002 + agentId) * 0.03
    ref.current.position.y = 2.5 + bob
    if (isSpeaking) ref.current.position.y += Math.sin(Date.now() * 0.005) * 0.02
  })

  useEffect(() => {
    if (!truncated) return
    const t = setTimeout(() => setVisible(false), 8000)
    return () => clearTimeout(t)
  }, [truncated])

  const bgColor = new THREE.Color(color).multiplyScalar(0.15)

  return (
    <group ref={ref} position={[0, 2.5, 0]}>
      <mesh><planeGeometry args={[2.2, 0.8]} /><meshBasicMaterial color={bgColor} transparent opacity={opacityRef.current * 0.85} depthWrite={false} /></mesh>
      <mesh position={[0, 0, 0.01]}><planeGeometry args={[2.18, 0.78]} /><meshBasicMaterial color={color} transparent opacity={opacityRef.current * 0.3} depthWrite={false} wireframe /></mesh>
      <mesh position={[0, -0.38, 0.01]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.12, 0.12, 3]} /><meshBasicMaterial color={bgColor} transparent opacity={opacityRef.current * 0.85} depthWrite={false} /></mesh>
      <Text position={[0, 0, 0.02]} fontSize={0.08} color="#fff" anchorX="center" anchorY="middle" maxWidth={2.0} lineHeight={1.2} fillOpacity={opacityRef.current}>
        {displayText || (isSpeaking ? '...' : '')}
      </Text>
    </group>
  )
}
