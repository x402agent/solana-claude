"""Test script for new MAWD features"""

import asyncio
from config import load_config
from clients.birdeye_client import BirdeyeClient
from clients.bags_client import BagsClient


async def test_new_features():
    """Test the new Birdeye analytics features."""

    print("🧪 Testing New MAWD Features\n")
    print("=" * 80)

    # Load config
    print("\n1. Loading configuration...")
    config = load_config()
    print(f"✓ Wallet: {config.wallet_address}")

    # Initialize clients
    print("\n2. Initializing clients...")
    birdeye = BirdeyeClient(api_key=config.birdeye_api_key)
    bags = BagsClient(
        api_key=config.bags_api_key,
        config_key=config.bags_config_key,
        rpc_url=config.helius_rpc_url,
        private_key=config.private_key
    )
    print(f"✓ Birdeye client initialized")
    print(f"✓ Bags client initialized")

    wallet = bags.wallet_pubkey
    print(f"\n📍 Testing with wallet: {wallet}")

    # Test 1: Net Worth
    print("\n" + "-" * 80)
    print("📊 TEST 1: Get Wallet Net Worth")
    print("-" * 80)
    try:
        data = await birdeye.get_wallet_net_worth(wallet=wallet, limit=5)
        total_value = float(data.get("total_value", 0))
        items = data.get("items", [])

        print(f"✅ Total Net Worth: ${total_value:.2f} USD")
        print(f"   Assets found: {len(items)}")

        if items:
            print("\n   Top 5 Assets:")
            for item in items[:5]:
                symbol = item.get("symbol", "???")
                value = float(item.get("value", 0))
                amount = float(item.get("amount", 0))
                print(f"   • {symbol}: {amount:,.4f} (${value:.2f})")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 2: Net Worth Chart
    print("\n" + "-" * 80)
    print("📈 TEST 2: Get Net Worth Chart (7 days)")
    print("-" * 80)
    try:
        data = await birdeye.get_wallet_net_worth_chart(
            wallet=wallet,
            count=7,
            time_type="1d"
        )
        history = data.get("history", [])

        print(f"✅ History points: {len(history)}")

        if history:
            print("\n   Last 3 days:")
            for point in history[-3:]:
                timestamp = point.get("timestamp", "")
                net_worth = float(point.get("net_worth", 0))
                change = float(point.get("net_worth_change", 0))
                change_pct = float(point.get("net_worth_change_percent", 0))

                date = timestamp.split("T")[0] if "T" in timestamp else timestamp
                print(f"   • {date}: ${net_worth:.2f} ({change:+.2f}, {change_pct:+.2f}%)")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 3: PnL Summary
    print("\n" + "-" * 80)
    print("💰 TEST 3: Get Profit & Loss Summary")
    print("-" * 80)
    try:
        data = await birdeye.get_wallet_pnl_summary(wallet=wallet, duration="30d")
        summary = data.get("summary", {})

        counts = summary.get("counts", {})
        pnl = summary.get("pnl", {})

        total_trades = counts.get("total_trade", 0)
        win_rate = float(counts.get("win_rate", 0)) * 100
        realized_profit = float(pnl.get("realized_profit_usd", 0))
        unrealized_profit = float(pnl.get("unrealized_usd", 0))
        total_profit = float(pnl.get("total_usd", 0))

        print(f"✅ PnL Summary (30 days):")
        print(f"   Total Trades: {total_trades}")
        print(f"   Win Rate: {win_rate:.1f}%")
        print(f"   Realized Profit: ${realized_profit:.2f}")
        print(f"   Unrealized Profit: ${unrealized_profit:.2f}")
        print(f"   Total Profit: ${total_profit:.2f}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 4: Token Security Analysis
    print("\n" + "-" * 80)
    print("🔐 TEST 4: Analyze Token Security (BONK)")
    print("-" * 80)
    bonk_address = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
    try:
        security = await birdeye.get_token_security(bonk_address)
        overview = await birdeye.get_token_overview(bonk_address)

        print(f"✅ Token: {overview.symbol} ({overview.name})")
        print(f"   Price: ${overview.price:.6f}")
        print(f"   Market Cap: ${overview.market_cap:,.0f}")
        print(f"   Holders: {overview.holder_count:,}")
        print(f"\n   Security:")
        print(f"   • Freeze Authority: {security.get('freezeAuthority') or 'None ✓'}")
        print(f"   • Mint Authority: {security.get('mintAuthority') or 'None ✓'}")
        print(f"   • Mutable: {security.get('isMutable', False)}")
        print(f"   • Top 10 Holders: {security.get('top10HolderPercent', 0):.1f}%")

        # Risk assessment
        risks = []
        if security.get("freezeAuthority"):
            risks.append("Has freeze authority")
        if security.get("mintAuthority"):
            risks.append("Has mint authority")
        top_holder_pct = float(security.get("top10HolderPercent", 0))
        if top_holder_pct > 50:
            risks.append(f"High concentration ({top_holder_pct:.1f}%)")

        if risks:
            print(f"\n   ⚠️ Risks: {', '.join(risks)}")
        else:
            print(f"\n   ✓ No major security risks detected")

    except Exception as e:
        print(f"❌ Error: {e}")

    # Close clients
    await birdeye.close()

    print("\n" + "=" * 80)
    print("✅ All tests completed!")
    print("\n💡 These features are now available in the agent!")
    print("   Try: 'What's my net worth?'")
    print("   Try: 'Show my PnL for the last 30 days'")
    print("   Try: 'Analyze token <address>'")


if __name__ == "__main__":
    asyncio.run(test_new_features())
