// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Portfolio Component (Bloomberg Style)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Box, Text } from 'ink';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenHolding {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  price: number;
  change24h: number;
  allocation: number;
}

export interface PortfolioData {
  totalValue: number;
  change24h: number;
  change24hPercent: number;
  holdings: TokenHolding[];
}

interface PortfolioProps {
  data?: PortfolioData;
  width?: number;
  showChart?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Portfolio: React.FC<PortfolioProps> = ({ data, width = 60, showChart = true }) => {
  // Mock data if none provided
  const portfolio: PortfolioData = data || {
    totalValue: 15420.5,
    change24h: 342.1,
    change24hPercent: 2.27,
    holdings: [
      { symbol: 'SOL', name: 'Solana', amount: 85.5, value: 12825.0, price: 150.0, change24h: 3.2, allocation: 83.2 },
      { symbol: 'USDC', name: 'USD Coin', amount: 1500.0, value: 1500.0, price: 1.0, change24h: 0, allocation: 9.7 },
      { symbol: 'BONK', name: 'Bonk', amount: 50000000, value: 750.5, price: 0.000015, change24h: 12.5, allocation: 4.9 },
      { symbol: 'JUP', name: 'Jupiter', amount: 500, value: 345.0, price: 0.69, change24h: -2.3, allocation: 2.2 },
    ],
  };

  const isUp = portfolio.change24h >= 0;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green" width={width}>
      {/* Header */}
      <Box justifyContent="space-between" paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          PORTFOLIO
        </Text>
        <Text color="gray">{new Date().toLocaleDateString()}</Text>
      </Box>

      {/* Total Value */}
      <Box flexDirection="column" paddingX={1} paddingY={1} borderBottom>
        <Text color="gray">Total Value</Text>
        <Box>
          <Text color="white" bold>
            ${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </Box>
        <Box>
          <Text color={isUp ? 'green' : 'red'}>
            {isUp ? '▲' : '▼'} ${Math.abs(portfolio.change24h).toFixed(2)} ({isUp ? '+' : ''}
            {portfolio.change24hPercent.toFixed(2)}%) 24h
          </Text>
        </Box>
      </Box>

      {/* Allocation Chart */}
      {showChart && (
        <Box paddingX={1} paddingY={1} borderBottom>
          <AllocationBar holdings={portfolio.holdings} />
        </Box>
      )}

      {/* Holdings Header */}
      <Box paddingX={1} marginTop={1}>
        <Text color="gray">{'ASSET'.padEnd(10)}</Text>
        <Text color="gray">{'AMOUNT'.padStart(12)}</Text>
        <Text color="gray">{'VALUE'.padStart(12)}</Text>
        <Text color="gray">{'24H'.padStart(8)}</Text>
        <Text color="gray">{'%'.padStart(6)}</Text>
      </Box>

      <Box paddingX={1}>
        <Text color="gray">{'─'.repeat(width - 4)}</Text>
      </Box>

      {/* Holdings */}
      <Box flexDirection="column" paddingX={1}>
        {portfolio.holdings.map((holding, i) => (
          <HoldingRow key={holding.symbol} holding={holding} />
        ))}
      </Box>

      {/* Footer */}
      <Box paddingX={1} marginTop={1} borderTop>
        <Text color="gray" dimColor>
          {portfolio.holdings.length} assets • Updated: {new Date().toLocaleTimeString()}
        </Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HOLDING ROW
// ─────────────────────────────────────────────────────────────────────────────

const HoldingRow: React.FC<{ holding: TokenHolding }> = ({ holding }) => {
  const isUp = holding.change24h >= 0;

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(2) + 'K';
    return amount.toFixed(2);
  };

  return (
    <Box>
      <Text color="cyan">{holding.symbol.padEnd(10)}</Text>
      <Text color="white">{formatAmount(holding.amount).padStart(12)}</Text>
      <Text color="white">{('$' + holding.value.toFixed(2)).padStart(12)}</Text>
      <Text color={isUp ? 'green' : 'red'}>
        {((isUp ? '+' : '') + holding.change24h.toFixed(1) + '%').padStart(8)}
      </Text>
      <Text color="gray">{(holding.allocation.toFixed(1) + '%').padStart(6)}</Text>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ALLOCATION BAR
// ─────────────────────────────────────────────────────────────────────────────

const AllocationBar: React.FC<{ holdings: TokenHolding[] }> = ({ holdings }) => {
  const colors = ['green', 'cyan', 'yellow', 'magenta', 'blue', 'red'];
  const totalWidth = 40;

  return (
    <Box flexDirection="column">
      <Text color="gray">Allocation</Text>
      <Box>
        {holdings.map((holding, i) => {
          const barWidth = Math.max(1, Math.round((holding.allocation / 100) * totalWidth));
          return (
            <Text key={holding.symbol} color={colors[i % colors.length] as any}>
              {'█'.repeat(barWidth)}
            </Text>
          );
        })}
      </Box>
      <Box>
        {holdings.slice(0, 4).map((holding, i) => (
          <React.Fragment key={holding.symbol}>
            <Text color={colors[i % colors.length] as any}>■</Text>
            <Text color="gray">
              {holding.symbol} {holding.allocation.toFixed(0)}%{' '}
            </Text>
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT PORTFOLIO
// ─────────────────────────────────────────────────────────────────────────────

export const CompactPortfolio: React.FC<{ data?: PortfolioData }> = ({ data }) => {
  const portfolio = data || {
    totalValue: 15420.5,
    change24h: 342.1,
    change24hPercent: 2.27,
    holdings: [],
  };

  const isUp = portfolio.change24h >= 0;

  return (
    <Box borderStyle="single" borderColor="green" paddingX={1}>
      <Text color="gray">Portfolio: </Text>
      <Text color="white" bold>
        ${portfolio.totalValue.toLocaleString()}
      </Text>
      <Text color="gray"> │ </Text>
      <Text color={isUp ? 'green' : 'red'}>
        {isUp ? '▲' : '▼'} {isUp ? '+' : ''}
        {portfolio.change24hPercent.toFixed(2)}%
      </Text>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSET CARD
// ─────────────────────────────────────────────────────────────────────────────

export const AssetCard: React.FC<{
  symbol: string;
  name?: string;
  price: number;
  change: number;
  holdings?: number;
  value?: number;
}> = ({ symbol, name, price, change, holdings, value }) => {
  const isUp = change >= 0;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={isUp ? 'green' : 'red'} paddingX={1} width={25}>
      <Box justifyContent="space-between">
        <Text color="cyan" bold>
          {symbol}
        </Text>
        <Text color={isUp ? 'green' : 'red'}>
          {isUp ? '▲' : '▼'} {change.toFixed(1)}%
        </Text>
      </Box>
      {name && (
        <Text color="gray" dimColor>
          {name}
        </Text>
      )}
      <Box marginTop={1}>
        <Text color="white">${formatPrice(price)}</Text>
      </Box>
      {holdings !== undefined && (
        <Box marginTop={1}>
          <Text color="gray">
            {holdings.toFixed(4)} {symbol}
          </Text>
        </Box>
      )}
      {value !== undefined && (
        <Box>
          <Text color="white" bold>
            ${value.toFixed(2)}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN LIST
// ─────────────────────────────────────────────────────────────────────────────

export const TokenList: React.FC<{
  tokens?: Array<{
    symbol: string;
    price: number;
    change: number;
    volume?: number;
  }>;
  title?: string;
}> = ({ tokens, title = 'WATCHLIST' }) => {
  const defaultTokens = tokens || [
    { symbol: 'SOL', price: 150.25, change: 2.34, volume: 1500000000 },
    { symbol: 'BTC', price: 67432.1, change: -0.5, volume: 25000000000 },
    { symbol: 'ETH', price: 3521.45, change: 1.2, volume: 12000000000 },
    { symbol: 'BONK', price: 0.00002345, change: 5.67, volume: 500000000 },
    { symbol: 'JUP', price: 0.69, change: -1.8, volume: 150000000 },
  ];

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green">
      <Box paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          {title}
        </Text>
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text color="gray">{'TOKEN'.padEnd(8)}</Text>
        <Text color="gray">{'PRICE'.padStart(12)}</Text>
        <Text color="gray">{'24H'.padStart(10)}</Text>
        <Text color="gray">{'VOLUME'.padStart(12)}</Text>
      </Box>

      <Box paddingX={1}>
        <Text color="gray">{'─'.repeat(42)}</Text>
      </Box>

      {defaultTokens.map((token) => (
        <Box key={token.symbol} paddingX={1}>
          <Text color="cyan">{token.symbol.padEnd(8)}</Text>
          <Text color="white">{('$' + formatPrice(token.price)).padStart(12)}</Text>
          <Text color={token.change >= 0 ? 'green' : 'red'}>
            {((token.change >= 0 ? '+' : '') + token.change.toFixed(2) + '%').padStart(10)}
          </Text>
          <Text color="gray">{(token.volume ? formatVolume(token.volume) : '-').padStart(12)}</Text>
        </Box>
      ))}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(0);
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(8);
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return '$' + (volume / 1e9).toFixed(1) + 'B';
  if (volume >= 1e6) return '$' + (volume / 1e6).toFixed(1) + 'M';
  if (volume >= 1e3) return '$' + (volume / 1e3).toFixed(1) + 'K';
  return '$' + volume.toFixed(0);
}

export default Portfolio;
