#!/usr/bin/env python3
"""Launch a token on pump.fun with automatic metadata upload"""

import sys
import argparse


def parse_args():
    parser = argparse.ArgumentParser(
        description="Launch a token on pump.fun",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Launch a token with an image file
  python launch_pumpfun.py --name "My Token" --symbol "MTK" --description "A cool token" --image ./logo.png

  # Launch with social links
  python launch_pumpfun.py --name "My Token" --symbol "MTK" --description "A cool token" \\
    --image ./logo.png --twitter "https://twitter.com/mytoken" --website "https://mytoken.com"

  # Launch with initial buy (dev buy)
  python launch_pumpfun.py --name "My Token" --symbol "MTK" --description "A cool token" \\
    --image ./logo.png --initial-buy 0.5

Environment Variables (in .env.local):
  HELIUS_RPC_URL or SOLANA_RPC_URL  - Solana RPC endpoint
  MAWD_PRIVATE_KEY or SOLANA_PRIVATE_KEY  - Wallet private key (base58)
        """
    )

    parser.add_argument("--name", "-n", required=True, help="Token name")
    parser.add_argument("--symbol", "-s", required=True, help="Token symbol/ticker")
    parser.add_argument("--description", "-d", required=True, help="Token description")
    parser.add_argument("--image", "-i", help="Path to image file (PNG, JPG, GIF)")
    parser.add_argument("--image-url", help="URL to image (alternative to --image)")
    parser.add_argument("--twitter", help="Twitter URL")
    parser.add_argument("--telegram", help="Telegram URL")
    parser.add_argument("--website", help="Website URL")
    parser.add_argument("--initial-buy", type=float, default=0.0, help="Initial buy amount in SOL (default: 0)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without executing")

    return parser.parse_args()


args = parse_args()

# Now import after parsing (to show help without loading heavy deps)
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Load env
for env_file in [".env.local", ".env"]:
    if Path(env_file).exists():
        load_dotenv(env_file)
        break


async def main():
    from clients.pumpfun_client import PumpFunClient

    # Get RPC URL
    rpc_url = os.getenv("HELIUS_RPC_URL") or os.getenv("SOLANA_RPC_URL")
    if not rpc_url:
        print("❌ Error: HELIUS_RPC_URL or SOLANA_RPC_URL not set in .env.local")
        return

    # Get private key
    private_key = os.getenv("MAWD_PRIVATE_KEY") or os.getenv("SOLANA_PRIVATE_KEY")
    if not private_key:
        print("❌ Error: MAWD_PRIVATE_KEY or SOLANA_PRIVATE_KEY not set in .env.local")
        return

    print("\n🚀 Pump.fun Token Launch")
    print("=" * 50)
    print(f"  Name: {args.name}")
    print(f"  Symbol: {args.symbol}")
    print(f"  Description: {args.description[:50]}{'...' if len(args.description) > 50 else ''}")
    if args.image:
        print(f"  Image: {args.image}")
    if args.image_url:
        print(f"  Image URL: {args.image_url}")
    if args.twitter:
        print(f"  Twitter: {args.twitter}")
    if args.telegram:
        print(f"  Telegram: {args.telegram}")
    if args.website:
        print(f"  Website: {args.website}")
    if args.initial_buy > 0:
        print(f"  Initial Buy: {args.initial_buy} SOL")
    print("=" * 50)

    if args.dry_run:
        print("\n🔍 DRY RUN - No transaction will be sent")
        return

    # Confirm
    response = input("\n⚠️  Ready to launch? This will cost SOL. (y/n): ")
    if response.lower() != 'y':
        print("Cancelled.")
        return

    # Initialize client
    print("\n📡 Connecting to Solana...")
    client = PumpFunClient(rpc_url=rpc_url, private_key=private_key)

    try:
        print(f"   Wallet: {client.wallet_pubkey}")

        # Check image
        image_path = None
        image_url = args.image_url
        if args.image:
            if not Path(args.image).exists():
                print(f"❌ Error: Image file not found: {args.image}")
                return
            image_path = args.image

        # Launch token
        print("\n📤 Uploading metadata to IPFS...")
        print("🔨 Building transaction...")
        print("✍️  Signing and sending...")

        result = await client.create_token(
            name=args.name,
            symbol=args.symbol,
            description=args.description,
            image_url=image_url,
            image_path=image_path,
            twitter=args.twitter,
            telegram=args.telegram,
            website=args.website,
            initial_buy_sol=args.initial_buy,
        )

        print("\n" + "=" * 50)
        print("✅ TOKEN LAUNCHED SUCCESSFULLY!")
        print("=" * 50)
        print(f"  Mint: {result.mint}")
        print(f"  Bonding Curve: {result.bonding_curve}")
        print(f"  Signature: {result.signature}")
        print(f"\n  🔗 View on pump.fun: {result.token_url}")
        print(f"  🔗 Solscan: https://solscan.io/tx/{result.signature}")
        print("=" * 50)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
