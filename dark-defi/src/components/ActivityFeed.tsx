// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Activity Feed Component (Bloomberg Style)
// Now with real-time Birdeye data integration
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { getBirdeyeClient } from '../services/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityType = 'swap' | 'transfer' | 'mint' | 'burn' | 'stake' | 'unstake' | 'nft' | 'system';

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: number;
  signature?: string;
  amount?: number;
  token?: string;
  from?: string;
  to?: string;
  status: 'success' | 'pending' | 'failed';
}

interface ActivityFeedProps {
  activities?: Activity[];
  maxItems?: number;
  showSignatures?: boolean;
  title?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY STYLING
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY_STYLES: Record<ActivityType, { icon: string; color: string; label: string }> = {
  swap: { icon: '⇄', color: 'cyan', label: 'SWAP' },
  transfer: { icon: '→', color: 'blue', label: 'TRANSFER' },
  mint: { icon: '+', color: 'green', label: 'MINT' },
  burn: { icon: '🔥', color: 'red', label: 'BURN' },
  stake: { icon: '⬆', color: 'magenta', label: 'STAKE' },
  unstake: { icon: '⬇', color: 'yellow', label: 'UNSTAKE' },
  nft: { icon: '◆', color: 'magenta', label: 'NFT' },
  system: { icon: '⚙', color: 'gray', label: 'SYSTEM' },
};

const STATUS_STYLES = {
  success: { icon: '✓', color: 'green' },
  pending: { icon: '◌', color: 'yellow' },
  failed: { icon: '✗', color: 'red' },
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY FEED COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  maxItems = 10,
  showSignatures = false,
  title = 'ACTIVITY FEED',
}) => {
  const defaultActivities = activities || generateMockActivities();
  const visibleActivities = defaultActivities.slice(0, maxItems);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green">
      {/* Header */}
      <Box justifyContent="space-between" paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          {title}
        </Text>
        <Text color="green">● LIVE</Text>
      </Box>

      {/* Activity List */}
      <Box flexDirection="column" paddingX={1}>
        {visibleActivities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} showSignature={showSignatures} />
        ))}
      </Box>

      {/* Footer */}
      {defaultActivities.length > maxItems && (
        <Box paddingX={1} borderTop>
          <Text color="gray" dimColor>
            +{defaultActivities.length - maxItems} more activities
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY ITEM
// ─────────────────────────────────────────────────────────────────────────────

const ActivityItem: React.FC<{ activity: Activity; showSignature?: boolean }> = ({
  activity,
  showSignature,
}) => {
  const typeStyle = ACTIVITY_STYLES[activity.type];
  const statusStyle = STATUS_STYLES[activity.status];

  return (
    <Box marginY={0}>
      {/* Timestamp */}
      <Text color="gray" dimColor>
        {formatTime(activity.timestamp)}
      </Text>

      {/* Status */}
      <Text color={statusStyle.color as any}> {statusStyle.icon}</Text>

      {/* Type Icon */}
      <Text color={typeStyle.color as any}> {typeStyle.icon}</Text>

      {/* Type Label */}
      <Text color={typeStyle.color as any}> {typeStyle.label.padEnd(8)}</Text>

      {/* Description */}
      <Text color="white">{activity.description}</Text>

      {/* Signature (if enabled) */}
      {showSignature && activity.signature && (
        <Text color="gray" dimColor>
          {' '}
          [{activity.signature.slice(0, 8)}...]
        </Text>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION STREAM
// ─────────────────────────────────────────────────────────────────────────────

export const TransactionStream: React.FC<{
  transactions?: Activity[];
  width?: number;
}> = ({ transactions, width = 60 }) => {
  const defaultTransactions = transactions || generateMockActivities().slice(0, 5);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green" width={width}>
      <Box paddingX={1} borderBottom justifyContent="space-between">
        <Text color="greenBright" bold>
          TRANSACTION STREAM
        </Text>
        <Text color="green">● STREAMING</Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {defaultTransactions.map((tx) => {
          const typeStyle = ACTIVITY_STYLES[tx.type];
          const statusStyle = STATUS_STYLES[tx.status];

          return (
            <Box key={tx.id} borderBottom borderColor="gray" paddingY={0}>
              <Box flexDirection="column">
                <Box>
                  <Text color={statusStyle.color as any}>{statusStyle.icon} </Text>
                  <Text color={typeStyle.color as any}>{typeStyle.icon} </Text>
                  <Text color="white" bold>
                    {tx.description}
                  </Text>
                </Box>
                {tx.signature && (
                  <Box>
                    <Text color="gray" dimColor>
                      TX: {tx.signature.slice(0, 20)}...{tx.signature.slice(-8)}
                    </Text>
                  </Box>
                )}
                <Box>
                  <Text color="gray" dimColor>
                    {new Date(tx.timestamp).toLocaleString()}
                  </Text>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WALLET ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────

export const WalletActivity: React.FC<{
  address?: string;
  activities?: Activity[];
  showBalance?: boolean;
  balance?: number;
}> = ({ address, activities, showBalance = true, balance = 85.5 }) => {
  const defaultActivities = activities || generateMockActivities().slice(0, 6);
  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : 'ABC1...XYZ9';

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green">
      {/* Header with address */}
      <Box justifyContent="space-between" paddingX={1} borderBottom>
        <Box>
          <Text color="greenBright" bold>
            WALLET
          </Text>
          <Text color="gray"> │ </Text>
          <Text color="cyan">{shortAddress}</Text>
        </Box>
        {showBalance && (
          <Text color="green">{balance.toFixed(4)} SOL</Text>
        )}
      </Box>

      {/* Recent Activity */}
      <Box flexDirection="column" paddingX={1}>
        {defaultActivities.map((activity) => (
          <Box key={activity.id}>
            <Text color="gray">{formatTimeShort(activity.timestamp)} </Text>
            <Text color={ACTIVITY_STYLES[activity.type].color as any}>
              {ACTIVITY_STYLES[activity.type].icon}{' '}
            </Text>
            <Text color="white">{activity.description}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NETWORK STATS
// ─────────────────────────────────────────────────────────────────────────────

export const NetworkStats: React.FC<{
  tps?: number;
  blockHeight?: number;
  epoch?: number;
  epochProgress?: number;
  validators?: number;
  stake?: number;
}> = ({
  tps = 3542,
  blockHeight = 245678901,
  epoch = 520,
  epochProgress = 67.5,
  validators = 1847,
  stake = 385000000,
}) => {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="green">
        <Box paddingX={1} borderBottom>
          <Text color="greenBright" bold>
            SOLANA NETWORK
          </Text>
        </Box>

        <Box flexDirection="column" paddingX={1}>
          <Box>
            <Text color="gray">TPS:        </Text>
            <Text color="cyan">{tps.toLocaleString()}</Text>
          </Box>
          <Box>
            <Text color="gray">Block:      </Text>
            <Text color="white">#{blockHeight.toLocaleString()}</Text>
          </Box>
          <Box>
            <Text color="gray">Epoch:      </Text>
            <Text color="white">{epoch}</Text>
            <Text color="gray"> (</Text>
            <Text color="yellow">{epochProgress.toFixed(1)}%</Text>
            <Text color="gray">)</Text>
          </Box>
          <Box>
            <Text color="gray">Validators: </Text>
            <Text color="green">{validators.toLocaleString()}</Text>
          </Box>
          <Box>
            <Text color="gray">Stake:      </Text>
            <Text color="magenta">{(stake / 1e6).toFixed(1)}M SOL</Text>
          </Box>
        </Box>

        {/* Epoch Progress Bar */}
        <Box paddingX={1} marginTop={1}>
          <Text color="gray">Epoch: </Text>
          <Text color="green">{'█'.repeat(Math.round(epochProgress / 5))}</Text>
          <Text color="gray">{'░'.repeat(20 - Math.round(epochProgress / 5))}</Text>
          <Text color="white"> {epochProgress.toFixed(0)}%</Text>
        </Box>
      </Box>
    );
  };

// ─────────────────────────────────────────────────────────────────────────────
// TOP MOVERS (with real-time data support)
// ─────────────────────────────────────────────────────────────────────────────

interface TopMoversProps {
  gainers?: Array<{ symbol: string; change: number; price: number }>;
  losers?: Array<{ symbol: string; change: number; price: number }>;
  apiKey?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
}

export const TopMovers: React.FC<TopMoversProps> = ({
  gainers,
  losers,
  apiKey,
  autoRefresh = true,
  refreshInterval = 30000,
  limit = 3,
}) => {
  const [liveGainers, setLiveGainers] = useState<Array<{ symbol: string; change: number; price: number }> | null>(null);
  const [liveLosers, setLiveLosers] = useState<Array<{ symbol: string; change: number; price: number }> | null>(null);

  // Default mock data
  const mockGainers = [
    { symbol: 'BONK', change: 15.3, price: 0.000024 },
    { symbol: 'WIF', change: 12.5, price: 2.85 },
    { symbol: 'SAMO', change: 8.7, price: 0.015 },
  ];

  const mockLosers = [
    { symbol: 'MNGO', change: -12.5, price: 0.028 },
    { symbol: 'SRM', change: -8.3, price: 0.05 },
    { symbol: 'STEP', change: -6.2, price: 0.032 },
  ];

  // Fetch real data from Birdeye
  useEffect(() => {
    if (!autoRefresh || (gainers && losers)) return;

    const fetchMovers = async () => {
      try {
        const api = getBirdeyeClient(apiKey);

        const [gainersData, losersData] = await Promise.all([
          api.getTopGainers(limit),
          api.getTopLosers(limit),
        ]);

        if (gainersData.length > 0) {
          setLiveGainers(gainersData.map(t => ({
            symbol: t.symbol,
            change: t.price_change_24h_percent,
            price: t.price,
          })));
        }

        if (losersData.length > 0) {
          setLiveLosers(losersData.map(t => ({
            symbol: t.symbol,
            change: t.price_change_24h_percent,
            price: t.price,
          })));
        }
      } catch (err) {
        console.error('[TopMovers] Failed to fetch data:', err);
      }
    };

    fetchMovers();
    const interval = setInterval(fetchMovers, refreshInterval);
    return () => clearInterval(interval);
  }, [apiKey, autoRefresh, refreshInterval, gainers, losers, limit]);

  const displayGainers = gainers || liveGainers || mockGainers;
  const displayLosers = losers || liveLosers || mockLosers;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green">
      <Box paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          TOP MOVERS
        </Text>
      </Box>

      <Box paddingX={1}>
        {/* Gainers */}
        <Box flexDirection="column" marginRight={2}>
          <Text color="green" bold>
            ▲ GAINERS
          </Text>
          {displayGainers.map((token) => (
            <Box key={token.symbol}>
              <Text color="cyan">{token.symbol.padEnd(6)}</Text>
              <Text color="green">+{token.change.toFixed(1)}%</Text>
            </Box>
          ))}
        </Box>

        {/* Separator */}
        <Text color="gray">│</Text>

        {/* Losers */}
        <Box flexDirection="column" marginLeft={2}>
          <Text color="red" bold>
            ▼ LOSERS
          </Text>
          {displayLosers.map((token) => (
            <Box key={token.symbol}>
              <Text color="cyan">{token.symbol.padEnd(6)}</Text>
              <Text color="red">{token.change.toFixed(1)}%</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateMockActivities(): Activity[] {
  return [
    {
      id: '1',
      type: 'swap',
      description: 'Swapped 10 SOL for 1,500 USDC',
      timestamp: Date.now() - 30000,
      signature: '4xK7sGqMB1234567890abcdefghijklmnopqrstuvwxyz',
      status: 'success',
    },
    {
      id: '2',
      type: 'transfer',
      description: 'Received 5 SOL from ABC1...XYZ9',
      timestamp: Date.now() - 120000,
      signature: '5yL8tHrNC1234567890abcdefghijklmnopqrstuvwxyz',
      status: 'success',
    },
    {
      id: '3',
      type: 'stake',
      description: 'Staked 25 SOL with Marinade',
      timestamp: Date.now() - 300000,
      signature: '6zM9uIsOD1234567890abcdefghijklmnopqrstuvwxyz',
      status: 'success',
    },
    {
      id: '4',
      type: 'swap',
      description: 'Swapped 500 USDC for 100M BONK',
      timestamp: Date.now() - 600000,
      signature: '7aN0vJtPE1234567890abcdefghijklmnopqrstuvwxyz',
      status: 'pending',
    },
    {
      id: '5',
      type: 'mint',
      description: 'Minted NFT #1234',
      timestamp: Date.now() - 900000,
      signature: '8bO1wKuQF1234567890abcdefghijklmnopqrstuvwxyz',
      status: 'success',
    },
    {
      id: '6',
      type: 'transfer',
      description: 'Sent 2 SOL to DEF2...UVW8',
      timestamp: Date.now() - 1200000,
      signature: '9cP2xLvRG1234567890abcdefghijklmnopqrstuvwxyz',
      status: 'failed',
    },
  ];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatTimeShort(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default ActivityFeed;
