"""Bags Trading Client - Python wrapper for Bags SDK API"""

import httpx
import base58
import os
from pathlib import Path
from typing import Optional, Any, BinaryIO
from dataclasses import dataclass
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import VersionedTransaction
from solders.message import to_bytes_versioned


BAGS_API_BASE_URL = "https://public-api-v2.bags.fm/api/v1"
WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112"
GLOBAL_LUT = "Eq1EVs15EAWww1YtPTtWPzJRLPJoS6VYP9oW9SbNr3yp"


@dataclass
class TradeQuote:
    """Trade quote response from Bags API"""
    context_slot: int
    in_amount: str
    input_mint: str
    min_out_amount: str
    out_amount: str
    output_mint: str
    price_impact_pct: str
    slippage_bps: int
    request_id: str
    route_plan: list
    raw_response: dict


@dataclass
class SwapResult:
    """Swap transaction result"""
    transaction: VersionedTransaction
    compute_unit_limit: int
    last_valid_block_height: int
    prioritization_fee_lamports: int


class BagsClient:
    """Python client for Bags Trading API"""
    
    def __init__(
        self,
        api_key: str,
        config_key: str,
        rpc_url: str,
        private_key: Optional[str] = None,
        base_url: str = BAGS_API_BASE_URL,
    ):
        """
        Initialize Bags trading client.
        
        Args:
            api_key: Bags API key
            config_key: Bags config key
            rpc_url: Solana RPC URL (Helius)
            private_key: Wallet private key (base58 encoded) for signing transactions
            base_url: Bags API base URL
        """
        self.api_key = api_key
        self.config_key = config_key
        self.rpc_url = rpc_url
        self.base_url = base_url
        self.keypair = None
        
        if private_key:
            try:
                # Decode base58 private key
                secret_bytes = base58.b58decode(private_key)
                self.keypair = Keypair.from_bytes(secret_bytes)
            except Exception as e:
                raise ValueError(f"Invalid private key: {e}")
        
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "x-api-key": api_key,
                "Content-Type": "application/json",
            },
            timeout=60.0
        )
    
    @property
    def wallet_pubkey(self) -> Optional[str]:
        """Get wallet public key if keypair is set"""
        if self.keypair:
            return str(self.keypair.pubkey())
        return None
    
    async def get_quote(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 300,  # 3% default slippage
        slippage_mode: str = "manual"
    ) -> TradeQuote:
        """
        Get a swap quote for a token trade.
        
        Args:
            input_mint: Input token mint address
            output_mint: Output token mint address  
            amount: Amount in smallest unit (lamports for SOL)
            slippage_bps: Slippage tolerance in basis points
            slippage_mode: 'manual' or 'auto'
            
        Returns:
            TradeQuote with route and pricing info
        """
        params = {
            "inputMint": input_mint,
            "outputMint": output_mint,
            "amount": amount,
            "slippageMode": slippage_mode,
            "slippageBps": slippage_bps,
        }
        
        response = await self._client.get("/trade/quote", params=params)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(f"Quote failed: {data.get('error', 'Unknown error')}")
        
        result = data["response"]
        
        return TradeQuote(
            context_slot=result.get("contextSlot", 0),
            in_amount=result["inAmount"],
            input_mint=result["inputMint"],
            min_out_amount=result["minOutAmount"],
            out_amount=result["outAmount"],
            output_mint=result["outputMint"],
            price_impact_pct=result.get("priceImpactPct", "0"),
            slippage_bps=result["slippageBps"],
            request_id=result["requestId"],
            route_plan=result.get("routePlan", []),
            raw_response=result,
        )
    
    async def create_swap_transaction(
        self,
        quote: TradeQuote,
        user_pubkey: Optional[str] = None,
    ) -> SwapResult:
        """
        Create a swap transaction from a quote.
        
        Args:
            quote: TradeQuote from get_quote()
            user_pubkey: User public key (uses wallet_pubkey if not provided)
            
        Returns:
            SwapResult with versioned transaction ready for signing
        """
        if user_pubkey is None:
            if self.wallet_pubkey is None:
                raise ValueError("No wallet configured and no user_pubkey provided")
            user_pubkey = self.wallet_pubkey
        
        payload = {
            "quoteResponse": quote.raw_response,
            "userPublicKey": user_pubkey,
        }
        
        response = await self._client.post("/trade/swap", json=payload)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(f"Swap transaction creation failed: {data.get('error', 'Unknown error')}")
        
        result = data["response"]
        
        # Decode the transaction
        tx_bytes = base58.b58decode(result["swapTransaction"])
        transaction = VersionedTransaction.from_bytes(tx_bytes)
        
        return SwapResult(
            transaction=transaction,
            compute_unit_limit=result["computeUnitLimit"],
            last_valid_block_height=result["lastValidBlockHeight"],
            prioritization_fee_lamports=result["prioritizationFeeLamports"],
        )
    
    async def sign_and_send_transaction(
        self,
        swap_result: SwapResult,
    ) -> str:
        """
        Sign and send a swap transaction.
        
        Args:
            swap_result: SwapResult from create_swap_transaction()
            
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

        # Serialize and encode
        tx_bytes = bytes(signed_tx)
        tx_base58 = base58.b58encode(tx_bytes).decode()

        # Send via Jito bundle or direct RPC
        tx_signature = await self._send_bundle([tx_base58])

        return tx_signature
    
    async def _send_bundle(self, transactions: list[str], region: str = "mainnet") -> str:
        """
        Send transactions via Bags Jito bundle endpoint.
        
        Args:
            transactions: List of base58 encoded serialized transactions
            region: Jito region
            
        Returns:
            Bundle ID
        """
        payload = {
            "transactions": transactions,
            "region": region,
        }
        
        response = await self._client.post("/solana/send-bundle", json=payload)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(f"Bundle send failed: {data.get('error', 'Unknown error')}")
        
        return data["response"]
    
    async def get_bundle_status(self, bundle_ids: list[str], region: str = "mainnet") -> dict:
        """
        Get status of submitted bundles.
        
        Args:
            bundle_ids: List of bundle IDs to check
            region: Jito region
            
        Returns:
            Bundle status response
        """
        payload = {
            "bundleIds": bundle_ids,
            "region": region,
        }
        
        response = await self._client.post("/solana/get-bundle-statuses", json=payload)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(f"Bundle status check failed: {data.get('error', 'Unknown error')}")
        
        return data["response"]
    
    async def get_jito_fees(self) -> dict:
        """
        Get current Jito tip fee percentiles.
        
        Returns:
            Jito fee info
        """
        response = await self._client.get("/solana/jito-recent-fees")
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(f"Jito fees fetch failed: {data.get('error', 'Unknown error')}")
        
        return data["response"]
    
    async def execute_swap(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 300,
    ) -> dict:
        """
        High-level method to execute a complete swap.
        
        Args:
            input_mint: Input token mint
            output_mint: Output token mint
            amount: Amount to swap
            slippage_bps: Slippage tolerance
            
        Returns:
            Dict with quote info and transaction signature
        """
        # Get quote
        quote = await self.get_quote(
            input_mint=input_mint,
            output_mint=output_mint,
            amount=amount,
            slippage_bps=slippage_bps,
        )
        
        # Create swap transaction
        swap_result = await self.create_swap_transaction(quote)
        
        # Sign and send
        signature = await self.sign_and_send_transaction(swap_result)
        
        return {
            "signature": signature,
            "quote": {
                "input_mint": quote.input_mint,
                "output_mint": quote.output_mint,
                "in_amount": quote.in_amount,
                "out_amount": quote.out_amount,
                "min_out_amount": quote.min_out_amount,
                "price_impact_pct": quote.price_impact_pct,
                "slippage_bps": quote.slippage_bps,
            }
        }
    
    async def buy_token(
        self,
        token_mint: str,
        sol_amount: float,
        slippage_bps: int = 300,
    ) -> dict:
        """
        Buy a token with SOL.
        
        Args:
            token_mint: Token to buy
            sol_amount: Amount of SOL to spend
            slippage_bps: Slippage tolerance
            
        Returns:
            Swap result
        """
        lamports = int(sol_amount * 1_000_000_000)  # Convert SOL to lamports
        
        return await self.execute_swap(
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
    ) -> dict:
        """
        Sell a token for SOL.
        
        Args:
            token_mint: Token to sell
            token_amount: Amount of tokens to sell (in smallest unit)
            slippage_bps: Slippage tolerance
            
        Returns:
            Swap result
        """
        return await self.execute_swap(
            input_mint=token_mint,
            output_mint=WRAPPED_SOL_MINT,
            amount=token_amount,
            slippage_bps=slippage_bps,
        )
    
    # =====================
    # Token Launch V2 Methods
    # =====================
    
    async def create_token_metadata(
        self,
        name: str,
        symbol: str,
        description: str,
        image_url: Optional[str] = None,
        image_file_path: Optional[str] = None,
        twitter: Optional[str] = None,
        website: Optional[str] = None,
        telegram: Optional[str] = None,
    ) -> dict:
        """
        Create token info and metadata for launching.

        Args:
            name: Token name
            symbol: Token symbol
            description: Token description
            image_url: URL to token image (mutually exclusive with image_file_path)
            image_file_path: Path to local image file to upload (mutually exclusive with image_url)
                           Supports PNG, JPG, JPEG, GIF, WebP (max 15MB)
            twitter: Twitter URL
            website: Website URL
            telegram: Telegram URL

        Returns:
            Dict with tokenMint and tokenMetadata (IPFS URI)
        """
        # Validate that only one image source is provided
        if image_url and image_file_path:
            raise ValueError("Cannot specify both image_url and image_file_path. Use one or the other.")

        # Handle file upload
        if image_file_path:
            return await self._create_token_metadata_with_file(
                name=name,
                symbol=symbol,
                description=description,
                image_file_path=image_file_path,
                twitter=twitter,
                website=website,
                telegram=telegram,
            )

        # Handle URL-based metadata (original behavior)
        payload = {
            "name": name,
            "symbol": symbol.upper().replace("$", ""),
            "description": description,
        }

        if image_url:
            payload["imageUrl"] = image_url
        if twitter:
            payload["twitter"] = twitter
        if website:
            payload["website"] = website
        if telegram:
            payload["telegram"] = telegram

        response = await self._client.post("/token-launch/create-token-info", json=payload)
        response.raise_for_status()
        data = response.json()

        if not data.get("success"):
            raise Exception(f"Token info creation failed: {data.get('error', 'Unknown error')}")

        return data["response"]

    async def _create_token_metadata_with_file(
        self,
        name: str,
        symbol: str,
        description: str,
        image_file_path: str,
        twitter: Optional[str] = None,
        website: Optional[str] = None,
        telegram: Optional[str] = None,
    ) -> dict:
        """
        Create token metadata with file upload.

        Args:
            name: Token name
            symbol: Token symbol
            description: Token description
            image_file_path: Path to local image file
            twitter: Twitter URL
            website: Website URL
            telegram: Telegram URL

        Returns:
            Dict with tokenMint and tokenMetadata (IPFS URI)
        """
        # Validate file exists
        file_path = Path(image_file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Image file not found: {image_file_path}")

        # Validate file size (15MB max)
        file_size = file_path.stat().st_size
        max_size = 15 * 1024 * 1024  # 15MB in bytes
        if file_size > max_size:
            raise ValueError(f"Image file too large: {file_size / 1024 / 1024:.2f}MB (max 15MB)")

        # Validate file type
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
        file_ext = file_path.suffix.lower()
        if file_ext not in allowed_extensions:
            raise ValueError(f"Unsupported file type: {file_ext}. Allowed: {', '.join(allowed_extensions)}")

        # Determine MIME type
        mime_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
        }
        mime_type = mime_types.get(file_ext, 'application/octet-stream')

        # Build multipart form data
        files = {
            'image': (file_path.name, open(file_path, 'rb'), mime_type),
        }

        data = {
            'name': name,
            'symbol': symbol.upper().replace("$", ""),
            'description': description,
        }

        if twitter:
            data['twitter'] = twitter
        if website:
            data['website'] = website
        if telegram:
            data['telegram'] = telegram

        # Create a temporary client without Content-Type header (httpx will set it for multipart)
        async with httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "x-api-key": self.api_key,
                # No Content-Type header - httpx will add multipart/form-data with boundary
            },
            timeout=120.0  # Longer timeout for file uploads
        ) as upload_client:
            try:
                response = await upload_client.post(
                    "/token-launch/create-token-info",
                    data=data,
                    files=files,
                )
                response.raise_for_status()
                result = response.json()

                if not result.get("success"):
                    raise Exception(f"Token info creation failed: {result.get('error', 'Unknown error')}")

                return result["response"]
            finally:
                # Close the file handle
                files['image'][1].close()
    
    async def create_fee_share_config(
        self,
        token_mint: str,
        fee_claimers: list[dict],
        partner_wallet: Optional[str] = None,
    ) -> dict:
        """
        Create fee share configuration for a token.
        
        Args:
            token_mint: Token mint address
            fee_claimers: List of {wallet: str, bps: int} (must sum to 10000)
            partner_wallet: Optional partner wallet
            
        Returns:
            Dict with configKey and transactions
        """
        # Validate BPS total
        total_bps = sum(fc.get("bps", 0) for fc in fee_claimers)
        if total_bps != 10000:
            raise ValueError(f"Fee claimer BPS must total 10000, got {total_bps}")
        
        payload = {
            "baseMint": token_mint,
            "payer": self.wallet_pubkey,
            "feeClaimers": [
                {"user": fc["wallet"], "userBps": fc["bps"]}
                for fc in fee_claimers
            ],
        }
        
        if partner_wallet:
            payload["partner"] = partner_wallet
        
        response = await self._client.post("/fee-share/config", json=payload)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(f"Fee share config creation failed: {data.get('error', 'Unknown error')}")
        
        return data["response"]
    
    async def create_launch_transaction(
        self,
        metadata_url: str,
        token_mint: str,
        config_key: str,
        initial_buy_sol: float = 0.01,
        tip_lamports: Optional[int] = None,
    ) -> dict:
        """
        Create a token launch transaction.
        
        Args:
            metadata_url: IPFS metadata URI from create_token_metadata
            token_mint: Token mint address
            config_key: Config key from create_fee_share_config
            initial_buy_sol: Initial buy amount in SOL
            tip_lamports: Jito tip in lamports
            
        Returns:
            Dict with transaction and blockhash info
        """
        payload = {
            "metadataUrl": metadata_url,
            "tokenMint": token_mint,
            "launchWallet": self.wallet_pubkey,
            "initialBuyLamports": int(initial_buy_sol * 1_000_000_000),
            "configKey": config_key,
        }
        
        if tip_lamports:
            payload["tipConfig"] = {
                "tipLamports": tip_lamports,
            }
        
        response = await self._client.post("/token-launch/create-launch-transaction", json=payload)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(f"Launch transaction creation failed: {data.get('error', 'Unknown error')}")
        
        return data["response"]
    
    async def launch_token(
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
        fee_share_bps: int = 10000,  # Creator gets 100% by default
    ) -> dict:
        """
        High-level method to launch a token (all steps).

        Args:
            name: Token name
            symbol: Token symbol
            description: Token description
            image_url: Token image URL (mutually exclusive with image_file_path)
            image_file_path: Path to local image file (mutually exclusive with image_url)
            initial_buy_sol: Initial buy in SOL
            twitter: Twitter URL
            website: Website URL
            telegram: Telegram URL
            fee_share_bps: Creator fee share (default 10000 = 100%)

        Returns:
            Dict with tokenMint, signature, and tokenUrl
        """
        if self.keypair is None:
            raise ValueError("No keypair configured for launching")

        if not image_url and not image_file_path:
            raise ValueError("Either image_url or image_file_path must be provided")

        # Step 1: Create token metadata
        token_info = await self.create_token_metadata(
            name=name,
            symbol=symbol,
            description=description,
            image_url=image_url,
            image_file_path=image_file_path,
            twitter=twitter,
            website=website,
            telegram=telegram,
        )
        
        token_mint = token_info["tokenMint"]
        metadata_url = token_info["tokenMetadata"]
        
        # Step 2: Create fee share config (creator gets all fees)
        fee_claimers = [{"wallet": self.wallet_pubkey, "bps": fee_share_bps}]
        config_result = await self.create_fee_share_config(token_mint, fee_claimers)
        config_key = config_result["configKey"]
        
        # Sign and send config transactions if any
        for tx_data in config_result.get("transactions", []):
            tx_bytes = base58.b58decode(tx_data["transaction"])
            tx = VersionedTransaction.from_bytes(tx_bytes)

            # Sign the versioned transaction correctly
            message_bytes = to_bytes_versioned(tx.message)
            signature = self.keypair.sign_message(message_bytes)
            signed_tx = VersionedTransaction.populate(tx.message, [signature])

            tx_encoded = base58.b58encode(bytes(signed_tx)).decode()
            await self._send_bundle([tx_encoded])
        
        # Step 3: Create launch transaction
        launch_result = await self.create_launch_transaction(
            metadata_url=metadata_url,
            token_mint=token_mint,
            config_key=config_key,
            initial_buy_sol=initial_buy_sol,
        )
        
        # Step 4: Sign and send launch transaction
        tx_bytes = base58.b58decode(launch_result["transaction"])
        tx = VersionedTransaction.from_bytes(tx_bytes)

        # Sign the versioned transaction correctly
        message_bytes = to_bytes_versioned(tx.message)
        signature = self.keypair.sign_message(message_bytes)
        signed_tx = VersionedTransaction.populate(tx.message, [signature])

        tx_encoded = base58.b58encode(bytes(signed_tx)).decode()
        tx_signature = await self._send_bundle([tx_encoded])
        
        return {
            "token_mint": token_mint,
            "metadata_uri": metadata_url,
            "config_key": config_key,
            "signature": signature,
            "token_url": f"https://bags.fm/{token_mint}",
        }
    
    async def get_token_fees(self, token_mint: str) -> dict:
        """
        Get lifetime fees for a token.
        
        Args:
            token_mint: Token mint address
            
        Returns:
            Fee info
        """
        response = await self._client.get(f"/state/token/{token_mint}/fees")
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(f"Failed to get token fees: {data.get('error', 'Unknown error')}")
        
        return data["response"]
    
    async def get_claimable_fees(self) -> list[dict]:
        """
        Get all claimable fee positions for the wallet.
        
        Returns:
            List of claimable positions
        """
        if self.wallet_pubkey is None:
            raise ValueError("No wallet configured")
        
        response = await self._client.get(
            "/fee/positions",
            params={"wallet": self.wallet_pubkey}
        )
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(f"Failed to get claimable fees: {data.get('error', 'Unknown error')}")
        
        return data["response"]
    
    async def claim_fees(self, position: dict) -> str:
        """
        Claim fees from a position.
        
        Args:
            position: Position data from get_claimable_fees
            
        Returns:
            Transaction signature
        """
        if self.keypair is None:
            raise ValueError("No keypair configured for claiming")
        
        response = await self._client.post(
            "/fee/claim",
            json={"position": position, "wallet": self.wallet_pubkey}
        )
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(f"Failed to create claim transaction: {data.get('error', 'Unknown error')}")
        
        # Sign and send
        for tx_data in data["response"].get("transactions", []):
            tx_bytes = base58.b58decode(tx_data["transaction"])
            tx = VersionedTransaction.from_bytes(tx_bytes)

            # Sign the versioned transaction correctly
            message_bytes = to_bytes_versioned(tx.message)
            signature = self.keypair.sign_message(message_bytes)
            signed_tx = VersionedTransaction.populate(tx.message, [signature])

            tx_encoded = base58.b58encode(bytes(signed_tx)).decode()
            return await self._send_bundle([tx_encoded])
        
        return ""
    
    async def health_check(self) -> bool:
        """Check if Bags API is healthy."""
        try:
            response = await self._client.get("/../../ping")
            data = response.json()
            return data.get("message") == "pong"
        except Exception:
            return False
    
    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
