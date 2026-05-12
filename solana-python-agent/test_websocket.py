"""Test Birdeye WebSocket Integration"""

import asyncio
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

from config import load_config
from clients.birdeye_client import BirdeyeWebSocketClient


async def test_websocket():
    """Test Birdeye WebSocket connection and subscriptions"""

    print("🧪 Testing Birdeye WebSocket Integration...\n")

    # Load config
    config = load_config()
    print(f"✓ Config loaded")
    print(f"  API Key: {config.birdeye_api_key[:20]}...")
    print(f"  WSS URL: {config.birdeye_wss_url[:60]}...\n")

    # Create WebSocket client
    ws_client = BirdeyeWebSocketClient(api_key=config.birdeye_api_key)
    print(f"✓ WebSocket client created\n")

    # Event counters
    event_counts = {
        "PRICE_UPDATE": 0,
        "NEW_LISTING": 0,
        "LARGE_TRADE": 0,
        "WALLET_TX": 0,
    }

    # Register event handlers
    async def on_price_update(data):
        event_counts["PRICE_UPDATE"] += 1
        print(f"📊 Price Update #{event_counts['PRICE_UPDATE']}: {data.get('address', 'Unknown')[:8]}... = ${data.get('price', 0)}")

    async def on_new_listing(data):
        event_counts["NEW_LISTING"] += 1
        print(f"🆕 New Listing #{event_counts['NEW_LISTING']}: {data.get('name', 'Unknown')} ({data.get('symbol', 'N/A')})")

    async def on_large_trade(data):
        event_counts["LARGE_TRADE"] += 1
        print(f"🐋 Large Trade #{event_counts['LARGE_TRADE']}: ${data.get('amountUSD', 0):,.2f} - {data.get('side', 'N/A')}")

    async def on_wallet_tx(data):
        event_counts["WALLET_TX"] += 1
        print(f"💼 Wallet TX #{event_counts['WALLET_TX']}: {data.get('type', 'Unknown')}")

    ws_client.on("PRICE_UPDATE", on_price_update)
    ws_client.on("NEW_LISTING", on_new_listing)
    ws_client.on("LARGE_TRADE", on_large_trade)
    ws_client.on("WALLET_TX", on_wallet_tx)
    print(f"✓ Event handlers registered\n")

    try:
        # Connect
        print("Connecting to Birdeye WebSocket...")
        await ws_client.connect()
        print(f"✓ Connected: {ws_client.is_connected}\n")

        # Subscribe to new listings
        print("Subscribing to new token listings...")
        await ws_client.subscribe_new_listings()
        print("✓ Subscribed to new listings\n")

        # Subscribe to BONK price updates
        bonk_address = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
        print(f"Subscribing to BONK price updates ({bonk_address[:8]}...)...")
        await ws_client.subscribe_price(bonk_address)
        print("✓ Subscribed to BONK prices\n")

        # Subscribe to large trades
        print("Subscribing to large trades (>$10k)...")
        await ws_client.subscribe_large_trades(threshold_usd=10000)
        print("✓ Subscribed to large trades\n")

        # Subscribe to wallet transactions (MAWD wallet)
        if config.wallet_address:
            print(f"Subscribing to wallet transactions ({config.wallet_address[:8]}...)...")
            await ws_client.subscribe_wallet_transactions(config.wallet_address)
            print("✓ Subscribed to wallet transactions\n")

        print("=" * 60)
        print("📡 WebSocket Test Running - Listening for events...")
        print("   Press Ctrl+C to stop")
        print("=" * 60)
        print()

        # Run for 60 seconds to test
        for i in range(60):
            await asyncio.sleep(1)
            if i % 10 == 0 and i > 0:
                print(f"\n⏱️  Running for {i} seconds...")
                print(f"   Events received: {sum(event_counts.values())}")
                print(f"   - Price updates: {event_counts['PRICE_UPDATE']}")
                print(f"   - New listings: {event_counts['NEW_LISTING']}")
                print(f"   - Large trades: {event_counts['LARGE_TRADE']}")
                print(f"   - Wallet TXs: {event_counts['WALLET_TX']}\n")

        print("\n" + "=" * 60)
        print("✅ Test Complete!")
        print(f"Total events received: {sum(event_counts.values())}")
        print(f"- Price updates: {event_counts['PRICE_UPDATE']}")
        print(f"- New listings: {event_counts['NEW_LISTING']}")
        print(f"- Large trades: {event_counts['LARGE_TRADE']}")
        print(f"- Wallet TXs: {event_counts['WALLET_TX']}")
        print("=" * 60)

    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Error during test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Disconnect
        print("\nDisconnecting...")
        await ws_client.disconnect()
        print("✓ Disconnected\n")
        print("Test finished!")


if __name__ == "__main__":
    asyncio.run(test_websocket())
