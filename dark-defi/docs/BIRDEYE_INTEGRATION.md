# Birdeye API & WebSocket Integration Guide

## Overview

This integration provides real-time Solana token data from Birdeye's API and WebSocket services for the Dark Ralph TUI.

## Files Added/Modified

### New Services

1. **`src/services/birdeye-api.ts`** - Full Birdeye API v3 client
   - Token metadata, market data, trade data
   - Price stats, OHLCV, price history
   - Token lists (trending, gainers, losers, new listings)
   - Transactions, wallet portfolio
   - Pair/pool data

2. **`src/services/birdeye-websocket.ts`** - Real-time WebSocket streaming
   - Price updates subscription
   - Trade updates subscription
   - OHLCV updates subscription
   - New token listings
   - Auto-reconnect and heartbeat

3. **`src/services/market-data-provider.ts`** - React hooks and context
   - `useMarketDataProvider()` - Main data provider hook
   - `useTokenPrice()` - Get single token price
   - `useTrendingTokens()` - Get trending tokens
   - `useRecentTrades()` - Get recent trades for a token
   - `useOHLCV()` - Get OHLCV chart data

4. **`src/services/index.ts`** - Service exports index

### Modified Components

All components now support an optional `apiKey` prop and `autoRefresh` for live data:

- **`PriceChart.tsx`** - Added `address` and `apiKey` props for OHLCV data
- **`TickerRow`** - Auto-fetches real prices with `apiKey` prop
- **`Heatmap.tsx`** - Fetches real market data for heatmap
- **`ActivityFeed.tsx`** - TopMovers fetches real gainers/losers

## Usage Examples

### Basic Component Usage

```tsx
import { PriceChart, TickerRow } from './components/PriceChart';
import { MarketHeatmap } from './components/Heatmap';
import { TopMovers } from './components/ActivityFeed';

// With real data (requires BIRDEYE_API_KEY in .env)
<PriceChart 
  symbol="SOL/USDC"
  address="So11111111111111111111111111111111111111112"
  apiKey={process.env.BIRDEYE_API_KEY}
  timeframe="1H"
/>

<TickerRow apiKey={process.env.BIRDEYE_API_KEY} />

<MarketHeatmap apiKey={process.env.BIRDEYE_API_KEY} />

<TopMovers apiKey={process.env.BIRDEYE_API_KEY} limit={5} />
```

### Using the API Client Directly

```tsx
import { getBirdeyeClient, POPULAR_TOKENS } from './services';

const api = getBirdeyeClient(process.env.BIRDEYE_API_KEY);

// Get token overview
const overview = await api.getTokenOverview(POPULAR_TOKENS.SOL);

// Get OHLCV data
const candles = await api.getOHLCV(POPULAR_TOKENS.SOL, { type: '1H' });

// Get trending tokens
const trending = await api.getTrendingTokens(20);

// Get top gainers/losers
const gainers = await api.getTopGainers(10);
const losers = await api.getTopLosers(10);

// Get wallet portfolio
const portfolio = await api.getWalletPortfolio('YourWalletAddress...');
```

### Using WebSocket for Real-time Updates

```tsx
import { getBirdeyeWebSocket, POPULAR_TOKENS } from './services';

const ws = getBirdeyeWebSocket({ 
  apiKey: process.env.BIRDEYE_API_KEY 
});

// Event handlers
ws.on('connected', () => console.log('Connected!'));
ws.on('price', (update) => console.log('Price:', update));
ws.on('trade', (trade) => console.log('Trade:', trade));

// Connect
await ws.connect();

// Subscribe to prices
ws.subscribeToPrices([POPULAR_TOKENS.SOL, POPULAR_TOKENS.BONK]);

// Subscribe to trades
ws.subscribeToTrades([POPULAR_TOKENS.WIF]);

// Subscribe to OHLCV
ws.subscribeToOHLCV(POPULAR_TOKENS.JUP, '1m');

// Subscribe to new listings
ws.subscribeToNewListings();

// Disconnect when done
ws.disconnect();
```

### Using React Hooks

```tsx
import { useTokenPrice, useTrendingTokens, useOHLCV, POPULAR_TOKENS } from './services';

function MyComponent() {
  // Single token price
  const { price, loading } = useTokenPrice(POPULAR_TOKENS.SOL);

  // Trending tokens
  const { tokens } = useTrendingTokens(10);

  // OHLCV data
  const { candles } = useOHLCV(POPULAR_TOKENS.SOL, '1H');

  return (
    <Box>
      {loading ? <Text>Loading...</Text> : <Text>SOL: ${price}</Text>}
    </Box>
  );
}
```

## Environment Variables

Make sure these are set in your `.env`:

```env
BIRDEYE_API_KEY=your_birdeye_api_key_here
BIRDEYE_WSS_URL=wss://public-api.birdeye.so/socket/solana?x-api-key=YOUR_KEY
```

## Popular Token Addresses

The integration includes a `POPULAR_TOKENS` constant with common Solana tokens:

```typescript
POPULAR_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  JTO: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  MNGO: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
  SAMO: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
}
```

## API Endpoints Covered

### Token Data
- Token Metadata (single/multiple)
- Token Market Data (single/multiple)
- Token Overview
- Token Trade Data (single/multiple)
- Price Stats (single/multiple)

### Pair/Pool Data
- Pair Overview (single/multiple)

### Token Lists
- Token List (filtered/sorted)
- Trending Tokens
- Top Gainers
- Top Losers
- New Listings

### Transactions
- Token Transactions
- All Recent Transactions
- Pair Transactions
- Trader Transactions

### Price History
- OHLCV (multiple timeframes)
- Price History

### Wallet
- Wallet Token Portfolio

## Fallback Behavior

All components include mock data fallbacks:
- If no API key is provided, mock data is displayed
- If API calls fail, mock data is used
- This ensures the UI always renders, even without connectivity
