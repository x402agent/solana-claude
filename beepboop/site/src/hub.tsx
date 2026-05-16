import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import {
  DynamicContextProvider,
  DynamicWidget,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Install {
  _id: string;
  source: string;
  os: string;
  arch: string;
  nodeVersion?: string;
  status: string;
  sessionId: string;
  ts: number;
  ip?: string;
  walletAddress?: string;
}

interface Stats {
  total: number;
  complete: number;
  started: number;
  failed: number;
  byOs: Record<string, number>;
  bySource: Record<string, number>;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const DYNAMIC_ENV_ID = "76e0eab2-2432-4489-ba9c-b82291cb23b9";
const API_BASE = window.location.origin;

// Session ID from leviathan.sh is stored in localStorage after install
const LOCAL_SESSION_KEY = "clawd_leviathan_session";

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap');

  :root {
    --orange: #FF6B00;
    --amber: #FF8C00;
    --dim: #444;
    --bg: #000;
    --bg2: #0d0d0d;
    --bg3: #1a0a00;
    --border: rgba(255,107,0,0.3);
  }

  * { box-sizing: border-box; }

  body {
    font-family: 'JetBrains Mono', monospace;
    background: var(--bg);
    color: var(--amber);
    min-height: 100vh;
    margin: 0;
  }

  .hub-topbar {
    background: rgba(0,0,0,0.9);
    border-bottom: 1px solid var(--border);
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(8px);
  }

  .hub-topbar-brand {
    font-size: 14px;
    font-weight: 800;
    color: var(--orange);
    letter-spacing: 0.08em;
  }

  .hub-topbar-status {
    font-size: 11px;
    color: var(--dim);
    letter-spacing: 0.05em;
  }

  .hub-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  .hub-banner {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 20px 24px;
    margin-bottom: 24px;
    font-size: 12px;
    line-height: 1.7;
  }

  .hub-banner pre {
    color: var(--orange);
    font-family: inherit;
    font-size: 11px;
    white-space: pre-wrap;
  }

  .hub-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  @media (max-width: 700px) {
    .hub-grid { grid-template-columns: 1fr; }
  }

  .hub-panel {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }

  .hub-panel-title {
    background: var(--bg3);
    border-bottom: 1px solid var(--border);
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 700;
    color: var(--orange);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .hub-panel-body {
    padding: 16px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255,107,0,0.08);
    font-size: 12px;
  }

  .stat-row:last-child { border-bottom: none; }

  .stat-key { color: var(--dim); }
  .stat-val { color: var(--amber); font-weight: 700; }

  .install-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  .install-table th {
    text-align: left;
    color: var(--orange);
    border-bottom: 1px solid var(--border);
    padding: 8px 10px;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .install-table td {
    padding: 7px 10px;
    border-bottom: 1px solid rgba(255,107,0,0.06);
    color: var(--amber);
    vertical-align: top;
  }

  .install-table tr:hover td { background: rgba(255,107,0,0.04); }

  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 2px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .badge-complete { background: rgba(20,241,149,0.15); color: #14F195; }
  .badge-started  { background: rgba(255,107,0,0.15);  color: #FF6B00; }
  .badge-failed   { background: rgba(255,87,87,0.15);   color: #ff5757; }

  .hub-wallet-section {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 24px;
    text-align: center;
    margin-bottom: 24px;
  }

  .hub-wallet-section p {
    font-size: 12px;
    color: var(--dim);
    margin-bottom: 16px;
  }

  .cmd-box {
    background: #030203;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 14px 18px;
    font-size: 13px;
    color: var(--orange);
    font-family: 'JetBrains Mono', monospace;
    margin: 16px 0;
    cursor: pointer;
    transition: border-color 0.15s;
    user-select: all;
  }

  .cmd-box:hover { border-color: var(--amber); }

  .refresh-btn {
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--orange);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    padding: 6px 14px;
    cursor: pointer;
    border-radius: 2px;
    margin-left: 12px;
  }

  .refresh-btn:hover { background: rgba(255,107,0,0.15); }

  .dim { color: var(--dim); font-size: 11px; }
  .full-width { grid-column: 1 / -1; }

  :root { color-scheme: dark; }
`;

// ─── Hub App ─────────────────────────────────────────────────────────────────

function HubApp() {
  const { primaryWallet, user } = useDynamicContext();
  const [stats, setStats] = useState<Stats | null>(null);
  const [installs, setInstalls] = useState<Install[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const walletAddress = primaryWallet?.address;
  const sessionId = localStorage.getItem(LOCAL_SESSION_KEY) ?? undefined;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetch(`${API_BASE}/install/stats`),
        fetch(`${API_BASE}/install/recent`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (recentRes.ok) setInstalls(await recentRes.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Link wallet to session when user connects
  useEffect(() => {
    if (!walletAddress || !sessionId) return;
    fetch(`${API_BASE}/install/link-wallet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, walletAddress }),
    }).catch(() => undefined);
  }, [walletAddress, sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(fetchData, 30_000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const copyCmd = () => {
    navigator.clipboard.writeText("curl -fsSL https://solanaclawd.com/leviathan.sh | sh");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtTs = (ts: number) => new Date(ts).toLocaleString();
  const truncate = (s: string, n = 12) => s.length > n ? s.slice(0, n) + "…" : s;

  return (
    <>
      <style>{css}</style>

      <div className="hub-topbar">
        <div className="hub-topbar-brand">🦞 CLAWD HUB — COMMAND DECK</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <DynamicWidget />
          <span className="hub-topbar-status">
            {walletAddress ? `🟢 ${truncate(walletAddress, 10)}` : "○ not connected"}
          </span>
        </div>
      </div>

      <div className="hub-body">

        {/* Install command */}
        <div className="hub-banner">
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ▓ LEVIATHAN INSTALL COMMAND
          </div>
          <pre onClick={copyCmd} className="cmd-box" style={{ margin: 0, cursor: "pointer" }}>
            curl -fsSL https://solanaclawd.com/leviathan.sh | sh
          </pre>
          <div className="dim" style={{ marginTop: 6 }}>
            {copied ? "✓ copied to clipboard" : "click to copy · every install is tracked below"}
          </div>
        </div>

        {/* Wallet connect prompt */}
        {!walletAddress && (
          <div className="hub-wallet-section">
            <p>Connect your Solana wallet to link your install session and access the full hub.</p>
            <DynamicWidget />
          </div>
        )}

        {/* Connected state */}
        {walletAddress && (
          <div className="hub-wallet-section" style={{ textAlign: "left", marginBottom: 20 }}>
            <div className="dim" style={{ marginBottom: 4 }}>CONNECTED WALLET</div>
            <div style={{ fontSize: 13, wordBreak: "break-all" }}>{walletAddress}</div>
            {user?.email && <div className="dim" style={{ marginTop: 4 }}>email: {user.email}</div>}
            {sessionId && <div className="dim" style={{ marginTop: 4 }}>session: {sessionId}</div>}
          </div>
        )}

        {error && (
          <div style={{ color: "#ff5757", fontSize: 12, marginBottom: 16, padding: "12px 16px", background: "rgba(255,87,87,0.08)", borderRadius: 4, border: "1px solid rgba(255,87,87,0.2)" }}>
            ✖ {error}
            <span className="dim"> — is the worker deployed?</span>
          </div>
        )}

        {/* Stats grid */}
        <div className="hub-grid">
          <div className="hub-panel">
            <div className="hub-panel-title">
              ▸ INSTALL STATS
              <button className="refresh-btn" onClick={fetchData}>↻ refresh</button>
            </div>
            <div className="hub-panel-body">
              {loading ? (
                <div className="dim">loading…</div>
              ) : stats ? (
                <>
                  <div className="stat-row"><span className="stat-key">total installs</span><span className="stat-val">{stats.total}</span></div>
                  <div className="stat-row"><span className="stat-key">complete</span><span className="stat-val" style={{ color: "#14F195" }}>{stats.complete}</span></div>
                  <div className="stat-row"><span className="stat-key">in progress</span><span className="stat-val">{stats.started}</span></div>
                  <div className="stat-row"><span className="stat-key">failed</span><span className="stat-val" style={{ color: "#ff5757" }}>{stats.failed}</span></div>
                </>
              ) : <div className="dim">no data</div>}
            </div>
          </div>

          <div className="hub-panel">
            <div className="hub-panel-title">▸ BY OS</div>
            <div className="hub-panel-body">
              {stats ? Object.entries(stats.byOs).map(([os, count]) => (
                <div key={os} className="stat-row">
                  <span className="stat-key">{os}</span>
                  <span className="stat-val">{count}</span>
                </div>
              )) : <div className="dim">{loading ? "loading…" : "no data"}</div>}
            </div>
          </div>
        </div>

        {/* Recent installs table */}
        <div className="hub-panel full-width">
          <div className="hub-panel-title">▸ RECENT INSTALLS (last 50)</div>
          <div style={{ overflowX: "auto" }}>
            <table className="install-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Source</th>
                  <th>OS / Arch</th>
                  <th>Node</th>
                  <th>Status</th>
                  <th>Session</th>
                  <th>Wallet</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="dim" style={{ padding: 20 }}>loading…</td></tr>
                ) : installs.length === 0 ? (
                  <tr><td colSpan={7} className="dim" style={{ padding: 20 }}>
                    no installs yet — run: curl -fsSL https://solanaclawd.com/leviathan.sh | sh
                  </td></tr>
                ) : installs.map((i) => (
                  <tr key={i._id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--dim)" }}>{fmtTs(i.ts)}</td>
                    <td>{i.source}</td>
                    <td>{i.os} / {i.arch}</td>
                    <td>{i.nodeVersion ?? "—"}</td>
                    <td>
                      <span className={`badge badge-${i.status}`}>{i.status}</span>
                    </td>
                    <td style={{ fontFamily: "monospace", color: "var(--dim)" }}>{truncate(i.sessionId, 14)}</td>
                    <td style={{ fontFamily: "monospace", color: "var(--dim)" }}>
                      {i.walletAddress ? truncate(i.walletAddress, 12) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [SolanaWalletConnectors],
      }}
    >
      <HubApp />
    </DynamicContextProvider>
  </React.StrictMode>
);
