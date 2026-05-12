"""Aster DEX Client - Perpetuals and Spot Trading"""

import json
import math
import time
import httpx
from typing import Optional, Dict, Any, List, Literal
from dataclasses import dataclass
from eth_abi import encode
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3


ASTER_BASE_URL = "https://fapi.asterdex.com"


@dataclass
class AsterPosition:
    """Position information"""
    symbol: str
    position_side: str
    position_amt: float
    entry_price: float
    unrealized_profit: float
    leverage: int
    margin_type: str
    isolated_margin: float
    is_auto_add_margin: bool
    position_initial_margin: float
    maint_margin: float
    initial_margin: float
    open_order_initial_margin: float
    max_notional_value: float
    bid_notional: float
    ask_notional: float


@dataclass
class AsterOrder:
    """Order information"""
    order_id: int
    symbol: str
    status: str
    client_order_id: str
    price: float
    avg_price: float
    orig_qty: float
    executed_qty: float
    cumulative_quote_qty: float
    time_in_force: str
    type: str
    reduce_only: bool
    close_position: bool
    side: str
    position_side: str
    stop_price: float
    working_type: str
    price_protect: bool
    orig_type: str
    update_time: int


class AsterClient:
    """Client for Aster DEX Perpetuals and Spot Trading"""

    def __init__(
        self,
        user_address: str,
        signer_address: str,
        private_key: str,
        base_url: str = ASTER_BASE_URL,
    ):
        """
        Initialize Aster DEX client.

        Args:
            user_address: Main account wallet address (0x...)
            signer_address: API wallet address (0x...)
            private_key: Private key for signing (0x...)
            base_url: Aster API base URL
        """
        self.user = user_address
        self.signer = signer_address
        self.private_key = private_key
        self.base_url = base_url

        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0
        )

    def _generate_nonce(self) -> int:
        """Generate nonce (current time in microseconds)"""
        return math.trunc(time.time() * 1000000)

    def _trim_dict(self, my_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Convert all values to strings for signing"""
        for key in my_dict:
            value = my_dict[key]
            if isinstance(value, list):
                new_value = []
                for item in value:
                    if isinstance(item, dict):
                        new_value.append(json.dumps(self._trim_dict(item)))
                    else:
                        new_value.append(str(item))
                my_dict[key] = json.dumps(new_value)
                continue
            if isinstance(value, dict):
                my_dict[key] = json.dumps(self._trim_dict(value))
                continue
            my_dict[key] = str(value)
        return my_dict

    def _sign_request(self, params: Dict[str, Any], nonce: int) -> str:
        """
        Generate signature for request.

        Args:
            params: Request parameters
            nonce: Current timestamp in microseconds

        Returns:
            Signature string (0x...)
        """
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}

        # Add timing parameters
        params['recvWindow'] = 50000
        params['timestamp'] = int(round(time.time() * 1000))

        # Convert to strings
        self._trim_dict(params)

        # Generate sorted JSON string
        json_str = json.dumps(params, sort_keys=True).replace(' ', '').replace("'", '"')

        # ABI encode
        encoded = encode(
            ['string', 'address', 'address', 'uint256'],
            [json_str, self.user, self.signer, nonce]
        )

        # Keccak hash
        keccak_hex = Web3.keccak(encoded).hex()

        # Sign with private key
        signable_msg = encode_defunct(hexstr=keccak_hex)
        signed_message = Account.sign_message(
            signable_message=signable_msg,
            private_key=self.private_key
        )

        return '0x' + signed_message.signature.hex()

    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        signed: bool = False
    ) -> Dict[str, Any]:
        """
        Make HTTP request to Aster API.

        Args:
            method: HTTP method (GET, POST, DELETE)
            endpoint: API endpoint
            params: Request parameters
            signed: Whether to sign the request

        Returns:
            JSON response
        """
        if params is None:
            params = {}

        if signed:
            nonce = self._generate_nonce()
            signature = self._sign_request(params.copy(), nonce)

            params['nonce'] = nonce
            params['user'] = self.user
            params['signer'] = self.signer
            params['signature'] = signature

        if method == 'GET':
            response = await self._client.get(endpoint, params=params)
        elif method == 'POST':
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'MAWD/1.0'
            }
            response = await self._client.post(endpoint, data=params, headers=headers)
        elif method == 'DELETE':
            response = await self._client.delete(endpoint, data=params)
        else:
            raise ValueError(f"Unsupported method: {method}")

        response.raise_for_status()
        return response.json()

    # ==================
    # Market Data
    # ==================

    async def get_exchange_info(self) -> Dict[str, Any]:
        """Get exchange information"""
        return await self._request('GET', '/fapi/v1/exchangeInfo')

    async def get_ticker_24h(self, symbol: Optional[str] = None) -> Dict[str, Any]:
        """Get 24hr ticker price change statistics"""
        params = {}
        if symbol:
            params['symbol'] = symbol
        return await self._request('GET', '/fapi/v1/ticker/24hr', params)

    async def get_mark_price(self, symbol: Optional[str] = None) -> Dict[str, Any]:
        """Get mark price and funding rate"""
        params = {}
        if symbol:
            params['symbol'] = symbol
        return await self._request('GET', '/fapi/v1/premiumIndex', params)

    async def get_orderbook(self, symbol: str, limit: int = 500) -> Dict[str, Any]:
        """Get order book"""
        return await self._request('GET', '/fapi/v1/depth', {'symbol': symbol, 'limit': limit})

    async def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> List[List]:
        """Get kline/candlestick data"""
        params = {
            'symbol': symbol,
            'interval': interval,
            'limit': limit
        }
        if start_time:
            params['startTime'] = start_time
        if end_time:
            params['endTime'] = end_time
        return await self._request('GET', '/fapi/v1/klines', params)

    # ==================
    # Trading - Perpetuals
    # ==================

    async def place_order(
        self,
        symbol: str,
        side: Literal['BUY', 'SELL'],
        order_type: Literal['LIMIT', 'MARKET', 'STOP', 'STOP_MARKET', 'TAKE_PROFIT', 'TAKE_PROFIT_MARKET'],
        quantity: float,
        position_side: Literal['BOTH', 'LONG', 'SHORT'] = 'BOTH',
        price: Optional[float] = None,
        time_in_force: Optional[str] = 'GTC',
        reduce_only: bool = False,
        stop_price: Optional[float] = None,
        close_position: bool = False,
    ) -> Dict[str, Any]:
        """
        Place a new order.

        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            side: BUY or SELL
            order_type: Order type
            quantity: Order quantity
            position_side: Position side (BOTH, LONG, SHORT)
            price: Order price (required for LIMIT orders)
            time_in_force: GTC, IOC, FOK, GTX
            reduce_only: Reduce only
            stop_price: Stop price (for stop orders)
            close_position: Close position

        Returns:
            Order response
        """
        params = {
            'symbol': symbol,
            'side': side,
            'type': order_type,
            'quantity': quantity,
            'positionSide': position_side,
            'reduceOnly': reduce_only,
            'closePosition': close_position,
        }

        if price is not None:
            params['price'] = price
        if time_in_force:
            params['timeInForce'] = time_in_force
        if stop_price is not None:
            params['stopPrice'] = stop_price

        return await self._request('POST', '/fapi/v3/order', params, signed=True)

    async def cancel_order(
        self,
        symbol: str,
        order_id: Optional[int] = None,
        orig_client_order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Cancel an order"""
        params = {'symbol': symbol}
        if order_id:
            params['orderId'] = order_id
        if orig_client_order_id:
            params['origClientOrderId'] = orig_client_order_id

        return await self._request('DELETE', '/fapi/v3/order', params, signed=True)

    async def cancel_all_orders(self, symbol: str) -> Dict[str, Any]:
        """Cancel all open orders"""
        return await self._request('DELETE', '/fapi/v3/allOpenOrders', {'symbol': symbol}, signed=True)

    async def get_order(
        self,
        symbol: str,
        order_id: Optional[int] = None,
        orig_client_order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Query order"""
        params = {'symbol': symbol}
        if order_id:
            params['orderId'] = order_id
        if orig_client_order_id:
            params['origClientOrderId'] = orig_client_order_id

        return await self._request('GET', '/fapi/v3/order', params, signed=True)

    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all open orders"""
        params = {}
        if symbol:
            params['symbol'] = symbol
        return await self._request('GET', '/fapi/v3/openOrders', params, signed=True)

    async def get_all_orders(
        self,
        symbol: str,
        order_id: Optional[int] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """Get all orders"""
        params = {'symbol': symbol, 'limit': limit}
        if order_id:
            params['orderId'] = order_id
        if start_time:
            params['startTime'] = start_time
        if end_time:
            params['endTime'] = end_time

        return await self._request('GET', '/fapi/v3/allOrders', params, signed=True)

    # ==================
    # Account
    # ==================

    async def get_account_balance(self) -> List[Dict[str, Any]]:
        """Get futures account balance"""
        return await self._request('GET', '/fapi/v3/balance', {}, signed=True)

    async def get_account_info(self) -> Dict[str, Any]:
        """Get account information"""
        return await self._request('GET', '/fapi/v3/account', {}, signed=True)

    async def get_positions(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get position information"""
        params = {}
        if symbol:
            params['symbol'] = symbol
        return await self._request('GET', '/fapi/v3/positionRisk', params, signed=True)

    async def change_leverage(self, symbol: str, leverage: int) -> Dict[str, Any]:
        """Change initial leverage"""
        return await self._request(
            'POST',
            '/fapi/v3/leverage',
            {'symbol': symbol, 'leverage': leverage},
            signed=True
        )

    async def change_margin_type(
        self,
        symbol: str,
        margin_type: Literal['ISOLATED', 'CROSSED']
    ) -> Dict[str, Any]:
        """Change margin type"""
        return await self._request(
            'POST',
            '/fapi/v3/marginType',
            {'symbol': symbol, 'marginType': margin_type},
            signed=True
        )

    async def change_position_mode(self, dual_side_position: bool) -> Dict[str, Any]:
        """Change position mode (hedge mode)"""
        return await self._request(
            'POST',
            '/fapi/v3/positionSide/dual',
            {'dualSidePosition': 'true' if dual_side_position else 'false'},
            signed=True
        )

    async def get_position_mode(self) -> Dict[str, Any]:
        """Get current position mode"""
        return await self._request('GET', '/fapi/v3/positionSide/dual', {}, signed=True)

    # ==================
    # Transfers
    # ==================

    async def transfer_between_futures_spot(
        self,
        asset: str,
        amount: float,
        transfer_type: Literal[1, 2]  # 1: spot to futures, 2: futures to spot
    ) -> Dict[str, Any]:
        """Transfer between futures and spot"""
        return await self._request(
            'POST',
            '/fapi/v3/transfer',
            {'asset': asset, 'amount': amount, 'type': transfer_type},
            signed=True
        )

    # ==================
    # Spot Trading
    # ==================

    async def spot_place_order(
        self,
        symbol: str,
        side: Literal['BUY', 'SELL'],
        order_type: Literal['LIMIT', 'MARKET'],
        quantity: Optional[float] = None,
        quote_order_qty: Optional[float] = None,
        price: Optional[float] = None,
        time_in_force: Optional[str] = 'GTC',
        new_client_order_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Place a spot order.

        Args:
            symbol: Trading pair (e.g., 'BTCUSDT')
            side: BUY or SELL
            order_type: LIMIT or MARKET
            quantity: Order quantity (base asset)
            quote_order_qty: Quote asset quantity (for MARKET BUY only)
            price: Order price (required for LIMIT orders)
            time_in_force: GTC, IOC, FOK
            new_client_order_id: Custom order ID

        Returns:
            Order response
        """
        params = {
            'symbol': symbol,
            'side': side,
            'type': order_type,
        }

        if quantity is not None:
            params['quantity'] = quantity
        if quote_order_qty is not None:
            params['quoteOrderQty'] = quote_order_qty
        if price is not None:
            params['price'] = price
        if time_in_force:
            params['timeInForce'] = time_in_force
        if new_client_order_id:
            params['newClientOrderId'] = new_client_order_id

        return await self._request('POST', '/api/v3/order', params, signed=True)

    async def spot_cancel_order(
        self,
        symbol: str,
        order_id: Optional[int] = None,
        orig_client_order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Cancel a spot order"""
        params = {'symbol': symbol}
        if order_id:
            params['orderId'] = order_id
        if orig_client_order_id:
            params['origClientOrderId'] = orig_client_order_id

        return await self._request('DELETE', '/api/v3/order', params, signed=True)

    async def spot_cancel_all_orders(self, symbol: str) -> Dict[str, Any]:
        """Cancel all open spot orders"""
        return await self._request('DELETE', '/api/v3/openOrders', {'symbol': symbol}, signed=True)

    async def spot_get_order(
        self,
        symbol: str,
        order_id: Optional[int] = None,
        orig_client_order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Query spot order"""
        params = {'symbol': symbol}
        if order_id:
            params['orderId'] = order_id
        if orig_client_order_id:
            params['origClientOrderId'] = orig_client_order_id

        return await self._request('GET', '/api/v3/order', params, signed=True)

    async def spot_get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all open spot orders"""
        params = {}
        if symbol:
            params['symbol'] = symbol
        return await self._request('GET', '/api/v3/openOrders', params, signed=True)

    async def spot_get_all_orders(
        self,
        symbol: str,
        order_id: Optional[int] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """Get all spot orders"""
        params = {'symbol': symbol, 'limit': limit}
        if order_id:
            params['orderId'] = order_id
        if start_time:
            params['startTime'] = start_time
        if end_time:
            params['endTime'] = end_time

        return await self._request('GET', '/api/v3/allOrders', params, signed=True)

    async def spot_get_account(self) -> Dict[str, Any]:
        """Get spot account information"""
        return await self._request('GET', '/api/v3/account', {}, signed=True)

    async def spot_get_my_trades(
        self,
        symbol: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        from_id: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """Get spot trade history"""
        params = {'symbol': symbol, 'limit': limit}
        if start_time:
            params['startTime'] = start_time
        if end_time:
            params['endTime'] = end_time
        if from_id:
            params['fromId'] = from_id

        return await self._request('GET', '/api/v3/myTrades', params, signed=True)

    # ==================
    # Trade History
    # ==================

    async def get_trade_history(
        self,
        symbol: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        from_id: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """Get account trade list"""
        params = {'symbol': symbol, 'limit': limit}
        if start_time:
            params['startTime'] = start_time
        if end_time:
            params['endTime'] = end_time
        if from_id:
            params['fromId'] = from_id

        return await self._request('GET', '/fapi/v3/userTrades', params, signed=True)

    async def get_income_history(
        self,
        symbol: Optional[str] = None,
        income_type: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get income history"""
        params = {'limit': limit}
        if symbol:
            params['symbol'] = symbol
        if income_type:
            params['incomeType'] = income_type
        if start_time:
            params['startTime'] = start_time
        if end_time:
            params['endTime'] = end_time

        return await self._request('GET', '/fapi/v3/income', params, signed=True)

    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
