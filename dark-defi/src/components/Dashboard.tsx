// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Main Dashboard Layout (Bloomberg-style)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Box, Text } from 'ink';
import { Panel, MarketPanel, WalletPanel, NewsPanel, AgentPanel, StatsPanel, ChartPanel } from './Panel.js';
import { StatusBar, ApiStatusPanel } from './StatusBar.js';
import { Terminal, QuickCommands } from './Terminal.js';
import type { TerminalMessage } from './Terminal.js';
import type { DarkDefiAutomationSnapshot } from '../services/darkdefi-automation.js';
import { formatBytes } from '../services/darkdefi-automation.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardState {
  mode: 'autonomous' | 'interactive';
  recursionDepth: number;
  thoughts: number;
  apiCalls: number;
  uptime: number;
  wallet: {
    address: string;
    solBalance: number;
    usdValue: number;
    tokens: Array<{ symbol: string; balance: number; value: number }>;
  };
  market: {
    tickers: Array<{
      symbol: string;
      price: number;
      change: number;
      changePercent: number;
      volume?: number;
    }>;
  };
  news: Array<{
    title: string;
    source: string;
    time: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }>;
  agents: Array<{
    agent: string;
    action: string;
    status: 'running' | 'complete' | 'pending' | 'error';
    timestamp: string;
  }>;
  apis: Array<{
    name: string;
    connected: boolean;
    latency?: number;
  }>;
  priceHistory: number[];
  messages: TerminalMessage[];
  automation?: DarkDefiAutomationSnapshot;
}

interface DashboardProps {
  state: DashboardState;
  onCommand: (command: string) => void;
  isProcessing: boolean;
  currentTime: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

export const Dashboard: React.FC<DashboardProps> = ({ state, onCommand, isProcessing, currentTime }) => {
  return (
    <Box flexDirection="column" width="100%">
      {/* Status Bar */}
      <StatusBar
        mode={state.mode}
        recursionDepth={state.recursionDepth}
        thoughts={state.thoughts}
        apiCalls={state.apiCalls}
        apis={state.apis}
        currentTime={currentTime}
      />

      {/* Main Content Area - 3 Column Layout */}
      <Box flexDirection="row" height={25}>
        {/* Left Column - Market & Wallet */}
        <Box flexDirection="column" width="30%">
          <MarketPanel tickers={state.market.tickers.slice(0, 8)} title="TRENDING TOKENS" />
          <WalletPanel
            address={state.wallet.address}
            solBalance={state.wallet.solBalance}
            usdValue={state.wallet.usdValue}
            tokens={state.wallet.tokens}
          />
        </Box>

        {/* Center Column - Terminal */}
        <Box flexDirection="column" width="40%">
          <Terminal
            messages={state.messages}
            onCommand={onCommand}
            isProcessing={isProcessing}
            height={20}
            showInput={true}
          />
        </Box>

        {/* Right Column - News & Agents */}
        <Box flexDirection="column" width="30%">
          <NewsPanel news={state.news.slice(0, 5)} />
          <AgentPanel activities={state.agents} activeAgent="RALPH" />
        </Box>
      </Box>

      {/* Bottom Row - Stats & Chart */}
      <Box flexDirection="row" height={8}>
        <Box width="25%">
          <StatsPanel
            stats={[
              { label: 'Thoughts', value: state.thoughts, color: 'yellow' },
              { label: 'API Calls', value: state.apiCalls, color: 'cyan' },
              { label: 'Recursion', value: state.recursionDepth, color: 'magenta' },
              { label: 'Uptime', value: `${Math.floor(state.uptime / 60)}m ${state.uptime % 60}s`, color: 'green' },
            ]}
          />
        </Box>
        <Box width="50%">
          <ChartPanel title="SOL/USD" data={state.priceHistory} height={4} color="cyan" />
        </Box>
        <Box width="25%">
          {state.automation ? <AutomationMiniPanel automation={state.automation} /> : <ApiStatusPanel apis={state.apis} />}
        </Box>
      </Box>

      {/* Quick Commands */}
      <QuickCommands onCommand={onCommand} />

      {/* Footer */}
      <Box justifyContent="center" paddingY={0}>
        <Text color="gray" dimColor>
          [ENCRYPTED] Session: 0x{Math.random().toString(16).slice(2, 10).toUpperCase()} │ Press ? for help │
          Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  );
};

const AutomationMiniPanel: React.FC<{ automation: DarkDefiAutomationSnapshot }> = ({ automation }) => {
  const live = automation.loops.filter((loop) => loop.status === 'live').length;
  const ready = automation.loops.filter((loop) => loop.status === 'ready').length;
  const blocked = automation.loops.filter((loop) => loop.status === 'blocked').length;

  return (
    <Panel title="AUTOMATION" accentColor="cyan">
      <Box justifyContent="space-between">
        <Text color="gray">Live:</Text>
        <Text color="green">{live}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color="gray">Ready:</Text>
        <Text color="cyan">{ready}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color="gray">Blocked:</Text>
        <Text color={blocked > 0 ? 'yellow' : 'green'}>{blocked}</Text>
      </Box>
      <Text color="gray">{'─'.repeat(22)}</Text>
      {automation.packages.slice(0, 3).map((pkg) => (
        <Box key={pkg.name} justifyContent="space-between">
          <Text color={pkg.present ? 'green' : 'red'}>{pkg.present ? '✓' : '✗'} {pkg.name.replace('@', '').slice(0, 14)}</Text>
          <Text color="gray">{pkg.present ? formatBytes(pkg.sizeBytes) : 'missing'}</Text>
        </Box>
      ))}
    </Panel>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Minimal Dashboard (for smaller terminals)
// ─────────────────────────────────────────────────────────────────────────────

export const MinimalDashboard: React.FC<DashboardProps> = ({ state, onCommand, isProcessing, currentTime }) => {
  return (
    <Box flexDirection="column" width="100%">
      {/* Compact Status */}
      <Box borderStyle="single" borderColor="green" paddingX={1}>
        <Text color="greenBright" bold>
          🦞 MAWD
        </Text>
        <Text color="gray"> │ </Text>
        <Text color={state.mode === 'autonomous' ? 'magenta' : 'yellow'}>{state.mode.toUpperCase()}</Text>
        <Text color="gray"> │ </Text>
        <Text color="cyan">Thoughts: {state.thoughts}</Text>
        <Text color="gray"> │ </Text>
        <Text color="gray">{currentTime.toLocaleTimeString()}</Text>
      </Box>

      {/* Terminal takes most space */}
      <Terminal messages={state.messages} onCommand={onCommand} isProcessing={isProcessing} height={18} showInput={true} />

      {/* Compact footer */}
      <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between">
        <Box>
          <Text color="gray">SOL: </Text>
          <Text color="cyan">${state.market.tickers[0]?.price.toFixed(2) || '---'}</Text>
        </Box>
        <Box>
          <Text color="gray">Wallet: </Text>
          <Text color="green">{state.wallet.solBalance.toFixed(2)} SOL</Text>
        </Box>
        <Box>
          <Text color="gray">APIs: </Text>
          <Text color="green">{state.apis.filter((a) => a.connected).length}/{state.apis.length}</Text>
        </Box>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Focus Mode (Terminal Only)
// ─────────────────────────────────────────────────────────────────────────────

export const FocusMode: React.FC<DashboardProps> = ({ state, onCommand, isProcessing, currentTime }) => {
  return (
    <Box flexDirection="column" width="100%">
      <Box borderStyle="single" borderColor="green" paddingX={1}>
        <Text color="greenBright" bold>
          🦞 MAWD
        </Text>
        <Text color="gray"> │ FOCUS MODE │ </Text>
        <Text color="gray">{currentTime.toLocaleTimeString()}</Text>
      </Box>

      <Terminal messages={state.messages} onCommand={onCommand} isProcessing={isProcessing} height={30} showInput={true} />
    </Box>
  );
};

export default Dashboard;
