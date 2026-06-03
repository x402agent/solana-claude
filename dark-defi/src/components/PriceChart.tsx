// ═══════════════════════════════════════════════════════════════════════════════
// DARK RALPH TUI - Price Chart Component (Bloomberg Style ASCII Candlesticks)
// Now with real-time Birdeye data integration
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { getBirdeyeClient, POPULAR_TOKENS } from '../services/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  data?: Candle[];
  symbol?: string;
  address?: string;  // Token address for real data
  apiKey?: string;   // Birdeye API key
  width?: number;
  height?: number;
  timeframe?: '1m' | '5m' | '15m' | '1H' | '4H' | '1D';
  showVolume?: boolean;
  showMA?: boolean;
  refreshInterval?: number;  // Auto-refresh in ms
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE CHART COMPONENT (CANDLESTICK)
// ─────────────────────────────────────────────────────────────────────────────

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  symbol = 'SOL/USDC',
  address,
  apiKey,
  width = 60,
  height = 15,
  timeframe = '1H',
  showVolume = true,
  showMA = true,
  refreshInterval = 60000,
}) => {
  const [liveData, setLiveData] = useState<Candle[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real OHLCV data if address is provided
  useEffect(() => {
    if (!address) return;

    const fetchOHLCV = async () => {
      try {
        setIsLoading(true);
        const api = getBirdeyeClient(apiKey);
        const ohlcvData = await api.getOHLCV(address, { type: timeframe as any });

        if (ohlcvData && ohlcvData.length > 0) {
          const candles: Candle[] = ohlcvData.map(bar => ({
            timestamp: bar.timestamp,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume,
          }));
          setLiveData(candles);
          setError(null);
        }
      } catch (err: any) {
        setError(err.message);
        console.error('[PriceChart] Failed to fetch OHLCV:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOHLCV();

    // Set up refresh interval
    const interval = setInterval(fetchOHLCV, refreshInterval);
    return () => clearInterval(interval);
  }, [address, apiKey, timeframe, refreshInterval]);

  // Use provided data, live data, or generate mock
  const candles = data || liveData || generateMockCandles(width - 4);

  // Calculate price range
  const prices = candles.flatMap((c) => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Scale price to chart height
  const scalePrice = (price: number) => {
    return Math.round(((price - minPrice) / priceRange) * (height - 3));
  };

  // Calculate simple moving average
  const ma20 = calculateMA(candles, 20);

  // Create chart grid
  const chartHeight = height - 3; // Reserve space for volume
  const grid: string[][] = Array(chartHeight)
    .fill(null)
    .map(() => Array(candles.length).fill(' '));

  // Draw candles
  candles.forEach((candle, x) => {
    const openY = scalePrice(candle.open);
    const closeY = scalePrice(candle.close);
    const highY = scalePrice(candle.high);
    const lowY = scalePrice(candle.low);

    const isGreen = candle.close >= candle.open;
    const bodyTop = Math.max(openY, closeY);
    const bodyBottom = Math.min(openY, closeY);

    // Draw wick
    for (let y = lowY; y <= highY; y++) {
      if (y >= 0 && y < chartHeight) {
        grid[chartHeight - 1 - y][x] = '│';
      }
    }

    // Draw body
    for (let y = bodyBottom; y <= bodyTop; y++) {
      if (y >= 0 && y < chartHeight) {
        grid[chartHeight - 1 - y][x] = isGreen ? '█' : '▒';
      }
    }
  });

  // Draw MA line if enabled
  if (showMA && ma20.length > 0) {
    ma20.forEach((maValue, x) => {
      if (maValue !== null) {
        const y = scalePrice(maValue);
        if (y >= 0 && y < chartHeight && grid[chartHeight - 1 - y][x] === ' ') {
          grid[chartHeight - 1 - y][x] = '·';
        }
      }
    });
  }

  // Get latest candle for stats
  const latest = candles[candles.length - 1];
  const change = latest.close - candles[0].open;
  const changePercent = (change / candles[0].open) * 100;

  // Volume bars
  const maxVolume = Math.max(...candles.map((c) => c.volume));
  const volumeBars = candles.map((c) => {
    const barHeight = Math.round((c.volume / maxVolume) * 3);
    return '▁▂▃▄▅▆▇█'.charAt(Math.min(barHeight, 7));
  });

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green" width={width}>
      {/* Header */}
      <Box justifyContent="space-between" paddingX={1}>
        <Box>
          <Text color="greenBright" bold>
            {symbol}
          </Text>
          <Text color="gray"> │ </Text>
          <Text color="cyan">{timeframe}</Text>
        </Box>
        <Box>
          <Text color={change >= 0 ? 'green' : 'red'}>
            ${latest.close.toFixed(2)} ({change >= 0 ? '+' : ''}
            {changePercent.toFixed(2)}%)
          </Text>
        </Box>
      </Box>

      {/* Price axis and chart */}
      <Box flexDirection="row" paddingX={1}>
        {/* Y-axis labels */}
        <Box flexDirection="column" width={8}>
          <Text color="gray">{maxPrice.toFixed(2)}</Text>
          {Array(chartHeight - 2)
            .fill(null)
            .map((_, i) => (
              <Text key={i} color="gray">
                {' '}
              </Text>
            ))}
          <Text color="gray">{minPrice.toFixed(2)}</Text>
        </Box>

        {/* Chart */}
        <Box flexDirection="column">
          {grid.map((row, y) => (
            <Box key={y}>
              {row.map((cell, x) => {
                const candle = candles[x];
                const isGreen = candle && candle.close >= candle.open;
                const color = cell === '·' ? 'yellow' : isGreen ? 'green' : 'red';
                return (
                  <Text key={x} color={color}>
                    {cell}
                  </Text>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Volume */}
      {showVolume && (
        <Box paddingX={1} marginTop={1}>
          <Text color="gray">VOL </Text>
          {volumeBars.map((bar, i) => {
            const candle = candles[i];
            const isGreen = candle && candle.close >= candle.open;
            return (
              <Text key={i} color={isGreen ? 'green' : 'red'} dimColor>
                {bar}
              </Text>
            );
          })}
        </Box>
      )}

      {/* Stats bar */}
      <Box justifyContent="space-between" paddingX={1} marginTop={1} borderTop>
        <Text color="gray">
          O: <Text color="white">{latest.open.toFixed(2)}</Text>
        </Text>
        <Text color="gray">
          H: <Text color="green">{latest.high.toFixed(2)}</Text>
        </Text>
        <Text color="gray">
          L: <Text color="red">{latest.low.toFixed(2)}</Text>
        </Text>
        <Text color="gray">
          C: <Text color="white">{latest.close.toFixed(2)}</Text>
        </Text>
      </Box>

      {/* Legend */}
      {showMA && (
        <Box paddingX={1}>
          <Text color="green">█ UP</Text>
          <Text color="gray"> │ </Text>
          <Text color="red">▒ DOWN</Text>
          <Text color="gray"> │ </Text>
          <Text color="yellow">· MA20</Text>
        </Box>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SPARKLINE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Sparkline: React.FC<{
  data?: number[];
  width?: number;
  label?: string;
  showChange?: boolean;
}> = ({ data, width = 20, label, showChange = true }) => {
  const prices = data || generateMockPrices(width);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const chars = '▁▂▃▄▅▆▇█';
  const sparkline = prices.map((p) => {
    const normalized = (p - min) / range;
    const index = Math.floor(normalized * 7);
    return chars[Math.min(index, 7)];
  });

  const change = prices[prices.length - 1] - prices[0];
  const changePercent = (change / prices[0]) * 100;
  const isUp = change >= 0;

  return (
    <Box>
      {label && (
        <Text color="gray">
          {label}:{' '}
        </Text>
      )}
      <Text color={isUp ? 'green' : 'red'}>{sparkline.join('')}</Text>
      {showChange && (
        <Text color={isUp ? 'green' : 'red'}>
          {' '}
          {isUp ? '+' : ''}
          {changePercent.toFixed(1)}%
        </Text>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRICE TICKER
// ─────────────────────────────────────────────────────────────────────────────

export const PriceTicker: React.FC<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}> = ({ symbol, price, change, changePercent, volume }) => {
  const isUp = change >= 0;
  const arrow = isUp ? '▲' : '▼';

  return (
    <Box>
      <Text color="cyan" bold>
        {symbol}
      </Text>
      <Text color="gray"> │ </Text>
      <Text color="white">${price.toFixed(2)}</Text>
      <Text color="gray"> </Text>
      <Text color={isUp ? 'green' : 'red'}>
        {arrow} {isUp ? '+' : ''}
        {change.toFixed(2)} ({isUp ? '+' : ''}
        {changePercent.toFixed(2)}%)
      </Text>
      {volume && (
        <>
          <Text color="gray"> │ Vol: </Text>
          <Text color="white">{formatVolume(volume)}</Text>
        </>
      )}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-TICKER ROW (with real-time data support)
// ─────────────────────────────────────────────────────────────────────────────

interface TickerRowProps {
  tickers?: Array<{ symbol: string; price: number; change: number; address?: string }>;
  apiKey?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const TickerRow: React.FC<TickerRowProps> = ({
  tickers,
  apiKey,
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const [liveTickers, setLiveTickers] = useState<Array<{ symbol: string; price: number; change: number }> | null>(null);

  // Default mock tickers
  const defaultMockTickers = [
    { symbol: 'SOL', price: 150.25, change: 2.34, address: POPULAR_TOKENS.SOL },
    { symbol: 'BONK', price: 0.00002345, change: 5.67, address: POPULAR_TOKENS.BONK },
    { symbol: 'WIF', price: 2.85, change: -1.2, address: POPULAR_TOKENS.WIF },
    { symbol: 'JUP', price: 0.69, change: 3.8, address: POPULAR_TOKENS.JUP },
  ];

  // Fetch real ticker data if apiKey is available
  useEffect(() => {
    if (!autoRefresh || tickers) return;

    const fetchTickers = async () => {
      try {
        const api = getBirdeyeClient(apiKey);
        const addresses = defaultMockTickers.map(t => t.address!);

        const [marketData, tradeData] = await Promise.all([
          api.getMultipleTokenMarketData(addresses),
          api.getMultipleTokenTradeData(addresses),
        ]);

        if (marketData) {
          const newTickers = defaultMockTickers.map(t => {
            const market = marketData[t.address!];
            const trade = tradeData?.[t.address!];
            return {
              symbol: t.symbol,
              price: market?.price || t.price,
              change: trade?.price_change_24h_percent || t.change,
            };
          });
          setLiveTickers(newTickers);
        }
      } catch (err) {
        console.error('[TickerRow] Failed to fetch tickers:', err);
      }
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, refreshInterval);
    return () => clearInterval(interval);
  }, [apiKey, autoRefresh, refreshInterval, tickers]);

  const displayTickers = tickers || liveTickers || defaultMockTickers;

  return (
    <Box>
      {displayTickers.map((ticker, i) => (
        <React.Fragment key={ticker.symbol}>
          <Text color="cyan">{ticker.symbol}</Text>
          <Text color="white"> ${formatPrice(ticker.price)}</Text>
          <Text color={ticker.change >= 0 ? 'green' : 'red'}>
            {' '}
            {ticker.change >= 0 ? '+' : ''}
            {ticker.change.toFixed(2)}%
          </Text>
          {i < displayTickers.length - 1 && <Text color="gray"> │ </Text>}
        </React.Fragment>
      ))}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateMockCandles(count: number): Candle[] {
  const candles: Candle[] = [];
  let price = 150;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 5;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const volume = Math.random() * 10000 + 1000;

    candles.push({
      timestamp: Date.now() - (count - i) * 3600000,
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return candles;
}

function generateMockPrices(count: number): number[] {
  const prices: number[] = [];
  let price = 150;

  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.5) * 3;
    prices.push(price);
  }

  return prices;
}

function calculateMA(candles: Candle[], period: number): (number | null)[] {
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    const slice = candles.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, c) => acc + c.close, 0);
    return sum / period;
  });
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
  if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
  if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K';
  return volume.toFixed(0);
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(0);
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(8);
}

export default PriceChart;
