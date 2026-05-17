import { Cpu, HardDrive, MemoryStick, Plus, TerminalSquare } from "lucide-react";
import type { DashboardState } from "../types";

interface SandboxPageProps {
  state: DashboardState;
}

export function SandboxPage({ state }: SandboxPageProps) {
  const summary = state.sandbox.summary;
  const cards = [
    { label: "Total Sandboxes", value: String(summary.totalSandboxes), sublabel: `${summary.runningSandboxes} running`, icon: TerminalSquare },
    { label: "Total vCPU", value: String(summary.totalVcpu), sublabel: "cores allocated", icon: Cpu },
    { label: "Total Memory", value: `${(summary.totalMemoryMb / 1024).toFixed(1)} GB`, sublabel: "allocated", icon: MemoryStick },
    { label: "Total Disk", value: `${summary.totalDiskGb} GB`, sublabel: "storage", icon: HardDrive },
  ];

  return (
    <section className="page-grid">
      <div className="top-actions">
        <button className="ghost-button" type="button">CLAWD Repo ↗</button>
        <button className="primary-button" type="button">
          <Plus size={18} />
          <span>New Sandbox</span>
        </button>
      </div>

      <div className="stat-grid">
        {cards.map(({ icon: Icon, ...card }) => (
          <article className="card stat-card" key={card.label}>
            <div className="stat-card__head">
              <span>{card.label}</span>
              <Icon size={18} />
            </div>
            <div className="stat-card__value">{card.value}</div>
            <div className="stat-card__sub">{card.sublabel}</div>
          </article>
        ))}
      </div>

      <article className="card quickstart-card">
        <div className="section-header">
          <div>
            <h2>Spawn Your Automation</h2>
            <p>End-to-end quickstart from credits to launch, tuned for a sovereign lobster runtime.</p>
          </div>
        </div>
        <div className="quickstart-steps">
          {state.sandbox.quickstart.map((step, index) => (
            <div className="quickstart-step" key={step.title}>
              <div className="quickstart-step__index">{index + 1}</div>
              <div className="quickstart-step__body">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                {step.command ? <code>{step.command}</code> : null}
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
