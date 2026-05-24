import {
  Box,
  Bot,
  CreditCard,
  KeyRound,
  Pickaxe,
  Rocket,
} from "lucide-react";
import type { NavKey } from "../types";

const items: Array<{ key: NavKey; label: string; icon: typeof Box }> = [
  { key: "sandboxes", label: "Sandboxes", icon: Box },
  { key: "ore", label: "ORE Miner", icon: Pickaxe },
  { key: "inference", label: "Inference", icon: Bot },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "spawn", label: "Spawn Automations", icon: Rocket },
  { key: "keys", label: "API Keys", icon: KeyRound },
];

interface SidebarProps {
  active: NavKey;
  onSelect: (next: NavKey) => void;
  walletShort: string;
  ageDays: number;
}

export function Sidebar({ active, onSelect, walletShort, ageDays }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__glyph">🦞</div>
        <div>
          <div className="sidebar__eyebrow">// TRENCH NAV</div>
          <div className="sidebar__title">CRUSTACEAN AUTOMATION</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              className={`sidebar__link ${item.key === active ? "is-active" : ""}`}
              onClick={() => onSelect(item.key)}
              type="button"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar__wallet">
        <div className="sidebar__wallet-age">{ageDays}</div>
        <div>
          <div className="sidebar__wallet-label">// SHELL IDENTITY</div>
          <div className="sidebar__wallet-value">{walletShort}</div>
        </div>
      </div>
    </aside>
  );
}
