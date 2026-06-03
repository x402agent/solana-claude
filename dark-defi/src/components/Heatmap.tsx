// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Heatmap Component (Bloomberg Style)
// Now with real-time Birdeye data integration
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { getBirdeyeClient, POPULAR_TOKENS } from '../services/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface HeatmapCell {
  symbol: string;
  value: number;
  change: number;
  category?: string;
}

interface HeatmapProps {
  data?: HeatmapCell[];
  title?: string;
  width?: number;
  cellWidth?: number;
  apiKey?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Token addresses for the heatmap
const HEATMAP_TOKENS = [
  { symbol: 'SOL', address: POPULAR_TOKENS.SOL, category: 'L1' },
  { symbol: 'BONK', address: POPULAR_TOKENS.BONK, category: 'MEME' },
  { symbol: 'WIF', address: POPULAR_TOKENS.WIF, category: 'MEME' },
  { symbol: 'JUP', address: POPULAR_TOKENS.JUP, category: 'DEFI' },
  { symbol: 'PYTH', address: POPULAR_TOKENS.PYTH, category: 'ORACLE' },
  { symbol: 'JTO', address: POPULAR_TOKENS.JTO, category: 'L1' },
  { symbol: 'RAY', address: POPULAR_TOKENS.RAY, category: 'DEFI' },
  { symbol: 'ORCA', address: POPULAR_TOKENS.ORCA, category: 'DEFI' },
  { symbol: 'MNGO', address: POPULAR_TOKENS.MNGO, category: 'DEFI' },
  { symbol: 'SAMO', address: POPULAR_TOKENS.SAMO, category: 'MEME' },
];

// ─────────────────────────────────────────────────────────────────────────────
// COLOR MAPPING
// ─────────────────────────────────────────────────────────────────────────────

function getHeatColor(change: number): string {
  if (change >= 10) return 'greenBright';
  if (change >= 5) return 'green';
  if (change >= 2) return 'green';
  if (change >= 0.5) return 'green';
  if (change >= 0) return 'gray';
  if (change >= -0.5) return 'gray';
  if (change >= -2) return 'red';
  if (change >= -5) return 'red';
  if (change >= -10) return 'red';
  return 'redBright';
}

function getHeatBg(change: number): string {
  const intensity = Math.min(Math.abs(change) / 10, 1);
  const blocks = Math.round(intensity * 4);
  const char = ['░', '▒', '▓', '█', '█'][blocks];
  return char;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKET HEATMAP
// ─────────────────────────────────────────────────────────────────────────────

export const MarketHeatmap: React.FC<HeatmapProps> = ({
  data,
  title = 'MARKET HEATMAP',
  width = 60,
  cellWidth = 12,
  apiKey,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const [liveData, setLiveData] = useState<HeatmapCell[] | null>(null);

  // Default mock data
  const mockData: HeatmapCell[] = [
    { symbol: 'SOL', value: 150.25, change: 3.45, category: 'L1' },
    { symbol: 'BONK', value: 0.000023, change: 12.5, category: 'MEME' },
    { symbol: 'WIF', value: 2.85, change: 8.3, category: 'MEME' },
    { symbol: 'JUP', value: 0.69, change: -2.1, category: 'DEFI' },
    { symbol: 'PYTH', value: 0.45, change: 5.2, category: 'ORACLE' },
    { symbol: 'JTO', value: 3.21, change: -1.8, category: 'L1' },
    { symbol: 'RAY', value: 4.52, change: -4.8, category: 'DEFI' },
    { symbol: 'ORCA', value: 3.15, change: -1.5, category: 'DEFI' },
    { symbol: 'MNGO', value: 0.028, change: -8.2, category: 'DEFI' },
    { symbol: 'SAMO', value: 0.015, change: 15.3, category: 'MEME' },
  ];

  // Fetch real data from Birdeye
  useEffect(() => {
    if (!autoRefresh || data) return;

    const fetchHeatmapData = async () => {
      try {
        const api = getBirdeyeClient(apiKey);
        const addresses = HEATMAP_TOKENS.map(t => t.address);

        const [marketData, tradeData] = await Promise.all([
          api.getMultipleTokenMarketData(addresses),
          api.getMultipleTokenTradeData(addresses),
        ]);

        if (marketData) {
          const cells: HeatmapCell[] = HEATMAP_TOKENS.map(token => {
            const market = marketData[token.address];
            const trade = tradeData?.[token.address];
            return {
              symbol: token.symbol,
              value: market?.price || 0,
              change: trade?.price_change_24h_percent || 0,
              category: token.category,
            };
          });
          setLiveData(cells);
        }
      } catch (err) {
        console.error('[Heatmap] Failed to fetch data:', err);
      }
    };

    fetchHeatmapData();
    const interval = setInterval(fetchHeatmapData, refreshInterval);
    return () => clearInterval(interval);
  }, [apiKey, autoRefresh, refreshInterval, data]);

  const displayData = data || liveData || mockData;

  const cellsPerRow = Math.floor((width - 4) / cellWidth);
  const rows: HeatmapCell[][] = [];

  for (let i = 0; i < displayData.length; i += cellsPerRow) {
    rows.push(displayData.slice(i, i + cellsPerRow));
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green" width={width}>
      {/* Header */}
      <Box paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          {title}
        </Text>
      </Box>

      {/* Heatmap Grid */}
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        {rows.map((row, rowIndex) => (
          <Box key={rowIndex}>
            {row.map((cell) => (
              <HeatmapCellComponent key={cell.symbol} cell={cell} width={cellWidth} />
            ))}
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box paddingX={1} borderTop>
        <Text color="redBright">█ -10%</Text>
        <Text color="red"> ▓</Text>
        <Text color="gray"> ░ 0% ░</Text>
        <Text color="green"> ▓</Text>
        <Text color="greenBright"> █ +10%</Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HEATMAP CELL
// ─────────────────────────────────────────────────────────────────────────────

const HeatmapCellComponent: React.FC<{ cell: HeatmapCell; width: number }> = ({ cell, width }) => {
  const color = getHeatColor(cell.change);
  const bgChar = getHeatBg(cell.change);

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="round"
      borderColor={color as any}
      marginRight={1}
    >
      <Box justifyContent="center">
        <Text color={color as any} bold>
          {cell.symbol}
        </Text>
      </Box>
      <Box justifyContent="center">
        <Text color={color as any}>
          {cell.change >= 0 ? '+' : ''}{cell.change.toFixed(1)}%
        </Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTOR HEATMAP
// ─────────────────────────────────────────────────────────────────────────────

export const SectorHeatmap: React.FC<{
  sectors?: Array<{ name: string; change: number; tokens: number }>;
}> = ({ sectors }) => {
  const defaultSectors = sectors || [
    { name: 'LAYER 1', change: 2.5, tokens: 45 },
    { name: 'DEFI', change: -1.2, tokens: 120 },
    { name: 'MEME', change: 8.5, tokens: 85 },
    { name: 'GAMING', change: -3.2, tokens: 35 },
    { name: 'NFT', change: 0.5, tokens: 25 },
    { name: 'AI', change: 5.8, tokens: 15 },
  ];

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green">
      <Box paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          SECTOR PERFORMANCE
        </Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {defaultSectors.map((sector) => {
          const color = getHeatColor(sector.change);
          const barWidth = Math.min(Math.abs(Math.round(sector.change * 2)), 10);
          const isPositive = sector.change >= 0;

          return (
            <Box key={sector.name} marginY={0}>
              <Text color="gray">{sector.name.padEnd(10)}</Text>
              <Text color={color as any}>
                {isPositive ? ' '.repeat(10) : ' '.repeat(Math.max(0, 10 - barWidth)) + '█'.repeat(barWidth)}
                │
                {isPositive ? '█'.repeat(barWidth) + ' '.repeat(Math.max(0, 10 - barWidth)) : ' '.repeat(10)}
              </Text>
              <Text color={color as any}>
                {' '}{(isPositive ? '+' : '') + sector.change.toFixed(1)}%
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CORRELATION MATRIX
// ─────────────────────────────────────────────────────────────────────────────

export const CorrelationMatrix: React.FC<{
  tokens?: string[];
  correlations?: number[][];
}> = ({ tokens, correlations }) => {
  const defaultTokens = tokens || ['SOL', 'BTC', 'ETH', 'BONK'];
  const defaultCorrelations = correlations || [
    [1.0, 0.85, 0.78, 0.45],
    [0.85, 1.0, 0.92, 0.32],
    [0.78, 0.92, 1.0, 0.28],
    [0.45, 0.32, 0.28, 1.0],
  ];

  const getCorrelationColor = (value: number): string => {
    if (value >= 0.8) return 'greenBright';
    if (value >= 0.5) return 'green';
    if (value >= 0.2) return 'yellow';
    if (value >= -0.2) return 'gray';
    if (value >= -0.5) return 'red';
    return 'redBright';
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green">
      <Box paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          CORRELATION MATRIX
        </Text>
      </Box>

      {/* Header row */}
      <Box paddingX={1}>
        <Text color="gray">{'    '}</Text>
        {defaultTokens.map((token) => (
          <Text key={token} color="cyan">
            {token.padStart(6)}
          </Text>
        ))}
      </Box>

      {/* Matrix rows */}
      {defaultTokens.map((rowToken, i) => (
        <Box key={rowToken} paddingX={1}>
          <Text color="cyan">{rowToken.padEnd(4)}</Text>
          {defaultCorrelations[i].map((corr, j) => {
            const color = getCorrelationColor(corr);
            const display = i === j ? '  ●   ' : corr.toFixed(2).padStart(6);
            return (
              <Text key={j} color={color as any}>
                {display}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MINI HEATMAP (Inline version)
// ─────────────────────────────────────────────────────────────────────────────

export const MiniHeatmap: React.FC<{
  data?: Array<{ symbol: string; change: number }>;
}> = ({ data }) => {
  const defaultData = data || [
    { symbol: 'SOL', change: 3.5 },
    { symbol: 'BTC', change: -0.5 },
    { symbol: 'ETH', change: 1.2 },
    { symbol: 'BONK', change: 12.5 },
    { symbol: 'JUP', change: -2.1 },
  ];

  return (
    <Box>
      {defaultData.map((item, i) => {
        const color = getHeatColor(item.change);
        return (
          <React.Fragment key={item.symbol}>
            <Text color={color as any}>
              {item.symbol}:{item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
            </Text>
            {i < defaultData.length - 1 && <Text color="gray"> │ </Text>}
          </React.Fragment>
        );
      })}
    </Box>
  );
};

export default MarketHeatmap;
