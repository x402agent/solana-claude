// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Depth Chart Component (Bloomberg Style ASCII)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Box, Text } from 'ink';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface DepthLevel {
  price: number;
  cumulative: number;
}

interface DepthChartProps {
  bids?: DepthLevel[];
  asks?: DepthLevel[];
  width?: number;
  height?: number;
  symbol?: string;
  midPrice?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPTH CHART COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const DepthChart: React.FC<DepthChartProps> = ({
  bids,
  asks,
  width = 60,
  height = 12,
  symbol = 'SOL/USDC',
  midPrice = 150.5,
}) => {
  // Generate mock data if none provided
  const mockBids = bids || generateMockDepth('bid', 20, midPrice);
  const mockAsks = asks || generateMockDepth('ask', 20, midPrice);

  // Calculate max cumulative for scaling
  const maxCumulative = Math.max(
    Math.max(...mockBids.map((b) => b.cumulative)),
    Math.max(...mockAsks.map((a) => a.cumulative))
  );

  // Create ASCII chart
  const halfWidth = Math.floor((width - 4) / 2);
  const chartRows: string[] = [];

  for (let row = 0; row < height; row++) {
    const threshold = ((height - row) / height) * maxCumulative;

    // Bids (left side, filled from right)
    let bidBar = '';
    for (let col = 0; col < halfWidth; col++) {
      const bidIndex = Math.floor((col / halfWidth) * mockBids.length);
      const bid = mockBids[mockBids.length - 1 - bidIndex];
      if (bid && bid.cumulative >= threshold) {
        bidBar = '█' + bidBar;
      } else {
        bidBar = ' ' + bidBar;
      }
    }

    // Asks (right side, filled from left)
    let askBar = '';
    for (let col = 0; col < halfWidth; col++) {
      const askIndex = Math.floor((col / halfWidth) * mockAsks.length);
      const ask = mockAsks[askIndex];
      if (ask && ask.cumulative >= threshold) {
        askBar += '█';
      } else {
        askBar += ' ';
      }
    }

    chartRows.push(`${bidBar}│${askBar}`);
  }

  // Price axis
  const minBidPrice = mockBids[mockBids.length - 1]?.price || midPrice - 5;
  const maxAskPrice = mockAsks[mockAsks.length - 1]?.price || midPrice + 5;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green" width={width}>
      {/* Header */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text color="greenBright" bold>
          DEPTH CHART
        </Text>
        <Text color="cyan">{symbol}</Text>
      </Box>

      {/* Y-Axis Label */}
      <Box paddingX={1}>
        <Text color="gray">Volume (cumulative)</Text>
      </Box>

      {/* Chart */}
      <Box flexDirection="column" paddingX={1}>
        {chartRows.map((row, i) => (
          <Box key={i}>
            <Text color="green">{row.split('│')[0]}</Text>
            <Text color="yellow">│</Text>
            <Text color="red">{row.split('│')[1]}</Text>
          </Box>
        ))}
      </Box>

      {/* X-Axis */}
      <Box paddingX={1}>
        <Text color="gray">{'─'.repeat(width - 4)}</Text>
      </Box>

      {/* Price Labels */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text color="green">${minBidPrice.toFixed(2)}</Text>
        <Text color="yellow" bold>
          ${midPrice.toFixed(2)}
        </Text>
        <Text color="red">${maxAskPrice.toFixed(2)}</Text>
      </Box>

      {/* Legend */}
      <Box justifyContent="center" paddingX={1} marginTop={1}>
        <Text color="green">■ BIDS</Text>
        <Text color="gray"> │ </Text>
        <Text color="red">■ ASKS</Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MINI DEPTH CHART
// ─────────────────────────────────────────────────────────────────────────────

export const MiniDepthChart: React.FC<{ midPrice?: number; width?: number }> = ({
  midPrice = 150.5,
  width = 40,
}) => {
  const halfWidth = Math.floor(width / 2);

  // Generate simple depth bars
  const bidDepth = Array(5)
    .fill(0)
    .map((_, i) => Math.random() * (1 - i * 0.15));
  const askDepth = Array(5)
    .fill(0)
    .map((_, i) => Math.random() * (1 - i * 0.15));

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="gray">Depth: </Text>
        {bidDepth.map((d, i) => (
          <Text key={`bid-${i}`} color="green">
            {'█'.repeat(Math.floor(d * 5))}
          </Text>
        ))}
        <Text color="yellow">│</Text>
        {askDepth.map((d, i) => (
          <Text key={`ask-${i}`} color="red">
            {'█'.repeat(Math.floor(d * 5))}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// IMBALANCE INDICATOR
// ─────────────────────────────────────────────────────────────────────────────

export const ImbalanceIndicator: React.FC<{ bidVolume?: number; askVolume?: number }> = ({
  bidVolume = Math.random() * 10000,
  askVolume = Math.random() * 10000,
}) => {
  const total = bidVolume + askVolume;
  const bidPercent = (bidVolume / total) * 100;
  const askPercent = (askVolume / total) * 100;
  const imbalance = bidPercent - 50;

  const barWidth = 20;
  const bidBars = Math.round((bidPercent / 100) * barWidth);
  const askBars = barWidth - bidBars;

  let sentiment = 'NEUTRAL';
  let sentimentColor: string = 'yellow';

  if (imbalance > 10) {
    sentiment = 'BULLISH';
    sentimentColor = 'green';
  } else if (imbalance < -10) {
    sentiment = 'BEARISH';
    sentimentColor = 'red';
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="gray">Imbalance: </Text>
        <Text color="green">{'█'.repeat(bidBars)}</Text>
        <Text color="red">{'█'.repeat(askBars)}</Text>
        <Text color={sentimentColor as any}> {sentiment}</Text>
      </Box>
      <Box>
        <Text color="green">{bidPercent.toFixed(1)}% BUY</Text>
        <Text color="gray"> │ </Text>
        <Text color="red">{askPercent.toFixed(1)}% SELL</Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER - Generate Mock Depth Data
// ─────────────────────────────────────────────────────────────────────────────

function generateMockDepth(side: 'bid' | 'ask', levels: number, midPrice: number): DepthLevel[] {
  const depth: DepthLevel[] = [];
  let cumulative = 0;

  for (let i = 0; i < levels; i++) {
    const offset = (i + 1) * 0.1;
    const price = side === 'bid' ? midPrice - offset : midPrice + offset;
    const volume = Math.random() * 500 + 100 + i * 50;
    cumulative += volume;

    depth.push({ price, cumulative });
  }

  return depth;
}

export default DepthChart;
