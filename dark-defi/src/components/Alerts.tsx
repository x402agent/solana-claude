// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Alerts & Notifications Component
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'signal' | 'whale' | 'price';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: number;
  read?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
}

interface AlertsProps {
  alerts?: Alert[];
  maxVisible?: number;
  showTimestamp?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERT STYLING
// ─────────────────────────────────────────────────────────────────────────────

const ALERT_STYLES: Record<AlertType, { icon: string; color: string; bgColor?: string }> = {
  info: { icon: 'ℹ', color: 'cyan' },
  success: { icon: '✓', color: 'green' },
  warning: { icon: '⚠', color: 'yellow' },
  error: { icon: '✗', color: 'red' },
  signal: { icon: '⚡', color: 'magenta' },
  whale: { icon: '🐋', color: 'blue' },
  price: { icon: '📈', color: 'greenBright' },
};

const PRIORITY_STYLES: Record<string, { prefix: string; color: string }> = {
  low: { prefix: '○', color: 'gray' },
  medium: { prefix: '◐', color: 'yellow' },
  high: { prefix: '●', color: 'red' },
  critical: { prefix: '◉', color: 'redBright' },
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS PANEL
// ─────────────────────────────────────────────────────────────────────────────

export const AlertsPanel: React.FC<AlertsProps> = ({
  alerts,
  maxVisible = 10,
  showTimestamp = true,
}) => {
  const defaultAlerts: Alert[] = alerts || generateMockAlerts();
  const visibleAlerts = defaultAlerts.slice(0, maxVisible);
  const unreadCount = visibleAlerts.filter((a) => !a.read).length;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green">
      {/* Header */}
      <Box justifyContent="space-between" paddingX={1} borderBottom>
        <Text color="greenBright" bold>
          ALERTS
        </Text>
        {unreadCount > 0 && (
          <Text color="yellow" bold>
            {unreadCount} NEW
          </Text>
        )}
      </Box>

      {/* Alerts List */}
      <Box flexDirection="column" paddingX={1}>
        {visibleAlerts.length === 0 ? (
          <Text color="gray" dimColor>
            No alerts
          </Text>
        ) : (
          visibleAlerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} showTimestamp={showTimestamp} />
          ))
        )}
      </Box>

      {/* Footer */}
      {defaultAlerts.length > maxVisible && (
        <Box paddingX={1} borderTop>
          <Text color="gray" dimColor>
            +{defaultAlerts.length - maxVisible} more alerts
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT ITEM
// ─────────────────────────────────────────────────────────────────────────────

const AlertItem: React.FC<{ alert: Alert; showTimestamp?: boolean }> = ({
  alert,
  showTimestamp = true,
}) => {
  const style = ALERT_STYLES[alert.type];
  const priority = alert.priority ? PRIORITY_STYLES[alert.priority] : null;

  const timeAgo = getTimeAgo(alert.timestamp);

  return (
    <Box marginY={0}>
      {/* Priority indicator */}
      {priority && (
        <Text color={priority.color as any}>{priority.prefix} </Text>
      )}

      {/* Icon */}
      <Text color={style.color as any}>{style.icon} </Text>

      {/* Title */}
      <Text color={style.color as any} bold={!alert.read}>
        {alert.title}
      </Text>

      {/* Message */}
      <Text color={alert.read ? 'gray' : 'white'}> - {alert.message}</Text>

      {/* Timestamp */}
      {showTimestamp && (
        <Text color="gray" dimColor>
          {' '}
          [{timeAgo}]
        </Text>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT TOAST (Pop-up notification)
// ─────────────────────────────────────────────────────────────────────────────

export const AlertToast: React.FC<{
  alert: Alert;
  onDismiss?: () => void;
}> = ({ alert, onDismiss }) => {
  const style = ALERT_STYLES[alert.type];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={style.color as any}
      paddingX={2}
      paddingY={1}
    >
      <Box>
        <Text color={style.color as any} bold>
          {style.icon} {alert.title}
        </Text>
      </Box>
      <Box>
        <Text color="white">{alert.message}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Press any key to dismiss
        </Text>
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT BANNER (Scrolling ticker)
// ─────────────────────────────────────────────────────────────────────────────

export const AlertBanner: React.FC<{
  alerts?: Alert[];
}> = ({ alerts }) => {
  const defaultAlerts = alerts || generateMockAlerts().slice(0, 3);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % defaultAlerts.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [defaultAlerts.length]);

  const currentAlert = defaultAlerts[currentIndex];
  if (!currentAlert) return null;

  const style = ALERT_STYLES[currentAlert.type];

  return (
    <Box borderStyle="single" borderColor={style.color as any} paddingX={1}>
      <Text color={style.color as any}>{style.icon} </Text>
      <Text color={style.color as any} bold>
        {currentAlert.title}:
      </Text>
      <Text color="white"> {currentAlert.message}</Text>
      <Text color="gray">
        {' '}
        [{currentIndex + 1}/{defaultAlerts.length}]
      </Text>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WHALE ALERT
// ─────────────────────────────────────────────────────────────────────────────

export const WhaleAlert: React.FC<{
  type: 'buy' | 'sell' | 'transfer';
  token: string;
  amount: number;
  value: number;
  wallet?: string;
  timestamp?: number;
}> = ({ type, token, amount, value, wallet, timestamp = Date.now() }) => {
  const actionColor = type === 'buy' ? 'green' : type === 'sell' ? 'red' : 'cyan';
  const actionIcon = type === 'buy' ? '▲' : type === 'sell' ? '▼' : '↔';

  return (
    <Box borderStyle="single" borderColor="blue" paddingX={1}>
      <Text color="blue">🐋 WHALE </Text>
      <Text color={actionColor as any} bold>
        {actionIcon} {type.toUpperCase()}
      </Text>
      <Text color="gray"> │ </Text>
      <Text color="cyan">{formatAmount(amount)} {token}</Text>
      <Text color="gray"> │ </Text>
      <Text color="white">${formatValue(value)}</Text>
      {wallet && (
        <>
          <Text color="gray"> │ </Text>
          <Text color="gray" dimColor>
            {wallet.slice(0, 4)}...{wallet.slice(-4)}
          </Text>
        </>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRICE ALERT
// ─────────────────────────────────────────────────────────────────────────────

export const PriceAlert: React.FC<{
  token: string;
  price: number;
  change: number;
  condition?: 'above' | 'below' | 'change';
  threshold?: number;
}> = ({ token, price, change, condition, threshold }) => {
  const isUp = change >= 0;
  const color = isUp ? 'green' : 'red';
  const arrow = isUp ? '▲' : '▼';

  let message = '';
  if (condition === 'above') {
    message = `crossed above $${threshold}`;
  } else if (condition === 'below') {
    message = `dropped below $${threshold}`;
  } else if (condition === 'change') {
    message = `moved ${Math.abs(change).toFixed(1)}%`;
  }

  return (
    <Box borderStyle="single" borderColor={color as any} paddingX={1}>
      <Text color="greenBright">📈 PRICE </Text>
      <Text color="cyan" bold>
        {token}
      </Text>
      <Text color="gray"> │ </Text>
      <Text color={color as any}>
        {arrow} ${price.toFixed(4)} ({isUp ? '+' : ''}{change.toFixed(2)}%)
      </Text>
      {message && (
        <>
          <Text color="gray"> │ </Text>
          <Text color="yellow">{message}</Text>
        </>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL ALERT (Trading signals)
// ─────────────────────────────────────────────────────────────────────────────

export const SignalAlert: React.FC<{
  signal: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';
  token: string;
  confidence: number;
  reason?: string;
  price?: number;
}> = ({ signal, token, confidence, reason, price }) => {
  const signalStyles = {
    BUY: { color: 'green', icon: '🟢' },
    SELL: { color: 'red', icon: '🔴' },
    HOLD: { color: 'yellow', icon: '🟡' },
    NEUTRAL: { color: 'gray', icon: '⚪' },
  };

  const style = signalStyles[signal];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={style.color as any}
      paddingX={1}
    >
      <Box>
        <Text color="magenta">⚡ SIGNAL </Text>
        <Text color={style.color as any} bold>
          {style.icon} {signal}
        </Text>
        <Text color="cyan"> {token}</Text>
        {price && <Text color="gray"> @ ${price.toFixed(4)}</Text>}
      </Box>
      <Box>
        <Text color="gray">Confidence: </Text>
        <Text color={style.color as any}>
          {'█'.repeat(Math.round(confidence / 10))}
          {'░'.repeat(10 - Math.round(confidence / 10))}
        </Text>
        <Text color="white"> {confidence}%</Text>
      </Box>
      {reason && (
        <Box>
          <Text color="gray">Reason: </Text>
          <Text color="white">{reason}</Text>
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ALERT FEED (Live scrolling)
// ─────────────────────────────────────────────────────────────────────────────

export const AlertFeed: React.FC<{
  alerts?: Alert[];
  maxItems?: number;
  title?: string;
}> = ({ alerts, maxItems = 8, title = 'LIVE FEED' }) => {
  const defaultAlerts = alerts || generateMockAlerts();
  const visibleAlerts = defaultAlerts.slice(0, maxItems);

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green">
      <Box paddingX={1} borderBottom justifyContent="space-between">
        <Text color="greenBright" bold>
          {title}
        </Text>
        <Text color="green">● LIVE</Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {visibleAlerts.map((alert, i) => {
          const style = ALERT_STYLES[alert.type];
          return (
            <Box key={alert.id}>
              <Text color="gray" dimColor>
                {formatTime(alert.timestamp)}
              </Text>
              <Text color={style.color as any}> {style.icon}</Text>
              <Text color="white"> {alert.message}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateMockAlerts(): Alert[] {
  return [
    {
      id: '1',
      type: 'whale',
      title: 'Whale Alert',
      message: '5,000 SOL transferred to exchange',
      timestamp: Date.now() - 60000,
      priority: 'high',
    },
    {
      id: '2',
      type: 'price',
      title: 'Price Alert',
      message: 'SOL crossed $150 resistance',
      timestamp: Date.now() - 120000,
      priority: 'medium',
    },
    {
      id: '3',
      type: 'signal',
      title: 'Signal',
      message: 'BONK showing bullish divergence',
      timestamp: Date.now() - 300000,
      priority: 'medium',
    },
    {
      id: '4',
      type: 'info',
      title: 'News',
      message: 'Jupiter DEX announces v2 upgrade',
      timestamp: Date.now() - 600000,
      read: true,
    },
    {
      id: '5',
      type: 'warning',
      title: 'Risk',
      message: 'High volatility detected in BONK',
      timestamp: Date.now() - 900000,
      priority: 'high',
    },
  ];
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatAmount(amount: number): string {
  if (amount >= 1e9) return (amount / 1e9).toFixed(2) + 'B';
  if (amount >= 1e6) return (amount / 1e6).toFixed(2) + 'M';
  if (amount >= 1e3) return (amount / 1e3).toFixed(2) + 'K';
  return amount.toFixed(2);
}

function formatValue(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
  return value.toFixed(2);
}

export default AlertsPanel;
