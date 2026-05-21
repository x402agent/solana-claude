"""Helius RPC and WebSocket Client for Solana"""

import httpx
import json
import asyncio
import websockets
from typing import Optional, Any, Callable, Awaitable
from dataclasses import dataclass


@dataclass
class TokenBalance:
    """Token balance info"""
    mint: str
    amount: int
    decimals: int
    ui_amount: float


@dataclass
class AccountInfo:
    """Account info response"""
    lamports: int
    owner: str
    data: Any
    executable: bool
    rent_epoch: int


class HeliusClient:
    """Client for Helius RPC and DAS API"""
    
    def __init__(
        self,
        api_key: str,
        rpc_url: Optional[str] = None,
        wss_url: Optional[str] = None,
    ):
        """
        Initialize Helius client.
        
        Args:
            api_key: Helius API key
            rpc_url: Helius RPC URL (constructed from api_key if not provided)
            wss_url: Helius WebSocket URL (constructed from api_key if not provided)
        """
        self.api_key = api_key
        self.rpc_url = rpc_url or f"https://mainnet.helius-rpc.com/?api-key={api_key}"
        self.wss_url = wss_url or f"wss://mainnet.helius-rpc.com/?api-key={api_key}"
        self.das_url = f"https://mainnet.helius-rpc.com/?api-key={api_key}"
        
        self._client = httpx.AsyncClient(timeout=30.0)
        self._ws = None
        self._ws_callbacks: dict[int, Callable] = {}
        self._subscription_id = 0
    
    async def _rpc_call(self, method: str, params: list = None) -> Any:
        """Make an RPC call to Helius"""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or [],
        }
        
        response = await self._client.post(self.rpc_url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        if "error" in data:
            raise Exception(f"RPC error: {data['error']}")
        
        return data.get("result")
    
    # =====================
    # Account Methods
    # =====================
    
    async def get_balance(self, pubkey: str) -> int:
        """
        Get SOL balance for an account.
        
        Args:
            pubkey: Account public key
            
        Returns:
            Balance in lamports
        """
        result = await self._rpc_call("getBalance", [pubkey])
        return result.get("value", 0)
    
    async def get_sol_balance(self, pubkey: str) -> float:
        """
        Get SOL balance in SOL (not lamports).
        
        Args:
            pubkey: Account public key
            
        Returns:
            Balance in SOL
        """
        lamports = await self.get_balance(pubkey)
        return lamports / 1_000_000_000
    
    async def get_account_info(self, pubkey: str, encoding: str = "base64") -> Optional[AccountInfo]:
        """
        Get account info.
        
        Args:
            pubkey: Account public key
            encoding: Data encoding (base64, base58, jsonParsed)
            
        Returns:
            AccountInfo or None if account doesn't exist
        """
        result = await self._rpc_call("getAccountInfo", [pubkey, {"encoding": encoding}])
        
        if result.get("value") is None:
            return None
        
        value = result["value"]
        return AccountInfo(
            lamports=value["lamports"],
            owner=value["owner"],
            data=value["data"],
            executable=value["executable"],
            rent_epoch=value["rentEpoch"],
        )
    
    async def get_token_accounts_by_owner(
        self,
        owner: str,
        program_id: str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    ) -> list[TokenBalance]:
        """
        Get all token accounts for an owner.
        
        Args:
            owner: Owner public key
            program_id: Token program ID (SPL Token or Token-2022)
            
        Returns:
            List of token balances
        """
        result = await self._rpc_call(
            "getTokenAccountsByOwner",
            [
                owner,
                {"programId": program_id},
                {"encoding": "jsonParsed"}
            ]
        )
        
        balances = []
        for account in result.get("value", []):
            info = account["account"]["data"]["parsed"]["info"]
            token_amount = info["tokenAmount"]
            balances.append(TokenBalance(
                mint=info["mint"],
                amount=int(token_amount["amount"]),
                decimals=token_amount["decimals"],
                ui_amount=float(token_amount["uiAmount"] or 0),
            ))
        
        return balances
    
    async def get_token_balance(self, token_account: str) -> TokenBalance:
        """
        Get balance of a specific token account.
        
        Args:
            token_account: Token account address
            
        Returns:
            TokenBalance
        """
        result = await self._rpc_call("getTokenAccountBalance", [token_account])
        value = result["value"]
        
        return TokenBalance(
            mint="",  # Not returned by this endpoint
            amount=int(value["amount"]),
            decimals=value["decimals"],
            ui_amount=float(value["uiAmount"] or 0),
        )
    
    # =====================
    # Transaction Methods
    # =====================
    
    async def get_transaction(self, signature: str, encoding: str = "jsonParsed") -> Optional[dict]:
        """
        Get transaction details.
        
        Args:
            signature: Transaction signature
            encoding: Response encoding
            
        Returns:
            Transaction details or None
        """
        result = await self._rpc_call(
            "getTransaction",
            [signature, {"encoding": encoding, "maxSupportedTransactionVersion": 0}]
        )
        return result
    
    async def get_signatures_for_address(
        self,
        address: str,
        limit: int = 10,
        before: Optional[str] = None,
    ) -> list[dict]:
        """
        Get recent transaction signatures for an address.
        
        Args:
            address: Account address
            limit: Max signatures to return
            before: Get signatures before this signature
            
        Returns:
            List of signature info
        """
        params = {"limit": limit}
        if before:
            params["before"] = before
        
        result = await self._rpc_call("getSignaturesForAddress", [address, params])
        return result or []
    
    async def send_raw_transaction(
        self,
        tx_base64: str,
        skip_preflight: bool = False,
    ) -> str:
        """
        Send a raw transaction.
        
        Args:
            tx_base64: Base64 encoded transaction
            skip_preflight: Skip preflight simulation
            
        Returns:
            Transaction signature
        """
        result = await self._rpc_call(
            "sendTransaction",
            [tx_base64, {"skipPreflight": skip_preflight, "encoding": "base64"}]
        )
        return result
    
    async def get_latest_blockhash(self) -> dict:
        """
        Get latest blockhash.
        
        Returns:
            Dict with blockhash and lastValidBlockHeight
        """
        result = await self._rpc_call("getLatestBlockhash")
        return result["value"]
    
    async def simulate_transaction(
        self,
        tx_base64: str,
        sig_verify: bool = False,
    ) -> dict:
        """
        Simulate a transaction.
        
        Args:
            tx_base64: Base64 encoded transaction
            sig_verify: Verify signatures
            
        Returns:
            Simulation result
        """
        result = await self._rpc_call(
            "simulateTransaction",
            [tx_base64, {"sigVerify": sig_verify, "encoding": "base64"}]
        )
        return result["value"]
    
    # =====================
    # DAS API Methods
    # =====================
    
    async def get_asset(self, asset_id: str) -> dict:
        """
        Get asset info using DAS API.
        
        Args:
            asset_id: Asset/token mint address
            
        Returns:
            Asset metadata
        """
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getAsset",
            "params": {"id": asset_id},
        }
        
        response = await self._client.post(self.das_url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        if "error" in data:
            raise Exception(f"DAS error: {data['error']}")
        
        return data.get("result")
    
    async def get_assets_by_owner(
        self,
        owner: str,
        page: int = 1,
        limit: int = 100,
    ) -> dict:
        """
        Get all assets owned by an address using DAS API.
        
        Args:
            owner: Owner address
            page: Page number
            limit: Items per page
            
        Returns:
            Assets list with metadata
        """
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getAssetsByOwner",
            "params": {
                "ownerAddress": owner,
                "page": page,
                "limit": limit,
            },
        }
        
        response = await self._client.post(self.das_url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        if "error" in data:
            raise Exception(f"DAS error: {data['error']}")
        
        return data.get("result")
    
    async def search_assets(
        self,
        owner: Optional[str] = None,
        creator: Optional[str] = None,
        collection: Optional[str] = None,
        page: int = 1,
        limit: int = 100,
    ) -> dict:
        """
        Search assets using DAS API.
        
        Args:
            owner: Filter by owner
            creator: Filter by creator
            collection: Filter by collection
            page: Page number
            limit: Items per page
            
        Returns:
            Search results
        """
        params = {"page": page, "limit": limit}
        if owner:
            params["ownerAddress"] = owner
        if creator:
            params["creatorAddress"] = creator
        if collection:
            params["grouping"] = ["collection", collection]
        
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "searchAssets",
            "params": params,
        }
        
        response = await self._client.post(self.das_url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        if "error" in data:
            raise Exception(f"DAS error: {data['error']}")
        
        return data.get("result")
    
    # =====================
    # WebSocket Methods
    # =====================
    
    async def connect_websocket(self):
        """Connect to Helius WebSocket"""
        if self._ws is None or self._ws.closed:
            self._ws = await websockets.connect(self.wss_url)
    
    async def disconnect_websocket(self):
        """Disconnect from WebSocket"""
        if self._ws and not self._ws.closed:
            await self._ws.close()
            self._ws = None
    
    async def subscribe_account(
        self,
        pubkey: str,
        callback: Callable[[dict], Awaitable[None]],
    ) -> int:
        """
        Subscribe to account changes.
        
        Args:
            pubkey: Account public key
            callback: Async callback for updates
            
        Returns:
            Subscription ID
        """
        await self.connect_websocket()
        
        self._subscription_id += 1
        sub_id = self._subscription_id
        
        payload = {
            "jsonrpc": "2.0",
            "id": sub_id,
            "method": "accountSubscribe",
            "params": [pubkey, {"encoding": "jsonParsed"}],
        }
        
        await self._ws.send(json.dumps(payload))
        self._ws_callbacks[sub_id] = callback
        
        return sub_id
    
    async def subscribe_logs(
        self,
        filter_type: str,  # "all" or "mentions"
        callback: Callable[[dict], Awaitable[None]],
        mentions: Optional[list[str]] = None,
    ) -> int:
        """
        Subscribe to transaction logs.
        
        Args:
            filter_type: "all" or "mentions"
            callback: Async callback for log updates
            mentions: List of pubkeys to filter (if filter_type is "mentions")
            
        Returns:
            Subscription ID
        """
        await self.connect_websocket()
        
        self._subscription_id += 1
        sub_id = self._subscription_id
        
        if filter_type == "mentions" and mentions:
            filter_param = {"mentions": mentions}
        else:
            filter_param = filter_type
        
        payload = {
            "jsonrpc": "2.0",
            "id": sub_id,
            "method": "logsSubscribe",
            "params": [filter_param],
        }
        
        await self._ws.send(json.dumps(payload))
        self._ws_callbacks[sub_id] = callback
        
        return sub_id
    
    async def unsubscribe(self, subscription_id: int, method: str = "accountUnsubscribe"):
        """
        Unsubscribe from a WebSocket subscription.
        
        Args:
            subscription_id: Subscription ID to unsubscribe
            method: Unsubscribe method name
        """
        if self._ws and not self._ws.closed:
            payload = {
                "jsonrpc": "2.0",
                "id": subscription_id,
                "method": method,
                "params": [subscription_id],
            }
            await self._ws.send(json.dumps(payload))
            self._ws_callbacks.pop(subscription_id, None)
    
    async def listen_websocket(self):
        """Listen for WebSocket messages and dispatch to callbacks"""
        if self._ws is None:
            raise Exception("WebSocket not connected")
        
        async for message in self._ws:
            data = json.loads(message)
            
            # Handle subscription confirmations
            if "result" in data and isinstance(data["result"], int):
                continue
            
            # Handle subscription updates
            if "params" in data:
                sub_id = data["params"].get("subscription")
                if sub_id in self._ws_callbacks:
                    await self._ws_callbacks[sub_id](data["params"]["result"])
    
    # =====================
    # Utility Methods
    # =====================
    
    async def get_slot(self) -> int:
        """Get current slot"""
        return await self._rpc_call("getSlot")
    
    async def get_block_height(self) -> int:
        """Get current block height"""
        return await self._rpc_call("getBlockHeight")
    
    async def get_health(self) -> str:
        """Get node health status"""
        return await self._rpc_call("getHealth")
    
    async def get_minimum_balance_for_rent_exemption(self, data_length: int) -> int:
        """Get minimum balance for rent exemption"""
        return await self._rpc_call("getMinimumBalanceForRentExemption", [data_length])
    
    async def close(self):
        """Close all connections"""
        await self.disconnect_websocket()
        await self._client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
