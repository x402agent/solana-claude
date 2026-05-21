"""Jupiter Ultra API Client - Python wrapper for Jupiter Ultra Swap API"""

import httpx
import base64
from typing import Optional, Any
from dataclasses import dataclass
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import VersionedTransaction
from solders.message import to_bytes_versioned


JUPITER_ULTRA_API = "https://api.jup.ag/ultra/v1"
JUPITER_TOKENS_API = "https://api.jup.ag/tokens/v2"
JUPITER_CONTENT_API = "https://api.jup.ag/content/v1"
JUPITER_PRICE_API = "https://api.jup.ag"
JUPITER_PORTFOLIO_API = "https://api.jup.ag/portfolio/v1"
WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112"


@dataclass
class JupiterQuote:
    """Jupiter Ultra order response"""
    mode: str
    input_mint: str
    output_mint: str
    in_amount: str
    out_amount: str
    in_usd_value: float
    out_usd_value: float
    price_impact: float
    swap_usd_value: float
    other_amount_threshold: str
    swap_mode: str
    slippage_bps: int
    route_plan: list
    fee_bps: int
    platform_fee: dict
    signature_fee_lamports: int
    signature_fee_payer: Optional[str]
    prioritization_fee_lamports: int
    prioritization_fee_payer: Optional[str]
    rent_fee_lamports: int
    rent_fee_payer: Optional[str]
    router: str
    transaction: Optional[str]
    gasless: bool
    request_id: str
    total_time: float
    taker: Optional[str]
    quote_id: str
    maker: str
    expire_at: str
    error_code: Optional[int] = None
    error_message: Optional[str] = None
    raw_response: dict = None


@dataclass
class JupiterSwapResult:
    """Jupiter Ultra swap result"""
    transaction: VersionedTransaction
    quote: JupiterQuote


class JupiterClient:
    """Client for Jupiter Ultra Swap API"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        wallet_pubkey: Optional[str] = None,
        keypair: Optional[Keypair] = None,
        referral_account: Optional[str] = None,
    ):
        """
        Initialize Jupiter Ultra client.

        Args:
            api_key: Jupiter API key (optional but recommended)
            wallet_pubkey: User's public key
            keypair: Keypair for signing transactions
            referral_account: Referral account for fee sharing
        """
        headers = {}
        if api_key:
            headers["x-api-key"] = api_key

        self._ultra_client = httpx.AsyncClient(
            base_url=JUPITER_ULTRA_API,
            headers=headers,
            timeout=httpx.Timeout(30.0)
        )
        self._tokens_client = httpx.AsyncClient(
            base_url=JUPITER_TOKENS_API,
            headers=headers,
            timeout=httpx.Timeout(30.0)
        )
        self._content_client = httpx.AsyncClient(
            base_url=JUPITER_CONTENT_API,
            headers=headers,
            timeout=httpx.Timeout(30.0)
        )
        self._price_client = httpx.AsyncClient(
            base_url=JUPITER_PRICE_API,
            headers=headers,
            timeout=httpx.Timeout(30.0)
        )
        self._portfolio_client = httpx.AsyncClient(
            base_url=JUPITER_PORTFOLIO_API,
            headers=headers,
            timeout=httpx.Timeout(30.0)
        )
        self.wallet_pubkey = wallet_pubkey
        self.keypair = keypair
        self.referral_account = referral_account

    async def close(self):
        """Close all HTTP clients"""
        await self._ultra_client.aclose()
        await self._tokens_client.aclose()
        await self._content_client.aclose()
        await self._price_client.aclose()
        await self._portfolio_client.aclose()

    async def get_quote(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        taker: Optional[str] = None,
        slippage_bps: int = 300,
        receiver: Optional[str] = None,
        payer: Optional[str] = None,
        referral_account: Optional[str] = None,
        referral_fee: Optional[int] = None,
        exclude_routers: Optional[list[str]] = None,
        exclude_dexes: Optional[list[str]] = None,
    ) -> JupiterQuote:
        """
        Get a swap quote from Jupiter Ultra.

        Args:
            input_mint: Input token mint address
            output_mint: Output token mint address
            amount: Amount in smallest unit (lamports)
            taker: Taker public key (defaults to wallet_pubkey)
            slippage_bps: Slippage tolerance in basis points (default: 300 = 3%)
            receiver: Receiver public key for output tokens
            payer: Payer public key for gas fees
            referral_account: Referral account for fees
            referral_fee: Referral fee in basis points (50-255)
            exclude_routers: Routers to exclude (iris, jupiterz, dflow, okx)
            exclude_dexes: DEXes to exclude (e.g., "Raydium,Orca V2")

        Returns:
            JupiterQuote with order details and unsigned transaction
        """
        if taker is None:
            if self.wallet_pubkey is None:
                raise ValueError("No wallet configured and no taker provided")
            taker = self.wallet_pubkey

        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": str(amount),
            "taker": taker,
        }

        if receiver:
            params["receiver"] = receiver
        if payer:
            params["payer"] = payer
        if referral_account:
            params["referralAccount"] = referral_account
        if referral_fee:
            params["referralFee"] = referral_fee
        if exclude_routers:
            params["excludeRouters"] = ",".join(exclude_routers)
        if exclude_dexes:
            params["excludeDexes"] = exclude_dexes

        response = await self._ultra_client.get("/order", params=params)
        response.raise_for_status()
        data = response.json()

        return JupiterQuote(
            mode=data["mode"],
            input_mint=data["inputMint"],
            output_mint=data["outputMint"],
            in_amount=data["inAmount"],
            out_amount=data["outAmount"],
            in_usd_value=data.get("inUsdValue", 0),
            out_usd_value=data.get("outUsdValue", 0),
            price_impact=data.get("priceImpact", 0),
            swap_usd_value=data.get("swapUsdValue", 0),
            other_amount_threshold=data["otherAmountThreshold"],
            swap_mode=data["swapMode"],
            slippage_bps=data["slippageBps"],
            route_plan=data["routePlan"],
            fee_bps=data["feeBps"],
            platform_fee=data["platformFee"],
            signature_fee_lamports=data["signatureFeeLamports"],
            signature_fee_payer=data.get("signatureFeePayer"),
            prioritization_fee_lamports=data["prioritizationFeeLamports"],
            prioritization_fee_payer=data.get("prioritizationFeePayer"),
            rent_fee_lamports=data["rentFeeLamports"],
            rent_fee_payer=data.get("rentFeePayer"),
            router=data["router"],
            transaction=data.get("transaction"),
            gasless=data["gasless"],
            request_id=data["requestId"],
            total_time=data["totalTime"],
            taker=data.get("taker"),
            quote_id=data["quoteId"],
            maker=data["maker"],
            expire_at=data["expireAt"],
            error_code=data.get("errorCode"),
            error_message=data.get("errorMessage"),
            raw_response=data,
        )

    async def create_swap_transaction(self, quote: JupiterQuote) -> JupiterSwapResult:
        """
        Create a swap transaction from a quote.

        Args:
            quote: JupiterQuote from get_quote()

        Returns:
            JupiterSwapResult with versioned transaction ready for signing
        """
        if quote.transaction is None:
            error_msg = quote.error_message or "No transaction returned"
            raise Exception(f"Cannot create swap: {error_msg}")

        # Decode the base64 transaction
        tx_bytes = base64.b64decode(quote.transaction)
        transaction = VersionedTransaction.from_bytes(tx_bytes)

        return JupiterSwapResult(
            transaction=transaction,
            quote=quote,
        )

    async def sign_and_execute(self, swap_result: JupiterSwapResult) -> str:
        """
        Sign and execute a swap transaction.

        Args:
            swap_result: JupiterSwapResult from create_swap_transaction()

        Returns:
            Transaction signature
        """
        if self.keypair is None:
            raise ValueError("No keypair configured for signing")

        # Sign the versioned transaction correctly
        tx = swap_result.transaction

        # Get message bytes and sign
        message_bytes = to_bytes_versioned(tx.message)
        signature = self.keypair.sign_message(message_bytes)

        # Create signed transaction
        signed_tx = VersionedTransaction.populate(tx.message, [signature])

        # Encode to base64
        tx_bytes = bytes(signed_tx)
        tx_base64 = base64.b64encode(tx_bytes).decode()

        # Execute via Jupiter
        response = await self._ultra_client.post(
            "/execute",
            json={
                "requestId": swap_result.quote.request_id,
                "transaction": tx_base64,
            }
        )
        response.raise_for_status()
        data = response.json()

        # Return signature
        return data.get("signature", str(signature))

    async def swap(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 300,
    ) -> str:
        """
        Convenience method to get quote, sign, and execute in one call.

        Args:
            input_mint: Input token mint address
            output_mint: Output token mint address
            amount: Amount in smallest unit (lamports)
            slippage_bps: Slippage tolerance in basis points (default: 300 = 3%)

        Returns:
            Transaction signature
        """
        # Get quote
        quote = await self.get_quote(
            input_mint=input_mint,
            output_mint=output_mint,
            amount=amount,
            slippage_bps=slippage_bps,
        )

        # Create transaction
        swap_result = await self.create_swap_transaction(quote)

        # Sign and execute
        signature = await self.sign_and_execute(swap_result)

        return signature

    async def buy_token(
        self,
        token_mint: str,
        sol_amount: float,
        slippage_bps: int = 300,
    ) -> str:
        """
        Buy a token with SOL.

        Args:
            token_mint: Token mint address to buy
            sol_amount: Amount of SOL to spend
            slippage_bps: Slippage tolerance in basis points

        Returns:
            Transaction signature
        """
        # Convert SOL to lamports
        lamports = int(sol_amount * 1_000_000_000)

        return await self.swap(
            input_mint=WRAPPED_SOL_MINT,
            output_mint=token_mint,
            amount=lamports,
            slippage_bps=slippage_bps,
        )

    async def sell_token(
        self,
        token_mint: str,
        token_amount: int,
        slippage_bps: int = 300,
    ) -> str:
        """
        Sell a token for SOL.

        Args:
            token_mint: Token mint address to sell
            token_amount: Amount of tokens in smallest unit
            slippage_bps: Slippage tolerance in basis points

        Returns:
            Transaction signature
        """
        return await self.swap(
            input_mint=token_mint,
            output_mint=WRAPPED_SOL_MINT,
            amount=token_amount,
            slippage_bps=slippage_bps,
        )

    async def get_holdings(self, wallet: Optional[str] = None) -> dict:
        """
        Get wallet holdings from Jupiter Ultra.

        Args:
            wallet: Wallet address (defaults to wallet_pubkey)

        Returns:
            Holdings data with balances and values
        """
        if wallet is None:
            if self.wallet_pubkey is None:
                raise ValueError("No wallet configured and no wallet provided")
            wallet = self.wallet_pubkey

        response = await self._ultra_client.get(f"/holdings/{wallet}")
        response.raise_for_status()
        return response.json()

    async def get_shield_warnings(self, token_mint: str) -> dict:
        """
        Get token warnings from Jupiter Shield.

        Args:
            token_mint: Token mint address to check

        Returns:
            Shield warnings and safety information
        """
        response = await self._ultra_client.get(f"/shield/{token_mint}")
        response.raise_for_status()
        return response.json()

    async def search_tokens(
        self,
        query: str,
        limit: int = 20,
        verified_only: bool = False,
    ) -> dict:
        """
        Search for tokens using Jupiter Tokens V2 API.

        Args:
            query: Search query (token name, symbol, or mint)
            limit: Maximum results (default: 20)
            verified_only: Only return verified tokens

        Returns:
            Search results with token information
        """
        params = {
            "query": query,
            "limit": limit,
        }
        if verified_only:
            params["verified"] = "true"

        response = await self._tokens_client.get("/search", params=params)
        response.raise_for_status()
        return response.json()

    async def get_tokens_by_tag(self, tag: str) -> dict:
        """
        Get tokens by tag (e.g., verified, strict, community).

        Args:
            tag: Tag name (verified, strict, community, etc.)

        Returns:
            List of tokens with the specified tag
        """
        response = await self._tokens_client.get(f"/tag/{tag}")
        response.raise_for_status()
        return response.json()

    async def get_trending_tokens(
        self,
        category: str = "top",
        interval: str = "24h",
    ) -> dict:
        """
        Get trending tokens by category and time interval.

        Args:
            category: Category (top, gainers, losers, new, volume)
            interval: Time interval (1h, 6h, 24h, 7d, 30d)

        Returns:
            List of trending tokens with metrics
        """
        response = await self._tokens_client.get(f"/{category}/{interval}")
        response.raise_for_status()
        return response.json()

    async def get_token_content(self, token_mint: str) -> dict:
        """
        Get content and metadata for a token.

        Args:
            token_mint: Token mint address

        Returns:
            Token content including description, social links, etc.
        """
        response = await self._content_client.get(f"/content/{token_mint}")
        response.raise_for_status()
        return response.json()

    async def get_content_feed(
        self,
        limit: int = 20,
        offset: int = 0,
    ) -> dict:
        """
        Get content feed with latest token updates.

        Args:
            limit: Maximum results (default: 20)
            offset: Pagination offset (default: 0)

        Returns:
            Content feed with token updates
        """
        params = {
            "limit": limit,
            "offset": offset,
        }
        response = await self._content_client.get("/content/feed", params=params)
        response.raise_for_status()
        return response.json()

    async def get_token_prices(
        self,
        token_mints: list[str],
        show_extra_info: bool = False,
    ) -> dict:
        """
        Get token prices from Jupiter Price V3 API.

        Args:
            token_mints: List of token mint addresses
            show_extra_info: Include extra price information

        Returns:
            Price data for requested tokens
        """
        params = {
            "ids": ",".join(token_mints),
        }
        if show_extra_info:
            params["showExtraInfo"] = "true"

        response = await self._price_client.get("/price/v3", params=params)
        response.raise_for_status()
        return response.json()

    async def get_wallet_positions(self, wallet: Optional[str] = None) -> dict:
        """
        Get wallet positions from Jupiter Portfolio API.

        Args:
            wallet: Wallet address (defaults to wallet_pubkey)

        Returns:
            Portfolio positions with P&L and metrics
        """
        if wallet is None:
            if self.wallet_pubkey is None:
                raise ValueError("No wallet configured and no wallet provided")
            wallet = self.wallet_pubkey

        response = await self._portfolio_client.get(f"/positions/{wallet}")
        response.raise_for_status()
        return response.json()
