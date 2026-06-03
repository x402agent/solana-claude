// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Full Bloomberg-Style Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout, useFocus } from 'ink';
import TextInput from 'ink-text-input';

// Components
import { CompactHeader } from './Header.js';
import { StatusBar } from './StatusBar.js';
import { PriceChart, Sparkline, TickerRow, PriceTicker } from './PriceChart.js';
import { OrderBook, CompactOrderBook } from './OrderBook.js';
import { DepthChart, MiniDepthChart, ImbalanceIndicator } from './DepthChart.js';
import { TradingPanel, QuickTrade, PnlSummary } from './TradingPanel.js';
import { Portfolio, CompactPortfolio, TokenList, AssetCard } from './Portfolio.js';
import { AlertsPanel, AlertBanner, AlertFeed, WhaleAlert, SignalAlert } from './Alerts.js';
import { MarketHeatmap, SectorHeatmap, CorrelationMatrix, MiniHeatmap } from './Heatmap.js';
import { ActivityFeed, TransactionStream, WalletActivity, NetworkStats, TopMovers } from './ActivityFeed.js';
import type { DarkDefiAutomationSnapshot, AutomationLoopStatus } from '../services/darkdefi-automation.js';
import { formatBytes } from '../services/darkdefi-automation.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ViewMode = 'market' | 'trading' | 'portfolio' | 'analytics' | 'agent' | 'automation';

interface BloombergDashboardProps {
  initialView?: ViewMode;
  agentMessages?: Array<{ role: string; content: string; timestamp: number }>;
  onCommand?: (command: string) => void;
  birdeyeKey?: string;  // API key for real-time data
  walletAddress?: string;
  automation?: DarkDefiAutomationSnapshot;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BLOOMBERG DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export const BloombergDashboard: React.FC<BloombergDashboardProps> = ({
  initialView = 'market',
  agentMessages = [],
  onCommand,
  birdeyeKey,
  walletAddress,
  automation,
}) => {
  const [view, setView] = useState<ViewMode>(initialView);
  const [uptime, setUptime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Get terminal dimensions
  const termWidth = stdout?.columns || 120;
  const termHeight = stdout?.rows || 40;

  // Update time and uptime
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setUptime((u) => u + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle keyboard shortcuts
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
    }

    // View switching with number keys
    if (input === '1') setView('market');
    if (input === '2') setView('trading');
    if (input === '3') setView('portfolio');
    if (input === '4') setView('analytics');
    if (input === '5') setView('agent');
    if (input === '6') setView('automation');

    // Function keys for quick actions
    if (input === 'h') onCommand?.('/help');
    if (input === 'r') onCommand?.('/refresh');
  });

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>
      {/* Top Bar - Header & Ticker */}
      <TopBar currentTime={currentTime} uptime={uptime} view={view} apiKey={birdeyeKey} />

      {/* Main Content Area */}
      <Box flexGrow={1}>
        {view === 'market' && <MarketView width={termWidth} apiKey={birdeyeKey} />}
        {view === 'trading' && <TradingView width={termWidth} apiKey={birdeyeKey} />}
        {view === 'portfolio' && <PortfolioView width={termWidth} apiKey={birdeyeKey} walletAddress={walletAddress} />}
        {view === 'analytics' && <AnalyticsView width={termWidth} apiKey={birdeyeKey} />}
        {view === 'agent' && <AgentView width={termWidth} messages={agentMessages} onCommand={onCommand} />}
        {view === 'automation' && <AutomationView width={termWidth} automation={automation} />}
      </Box>

      {/* Bottom Bar - Navigation & Status */}
      <BottomBar view={view} setView={setView} />
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────────────────────────────────────

const TopBar: React.FC<{ currentTime: Date; uptime: number; view: ViewMode; apiKey?: string }> = ({
  currentTime,
  uptime,
  view,
  apiKey,
}) => {
  return (
    <Box flexDirection="column">
      {/* Header Line */}
      <Box justifyContent="space-between" borderStyle="single" borderColor="green" paddingX={1}>
        <Box>
          <Text color="greenBright" bold>
            🦞 MAWD
          </Text>
          <Text color="gray"> │ </Text>
          <Text color="cyan">{view.toUpperCase()} VIEW</Text>
        </Box>
        <Box>
          <Text color="gray">Uptime: </Text>
          <Text color="cyan">{formatUptime(uptime)}</Text>
          <Text color="gray"> │ </Text>
          <Text color="white">{currentTime.toLocaleTimeString()}</Text>
        </Box>
      </Box>

      {/* Live Ticker */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <TickerRow apiKey={apiKey} />
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM BAR
// ─────────────────────────────────────────────────────────────────────────────

const BottomBar: React.FC<{ view: ViewMode; setView: (v: ViewMode) => void }> = ({
  view,
  setView,
}) => {
  const views: { key: string; view: ViewMode; label: string }[] = [
    { key: '1', view: 'market', label: 'MARKET' },
    { key: '2', view: 'trading', label: 'TRADING' },
    { key: '3', view: 'portfolio', label: 'PORTFOLIO' },
    { key: '4', view: 'analytics', label: 'ANALYTICS' },
    { key: '5', view: 'agent', label: 'AGENT' },
    { key: '6', view: 'automation', label: 'AUTOMATION' },
  ];

  return (
    <Box borderStyle="single" borderColor="green" paddingX={1} justifyContent="space-between">
      <Box>
        {views.map((v, i) => (
          <React.Fragment key={v.key}>
            <Text
              color={view === v.view ? 'greenBright' : 'gray'}
              bold={view === v.view}
              underline={view === v.view}
            >
              [{v.key}] {v.label}
            </Text>
            {i < views.length - 1 && <Text color="gray"> │ </Text>}
          </React.Fragment>
        ))}
      </Box>
      <Box>
        <Text color="gray">[H]elp │ [R]efresh │ [Q]uit</Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MARKET VIEW
// ─────────────────────────────────────────────────────────────────────────────

const MarketView: React.FC<{ width: number; apiKey?: string }> = ({ width, apiKey }) => {
  const colWidth = Math.floor((width - 6) / 3);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Top Row - Charts */}
      <Box>
        <Box width={colWidth * 2 + 2}>
          <PriceChart width={colWidth * 2} height={12} showVolume showMA apiKey={apiKey} />
        </Box>
        <Box flexDirection="column" width={colWidth}>
          <OrderBook depth={6} width={colWidth} />
        </Box>
      </Box>

      {/* Middle Row - Market Data */}
      <Box marginTop={1}>
        <Box width={colWidth}>
          <MarketHeatmap width={colWidth} apiKey={apiKey} />
        </Box>
        <Box width={colWidth}>
          <TopMovers apiKey={apiKey} />
        </Box>
        <Box width={colWidth}>
          <AlertFeed maxItems={6} />
        </Box>
      </Box>

      {/* Bottom Row - Activity */}
      <Box marginTop={1}>
        <Box width={colWidth}>
          <NetworkStats />
        </Box>
        <Box width={colWidth * 2 + 2}>
          <ActivityFeed maxItems={5} />
        </Box>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TRADING VIEW
// ─────────────────────────────────────────────────────────────────────────────

const TradingView: React.FC<{ width: number; apiKey?: string }> = ({ width, apiKey }) => {
  const colWidth = Math.floor((width - 6) / 3);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Top Row - Chart & Order Book */}
      <Box>
        <Box width={colWidth * 2 + 2}>
          <PriceChart width={colWidth * 2} height={14} showVolume showMA apiKey={apiKey} />
        </Box>
        <Box flexDirection="column" width={colWidth}>
          <OrderBook depth={8} width={colWidth} />
        </Box>
      </Box>

      {/* Bottom Row - Trading Panel & Depth */}
      <Box marginTop={1}>
        <Box width={colWidth}>
          <TradingPanel />
        </Box>
        <Box width={colWidth}>
          <DepthChart width={colWidth} height={10} />
        </Box>
        <Box flexDirection="column" width={colWidth}>
          <ImbalanceIndicator />
          <Box marginTop={1}>
            <PnlSummary />
          </Box>
          <Box marginTop={1}>
            <TransactionStream width={colWidth} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO VIEW
// ─────────────────────────────────────────────────────────────────────────────

const PortfolioView: React.FC<{ width: number; apiKey?: string; walletAddress?: string }> = ({ width, apiKey, walletAddress }) => {
  const colWidth = Math.floor((width - 6) / 3);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Top Row - Portfolio Overview */}
      <Box>
        <Box width={colWidth * 2 + 2}>
          <Portfolio width={colWidth * 2} showChart />
        </Box>
        <Box flexDirection="column" width={colWidth}>
          <PnlSummary />
          <Box marginTop={1}>
            <WalletActivity />
          </Box>
        </Box>
      </Box>

      {/* Bottom Row - Holdings & Performance */}
      <Box marginTop={1}>
        <Box width={colWidth}>
          <TokenList title="HOLDINGS" />
        </Box>
        <Box flexDirection="column" width={colWidth}>
          <Text color="greenBright" bold>
            PERFORMANCE
          </Text>
          <Sparkline label="24H" width={35} />
          <Sparkline label="7D" width={35} />
          <Sparkline label="30D" width={35} />
        </Box>
        <Box width={colWidth}>
          <ActivityFeed maxItems={8} title="RECENT ACTIVITY" />
        </Box>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS VIEW
// ─────────────────────────────────────────────────────────────────────────────

const AnalyticsView: React.FC<{ width: number; apiKey?: string }> = ({ width, apiKey }) => {
  const colWidth = Math.floor((width - 6) / 3);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Top Row - Heatmaps */}
      <Box>
        <Box width={colWidth * 2 + 2}>
          <MarketHeatmap width={colWidth * 2} apiKey={apiKey} />
        </Box>
        <Box width={colWidth}>
          <SectorHeatmap />
        </Box>
      </Box>

      {/* Middle Row - Analytics */}
      <Box marginTop={1}>
        <Box width={colWidth}>
          <CorrelationMatrix />
        </Box>
        <Box width={colWidth}>
          <TopMovers apiKey={apiKey} />
        </Box>
        <Box width={colWidth}>
          <DepthChart width={colWidth} height={10} />
        </Box>
      </Box>

      {/* Bottom Row - Signals */}
      <Box marginTop={1}>
        <Box flexDirection="column" width={colWidth}>
          <SignalAlert signal="BUY" token="SOL" confidence={78} reason="Bullish divergence on RSI" price={150.5} />
        </Box>
        <Box width={colWidth * 2 + 2}>
          <AlertFeed maxItems={6} title="TRADING SIGNALS" />
        </Box>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AGENT VIEW
// ─────────────────────────────────────────────────────────────────────────────

const AgentView: React.FC<{
  width: number;
  messages: Array<{ role: string; content: string; timestamp: number }>;
  onCommand?: (command: string) => void;
}> = ({ width, messages, onCommand }) => {
  const colWidth = Math.floor((width - 6) / 3);
  const [input, setInput] = useState('');
  const { isFocused } = useFocus({ autoFocus: true });

  const defaultMessages = messages.length > 0 ? messages : [
    { role: 'system', content: 'Dark Ralph initialized. Recursive thought loop active.', timestamp: Date.now() - 60000 },
    { role: 'assistant', content: '[SCANNING] Monitoring market conditions...', timestamp: Date.now() - 45000 },
    { role: 'assistant', content: '[SIGNAL] SOL showing bullish divergence on 4H timeframe.', timestamp: Date.now() - 30000 },
    { role: 'assistant', content: '[ALERT] Whale activity detected: 10,000 SOL moved to exchange.', timestamp: Date.now() - 15000 },
    { role: 'assistant', content: '[THINKING] Analyzing correlation patterns across DeFi sector...', timestamp: Date.now() },
  ];

  const handleSubmit = (value: string) => {
    if (value.trim() && onCommand) {
      onCommand(value.trim());
      setInput('');
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Top Row - Agent Status & Market Context */}
      <Box>
        <Box flexDirection="column" width={colWidth * 2 + 2}>
          <Box borderStyle="double" borderColor="green" padding={1} flexDirection="column">
            <Text color="greenBright" bold>
              🦞 MAWD - AUTONOMOUS AGENT
            </Text>
            <Text color="gray">─────────────────────────────────────────</Text>
            <Box marginTop={1}>
              <Text color="cyan">Status: </Text>
              <Text color="green">● ACTIVE</Text>
              <Text color="gray"> │ </Text>
              <Text color="cyan">Mode: </Text>
              <Text color="yellow">AUTONOMOUS</Text>
              <Text color="gray"> │ </Text>
              <Text color="cyan">Depth: </Text>
              <Text color="magenta">∞ RECURSIVE</Text>
            </Box>

            {/* Agent Messages */}
            <Box flexDirection="column" marginTop={1}>
              <Text color="gray">─── THOUGHT STREAM ───</Text>
              {defaultMessages.slice(-5).map((msg, i) => (
                <Box key={i}>
                  <Text color="gray" dimColor>
                    {formatTimeShort(msg.timestamp)}
                  </Text>
                  <Text color={msg.role === 'system' ? 'yellow' : 'greenBright'}> {msg.content}</Text>
                </Box>
              ))}
            </Box>

            {/* Command Matrix */}
            <Box marginTop={1} borderStyle="round" borderColor="yellow" padding={1}>
              <Text color="yellowBright" bold>
                🦞 MAWD COMMAND MATRIX
              </Text>
              <Box flexDirection="column" marginTop={1}>
                <Text color="cyan">/trending</Text>
                <Text color="gray"> - Fetch live trending tokens (Birdeye)</Text>
                <Text color="cyan">/wallet</Text>
                <Text color="gray"> - Display wallet balance & holdings</Text>
                <Text color="cyan">/price &lt;addr&gt;</Text>
                <Text color="gray"> - Get token price</Text>
                <Text color="cyan">/news [topic]</Text>
                <Text color="gray"> - Get latest crypto news</Text>
                <Text color="cyan">/search &lt;q&gt;</Text>
                <Text color="gray"> - Real-time search with Grok</Text>
                <Text color="cyan">/research &lt;q&gt;</Text>
                <Text color="gray"> - Deep research with Perplexity</Text>
                <Text color="cyan">/mode &lt;type&gt;</Text>
                <Text color="gray"> - Switch mode (auto | interactive)</Text>
                <Text color="cyan">/think</Text>
                <Text color="gray"> - Trigger recursive thought spiral</Text>
                <Text color="cyan">/prophecy</Text>
                <Text color="gray"> - Generate cryptic market prophecy</Text>
                <Text color="cyan">/stats</Text>
                <Text color="gray"> - Display system statistics</Text>
                <Text color="cyan">/clear</Text>
                <Text color="gray"> - Clear terminal history</Text>
              </Box>
            </Box>

            {/* Input Area */}
            <Box marginTop={1} borderStyle="round" borderColor="cyan" padding={1}>
              <Text color="cyan">[&gt;] </Text>
              <TextInput
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                placeholder="Type a command or question..."
                focus={isFocused}
              />
            </Box>
          </Box>
        </Box>

        {/* Right Panel - Context */}
        <Box flexDirection="column" width={colWidth}>
          <NetworkStats />
          <Box marginTop={1}>
            <MiniHeatmap />
          </Box>
        </Box>
      </Box>

      {/* Bottom Row - Agent Tools */}
      <Box marginTop={1}>
        <Box width={colWidth}>
          <AlertFeed maxItems={5} title="DETECTED SIGNALS" />
        </Box>
        <Box width={colWidth}>
          <TopMovers />
        </Box>
        <Box flexDirection="column" width={colWidth}>
          <Box borderStyle="single" borderColor="green" paddingX={1}>
            <Text color="greenBright" bold>
              AGENT COMMANDS
            </Text>
          </Box>
          <Box flexDirection="column" paddingX={1}>
            <Text color="cyan">/analyze</Text>
            <Text color="gray"> - Deep market analysis</Text>
            <Text color="cyan">/trending</Text>
            <Text color="gray"> - Show trending tokens</Text>
            <Text color="cyan">/wallet</Text>
            <Text color="gray"> - Wallet info</Text>
            <Text color="cyan">/news</Text>
            <Text color="gray"> - Latest crypto news</Text>
            <Text color="cyan">/prophecy</Text>
            <Text color="gray"> - Ralph's predictions</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATION VIEW
// ─────────────────────────────────────────────────────────────────────────────

const AutomationView: React.FC<{
  width: number;
  automation?: DarkDefiAutomationSnapshot;
}> = ({ width, automation }) => {
  const colWidth = Math.floor((width - 6) / 3);
  const snapshot = automation;

  if (!snapshot) {
    return (
      <Box padding={1}>
        <Box borderStyle="double" borderColor="cyan" padding={1}>
          <Text color="cyan" bold>DARKDEFI AUTOMATION</Text>
          <Text color="gray"> Loading loop telemetry...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Box width={colWidth * 2 + 2} flexDirection="column">
          <Box borderStyle="double" borderColor="cyan" padding={1} flexDirection="column">
            <Text color="cyanBright" bold>
              DARKDEFI AUTOMATION CONTROL PLANE
            </Text>
            <Text color="gray">Release gate, edge API, automaton runtime, package candidates, and staking registry.</Text>
            <Box marginTop={1}>
              <Text color="gray">Snapshot: </Text>
              <Text color="white">{new Date(snapshot.generatedAt).toLocaleTimeString()}</Text>
              <Text color="gray"> │ Target: </Text>
              <Text color="yellow">${Number(snapshot.releaseGate.target).toLocaleString()}</Text>
              <Text color="gray"> │ Program: </Text>
              <Text color="magenta">{shorten(snapshot.solanaProgram.programId)}</Text>
            </Box>
          </Box>

          <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="green" padding={1}>
            <Text color="greenBright" bold>LOOPS</Text>
            {snapshot.loops.map((loop) => (
              <Box key={loop.id} flexDirection="column" marginTop={1}>
                <Box>
                  <Text color={statusColor(loop.status)}>{statusGlyph(loop.status)} </Text>
                  <Text color="white" bold>{loop.label}</Text>
                  <Text color="gray"> │ </Text>
                  <Text color={statusColor(loop.status)}>{loop.status.toUpperCase()}</Text>
                </Box>
                <Text color="gray">  {loop.detail}</Text>
                <Text color="cyan">  {loop.action}</Text>
              </Box>
            ))}
          </Box>
        </Box>

        <Box width={colWidth} flexDirection="column">
          <AutomationStatusCard title="RELEASE GATE" borderColor="yellow">
            <StatusLine label="Workflow" ok={snapshot.releaseGate.workflowReady} />
            <StatusLine label="Birdeye" ok={snapshot.releaseGate.birdeyeConfigured} />
            <StatusLine label="Token" ok={snapshot.releaseGate.tokenAddressConfigured} />
            <Text color="gray">Target: ${Number(snapshot.releaseGate.target).toLocaleString()}</Text>
          </AutomationStatusCard>

          <AutomationStatusCard title="EDGE API" borderColor="cyan">
            <StatusLine label="Staging" ok={snapshot.cloudflare.stagingHealthy} />
            <StatusLine label="Production" ok={snapshot.cloudflare.productionHealthy} />
            <Text color="gray">{shorten(snapshot.cloudflare.productionUrl, 36)}</Text>
          </AutomationStatusCard>

          <AutomationStatusCard title="SOLANA" borderColor="magenta">
            <StatusLine label="SBF Artifact" ok={snapshot.solanaProgram.artifactBuilt} />
            <StatusLine label="Mainnet Deploy" ok={!snapshot.solanaProgram.deployBlocked} />
            {snapshot.solanaPrograms.slice(0, 4).map((programInfo) => (
              <StatusLine
                key={programInfo.name}
                label={programInfo.name.slice(0, 18)}
                ok={programInfo.devnetDeployed}
              />
            ))}
            <Text color="yellow">{snapshot.solanaProgram.blocker}</Text>
          </AutomationStatusCard>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Box width={colWidth * 2 + 2} borderStyle="single" borderColor="blue" padding={1} flexDirection="column">
          <Text color="blueBright" bold>PACKAGE RELEASE CANDIDATES</Text>
          {snapshot.packages.map((pkg) => (
            <Box key={pkg.name} justifyContent="space-between">
              <Text color={pkg.present ? 'green' : 'red'}>
                {pkg.present ? '✓' : '✗'} {pkg.name.padEnd(30)}
              </Text>
              <Text color="gray">{pkg.present ? formatBytes(pkg.sizeBytes).padStart(9) : 'missing'.padStart(9)}</Text>
              <Text color={pkg.publishable ? 'cyan' : 'yellow'}> {pkg.publishable ? 'npm' : 'internal'}</Text>
            </Box>
          ))}
        </Box>

        <Box width={colWidth} borderStyle="single" borderColor="green" padding={1} flexDirection="column">
          <Text color="greenBright" bold>ACTIONS</Text>
          <Text color="cyan">/automation</Text>
          <Text color="gray"> - Refresh loop telemetry</Text>
          <Text color="cyan">/status</Text>
          <Text color="gray"> - API and release readiness</Text>
          <Text color="cyan">/release-gate</Text>
          <Text color="gray"> - Gate condition and blockers</Text>
          <Text color="cyan">/help</Text>
          <Text color="gray"> - Command list</Text>
          <Box marginTop={1}>
            <Text color="yellow">npm publish waits on npm auth. Solana deploy waits on funding and warning cleanup.</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const AutomationStatusCard: React.FC<{ title: string; borderColor: string; children: React.ReactNode }> = ({
  title,
  borderColor,
  children,
}) => (
  <Box borderStyle="single" borderColor={borderColor as any} padding={1} flexDirection="column" marginBottom={1}>
    <Text color={borderColor as any} bold>{title}</Text>
    {children}
  </Box>
);

const StatusLine: React.FC<{ label: string; ok: boolean }> = ({ label, ok }) => (
  <Box justifyContent="space-between">
    <Text color="gray">{label}:</Text>
    <Text color={ok ? 'green' : 'yellow'}>{ok ? 'READY' : 'BLOCKED'}</Text>
  </Box>
);

function statusColor(status: AutomationLoopStatus): string {
  if (status === 'live') return 'green';
  if (status === 'ready') return 'cyan';
  if (status === 'blocked') return 'red';
  return 'yellow';
}

function statusGlyph(status: AutomationLoopStatus): string {
  if (status === 'live') return '●';
  if (status === 'ready') return '◆';
  if (status === 'blocked') return '■';
  return '◐';
}

function shorten(value: string, maxLength = 12): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimeShort(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default BloombergDashboard;
