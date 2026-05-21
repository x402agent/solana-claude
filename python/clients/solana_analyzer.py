"""Unified Solana Blockchain Analyzer - Detects and analyzes contracts, wallets, and transactions"""

import re
import httpx
from typing import Optional, Dict, Any, Literal
from dataclasses import dataclass
from enum import Enum


class SolanaAddressType(Enum):
    """Type of Solana address"""
    TOKEN_CONTRACT = "token_contract"
    WALLET = "wallet"
    TRANSACTION = "transaction"
    UNKNOWN = "unknown"


@dataclass
class SolanaAnalysisResult:
    """Result of Solana address analysis"""
    address: str
    address_type: SolanaAddressType
    data: Dict[str, Any]
    source: str  # Which API provided the data

    def to_dict(self) -> Dict[str, Any]:
        return {
            "address": self.address,
            "type": self.address_type.value,
            "data": self.data,
            "source": self.source,
        }


class SolanaAnalyzer:
    """
    Unified analyzer for Solana blockchain addresses.
    Automatically detects whether an address is a token contract, wallet, or transaction.
    """

    def __init__(
        self,
        birdeye_api_key: str,
        helius_api_key: str,
        helius_rpc_url: str,
    ):
        """
        Initialize Solana analyzer.

        Args:
            birdeye_api_key: Birdeye API key (for token data)
            helius_api_key: Helius API key (for wallet/transaction data)
            helius_rpc_url: Helius RPC URL
        """
        self.birdeye_api_key = birdeye_api_key
        self.helius_api_key = helius_api_key
        self.helius_rpc_url = helius_rpc_url

        self._client = httpx.AsyncClient(timeout=30.0)

    def detect_address_type(self, address: str) -> SolanaAddressType:
        """
        Detect the type of Solana address.

        Solana addresses characteristics:
        - Token contracts: 32-44 chars, base58 encoded, typically start with specific patterns
        - Wallets: Same format as token contracts (need to check if it's a program/token vs wallet)
        - Transactions: 88 chars (base58 encoded signature)

        Args:
            address: The Solana address to analyze

        Returns:
            SolanaAddressType enum value
        """
        # Remove whitespace
        address = address.strip()

        # Transaction signatures are 88 characters (base58 encoded)
        if len(address) == 88:
            return SolanaAddressType.TRANSACTION

        # Solana addresses are 32-44 characters
        if 32 <= len(address) <= 44:
            # Check if valid base58
            base58_pattern = r'^[1-9A-HJ-NP-Za-km-z]+$'
            if re.match(base58_pattern, address):
                # We'll need to check via API whether it's a token or wallet
                # For now, return WALLET and let the analyze method determine
                return SolanaAddressType.WALLET

        return SolanaAddressType.UNKNOWN

    async def analyze(self, address: str) -> SolanaAnalysisResult:
        """
        Analyze a Solana address and return comprehensive data.

        This method:
        1. Detects the type of address
        2. Routes to the appropriate API
        3. Returns formatted analysis

        Args:
            address: Solana address (contract, wallet, or transaction)

        Returns:
            SolanaAnalysisResult with complete analysis
        """
        address_type = self.detect_address_type(address)

        if address_type == SolanaAddressType.TRANSACTION:
            return await self._analyze_transaction(address)
        elif address_type in [SolanaAddressType.WALLET, SolanaAddressType.TOKEN_CONTRACT]:
            # Try token first, then wallet
            try:
                return await self._analyze_token(address)
            except Exception:
                # If not a token, analyze as wallet
                return await self._analyze_wallet(address)
        else:
            return SolanaAnalysisResult(
                address=address,
                address_type=SolanaAddressType.UNKNOWN,
                data={"error": "Invalid Solana address format"},
                source="none",
            )

    async def _analyze_token(self, address: str) -> SolanaAnalysisResult:
        """Analyze a token contract using Birdeye API"""

        # Get token overview
        headers = {"X-API-KEY": self.birdeye_api_key}

        response = await self._client.get(
            "https://public-api.birdeye.so/defi/token_overview",
            params={"address": address},
            headers=headers,
        )
        response.raise_for_status()
        token_data = response.json()

        if not token_data.get("success"):
            raise Exception("Not a valid token address")

        data = token_data.get("data", {})

        # Get security analysis
        try:
            security_response = await self._client.get(
                "https://public-api.birdeye.so/defi/token_security",
                params={"address": address},
                headers=headers,
            )
            security_data = security_response.json().get("data", {})
        except Exception:
            security_data = {}

        # Get OHLCV data for price chart (15m timeframe, 24h)
        try:
            ohlcv_response = await self._client.get(
                "https://public-api.birdeye.so/defi/ohlcv",
                params={
                    "address": address,
                    "type": "15m",
                    "time_from": int((httpx.get("https://timeapi.io/api/Time/current/zone?timeZone=UTC").json()["timestamp"] - 86400)),
                    "time_to": int(httpx.get("https://timeapi.io/api/Time/current/zone?timeZone=UTC").json()["timestamp"]),
                },
                headers=headers,
            )
            ohlcv_data = ohlcv_response.json().get("data", {}).get("items", [])
        except Exception:
            ohlcv_data = []

        return SolanaAnalysisResult(
            address=address,
            address_type=SolanaAddressType.TOKEN_CONTRACT,
            data={
                "token_info": {
                    "name": data.get("name"),
                    "symbol": data.get("symbol"),
                    "decimals": data.get("decimals"),
                    "supply": data.get("supply"),
                },
                "market_data": {
                    "price": data.get("price"),
                    "price_change_24h": data.get("priceChange24hPercent"),
                    "volume_24h": data.get("v24hUSD"),
                    "volume_change_24h": data.get("v24hChangePercent"),
                    "market_cap": data.get("mc"),
                    "liquidity": data.get("liquidity"),
                },
                "security": security_data,
                "chart_data": {
                    "timeframe": "15m",
                    "period": "24h",
                    "candles": ohlcv_data,
                },
                "holder_stats": {
                    "holders": data.get("holder"),
                },
            },
            source="Birdeye API",
        )

    async def _analyze_wallet(self, address: str) -> SolanaAnalysisResult:
        """Analyze a wallet address using Helius DAS API"""

        # Use Helius DAS API to get assets
        payload = {
            "jsonrpc": "2.0",
            "id": "wallet-analysis",
            "method": "getAssetsByOwner",
            "params": {
                "ownerAddress": address,
                "page": 1,
                "limit": 1000,
            },
        }

        response = await self._client.post(
            self.helius_rpc_url,
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        assets_data = response.json()

        # Get SOL balance
        balance_payload = {
            "jsonrpc": "2.0",
            "id": "balance-check",
            "method": "getBalance",
            "params": [address],
        }

        balance_response = await self._client.post(
            self.helius_rpc_url,
            json=balance_payload,
            headers={"Content-Type": "application/json"},
        )
        balance_data = balance_response.json()
        sol_balance = balance_data.get("result", {}).get("value", 0) / 1e9

        # Parse assets
        assets = assets_data.get("result", {}).get("items", [])

        # Categorize assets
        tokens = []
        nfts = []

        for asset in assets:
            if asset.get("interface") == "FungibleToken":
                tokens.append({
                    "mint": asset.get("id"),
                    "name": asset.get("content", {}).get("metadata", {}).get("name"),
                    "symbol": asset.get("content", {}).get("metadata", {}).get("symbol"),
                    "balance": asset.get("token_info", {}).get("balance", 0),
                    "decimals": asset.get("token_info", {}).get("decimals", 0),
                })
            elif asset.get("interface") in ["NFT", "ProgrammableNFT"]:
                nfts.append({
                    "mint": asset.get("id"),
                    "name": asset.get("content", {}).get("metadata", {}).get("name"),
                    "collection": asset.get("grouping", [{}])[0].get("group_value") if asset.get("grouping") else None,
                })

        return SolanaAnalysisResult(
            address=address,
            address_type=SolanaAddressType.WALLET,
            data={
                "balance": {
                    "sol": sol_balance,
                },
                "tokens": {
                    "count": len(tokens),
                    "holdings": tokens[:20],  # Top 20
                },
                "nfts": {
                    "count": len(nfts),
                    "holdings": nfts[:20],  # Top 20
                },
                "total_assets": len(assets),
            },
            source="Helius DAS API",
        )

    async def _analyze_transaction(self, signature: str) -> SolanaAnalysisResult:
        """Analyze a transaction using Helius API"""

        # Use enhanced transaction API
        response = await self._client.get(
            f"{self.helius_rpc_url.replace('?', '/transactions/')}?api-key={self.helius_api_key}",
            params={"transactions": [signature]},
        )

        if response.status_code != 200:
            # Fall back to standard RPC
            payload = {
                "jsonrpc": "2.0",
                "id": "tx-analysis",
                "method": "getTransaction",
                "params": [
                    signature,
                    {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0},
                ],
            }

            rpc_response = await self._client.post(
                self.helius_rpc_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            tx_data = rpc_response.json().get("result", {})
        else:
            tx_data = response.json()[0] if response.json() else {}

        return SolanaAnalysisResult(
            address=signature,
            address_type=SolanaAddressType.TRANSACTION,
            data={
                "signature": signature,
                "slot": tx_data.get("slot"),
                "block_time": tx_data.get("blockTime"),
                "fee": tx_data.get("meta", {}).get("fee", 0) / 1e9,  # Convert to SOL
                "status": "success" if not tx_data.get("meta", {}).get("err") else "failed",
                "error": tx_data.get("meta", {}).get("err"),
                "type": tx_data.get("type", "Unknown"),
                "description": tx_data.get("description", ""),
                "accounts_involved": len(tx_data.get("transaction", {}).get("message", {}).get("accountKeys", [])),
            },
            source="Helius API",
        )

    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
