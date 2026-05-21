"""Solana Trading Tools for MAWD Agent"""

import json
from typing import Any, Optional

from .base import Tool, ToolResult


# Global client instances (set during agent initialization)
_bags_client = None
_helius_client = None
_birdeye_client = None
_cdp_client = None
_hyperliquid_client = None


def set_solana_clients(bags_client=None, helius_client=None, birdeye_client=None, cdp_client=None, hyperliquid_client=None):
    """Set the global client instances for tools to use."""
    global _bags_client, _helius_client, _birdeye_client, _cdp_client, _hyperliquid_client
    _bags_client = bags_client
    _helius_client = helius_client
    _birdeye_client = birdeye_client
    _cdp_client = cdp_client
    _hyperliquid_client = hyperliquid_client


def get_bags_client():
    if _bags_client is None:
        raise RuntimeError("BagsClient not initialized")
    return _bags_client


def get_helius_client():
    if _helius_client is None:
        raise RuntimeError("HeliusClient not initialized")
    return _helius_client


def get_birdeye_client():
    if _birdeye_client is None:
        raise RuntimeError("BirdeyeClient not initialized")
    return _birdeye_client


def get_cdp_client():
    if _cdp_client is None:
        raise RuntimeError("CDPClient not initialized - check CDP credentials in .env")
    return _cdp_client


def get_hyperliquid_client():
    if _hyperliquid_client is None:
        raise RuntimeError("HyperliquidClient not initialized - check HYPERLIQUID credentials in .env")
    return _hyperliquid_client


class GetWalletBalanceTool(Tool):
    """Tool to get wallet SOL and token balances."""
    
    @property
    def name(self) -> str:
        return "get_wallet_balance"
    
    @property
    def description(self) -> str:
        return "Get SOL balance and token holdings for a Solana wallet. Uses agent wallet if none provided."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_address": {
                    "type": "string",
                    "description": "Solana wallet address. Optional - uses agent wallet if not provided.",
                }
            },
            "required": [],
        }
    
    async def execute(self, wallet_address: str = None) -> ToolResult:
        try:
            helius = get_helius_client()
            bags = get_bags_client()
            
            address = wallet_address or bags.wallet_pubkey
            if not address:
                return ToolResult(success=False, error="No wallet address provided")
            
            sol_balance = await helius.get_sol_balance(address)
            token_balances = await helius.get_token_accounts_by_owner(address)
            
            result = {
                "wallet": address,
                "sol_balance": sol_balance,
                "tokens": [
                    {"mint": tb.mint, "amount": tb.ui_amount, "decimals": tb.decimals}
                    for tb in token_balances if tb.ui_amount > 0
                ]
            }
            
            return ToolResult(success=True, content=json.dumps(result, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetTokenPriceTool(Tool):
    """Tool to get current token price."""
    
    @property
    def name(self) -> str:
        return "get_token_price"
    
    @property
    def description(self) -> str:
        return "Get current price and 24h change for a Solana token by mint address."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_mint": {
                    "type": "string",
                    "description": "Token mint address.",
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
            return ToolResult(success=True, content=json.dumps(result, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetTokenInfoTool(Tool):
    """Tool to get comprehensive token information."""
    
    @property
    def name(self) -> str:
        return "get_token_info"
    
    @property
    def description(self) -> str:
        return "Get comprehensive token info: name, symbol, price, volume, liquidity, market cap, holders."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_mint": {"type": "string", "description": "Token mint address."}
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
                "holder_count": overview.holder_count,
            }
            return ToolResult(success=True, content=json.dumps(result, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetSwapQuoteTool(Tool):
    """Tool to get a swap quote without executing."""
    
    @property
    def name(self) -> str:
        return "get_swap_quote"
    
    @property
    def description(self) -> str:
        return "Get swap quote to check expected output before trading. SOL mint: So11111111111111111111111111111111111111112"
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "input_mint": {"type": "string", "description": "Input token mint."},
                "output_mint": {"type": "string", "description": "Output token mint."},
                "amount": {"type": "number", "description": "Amount in smallest unit (lamports)."},
                "slippage_bps": {"type": "integer", "description": "Slippage (100=1%). Default 300.", "default": 300},
            },
            "required": ["input_mint", "output_mint", "amount"],
        }
    
    async def execute(self, input_mint: str, output_mint: str, amount: int, slippage_bps: int = 300) -> ToolResult:
        try:
            bags = get_bags_client()
            quote = await bags.get_quote(input_mint, output_mint, int(amount), slippage_bps)
            
            result = {
                "input_mint": quote.input_mint,
                "output_mint": quote.output_mint,
                "input_amount": quote.in_amount,
                "output_amount": quote.out_amount,
                "min_output": quote.min_out_amount,
                "price_impact_pct": quote.price_impact_pct,
                "slippage_bps": quote.slippage_bps,
            }
            return ToolResult(success=True, content=json.dumps(result, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class BuyTokenTool(Tool):
    """Tool to buy a token with SOL."""
    
    @property
    def name(self) -> str:
        return "buy_token"
    
    @property
    def description(self) -> str:
        return "⚠️ EXECUTES REAL TRADE - Buy tokens with SOL. Returns transaction signature."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_mint": {"type": "string", "description": "Token to buy."},
                "sol_amount": {"type": "number", "description": "SOL to spend."},
                "slippage_bps": {"type": "integer", "description": "Slippage (100=1%). Default 300.", "default": 300},
            },
            "required": ["token_mint", "sol_amount"],
        }
    
    async def execute(self, token_mint: str, sol_amount: float, slippage_bps: int = 300) -> ToolResult:
        try:
            bags = get_bags_client()
            if bags.keypair is None:
                return ToolResult(success=False, error="No wallet configured for trading")
            
            result = await bags.buy_token(token_mint, sol_amount, slippage_bps)
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "signature": result["signature"],
                "sol_spent": result["quote"]["in_amount"],
                "tokens_received": result["quote"]["out_amount"],
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class SellTokenTool(Tool):
    """Tool to sell a token for SOL."""
    
    @property
    def name(self) -> str:
        return "sell_token"
    
    @property
    def description(self) -> str:
        return "⚠️ EXECUTES REAL TRADE - Sell tokens for SOL. Returns transaction signature."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_mint": {"type": "string", "description": "Token to sell."},
                "token_amount": {"type": "integer", "description": "Amount in smallest unit."},
                "slippage_bps": {"type": "integer", "description": "Slippage (100=1%). Default 300.", "default": 300},
            },
            "required": ["token_mint", "token_amount"],
        }
    
    async def execute(self, token_mint: str, token_amount: int, slippage_bps: int = 300) -> ToolResult:
        try:
            bags = get_bags_client()
            if bags.keypair is None:
                return ToolResult(success=False, error="No wallet configured for trading")
            
            result = await bags.sell_token(token_mint, int(token_amount), slippage_bps)
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "signature": result["signature"],
                "tokens_sold": result["quote"]["in_amount"],
                "sol_received": result["quote"]["out_amount"],
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetPortfolioTool(Tool):
    """Tool to get wallet portfolio with USD values."""
    
    @property
    def name(self) -> str:
        return "get_portfolio"
    
    @property
    def description(self) -> str:
        return "Get complete portfolio with all tokens and USD values."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "wallet_address": {"type": "string", "description": "Wallet. Optional - uses agent wallet."}
            },
            "required": [],
        }
    
    async def execute(self, wallet_address: str = None) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            bags = get_bags_client()
            address = wallet_address or bags.wallet_pubkey
            if not address:
                return ToolResult(success=False, error="No wallet address")
            
            portfolio = await birdeye.get_wallet_portfolio(address)
            return ToolResult(success=True, content=json.dumps({"wallet": address, "portfolio": portfolio}, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetTrendingTokensTool(Tool):
    """Tool to get trending tokens."""
    
    @property
    def name(self) -> str:
        return "get_trending_tokens"
    
    @property
    def description(self) -> str:
        return "Get trending Solana tokens sorted by volume, market cap, or liquidity."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "sort_by": {"type": "string", "description": "Sort: v24hUSD (volume), mc (market cap), liquidity.", "default": "v24hUSD"},
                "limit": {"type": "integer", "description": "Max tokens. Default 20.", "default": 20},
            },
            "required": [],
        }
    
    async def execute(self, sort_by: str = "v24hUSD", limit: int = 20) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            # Map user-friendly names to API params
            sort_map = {
                "volume24h": "v24hUSD",
                "volume": "v24hUSD",
                "rank": "v24hUSD",
                "marketcap": "mc",
                "market_cap": "mc",
            }
            api_sort = sort_map.get(sort_by.lower(), sort_by)
            tokens = await birdeye.get_trending_tokens(sort_by=api_sort, sort_type="desc", limit=limit)
            return ToolResult(success=True, content=json.dumps({"trending_tokens": tokens, "count": len(tokens) if isinstance(tokens, list) else 0}, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class SearchTokenTool(Tool):
    """Tool to search for tokens."""
    
    @property
    def name(self) -> str:
        return "search_token"
    
    @property
    def description(self) -> str:
        return "Search for Solana tokens by name or symbol. Returns mint addresses."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Token name or symbol."},
                "limit": {"type": "integer", "description": "Max results. Default 10.", "default": 10},
            },
            "required": ["query"],
        }
    
    async def execute(self, query: str, limit: int = 10) -> ToolResult:
        try:
            birdeye = get_birdeye_client()
            results = await birdeye.search_token(query, limit=limit)
            return ToolResult(success=True, content=json.dumps({"query": query, "results": results}, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class LaunchTokenTool(Tool):
    """Tool to launch a new token on Solana via Bags."""
    
    @property
    def name(self) -> str:
        return "launch_token"
    
    @property
    def description(self) -> str:
        return "⚠️ LAUNCHES REAL TOKEN - Create and launch a new token on Solana via Bags/Meteora. Returns mint address and launch URL."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Token name (e.g., 'My Token')"},
                "symbol": {"type": "string", "description": "Token symbol (e.g., 'MYT')"},
                "description": {"type": "string", "description": "Token description"},
                "image_url": {"type": "string", "description": "URL to token image"},
                "initial_buy_sol": {"type": "number", "description": "Initial SOL to buy. Default 0.01", "default": 0.01},
                "twitter": {"type": "string", "description": "Twitter/X URL (optional)"},
                "website": {"type": "string", "description": "Website URL (optional)"},
                "telegram": {"type": "string", "description": "Telegram URL (optional)"},
            },
            "required": ["name", "symbol", "description", "image_url"],
        }
    
    async def execute(
        self, 
        name: str, 
        symbol: str, 
        description: str, 
        image_url: str,
        initial_buy_sol: float = 0.01,
        twitter: str = None,
        website: str = None,
        telegram: str = None,
    ) -> ToolResult:
        try:
            bags = get_bags_client()
            if bags.keypair is None:
                return ToolResult(success=False, error="No wallet configured for launching tokens")
            
            result = await bags.launch_token(
                name=name,
                symbol=symbol,
                description=description,
                image_url=image_url,
                initial_buy_sol=initial_buy_sol,
                twitter=twitter,
                website=website,
                telegram=telegram,
            )
            
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "token_mint": result["token_mint"],
                "token_url": result["token_url"],
                "signature": result["signature"],
                "metadata_uri": result["metadata_uri"],
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class GetClaimableFeesTool(Tool):
    """Tool to get claimable fees from tokens."""
    
    @property
    def name(self) -> str:
        return "get_claimable_fees"
    
    @property
    def description(self) -> str:
        return "Get all claimable fee positions from tokens you have fee shares in."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }
    
    async def execute(self) -> ToolResult:
        try:
            bags = get_bags_client()
            positions = await bags.get_claimable_fees()
            return ToolResult(success=True, content=json.dumps({
                "positions": positions,
                "count": len(positions),
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class ClaimFeesTool(Tool):
    """Tool to claim fees from a token."""
    
    @property
    def name(self) -> str:
        return "claim_fees"
    
    @property
    def description(self) -> str:
        return "⚠️ EXECUTES TRANSACTION - Claim accumulated fees from token positions."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "token_mint": {"type": "string", "description": "Token mint to claim fees from (optional, claims all if not specified)"},
            },
            "required": [],
        }
    
    async def execute(self, token_mint: str = None) -> ToolResult:
        try:
            bags = get_bags_client()
            if bags.keypair is None:
                return ToolResult(success=False, error="No wallet configured for claiming fees")
            
            positions = await bags.get_claimable_fees()
            
            if token_mint:
                positions = [p for p in positions if p.get("baseMint") == token_mint]
            
            if not positions:
                return ToolResult(success=True, content=json.dumps({"message": "No claimable positions found"}))
            
            signatures = []
            for position in positions:
                sig = await bags.claim_fees(position)
                if sig:
                    signatures.append(sig)
            
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "claimed_positions": len(signatures),
                "signatures": signatures,
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


# ============================================================
# CDP (Coinbase Developer Platform) Tools  
# ============================================================

class CDPCreateAccountTool(Tool):
    """Tool to create a new CDP-managed Solana account."""
    
    @property
    def name(self) -> str:
        return "cdp_create_account"
    
    @property
    def description(self) -> str:
        return "Create a new Solana account managed by Coinbase Developer Platform (CDP). Returns the new account address."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Optional name/label for the account."}
            },
            "required": [],
        }
    
    async def execute(self, name: str = None) -> ToolResult:
        try:
            cdp = get_cdp_client()
            result = await cdp.create_account(name=name)
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "address": result["address"],
                "name": result.get("name"),
                "network": "solana-devnet",
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class CDPRequestFaucetTool(Tool):
    """Tool to request devnet SOL from faucet."""
    
    @property
    def name(self) -> str:
        return "cdp_request_faucet"
    
    @property
    def description(self) -> str:
        return "Request free devnet SOL tokens from the faucet for a CDP account. Only works on devnet."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "Solana address to fund. Uses first CDP account if not provided."}
            },
            "required": [],
        }
    
    async def execute(self, address: str = None) -> ToolResult:
        try:
            cdp = get_cdp_client()
            result = await cdp.request_faucet(address=address)
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "address": result["address"],
                "transaction": result.get("tx_hash"),
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class CDPGetBalanceTool(Tool):
    """Tool to get SOL balance for a CDP account."""
    
    @property
    def name(self) -> str:
        return "cdp_get_balance"
    
    @property
    def description(self) -> str:
        return "Get the SOL balance for a Solana address using CDP."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "Solana address to check balance for."}
            },
            "required": ["address"],
        }
    
    async def execute(self, address: str) -> ToolResult:
        try:
            cdp = get_cdp_client()
            result = await cdp.get_balance(address=address)
            return ToolResult(success=True, content=json.dumps({
                "address": address,
                "balance_sol": result.get("balance", 0),
                "balance_lamports": result.get("lamports", 0),
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class CDPSendSOLTool(Tool):
    """Tool to send SOL using CDP for signing."""
    
    @property
    def name(self) -> str:
        return "cdp_send_sol"
    
    @property
    def description(self) -> str:
        return "⚠️ EXECUTES REAL TRANSACTION - Send SOL from a CDP-managed account to another address."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "from_address": {"type": "string", "description": "Source CDP-managed Solana address."},
                "to_address": {"type": "string", "description": "Destination Solana address."},
                "amount_sol": {"type": "number", "description": "Amount of SOL to send."},
            },
            "required": ["from_address", "to_address", "amount_sol"],
        }
    
    async def execute(self, from_address: str, to_address: str, amount_sol: float) -> ToolResult:
        try:
            cdp = get_cdp_client()
            result = await cdp.send_sol(from_address=from_address, to_address=to_address, amount_sol=amount_sol)
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "from": from_address,
                "to": to_address,
                "amount_sol": amount_sol,
                "signature": result.get("signature"),
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class CDPListAccountsTool(Tool):
    """Tool to list all CDP-managed accounts."""
    
    @property
    def name(self) -> str:
        return "cdp_list_accounts"
    
    @property
    def description(self) -> str:
        return "List all Solana accounts managed by CDP."
    
    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }
    
    async def execute(self) -> ToolResult:
        try:
            cdp = get_cdp_client()
            result = await cdp.list_accounts()
            return ToolResult(success=True, content=json.dumps({
                "accounts": result.get("accounts", []),
                "count": len(result.get("accounts", [])),
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


# CDP Tools list
CDP_TOOLS = [
    CDPCreateAccountTool,
    CDPRequestFaucetTool,
    CDPGetBalanceTool,
    CDPSendSOLTool,
    CDPListAccountsTool,
]


# ============================================================
# Hyperliquid DEX Trading Tools
# ============================================================

class HyperliquidGetAccountTool(Tool):
    """Tool to get Hyperliquid account info."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_account"

    @property
    def description(self) -> str:
        return "Get Hyperliquid account info including balance, margin summary, and open positions."

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
            result = await hl.get_account_state()
            return ToolResult(success=True, content=json.dumps(result, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class HyperliquidGetPriceTool(Tool):
    """Tool to get current prices on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_price"

    @property
    def description(self) -> str:
        return "Get current price, 24h change, and funding rate for assets on Hyperliquid."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {"type": "string", "description": "Coin symbol (e.g., BTC, ETH, SOL). Optional - returns all if not specified."}
            },
            "required": [],
        }

    async def execute(self, coin: str = None) -> ToolResult:
        try:
            hl = get_hyperliquid_client()
            result = await hl.get_all_mids()
            if coin:
                coin_upper = coin.upper()
                if coin_upper in result:
                    return ToolResult(success=True, content=json.dumps({
                        "coin": coin_upper,
                        "mid_price": result[coin_upper]
                    }, indent=2))
                else:
                    return ToolResult(success=False, error=f"Coin {coin} not found on Hyperliquid")
            return ToolResult(success=True, content=json.dumps(result, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class HyperliquidOpenLongTool(Tool):
    """Tool to open a long position on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_open_long"

    @property
    def description(self) -> str:
        return "⚠️ EXECUTES REAL TRADE - Open a LONG perpetual position on Hyperliquid. Uses market order."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {"type": "string", "description": "Coin symbol (e.g., BTC, ETH, SOL)"},
                "size": {"type": "number", "description": "Position size in coin units (e.g., 0.01 for 0.01 BTC)"},
                "leverage": {"type": "integer", "description": "Leverage multiplier (1-50). Default 5.", "default": 5},
            },
            "required": ["coin", "size"],
        }

    async def execute(self, coin: str, size: float, leverage: int = 5) -> ToolResult:
        try:
            hl = get_hyperliquid_client()
            result = await hl.open_position(
                coin=coin.upper(),
                is_long=True,
                size=size,
                leverage=leverage,
            )
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "coin": coin.upper(),
                "side": "LONG",
                "size": size,
                "leverage": leverage,
                "order_id": result.get("response", {}).get("data", {}).get("statuses", [{}])[0].get("resting", {}).get("oid"),
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class HyperliquidOpenShortTool(Tool):
    """Tool to open a short position on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_open_short"

    @property
    def description(self) -> str:
        return "⚠️ EXECUTES REAL TRADE - Open a SHORT perpetual position on Hyperliquid. Uses market order."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {"type": "string", "description": "Coin symbol (e.g., BTC, ETH, SOL)"},
                "size": {"type": "number", "description": "Position size in coin units"},
                "leverage": {"type": "integer", "description": "Leverage multiplier (1-50). Default 5.", "default": 5},
            },
            "required": ["coin", "size"],
        }

    async def execute(self, coin: str, size: float, leverage: int = 5) -> ToolResult:
        try:
            hl = get_hyperliquid_client()
            result = await hl.open_position(
                coin=coin.upper(),
                is_long=False,
                size=size,
                leverage=leverage,
            )
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "coin": coin.upper(),
                "side": "SHORT",
                "size": size,
                "leverage": leverage,
                "order_id": result.get("response", {}).get("data", {}).get("statuses", [{}])[0].get("resting", {}).get("oid"),
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class HyperliquidClosePositionTool(Tool):
    """Tool to close a position on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_close_position"

    @property
    def description(self) -> str:
        return "⚠️ EXECUTES REAL TRADE - Close an open position on Hyperliquid (full or partial)."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {"type": "string", "description": "Coin symbol (e.g., BTC, ETH, SOL)"},
                "size": {"type": "number", "description": "Size to close. If not provided, closes entire position."},
            },
            "required": ["coin"],
        }

    async def execute(self, coin: str, size: float = None) -> ToolResult:
        try:
            hl = get_hyperliquid_client()
            result = await hl.close_position(coin=coin.upper(), size=size)
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "coin": coin.upper(),
                "closed_size": size or "all",
                "result": result,
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class HyperliquidGetPositionsTool(Tool):
    """Tool to get open positions on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_positions"

    @property
    def description(self) -> str:
        return "Get all open perpetual positions on Hyperliquid with PnL."

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
            positions = await hl.get_positions()
            return ToolResult(success=True, content=json.dumps({
                "positions": positions,
                "count": len(positions) if isinstance(positions, list) else 0,
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class HyperliquidSetLeverageTool(Tool):
    """Tool to set leverage on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_set_leverage"

    @property
    def description(self) -> str:
        return "Set leverage for a coin on Hyperliquid. Can use cross or isolated margin."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "coin": {"type": "string", "description": "Coin symbol (e.g., BTC, ETH, SOL)"},
                "leverage": {"type": "integer", "description": "Leverage multiplier (1-50)"},
                "is_cross": {"type": "boolean", "description": "True for cross margin, False for isolated. Default True.", "default": True},
            },
            "required": ["coin", "leverage"],
        }

    async def execute(self, coin: str, leverage: int, is_cross: bool = True) -> ToolResult:
        try:
            hl = get_hyperliquid_client()
            result = await hl.set_leverage(coin=coin.upper(), leverage=leverage, is_cross=is_cross)
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "coin": coin.upper(),
                "leverage": leverage,
                "margin_type": "cross" if is_cross else "isolated",
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class HyperliquidGetAvailableCoinsTool(Tool):
    """Tool to list available coins on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_get_available_coins"

    @property
    def description(self) -> str:
        return "Get list of all available perpetual markets on Hyperliquid."

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
            coins = await hl.get_available_coins()
            return ToolResult(success=True, content=json.dumps({
                "coins": coins,
                "count": len(coins) if isinstance(coins, list) else 0,
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


class HyperliquidTransferTool(Tool):
    """Tool to transfer USDC between perp and spot on Hyperliquid."""

    @property
    def name(self) -> str:
        return "hyperliquid_transfer"

    @property
    def description(self) -> str:
        return "⚠️ EXECUTES TRANSFER - Transfer USDC between perpetual and spot accounts on Hyperliquid."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "amount": {"type": "number", "description": "Amount of USDC to transfer"},
                "to_perp": {"type": "boolean", "description": "True to transfer TO perp account, False to transfer TO spot account"},
            },
            "required": ["amount", "to_perp"],
        }

    async def execute(self, amount: float, to_perp: bool) -> ToolResult:
        try:
            hl = get_hyperliquid_client()
            result = await hl.transfer_between_accounts(amount=amount, to_perp=to_perp)
            return ToolResult(success=True, content=json.dumps({
                "status": "success",
                "amount": amount,
                "direction": "spot -> perp" if to_perp else "perp -> spot",
            }, indent=2))
        except Exception as e:
            return ToolResult(success=False, error=str(e))


# Hyperliquid Tools list
HYPERLIQUID_TOOLS = [
    HyperliquidGetAccountTool,
    HyperliquidGetPriceTool,
    HyperliquidOpenLongTool,
    HyperliquidOpenShortTool,
    HyperliquidClosePositionTool,
    HyperliquidGetPositionsTool,
    HyperliquidSetLeverageTool,
    HyperliquidGetAvailableCoinsTool,
    HyperliquidTransferTool,
]


# Tool factory
ALL_TRADING_TOOLS = [
    GetWalletBalanceTool,
    GetTokenPriceTool,
    GetTokenInfoTool,
    GetSwapQuoteTool,
    BuyTokenTool,
    SellTokenTool,
    GetPortfolioTool,
    GetTrendingTokensTool,
    SearchTokenTool,
    LaunchTokenTool,
    GetClaimableFeesTool,
    ClaimFeesTool,
] + CDP_TOOLS + HYPERLIQUID_TOOLS


def create_all_trading_tools() -> list[Tool]:
    """Create instances of all Solana trading tools."""
    return [ToolCls() for ToolCls in ALL_TRADING_TOOLS]
