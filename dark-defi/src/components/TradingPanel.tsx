// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Trading Panel Component (Bloomberg Style)
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Trade {
  id: string;
  timestamp: number;
  side: 'BUY' | 'SELL';
  symbol: string;
  price: number;
  amount: number;
  total: number;
  status: 'PENDING' | 'FILLED' | 'PARTIAL' | 'CANCELLED';
}

interface Position {
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface TradingPanelProps {
  balance?: { sol: number; usdc: number };
  positions?: Position[];
  recentTrades?: Trade[];
  onTrade?: (side: 'BUY' | 'SELL', amount: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADING PANEL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const TradingPanel: React.FC<TradingPanelProps> = ({
  balance = { sol: 10.5, usdc: 1500 },
  positions,
  recentTrades,
  onTrade,
}) => {
  const [selectedTab, setSelectedTab] = useState<'trade' | 'positions' | 'history'>('trade');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');

  // Mock positions
  const mockPositions: Position[] = positions || [
    { symbol: 'SOL', size: 10.5, entryPrice: 145.2, currentPrice: 150.5, pnl: 55.65, pnlPercent: 3.65 },
    { symbol: 'BONK', size: 1000000, entryPrice: 0.000021, currentPrice: 0.000024, pnl: 3.0, pnlPercent: 14.29 },
    { symbol: 'JUP', size: 500, entryPrice: 0.85, currentPrice: 0.78, pnl: -35.0, pnlPercent: -8.24 },
  ];

  // Mock recent trades
  const mockTrades: Trade[] = recentTrades || [
    { id: '1', timestamp: Date.now() - 3600000, side: 'BUY', symbol: 'SOL', price: 149.5, amount: 2, total: 299, status: 'FILLED' },
    { id: '2', timestamp: Date.now() - 7200000, side: 'SELL', symbol: 'BONK', price: 0.000023, amount: 500000, total: 11.5, status: 'FILLED' },
    { id: '3', timestamp: Date.now() - 10800000, side: 'BUY', symbol: 'JUP', price: 0.85, amount: 500, total: 425, status: 'FILLED' },
  ];

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green">
      {/* Header with tabs */}
      <Box justifyContent="space-between" paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          TRADING DESK
        </Text>
        <Box>
          <Text
            color={selectedTab === 'trade' ? 'greenBright' : 'gray'}
            bold={selectedTab === 'trade'}
            underline={selectedTab === 'trade'}
          >
            [1] TRADE
          </Text>
          <Text color="gray"> │ </Text>
          <Text
            color={selectedTab === 'positions' ? 'greenBright' : 'gray'}
            bold={selectedTab === 'positions'}
            underline={selectedTab === 'positions'}
          >
            [2] POSITIONS
          </Text>
          <Text color="gray"> │ </Text>
          <Text
            color={selectedTab === 'history' ? 'greenBright' : 'gray'}
            bold={selectedTab === 'history'}
            underline={selectedTab === 'history'}
          >
            [3] HISTORY
          </Text>
        </Box>
      </Box>

      {/* Balance */}
      <Box paddingX={1} marginY={1}>
        <Text color="cyan">Balance: </Text>
        <Text color="green">{balance.sol.toFixed(4)} SOL</Text>
        <Text color="gray"> │ </Text>
        <Text color="green">${balance.usdc.toFixed(2)} USDC</Text>
      </Box>

      {/* Tab Content */}
      {selectedTab === 'trade' && (
        <TradeForm orderSide={orderSide} orderType={orderType} />
      )}

      {selectedTab === 'positions' && (
        <PositionsView positions={mockPositions} />
      )}

      {selectedTab === 'history' && (
        <TradeHistory trades={mockTrades} />
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TRADE FORM
// ─────────────────────────────────────────────────────────────────────────────

const TradeForm: React.FC<{ orderSide: 'BUY' | 'SELL'; orderType: 'MARKET' | 'LIMIT' }> = ({
  orderSide,
  orderType,
}) => {
  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Order Type Selection */}
      <Box marginBottom={1}>
        <Text color="gray">Type: </Text>
        <Text color={orderType === 'MARKET' ? 'greenBright' : 'gray'} bold={orderType === 'MARKET'}>
          [M] MARKET
        </Text>
        <Text color="gray"> │ </Text>
        <Text color={orderType === 'LIMIT' ? 'greenBright' : 'gray'} bold={orderType === 'LIMIT'}>
          [L] LIMIT
        </Text>
      </Box>

      {/* Side Selection */}
      <Box marginBottom={1}>
        <Text color="gray">Side: </Text>
        <Text color={orderSide === 'BUY' ? 'green' : 'gray'} bold={orderSide === 'BUY'}>
          [B] BUY
        </Text>
        <Text color="gray"> │ </Text>
        <Text color={orderSide === 'SELL' ? 'red' : 'gray'} bold={orderSide === 'SELL'}>
          [S] SELL
        </Text>
      </Box>

      {/* Order Input Fields */}
      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1}>
        <Box>
          <Text color="gray">Symbol: </Text>
          <Text color="cyan">SOL/USDC</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Amount: </Text>
          <Text color="white">█</Text>
          <Text color="gray"> SOL</Text>
        </Box>
        {orderType === 'LIMIT' && (
          <Box marginTop={1}>
            <Text color="gray">Price:  </Text>
            <Text color="white">█</Text>
            <Text color="gray"> USDC</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="gray">Est. Total: </Text>
          <Text color="yellow">$0.00 USDC</Text>
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box marginTop={1} justifyContent="center">
        <Text color={orderSide === 'BUY' ? 'green' : 'red'} bold>
          {'█'.repeat(10)} {orderSide} {'█'.repeat(10)}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press Enter to execute • Esc to cancel
        </Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POSITIONS VIEW
// ─────────────────────────────────────────────────────────────────────────────

const PositionsView: React.FC<{ positions: Position[] }> = ({ positions }) => {
  const totalPnl = positions.reduce((acc, p) => acc + p.pnl, 0);

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="gray">{'SYMBOL'.padEnd(8)}</Text>
        <Text color="gray">{'SIZE'.padStart(12)}</Text>
        <Text color="gray">{'ENTRY'.padStart(10)}</Text>
        <Text color="gray">{'CURRENT'.padStart(10)}</Text>
        <Text color="gray">{'PNL'.padStart(12)}</Text>
      </Box>

      <Box>
        <Text color="gray">{'─'.repeat(52)}</Text>
      </Box>

      {/* Positions */}
      {positions.map((pos, i) => (
        <Box key={i}>
          <Text color="cyan">{pos.symbol.padEnd(8)}</Text>
          <Text color="white">{pos.size.toFixed(2).padStart(12)}</Text>
          <Text color="gray">{('$' + pos.entryPrice.toFixed(4)).padStart(10)}</Text>
          <Text color="white">{('$' + pos.currentPrice.toFixed(4)).padStart(10)}</Text>
          <Text color={pos.pnl >= 0 ? 'green' : 'red'}>
            {(pos.pnl >= 0 ? '+' : '') + '$' + pos.pnl.toFixed(2) + ' (' + (pos.pnl >= 0 ? '+' : '') + pos.pnlPercent.toFixed(2) + '%)'}
          </Text>
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color="gray">{'─'.repeat(52)}</Text>
      </Box>

      {/* Total */}
      <Box>
        <Text color="white" bold>
          {'TOTAL'.padEnd(40)}
        </Text>
        <Text color={totalPnl >= 0 ? 'green' : 'red'} bold>
          {(totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toFixed(2)}
        </Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TRADE HISTORY
// ─────────────────────────────────────────────────────────────────────────────

const TradeHistory: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="gray">{'TIME'.padEnd(10)}</Text>
        <Text color="gray">{'SIDE'.padEnd(6)}</Text>
        <Text color="gray">{'SYMBOL'.padEnd(8)}</Text>
        <Text color="gray">{'PRICE'.padStart(10)}</Text>
        <Text color="gray">{'AMOUNT'.padStart(10)}</Text>
        <Text color="gray">{'STATUS'.padStart(10)}</Text>
      </Box>

      <Box>
        <Text color="gray">{'─'.repeat(54)}</Text>
      </Box>

      {/* Trades */}
      {trades.map((trade, i) => (
        <Box key={trade.id}>
          <Text color="gray">{new Date(trade.timestamp).toLocaleTimeString().padEnd(10)}</Text>
          <Text color={trade.side === 'BUY' ? 'green' : 'red'}>{trade.side.padEnd(6)}</Text>
          <Text color="cyan">{trade.symbol.padEnd(8)}</Text>
          <Text color="white">{('$' + trade.price.toFixed(4)).padStart(10)}</Text>
          <Text color="white">{trade.amount.toFixed(2).padStart(10)}</Text>
          <Text color={trade.status === 'FILLED' ? 'green' : 'yellow'}>{trade.status.padStart(10)}</Text>
        </Box>
      ))}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// QUICK TRADE WIDGET
// ─────────────────────────────────────────────────────────────────────────────

export const QuickTrade: React.FC<{
  symbol?: string;
  price?: number;
  onBuy?: () => void;
  onSell?: () => void;
}> = ({ symbol = 'SOL', price = 150.5, onBuy, onSell }) => {
  return (
    <Box borderStyle="single" borderColor="green" paddingX={1}>
      <Text color="cyan">{symbol}</Text>
      <Text color="gray"> @ </Text>
      <Text color="white">${price.toFixed(2)}</Text>
      <Text color="gray"> │ </Text>
      <Text color="green" bold>
        [B]UY
      </Text>
      <Text color="gray"> │ </Text>
      <Text color="red" bold>
        [S]ELL
      </Text>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PNL SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export const PnlSummary: React.FC<{
  daily?: number;
  weekly?: number;
  monthly?: number;
  total?: number;
}> = ({ daily = 125.5, weekly = 450.2, monthly = 1250.0, total = 5430.25 }) => {
  const formatPnl = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${value.toFixed(2)}`;
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1}>
      <Text color="greenBright" bold>
        P&L SUMMARY
      </Text>
      <Box marginTop={1}>
        <Text color="gray">24H: </Text>
        <Text color={daily >= 0 ? 'green' : 'red'}>{formatPnl(daily)}</Text>
      </Box>
      <Box>
        <Text color="gray">7D:  </Text>
        <Text color={weekly >= 0 ? 'green' : 'red'}>{formatPnl(weekly)}</Text>
      </Box>
      <Box>
        <Text color="gray">30D: </Text>
        <Text color={monthly >= 0 ? 'green' : 'red'}>{formatPnl(monthly)}</Text>
      </Box>
      <Box borderTop marginTop={1} paddingTop={1}>
        <Text color="white" bold>
          TOTAL:{' '}
        </Text>
        <Text color={total >= 0 ? 'green' : 'red'} bold>
          {formatPnl(total)}
        </Text>
      </Box>
    </Box>
  );
};

export default TradingPanel;
