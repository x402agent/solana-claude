#!/usr/bin/env python3
"""MAWD Solana Trading Agent - CLI Entry Point"""

import asyncio
import argparse
import sys
from pathlib import Path


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="MAWD - Solana Trading Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli.py                    # Start interactive mode
  python cli.py --balance          # Check wallet balance
  python cli.py --portfolio        # Show portfolio
  python cli.py --trending         # Show trending tokens
  python cli.py --perps health     # Run Solana CLAWD Phoenix perps agent
  python cli.py -q "What's the price of BONK?"  # Single query
  
Environment Variables (from .env.local):
  HELIUS_API_KEY, HELIUS_RPC_URL, HELIUS_WSS_URL
  BIRDEYE_API_KEY
  BAGS_API_KEY, BAGS_CONFIG_KEY
  MAWD_WALLET, MAWD_PRIVATE_KEY
  OPENROUTER_API_KEY
        """
    )
    
    parser.add_argument(
        "-q", "--query",
        type=str,
        help="Run a single query and exit"
    )
    
    parser.add_argument(
        "--balance",
        action="store_true",
        help="Check wallet balance"
    )
    
    parser.add_argument(
        "--portfolio",
        action="store_true",
        help="Show complete portfolio with USD values"
    )
    
    parser.add_argument(
        "--trending",
        action="store_true",
        help="Show trending tokens"
    )

    parser.add_argument(
        "--perps",
        nargs=argparse.REMAINDER,
        help="Delegate to the official Solana CLAWD perps agent. Example: --perps market SOL"
    )
    
    parser.add_argument(
        "--env",
        type=str,
        default=None,
        help="Path to .env file (default: .env.local)"
    )
    
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Override LLM model (e.g., anthropic/claude-sonnet-4)"
    )
    
    parser.add_argument(
        "--max-steps",
        type=int,
        default=50,
        help="Max agent steps per query (default: 50)"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version="MAWD Solana Agent v0.1.0"
    )
    
    args = parser.parse_args()
    
    # Run the async main
    asyncio.run(async_main(args))


async def async_main(args):
    """Async main function."""

    if args.perps is not None:
        try:
            from perps_agent import main as perps_main
        except ImportError as e:
            print(f"❌ Perps agent import error: {e}")
            sys.exit(1)
        code = perps_main(args.perps or ["health"])
        raise SystemExit(code)
    
    # Import here to avoid circular imports and catch import errors early
    try:
        from mini_agent import SolanaAgent, load_config
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're running from the solana-agent directory")
        print("and have installed dependencies: pip install -r requirements.txt")
        sys.exit(1)
    
    # Find env file
    env_path = args.env
    if env_path is None:
        for path in [".env.local", "../.env.local", ".env", "../.env"]:
            if Path(path).exists():
                env_path = path
                break
    
    # Load configuration
    try:
        config = load_config(env_path)
    except ValueError as e:
        print(f"❌ Configuration Error: {e}")
        print("\nPlease ensure your .env.local file contains all required variables:")
        print("  HELIUS_API_KEY, HELIUS_RPC_URL")
        print("  BIRDEYE_API_KEY")
        print("  BAGS_API_KEY, BAGS_CONFIG_KEY")
        print("  MAWD_WALLET, MAWD_PRIVATE_KEY")
        print("  OPENROUTER_API_KEY")
        sys.exit(1)
    
    # Override settings from CLI args
    if args.model:
        config.llm.model = args.model
    if args.max_steps:
        config.agent.max_steps = args.max_steps
    
    # Create agent
    agent = SolanaAgent(config)
    
    try:
        await agent.initialize()
        
        # Handle special commands
        if args.balance:
            await agent.process_message("Check my wallet balance")
        elif args.portfolio:
            await agent.process_message("Show my complete portfolio with USD values")
        elif args.trending:
            await agent.process_message("What are the top 10 trending tokens right now?")
        elif args.query:
            await agent.process_message(args.query)
        else:
            # Interactive mode
            await agent.run_interactive()
    
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
    finally:
        await agent.close()


if __name__ == "__main__":
    main()
