#!/usr/bin/env python3
"""Create and manage Solana accounts using CDP (Coinbase Developer Platform)"""

import sys
import argparse


def parse_args():
    """Parse command line arguments before importing CDP (which uses nest_asyncio)."""
    parser = argparse.ArgumentParser(
        description="Create and manage Solana accounts using CDP",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create a new account
  python create_solana_account.py create

  # Create a named account
  python create_solana_account.py create --name my-trading-wallet

  # List all accounts
  python create_solana_account.py list

  # Get balance
  python create_solana_account.py balance <address>

  # Request devnet faucet (devnet only)
  python create_solana_account.py faucet <address>

  # Send SOL
  python create_solana_account.py send <from> <to> --lamports 1000

Environment Variables (in .env.local):
  CDP_API_KEY_ID      - Your CDP API Key ID
  CDP_API_KEY_SECRET  - Your CDP API Key Secret (Ed25519 base64)
  CDP_WALLET_SECRET   - Optional wallet secret for signing
  CDP_NETWORK         - "solana-mainnet" (default) or "solana-devnet"
  CDP_RPC_URL         - Custom RPC URL (optional)

Get credentials at: https://portal.cdp.coinbase.com/projects/api-keys
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Create command
    create_parser = subparsers.add_parser("create", help="Create a new Solana account")
    create_parser.add_argument("--name", "-n", help="Optional name for the account (2-36 chars)")

    # List command
    subparsers.add_parser("list", help="List all CDP Solana accounts")

    # Balance command
    balance_parser = subparsers.add_parser("balance", help="Get SOL balance for an address")
    balance_parser.add_argument("address", help="Solana address")

    # Faucet command
    faucet_parser = subparsers.add_parser("faucet", help="Request devnet faucet funds")
    faucet_parser.add_argument("address", help="Solana address to fund")

    # Send command
    send_parser = subparsers.add_parser("send", help="Send SOL to another address")
    send_parser.add_argument("from_address", help="Sender address (CDP-managed)")
    send_parser.add_argument("to_address", help="Recipient address")
    send_parser.add_argument("--lamports", "-l", type=int, default=1000, help="Amount in lamports (default: 1000)")

    return parser.parse_args(), parser


# Parse args BEFORE importing CDP (which imports nest_asyncio)
args, parser = parse_args()

if not args.command:
    parser.print_help()
    sys.exit(0)

# Now import the rest (CDP imports nest_asyncio)
import asyncio
from config import load_config
from clients.cdp_client import CDPSolanaClient, CDP_AVAILABLE


async def create_account(client: CDPSolanaClient, name: str = None):
    """Create a new Solana account."""
    print("\n📦 Creating new Solana account...")

    account = await client.create_account(name=name)

    print(f"\n✅ Account created successfully!")
    print(f"   Address: {account['address']}")
    if account.get('name'):
        print(f"   Name: {account['name']}")

    return account


async def list_accounts(client: CDPSolanaClient):
    """List all CDP Solana accounts."""
    print("\n📋 Listing all CDP Solana accounts...")

    accounts = await client.list_accounts()

    if not accounts:
        print("   No accounts found.")
        return

    print(f"\n   Found {len(accounts)} account(s):")
    for acc in accounts:
        name = acc.get('name') or '(unnamed)'
        print(f"   • {acc['address']} - {name}")

    return accounts


async def get_balance(client: CDPSolanaClient, address: str):
    """Get balance for an address."""
    print(f"\n💰 Getting balance for {address}...")

    balance = await client.get_balance(address)

    print(f"   Balance: {balance['balance_sol']:.9f} SOL ({balance['balance_lamports']} lamports)")

    return balance


async def request_faucet(client: CDPSolanaClient, address: str):
    """Request devnet faucet funds."""
    print(f"\n🚰 Requesting faucet funds for {address}...")

    result = await client.request_faucet(address)

    print(f"   ✅ Faucet request successful!")
    print(f"   Transaction: {result['explorer_url']}")

    # Wait for balance
    print("   Waiting for funds to arrive...")
    balance = await client.wait_for_balance(address)
    print(f"   Balance: {balance['balance_sol']:.9f} SOL")

    return result


async def send_sol(client: CDPSolanaClient, from_address: str, to_address: str, lamports: int):
    """Send SOL from one address to another."""
    print(f"\n📤 Sending {lamports} lamports ({lamports/1e9:.9f} SOL)...")
    print(f"   From: {from_address}")
    print(f"   To: {to_address}")

    result = await client.send_sol(from_address, to_address, lamports)

    print(f"\n   ✅ Transaction successful!")
    print(f"   Signature: {result['signature']}")
    print(f"   Explorer: {result['explorer_url']}")

    return result


async def main():
    # Check CDP availability
    if not CDP_AVAILABLE:
        print("❌ CDP SDK not installed. Run: pip install cdp-sdk")
        return

    # Load config
    try:
        config = load_config()
    except ValueError as e:
        print(f"❌ Config error: {e}")
        return

    # Check CDP credentials
    if not config.cdp_api_key_id or not config.cdp_api_key_secret:
        print("❌ CDP credentials not configured.")
        print("   Add to .env.local:")
        print("   CDP_API_KEY_ID=your_key_id")
        print("   CDP_API_KEY_SECRET=your_secret")
        print("\n   Get credentials at: https://portal.cdp.coinbase.com/projects/api-keys")
        return

    # Initialize client
    print(f"🔗 Connecting to {config.cdp_network}...")

    client = CDPSolanaClient(
        api_key_id=config.cdp_api_key_id,
        api_key_secret=config.cdp_api_key_secret,
        wallet_secret=config.cdp_wallet_secret,
        rpc_url=config.cdp_rpc_url,
        network=config.cdp_network,
    )

    try:
        if args.command == "create":
            account = await create_account(client, name=args.name)

            if config.cdp_network == "solana-mainnet":
                print(f"\n⚠️  This is a MAINNET account.")
                print(f"   Send SOL to {account['address']} to fund it.")
                print(f"   Faucet is NOT available on mainnet.")
            else:
                print(f"\n💡 This is a DEVNET account.")
                print(f"   Use 'python create_solana_account.py faucet {account['address']}' to get test SOL.")

        elif args.command == "list":
            await list_accounts(client)

        elif args.command == "balance":
            await get_balance(client, args.address)

        elif args.command == "faucet":
            await request_faucet(client, args.address)

        elif args.command == "send":
            await send_sol(client, args.from_address, args.to_address, args.lamports)

    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
