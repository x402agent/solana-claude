import { useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { SceneBackdrop } from "./components/SceneBackdrop";
import { SandboxPage } from "./components/SandboxPage";
import { InferencePage } from "./components/InferencePage";
import { BillingPage } from "./components/BillingPage";
import { PlaceholderPage } from "./components/PlaceholderPage";
import { mockDashboard } from "./data/mockDashboard";
import type { NavKey } from "./types";

const headerByView: Record<NavKey, { title: string; subtitle: string }> = {
  sandboxes: {
    title: "CLAWD Cloud",
    subtitle: "Cloud infrastructure for autonomous AI, rebuilt as a sovereign lobster trench.",
  },
  inference: {
    title: "Inference",
    subtitle: "AI playground powered by CLAWD routing and trench-safe model controls.",
  },
  billing: {
    title: "Billing",
    subtitle: "Manage credits, wallet reserves, and token-backed compute purchases.",
  },
  spawn: {
    title: "Spawn Automations",
    subtitle: "Brood management, lineage controls, and sovereign deployment recipes.",
  },
  keys: {
    title: "API Keys",
    subtitle: "Provisioned secrets, scoped access, and shell-safe operator credentials.",
  },
};

export function App() {
  const [active, setActive] = useState<NavKey>("sandboxes");
  const state = mockDashboard;

  return (
    <div className="app-shell">
      <SceneBackdrop />
      <Sidebar
        active={active}
        onSelect={setActive}
        walletShort={state.identity.walletShort}
        ageDays={state.identity.accountAgeDays}
      />
      <main className="main-shell">
        <Header {...headerByView[active]} />
        {active === "sandboxes" ? <SandboxPage state={state} /> : null}
        {active === "inference" ? <InferencePage state={state} /> : null}
        {active === "billing" ? <BillingPage state={state} /> : null}
        {active === "spawn" ? (
          <PlaceholderPage
            title="Spawn Automations"
            copy="Next step: wire this page to automaton lineage, sandbox creation, and on-chain spawn funding using SOL, USDC, and $CLAWD."
          />
        ) : null}
        {active === "keys" ? (
          <PlaceholderPage
            title="API Keys"
            copy="Next step: bind this to provisioned runtime keys, pay.sh configuration, and inference-provider scopes."
          />
        ) : null}
      </main>
    </div>
  );
}
