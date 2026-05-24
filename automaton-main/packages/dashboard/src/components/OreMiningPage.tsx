import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import {
  Activity,
  CircleDollarSign,
  Clock3,
  Network,
  Pickaxe,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { DashboardState, OreSquare } from "../types";

interface OreMiningPageProps {
  state: DashboardState;
}

function OreBoardGrid({ squares }: { squares: OreSquare[] }) {
  const group = useRef<Group>(null);
  const maxLamports = useMemo(
    () => Math.max(1, ...squares.map((square) => square.lamports)),
    [squares],
  );

  useFrame((frame) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(frame.clock.elapsedTime * 0.18) * 0.16;
  });

  return (
    <group ref={group} rotation={[-0.55, 0, 0.68]}>
      {squares.map((square) => {
        const x = (square.id % 5 - 2) * 0.72;
        const z = (Math.floor(square.id / 5) - 2) * 0.72;
        const weight = square.lamports / maxLamports;
        const height = 0.08 + weight * 0.72;
        const color = square.selected ? "#ffd166" : square.lamports > 0 ? "#14f195" : "#20323a";
        return (
          <group key={square.id} position={[x, 0, z]}>
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[0.56, height, 0.56]} />
              <meshStandardMaterial
                color={color}
                emissive={square.selected ? "#6a4300" : square.lamports > 0 ? "#063d27" : "#071014"}
                metalness={0.42}
                roughness={0.34}
              />
            </mesh>
            <mesh position={[0, -0.035, 0]}>
              <boxGeometry args={[0.62, 0.035, 0.62]} />
              <meshStandardMaterial color="#071015" roughness={0.78} />
            </mesh>
            <Text
              position={[0, height + 0.08, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.12}
              color="#d9fff0"
              anchorX="center"
              anchorY="middle"
            >
              {square.id}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function OreBoardScene({ squares }: { squares: OreSquare[] }) {
  return (
    <Canvas camera={{ position: [3.9, 4.2, 5.6], fov: 42 }}>
      <color attach="background" args={["#020405"]} />
      <fog attach="fog" args={["#020405", 7, 14]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 6, 4]} intensity={2.5} color="#f7d774" />
      <pointLight position={[-4, 3, -2]} intensity={10} color="#14f195" />
      <OreBoardGrid squares={squares} />
      <OrbitControls enablePan={false} minDistance={4.5} maxDistance={8} />
    </Canvas>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "good" | "warn" }) {
  return <span className={`ore-pill ore-pill--${tone}`}>{label}</span>;
}

function CommandBlock({ label, command }: { label: string; command: string }) {
  return (
    <div className="ore-command">
      <div className="ore-command__label">{label}</div>
      <code>{command}</code>
    </div>
  );
}

export function OreMiningPage({ state }: OreMiningPageProps) {
  const { ore } = state;
  const activeSquares = ore.squares.filter((square) => square.lamports > 0).length;
  const totalLamports = ore.squares.reduce((sum, square) => sum + square.lamports, 0);

  return (
    <div className="page-grid ore-page">
      <section className="ore-stage" aria-label="ORE mining board">
        <div className="ore-stage__canvas">
          <OreBoardScene squares={ore.squares} />
        </div>
        <div className="ore-stage__overlay">
          <div>
            <div className="ore-kicker">ORE V3 MAINNET</div>
            <h2>Round {ore.boardRound}</h2>
            <p>5x5 deployment surface, executor-safe automation, Helius RPC path.</p>
          </div>
          <div className="ore-stage__badges">
            <StatusPill label={ore.rpcLabel} tone="good" />
            <StatusPill label={ore.minerStatus === "not_found" ? "miner not initialized" : "miner ready"} tone="warn" />
          </div>
        </div>
      </section>

      <section className="stat-grid">
        <article className="card stat-card">
          <div className="stat-card__head">
            <span>Round clock</span>
            <Clock3 size={18} />
          </div>
          <div className="stat-card__value">{ore.timeRemainingSec.toFixed(1)}s</div>
          <div className="stat-card__sub">mainnet board read</div>
        </article>
        <article className="card stat-card">
          <div className="stat-card__head">
            <span>Active squares</span>
            <Activity size={18} />
          </div>
          <div className="stat-card__value">{activeSquares}/25</div>
          <div className="stat-card__sub">observed deployment heat</div>
        </article>
        <article className="card stat-card">
          <div className="stat-card__head">
            <span>Setup amount</span>
            <CircleDollarSign size={18} />
          </div>
          <div className="stat-card__value">{ore.amountSol}</div>
          <div className="stat-card__sub">SOL per selected square</div>
        </article>
        <article className="card stat-card">
          <div className="stat-card__head">
            <span>Automation deposit</span>
            <ShieldCheck size={18} />
          </div>
          <div className="stat-card__value">{ore.depositSol}</div>
          <div className="stat-card__sub">requires explicit approval</div>
        </article>
      </section>

      <section className="ore-layout">
        <article className="card ore-panel">
          <div className="section-header">
            <div>
              <h2>Execution State</h2>
              <p>Current local integration status from the ORE CLI bridge.</p>
            </div>
            <Pickaxe size={22} />
          </div>
          <div className="ore-state-grid">
            <div>
              <span>Program</span>
              <strong>{ore.programId}</strong>
            </div>
            <div>
              <span>Authority</span>
              <strong>{ore.authorityShort}</strong>
            </div>
            <div>
              <span>Miner PDA</span>
              <strong>{ore.minerStatus === "not_found" ? "not found" : ore.minerStatus}</strong>
            </div>
            <div>
              <span>Automation PDA</span>
              <strong>
                {ore.automationStatus === "not_configured" ? "not configured" : "configured"}
              </strong>
            </div>
            <div>
              <span>Strategy</span>
              <strong>{ore.strategy}</strong>
            </div>
            <div>
              <span>Total displayed</span>
              <strong>{totalLamports.toLocaleString()} lamports</strong>
            </div>
          </div>
        </article>

        <article className="card ore-panel">
          <div className="section-header">
            <div>
              <h2>Operator Commands</h2>
              <p>Commands use the RPC loaded from the local Dark-Defi env file.</p>
            </div>
            <Network size={22} />
          </div>
          <div className="ore-command-list">
            <CommandBlock label="Status" command={ore.commands.status} />
            <CommandBlock label="Setup once" command={ore.commands.setupOnce} />
            <CommandBlock label="Loop" command={ore.commands.minerLoop} />
          </div>
          <div className="notice-panel">
            <Zap size={16} />
            Mainnet setup sends SOL into ORE automation. The dashboard keeps the command staged until amount and deposit are intentionally confirmed.
          </div>
        </article>
      </section>
    </div>
  );
}
