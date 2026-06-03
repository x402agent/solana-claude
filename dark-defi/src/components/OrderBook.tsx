// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Order Book Component (Bloomberg Style)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderLevel {
  price: number;
  size: number;
  total?: number;
}

export interface OrderBookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
  spread?: number;
  spreadPercent?: number;
  lastUpdate?: number;
}

interface OrderBookProps {
  data?: OrderBookData;
  symbol?: string;
  depth?: number;
  width?: number;
  showSpread?: boolean;
  animated?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER BOOK COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const OrderBook: React.FC<OrderBookProps> = ({
  data,
  symbol = 'SOL/USDC',
  depth = 8,
  width = 50,
  showSpread = true,
  animated = true,
}) => {
  const [flash, setFlash] = useState<{ side: 'bid' | 'ask'; index: number } | null>(null);

  // Flash effect for updates
  useEffect(() => {
    if (animated && data) {
      const randomSide = Math.random() > 0.5 ? 'bid' : 'ask';
      const randomIndex = Math.floor(Math.random() * depth);
      setFlash({ side: randomSide, index: randomIndex });
      const timer = setTimeout(() => setFlash(null), 100);
      return () => clearTimeout(timer);
    }
  }, [data?.lastUpdate]);

  // Generate mock data if none provided
  const mockData: OrderBookData = data || generateMockOrderBook(depth);

  const formatPrice = (price: number) => price.toFixed(4).padStart(10);
  const formatSize = (size: number) => size.toFixed(2).padStart(12);
  const formatTotal = (total: number) => total.toFixed(2).padStart(12);

  // Calculate max total for depth visualization
  const maxBidTotal = Math.max(...mockData.bids.map((b) => b.total || b.size));
  const maxAskTotal = Math.max(...mockData.asks.map((a) => a.total || a.size));

  // Create depth bar
  const createDepthBar = (total: number, maxTotal: number, side: 'bid' | 'ask', barWidth = 15) => {
    const percentage = total / maxTotal;
    const filledChars = Math.round(percentage * barWidth);
    const emptyChars = barWidth - filledChars;

    if (side === 'bid') {
      return ' '.repeat(emptyChars) + '█'.repeat(filledChars);
    } else {
      return '█'.repeat(filledChars) + ' '.repeat(emptyChars);
    }
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green" width={width}>
      {/* Header */}
      <Box justifyContent="space-between" paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          ORDER BOOK
        </Text>
        <Text color="cyan">{symbol}</Text>
      </Box>

      {/* Column Headers */}
      <Box paddingX={1} marginTop={1}>
        <Text color="gray">{'DEPTH'.padEnd(15)}</Text>
        <Text color="gray">{'PRICE'.padStart(10)}</Text>
        <Text color="gray">{'SIZE'.padStart(12)}</Text>
        <Text color="gray">{'TOTAL'.padStart(12)}</Text>
      </Box>

      <Box paddingX={1}>
        <Text color="gray">{'─'.repeat(width - 4)}</Text>
      </Box>

      {/* Asks (reversed to show highest at top) */}
      <Box flexDirection="column" paddingX={1}>
        {[...mockData.asks].slice(0, depth).reverse().map((ask, i) => {
          const actualIndex = depth - 1 - i;
          const isFlashing = flash?.side === 'ask' && flash?.index === actualIndex;
          return (
            <Box key={`ask-${i}`}>
              <Text color={isFlashing ? 'white' : 'red'} dimColor={!isFlashing}>
                {createDepthBar(ask.total || ask.size, maxAskTotal, 'ask')}
              </Text>
              <Text color={isFlashing ? 'whiteBright' : 'red'}>{formatPrice(ask.price)}</Text>
              <Text color="gray">{formatSize(ask.size)}</Text>
              <Text color="red" dimColor>
                {formatTotal(ask.total || ask.size)}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Spread */}
      {showSpread && (
        <Box paddingX={1} marginY={1} justifyContent="center">
          <Text color="yellow" bold>
            ─── SPREAD: {mockData.spread?.toFixed(4) || '0.0001'} (
            {mockData.spreadPercent?.toFixed(2) || '0.01'}%) ───
          </Text>
        </Box>
      )}

      {/* Bids */}
      <Box flexDirection="column" paddingX={1}>
        {mockData.bids.slice(0, depth).map((bid, i) => {
          const isFlashing = flash?.side === 'bid' && flash?.index === i;
          return (
            <Box key={`bid-${i}`}>
              <Text color={isFlashing ? 'white' : 'green'} dimColor={!isFlashing}>
                {createDepthBar(bid.total || bid.size, maxBidTotal, 'bid')}
              </Text>
              <Text color={isFlashing ? 'whiteBright' : 'green'}>{formatPrice(bid.price)}</Text>
              <Text color="gray">{formatSize(bid.size)}</Text>
              <Text color="green" dimColor>
                {formatTotal(bid.total || bid.size)}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box paddingX={1} marginTop={1} borderTop>
        <Text color="gray" dimColor>
          Updated: {new Date().toLocaleTimeString()}
        </Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT ORDER BOOK
// ─────────────────────────────────────────────────────────────────────────────

export const CompactOrderBook: React.FC<{ data?: OrderBookData; depth?: number }> = ({
  data,
  depth = 5,
}) => {
  const mockData = data || generateMockOrderBook(depth);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="red" bold>
          ASK{' '}
        </Text>
        {mockData.asks.slice(0, depth).map((ask, i) => (
          <Text key={i} color="red">
            {ask.price.toFixed(2)}{' '}
          </Text>
        ))}
      </Box>
      <Box>
        <Text color="green" bold>
          BID{' '}
        </Text>
        {mockData.bids.slice(0, depth).map((bid, i) => (
          <Text key={i} color="green">
            {bid.price.toFixed(2)}{' '}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER - Generate Mock Order Book
// ─────────────────────────────────────────────────────────────────────────────

function generateMockOrderBook(depth: number): OrderBookData {
  const midPrice = 150 + Math.random() * 5;
  const spread = 0.01 + Math.random() * 0.05;

  const bids: OrderLevel[] = [];
  const asks: OrderLevel[] = [];

  let bidTotal = 0;
  let askTotal = 0;

  for (let i = 0; i < depth; i++) {
    const bidPrice = midPrice - spread / 2 - i * 0.01;
    const askPrice = midPrice + spread / 2 + i * 0.01;
    const bidSize = Math.random() * 1000 + 100;
    const askSize = Math.random() * 1000 + 100;

    bidTotal += bidSize;
    askTotal += askSize;

    bids.push({ price: bidPrice, size: bidSize, total: bidTotal });
    asks.push({ price: askPrice, size: askSize, total: askTotal });
  }

  return {
    bids,
    asks,
    spread,
    spreadPercent: (spread / midPrice) * 100,
    lastUpdate: Date.now(),
  };
}

export default OrderBook;
