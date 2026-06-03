// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Panel Components (Bloomberg-style)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Box, Text } from 'ink';

// ─────────────────────────────────────────────────────────────────────────────
// Base Panel Component
// ─────────────────────────────────────────────────────────────────────────────

interface PanelProps {
  title: string;
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderColor?: string;
  accentColor?: string;
  flex?: number;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  width,
  height,
  borderColor = 'green',
  accentColor = 'greenBright',
  flex,
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={borderColor}
      width={width}
      height={height}
      flexGrow={flex}
    >
      {/* Panel Header */}
      <Box paddingX={1} marginBottom={0}>
        <Text color={accentColor} bold>
          ╔═══ {title} ═══╗
        </Text>
      </Box>

      {/* Panel Content */}
      <Box flexDirection="column" paddingX={1} flexGrow={1}>
        {children}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Market Data Panel
// ─────────────────────────────────────────────────────────────────────────────

interface MarketTicker {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

interface MarketPanelProps {
  tickers: MarketTicker[];
  title?: string;
}

export const MarketPanel: React.FC<MarketPanelProps> = ({ tickers, title = 'MARKET DATA' }) => {
  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
    return vol.toFixed(0);
  };

  return (
    <Panel title={title} accentColor="cyan">
      {/* Header Row */}
      <Box>
        <Text color="gray">{'SYMBOL'.padEnd(10)}</Text>
        <Text color="gray">{'PRICE'.padStart(12)}</Text>
        <Text color="gray">{'CHG%'.padStart(10)}</Text>
        <Text color="gray">{'VOL'.padStart(10)}</Text>
      </Box>
      <Text color="gray">{'─'.repeat(42)}</Text>

      {/* Ticker Rows */}
      {tickers.map((ticker) => (
        <Box key={ticker.symbol}>
          <Text color="white" bold>
            {ticker.symbol.padEnd(10)}
          </Text>
          <Text color="cyan">{formatPrice(ticker.price).padStart(12)}</Text>
          <Text color={ticker.changePercent >= 0 ? 'green' : 'red'}>
            {(ticker.changePercent >= 0 ? '+' : '') + ticker.changePercent.toFixed(2).padStart(9)}%
          </Text>
          <Text color="gray">{ticker.volume ? formatVolume(ticker.volume).padStart(10) : ''.padStart(10)}</Text>
        </Box>
      ))}
    </Panel>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Wallet Panel
// ─────────────────────────────────────────────────────────────────────────────

interface WalletPanelProps {
  address: string;
  solBalance: number;
  usdValue: number;
  tokens: Array<{ symbol: string; balance: number; value: number }>;
}

export const WalletPanel: React.FC<WalletPanelProps> = ({ address, solBalance, usdValue, tokens }) => {
  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <Panel title="WALLET" accentColor="yellow">
      <Box>
        <Text color="gray">[ADDR] </Text>
        <Text color="white">{shortAddress}</Text>
      </Box>
      <Box>
        <Text color="gray">[SOL]  </Text>
        <Text color="cyan" bold>
          {solBalance.toFixed(4)}
        </Text>
      </Box>
      <Box>
        <Text color="gray">[USD]  </Text>
        <Text color="green" bold>
          ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
      </Box>
      <Text color="gray">{'─'.repeat(30)}</Text>
      <Text color="gray">Holdings ({tokens.length}):</Text>
      {tokens.slice(0, 5).map((token) => (
        <Box key={token.symbol}>
          <Text color="white">{token.symbol.padEnd(8)}</Text>
          <Text color="cyan">{token.balance.toFixed(2).padStart(12)}</Text>
          <Text color="green">${token.value.toFixed(2).padStart(10)}</Text>
        </Box>
      ))}
    </Panel>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// News Feed Panel
// ─────────────────────────────────────────────────────────────────────────────

interface NewsItem {
  title: string;
  source: string;
  time: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface NewsPanelProps {
  news: NewsItem[];
}

export const NewsPanel: React.FC<NewsPanelProps> = ({ news }) => {
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'green';
      case 'negative':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return '▲';
      case 'negative':
        return '▼';
      default:
        return '●';
    }
  };

  return (
    <Panel title="NEWS FEED" accentColor="magenta">
      {news.map((item, index) => (
        <Box key={index} flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={getSentimentColor(item.sentiment)}>{getSentimentIcon(item.sentiment)} </Text>
            <Text color="white" wrap="truncate">
              {item.title.length > 50 ? item.title.slice(0, 47) + '...' : item.title}
            </Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color="gray" dimColor>
              {item.source} • {item.time}
            </Text>
          </Box>
        </Box>
      ))}
    </Panel>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Agent Activity Panel
// ─────────────────────────────────────────────────────────────────────────────

interface AgentActivity {
  agent: string;
  action: string;
  status: 'running' | 'complete' | 'pending' | 'error';
  timestamp: string;
}

interface AgentPanelProps {
  activities: AgentActivity[];
  activeAgent?: string;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ activities, activeAgent }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'yellow';
      case 'complete':
        return 'green';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return '◐';
      case 'complete':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '○';
    }
  };

  return (
    <Panel title="AGENT MESH" accentColor="blue">
      {activeAgent && (
        <Box marginBottom={1}>
          <Text color="yellow">Active: </Text>
          <Text color="yellowBright" bold>
            {activeAgent}
          </Text>
        </Box>
      )}
      <Text color="gray">{'─'.repeat(30)}</Text>
      {activities.map((activity, index) => (
        <Box key={index}>
          <Text color={getStatusColor(activity.status)}>{getStatusIcon(activity.status)} </Text>
          <Text color="cyan">{activity.agent.padEnd(8)}</Text>
          <Text color="white">{activity.action}</Text>
        </Box>
      ))}
    </Panel>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stats Panel
// ─────────────────────────────────────────────────────────────────────────────

interface StatsProps {
  stats: Array<{ label: string; value: string | number; color?: string }>;
}

export const StatsPanel: React.FC<StatsProps> = ({ stats }) => {
  return (
    <Panel title="STATISTICS" accentColor="green">
      {stats.map((stat, index) => (
        <Box key={index} justifyContent="space-between">
          <Text color="gray">{stat.label}:</Text>
          <Text color={(stat.color as any) || 'cyan'}>{stat.value}</Text>
        </Box>
      ))}
    </Panel>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Chart Panel (ASCII Sparkline)
// ─────────────────────────────────────────────────────────────────────────────

interface ChartPanelProps {
  title: string;
  data: number[];
  height?: number;
  color?: string;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({ title, data, height = 5, color = 'green' }) => {
  const sparklineChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  const renderSparkline = (values: number[], h: number) => {
    if (values.length === 0) return '';

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values
      .map((v) => {
        const normalized = (v - min) / range;
        const charIndex = Math.min(Math.floor(normalized * sparklineChars.length), sparklineChars.length - 1);
        return sparklineChars[charIndex];
      })
      .join('');
  };

  const lastValue = data[data.length - 1] || 0;
  const firstValue = data[0] || 0;
  const change = ((lastValue - firstValue) / firstValue) * 100;

  return (
    <Panel title={title}>
      <Box flexDirection="column">
        <Text color={color as any}>{renderSparkline(data.slice(-40), height)}</Text>
        <Box marginTop={1}>
          <Text color="gray">Last: </Text>
          <Text color="cyan">${lastValue.toFixed(4)}</Text>
          <Text color="gray"> │ </Text>
          <Text color={change >= 0 ? 'green' : 'red'}>
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}%
          </Text>
        </Box>
      </Box>
    </Panel>
  );
};

export default Panel;
