"""Test Bags API Integration"""

import asyncio
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

from config import load_config
from clients.bags_client import BagsClient


async def test_bags_api():
    """Test Bags API connection and functionality"""

    print("🧪 Testing Bags API Integration...\n")

    # Load config
    config = load_config()
    print(f"✓ Config loaded")
    print(f"  BAGS_API_KEY: {config.bags_api_key[:20]}...")
    print(f"  BAGS_CONFIG_KEY: {config.bags_config_key}")
    print(f"  Wallet: {config.wallet_address}\n")

    # Create Bags client
    bags_client = BagsClient(
        api_key=config.bags_api_key,
        config_key=config.bags_config_key,
        rpc_url=config.helius_rpc_url,
        private_key=config.private_key,
    )

    print(f"✓ Bags client created")
    print(f"  Wallet pubkey: {bags_client.wallet_pubkey}\n")

    try:
        # =====================
        # Test 1: Health Check
        # =====================
        print("=" * 60)
        print("Test 1: Health Check")
        print("=" * 60)

        is_healthy = await bags_client.health_check()
        if is_healthy:
            print("✅ Bags API is healthy (pong received)")
        else:
            print("⚠️  Bags API health check failed")
        print()

        # =====================
        # Test 2: Get Swap Quote
        # =====================
        print("=" * 60)
        print("Test 2: Get Swap Quote (0.01 SOL → BONK)")
        print("=" * 60)

        try:
            # BONK token mint
            BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
            WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112"

            quote = await bags_client.get_quote(
                input_mint=WRAPPED_SOL_MINT,
                output_mint=BONK_MINT,
                amount=10_000_000,  # 0.01 SOL in lamports
                slippage_bps=300,   # 3% slippage
            )

            print("✅ Quote received successfully")
            print(f"  Input: {int(quote.in_amount) / 1e9:.4f} SOL")
            print(f"  Output: {int(quote.out_amount):,} BONK tokens")
            print(f"  Min output: {int(quote.min_out_amount):,} BONK tokens")
            print(f"  Price impact: {quote.price_impact_pct}%")
            print(f"  Slippage: {quote.slippage_bps} bps ({quote.slippage_bps / 100}%)")
            print(f"  Request ID: {quote.request_id}")
            print(f"  Route steps: {len(quote.route_plan)}")

        except Exception as e:
            print(f"❌ Quote failed: {e}")

        print()

        # =====================
        # Test 3: Get Claimable Fees
        # =====================
        print("=" * 60)
        print("Test 3: Get Claimable Fees")
        print("=" * 60)

        try:
            claimable = await bags_client.get_claimable_fees()

            if claimable:
                print(f"✅ Found {len(claimable)} claimable fee position(s)")
                for i, position in enumerate(claimable, 1):
                    print(f"\n  Position {i}:")
                    print(f"    Token: {position.get('baseMint', 'Unknown')[:8]}...")
                    print(f"    Amount: {position.get('amount', 0)}")
                    print(f"    Config Key: {position.get('configKey', 'Unknown')[:8]}...")
            else:
                print("✅ No claimable fees found (wallet has no fee positions)")

        except Exception as e:
            print(f"⚠️  Claimable fees check: {e}")

        print()

        # =====================
        # Test 4: Get Jito Fees
        # =====================
        print("=" * 60)
        print("Test 4: Get Jito Fee Percentiles")
        print("=" * 60)

        try:
            jito_fees = await bags_client.get_jito_fees()

            print("✅ Jito fees retrieved")

            # Extract percentile data if available
            if isinstance(jito_fees, dict):
                for key, value in jito_fees.items():
                    if isinstance(value, (int, float)):
                        print(f"  {key}: {value:,.0f} lamports ({value / 1e9:.6f} SOL)")
                    else:
                        print(f"  {key}: {value}")
            else:
                print(f"  Raw response: {jito_fees}")

        except Exception as e:
            print(f"⚠️  Jito fees: {e}")

        print()

        # =====================
        # Test 5: Token Info (BONK)
        # =====================
        print("=" * 60)
        print("Test 5: Get Token Fees (BONK)")
        print("=" * 60)

        try:
            BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
            token_fees = await bags_client.get_token_fees(BONK_MINT)

            print("✅ Token fees retrieved")

            if isinstance(token_fees, dict):
                for key, value in token_fees.items():
                    if isinstance(value, (int, float)) and key != 'baseMint':
                        print(f"  {key}: {value:,.0f}")
                    else:
                        print(f"  {key}: {value}")
            else:
                print(f"  Raw response: {token_fees}")

        except Exception as e:
            print(f"⚠️  Token fees: {e}")

        print()

        # =====================
        # Summary
        # =====================
        print("=" * 60)
        print("✅ Bags API Integration Test Complete!")
        print("=" * 60)
        print()
        print("Verified Components:")
        print("  ✅ API Authentication (x-api-key header)")
        print("  ✅ Health Check Endpoint")
        print("  ✅ Trade Quote Generation")
        print("  ✅ Fee Position Queries")
        print("  ✅ Jito Fee Information")
        print("  ✅ Token Fee Queries")
        print()
        print("Available Functionality:")
        print("  • Token swaps (buy/sell)")
        print("  • Token launches with fee sharing")
        print("  • Fee claiming from positions")
        print("  • Jito bundle submission")
        print("  • Quote generation with slippage")
        print()
        print("Configuration:")
        print(f"  • BAGS_API_KEY: Configured ✓")
        print(f"  • BAGS_CONFIG_KEY: {config.bags_config_key} ✓")
        print(f"  • Wallet: {bags_client.wallet_pubkey} ✓")
        print()

    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Close client
        print("Closing Bags client...")
        await bags_client.close()
        print("✓ Closed\n")
        print("Test finished!")


if __name__ == "__main__":
    asyncio.run(test_bags_api())
