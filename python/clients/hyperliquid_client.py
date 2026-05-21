"""Hyperliquid DEX Client - Perpetuals and Spot Trading on Hyperliquid L1"""

import json
from typing import Optional, Dict, Any, List, Literal
from dataclasses import dataclass
import httpx
import eth_account
from eth_account.signers.local import LocalAccount

# Import from the Hyperliquid SDK
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../hyperliquid-python-sdk-master'))

from hyperliquid.exchange import Exchange
from hyperliquid.info import Info
from hyperliquid.utils import constants


HYPERLIQUID_MAINNET_URL = constants.MAINNET_API_URL
HYPERLIQUID_TESTNET_URL = constants.TESTNET_API_URL

# Asset ID Constants
# Perpetuals: index from meta (e.g., BTC = 0 on mainnet)
# Spot: 10000 + spotInfo["index"]
# Builder-deployed perps: 100000 + perp_dex_index * 10000 + index_in_meta
SPOT_ASSET_OFFSET = 10000
BUILDER_PERP_OFFSET = 100000


@dataclass
class HyperliquidPosition:
    """Position information"""
    coin: str
    entry_price: float
    position_value: float
    size: float
    unrealized_pnl: float
    return_on_equity: float
    leverage_type: str
    leverage_value: int
    liquidation_price: Optional[float]
    margin_used: float


@dataclass
class HyperliquidOrder:
    """Order information"""
    oid: int
    coin: str
    side: str
    size: float
    limit_price: float
    timestamp: int
    order_type: str


class HyperliquidClient:
    """Client for Hyperliquid DEX Perpetuals and Spot Trading"""

    def __init__(
        self,
        wallet_address: str,
        private_key: str,
        use_testnet: bool = False,
    ):
        """
        Initialize Hyperliquid DEX client.

        Args:
            wallet_address: Main account wallet address (0x...)
            private_key: Private key for signing (0x...)
            use_testnet: Whether to use testnet (default: False for mainnet)
        """
        self.wallet_address = wallet_address
        self.private_key = private_key
        self.use_testnet = use_testnet
        self.base_url = HYPERLIQUID_TESTNET_URL if use_testnet else HYPERLIQUID_MAINNET_URL

        # Initialize the wallet account
        self.account: LocalAccount = eth_account.Account.from_key(private_key)

        # Initialize Info client (read operations)
        self.info = Info(self.base_url, skip_ws=True)

        # Initialize Exchange client (write operations)
        self.exchange = Exchange(
            self.account,
            self.base_url,
            account_address=wallet_address if wallet_address != self.account.address else None
        )

        # HTTP client for additional API calls
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0
        )

        # Cached metadata for asset ID lookups
        self._meta_cache: Optional[Dict[str, Any]] = None
        self._spot_meta_cache: Optional[Dict[str, Any]] = None
        self._perp_coin_to_index: Dict[str, int] = {}
        self._perp_index_to_coin: Dict[int, str] = {}
        self._spot_coin_to_index: Dict[str, int] = {}
        self._spot_index_to_coin: Dict[int, str] = {}

    # ==================
    # Asset ID Management
    # ==================
    # Perpetuals: Use integer index from meta (e.g., BTC = 0 on mainnet)
    # Spot: Use 10000 + spotInfo["index"]
    # Builder-deployed perps: Use 100000 + perp_dex_index * 10000 + index_in_meta

    def _refresh_meta_cache(self) -> Dict[str, Any]:
        """Refresh perpetuals metadata cache."""
        self._meta_cache = self.info.meta()
        self._perp_coin_to_index.clear()
        self._perp_index_to_coin.clear()

        for idx, asset in enumerate(self._meta_cache.get("universe", [])):
            name = asset.get("name", "")
            self._perp_coin_to_index[name] = idx
            self._perp_index_to_coin[idx] = name

        return self._meta_cache

    def _refresh_spot_meta_cache(self) -> Dict[str, Any]:
        """Refresh spot metadata cache."""
        self._spot_meta_cache = self.info.spot_meta()
        self._spot_coin_to_index.clear()
        self._spot_index_to_coin.clear()

        tokens = {t["index"]: t["name"] for t in self._spot_meta_cache.get("tokens", [])}

        for idx, pair in enumerate(self._spot_meta_cache.get("universe", [])):
            base_idx, quote_idx = pair.get("tokens", [0, 0])
            base_name = tokens.get(base_idx, "")
            quote_name = tokens.get(quote_idx, "USDC")
            pair_name = f"{base_name}/{quote_name}"

            # Also store by just the base name with @ prefix for API compatibility
            self._spot_coin_to_index[pair_name] = idx
            self._spot_coin_to_index[f"@{idx}"] = idx
            self._spot_index_to_coin[idx] = pair_name

        return self._spot_meta_cache

    def get_perp_asset_id(self, coin: str) -> int:
        """
        Get perpetual asset ID for a coin.

        Args:
            coin: Coin name (e.g., 'BTC', 'ETH', 'SOL')

        Returns:
            Integer asset ID for perpetual trading
        """
        # Check for builder-deployed perps (format: dex:COIN)
        if ":" in coin:
            dex_name, coin_name = coin.split(":", 1)
            # Builder perps use: 100000 + perp_dex_index * 10000 + index_in_meta
            # For now, return the coin name and let the SDK handle it
            return -1  # SDK handles named coins

        if not self._perp_coin_to_index:
            self._refresh_meta_cache()

        if coin not in self._perp_coin_to_index:
            # Refresh cache in case new assets were added
            self._refresh_meta_cache()

        return self._perp_coin_to_index.get(coin, -1)

    def get_spot_asset_id(self, coin: str) -> int:
        """
        Get spot asset ID for a coin.

        Args:
            coin: Coin name or pair (e.g., 'HYPE', 'PURR/USDC', '@107')

        Returns:
            Integer asset ID for spot trading (10000 + index)
        """
        if not self._spot_coin_to_index:
            self._refresh_spot_meta_cache()

        # If already in @index format, parse it
        if coin.startswith("@"):
            try:
                idx = int(coin[1:])
                return SPOT_ASSET_OFFSET + idx
            except ValueError:
                pass

        # Try to find by pair name
        if coin in self._spot_coin_to_index:
            return SPOT_ASSET_OFFSET + self._spot_coin_to_index[coin]

        # Try to find by base token name with /USDC suffix
        pair_name = f"{coin}/USDC"
        if pair_name in self._spot_coin_to_index:
            return SPOT_ASSET_OFFSET + self._spot_coin_to_index[pair_name]

        # Refresh and try again
        self._refresh_spot_meta_cache()

        if coin in self._spot_coin_to_index:
            return SPOT_ASSET_OFFSET + self._spot_coin_to_index[coin]

        if pair_name in self._spot_coin_to_index:
            return SPOT_ASSET_OFFSET + self._spot_coin_to_index[pair_name]

        return -1

    def get_coin_from_perp_asset_id(self, asset_id: int) -> str:
        """Convert perpetual asset ID back to coin name."""
        if not self._perp_index_to_coin:
            self._refresh_meta_cache()
        return self._perp_index_to_coin.get(asset_id, "")

    def get_coin_from_spot_asset_id(self, asset_id: int) -> str:
        """Convert spot asset ID back to coin/pair name."""
        if asset_id >= SPOT_ASSET_OFFSET:
            idx = asset_id - SPOT_ASSET_OFFSET
            if not self._spot_index_to_coin:
                self._refresh_spot_meta_cache()
            return self._spot_index_to_coin.get(idx, f"@{idx}")
        return ""

    def get_all_perp_asset_ids(self) -> Dict[str, int]:
        """Get mapping of all perpetual coins to their asset IDs."""
        if not self._perp_coin_to_index:
            self._refresh_meta_cache()
        return dict(self._perp_coin_to_index)

    def get_all_spot_asset_ids(self) -> Dict[str, int]:
        """Get mapping of all spot pairs to their asset IDs (with 10000 offset)."""
        if not self._spot_coin_to_index:
            self._refresh_spot_meta_cache()
        return {k: SPOT_ASSET_OFFSET + v for k, v in self._spot_coin_to_index.items()}

    # ==================
    # Account Information
    # ==================

    def get_user_state(self) -> Dict[str, Any]:
        """Get user account state including positions and margin summary."""
        return self.info.user_state(self.wallet_address)

    def get_spot_user_state(self) -> Dict[str, Any]:
        """Get user spot account state."""
        return self.info.spot_user_state(self.wallet_address)

    def get_positions(self) -> List[HyperliquidPosition]:
        """Get all open positions."""
        user_state = self.get_user_state()
        positions = []

        for asset_position in user_state.get("assetPositions", []):
            pos = asset_position.get("position", {})
            if float(pos.get("szi", 0)) != 0:
                leverage = pos.get("leverage", {})
                positions.append(HyperliquidPosition(
                    coin=pos.get("coin", ""),
                    entry_price=float(pos.get("entryPx", 0)) if pos.get("entryPx") else 0,
                    position_value=float(pos.get("positionValue", 0)),
                    size=float(pos.get("szi", 0)),
                    unrealized_pnl=float(pos.get("unrealizedPnl", 0)),
                    return_on_equity=float(pos.get("returnOnEquity", 0)),
                    leverage_type=leverage.get("type", "cross"),
                    leverage_value=int(leverage.get("value", 1)),
                    liquidation_price=float(pos.get("liquidationPx")) if pos.get("liquidationPx") else None,
                    margin_used=float(pos.get("marginUsed", 0)),
                ))

        return positions

    def get_margin_summary(self) -> Dict[str, Any]:
        """Get margin summary for the account."""
        user_state = self.get_user_state()
        return user_state.get("marginSummary", {})

    def get_account_value(self) -> float:
        """Get total account value in USD."""
        margin_summary = self.get_margin_summary()
        return float(margin_summary.get("accountValue", 0))

    def get_withdrawable(self) -> float:
        """Get withdrawable balance."""
        user_state = self.get_user_state()
        return float(user_state.get("withdrawable", 0))

    # ==================
    # Market Data
    # ==================

    def get_all_mids(self) -> Dict[str, float]:
        """Get mid prices for all assets."""
        mids = self.info.all_mids()
        return {k: float(v) for k, v in mids.items()}

    def get_price(self, coin: str) -> float:
        """Get current mid price for a coin."""
        mids = self.get_all_mids()
        return mids.get(coin, 0)

    def get_l2_book(self, coin: str) -> Dict[str, Any]:
        """Get L2 order book snapshot."""
        return self.info.l2_snapshot(coin)

    def get_meta(self) -> Dict[str, Any]:
        """Get exchange metadata (available assets, decimals, etc.)."""
        return self.info.meta()

    def get_spot_meta(self) -> Dict[str, Any]:
        """Get spot exchange metadata."""
        return self.info.spot_meta()

    def get_meta_and_asset_ctxs(self) -> Any:
        """Get metadata and asset contexts including funding rates."""
        return self.info.meta_and_asset_ctxs()

    def get_funding_history(self, coin: str, start_time: int, end_time: Optional[int] = None) -> List[Dict]:
        """Get funding history for a coin."""
        return self.info.funding_history(coin, start_time, end_time)

    def get_candles(self, coin: str, interval: str, start_time: int, end_time: int) -> List[Dict]:
        """Get OHLCV candle data."""
        return self.info.candles_snapshot(coin, interval, start_time, end_time)

    # ==================
    # Orders
    # ==================

    def get_open_orders(self) -> List[HyperliquidOrder]:
        """Get all open orders."""
        orders = self.info.open_orders(self.wallet_address)
        return [
            HyperliquidOrder(
                oid=order.get("oid", 0),
                coin=order.get("coin", ""),
                side=order.get("side", ""),
                size=float(order.get("sz", 0)),
                limit_price=float(order.get("limitPx", 0)),
                timestamp=order.get("timestamp", 0),
                order_type="limit"
            )
            for order in orders
        ]

    def get_user_fills(self) -> List[Dict]:
        """Get user's trade history."""
        return self.info.user_fills(self.wallet_address)

    def get_user_fills_by_time(self, start_time: int, end_time: Optional[int] = None) -> List[Dict]:
        """Get user's trade history by time range."""
        return self.info.user_fills_by_time(self.wallet_address, start_time, end_time)

    # ==================
    # Trading - Perpetuals
    # ==================

    def place_order(
        self,
        coin: str,
        is_buy: bool,
        size: float,
        limit_price: float,
        order_type: Literal["limit", "ioc", "alo"] = "limit",
        reduce_only: bool = False,
        cloid: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Place a limit order.

        Args:
            coin: Trading pair (e.g., 'BTC', 'ETH', 'SOL')
            is_buy: True for buy (long), False for sell (short)
            size: Order size
            limit_price: Limit price
            order_type: "limit" (GTC), "ioc" (Immediate or Cancel), "alo" (Add Liquidity Only)
            reduce_only: Whether this order can only reduce position
            cloid: Optional client order ID

        Returns:
            Order response
        """
        tif_map = {
            "limit": "Gtc",
            "ioc": "Ioc",
            "alo": "Alo"
        }

        order_type_param = {"limit": {"tif": tif_map.get(order_type, "Gtc")}}

        return self.exchange.order(
            name=coin,
            is_buy=is_buy,
            sz=size,
            limit_px=limit_price,
            order_type=order_type_param,
            reduce_only=reduce_only,
            cloid=cloid,
        )

    def market_open(
        self,
        coin: str,
        is_buy: bool,
        size: float,
        slippage: float = 0.05,
    ) -> Dict[str, Any]:
        """
        Place a market order to open a position.

        Args:
            coin: Trading pair (e.g., 'BTC', 'ETH', 'SOL')
            is_buy: True for long, False for short
            size: Position size
            slippage: Max slippage (default 5%)

        Returns:
            Order response
        """
        return self.exchange.market_open(coin, is_buy, size, slippage=slippage)

    def market_close(
        self,
        coin: str,
        size: Optional[float] = None,
        slippage: float = 0.05,
    ) -> Dict[str, Any]:
        """
        Place a market order to close a position.

        Args:
            coin: Trading pair (e.g., 'BTC', 'ETH', 'SOL')
            size: Size to close (None = close entire position)
            slippage: Max slippage (default 5%)

        Returns:
            Order response
        """
        return self.exchange.market_close(coin, sz=size, slippage=slippage)

    def cancel_order(self, coin: str, oid: int) -> Dict[str, Any]:
        """Cancel an order by order ID."""
        return self.exchange.cancel(coin, oid)

    def cancel_all_orders(self) -> List[Dict[str, Any]]:
        """Cancel all open orders."""
        open_orders = self.get_open_orders()
        results = []
        for order in open_orders:
            try:
                result = self.cancel_order(order.coin, order.oid)
                results.append(result)
            except Exception as e:
                results.append({"error": str(e), "oid": order.oid})
        return results

    # ==================
    # Leverage & Margin
    # ==================

    def update_leverage(self, coin: str, leverage: int, is_cross: bool = True) -> Dict[str, Any]:
        """
        Update leverage for a coin.

        Args:
            coin: Asset name (e.g., 'BTC', 'ETH')
            leverage: Leverage value (1-100+)
            is_cross: True for cross margin, False for isolated

        Returns:
            Response
        """
        return self.exchange.update_leverage(leverage, coin, is_cross)

    def update_isolated_margin(self, coin: str, amount: float) -> Dict[str, Any]:
        """
        Update isolated margin for a position.

        Args:
            coin: Asset name
            amount: Amount to add (positive) or remove (negative)

        Returns:
            Response
        """
        return self.exchange.update_isolated_margin(amount, coin)

    # ==================
    # Transfers
    # ==================

    def usd_transfer(self, amount: float, destination: str) -> Dict[str, Any]:
        """
        Transfer USD to another address.

        Args:
            amount: Amount to transfer
            destination: Destination address

        Returns:
            Response
        """
        return self.exchange.usd_transfer(amount, destination)

    def spot_transfer(self, amount: float, destination: str, token: str) -> Dict[str, Any]:
        """
        Transfer spot token to another address.

        Args:
            amount: Amount to transfer
            destination: Destination address
            token: Token name

        Returns:
            Response
        """
        return self.exchange.spot_transfer(amount, destination, token)

    def usd_class_transfer(self, amount: float, to_perp: bool) -> Dict[str, Any]:
        """
        Transfer between spot and perp.

        Args:
            amount: Amount to transfer
            to_perp: True to transfer to perp, False to transfer to spot

        Returns:
            Response
        """
        return self.exchange.usd_class_transfer(amount, to_perp)

    # ==================
    # Spot Trading
    # ==================

    def spot_order(
        self,
        coin: str,
        is_buy: bool,
        size: float,
        limit_price: float,
        order_type: Literal["limit", "ioc"] = "limit",
    ) -> Dict[str, Any]:
        """
        Place a spot order.

        Args:
            coin: Spot pair name (e.g., 'PURR/USDC')
            is_buy: True for buy, False for sell
            size: Order size
            limit_price: Limit price
            order_type: "limit" or "ioc"

        Returns:
            Order response
        """
        tif_map = {
            "limit": "Gtc",
            "ioc": "Ioc",
        }

        order_type_param = {"limit": {"tif": tif_map.get(order_type, "Gtc")}}

        return self.exchange.order(
            name=coin,
            is_buy=is_buy,
            sz=size,
            limit_px=limit_price,
            order_type=order_type_param,
            reduce_only=False,
        )

    # ==================
    # Staking
    # ==================

    def get_staking_summary(self) -> Dict[str, Any]:
        """Get staking summary."""
        return self.info.user_staking_summary(self.wallet_address)

    def get_staking_delegations(self) -> List[Dict]:
        """Get user's staking delegations."""
        return self.info.user_staking_delegations(self.wallet_address)

    # ==================
    # Account Fees
    # ==================

    def get_user_fees(self) -> Dict[str, Any]:
        """Get user fee schedule and volume."""
        return self.info.user_fees(self.wallet_address)

    # ==================
    # Utilities
    # ==================

    def get_available_coins(self) -> List[str]:
        """Get list of available trading coins."""
        meta = self.get_meta()
        return [asset["name"] for asset in meta.get("universe", [])]

    def get_available_spot_pairs(self) -> List[str]:
        """Get list of available spot trading pairs."""
        spot_meta = self.get_spot_meta()
        pairs = []
        tokens = {t["index"]: t["name"] for t in spot_meta.get("tokens", [])}
        for pair in spot_meta.get("universe", []):
            base_idx, quote_idx = pair["tokens"]
            base = tokens.get(base_idx, "")
            quote = tokens.get(quote_idx, "")
            pairs.append(f"{base}/{quote}")
        return pairs

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
