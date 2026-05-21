"""MAWDBot Telegram Bot - Full-featured trading bot for Telegram"""

import os
import asyncio
import logging
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
for path in [".env.local", ".env", "../.env.local", "../.env"]:
    if Path(path).exists():
        load_dotenv(path)
        break

# Telegram imports
try:
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
    from telegram.ext import (
        Application,
        CommandHandler,
        MessageHandler,
        CallbackQueryHandler,
        ContextTypes,
        filters,
    )
except ImportError:
    print("Please install python-telegram-bot: pip install python-telegram-bot")
    exit(1)

from config import load_config, SolanaAgentConfig
from tools.solana_tools import (
    set_clients, create_all_tools, ToolResult,
    GetWalletBalanceTool, GetTokenPriceTool, GetPortfolioTool,
    GetTrendingTokensTool, SearchTokenTool, BuyTokenTool, SellTokenTool,
    GetSwapQuoteTool, AnalyzeTokenSecurityTool, AnalyzeSolanaAddressTool,
    GetCryptoPriceTool, GetCoinMarketDataTool, GetTrendingCryptosTool,
    SearchCryptoTool, GetGlobalCryptoStatsTool,
    CDPCreateAccountTool, CDPListAccountsTool, CDPGetBalanceTool,
    AsterOpenLongTool, AsterOpenShortTool, AsterGetPositionsTool,
    AsterClosePerpPositionTool, AsterSetLeverageTool,
    HyperliquidOpenLongTool, HyperliquidOpenShortTool,
    HyperliquidGetPositionsTool, HyperliquidClosePositionTool,
    HyperliquidGetAccountTool,
)

# Logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)


class MAWDTelegramBot:
    """MAWDBot Telegram Interface"""

    def __init__(self):
        self.config: Optional[SolanaAgentConfig] = None
        self.tools = {}
        self.initialized = False
        self.authorized_users = set()  # Add user IDs to restrict access

    async def initialize(self):
        """Initialize the bot with all clients and tools."""
        logger.info("Initializing MAWDBot Telegram...")

        # Load configuration
        self.config = load_config()

        # Import and initialize clients
        from clients.jupiter_client import JupiterClient
        from clients.helius_client import HeliusClient
        from clients.birdeye_client import BirdeyeClient
        from solders.keypair import Keypair

        jupiter_client = None
        helius_client = None
        birdeye_client = None
        cdp_client = None
        coingecko_client = None
        aster_client = None
        hyperliquid_client = None

        # Initialize Jupiter client
        if self.config.jupiter_api_key and self.config.private_key:
            try:
                keypair = Keypair.from_base58_string(self.config.private_key)
                jupiter_client = JupiterClient(
                    api_key=self.config.jupiter_api_key,
                    wallet_pubkey=self.config.wallet_address,
                    keypair=keypair,
                )
                # await jupiter_client.initialize()  # JupiterClient does not have an initialize method
                logger.info("Jupiter client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize JupiterClient: {e}")
                jupiter_client = None
        elif self.config.jupiter_api_key:
            logger.warning("Jupiter API key present but private key is missing. JupiterClient will be disabled")

        # Initialize Helius client
        helius_client = HeliusClient(
            api_key=self.config.helius_api_key,
            rpc_url=self.config.helius_rpc_url,
        )
        logger.info("Helius client initialized")

        # Initialize Birdeye client
        birdeye_client = BirdeyeClient(api_key=self.config.birdeye_api_key)
        logger.info("Birdeye client initialized")

        # Initialize Bags client
        try:
            from clients.bags_client import BagsClient
            bags_client = BagsClient(
                api_key=self.config.bags_api_key,
                config_key=self.config.bags_config_key,
                rpc_url=self.config.helius_rpc_url,
                private_key=self.config.private_key,
            )
            logger.info("Bags client initialized")
        except Exception as e:
            logger.warning(f"Bags client not available: {e}")
            bags_client = None

        # Initialize CDP client (optional)
        if self.config.cdp_api_key_id and self.config.cdp_api_key_secret:
            try:
                from clients.cdp_client import create_cdp_client
                cdp_client = create_cdp_client(
                    api_key_id=self.config.cdp_api_key_id,
                    api_key_secret=self.config.cdp_api_key_secret,
                    wallet_secret=self.config.cdp_wallet_secret,
                    rpc_url=self.config.cdp_rpc_url,
                    network=self.config.cdp_network,
                )
                if cdp_client:
                    logger.info("CDP client initialized")
            except Exception as e:
                logger.warning(f"CDP client not available: {e}")
                cdp_client = None
        else:
            cdp_client = None

        # Initialize CoinGecko client (optional)
        if self.config.coingecko_api_key:
            try:
                from clients.coingecko_client import create_coingecko_client
                coingecko_client = create_coingecko_client(api_key=self.config.coingecko_api_key)
                logger.info("CoinGecko client initialized")
            except Exception as e:
                logger.warning(f"CoinGecko client not available: {e}")

        # Initialize Aster client (optional)
        if self.config.aster_user_address and self.config.aster_signer_address and self.config.aster_private_key:
            try:
                from clients.aster_client import AsterClient
                aster_client = AsterClient(
                    user_address=self.config.aster_user_address,
                    signer_address=self.config.aster_signer_address,
                    private_key=self.config.aster_private_key,
                )
                logger.info("Aster client initialized")
            except Exception as e:
                logger.warning(f"Aster client not available: {e}")

        # Initialize Hyperliquid client (optional)
        if self.config.hyperliquid_wallet and self.config.hyperliquid_private_key:
            try:
                from clients.hyperliquid_client import HyperliquidClient
                hyperliquid_client = HyperliquidClient(
                    wallet_address=self.config.hyperliquid_wallet,
                    private_key=self.config.hyperliquid_private_key,
                    use_testnet=self.config.hyperliquid_use_testnet,
                )
                logger.info("Hyperliquid client initialized")
            except Exception as e:
                logger.warning(f"Hyperliquid client not available: {e}")

        # Initialize PumpFun client (for pump.fun token launches)
        pumpfun_client = None
        if self.config.private_key and self.config.helius_rpc_url:
            try:
                from clients.pumpfun_client import PumpFunClient
                pumpfun_client = PumpFunClient(
                    rpc_url=self.config.helius_rpc_url,
                    private_key=self.config.private_key,
                )
                logger.info("PumpFun client initialized")
            except Exception as e:
                logger.warning(f"PumpFun client not available: {e}")

        # Set clients for tools
        set_clients(
            jupiter_client=jupiter_client,
            helius_client=helius_client,
            birdeye_client=birdeye_client,
            cdp_client=cdp_client,
            coingecko_client=coingecko_client,
            aster_client=aster_client,
            hyperliquid_client=hyperliquid_client,
            bags_client=bags_client,
            pumpfun_client=pumpfun_client,
        )

        # Create tool instances
        self.tools = {tool.name: tool for tool in create_all_tools()}
        logger.info(f"Loaded {len(self.tools)} tools")

        self.initialized = True
        logger.info("MAWDBot Telegram initialized successfully!")

    # ============================================================
    # COMMAND HANDLERS
    # ============================================================

    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command."""
        welcome_message = """
**Welcome to MAWDBot!**

I'm your AI-powered Solana trading assistant. I can help you:

**Trading:**
- Check wallet balances and portfolio
- Buy/sell tokens on Solana
- Trade perpetuals on Aster & Hyperliquid

**Market Data:**
- Get real-time crypto prices
- Find trending tokens
- Analyze token security

**CDP Wallets:**
- Create secure custodial accounts
- Manage CDP wallets

Type /help to see all available commands.

**Exfoliate, trade, launch, vibe!**
"""
        await update.message.reply_text(welcome_message, parse_mode="Markdown")

    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command."""
        help_text = """
**MAWDBot Commands**

**Wallet & Portfolio:**
/balance - Check SOL and token balances
/portfolio - View complete portfolio
/networth - Detailed net worth breakdown

**Trading:**
/price <token> - Get token price
/buy <amount> <token> - Buy tokens
/sell <amount> <token> - Sell tokens
/quote <amount> <from> <to> - Get swap quote

**Market Data:**
/trending - Trending Solana tokens
/search <query> - Search for tokens
/crypto <coins> - CoinGecko prices
/global - Global crypto stats
/trendingcrypto - Trending on CoinGecko

**Perpetuals (Aster/Hyperliquid):**
/long <pair> <leverage> <amount> - Open LONG
/short <pair> <leverage> <amount> - Open SHORT
/positions - View open positions
/close <pair> - Close position

**CDP Wallets:**
/cdp_create - Create CDP wallet
/cdp_list - List CDP wallets
/cdp_balance <address> - Check balance

**Analysis:**
/analyze <address> - Analyze Solana address
/security <token> - Token security check

**Other:**
/chat <message> - Chat with AI
/help - Show this help
"""
        await update.message.reply_text(help_text)

    async def balance(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /balance command."""
        await update.message.reply_text("Checking wallet balance...")

        tool = GetWalletBalanceTool()
        result = await tool.execute()

        if result.success:
            await update.message.reply_text(f"```\n{result.content}\n```", parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def portfolio(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /portfolio command."""
        await update.message.reply_text("Loading portfolio...")

        tool = GetPortfolioTool()
        result = await tool.execute()

        if result.success:
            await update.message.reply_text(f"```\n{result.content}\n```", parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def price(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /price <token> command."""
        if not context.args:
            await update.message.reply_text("Usage: /price <token>\nExample: /price BONK")
            return

        token = " ".join(context.args)
        await update.message.reply_text(f"Getting price for {token}...")

        tool = GetTokenPriceTool()
        result = await tool.execute(token_address=token)

        if result.success:
            await update.message.reply_text(result.content)
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def trending(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /trending command."""
        await update.message.reply_text("Fetching trending Solana tokens...")

        tool = GetTrendingTokensTool()
        result = await tool.execute()

        if result.success:
            # Truncate if too long for Telegram
            content = result.content[:4000] if len(result.content) > 4000 else result.content
            await update.message.reply_text(f"```\n{content}\n```", parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def search(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /search <query> command."""
        if not context.args:
            await update.message.reply_text("Usage: /search <query>\nExample: /search BONK")
            return

        query = " ".join(context.args)
        await update.message.reply_text(f"Searching for '{query}'...")

        tool = SearchTokenTool()
        result = await tool.execute(query=query)

        if result.success:
            content = result.content[:4000] if len(result.content) > 4000 else result.content
            await update.message.reply_text(f"```\n{content}\n```", parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def buy(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /buy <amount> <token> command."""
        if len(context.args) < 2:
            await update.message.reply_text("Usage: /buy <amount_sol> <token>\nExample: /buy 0.5 BONK")
            return

        try:
            amount = float(context.args[0])
            token = " ".join(context.args[1:])
        except ValueError:
            await update.message.reply_text("Invalid amount. Usage: /buy <amount_sol> <token>")
            return

        # Send confirmation message with inline keyboard
        keyboard = [
            [
                InlineKeyboardButton("Confirm", callback_data=f"buy_confirm_{amount}_{token}"),
                InlineKeyboardButton("Cancel", callback_data="buy_cancel"),
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_text(
            f"**Buy Confirmation**\n\n"
            f"Amount: {amount} SOL\n"
            f"Token: {token}\n\n"
            f"Are you sure you want to proceed?",
            reply_markup=reply_markup,
            parse_mode="Markdown"
        )

    async def sell(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /sell <amount> <token> command."""
        if len(context.args) < 2:
            await update.message.reply_text("Usage: /sell <amount> <token>\nExample: /sell 1000000 BONK")
            return

        try:
            amount = float(context.args[0])
            token = " ".join(context.args[1:])
        except ValueError:
            await update.message.reply_text("Invalid amount. Usage: /sell <amount> <token>")
            return

        keyboard = [
            [
                InlineKeyboardButton("Confirm", callback_data=f"sell_confirm_{amount}_{token}"),
                InlineKeyboardButton("Cancel", callback_data="sell_cancel"),
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_text(
            f"**Sell Confirmation**\n\n"
            f"Amount: {amount}\n"
            f"Token: {token}\n\n"
            f"Are you sure you want to proceed?",
            reply_markup=reply_markup,
            parse_mode="Markdown"
        )

    async def quote(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /quote <amount> <from> <to> command."""
        if len(context.args) < 3:
            await update.message.reply_text("Usage: /quote <amount> <from_token> <to_token>\nExample: /quote 1 SOL USDC")
            return

        try:
            amount = float(context.args[0])
            from_token = context.args[1]
            to_token = context.args[2]
        except ValueError:
            await update.message.reply_text("Invalid amount.")
            return

        await update.message.reply_text(f"Getting quote for {amount} {from_token} -> {to_token}...")

        tool = GetSwapQuoteTool()
        result = await tool.execute(
            input_token=from_token,
            output_token=to_token,
            amount=amount,
        )

        if result.success:
            await update.message.reply_text(f"```\n{result.content}\n```", parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def crypto(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /crypto <coins> command for CoinGecko prices."""
        if not context.args:
            await update.message.reply_text("Usage: /crypto <coins>\nExample: /crypto bitcoin,ethereum,solana")
            return

        coins = context.args[0].split(",")
        await update.message.reply_text(f"Getting prices for {', '.join(coins)}...")

        tool = GetCryptoPriceTool()
        result = await tool.execute(coin_ids=coins)

        if result.success:
            await update.message.reply_text(result.content)
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def global_stats(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /global command for global crypto stats."""
        await update.message.reply_text("Getting global crypto market stats...")

        tool = GetGlobalCryptoStatsTool()
        result = await tool.execute()

        if result.success:
            await update.message.reply_text(result.content)
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def trending_crypto(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /trendingcrypto command."""
        await update.message.reply_text("Getting trending cryptocurrencies...")

        tool = GetTrendingCryptosTool()
        result = await tool.execute()

        if result.success:
            content = result.content[:4000] if len(result.content) > 4000 else result.content
            await update.message.reply_text(content)
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def analyze(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /analyze <address> command."""
        if not context.args:
            await update.message.reply_text("Usage: /analyze <solana_address>\nExample: /analyze DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")
            return

        address = context.args[0]
        await update.message.reply_text(f"Analyzing {address}...")

        tool = AnalyzeSolanaAddressTool()
        result = await tool.execute(address=address)

        if result.success:
            content = result.content[:4000] if len(result.content) > 4000 else result.content
            await update.message.reply_text(f"```\n{content}\n```", parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def security(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /security <token> command."""
        if not context.args:
            await update.message.reply_text("Usage: /security <token_address>\nExample: /security DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")
            return

        token = context.args[0]
        await update.message.reply_text(f"Analyzing token security for {token}...")

        tool = AnalyzeTokenSecurityTool()
        result = await tool.execute(token_address=token)

        if result.success:
            content = result.content[:4000] if len(result.content) > 4000 else result.content
            await update.message.reply_text(f"```\n{content}\n```", parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def cdp_create(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /cdp_create command."""
        await update.message.reply_text("Creating new CDP Solana account...")

        tool = CDPCreateAccountTool()
        name = context.args[0] if context.args else None
        result = await tool.execute(name=name)

        if result.success:
            await update.message.reply_text(f"```\n{result.content}\n```", parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def cdp_list(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /cdp_list command."""
        await update.message.reply_text("Listing CDP accounts...")

        tool = CDPListAccountsTool()
        result = await tool.execute()

        if result.success:
            await update.message.reply_text(f"```\n{result.content}\n```", parse_mode="Markdown")
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def cdp_balance(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /cdp_balance <address> command."""
        if not context.args:
            await update.message.reply_text("Usage: /cdp_balance <address>")
            return

        address = context.args[0]
        await update.message.reply_text(f"Checking CDP balance for {address}...")

        tool = CDPGetBalanceTool()
        result = await tool.execute(address=address)

        if result.success:
            await update.message.reply_text(result.content)
        else:
            await update.message.reply_text(f"Error: {result.error}")

    async def positions(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /positions command."""
        await update.message.reply_text("Fetching open positions...")

        # Try Aster first, then Hyperliquid
        aster_tool = AsterGetPositionsTool()
        aster_result = await aster_tool.execute()

        hl_tool = HyperliquidGetPositionsTool()
        hl_result = await hl_tool.execute()

        content = ""
        if aster_result.success:
            content += f"**Aster DEX:**\n```\n{aster_result.content}\n```\n\n"
        if hl_result.success:
            content += f"**Hyperliquid:**\n```\n{hl_result.content}\n```"

        if content:
            await update.message.reply_text(content, parse_mode="Markdown")
        else:
            await update.message.reply_text("No positions found or error fetching positions.")

    async def long_position(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /long <pair> <leverage> <amount> command."""
        if len(context.args) < 3:
            await update.message.reply_text("Usage: /long <pair> <leverage> <amount>\nExample: /long BTCUSDT 10 100")
            return

        pair = context.args[0].upper()
        try:
            leverage = int(context.args[1])
            amount = float(context.args[2])
        except ValueError:
            await update.message.reply_text("Invalid leverage or amount.")
            return

        keyboard = [
            [
                InlineKeyboardButton("Confirm LONG", callback_data=f"long_confirm_{pair}_{leverage}_{amount}"),
                InlineKeyboardButton("Cancel", callback_data="trade_cancel"),
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_text(
            f"**LONG Position Confirmation**\n\n"
            f"Pair: {pair}\n"
            f"Leverage: {leverage}x\n"
            f"Amount: {amount} USDT\n\n"
            f"**Warning:** Leveraged trading is high risk!\n"
            f"Liquidation can result in total loss of margin.\n\n"
            f"Proceed?",
            reply_markup=reply_markup,
            parse_mode="Markdown"
        )

    async def short_position(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /short <pair> <leverage> <amount> command."""
        if len(context.args) < 3:
            await update.message.reply_text("Usage: /short <pair> <leverage> <amount>\nExample: /short ETHUSDT 5 50")
            return

        pair = context.args[0].upper()
        try:
            leverage = int(context.args[1])
            amount = float(context.args[2])
        except ValueError:
            await update.message.reply_text("Invalid leverage or amount.")
            return

        keyboard = [
            [
                InlineKeyboardButton("Confirm SHORT", callback_data=f"short_confirm_{pair}_{leverage}_{amount}"),
                InlineKeyboardButton("Cancel", callback_data="trade_cancel"),
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_text(
            f"**SHORT Position Confirmation**\n\n"
            f"Pair: {pair}\n"
            f"Leverage: {leverage}x\n"
            f"Amount: {amount} USDT\n\n"
            f"**Warning:** Leveraged trading is high risk!\n"
            f"Liquidation can result in total loss of margin.\n\n"
            f"Proceed?",
            reply_markup=reply_markup,
            parse_mode="Markdown"
        )

    async def close_position(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /close <pair> command."""
        if not context.args:
            await update.message.reply_text("Usage: /close <pair>\nExample: /close BTCUSDT")
            return

        pair = context.args[0].upper()

        keyboard = [
            [
                InlineKeyboardButton("Confirm Close", callback_data=f"close_confirm_{pair}"),
                InlineKeyboardButton("Cancel", callback_data="trade_cancel"),
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_text(
            f"**Close Position Confirmation**\n\n"
            f"Pair: {pair}\n\n"
            f"This will close your entire position.\n"
            f"Proceed?",
            reply_markup=reply_markup,
            parse_mode="Markdown"
        )

    async def button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle inline button callbacks."""
        query = update.callback_query
        await query.answer()

        data = query.data

        if data == "buy_cancel" or data == "sell_cancel" or data == "trade_cancel":
            await query.edit_message_text("Trade cancelled.")
            return

        if data.startswith("buy_confirm_"):
            parts = data.split("_")
            amount = float(parts[2])
            token = "_".join(parts[3:])

            await query.edit_message_text(f"Executing buy: {amount} SOL -> {token}...")

            tool = BuyTokenTool()
            result = await tool.execute(
                token_address=token,
                amount_sol=amount,
                slippage_bps=300,
            )

            if result.success:
                await query.edit_message_text(f"Buy executed!\n```\n{result.content}\n```", parse_mode="Markdown")
            else:
                await query.edit_message_text(f"Buy failed: {result.error}")

        elif data.startswith("sell_confirm_"):
            parts = data.split("_")
            amount = float(parts[2])
            token = "_".join(parts[3:])

            await query.edit_message_text(f"Executing sell: {amount} {token}...")

            tool = SellTokenTool()
            result = await tool.execute(
                token_address=token,
                amount=amount,
                slippage_bps=300,
            )

            if result.success:
                await query.edit_message_text(f"Sell executed!\n```\n{result.content}\n```", parse_mode="Markdown")
            else:
                await query.edit_message_text(f"Sell failed: {result.error}")

        elif data.startswith("long_confirm_"):
            parts = data.split("_")
            pair = parts[2]
            leverage = int(parts[3])
            amount = float(parts[4])

            await query.edit_message_text(f"Opening LONG position on {pair}...")

            tool = AsterOpenLongTool()
            result = await tool.execute(
                symbol=pair,
                leverage=leverage,
                margin_usdt=amount,
            )

            if result.success:
                await query.edit_message_text(f"LONG opened!\n```\n{result.content}\n```", parse_mode="Markdown")
            else:
                await query.edit_message_text(f"Failed: {result.error}")

        elif data.startswith("short_confirm_"):
            parts = data.split("_")
            pair = parts[2]
            leverage = int(parts[3])
            amount = float(parts[4])

            await query.edit_message_text(f"Opening SHORT position on {pair}...")

            tool = AsterOpenShortTool()
            result = await tool.execute(
                symbol=pair,
                leverage=leverage,
                margin_usdt=amount,
            )

            if result.success:
                await query.edit_message_text(f"SHORT opened!\n```\n{result.content}\n```", parse_mode="Markdown")
            else:
                await query.edit_message_text(f"Failed: {result.error}")

        elif data.startswith("close_confirm_"):
            pair = data.split("_")[2]

            await query.edit_message_text(f"Closing position on {pair}...")

            tool = AsterClosePerpPositionTool()
            result = await tool.execute(symbol=pair)

            if result.success:
                await query.edit_message_text(f"Position closed!\n```\n{result.content}\n```", parse_mode="Markdown")
            else:
                await query.edit_message_text(f"Failed: {result.error}")

    async def chat(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /chat <message> for AI conversation using Gemini."""
        if not context.args:
            await update.message.reply_text("Usage: /chat <your message>\nExample: /chat What's the best memecoin to buy?")
            return

        message = " ".join(context.args)
        await update.message.reply_text(f"Gemini is thinking...")

        # Get API key
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            await update.message.reply_text("Error: GOOGLE_API_KEY not set.")
            return

        # Configure and generate
        import google.generativeai as genai
        import asyncio

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        try:
            # Run the synchronous generate_content in a thread
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: model.generate_content(message)
            )
            # Get the text from the response
            if response.text:
                # Truncate if too long for Telegram
                if len(response.text) > 4096:
                    response_text = response.text[:4000] + "\n\n... (truncated)"
                else:
                    response_text = response.text
                await update.message.reply_text(response_text)
            else:
                await update.message.reply_text("Gemini did not return any text.")
        except Exception as e:
            await update.message.reply_text(f"Gemini error: {str(e)}")

    async def browse(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /browse <instruction> command for browser automation."""
        if not context.args:
            await update.message.reply_text("Usage: /browse <instruction>\nExample: /browse Search for the weather in New York")
            return

        instruction = " ".join(context.args)
        await update.message.reply_text(f"Starting browser automation: {instruction}")

        # Import Playwright
        from playwright.sync_api import sync_playwright
        import google.generativeai as genai
        from google.generativeai.types import Part
        import base64
        import io

        # Get Gemini API key
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            await update.message.reply_text("Error: GOOGLE_API_KEY not set.")
            return

        genai.configure(api_key=api_key)

        # Configure the model
        model = genai.GenerativeModel('gemini-2.5-computer-use-preview-10-2025')

        # Start browser
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("https://www.google.com")
            page.set_viewport_size({"width": 1440, "height": 900})

            # Main agent loop
            for i in range(5):  # Limit to 5 steps to avoid infinite loops
                # Take screenshot
                screenshot = page.screenshot(type="png")
                screenshot_base64 = base64.b64encode(screenshot).decode('utf-8')

                # Create content with instruction and image
                content = [
                    Part.from_text(instruction),
                    Part.from_data(
                        data=base64.b64decode(screenshot_base64),
                        mime_type="image/png"
                    )
                ]

                # Generate content
                try:
                    response = model.generate_content(content)
                    text_response = response.text
                except Exception as e:
                    await update.message.reply_text(f"Gemini error: {str(e)}")
                    break

                # Check if there are function calls
                function_calls = []
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'function_call'):
                        function_calls.append(part.function_call)

                if not function_calls:
                    # If no function calls, assume the task is complete
                    await update.message.reply_text(f"Task completed: {text_response}")
                    break

                # Execute function calls
                for function_call in function_calls:
                    # For simplicity, we only handle click_at and type_text_at
                    if function_call.name == "click_at":
                        x = function_call.args['x']
                        y = function_call.args['y']
                        # Convert normalized coordinates to pixels
                        viewport = page.viewport_size
                        actual_x = int(x / 1000 * viewport['width'])
                        actual_y = int(y / 1000 * viewport['height'])
                        page.mouse.click(actual_x, actual_y)
                    elif function_call.name == "type_text_at":
                        x = function_call.args['x']
                        y = function_call.args['y']
                        text = function_call.args['text']
                        press_enter = function_call.args.get('press_enter', False)
                        viewport = page.viewport_size
                        actual_x = int(x / 1000 * viewport['width'])
                        actual_y = int(y / 1000 * viewport['height'])
                        page.mouse.click(actual_x, actual_y)
                        page.keyboard.type(text)
                        if press_enter:
                            page.keyboard.press("Enter")
                    else:
                        logger.warning(f"Unsupported function call: {function_call.name}")

                # Wait for page to settle
                page.wait_for_timeout(1000)

            # Close browser
            browser.close()

        await update.message.reply_text("Browser automation completed.")
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle regular text messages."""
        text = update.message.text.lower()

        # Quick responses for common queries
        if "balance" in text:
            await self.balance(update, context)
        elif "portfolio" in text:
            await self.portfolio(update, context)
        elif "trending" in text:
            await self.trending(update, context)
        elif "help" in text:
            await self.help_command(update, context)
        else:
            await update.message.reply_text(
                "I didn't understand that. Use /help to see available commands, "
                "or use /chat <message> to ask me anything!"
            )


def main():
    """Main entry point."""
    # Get bot token from environment
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")

    if not bot_token:
        print("Error: TELEGRAM_BOT_TOKEN not found in environment variables.")
        print("Add TELEGRAM_BOT_TOKEN=your_token to your .env.local file")
        print("\nTo get a bot token:")
        print("1. Message @BotFather on Telegram")
        print("2. Send /newbot and follow instructions")
        print("3. Copy the token to your .env.local file")
        return

    # Create bot instance
    bot = MAWDTelegramBot()

    # Create application
    application = Application.builder().token(bot_token).build()

    # Initialize bot clients on startup
    async def post_init(app):
        await bot.initialize()

    application.post_init = post_init

    # Add command handlers
    application.add_handler(CommandHandler("start", bot.start))
    application.add_handler(CommandHandler("help", bot.help_command))
    application.add_handler(CommandHandler("balance", bot.balance))
    application.add_handler(CommandHandler("portfolio", bot.portfolio))
    application.add_handler(CommandHandler("price", bot.price))
    application.add_handler(CommandHandler("trending", bot.trending))
    application.add_handler(CommandHandler("search", bot.search))
    application.add_handler(CommandHandler("buy", bot.buy))
    application.add_handler(CommandHandler("sell", bot.sell))
    application.add_handler(CommandHandler("quote", bot.quote))
    application.add_handler(CommandHandler("crypto", bot.crypto))
    application.add_handler(CommandHandler("global", bot.global_stats))
    application.add_handler(CommandHandler("trendingcrypto", bot.trending_crypto))
    application.add_handler(CommandHandler("analyze", bot.analyze))
    application.add_handler(CommandHandler("security", bot.security))
    application.add_handler(CommandHandler("cdp_create", bot.cdp_create))
    application.add_handler(CommandHandler("cdp_list", bot.cdp_list))
    application.add_handler(CommandHandler("cdp_balance", bot.cdp_balance))
    application.add_handler(CommandHandler("positions", bot.positions))
    application.add_handler(CommandHandler("long", bot.long_position))
    application.add_handler(CommandHandler("short", bot.short_position))
    application.add_handler(CommandHandler("close", bot.close_position))
    application.add_handler(CommandHandler("chat", bot.chat))
    application.add_handler(CommandHandler("browse", bot.browse))

    # Add callback query handler for inline buttons
    application.add_handler(CallbackQueryHandler(bot.button_callback))

    # Add message handler for regular text
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, bot.handle_message))

    # Start polling
    print("MAWDBot Telegram is starting...")
    print("Press Ctrl+C to stop")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
