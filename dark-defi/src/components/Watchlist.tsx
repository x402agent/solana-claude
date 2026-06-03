// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Watchlist Component (Bloomberg Style)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface WatchlistToken {
  symbol: string;
  name?: string;
  address?: string;
  price: number;
  change24h: number;
  changePercent: number;
  volume24h?: number;
  marketCap?: number;
  sparkline?: number[];
  alert?: {
    type: 'above' | 'below' | 'change';
    value: number;
    triggered?: boolean;
  };
}

interface WatchlistProps {
  tokens?: WatchlistToken[];
  title?: string;
  width?: number;
  showSparkline?: boolean;
  showVolume?: boolean;
  showMarketCap?: boolean;
  interactive?: boolean;
  onSelect?: (token: WatchlistToken) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// WATCHLIST COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Watchlist: React.FC<WatchlistProps> = ({
  tokens,
  title = 'WATCHLIST',
  width = 70,
  showSparkline = true,
  showVolume = true,
  showMarketCap = false,
  interactive = false,
  onSelect,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const defaultTokens = tokens || generateMockWatchlist();

  // Handle navigation
  useInput(
    (input, key) => {
      if (!interactive) return;

      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(defaultTokens.length - 1, i + 1));
      }
      if (key.return) {
        onSelect?.(defaultTokens[selectedIndex]);
      }
    },
    { isActive: interactive }
  );

  // Create sparkline from data
  const createSparkline = (data?: number[], width = 10) => {
    if (!data || data.length === 0) {
      data = Array.from({ length: width }, () => Math.random() * 100);
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const chars = '▁▂▃▄▅▆▇█';

    return data.slice(-width).map((v) => {
      const normalized = (v - min) / range;
      const index = Math.floor(normalized * 7);
      return chars[Math.min(index, 7)];
    }).join('');
  };

  // Format helpers
  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toFixed(0)}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  const formatVolume = (vol?: number) => {
    if (!vol) return '-';
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green" width={width}>
      {/* Header */}
      <Box justifyContent="space-between" paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          {title}
        </Text>
        <Text color="gray">{defaultTokens.length} tokens</Text>
      </Box>

      {/* Column Headers */}
      <Box paddingX={1} marginTop={1}>
        <Text color="gray">{'SYMBOL'.padEnd(10)}</Text>
        <Text color="gray">{'PRICE'.padStart(12)}</Text>
        <Text color="gray">{'24H %'.padStart(10)}</Text>
        {showSparkline && <Text color="gray">{'CHART'.padStart(12)}</Text>}
        {showVolume && <Text color="gray">{'VOLUME'.padStart(12)}</Text>}
        {showMarketCap && <Text color="gray">{'MCAP'.padStart(12)}</Text>}
      </Box>

      <Box paddingX={1}>
        <Text color="gray">{'─'.repeat(width - 4)}</Text>
      </Box>

      {/* Token Rows */}
      <Box flexDirection="column" paddingX={1}>
        {defaultTokens.map((token, i) => {
          const isSelected = interactive && i === selectedIndex;
          const isUp = token.changePercent >= 0;
          const arrow = isUp ? '▲' : '▼';
          const changeColor = isUp ? 'green' : 'red';
          const sparklineColor = isUp ? 'green' : 'red';

          return (
            <Box key={token.symbol}>
              {interactive && (
                <Text color={isSelected ? 'cyan' : 'gray'}>
                  {isSelected ? '► ' : '  '}
                </Text>
              )}

              {/* Symbol */}
              <Text color={isSelected ? 'cyanBright' : 'cyan'} bold>
                {token.symbol.padEnd(8)}
              </Text>

              {/* Alert indicator */}
              {token.alert && (
                <Text color={token.alert.triggered ? 'yellow' : 'gray'}>
                  {token.alert.triggered ? '🔔' : '○'}{' '}
                </Text>
              )}

              {/* Price */}
              <Text color={isSelected ? 'whiteBright' : 'white'}>
                {formatPrice(token.price).padStart(12)}
              </Text>

              {/* Change */}
              <Text color={changeColor as any}>
                {` ${arrow} ${isUp ? '+' : ''}${token.changePercent.toFixed(2)}%`.padStart(10)}
              </Text>

              {/* Sparkline */}
              {showSparkline && (
                <Text color={sparklineColor as any} dimColor={!isSelected}>
                  {' '}{createSparkline(token.sparkline, 10)}
                </Text>
              )}

              {/* Volume */}
              {showVolume && (
                <Text color="gray">{formatVolume(token.volume24h).padStart(12)}</Text>
              )}

              {/* Market Cap */}
              {showMarketCap && (
                <Text color="gray">{formatVolume(token.marketCap).padStart(12)}</Text>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      {interactive && (
        <Box paddingX={1} marginTop={1} borderTop>
          <Text color="gray" dimColor>
            ↑↓ Navigate • Enter Select • A Add • D Delete
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT WATCHLIST
// ─────────────────────────────────────────────────────────────────────────────

export const CompactWatchlist: React.FC<{
  tokens?: WatchlistToken[];
  maxItems?: number;
}> = ({ tokens, maxItems = 5 }) => {
  const defaultTokens = tokens || generateMockWatchlist().slice(0, maxItems);

  return (
    <Box flexDirection="column">
      {defaultTokens.map((token) => {
        const isUp = token.changePercent >= 0;
        return (
          <Box key={token.symbol}>
            <Text color="cyan">{token.symbol.padEnd(6)}</Text>
            <Text color="white">${token.price < 1 ? token.price.toFixed(6) : token.price.toFixed(2)}</Text>
            <Text color={isUp ? 'green' : 'red'}>
              {' '}{isUp ? '+' : ''}{token.changePercent.toFixed(1)}%
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN DETAIL CARD
// ─────────────────────────────────────────────────────────────────────────────

export const TokenDetailCard: React.FC<{
  token: WatchlistToken;
  width?: number;
}> = ({ token, width = 50 }) => {
  const isUp = token.changePercent >= 0;
  const arrow = isUp ? '▲' : '▼';
  const changeColor = isUp ? 'green' : 'red';

  const sparkline = token.sparkline || Array.from({ length: 20 }, () => Math.random() * 100);
  const min = Math.min(...sparkline);
  const max = Math.max(...sparkline);
  const range = max - min || 1;
  const chars = '▁▂▃▄▅▆▇█';

  const sparklineStr = sparkline.map((v) => {
    const normalized = (v - min) / range;
    const index = Math.floor(normalized * 7);
    return chars[Math.min(index, 7)];
  }).join('');

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="green" width={width}>
      {/* Header */}
      <Box justifyContent="space-between" paddingX={1}>
        <Box>
          <Text color="cyan" bold>
            {token.symbol}
          </Text>
          {token.name && (
            <Text color="gray"> • {token.name}</Text>
          )}
        </Box>
        <Text color="green">● LIVE</Text>
      </Box>

      {/* Price & Change */}
      <Box paddingX={1} marginTop={1}>
        <Text color="white" bold>
          ${token.price < 1 ? token.price.toFixed(8) : token.price.toFixed(2)}
        </Text>
        <Text color={changeColor as any}>
          {' '}{arrow} {isUp ? '+' : ''}${Math.abs(token.change24h).toFixed(4)} ({isUp ? '+' : ''}{token.changePercent.toFixed(2)}%)
        </Text>
      </Box>

      {/* Sparkline Chart */}
      <Box paddingX={1} marginTop={1}>
        <Text color={changeColor as any}>{sparklineStr}</Text>
      </Box>

      {/* Stats */}
      <Box paddingX={1} marginTop={1} flexDirection="column">
        <Box justifyContent="space-between">
          <Text color="gray">24H Volume:</Text>
          <Text color="white">
            {token.volume24h ? `$${(token.volume24h / 1e6).toFixed(2)}M` : '-'}
          </Text>
        </Box>
        <Box justifyContent="space-between">
          <Text color="gray">Market Cap:</Text>
          <Text color="white">
            {token.marketCap ? `$${(token.marketCap / 1e9).toFixed(2)}B` : '-'}
          </Text>
        </Box>
        {token.address && (
          <Box justifyContent="space-between">
            <Text color="gray">Address:</Text>
            <Text color="cyan">
              {token.address.slice(0, 6)}...{token.address.slice(-4)}
            </Text>
          </Box>
        )}
      </Box>

      {/* Alert Status */}
      {token.alert && (
        <Box paddingX={1} marginTop={1} borderTop>
          <Text color="yellow">
            🔔 Alert: {token.alert.type} ${token.alert.value}
            {token.alert.triggered && ' (TRIGGERED)'}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TRENDING TOKENS
// ─────────────────────────────────────────────────────────────────────────────

export const TrendingTokens: React.FC<{
  tokens?: WatchlistToken[];
  title?: string;
  maxItems?: number;
}> = ({ tokens, title = 'TRENDING', maxItems = 5 }) => {
  const defaultTokens = tokens || generateMockWatchlist()
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, maxItems);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green">
      <Box paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          🔥 {title}
        </Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {defaultTokens.map((token, i) => {
          const isUp = token.changePercent >= 0;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

          return (
            <Box key={token.symbol}>
              <Text color="gray">{String(medal).padEnd(3)}</Text>
              <Text color="cyan" bold>
                {token.symbol.padEnd(8)}
              </Text>
              <Text color={isUp ? 'green' : 'red'}>
                {isUp ? '+' : ''}{token.changePercent.toFixed(1)}%
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

function generateMockWatchlist(): WatchlistToken[] {
  return [
    {
      symbol: 'SOL',
      name: 'Solana',
      price: 150.25,
      change24h: 5.32,
      changePercent: 3.67,
      volume24h: 2400000000,
      marketCap: 65000000000,
      sparkline: generateSparkline(),
    },
    {
      symbol: 'BONK',
      name: 'Bonk',
      price: 0.00002345,
      change24h: 0.0000032,
      changePercent: 15.8,
      volume24h: 450000000,
      marketCap: 1500000000,
      sparkline: generateSparkline(),
      alert: { type: 'above', value: 0.00003, triggered: false },
    },
    {
      symbol: 'WIF',
      name: 'dogwifhat',
      price: 2.85,
      change24h: -0.12,
      changePercent: -4.2,
      volume24h: 380000000,
      marketCap: 2800000000,
      sparkline: generateSparkline(),
    },
    {
      symbol: 'JTO',
      name: 'Jito',
      price: 3.21,
      change24h: 0.28,
      changePercent: 8.7,
      volume24h: 220000000,
      marketCap: 450000000,
      sparkline: generateSparkline(),
    },
    {
      symbol: 'PYTH',
      name: 'Pyth Network',
      price: 0.45,
      change24h: 0.023,
      changePercent: 5.1,
      volume24h: 185000000,
      marketCap: 1200000000,
      sparkline: generateSparkline(),
    },
    {
      symbol: 'JUP',
      name: 'Jupiter',
      price: 1.12,
      change24h: -0.02,
      changePercent: -1.8,
      volume24h: 152000000,
      marketCap: 1500000000,
      sparkline: generateSparkline(),
    },
    {
      symbol: 'RENDER',
      name: 'Render Token',
      price: 7.85,
      change24h: 0.45,
      changePercent: 5.73,
      volume24h: 98000000,
      marketCap: 3200000000,
      sparkline: generateSparkline(),
    },
  ];
}

function generateSparkline(length = 20): number[] {
  const data: number[] = [];
  let value = 100 + Math.random() * 50;

  for (let i = 0; i < length; i++) {
    value += (Math.random() - 0.5) * 10;
    data.push(Math.max(0, value));
  }

  return data;
}

export default Watchlist;
