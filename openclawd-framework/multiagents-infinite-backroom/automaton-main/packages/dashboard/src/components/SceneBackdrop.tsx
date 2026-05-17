import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group } from "three";

function LobsterGlyphs() {
  const group = useRef<Group>(null);
  const nodes = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        key: i,
        position: [
          (Math.random() - 0.5) * 16,
          (Math.random() - 0.5) * 9,
          (Math.random() - 0.5) * 6,
        ] as [number, number, number],
        scale: 0.06 + Math.random() * 0.14,
      })),
    [],
  );

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.06) * 0.08;
  });

  return (
    <group ref={group}>
      {nodes.map((node) => (
        <Float key={node.key} speed={1.2} rotationIntensity={0.25} floatIntensity={0.55}>
          <mesh position={node.position} scale={node.scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={node.key % 3 === 0 ? "#8b5cf6" : node.key % 2 === 0 ? "#0f4c81" : "#db2777"}
              emissive={node.key % 3 === 0 ? "#35115f" : "#08233f"}
              transparent
              opacity={0.72}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function LobsterCore() {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.25;
  });

  return (
    <group ref={ref} position={[3.4, -0.6, -0.5]}>
      <mesh>
        <icosahedronGeometry args={[0.72, 0]} />
        <meshStandardMaterial color="#f97316" emissive="#5b1c08" metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh position={[0.92, 0.12, 0]}>
        <torusGeometry args={[0.28, 0.06, 14, 28]} />
        <meshStandardMaterial color="#a855f7" emissive="#30114a" />
      </mesh>
      <mesh position={[-0.92, 0.12, 0]}>
        <torusGeometry args={[0.28, 0.06, 14, 28]} />
        <meshStandardMaterial color="#a855f7" emissive="#30114a" />
      </mesh>
    </group>
  );
}

export function SceneBackdrop() {
  return (
    <div className="scene-backdrop" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 7], fov: 50 }}>
        <color attach="background" args={["#07060d"]} />
        <fog attach="fog" args={["#07060d", 5, 14]} />
        <ambientLight intensity={0.65} />
        <pointLight position={[4, 3, 2]} intensity={18} color="#8b5cf6" />
        <pointLight position={[-5, -3, 1]} intensity={12} color="#f97316" />
        <Stars radius={80} depth={40} count={2500} factor={3.4} fade speed={1.1} />
        <LobsterGlyphs />
        <LobsterCore />
      </Canvas>
    </div>
  );
}
