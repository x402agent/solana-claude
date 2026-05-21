"""Solana Trading Tools for Mini-Agent"""

import json
import asyncio
from typing import Any, Optional
from pydantic import BaseModel


class ToolResult(BaseModel):
    """Tool execution result."""
    success: bool
    content: str = ""
    error: Optional[str] = None


class Tool:
    """Base class for all tools."""

    @property
    def name(self) -> str:
        raise NotImplementedError

    @property
    def description(self) -> str:
        raise NotImplementedError

    @property
    def parameters(self) -> dict[str, Any]:
        raise NotImplementedError

    async def execute(self, *args, **kwargs) -> ToolResult:
        raise NotImplementedError

    def to_schema(self) -> dict[str, Any]:
        """Convert tool to Anthropic tool schema."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.parameters,
        }

    def to_openai_schema(self) -> dict[str, Any]:
        """Convert tool to OpenAI tool schema."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


# Global client instances (initialized by the agent)
_bags_client = None
_jupiter_client = None
_helius_client = None
_birdeye_client = None
_twitter_client = None
_minimax_client = None
_search_client = None
_solana_analyzer = None
_aster_client = None
_hyperliquid_client = None
_cdp_client = None
_coingecko_client = None
_pumpfun_client = None


def set_clients(bags_client=None, jupiter_client=None, helius_client=None, birdeye_client=None, twitter_client=None, minimax_client=None, search_client=None, solana_analyzer=None, aster_client=None, hyperliquid_client=None, cdp_client=None, coingecko_client=None, pumpfun_client=None):
    """Set the global client instances for tools to use."""
    global _bags_client, _jupiter_client, _helius_client, _birdeye_client, _twitter_client, _minimax_client, _search_client, _solana_analyzer, _aster_client, _hyperliquid_client, _cdp_client, _coingecko_client, _pumpfun_client
    _bags_client = bags_client
    _jupiter_client = jupiter_client
    _helius_client = helius_client
    _birdeye_client = birdeye_client
    _twitter_client = twitter_client
    _minimax_client = minimax_client
    _search_client = search_client
    _solana_analyzer = solana_analyzer
    _aster_client = aster_client
    _hyperliquid_client = hyperliquid_client
    _cdp_client = cdp_client
    _coingecko_client = coingecko_client
    _pumpfun_client = pumpfun_client


def get_bags_client():
    if _bags_client is None:
        raise RuntimeError("BagsClient not initialized. Call set_clients() first.")
    return _bags_client


def get_jupiter_client():
    if _jupiter_client is None:
        raise RuntimeError("JupiterClient not initialized. Call set_clients() first.")
    return _jupiter_client


def get_helius_client():
    if _helius_client is None:
        raise RuntimeError("HeliusClient not initialized. Call set_clients() first.")
    return _helius_client


def get_birdeye_client():
    if _birdeye_client is None:
        raise RuntimeError("BirdeyeClient not initialized. Call set_clients() first.")
    return _birdeye_client


def get_twitter_client():
    if _twitter_client is None:
        raise RuntimeError("TwitterClient not initialized. Call set_clients() first.")
    return _twitter_client


def get_minimax_client():
    if _minimax_client is None:
        raise RuntimeError("MinimaxClient not initialized. Call set_clients() first.")
    return _minimax_client


def get_search_client():
    if _search_client is None:
        raise RuntimeError("SearchAPIClient not initialized. Call set_clients() first.")
    return _search_client


def get_solana_analyzer():
    if _solana_analyzer is None:
        raise RuntimeError("SolanaAnalyzer not initialized. Call set_clients() first.")
    return _solana_analyzer


def get_aster_client():
    if _aster_client is None:
        raise RuntimeError("AsterClient not initialized. Call set_clients() first.")
    return _aster_client


def get_hyperliquid_client():
    if _hyperliquid_client is None:
        raise RuntimeError("HyperliquidClient not initialized. Call set_clients() first.")
    return _hyperliquid_client


def get_cdp_client():
    """Get CDP client (optional, may return None if not configured)."""
    return _cdp_client


def get_coingecko_client():
    """Get CoinGecko client (optional, may return None if not configured)."""
    return _coingecko_client


def get_pumpfun_client():
    """Get PumpFun client (optional, may return None if not configured)."""
    return _pumpfun_client


class GetWalletBalanceTool(Tool):
    """Tool to get wallet SOL and token balances."""
    
    @property
    def name(self) -> str:
        return "get_wallet_balance"
    
    @property
    def description(self) -> str:
        return """Get the SOL balance and token holdings for a Solana wallet.
        If no wallet address is provided, uses the agent's configured wallet.
        Returns SOL balance and list of token balances with USD values."""
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "The Solana wallet address to check. Optional - uses agent wallet if not provided.",
                }
            },
            "required": [],
        }
    
    async def execute(self, wallet_address: str = None) -> ToolResult:
        try:
            helius = get_helius_client()
            bags = get_bags_client()
            
            # Use provided address or agent's wallet
            address = wallet_address or bags.wallet_pubkey
            if not address:
                return ToolResult(success=False, error="No wallet address provided and no agent wallet configured")
            
            # Get SOL balance
            sol_balance = await helius.get_sol_balance(address)
            
            # Get token balances
            token_balances = await helius.get_token_accounts_by_owner(address)
            
            result = {
                "wallet": address,
                "sol_balance": sol_balance,
                "tokens": [
                    {
                        "mint": tb.mint,
                        "amount": tb.ui_amount,
                        "decimals": tb.decimals,
                    }
                    for tb in token_balances
                    if tb.ui_amount > 0
                ]
            }
            
            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetTokenPriceTool(Tool):
    """Tool to get current token price."""
    
    @property
    def name(self) -> str:
        return "get_token_price"
    
    @property
    def description(self) -> str:
        return """Get the current price and 24h change for a Solana token.
        Requires the token mint address.
        Returns price in USD, 24h price change percentage, volume, and liquidity."""
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_mint": {
                    "type": "string",
                    "description": "The token mint address to get price for.",
                }
            },
            "required": ["token_mint"],
        }
    
    async def execute(self, token_mint: str) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            
            price_data = await birdeye.get_token_price(token_mint)
            
            result = {
                "mint": token_mint,
                "price_usd": price_data.get("value", 0),
                "price_change_24h": price_data.get("priceChange24h", 0),
            }
            
            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetTokenInfoTool(Tool):
    """Tool to get comprehensive token information."""
    
    @property
    def name(self) -> str:
        return "get_token_info"
    
    @property
    def description(self) -> str:
        return """Get comprehensive information about a Solana token including:
        - Name, symbol, decimals
        - Current price and price changes
        - Market cap, volume, liquidity
        - Holder count
        - Security info
        Requires the token mint address."""
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_mint": {
                    "type": "string",
                    "description": "The token mint address to get info for.",
                }
            },
            "required": ["token_mint"],
        }
    
    async def execute(self, token_mint: str) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            
            overview = await birdeye.get_token_overview(token_mint)
            
            result = {
                "mint": overview.mint,
                "name": overview.name,
                "symbol": overview.symbol,
                "decimals": overview.decimals,
                "price_usd": overview.price,
                "price_change_1h": overview.price_change_1h,
                "price_change_24h": overview.price_change_24h,
                "volume_24h": overview.volume_24h,
                "liquidity": overview.liquidity,
                "market_cap": overview.market_cap,
                "supply": overview.supply,
                "holder_count": overview.holder_count,
            }
            
            # Try to get security info
            try:
                security = await birdeye.get_token_security(token_mint)
                result["security"] = security
            except:
                pass
            
            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetSwapQuoteTool(Tool):
    """Tool to get a swap quote without executing."""
    
    @property
    def name(self) -> str:
        return "get_swap_quote"
    
    @property
    def description(self) -> str:
        return """Get a quote for swapping tokens without executing the trade.
        Use this to check expected output amounts and price impact before trading.
        Returns the quote with expected output, minimum output, price impact, and route."""
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "input_mint": {
                    "type": "string",
                    "description": "The input token mint address. Use 'So11111111111111111111111111111111111111112' for SOL.",
                },
                "output_mint": {
                    "type": "string",
                    "description": "The output token mint address. Use 'So11111111111111111111111111111111111111112' for SOL.",
                },
                "amount": {
                    "type": "number",
                    "description": "Amount to swap in the smallest unit (lamports for SOL, or raw token amount).",
                },
                "slippage_bps": {
                    "type": "integer",
                    "description": "Slippage tolerance in basis points (100 = 1%). Default is 300 (3%).",
                    "default": 300,
                },
            },
            "required": ["input_mint", "output_mint", "amount"],
        }
    
    async def execute(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 300,
    ) -> ToolResult:
        try:
            bags = get_bags_client()
            
            quote = await bags.get_quote(
                input_mint=input_mint,
                output_mint=output_mint,
                amount=int(amount),
                slippage_bps=slippage_bps,
            )
            
            result = {
                "input_mint": quote.input_mint,
                "output_mint": quote.output_mint,
                "input_amount": quote.in_amount,
                "output_amount": quote.out_amount,
                "min_output_amount": quote.min_out_amount,
                "price_impact_pct": quote.price_impact_pct,
                "slippage_bps": quote.slippage_bps,
                "route_plan": [
                    {"venue": leg.get("venue"), "input_mint": leg.get("inputMint"), "output_mint": leg.get("outputMint")}
                    for leg in quote.route_plan
                ],
            }
            
            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class BuyTokenTool(Tool):
    """Tool to buy a token with SOL."""
    
    @property
    def name(self) -> str:
        return "buy_token"
    
    @property
    def description(self) -> str:
        return """Buy a Solana token using SOL from the agent's wallet.
        WARNING: This executes a real trade and spends real SOL.
        Returns the transaction signature, amount spent, and tokens received."""
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_mint": {
                    "type": "string",
                    "description": "The mint address of the token to buy.",
                },
                "sol_amount": {
                    "type": "number",
                    "description": "Amount of SOL to spend on the purchase.",
                },
                "slippage_bps": {
                    "type": "integer",
                    "description": "Slippage tolerance in basis points (100 = 1%). Default is 300 (3%).",
                    "default": 300,
                },
            },
            "required": ["token_mint", "sol_amount"],
        }
    
    async def execute(
        self,
        token_mint: str,
        sol_amount: float,
        slippage_bps: int = 300,
    ) -> ToolResult:
        try:
            # Prefer Jupiter, fallback to Bags
            if _jupiter_client is not None and _jupiter_client.keypair is not None:
                signature = await _jupiter_client.buy_token(
                    token_mint=token_mint,
                    sol_amount=sol_amount,
                    slippage_bps=slippage_bps,
                )

                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "transaction_signature": signature,
                        "sol_spent": sol_amount,
                        "trading_api": "jupiter_ultra",
                    }, indent=2)
                )
            elif _bags_client is not None:
                # Fallback to Bags (legacy)
                if _bags_client.keypair is None:
                    return ToolResult(
                        success=False,
                        error="No wallet configured for trading. Private key required."
                    )

                result = await _bags_client.buy_token(
                    token_mint=token_mint,
                    sol_amount=sol_amount,
                    slippage_bps=slippage_bps,
                )

                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "transaction_signature": result["signature"],
                        "sol_spent": result["quote"]["in_amount"],
                        "tokens_received": result["quote"]["out_amount"],
                        "min_tokens_expected": result["quote"]["min_out_amount"],
                        "price_impact": result["quote"]["price_impact_pct"],
                        "trading_api": "bags",
                    }, indent=2)
                )
            else:
                return ToolResult(
                    success=False,
                    error="No trading API configured. Please configure Jupiter or Bags API with a valid private key."
                )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class SellTokenTool(Tool):
    """Tool to sell a token for SOL."""
    
    @property
    def name(self) -> str:
        return "sell_token"
    
    @property
    def description(self) -> str:
        return """Sell a Solana token for SOL.
        WARNING: This executes a real trade.
        Returns the transaction signature, tokens sold, and SOL received."""
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_mint": {
                    "type": "string",
                    "description": "The mint address of the token to sell.",
                },
                "token_amount": {
                    "type": "integer",
                    "description": "Amount of tokens to sell (in smallest unit/raw amount).",
                },
                "slippage_bps": {
                    "type": "integer",
                    "description": "Slippage tolerance in basis points (100 = 1%). Default is 300 (3%).",
                    "default": 300,
                },
            },
            "required": ["token_mint", "token_amount"],
        }
    
    async def execute(
        self,
        token_mint: str,
        token_amount: int,
        slippage_bps: int = 300,
    ) -> ToolResult:
        try:
            # Prefer Jupiter, fallback to Bags
            if _jupiter_client is not None and _jupiter_client.keypair is not None:
                signature = await _jupiter_client.sell_token(
                    token_mint=token_mint,
                    token_amount=int(token_amount),
                    slippage_bps=slippage_bps,
                )

                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "transaction_signature": signature,
                        "tokens_sold": token_amount,
                        "trading_api": "jupiter_ultra",
                    }, indent=2)
                )
            elif _bags_client is not None:
                # Fallback to Bags (legacy)
                if _bags_client.keypair is None:
                    return ToolResult(
                        success=False,
                        error="No wallet configured for trading. Private key required."
                    )

                result = await _bags_client.sell_token(
                    token_mint=token_mint,
                    token_amount=int(token_amount),
                    slippage_bps=slippage_bps,
                )

                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "transaction_signature": result["signature"],
                        "tokens_sold": result["quote"]["in_amount"],
                        "sol_received": result["quote"]["out_amount"],
                        "min_sol_expected": result["quote"]["min_out_amount"],
                        "price_impact": result["quote"]["price_impact_pct"],
                        "trading_api": "bags",
                    }, indent=2)
                )
            else:
                return ToolResult(
                    success=False,
                    error="No trading API configured. Please configure Jupiter or Bags API with a valid private key."
                )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetPortfolioTool(Tool):
    """Tool to get wallet portfolio with USD values."""
    
    @property
    def name(self) -> str:
        return "get_portfolio"
    
    @property
    def description(self) -> str:
        return """Get the complete portfolio for a wallet including:
        - All token holdings with current USD values
        - Total portfolio value
        If no wallet is provided, uses the agent's wallet."""
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "The wallet address. Optional - uses agent wallet if not provided.",
                }
            },
            "required": [],
        }
    
    async def execute(self, wallet_address: str = None) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            bags = get_bags_client()
            
            address = wallet_address or bags.wallet_pubkey
            if not address:
                return ToolResult(success=False, error="No wallet address provided")
            
            portfolio = await birdeye.get_wallet_portfolio(address)
            
            return ToolResult(
                success=True,
                content=json.dumps({
                    "wallet": address,
                    "portfolio": portfolio,
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetTrendingTokensTool(Tool):
    """Tool to get trending tokens."""
    
    @property
    def name(self) -> str:
        return "get_trending_tokens"
    
    @property
    def description(self) -> str:
        return """Get a list of trending Solana tokens sorted by various metrics.
        Returns token names, symbols, prices, volumes, and price changes."""
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "sort_by": {
                    "type": "string",
                    "description": "Sort by: 'rank', 'volume24h', 'liquidity', 'price'. Default is 'volume24h'.",
                    "default": "volume24h",
                },
                "limit": {
                    "type": "integer",
                    "description": "Number of tokens to return. Default is 20.",
                    "default": 20,
                },
            },
            "required": [],
        }
    
    async def execute(
        self,
        sort_by: str = "volume24h",
        limit: int = 20,
    ) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            
            tokens = await birdeye.get_trending_tokens(
                sort_by=sort_by,
                sort_type="desc",
                limit=limit,
            )
            
            return ToolResult(
                success=True,
                content=json.dumps({
                    "trending_tokens": tokens,
                    "sort_by": sort_by,
                    "count": len(tokens) if isinstance(tokens, list) else 0,
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class SearchTokenTool(Tool):
    """Tool to search for tokens by name or symbol."""
    
    @property
    def name(self) -> str:
        return "search_token"
    
    @property
    def description(self) -> str:
        return """Search for Solana tokens by name or symbol.
        Returns matching tokens with their mint addresses, names, symbols, and basic info."""
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (token name or symbol).",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results to return. Default is 10.",
                    "default": 10,
                },
            },
            "required": ["query"],
        }
    
    async def execute(self, query: str, limit: int = 10) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            
            results = await birdeye.search_token(query, limit=limit)
            
            return ToolResult(
                success=True,
                content=json.dumps({
                    "query": query,
                    "results": results,
                    "count": len(results) if isinstance(results, list) else 0,
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetWalletNetWorthTool(Tool):
    """Tool to get current net worth and detailed portfolio for a wallet."""

    @property
    def name(self) -> str:
        return "get_wallet_net_worth"

    @property
    def description(self) -> str:
        return """Get the current net worth and detailed portfolio breakdown for a wallet.
        Returns total USD value, list of all assets with prices, balances, and individual values.
        Perfect for checking overall portfolio value and seeing which assets you hold."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "The wallet address to check. Optional - uses agent wallet if not provided.",
                },
                "min_value": {
                    "type": "number",
                    "description": "Optional: Only show assets worth at least this much USD",
                },
            },
            "required": [],
        }

    async def execute(self, wallet_address: str = None, min_value: float = None) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            bags = get_bags_client()

            # Use provided address or agent's wallet
            address = wallet_address or bags.wallet_pubkey
            if not address:
                return ToolResult(success=False, error="No wallet address provided")

            # Get net worth data
            data = await birdeye.get_wallet_net_worth(
                wallet=address,
                filter_value=min_value,
                limit=100
            )

            result = {
                "wallet": data.get("wallet_address", address),
                "total_net_worth_usd": float(data.get("total_value", 0)),
                "currency": data.get("currency", "usd"),
                "timestamp": data.get("current_timestamp"),
                "asset_count": len(data.get("items", [])),
                "assets": [
                    {
                        "symbol": item.get("symbol"),
                        "name": item.get("name"),
                        "address": item.get("address"),
                        "balance": float(item.get("amount", 0)),
                        "price_usd": float(item.get("price", 0)),
                        "value_usd": float(item.get("value", 0)),
                        "logo": item.get("logo_uri"),
                    }
                    for item in data.get("items", [])[:20]  # Limit to top 20 for readability
                ]
            }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetWalletNetWorthChartTool(Tool):
    """Tool to get historical net worth chart data for a wallet."""

    @property
    def name(self) -> str:
        return "get_wallet_net_worth_chart"

    @property
    def description(self) -> str:
        return """Get historical net worth data to see how wallet value has changed over time.
        Returns daily or hourly net worth history showing gains/losses.
        Useful for tracking portfolio performance over days or weeks."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "The wallet address to check. Optional - uses agent wallet if not provided.",
                },
                "days": {
                    "type": "integer",
                    "description": "Number of days of history (1-30, default: 7)",
                },
            },
            "required": [],
        }

    async def execute(self, wallet_address: str = None, days: int = 7) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            bags = get_bags_client()

            # Use provided address or agent's wallet
            address = wallet_address or bags.wallet_pubkey
            if not address:
                return ToolResult(success=False, error="No wallet address provided")

            # Limit days to 1-30
            days = max(1, min(30, days))

            # Get net worth chart
            data = await birdeye.get_wallet_net_worth_chart(
                wallet=address,
                count=days,
                direction="back",
                time_type="1d"
            )

            history = data.get("history", [])

            result = {
                "wallet": data.get("wallet_address", address),
                "currency": data.get("currency", "usd"),
                "current_timestamp": data.get("current_timestamp"),
                "past_timestamp": data.get("past_timestamp"),
                "history_points": len(history),
                "history": [
                    {
                        "timestamp": item.get("timestamp"),
                        "net_worth": float(item.get("net_worth", 0)),
                        "change": float(item.get("net_worth_change", 0)),
                        "change_percent": float(item.get("net_worth_change_percent", 0)),
                    }
                    for item in history
                ]
            }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetWalletPnLTool(Tool):
    """Tool to get Profit & Loss (PnL) data for a wallet."""

    @property
    def name(self) -> str:
        return "get_wallet_pnl"

    @property
    def description(self) -> str:
        return """Get comprehensive Profit & Loss (PnL) data for a wallet.
        Shows realized profit (from completed trades), unrealized profit (from current holdings),
        total trades, win rate, average profit per trade, and more trading statistics.
        Essential for understanding trading performance."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "The wallet address to check. Optional - uses agent wallet if not provided.",
                },
                "duration": {
                    "type": "string",
                    "description": "Time period: 'all' (default), '90d', '30d', '7d', '24h'",
                    "enum": ["all", "90d", "30d", "7d", "24h"],
                },
            },
            "required": [],
        }

    async def execute(self, wallet_address: str = None, duration: str = "all") -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            bags = get_bags_client()

            # Use provided address or agent's wallet
            address = wallet_address or bags.wallet_pubkey
            if not address:
                return ToolResult(success=False, error="No wallet address provided")

            # Get PnL summary
            data = await birdeye.get_wallet_pnl_summary(wallet=address, duration=duration)
            summary = data.get("summary", {})

            counts = summary.get("counts", {})
            cashflow = summary.get("cashflow_usd", {})
            pnl = summary.get("pnl", {})

            result = {
                "wallet": address,
                "duration": duration,
                "unique_tokens_traded": summary.get("unique_tokens", 0),
                "trading_stats": {
                    "total_trades": counts.get("total_trade", 0),
                    "buy_trades": counts.get("total_buy", 0),
                    "sell_trades": counts.get("total_sell", 0),
                    "winning_trades": counts.get("total_win", 0),
                    "losing_trades": counts.get("total_loss", 0),
                    "win_rate_percent": float(counts.get("win_rate", 0)) * 100,
                },
                "cashflow": {
                    "total_invested_usd": float(cashflow.get("total_invested", 0)),
                    "total_sold_usd": float(cashflow.get("total_sold", 0)),
                },
                "profit_loss": {
                    "realized_profit_usd": float(pnl.get("realized_profit_usd", 0)),
                    "realized_profit_percent": float(pnl.get("realized_profit_percent", 0)) * 100,
                    "unrealized_profit_usd": float(pnl.get("unrealized_usd", 0)),
                    "total_profit_usd": float(pnl.get("total_usd", 0)),
                    "avg_profit_per_trade_usd": float(pnl.get("avg_profit_per_trade_usd", 0)),
                }
            }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetTokenChartTool(Tool):
    """Tool to get OHLCV chart data for a token."""

    @property
    def name(self) -> str:
        return "get_token_chart"

    @property
    def description(self) -> str:
        return """Get OHLCV (Open, High, Low, Close, Volume) candlestick chart data for a token.
        Shows price action and trading volume over time.
        Perfect for technical analysis and price trend visualization.
        Supports multiple timeframes from 1 minute to 1 month."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_address": {
                    "type": "string",
                    "description": "The Solana token mint address",
                },
                "timeframe": {
                    "type": "string",
                    "description": "Chart timeframe: '1m', '5m', '15m', '1H', '4H', '1D', '1W'. Default: '15m'",
                    "enum": ["1m", "3m", "5m", "15m", "30m", "1H", "2H", "4H", "6H", "8H", "12H", "1D", "3D", "1W", "1M"],
                },
                "hours": {
                    "type": "integer",
                    "description": "Number of hours of data to fetch (default: 24)",
                },
            },
            "required": ["token_address"],
        }

    async def execute(
        self,
        token_address: str,
        timeframe: str = "15m",
        hours: int = 24
    ) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            import time

            # Calculate timestamps
            time_to = int(time.time())
            time_from = time_to - (hours * 3600)

            # Get OHLCV data
            data = await birdeye.get_ohlcv(
                mint=token_address,
                time_type=timeframe,
                time_from=time_from,
                time_to=time_to
            )

            if not data:
                return ToolResult(
                    success=False,
                    error="No chart data available for this token"
                )

            # Format chart data
            candles = []
            for candle in data:
                candles.append({
                    "timestamp": candle.timestamp,
                    "datetime": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(candle.timestamp)),
                    "open": candle.open,
                    "high": candle.high,
                    "low": candle.low,
                    "close": candle.close,
                    "volume": candle.volume,
                })

            # Calculate some stats
            if candles:
                first_price = candles[0]["open"]
                last_price = candles[-1]["close"]
                price_change = last_price - first_price
                price_change_pct = (price_change / first_price * 100) if first_price > 0 else 0
                high_price = max(c["high"] for c in candles)
                low_price = min(c["low"] for c in candles)
                total_volume = sum(c["volume"] for c in candles)

                result = {
                    "token_address": token_address,
                    "timeframe": timeframe,
                    "hours": hours,
                    "candle_count": len(candles),
                    "period_stats": {
                        "first_price": first_price,
                        "last_price": last_price,
                        "price_change": price_change,
                        "price_change_percent": price_change_pct,
                        "high": high_price,
                        "low": low_price,
                        "total_volume": total_volume,
                    },
                    "candles": candles[:50]  # Limit to 50 for readability
                }

                return ToolResult(
                    success=True,
                    content=json.dumps(result, indent=2)
                )
            else:
                return ToolResult(
                    success=False,
                    error="No candle data found"
                )

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get chart data: {str(e)}")


class AnalyzeTokenSecurityTool(Tool):
    """Tool to analyze token security and get comprehensive token information."""

    @property
    def name(self) -> str:
        return "analyze_token_security"

    @property
    def description(self) -> str:
        return """Analyze any Solana token contract for security risks, ownership, creation info, and comprehensive data.
        Paste any token address to get:
        - Security analysis (freeze authority, mint authority, rug pull risks)
        - Creator information and creation timestamp
        - Token metadata and social links
        - Price, volume, liquidity, market cap
        - Holder count and distribution
        Use this to evaluate tokens before trading or investing."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_address": {
                    "type": "string",
                    "description": "The Solana token mint address to analyze",
                },
            },
            "required": ["token_address"],
        }

    async def execute(self, token_address: str) -> ToolResult:
        try:
            birdeye = get_birdeye_client()

            # Gather comprehensive token data in parallel
            security_task = birdeye.get_token_security(token_address)
            creation_task = birdeye.get_token_creation_info(token_address)
            overview_task = birdeye.get_token_overview(token_address)

            security, creation, overview = await asyncio.gather(
                security_task,
                creation_task,
                overview_task,
                return_exceptions=True
            )

            # Process security data
            security_info = {}
            if not isinstance(security, Exception) and security:
                security_info = {
                    "freeze_authority": security.get("freezeAuthority"),
                    "mint_authority": security.get("mintAuthority"),
                    "is_mutable": security.get("isMutable"),
                    "top_holders": security.get("top10HolderPercent"),
                    "creator_balance_percent": security.get("creatorBalance"),
                    "risks": []
                }

                # Identify risks
                if security.get("freezeAuthority"):
                    security_info["risks"].append("Has freeze authority - tokens can be frozen")
                if security.get("mintAuthority"):
                    security_info["risks"].append("Has mint authority - supply can be inflated")
                if security.get("isMutable"):
                    security_info["risks"].append("Mutable metadata - can be changed")
                top_holder_pct = float(security.get("top10HolderPercent", 0))
                if top_holder_pct > 50:
                    security_info["risks"].append(f"High concentration: Top 10 holders own {top_holder_pct:.1f}%")

            # Process creation data
            creation_info = {}
            if not isinstance(creation, Exception) and creation:
                creation_info = {
                    "creator": creation.get("creator"),
                    "created_at": creation.get("creationTimestamp"),
                    "creation_tx": creation.get("creationTx"),
                }

            # Process overview data
            market_data = {}
            if not isinstance(overview, Exception):
                market_data = {
                    "symbol": overview.symbol,
                    "name": overview.name,
                    "price_usd": overview.price,
                    "price_change_24h_percent": overview.price_change_24h,
                    "volume_24h_usd": overview.volume_24h,
                    "liquidity_usd": overview.liquidity,
                    "market_cap_usd": overview.market_cap,
                    "holder_count": overview.holder_count,
                    "supply": overview.supply,
                }

            result = {
                "token_address": token_address,
                "security_analysis": security_info,
                "creation_info": creation_info,
                "market_data": market_data,
                "risk_level": "HIGH" if len(security_info.get("risks", [])) >= 2 else
                              "MEDIUM" if len(security_info.get("risks", [])) == 1 else
                              "LOW",
                "recommendation": "⚠️ CAUTION" if len(security_info.get("risks", [])) >= 2 else
                                  "✓ Looks safer" if len(security_info.get("risks", [])) == 0 else
                                  "Research more"
            }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to analyze token: {str(e)}")


class PostToTwitterTool(Tool):
    """Tool to post tweets to Twitter/X."""

    @property
    def name(self) -> str:
        return "post_to_twitter"

    @property
    def description(self) -> str:
        return """Post a tweet to Twitter/X. Use this to share trading updates, alerts, portfolio performance,
        token discoveries, or any other information. Maximum 280 characters.
        Examples:
        - "Just bought 100 SOL of $BONK at $0.000015! 🚀"
        - "My portfolio is up 25% today thanks to $WIF and $BONK! 📈"
        - "Found a gem: $XYZ has 10x potential, low mcap, strong community 💎"
        """

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The tweet text to post. Maximum 280 characters.",
                },
                "reply_to_tweet_id": {
                    "type": "string",
                    "description": "Optional: Tweet ID to reply to",
                },
            },
            "required": ["text"],
        }

    async def execute(self, text: str, reply_to_tweet_id: str = None) -> ToolResult:
        try:
            twitter = get_twitter_client()

            # Validate text length
            if len(text) > 280:
                return ToolResult(
                    success=False,
                    error=f"Tweet too long: {len(text)} characters (max 280). Please shorten the message."
                )

            # Post the tweet
            result = await twitter.post_tweet(
                text=text,
                reply_to_tweet_id=reply_to_tweet_id,
            )

            if result.success:
                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "tweet_id": result.tweet_id,
                        "text": result.text,
                        "url": result.url,
                        "message": f"Successfully posted tweet! View it at: {result.url}"
                    }, indent=2)
                )
            else:
                return ToolResult(success=False, error=result.error)

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to post tweet: {str(e)}")


class GenerateImageTool(Tool):
    """Tool to generate images using MiniMax AI."""

    @property
    def name(self) -> str:
        return "generate_image"

    @property
    def description(self) -> str:
        return """Generate AI images from text descriptions using MiniMax.
        Create memes, logos, charts, NFT art, or any visual content.
        Specify the desired image style, subject, colors, and aspect ratio.
        Returns a URL to download the generated image.
        Examples:
        - "Generate a meme about Solana being fast"
        - "Create a logo for a DeFi protocol"
        - "Make a chart showing profits going up"
        """

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Detailed description of the image to generate",
                },
                "ratio": {
                    "type": "string",
                    "description": "Aspect ratio: '1:1' (square), '3:4' (portrait), '4:3' (landscape), '16:9' (widescreen). Default: '1:1'",
                    "enum": ["1:1", "3:4", "4:3", "16:9"],
                },
                "num_images": {
                    "type": "integer",
                    "description": "Number of images to generate (1-4). Default: 1",
                },
            },
            "required": ["prompt"],
        }

    async def execute(self, prompt: str, ratio: str = "1:1", num_images: int = 1) -> ToolResult:
        try:
            minimax = get_minimax_client()

            # Map string ratio to enum
            from clients.minimax_client import ImageRatio
            ratio_map = {
                "1:1": ImageRatio.SQUARE,
                "3:4": ImageRatio.PORTRAIT,
                "4:3": ImageRatio.LANDSCAPE,
                "16:9": ImageRatio.WIDESCREEN,
            }
            ratio_enum = ratio_map.get(ratio, ImageRatio.SQUARE)

            # Generate image
            response = await minimax.generate_image(
                prompt=prompt,
                ratio=ratio_enum,
                num_images=num_images
            )

            # Extract image URLs
            images = response.get("data", {}).get("images", [])

            if not images:
                return ToolResult(
                    success=False,
                    error="No images generated"
                )

            result = {
                "prompt": prompt,
                "ratio": ratio,
                "images_generated": len(images),
                "images": [
                    {
                        "url": img.get("url"),
                        "file_id": img.get("file_id")
                    }
                    for img in images
                ]
            }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to generate image: {str(e)}")


class GenerateMusicTool(Tool):
    """Tool to generate music using MiniMax AI."""

    @property
    def name(self) -> str:
        return "generate_music"

    @property
    def description(self) -> str:
        return """Generate AI music from text descriptions using MiniMax.
        Create background music, theme songs, or audio content.
        Can generate instrumental tracks or music with lyrics.
        Examples:
        - "Create upbeat electronic music for a trading video"
        - "Generate chill lo-fi beats"
        - "Make a hype song about Solana with lyrics: 'Solana to the moon...'"
        """

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Description of the music style, mood, genre to generate",
                },
                "lyrics": {
                    "type": "string",
                    "description": "Optional lyrics to sing in the music",
                },
                "duration": {
                    "type": "integer",
                    "description": "Duration in seconds (max 120). Default: 30",
                },
                "instrumental": {
                    "type": "boolean",
                    "description": "Generate instrumental only (no vocals). Default: false",
                },
            },
            "required": ["prompt"],
        }

    async def execute(
        self,
        prompt: str,
        lyrics: str = None,
        duration: int = 30,
        instrumental: bool = False
    ) -> ToolResult:
        try:
            minimax = get_minimax_client()

            # Generate music
            response = await minimax.generate_music(
                prompt=prompt,
                lyrics=lyrics,
                duration=duration,
                instrumental=instrumental
            )

            # Extract audio info
            audio_url = response.get("data", {}).get("audio_url")
            file_id = response.get("data", {}).get("file_id")

            if not audio_url:
                return ToolResult(
                    success=False,
                    error="No audio generated"
                )

            result = {
                "prompt": prompt,
                "lyrics": lyrics if lyrics else "(instrumental)",
                "duration": duration,
                "audio_url": audio_url,
                "file_id": file_id,
                "message": f"Successfully generated {duration}s music track!"
            }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to generate music: {str(e)}")


class GenerateVideoTool(Tool):
    """Tool to generate videos using MiniMax AI."""

    @property
    def name(self) -> str:
        return "generate_video"

    @property
    def description(self) -> str:
        return """Generate AI videos from text descriptions using MiniMax.
        Create promotional videos, explainers, animations, or video memes.
        Can optionally specify first and last frame images.
        Note: Video generation takes time (30s-5min). The tool will wait for completion.
        Examples:
        - "Create a video of a rocket launching to represent token price going up"
        - "Generate an animation showing money flowing into a wallet"
        - "Make a video meme about diamond hands holding through a dip"
        """

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Detailed description of the video to generate",
                },
                "ratio": {
                    "type": "string",
                    "description": "Aspect ratio: '1:1' (square), '9:16' (portrait/mobile), '16:9' (landscape). Default: '16:9'",
                    "enum": ["1:1", "9:16", "16:9"],
                },
                "duration": {
                    "type": "integer",
                    "description": "Duration in seconds (2-6). Default: 5",
                },
            },
            "required": ["prompt"],
        }

    async def execute(
        self,
        prompt: str,
        ratio: str = "16:9",
        duration: int = 5
    ) -> ToolResult:
        try:
            minimax = get_minimax_client()

            # Map string ratio to enum
            from clients.minimax_client import VideoRatio
            ratio_map = {
                "1:1": VideoRatio.SQUARE,
                "9:16": VideoRatio.PORTRAIT,
                "16:9": VideoRatio.LANDSCAPE,
            }
            ratio_enum = ratio_map.get(ratio, VideoRatio.LANDSCAPE)

            # Generate video (this will wait for completion)
            result = await minimax.generate_video(
                prompt=prompt,
                ratio=ratio_enum,
                duration=duration,
                wait_for_completion=True,
                max_wait=300  # 5 minutes max
            )

            if result.status == "success":
                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "prompt": prompt,
                        "ratio": ratio,
                        "duration": duration,
                        "task_id": result.task_id,
                        "file_id": result.file_id,
                        "download_url": result.download_url,
                        "message": "Video generated successfully! Download at the URL provided."
                    }, indent=2)
                )
            elif result.status == "timeout":
                return ToolResult(
                    success=False,
                    error=f"Video generation timed out. Task ID: {result.task_id}. Try again later or check status."
                )
            else:
                return ToolResult(
                    success=False,
                    error=f"Video generation failed: {result.error}"
                )

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to generate video: {str(e)}")


class TextToSpeechTool(Tool):
    """Tool to convert text to speech using MiniMax AI."""

    @property
    def name(self) -> str:
        return "text_to_speech"

    @property
    def description(self) -> str:
        return """Convert text to natural-sounding speech using MiniMax AI.
        Create voiceovers for videos, audio announcements, or narration.
        Adjust speed and pitch for different effects.
        Examples:
        - "Convert this to speech: 'Welcome to MAWD Trading Bot!'"
        - "Create audio announcement: 'SOL just hit $200!'"
        - "Make voiceover: 'Here are today's top performing tokens...'"
        """

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The text to convert to speech",
                },
                "speed": {
                    "type": "number",
                    "description": "Speech speed (0.5-2.0). 1.0 is normal. Default: 1.0",
                },
                "pitch": {
                    "type": "number",
                    "description": "Voice pitch (0.5-2.0). 1.0 is normal. Default: 1.0",
                },
            },
            "required": ["text"],
        }

    async def execute(
        self,
        text: str,
        speed: float = 1.0,
        pitch: float = 1.0
    ) -> ToolResult:
        try:
            minimax = get_minimax_client()

            # Generate speech
            response = await minimax.text_to_speech(
                text=text,
                speed=speed,
                pitch=pitch
            )

            # Extract audio info
            audio_url = response.get("data", {}).get("audio_url")
            file_id = response.get("data", {}).get("file_id")

            if not audio_url:
                return ToolResult(
                    success=False,
                    error="No audio generated"
                )

            result = {
                "text": text,
                "speed": speed,
                "pitch": pitch,
                "audio_url": audio_url,
                "file_id": file_id,
                "message": "Successfully converted text to speech!"
            }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to generate speech: {str(e)}")


class WebSearchTool(Tool):
    """Tool for real-time web search using SearchAPI."""

    @property
    def name(self) -> str:
        return "web_search"

    @property
    def description(self) -> str:
        return """Search the web in real-time for current information, news, prices, or any topic.
        Returns top search results with snippets, links, and AI overview if available.
        Use this for market research, news, trending topics, or any information not in your knowledge."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query. Be specific and use keywords relevant to what you're looking for.",
                },
                "search_type": {
                    "type": "string",
                    "enum": ["general", "news"],
                    "description": "Type of search. Use 'news' for recent news articles, 'general' for all web results. Default is 'general'.",
                    "default": "general",
                },
            },
            "required": ["query"],
        }

    async def execute(self, query: str, search_type: str = "general") -> ToolResult:
        try:
            search = get_search_client()

            if search_type == "news":
                result = await search.search_news(query, time_period="last_day")
            else:
                result = await search.search(query)

            # Format results
            output = {
                "query": result.query,
                "total_results": result.total_results,
                "top_results": [
                    {
                        "title": r.title,
                        "link": r.link,
                        "snippet": r.snippet,
                        "source": r.source,
                        "date": r.date,
                    }
                    for r in result.results[:5]
                ],
            }

            if result.ai_overview:
                output["ai_overview"] = result.ai_overview

            if result.answer_box:
                output["answer_box"] = result.answer_box

            if result.related_searches:
                output["related_searches"] = result.related_searches

            return ToolResult(
                success=True,
                content=json.dumps(output, indent=2)
            )

        except Exception as e:
            return ToolResult(success=False, error=f"Search failed: {str(e)}")


class AnalyzeSolanaAddressTool(Tool):
    """Tool for unified Solana blockchain analysis - automatically detects and analyzes contracts, wallets, or transactions."""

    @property
    def name(self) -> str:
        return "analyze_solana_address"

    @property
    def description(self) -> str:
        return """Analyze any Solana blockchain address in real-time. Automatically detects whether the address is:
        - Token contract: Returns token info, price, market cap, volume, security analysis, and OHLCV chart data
        - Wallet address: Returns SOL balance, token holdings, NFT holdings, and total assets
        - Transaction signature: Returns transaction details, status, fees, and involved accounts

        Just provide the address and get comprehensive real-time blockchain data."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "address": {
                    "type": "string",
                    "description": "Solana address to analyze. Can be a token contract (32-44 chars), wallet address (32-44 chars), or transaction signature (88 chars).",
                },
            },
            "required": ["address"],
        }

    async def execute(self, address: str) -> ToolResult:
        try:
            analyzer = get_solana_analyzer()

            result = await analyzer.analyze(address)

            output = {
                "address": result.address,
                "type": result.address_type.value,
                "data_source": result.source,
                "analysis": result.data,
            }

            return ToolResult(
                success=True,
                content=json.dumps(output, indent=2)
            )

        except Exception as e:
            return ToolResult(success=False, error=f"Analysis failed: {str(e)}")


# ==================
# Aster DEX Trading Tools
# ==================

class AsterOpenLongTool(Tool):
    """Tool to open a long perpetual position on Aster DEX."""

    @property
    def name(self) -> str:
        return "aster_open_long"

    @property
    def description(self) -> str:
        return """Open a LONG perpetual position on Aster DEX.
        Go long when you expect the price to increase.
        WARNING: Perpetuals trading involves leverage and high risk. Can result in liquidation."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Trading pair (e.g., 'BTCUSDT', 'ETHUSDT', 'SOLUSDT')",
                },
                "quantity": {
                    "type": "number",
                    "description": "Position size in base asset",
                },
                "order_type": {
                    "type": "string",
                    "enum": ["MARKET", "LIMIT"],
                    "description": "Order type. MARKET for immediate execution, LIMIT for specific price.",
                    "default": "MARKET",
                },
                "price": {
                    "type": "number",
                    "description": "Limit price (required if order_type is LIMIT)",
                },
            },
            "required": ["symbol", "quantity"],
        }

    async def execute(
        self,
        symbol: str,
        quantity: float,
        order_type: str = "MARKET",
        price: float = None
    ) -> ToolResult:
        try:
            aster = get_aster_client()

            result = await aster.place_order(
                symbol=symbol,
                side='BUY',
                order_type=order_type,
                quantity=quantity,
                position_side='LONG',
                price=price,
            )

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "order_id": result.get("orderId"),
                    "symbol": result.get("symbol"),
                    "side": "LONG",
                    "quantity": result.get("origQty"),
                    "price": result.get("price"),
                    "type": result.get("type"),
                    "message": f"Successfully opened LONG position for {symbol}"
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to open long: {str(e)}")


class AsterOpenShortTool(Tool):
    """Tool to open a short perpetual position on Aster DEX."""

    @property
    def name(self) -> str:
        return "aster_open_short"

    @property
    def description(self) -> str:
        return """Open a SHORT perpetual position on Aster DEX.
        Go short when you expect the price to decrease.
        WARNING: Perpetuals trading involves leverage and high risk. Can result in liquidation."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Trading pair (e.g., 'BTCUSDT', 'ETHUSDT', 'SOLUSDT')",
                },
                "quantity": {
                    "type": "number",
                    "description": "Position size in base asset",
                },
                "order_type": {
                    "type": "string",
                    "enum": ["MARKET", "LIMIT"],
                    "description": "Order type. MARKET for immediate execution, LIMIT for specific price.",
                    "default": "MARKET",
                },
                "price": {
                    "type": "number",
                    "description": "Limit price (required if order_type is LIMIT)",
                },
            },
            "required": ["symbol", "quantity"],
        }

    async def execute(
        self,
        symbol: str,
        quantity: float,
        order_type: str = "MARKET",
        price: float = None
    ) -> ToolResult:
        try:
            aster = get_aster_client()

            result = await aster.place_order(
                symbol=symbol,
                side='SELL',
                order_type=order_type,
                quantity=quantity,
                position_side='SHORT',
                price=price,
            )

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "order_id": result.get("orderId"),
                    "symbol": result.get("symbol"),
                    "side": "SHORT",
                    "quantity": result.get("origQty"),
                    "price": result.get("price"),
                    "type": result.get("type"),
                    "message": f"Successfully opened SHORT position for {symbol}"
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to open short: {str(e)}")


class AsterClosePerpPositionTool(Tool):
    """Tool to close a perpetual position on Aster DEX."""

    @property
    def name(self) -> str:
        return "aster_close_position"

    @property
    def description(self) -> str:
        return """Close an open perpetual position on Aster DEX.
        Closes LONG positions by selling, SHORT positions by buying.
        Use close_position=True to close the entire position at market price."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Trading pair (e.g., 'BTCUSDT', 'ETHUSDT', 'SOLUSDT')",
                },
                "position_side": {
                    "type": "string",
                    "enum": ["LONG", "SHORT"],
                    "description": "Which position to close: LONG or SHORT",
                },
            },
            "required": ["symbol", "position_side"],
        }

    async def execute(self, symbol: str, position_side: str) -> ToolResult:
        try:
            aster = get_aster_client()

            # To close a LONG, we SELL. To close a SHORT, we BUY
            side = 'SELL' if position_side == 'LONG' else 'BUY'

            result = await aster.place_order(
                symbol=symbol,
                side=side,
                order_type='MARKET',
                quantity=0,  # Will be ignored due to close_position=True
                position_side=position_side,
                close_position=True,
            )

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "order_id": result.get("orderId"),
                    "symbol": result.get("symbol"),
                    "position_closed": position_side,
                    "message": f"Successfully closed {position_side} position for {symbol}"
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to close position: {str(e)}")


class AsterGetPositionsTool(Tool):
    """Tool to get all open perpetual positions on Aster DEX."""

    @property
    def name(self) -> str:
        return "aster_get_positions"

    @property
    def description(self) -> str:
        return """Get all open perpetual positions on Aster DEX.
        Shows position side (LONG/SHORT), size, entry price, unrealized PnL, leverage, and margin."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Optional: Filter by trading pair (e.g., 'BTCUSDT')",
                },
            },
            "required": [],
        }

    async def execute(self, symbol: str = None) -> ToolResult:
        try:
            aster = get_aster_client()

            positions = await aster.get_positions(symbol=symbol)

            # Filter out positions with no size
            active_positions = [
                {
                    "symbol": p.get("symbol"),
                    "position_side": p.get("positionSide"),
                    "position_amount": float(p.get("positionAmt", 0)),
                    "entry_price": float(p.get("entryPrice", 0)),
                    "unrealized_profit": float(p.get("unRealizedProfit", 0)),
                    "leverage": p.get("leverage"),
                    "margin_type": p.get("marginType"),
                    "liquidation_price": float(p.get("liquidationPrice", 0)),
                }
                for p in positions
                if float(p.get("positionAmt", 0)) != 0
            ]

            return ToolResult(
                success=True,
                content=json.dumps({
                    "positions_count": len(active_positions),
                    "positions": active_positions,
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get positions: {str(e)}")


class AsterSetLeverageTool(Tool):
    """Tool to set leverage for a trading pair on Aster DEX."""

    @property
    def name(self) -> str:
        return "aster_set_leverage"

    @property
    def description(self) -> str:
        return """Set the leverage (1x-125x) for a perpetual trading pair on Aster DEX.
        Higher leverage = higher risk and potential for liquidation.
        Must be set before opening positions."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Trading pair (e.g., 'BTCUSDT', 'ETHUSDT', 'SOLUSDT')",
                },
                "leverage": {
                    "type": "integer",
                    "description": "Leverage multiplier (1-125). Higher leverage = higher risk.",
                },
            },
            "required": ["symbol", "leverage"],
        }

    async def execute(self, symbol: str, leverage: int) -> ToolResult:
        try:
            aster = get_aster_client()

            result = await aster.change_leverage(symbol=symbol, leverage=leverage)

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "symbol": result.get("symbol"),
                    "leverage": result.get("leverage"),
                    "message": f"Leverage set to {leverage}x for {symbol}"
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to set leverage: {str(e)}")


class AsterSpotBuyTool(Tool):
    """Tool to buy tokens on Aster DEX spot market."""

    @property
    def name(self) -> str:
        return "aster_spot_buy"

    @property
    def description(self) -> str:
        return """Buy tokens on Aster DEX spot market.
        Use MARKET order for immediate execution or LIMIT order to set a specific price.
        For MARKET orders, specify quote_amount (how much USDT to spend).
        For LIMIT orders, specify quantity (how much token to buy) and price."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Trading pair (e.g., 'BTCUSDT', 'ETHUSDT', 'SOLUSDT')",
                },
                "order_type": {
                    "type": "string",
                    "enum": ["MARKET", "LIMIT"],
                    "description": "Order type. MARKET for immediate execution, LIMIT for specific price.",
                    "default": "MARKET",
                },
                "quantity": {
                    "type": "number",
                    "description": "Amount of base asset to buy (for LIMIT orders)",
                },
                "quote_amount": {
                    "type": "number",
                    "description": "Amount of quote asset to spend (for MARKET orders, e.g., USDT amount)",
                },
                "price": {
                    "type": "number",
                    "description": "Limit price (required if order_type is LIMIT)",
                },
            },
            "required": ["symbol"],
        }

    async def execute(
        self,
        symbol: str,
        order_type: str = "MARKET",
        quantity: float = None,
        quote_amount: float = None,
        price: float = None
    ) -> ToolResult:
        try:
            aster = get_aster_client()

            result = await aster.spot_place_order(
                symbol=symbol,
                side='BUY',
                order_type=order_type,
                quantity=quantity,
                quote_order_qty=quote_amount,
                price=price,
            )

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "order_id": result.get("orderId"),
                    "symbol": result.get("symbol"),
                    "side": "BUY",
                    "type": result.get("type"),
                    "quantity": result.get("origQty"),
                    "price": result.get("price"),
                    "filled_quantity": result.get("executedQty"),
                    "message": f"Successfully placed spot BUY order for {symbol}"
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to buy spot: {str(e)}")


class AsterSpotSellTool(Tool):
    """Tool to sell tokens on Aster DEX spot market."""

    @property
    def name(self) -> str:
        return "aster_spot_sell"

    @property
    def description(self) -> str:
        return """Sell tokens on Aster DEX spot market.
        Use MARKET order for immediate execution or LIMIT order to set a specific price.
        Specify quantity (how much token to sell) for both order types."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Trading pair (e.g., 'BTCUSDT', 'ETHUSDT', 'SOLUSDT')",
                },
                "quantity": {
                    "type": "number",
                    "description": "Amount of base asset to sell",
                },
                "order_type": {
                    "type": "string",
                    "enum": ["MARKET", "LIMIT"],
                    "description": "Order type. MARKET for immediate execution, LIMIT for specific price.",
                    "default": "MARKET",
                },
                "price": {
                    "type": "number",
                    "description": "Limit price (required if order_type is LIMIT)",
                },
            },
            "required": ["symbol", "quantity"],
        }

    async def execute(
        self,
        symbol: str,
        quantity: float,
        order_type: str = "MARKET",
        price: float = None
    ) -> ToolResult:
        try:
            aster = get_aster_client()

            result = await aster.spot_place_order(
                symbol=symbol,
                side='SELL',
                order_type=order_type,
                quantity=quantity,
                price=price,
            )

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "order_id": result.get("orderId"),
                    "symbol": result.get("symbol"),
                    "side": "SELL",
                    "type": result.get("type"),
                    "quantity": result.get("origQty"),
                    "price": result.get("price"),
                    "filled_quantity": result.get("executedQty"),
                    "message": f"Successfully placed spot SELL order for {symbol}"
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to sell spot: {str(e)}")


class AsterGetBalanceTool(Tool):
    """Tool to get account balance on Aster DEX."""

    @property
    def name(self) -> str:
        return "aster_get_balance"

    @property
    def description(self) -> str:
        return """Get account balance for both futures and spot accounts on Aster DEX.
        Shows available balance, wallet balance, unrealized PnL, and margin balance."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }

    async def execute(self) -> ToolResult:
        try:
            aster = get_aster_client()

            # Get futures balance
            futures_balance = await aster.get_account_balance()

            # Get spot balance
            try:
                spot_account = await aster.spot_get_account()
                spot_balances = spot_account.get("balances", [])
            except:
                spot_balances = []

            result = {
                "futures_balances": [
                    {
                        "asset": b.get("asset"),
                        "wallet_balance": float(b.get("walletBalance", 0)),
                        "available_balance": float(b.get("availableBalance", 0)),
                        "unrealized_profit": float(b.get("unrealizedProfit", 0)),
                        "margin_balance": float(b.get("marginBalance", 0)),
                    }
                    for b in futures_balance
                    if float(b.get("walletBalance", 0)) > 0
                ],
                "spot_balances": [
                    {
                        "asset": b.get("asset"),
                        "free": float(b.get("free", 0)),
                        "locked": float(b.get("locked", 0)),
                        "total": float(b.get("free", 0)) + float(b.get("locked", 0)),
                    }
                    for b in spot_balances
                    if float(b.get("free", 0)) > 0 or float(b.get("locked", 0)) > 0
                ],
            }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get balance: {str(e)}")


class AsterTransferTool(Tool):
    """Tool to transfer funds between futures and spot accounts on Aster DEX."""

    @property
    def name(self) -> str:
        return "aster_transfer"

    @property
    def description(self) -> str:
        return """Transfer funds between futures and spot accounts on Aster DEX.
        Type 1: Spot to Futures
        Type 2: Futures to Spot"""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "asset": {
                    "type": "string",
                    "description": "Asset to transfer (e.g., 'USDT', 'BTC', 'ETH')",
                },
                "amount": {
                    "type": "number",
                    "description": "Amount to transfer",
                },
                "transfer_type": {
                    "type": "integer",
                    "enum": [1, 2],
                    "description": "Transfer type: 1 = Spot to Futures, 2 = Futures to Spot",
                },
            },
            "required": ["asset", "amount", "transfer_type"],
        }

    async def execute(self, asset: str, amount: float, transfer_type: int) -> ToolResult:
        try:
            aster = get_aster_client()

            result = await aster.transfer_between_futures_spot(
                asset=asset,
                amount=amount,
                transfer_type=transfer_type,
            )

            direction = "Spot → Futures" if transfer_type == 1 else "Futures → Spot"

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "transaction_id": result.get("tranId"),
                    "asset": asset,
                    "amount": amount,
                    "direction": direction,
                    "message": f"Successfully transferred {amount} {asset} from {direction}"
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to transfer: {str(e)}")


class AsterGetPriceTool(Tool):
    """Tool to get current price and 24h statistics for a trading pair on Aster DEX."""

    @property
    def name(self) -> str:
        return "aster_get_price"

    @property
    def description(self) -> str:
        return """Get current price, 24h change, volume, and trading statistics for any trading pair on Aster DEX.
        Shows price, price change percentage, high, low, volume, and quote volume."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Trading pair (e.g., 'BTCUSDT', 'ETHUSDT', 'SOLUSDT')",
                },
            },
            "required": ["symbol"],
        }

    async def execute(self, symbol: str) -> ToolResult:
        try:
            aster = get_aster_client()

            ticker = await aster.get_ticker_24h(symbol=symbol)

            result = {
                "symbol": ticker.get("symbol"),
                "last_price": float(ticker.get("lastPrice", 0)),
                "price_change_24h": float(ticker.get("priceChange", 0)),
                "price_change_percent_24h": float(ticker.get("priceChangePercent", 0)),
                "high_24h": float(ticker.get("highPrice", 0)),
                "low_24h": float(ticker.get("lowPrice", 0)),
                "volume_24h": float(ticker.get("volume", 0)),
                "quote_volume_24h": float(ticker.get("quoteVolume", 0)),
                "open_price": float(ticker.get("openPrice", 0)),
            }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get price: {str(e)}")


# ==================
# Hyperliquid DEX Trading Tools
# ==================

class HyperliquidGetAccountTool(Tool):
    """Tool to get Hyperliquid account information including balance and positions."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_account"

    @property
    def description(self) -> str:
        return """Get Hyperliquid account information including account value, margin summary, withdrawable balance, and all open positions.
        Provides a complete overview of your Hyperliquid perpetuals trading account."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }

    async def execute(self) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            # Get account state
            margin_summary = hl.get_margin_summary()
            account_value = hl.get_account_value()
            withdrawable = hl.get_withdrawable()
            positions = hl.get_positions()

            # Format positions
            position_list = [
                {
                    "coin": p.coin,
                    "size": p.size,
                    "entry_price": p.entry_price,
                    "position_value": p.position_value,
                    "unrealized_pnl": p.unrealized_pnl,
                    "return_on_equity": p.return_on_equity,
                    "leverage_type": p.leverage_type,
                    "leverage_value": p.leverage_value,
                    "liquidation_price": p.liquidation_price,
                    "margin_used": p.margin_used,
                }
                for p in positions
            ]

            result = {
                "account_value_usd": account_value,
                "withdrawable_usd": withdrawable,
                "margin_summary": {
                    "account_value": float(margin_summary.get("accountValue", 0)),
                    "total_margin_used": float(margin_summary.get("totalMarginUsed", 0)),
                    "total_ntl_pos": float(margin_summary.get("totalNtlPos", 0)),
                    "total_raw_usd": float(margin_summary.get("totalRawUsd", 0)),
                },
                "positions_count": len(position_list),
                "positions": position_list,
            }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get account: {str(e)}")


class HyperliquidGetPriceTool(Tool):
    """Tool to get current price for assets on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_price"

    @property
    def description(self) -> str:
        return """Get current mid prices for assets on Hyperliquid.
        If coin is specified, returns price for that coin. Otherwise returns all prices.
        Common coins: BTC, ETH, SOL, DOGE, WIF, PEPE, ARB, OP, SUI, SEI, TIA, etc."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {
                    "type": "string",
                    "description": "Optional: Specific coin to get price for (e.g., 'BTC', 'ETH', 'SOL')",
                },
            },
            "required": [],
        }

    async def execute(self, coin: str = None) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            if coin:
                price = hl.get_price(coin)
                result = {
                    "coin": coin,
                    "price_usd": price,
                }
            else:
                all_mids = hl.get_all_mids()
                result = {
                    "prices": all_mids,
                    "count": len(all_mids),
                }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get price: {str(e)}")


class HyperliquidOpenLongTool(Tool):
    """Tool to open a long perpetual position on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_open_long"

    @property
    def description(self) -> str:
        return """Open a LONG perpetual position on Hyperliquid DEX.
        Go long when you expect the price to increase.
        Uses market order with configurable slippage.
        WARNING: Perpetuals trading involves leverage and high risk. Can result in liquidation.
        Common coins: BTC, ETH, SOL, DOGE, WIF, PEPE, ARB, OP, SUI, SEI, TIA, etc."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {
                    "type": "string",
                    "description": "Coin to trade (e.g., 'BTC', 'ETH', 'SOL')",
                },
                "size": {
                    "type": "number",
                    "description": "Position size in the coin's unit (e.g., 0.1 for 0.1 BTC)",
                },
                "slippage": {
                    "type": "number",
                    "description": "Max slippage as decimal (0.05 = 5%). Default: 0.05",
                },
            },
            "required": ["coin", "size"],
        }

    async def execute(self, coin: str, size: float, slippage: float = 0.05) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            result = hl.market_open(coin=coin, is_buy=True, size=size, slippage=slippage)

            if result.get("status") == "ok":
                statuses = result.get("response", {}).get("data", {}).get("statuses", [])

                filled_info = []
                for status in statuses:
                    if "filled" in status:
                        filled = status["filled"]
                        filled_info.append({
                            "order_id": filled.get("oid"),
                            "filled_size": filled.get("totalSz"),
                            "avg_price": filled.get("avgPx"),
                        })
                    elif "error" in status:
                        return ToolResult(success=False, error=f"Order error: {status['error']}")

                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "coin": coin,
                        "side": "LONG",
                        "size": size,
                        "slippage": slippage,
                        "fills": filled_info,
                        "message": f"Successfully opened LONG position for {size} {coin}"
                    }, indent=2)
                )
            else:
                return ToolResult(success=False, error=f"Order failed: {result}")

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to open long: {str(e)}")


class HyperliquidOpenShortTool(Tool):
    """Tool to open a short perpetual position on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_open_short"

    @property
    def description(self) -> str:
        return """Open a SHORT perpetual position on Hyperliquid DEX.
        Go short when you expect the price to decrease.
        Uses market order with configurable slippage.
        WARNING: Perpetuals trading involves leverage and high risk. Can result in liquidation.
        Common coins: BTC, ETH, SOL, DOGE, WIF, PEPE, ARB, OP, SUI, SEI, TIA, etc."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {
                    "type": "string",
                    "description": "Coin to trade (e.g., 'BTC', 'ETH', 'SOL')",
                },
                "size": {
                    "type": "number",
                    "description": "Position size in the coin's unit (e.g., 0.1 for 0.1 BTC)",
                },
                "slippage": {
                    "type": "number",
                    "description": "Max slippage as decimal (0.05 = 5%). Default: 0.05",
                },
            },
            "required": ["coin", "size"],
        }

    async def execute(self, coin: str, size: float, slippage: float = 0.05) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            result = hl.market_open(coin=coin, is_buy=False, size=size, slippage=slippage)

            if result.get("status") == "ok":
                statuses = result.get("response", {}).get("data", {}).get("statuses", [])

                filled_info = []
                for status in statuses:
                    if "filled" in status:
                        filled = status["filled"]
                        filled_info.append({
                            "order_id": filled.get("oid"),
                            "filled_size": filled.get("totalSz"),
                            "avg_price": filled.get("avgPx"),
                        })
                    elif "error" in status:
                        return ToolResult(success=False, error=f"Order error: {status['error']}")

                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "coin": coin,
                        "side": "SHORT",
                        "size": size,
                        "slippage": slippage,
                        "fills": filled_info,
                        "message": f"Successfully opened SHORT position for {size} {coin}"
                    }, indent=2)
                )
            else:
                return ToolResult(success=False, error=f"Order failed: {result}")

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to open short: {str(e)}")


class HyperliquidClosePositionTool(Tool):
    """Tool to close a perpetual position on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_close_position"

    @property
    def description(self) -> str:
        return """Close an open perpetual position on Hyperliquid DEX.
        Closes entire position or specified size at market price.
        Use this to take profit or cut losses on an existing position."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {
                    "type": "string",
                    "description": "Coin to close position for (e.g., 'BTC', 'ETH', 'SOL')",
                },
                "size": {
                    "type": "number",
                    "description": "Optional: Size to close. If not specified, closes entire position.",
                },
                "slippage": {
                    "type": "number",
                    "description": "Max slippage as decimal (0.05 = 5%). Default: 0.05",
                },
            },
            "required": ["coin"],
        }

    async def execute(self, coin: str, size: float = None, slippage: float = 0.05) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            result = hl.market_close(coin=coin, size=size, slippage=slippage)

            if result.get("status") == "ok":
                statuses = result.get("response", {}).get("data", {}).get("statuses", [])

                filled_info = []
                for status in statuses:
                    if "filled" in status:
                        filled = status["filled"]
                        filled_info.append({
                            "order_id": filled.get("oid"),
                            "filled_size": filled.get("totalSz"),
                            "avg_price": filled.get("avgPx"),
                        })
                    elif "error" in status:
                        return ToolResult(success=False, error=f"Order error: {status['error']}")

                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "coin": coin,
                        "closed_size": size if size else "entire position",
                        "fills": filled_info,
                        "message": f"Successfully closed {coin} position"
                    }, indent=2)
                )
            else:
                return ToolResult(success=False, error=f"Close failed: {result}")

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to close position: {str(e)}")


class HyperliquidGetPositionsTool(Tool):
    """Tool to get all open positions on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_positions"

    @property
    def description(self) -> str:
        return """Get all open perpetual positions on Hyperliquid DEX.
        Shows coin, size (positive=long, negative=short), entry price, unrealized PnL, leverage, and liquidation price."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }

    async def execute(self) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            positions = hl.get_positions()

            position_list = [
                {
                    "coin": p.coin,
                    "side": "LONG" if p.size > 0 else "SHORT",
                    "size": abs(p.size),
                    "entry_price": p.entry_price,
                    "position_value_usd": p.position_value,
                    "unrealized_pnl_usd": p.unrealized_pnl,
                    "return_on_equity_percent": p.return_on_equity * 100,
                    "leverage_type": p.leverage_type,
                    "leverage": p.leverage_value,
                    "liquidation_price": p.liquidation_price,
                    "margin_used_usd": p.margin_used,
                }
                for p in positions
            ]

            return ToolResult(
                success=True,
                content=json.dumps({
                    "positions_count": len(position_list),
                    "positions": position_list,
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get positions: {str(e)}")


class HyperliquidSetLeverageTool(Tool):
    """Tool to set leverage for a coin on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_set_leverage"

    @property
    def description(self) -> str:
        return """Set the leverage multiplier for a coin on Hyperliquid DEX.
        Higher leverage = higher risk and potential for liquidation.
        Must be set before opening positions.
        Supports cross margin (default) or isolated margin."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {
                    "type": "string",
                    "description": "Coin to set leverage for (e.g., 'BTC', 'ETH', 'SOL')",
                },
                "leverage": {
                    "type": "integer",
                    "description": "Leverage multiplier (e.g., 5 for 5x leverage)",
                },
                "is_cross": {
                    "type": "boolean",
                    "description": "True for cross margin (default), False for isolated margin",
                },
            },
            "required": ["coin", "leverage"],
        }

    async def execute(self, coin: str, leverage: int, is_cross: bool = True) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            result = hl.update_leverage(coin=coin, leverage=leverage, is_cross=is_cross)

            if result.get("status") == "ok":
                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "coin": coin,
                        "leverage": leverage,
                        "margin_type": "cross" if is_cross else "isolated",
                        "message": f"Leverage set to {leverage}x for {coin}"
                    }, indent=2)
                )
            else:
                return ToolResult(success=False, error=f"Failed to set leverage: {result}")

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to set leverage: {str(e)}")


class HyperliquidPlaceLimitOrderTool(Tool):
    """Tool to place a limit order on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_place_limit_order"

    @property
    def description(self) -> str:
        return """Place a limit order on Hyperliquid DEX.
        Order will be placed at the specified price and wait to be filled.
        Use for precise entry/exit points when you don't need immediate execution."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {
                    "type": "string",
                    "description": "Coin to trade (e.g., 'BTC', 'ETH', 'SOL')",
                },
                "is_buy": {
                    "type": "boolean",
                    "description": "True for buy/long, False for sell/short",
                },
                "size": {
                    "type": "number",
                    "description": "Order size in the coin's unit",
                },
                "price": {
                    "type": "number",
                    "description": "Limit price for the order",
                },
                "reduce_only": {
                    "type": "boolean",
                    "description": "If true, order can only reduce existing position. Default: false",
                },
            },
            "required": ["coin", "is_buy", "size", "price"],
        }

    async def execute(
        self,
        coin: str,
        is_buy: bool,
        size: float,
        price: float,
        reduce_only: bool = False
    ) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            result = hl.place_order(
                coin=coin,
                is_buy=is_buy,
                size=size,
                limit_price=price,
                order_type="limit",
                reduce_only=reduce_only,
            )

            if result.get("status") == "ok":
                statuses = result.get("response", {}).get("data", {}).get("statuses", [])

                order_info = []
                for status in statuses:
                    if "resting" in status:
                        order_info.append({
                            "order_id": status["resting"].get("oid"),
                            "status": "resting",
                        })
                    elif "filled" in status:
                        filled = status["filled"]
                        order_info.append({
                            "order_id": filled.get("oid"),
                            "status": "filled",
                            "filled_size": filled.get("totalSz"),
                            "avg_price": filled.get("avgPx"),
                        })
                    elif "error" in status:
                        return ToolResult(success=False, error=f"Order error: {status['error']}")

                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "coin": coin,
                        "side": "BUY" if is_buy else "SELL",
                        "size": size,
                        "price": price,
                        "reduce_only": reduce_only,
                        "orders": order_info,
                        "message": f"Limit order placed: {'BUY' if is_buy else 'SELL'} {size} {coin} @ {price}"
                    }, indent=2)
                )
            else:
                return ToolResult(success=False, error=f"Order failed: {result}")

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to place order: {str(e)}")


class HyperliquidCancelOrderTool(Tool):
    """Tool to cancel an order on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_cancel_order"

    @property
    def description(self) -> str:
        return """Cancel an open order on Hyperliquid DEX by order ID.
        Get order IDs from hyperliquid_get_open_orders."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {
                    "type": "string",
                    "description": "Coin the order is for (e.g., 'BTC', 'ETH', 'SOL')",
                },
                "order_id": {
                    "type": "integer",
                    "description": "Order ID to cancel",
                },
            },
            "required": ["coin", "order_id"],
        }

    async def execute(self, coin: str, order_id: int) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            result = hl.cancel_order(coin=coin, oid=order_id)

            if result.get("status") == "ok":
                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "coin": coin,
                        "order_id": order_id,
                        "message": f"Order {order_id} cancelled for {coin}"
                    }, indent=2)
                )
            else:
                return ToolResult(success=False, error=f"Cancel failed: {result}")

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to cancel order: {str(e)}")


class HyperliquidGetOpenOrdersTool(Tool):
    """Tool to get all open orders on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_open_orders"

    @property
    def description(self) -> str:
        return """Get all open/pending orders on Hyperliquid DEX.
        Shows order ID, coin, side, size, price, and timestamp."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }

    async def execute(self) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            orders = hl.get_open_orders()

            order_list = [
                {
                    "order_id": o.oid,
                    "coin": o.coin,
                    "side": "BUY" if o.side == "B" else "SELL",
                    "size": o.size,
                    "limit_price": o.limit_price,
                    "timestamp": o.timestamp,
                }
                for o in orders
            ]

            return ToolResult(
                success=True,
                content=json.dumps({
                    "open_orders_count": len(order_list),
                    "orders": order_list,
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get open orders: {str(e)}")


class HyperliquidGetTradeHistoryTool(Tool):
    """Tool to get trade history on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_trade_history"

    @property
    def description(self) -> str:
        return """Get recent trade history (fills) on Hyperliquid DEX.
        Shows coin, side, size, price, closed PnL, and timestamp."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }

    async def execute(self) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            fills = hl.get_user_fills()

            trade_list = [
                {
                    "coin": fill.get("coin"),
                    "side": fill.get("side"),
                    "size": fill.get("sz"),
                    "price": fill.get("px"),
                    "closed_pnl": fill.get("closedPnl"),
                    "direction": fill.get("dir"),
                    "timestamp": fill.get("time"),
                    "tx_hash": fill.get("hash"),
                }
                for fill in fills[:50]  # Limit to 50 most recent
            ]

            return ToolResult(
                success=True,
                content=json.dumps({
                    "trades_count": len(trade_list),
                    "trades": trade_list,
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get trade history: {str(e)}")


class HyperliquidGetAvailableCoinsTool(Tool):
    """Tool to get list of available trading coins on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_available_coins"

    @property
    def description(self) -> str:
        return """Get list of all available coins for perpetual trading on Hyperliquid DEX.
        Useful for discovering what assets can be traded."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }

    async def execute(self) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            coins = hl.get_available_coins()

            return ToolResult(
                success=True,
                content=json.dumps({
                    "available_coins_count": len(coins),
                    "coins": coins,
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get available coins: {str(e)}")


class HyperliquidTransferTool(Tool):
    """Tool to transfer USDC between perp and spot accounts on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_transfer"

    @property
    def description(self) -> str:
        return """Transfer USDC between perpetual and spot accounts on Hyperliquid.
        Use to move funds between your trading accounts."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "amount": {
                    "type": "number",
                    "description": "Amount of USDC to transfer",
                },
                "to_perp": {
                    "type": "boolean",
                    "description": "True to transfer to perp account, False to transfer to spot account",
                },
            },
            "required": ["amount", "to_perp"],
        }

    async def execute(self, amount: float, to_perp: bool) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            result = hl.usd_class_transfer(amount=amount, to_perp=to_perp)

            if result.get("status") == "ok":
                direction = "Spot → Perp" if to_perp else "Perp → Spot"
                return ToolResult(
                    success=True,
                    content=json.dumps({
                        "status": "success",
                        "amount": amount,
                        "direction": direction,
                        "message": f"Successfully transferred {amount} USDC ({direction})"
                    }, indent=2)
                )
            else:
                return ToolResult(success=False, error=f"Transfer failed: {result}")

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to transfer: {str(e)}")


class HyperliquidGetAssetIdsTool(Tool):
    """Tool to get asset IDs for Hyperliquid perpetuals and spot markets."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_asset_ids"

    @property
    def description(self) -> str:
        return """Get asset IDs for Hyperliquid perpetuals and spot markets.

        Asset ID Format:
        - Perpetuals: Integer index from meta (e.g., BTC = 0 on mainnet)
        - Spot: 10000 + spotInfo["index"] (e.g., PURR/USDC = 10000)
        - Builder-deployed perps: 100000 + perp_dex_index * 10000 + index_in_meta

        Use this tool to find the correct asset ID when working with Hyperliquid's API.
        Returns both perpetual and spot asset ID mappings."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {
                    "type": "string",
                    "description": "Optional: Specific coin to lookup (e.g., 'BTC', 'HYPE', 'PURR/USDC'). If not provided, returns all mappings.",
                },
                "market_type": {
                    "type": "string",
                    "enum": ["perp", "spot", "all"],
                    "description": "Market type to query: 'perp' for perpetuals, 'spot' for spot, 'all' for both (default: all)",
                },
            },
            "required": [],
        }

    async def execute(self, coin: str = None, market_type: str = "all") -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            result = {
                "asset_id_format": {
                    "perpetuals": "index from meta (e.g., BTC = 0)",
                    "spot": "10000 + index (e.g., PURR/USDC = 10000)",
                    "builder_perps": "100000 + dex_index * 10000 + index"
                }
            }

            if coin:
                # Lookup specific coin
                if market_type in ["perp", "all"]:
                    perp_id = hl.get_perp_asset_id(coin)
                    if perp_id >= 0:
                        result["perp_asset_id"] = {
                            "coin": coin,
                            "asset_id": perp_id
                        }

                if market_type in ["spot", "all"]:
                    spot_id = hl.get_spot_asset_id(coin)
                    if spot_id >= 0:
                        result["spot_asset_id"] = {
                            "coin": coin,
                            "asset_id": spot_id,
                            "api_format": f"@{spot_id - 10000}"
                        }
            else:
                # Return all mappings
                if market_type in ["perp", "all"]:
                    perp_ids = hl.get_all_perp_asset_ids()
                    result["perpetual_asset_ids"] = {
                        "count": len(perp_ids),
                        "mappings": dict(list(perp_ids.items())[:50]),  # Limit to first 50
                        "note": "Showing first 50. Use coin parameter to lookup specific assets."
                    }

                if market_type in ["spot", "all"]:
                    spot_ids = hl.get_all_spot_asset_ids()
                    result["spot_asset_ids"] = {
                        "count": len(spot_ids),
                        "mappings": {k: {"asset_id": v, "api_format": f"@{v - 10000}"}
                                    for k, v in list(spot_ids.items())[:30]},
                        "note": "Showing first 30 spot pairs."
                    }

            return ToolResult(
                success=True,
                content=json.dumps(result, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get asset IDs: {str(e)}")


class HyperliquidSpotOrderTool(Tool):
    """Tool to place a spot order on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_spot_order"

    @property
    def description(self) -> str:
        return """Place a spot order on Hyperliquid DEX.

        Spot trading uses different asset IDs than perpetuals:
        - Spot ID = 10000 + spotInfo["index"]
        - Use @{index} format for API calls (e.g., @107 for HYPE)

        Common spot pairs: PURR/USDC, HYPE/USDC, etc.
        Use hyperliquid_get_asset_ids to find the correct asset ID."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {
                    "type": "string",
                    "description": "Spot pair (e.g., 'HYPE/USDC', 'PURR/USDC') or @index format (e.g., '@107')",
                },
                "is_buy": {
                    "type": "boolean",
                    "description": "True to buy, False to sell",
                },
                "size": {
                    "type": "number",
                    "description": "Order size in base token",
                },
                "limit_price": {
                    "type": "number",
                    "description": "Limit price",
                },
                "order_type": {
                    "type": "string",
                    "enum": ["limit", "ioc"],
                    "description": "Order type: 'limit' (GTC) or 'ioc' (Immediate or Cancel). Default: limit",
                },
            },
            "required": ["coin", "is_buy", "size", "limit_price"],
        }

    async def execute(
        self,
        coin: str,
        is_buy: bool,
        size: float,
        limit_price: float,
        order_type: str = "limit"
    ) -> ToolResult:
        try:
            hl = get_hyperliquid_client()

            result = hl.spot_order(
                coin=coin,
                is_buy=is_buy,
                size=size,
                limit_price=limit_price,
                order_type=order_type,
            )

            side = "BUY" if is_buy else "SELL"

            if result.get("status") == "ok":
                response = result.get("response", {})
                data = response.get("data", {})
                statuses = data.get("statuses", [])

                if statuses and statuses[0].get("filled"):
                    filled = statuses[0]["filled"]
                    return ToolResult(
                        success=True,
                        content=json.dumps({
                            "status": "filled",
                            "coin": coin,
                            "side": side,
                            "size": size,
                            "limit_price": limit_price,
                            "filled_size": filled.get("totalSz"),
                            "avg_price": filled.get("avgPx"),
                            "message": f"Spot {side} order filled for {coin}"
                        }, indent=2)
                    )
                elif statuses and statuses[0].get("resting"):
                    resting = statuses[0]["resting"]
                    return ToolResult(
                        success=True,
                        content=json.dumps({
                            "status": "resting",
                            "coin": coin,
                            "side": side,
                            "size": size,
                            "limit_price": limit_price,
                            "order_id": resting.get("oid"),
                            "message": f"Spot {side} limit order placed for {coin}"
                        }, indent=2)
                    )

            return ToolResult(success=False, error=f"Spot order failed: {result}")

        except Exception as e:
            return ToolResult(success=False, error=f"Failed to place spot order: {str(e)}")


class LaunchTokenTool(Tool):
    """Tool to launch a new token on Solana with Bags.fm. Supports uploading local image files."""

    @property
    def name(self) -> str:
        return "launch_token"

    @property
    def description(self) -> str:
        return """Launch a new token on Solana with complete metadata and social links.
        Automatically creates token metadata, uploads images, sets up fee sharing, and executes launch transaction.
        Supports uploading local image files (PNG, JPG, JPEG, GIF, WebP up to 15MB) or using existing URLs.

        Examples:
        - "Launch a token called MAWD with symbol $MAWD, description 'The MAWDbot token', image from /path/to/logo.png"
        - "Create a new token with name 'Lobster Coin', symbol LOBS, and upload the image at ./lobster.jpg"
        - "Launch token named SolBot using image URL https://example.com/logo.png"
        """

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Token name",
                },
                "symbol": {
                    "type": "string",
                    "description": "Token symbol (e.g., 'MAWD', '$MAWD')",
                },
                "description": {
                    "type": "string",
                    "description": "Token description",
                },
                "image_url": {
                    "type": "string",
                    "description": "URL to existing token image (mutually exclusive with image_file_path)",
                },
                "image_file_path": {
                    "type": "string",
                    "description": "Path to local image file to upload (PNG, JPG, JPEG, GIF, WebP, max 15MB). Mutually exclusive with image_url.",
                },
                "initial_buy_sol": {
                    "type": "number",
                    "description": "Initial buy amount in SOL (default: 0.01)",
                },
                "twitter": {
                    "type": "string",
                    "description": "Twitter/X URL (optional)",
                },
                "website": {
                    "type": "string",
                    "description": "Website URL (optional)",
                },
                "telegram": {
                    "type": "string",
                    "description": "Telegram URL (optional)",
                },
                "fee_share_bps": {
                    "type": "integer",
                    "description": "Creator fee share in basis points (default: 10000 = 100%)",
                },
            },
            "required": ["name", "symbol", "description"],
        }

    async def execute(
        self,
        name: str,
        symbol: str,
        description: str,
        image_url: Optional[str] = None,
        image_file_path: Optional[str] = None,
        initial_buy_sol: float = 0.01,
        twitter: Optional[str] = None,
        website: Optional[str] = None,
        telegram: Optional[str] = None,
        fee_share_bps: int = 10000,
    ) -> ToolResult:
        try:
            bags = get_bags_client()

            # Ensure at least one image source is provided
            if not image_url and not image_file_path:
                return ToolResult(
                    success=False,
                    error="Either image_url or image_file_path must be provided"
                )

            # Launch token with Bags (supports both URL and file upload)
            result = await bags.launch_token(
                name=name,
                symbol=symbol,
                description=description,
                image_url=image_url,
                image_file_path=image_file_path,
                initial_buy_sol=initial_buy_sol,
                twitter=twitter,
                website=website,
                telegram=telegram,
                fee_share_bps=fee_share_bps,
            )

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "token_mint": result["token_mint"],
                    "metadata_uri": result["metadata_uri"],
                    "config_key": result["config_key"],
                    "signature": result["signature"],
                    "token_url": result["token_url"],
                    "initial_buy_sol": initial_buy_sol,
                    "image_source": "file_upload" if image_file_path else "url",
                    "message": f"Token {name} ({symbol}) launched successfully! View at {result['token_url']}"
                }, indent=2)
            )

        except FileNotFoundError as e:
            return ToolResult(success=False, error=f"Image file not found: {str(e)}")
        except ValueError as e:
            return ToolResult(success=False, error=f"Invalid input: {str(e)}")
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to launch token: {str(e)}")


# ==============================================
# CDP (Coinbase Developer Platform) Tools
# ==============================================

class CDPCreateAccountTool(Tool):
    """Tool to create a new Solana account via CDP."""

    @property
    def name(self) -> str:
        return "cdp_create_account"

    @property
    def description(self) -> str:
        return """Create a new Solana account managed by Coinbase Developer Platform (CDP).

        This creates a secure, custodial Solana account on devnet that can be used for:
        - Testing and development
        - Receiving devnet SOL from faucets
        - Signing transactions with CDP-managed keys

        The account is managed by CDP, so private keys never need to be exposed.
        Returns the new account address.

        Note: This creates accounts on Solana devnet by default."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Optional unique name for the account (2-36 chars, alphanumeric + hyphens)",
                },
            },
            "required": [],
        }

    async def execute(self, name: Optional[str] = None) -> ToolResult:
        cdp = get_cdp_client()
        if cdp is None:
            return ToolResult(
                success=False,
                error="CDP client not configured. Set CDP_API_KEY_ID and CDP_API_KEY_SECRET environment variables."
            )

        try:
            result = await cdp.create_account(name=name)
            content = "✓ Created new CDP Solana account:\n"
            content += f"  Address: {result['address']}\n"
            if result.get('name'):
                content += f"  Name: {result['name']}\n"
            content += "\nThis account is managed by CDP and can be funded via the devnet faucet."

            return ToolResult(success=True, content=content)
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to create CDP account: {str(e)}")


class CDPRequestFaucetTool(Tool):
    """Tool to request devnet SOL from the faucet for a CDP account."""

    @property
    def name(self) -> str:
        return "cdp_request_faucet"

    @property
    def description(self) -> str:
        return """Request devnet SOL from the Solana faucet for a CDP-managed account.

        This funds a Solana devnet account with test SOL (~0.001-0.01 SOL).
        Use this after creating a CDP account to give it an initial balance for testing.

        Returns the transaction signature and explorer link."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "address": {
                    "type": "string",
                    "description": "Solana address to fund (must be a valid base58 address)",
                },
            },
            "required": ["address"],
        }

    async def execute(self, address: str) -> ToolResult:
        cdp = get_cdp_client()
        if cdp is None:
            return ToolResult(
                success=False,
                error="CDP client not configured."
            )

        try:
            result = await cdp.request_faucet(address, token="sol")
            content = "✓ Faucet request successful!\n"
            content += f"  Transaction: {result['transaction_signature']}\n"
            content += f"  Explorer: {result['explorer_url']}\n"
            content += "\nWait 10-30 seconds for the funds to arrive."

            return ToolResult(success=True, content=content)
        except Exception as e:
            return ToolResult(success=False, error=f"Faucet request failed: {str(e)}")


class CDPGetBalanceTool(Tool):
    """Tool to get SOL balance for a CDP account."""

    @property
    def name(self) -> str:
        return "cdp_get_balance"

    @property
    def description(self) -> str:
        return """Get the SOL balance for any Solana address.

        Returns the balance in both SOL and lamports."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "address": {
                    "type": "string",
                    "description": "Solana address to check balance for",
                },
            },
            "required": ["address"],
        }

    async def execute(self, address: str) -> ToolResult:
        cdp = get_cdp_client()
        if cdp is None:
            return ToolResult(
                success=False,
                error="CDP client not configured."
            )

        try:
            result = await cdp.get_balance(address)
            content = f"Balance for {result['address']}:\n"
            content += f"  {result['balance_sol']:.6f} SOL\n"
            content += f"  ({result['balance_lamports']:,} lamports)"

            return ToolResult(success=True, content=content)
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get balance: {str(e)}")


class CDPSendSOLTool(Tool):
    """Tool to send SOL from a CDP-managed account."""

    @property
    def name(self) -> str:
        return "cdp_send_sol"

    @property
    def description(self) -> str:
        return """Send SOL from a CDP-managed account to another address.

        This uses CDP to securely sign and send a transaction without exposing private keys.
        Works with CDP-managed accounts on devnet.

        Returns transaction signature and explorer link."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "from_address": {
                    "type": "string",
                    "description": "Sender address (must be a CDP-managed account)",
                },
                "to_address": {
                    "type": "string",
                    "description": "Recipient address (any valid Solana address)",
                },
                "sol_amount": {
                    "type": "number",
                    "description": "Amount of SOL to send (e.g., 0.001 for 0.001 SOL)",
                },
            },
            "required": ["from_address", "to_address", "sol_amount"],
        }

    async def execute(self, from_address: str, to_address: str, sol_amount: float) -> ToolResult:
        cdp = get_cdp_client()
        if cdp is None:
            return ToolResult(
                success=False,
                error="CDP client not configured."
            )

        try:
            # Convert SOL to lamports
            lamports = int(sol_amount * 1e9)

            result = await cdp.send_sol(
                from_address=from_address,
                to_address=to_address,
                lamports=lamports,
            )

            content = "✓ Transaction successful!\n"
            content += f"  From: {result['from_address']}\n"
            content += f"  To: {result['to_address']}\n"
            content += f"  Amount: {result['sol_amount']:.6f} SOL\n"
            content += f"  Signature: {result['signature']}\n"
            content += f"  Explorer: {result['explorer_url']}"

            return ToolResult(success=True, content=content)
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to send SOL: {str(e)}")


class CDPListAccountsTool(Tool):
    """Tool to list all CDP-managed Solana accounts."""

    @property
    def name(self) -> str:
        return "cdp_list_accounts"

    @property
    def description(self) -> str:
        return """List all Solana accounts managed by CDP in this project.

        Returns a list of account addresses and their names (if set)."""

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }

    async def execute(self) -> ToolResult:
        cdp = get_cdp_client()
        if cdp is None:
            return ToolResult(
                success=False,
                error="CDP client not configured."
            )

        try:
            accounts = await cdp.list_accounts()

            if not accounts:
                return ToolResult(success=True, content="No CDP accounts found.")

            content = f"CDP-Managed Solana Accounts ({len(accounts)}):\n\n"
            for i, acc in enumerate(accounts, 1):
                content += f"{i}. {acc['address']}"
                if acc.get('name'):
                    content += f" (Name: {acc['name']})"
                content += "\n"

            return ToolResult(success=True, content=content)
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to list accounts: {str(e)}")


# ============================================================
# COINGECKO TOOLS - Real-time Cryptocurrency Market Data
# ============================================================

class GetCryptoPriceTool(Tool):
    """Get current prices for cryptocurrencies."""

    @property
    def name(self) -> str:
        return "get_crypto_price"

    @property
    def description(self) -> str:
        return "Get current prices, market cap, volume, and 24hr change for cryptocurrencies by their IDs (e.g., 'bitcoin', 'ethereum', 'solana')."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Coin IDs (e.g., ['bitcoin', 'ethereum', 'solana'])"
                },
                "vs_currency": {
                    "type": "string",
                    "description": "Target currency (default: usd)",
                    "default": "usd"
                }
            },
            "required": ["coin_ids"]
        }

    async def execute(self, coin_ids: list[str], vs_currency: str = "usd") -> ToolResult:
        cg = get_coingecko_client()
        if cg is None:
            return ToolResult(success=False, error="CoinGecko client not configured. Set COINGECKO_API_KEY in .env")

        try:
            data = await cg.get_price(
                coin_ids=coin_ids,
                vs_currencies=[vs_currency],
                include_market_cap=True,
                include_24hr_vol=True,
                include_24hr_change=True
            )

            content = f"💰 Cryptocurrency Prices ({vs_currency.upper()}):\n\n"
            for coin_id in coin_ids:
                if coin_id in data:
                    coin_data = data[coin_id]
                    price = coin_data.get(vs_currency, 0)
                    mcap = coin_data.get(f"{vs_currency}_market_cap", 0)
                    vol = coin_data.get(f"{vs_currency}_24h_vol", 0)
                    change = coin_data.get(f"{vs_currency}_24h_change", 0)

                    content += f"🪙 {coin_id.upper()}\n"
                    content += f"  Price: ${price:,.2f}\n"
                    if mcap:
                        content += f"  Market Cap: ${mcap:,.0f}\n"
                    if vol:
                        content += f"  24h Volume: ${vol:,.0f}\n"
                    if change is not None:
                        emoji = "📈" if change > 0 else "📉"
                        content += f"  24h Change: {emoji} {change:.2f}%\n"
                    content += "\n"
                else:
                    content += f"❌ {coin_id}: Not found\n\n"

            return ToolResult(success=True, content=content)
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get prices: {str(e)}")


class GetCoinMarketDataTool(Tool):
    """Get detailed market data for cryptocurrencies."""

    @property
    def name(self) -> str:
        return "get_coin_market_data"

    @property
    def description(self) -> str:
        return "Get comprehensive market data for cryptocurrencies including price, market cap, volume, supply, ATH/ATL, and more."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "vs_currency": {
                    "type": "string",
                    "description": "Target currency (default: usd)",
                    "default": "usd"
                },
                "coin_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by specific coin IDs (optional)",
                    "default": None
                },
                "category": {
                    "type": "string",
                    "description": "Filter by category (e.g., 'layer-1', 'meme-token', 'defi')",
                    "default": None
                },
                "order": {
                    "type": "string",
                    "description": "Sort order: market_cap_desc, volume_desc, etc.",
                    "default": "market_cap_desc"
                },
                "per_page": {
                    "type": "integer",
                    "description": "Results per page (max 250)",
                    "default": 10
                }
            },
            "required": []
        }

    async def execute(
        self,
        vs_currency: str = "usd",
        coin_ids: Optional[list[str]] = None,
        category: Optional[str] = None,
        order: str = "market_cap_desc",
        per_page: int = 10
    ) -> ToolResult:
        cg = get_coingecko_client()
        if cg is None:
            return ToolResult(success=False, error="CoinGecko client not configured. Set COINGECKO_API_KEY in .env")

        try:
            data = await cg.get_coin_markets(
                vs_currency=vs_currency,
                ids=coin_ids,
                category=category,
                order=order,
                per_page=min(per_page, 250),
                price_change_percentage="1h,24h,7d"
            )

            if not data:
                return ToolResult(success=True, content="No market data found.")

            content = f"📊 Cryptocurrency Market Data ({vs_currency.upper()}):\n\n"
            for i, coin in enumerate(data, 1):
                content += f"{i}. {coin['name']} ({coin['symbol'].upper()})\n"
                content += f"   Price: ${coin['current_price']:,.2f}\n"
                content += f"   Market Cap: ${coin['market_cap']:,.0f} (Rank #{coin['market_cap_rank']})\n"
                content += f"   24h Volume: ${coin['total_volume']:,.0f}\n"

                if coin.get('price_change_percentage_1h_in_currency') is not None:
                    change_1h = coin['price_change_percentage_1h_in_currency']
                    emoji = "📈" if change_1h > 0 else "📉"
                    content += f"   1h Change: {emoji} {change_1h:.2f}%\n"

                if coin.get('price_change_percentage_24h') is not None:
                    change_24h = coin['price_change_percentage_24h']
                    emoji = "📈" if change_24h > 0 else "📉"
                    content += f"   24h Change: {emoji} {change_24h:.2f}%\n"

                if coin.get('price_change_percentage_7d_in_currency') is not None:
                    change_7d = coin['price_change_percentage_7d_in_currency']
                    emoji = "📈" if change_7d > 0 else "📉"
                    content += f"   7d Change: {emoji} {change_7d:.2f}%\n"

                content += "\n"

            return ToolResult(success=True, content=content)
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get market data: {str(e)}")


class GetTrendingCryptosTool(Tool):
    """Get trending cryptocurrencies in the last 24 hours."""

    @property
    def name(self) -> str:
        return "get_trending_cryptos"

    @property
    def description(self) -> str:
        return "Get the top trending cryptocurrencies based on search activity in the last 24 hours."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": []
        }

    async def execute(self) -> ToolResult:
        cg = get_coingecko_client()
        if cg is None:
            return ToolResult(success=False, error="CoinGecko client not configured. Set COINGECKO_API_KEY in .env")

        try:
            data = await cg.get_trending()
            coins = data.get('coins', [])

            if not coins:
                return ToolResult(success=True, content="No trending coins found.")

            content = "🔥 Trending Cryptocurrencies (Last 24h):\n\n"
            for i, item in enumerate(coins, 1):
                coin = item.get('item', {})
                content += f"{i}. {coin.get('name')} ({coin.get('symbol', '').upper()})\n"
                content += f"   Rank: #{coin.get('market_cap_rank', 'N/A')}\n"

                if coin.get('price_btc'):
                    content += f"   Price (BTC): {coin['price_btc']:.10f}\n"

                if coin.get('data', {}).get('price'):
                    price_usd = coin['data']['price']
                    content += f"   Price (USD): ${price_usd:,.8f}\n"

                if coin.get('data', {}).get('price_change_percentage_24h'):
                    change = coin['data']['price_change_percentage_24h'].get('usd', 0)
                    emoji = "📈" if change > 0 else "📉"
                    content += f"   24h Change: {emoji} {change:.2f}%\n"

                content += "\n"

            return ToolResult(success=True, content=content)
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get trending cryptos: {str(e)}")


class SearchCryptoTool(Tool):
    """Search for cryptocurrencies by name or symbol."""

    @property
    def name(self) -> str:
        return "search_crypto"

    @property
    def description(self) -> str:
        return "Search for cryptocurrencies, categories, and markets by name or symbol. Returns coin IDs needed for other CoinGecko tools."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (coin name or symbol)"
                }
            },
            "required": ["query"]
        }

    async def execute(self, query: str) -> ToolResult:
        cg = get_coingecko_client()
        if cg is None:
            return ToolResult(success=False, error="CoinGecko client not configured. Set COINGECKO_API_KEY in .env")

        try:
            data = await cg.search_coins(query)
            coins = data.get('coins', [])

            if not coins:
                return ToolResult(success=True, content=f"No results found for '{query}'.")

            content = f"🔍 Search Results for '{query}':\n\n"
            for i, coin in enumerate(coins[:10], 1):  # Limit to top 10 results
                content += f"{i}. {coin['name']} ({coin['symbol'].upper()})\n"
                content += f"   ID: {coin['id']}\n"
                content += f"   Rank: #{coin.get('market_cap_rank', 'N/A')}\n"
                content += "\n"

            if len(coins) > 10:
                content += f"... and {len(coins) - 10} more results\n"

            return ToolResult(success=True, content=content)
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to search: {str(e)}")


class GetGlobalCryptoStatsTool(Tool):
    """Get global cryptocurrency market statistics."""

    @property
    def name(self) -> str:
        return "get_global_crypto_stats"

    @property
    def description(self) -> str:
        return "Get global cryptocurrency market data including total market cap, volume, BTC dominance, and market trends."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": []
        }

    async def execute(self) -> ToolResult:
        cg = get_coingecko_client()
        if cg is None:
            return ToolResult(success=False, error="CoinGecko client not configured. Set COINGECKO_API_KEY in .env")

        try:
            data = await cg.get_global_data()
            global_data = data.get('data', {})

            content = "🌍 Global Cryptocurrency Market Statistics:\n\n"

            total_mcap = global_data.get('total_market_cap', {}).get('usd', 0)
            total_vol = global_data.get('total_volume', {}).get('usd', 0)
            btc_dominance = global_data.get('market_cap_percentage', {}).get('btc', 0)
            eth_dominance = global_data.get('market_cap_percentage', {}).get('eth', 0)
            active_cryptos = global_data.get('active_cryptocurrencies', 0)
            markets = global_data.get('markets', 0)

            content += f"💰 Total Market Cap: ${total_mcap:,.0f}\n"
            content += f"📊 Total 24h Volume: ${total_vol:,.0f}\n"
            content += f"₿ BTC Dominance: {btc_dominance:.2f}%\n"
            content += f"Ξ ETH Dominance: {eth_dominance:.2f}%\n"
            content += f"🪙 Active Cryptocurrencies: {active_cryptos:,}\n"
            content += f"🏪 Markets: {markets:,}\n"

            mcap_change = global_data.get('market_cap_change_percentage_24h_usd', 0)
            if mcap_change:
                emoji = "📈" if mcap_change > 0 else "📉"
                content += f"\n24h Market Cap Change: {emoji} {mcap_change:.2f}%\n"

            return ToolResult(success=True, content=content)
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get global stats: {str(e)}")


# ==============================================
# PumpFun Tools
# ==============================================

class PumpFunLaunchTokenTool(Tool):
    """Tool to launch a new token on pump.fun bonding curve."""

    @property
    def name(self) -> str:
        return "pumpfun_launch_token"

    @property
    def description(self) -> str:
        return """Launch a new token on pump.fun with a bonding curve.

        Creates a new SPL token that is instantly tradeable on pump.fun's bonding curve.
        When the token hits ~$69k market cap, liquidity automatically migrates to Raydium.

        Examples:
        - "Launch a memecoin called PEPE2 on pump.fun"
        - "Create a pump.fun token with name CatCoin, symbol CAT"
        """

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Token name (e.g., 'Doge Coin')",
                },
                "symbol": {
                    "type": "string",
                    "description": "Token symbol/ticker (e.g., 'DOGE')",
                },
                "description": {
                    "type": "string",
                    "description": "Token description",
                },
                "image_url": {
                    "type": "string",
                    "description": "URL to token image (optional if image_path provided)",
                },
                "image_path": {
                    "type": "string",
                    "description": "Local path to token image file (optional if image_url provided)",
                },
                "twitter": {
                    "type": "string",
                    "description": "Twitter/X URL (optional)",
                },
                "telegram": {
                    "type": "string",
                    "description": "Telegram URL (optional)",
                },
                "website": {
                    "type": "string",
                    "description": "Website URL (optional)",
                },
                "initial_buy_sol": {
                    "type": "number",
                    "description": "Initial buy amount in SOL (default: 0)",
                },
            },
            "required": ["name", "symbol", "description"],
        }

    async def execute(
        self,
        name: str,
        symbol: str,
        description: str,
        image_url: Optional[str] = None,
        image_path: Optional[str] = None,
        twitter: Optional[str] = None,
        telegram: Optional[str] = None,
        website: Optional[str] = None,
        initial_buy_sol: float = 0.0,
    ) -> ToolResult:
        try:
            pumpfun = get_pumpfun_client()
            if pumpfun is None:
                return ToolResult(
                    success=False,
                    error="PumpFun client not configured. Set PRIVATE_KEY and RPC_URL."
                )

            result = await pumpfun.create_token(
                name=name,
                symbol=symbol,
                description=description,
                image_url=image_url,
                image_path=image_path,
                twitter=twitter,
                telegram=telegram,
                website=website,
                initial_buy_sol=initial_buy_sol,
            )

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "mint": str(result.mint),
                    "bonding_curve": str(result.bonding_curve),
                    "signature": result.signature,
                    "token_url": result.token_url,
                    "message": f"Token {name} ({symbol}) launched on pump.fun! View at {result.token_url}"
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to launch token: {str(e)}")


class PumpFunBuyTool(Tool):
    """Tool to buy tokens from a pump.fun bonding curve."""

    @property
    def name(self) -> str:
        return "pumpfun_buy"

    @property
    def description(self) -> str:
        return """Buy tokens from a pump.fun bonding curve using SOL.

        Only works for tokens still on the bonding curve (not yet migrated to Raydium).
        Uses constant product AMM formula for pricing.

        Examples:
        - "Buy 0.1 SOL worth of token ABC123..."
        - "Purchase pump.fun token with mint address..."
        """

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "mint": {
                    "type": "string",
                    "description": "Token mint address",
                },
                "sol_amount": {
                    "type": "number",
                    "description": "Amount of SOL to spend",
                },
                "slippage_bps": {
                    "type": "integer",
                    "description": "Slippage tolerance in basis points (default: 500 = 5%)",
                },
            },
            "required": ["mint", "sol_amount"],
        }

    async def execute(
        self,
        mint: str,
        sol_amount: float,
        slippage_bps: int = 500,
    ) -> ToolResult:
        try:
            pumpfun = get_pumpfun_client()
            if pumpfun is None:
                return ToolResult(
                    success=False,
                    error="PumpFun client not configured. Set PRIVATE_KEY and RPC_URL."
                )

            from solders.pubkey import Pubkey
            mint_pubkey = Pubkey.from_string(mint)

            signature = await pumpfun.buy(
                mint=mint_pubkey,
                sol_amount=sol_amount,
                slippage_bps=slippage_bps,
            )

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "action": "buy",
                    "mint": mint,
                    "sol_amount": sol_amount,
                    "signature": signature,
                    "message": f"Bought tokens with {sol_amount} SOL"
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to buy: {str(e)}")


class PumpFunSellTool(Tool):
    """Tool to sell tokens to a pump.fun bonding curve."""

    @property
    def name(self) -> str:
        return "pumpfun_sell"

    @property
    def description(self) -> str:
        return """Sell tokens to a pump.fun bonding curve for SOL.

        Only works for tokens still on the bonding curve (not yet migrated to Raydium).

        Examples:
        - "Sell 1000000 tokens of ABC123..."
        - "Dump my pump.fun tokens"
        """

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "mint": {
                    "type": "string",
                    "description": "Token mint address",
                },
                "token_amount": {
                    "type": "integer",
                    "description": "Amount of tokens to sell (in smallest unit)",
                },
                "slippage_bps": {
                    "type": "integer",
                    "description": "Slippage tolerance in basis points (default: 500 = 5%)",
                },
            },
            "required": ["mint", "token_amount"],
        }

    async def execute(
        self,
        mint: str,
        token_amount: int,
        slippage_bps: int = 500,
    ) -> ToolResult:
        try:
            pumpfun = get_pumpfun_client()
            if pumpfun is None:
                return ToolResult(
                    success=False,
                    error="PumpFun client not configured. Set PRIVATE_KEY and RPC_URL."
                )

            from solders.pubkey import Pubkey
            mint_pubkey = Pubkey.from_string(mint)

            signature = await pumpfun.sell(
                mint=mint_pubkey,
                token_amount=token_amount,
                slippage_bps=slippage_bps,
            )

            return ToolResult(
                success=True,
                content=json.dumps({
                    "status": "success",
                    "action": "sell",
                    "mint": mint,
                    "token_amount": token_amount,
                    "signature": signature,
                    "message": f"Sold {token_amount} tokens"
                }, indent=2)
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to sell: {str(e)}")


class PumpFunGetPriceTool(Tool):
    """Tool to get current price and stats for a pump.fun token."""

    @property
    def name(self) -> str:
        return "pumpfun_get_price"

    @property
    def description(self) -> str:
        return """Get current price and bonding curve stats for a pump.fun token.

        Returns price, market cap, progress to graduation (Raydium migration).
        Only works for tokens on pump.fun bonding curve.

        Examples:
        - "Get price of pump.fun token ABC123..."
        - "Check pump.fun bonding curve status"
        """

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "mint": {
                    "type": "string",
                    "description": "Token mint address",
                },
            },
            "required": ["mint"],
        }

    async def execute(self, mint: str) -> ToolResult:
        try:
            pumpfun = get_pumpfun_client()
            if pumpfun is None:
                return ToolResult(
                    success=False,
                    error="PumpFun client not configured. Set PRIVATE_KEY and RPC_URL."
                )

            from solders.pubkey import Pubkey
            mint_pubkey = Pubkey.from_string(mint)

            price_data = await pumpfun.get_token_price(mint_pubkey)

            if price_data is None:
                return ToolResult(
                    success=False,
                    error="Token not found on pump.fun bonding curve"
                )

            # Format output
            content = f"🎢 Pump.fun Token Stats\n\n"
            content += f"💰 Price: {price_data['price_per_token_sol']:.10f} SOL\n"
            content += f"📊 Market Cap: {price_data['market_cap_sol']:.2f} SOL\n"
            content += f"📈 Progress: {price_data['progress_percent']:.2f}%\n"
            content += f"💧 Virtual SOL: {price_data['virtual_sol_reserves']:.4f}\n"
            content += f"🪙 Real Token Reserves: {price_data['real_token_reserves']:,}\n"

            if price_data['complete']:
                content += "\n✅ Bonding curve COMPLETE - Token migrated to Raydium"
            else:
                content += f"\n⏳ {100 - price_data['progress_percent']:.2f}% to graduation"

            return ToolResult(
                success=True,
                content=content
            )
        except Exception as e:
            return ToolResult(success=False, error=f"Failed to get price: {str(e)}")


# Export all tools
ALL_SOLANA_TOOLS = [
    GetWalletBalanceTool,
    GetTokenPriceTool,
    GetTokenInfoTool,
    GetSwapQuoteTool,
    BuyTokenTool,
    SellTokenTool,
    GetPortfolioTool,
    GetTrendingTokensTool,
    SearchTokenTool,
    GetWalletNetWorthTool,
    GetWalletNetWorthChartTool,
    GetWalletPnLTool,
    GetTokenChartTool,
    AnalyzeTokenSecurityTool,
    LaunchTokenTool,
    PostToTwitterTool,
    GenerateImageTool,
    GenerateMusicTool,
    GenerateVideoTool,
    TextToSpeechTool,
    WebSearchTool,
    AnalyzeSolanaAddressTool,
    # Aster DEX Tools
    AsterOpenLongTool,
    AsterOpenShortTool,
    AsterClosePerpPositionTool,
    AsterGetPositionsTool,
    AsterSetLeverageTool,
    AsterSpotBuyTool,
    AsterSpotSellTool,
    AsterGetBalanceTool,
    AsterTransferTool,
    AsterGetPriceTool,
    # Hyperliquid DEX Tools
    HyperliquidGetAccountTool,
    HyperliquidGetPriceTool,
    HyperliquidOpenLongTool,
    HyperliquidOpenShortTool,
    HyperliquidClosePositionTool,
    HyperliquidGetPositionsTool,
    HyperliquidSetLeverageTool,
    HyperliquidPlaceLimitOrderTool,
    HyperliquidCancelOrderTool,
    HyperliquidGetOpenOrdersTool,
    HyperliquidGetTradeHistoryTool,
    HyperliquidGetAvailableCoinsTool,
    HyperliquidTransferTool,
    HyperliquidGetAssetIdsTool,
    HyperliquidSpotOrderTool,
    # CDP Tools
    CDPCreateAccountTool,
    CDPRequestFaucetTool,
    CDPGetBalanceTool,
    CDPSendSOLTool,
    CDPListAccountsTool,
    # CoinGecko Tools
    GetCryptoPriceTool,
    GetCoinMarketDataTool,
    GetTrendingCryptosTool,
    SearchCryptoTool,
    GetGlobalCryptoStatsTool,
    # PumpFun Tools
    PumpFunLaunchTokenTool,
    PumpFunBuyTool,
    PumpFunSellTool,
    PumpFunGetPriceTool,
]


def create_all_tools() -> list[Tool]:
    """Create instances of all Solana trading tools."""
    return [ToolCls() for ToolCls in ALL_SOLANA_TOOLS]
