"""CDP (Coinbase Developer Platform) Client for Solana Account Management"""

import os
import time
import base64
import asyncio
from typing import Optional, List, Dict, Any
from pathlib import Path

try:
    from cdp import CdpClient
    CDP_AVAILABLE = True
except ImportError:
    CDP_AVAILABLE = False
    CdpClient = None

from solana.rpc.api import Client as SolanaClient
from solana.rpc.types import TxOpts
from solders.pubkey import Pubkey as PublicKey
from solders.system_program import TransferParams, transfer
from solders.message import Message


class CDPSolanaClient:
    """Client for CDP Solana account operations"""

    def __init__(
        self,
        api_key_id: str,
        api_key_secret: str,
        wallet_secret: Optional[str] = None,
        rpc_url: str = "https://api.mainnet-beta.solana.com",
        network: str = "solana-mainnet",
    ):
        """
        Initialize CDP Solana client.

        Args:
            api_key_id: CDP API Key ID
            api_key_secret: CDP API Key Secret (Ed25519 base64 or PEM EC key)
            wallet_secret: Optional wallet secret for signing transactions
            rpc_url: Solana RPC URL
            network: Network identifier (solana-mainnet or solana-devnet)
        """
        if not CDP_AVAILABLE:
            raise ImportError(
                "cdp-sdk not installed. Run: pip install cdp-sdk"
            )

        self.api_key_id = api_key_id
        self.api_key_secret = api_key_secret
        self.wallet_secret = wallet_secret
        self.rpc_url = rpc_url
        self.network = network

        # Initialize CDP client
        self.cdp = CdpClient(
            api_key_id=api_key_id,
            api_key_secret=api_key_secret,
            wallet_secret=wallet_secret,
        )

        # Initialize Solana RPC connection
        self.connection = SolanaClient(rpc_url)

        # Cache for created accounts
        self._accounts_cache: Dict[str, Any] = {}

    def _get_explorer_url(self, signature: str) -> str:
        """Get Solana Explorer URL for a transaction."""
        if self.network == "solana-devnet":
            return f"https://explorer.solana.com/tx/{signature}?cluster=devnet"
        else:
            return f"https://explorer.solana.com/tx/{signature}"

    async def create_account(self, name: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new Solana account via CDP.

        Args:
            name: Optional unique name for the account (2-36 chars, alphanumeric + hyphens)

        Returns:
            Account info with address and metadata
        """
        if name:
            account = await self.cdp.solana.create_account(name=name)
        else:
            account = await self.cdp.solana.create_account()

        # Cache the account
        self._accounts_cache[account.address] = account

        return {
            "address": account.address,
            "name": getattr(account, "name", None),
            "created_at": getattr(account, "created_at", None),
        }

    async def get_account(self, address: str) -> Dict[str, Any]:
        """
        Get a Solana account by address.

        Args:
            address: Base58 encoded Solana address

        Returns:
            Account info
        """
        account = await self.cdp.solana.get_account(address)
        return {
            "address": account.address,
            "name": getattr(account, "name", None),
            "policies": getattr(account, "policies", []),
            "created_at": getattr(account, "created_at", None),
            "updated_at": getattr(account, "updated_at", None),
        }

    async def list_accounts(self) -> List[Dict[str, Any]]:
        """
        List all Solana accounts in the CDP project.

        Returns:
            List of account info dicts
        """
        result = await self.cdp.solana.list_accounts()

        # CDP SDK returns (accounts_list, next_page_token) tuple
        # or a dict-like object with 'accounts' key
        if hasattr(result, 'accounts'):
            accounts = result.accounts
        elif isinstance(result, tuple) and len(result) >= 1:
            accounts = result[0]
        elif isinstance(result, dict) and 'accounts' in result:
            accounts = result['accounts']
        else:
            accounts = result

        return [
            {
                "address": acc.address if hasattr(acc, 'address') else str(acc).split(': ')[-1],
                "name": getattr(acc, "name", None),
            }
            for acc in accounts
        ]

    async def request_faucet(self, address: str, token: str = "sol") -> Dict[str, Any]:
        """
        Request funds from the Solana devnet faucet.

        NOTE: Faucet only works on devnet. For mainnet, you must fund accounts manually.

        Args:
            address: Solana address to fund
            token: Token to request ("sol" for native SOL)

        Returns:
            Faucet response with transaction signature
        """
        if self.network != "solana-devnet":
            raise ValueError("Faucet is only available on devnet. For mainnet, fund accounts manually.")

        response = await self.cdp.solana.request_faucet(address, token=token)
        return {
            "transaction_signature": response.transaction_signature,
            "explorer_url": f"https://explorer.solana.com/tx/{response.transaction_signature}?cluster=devnet",
        }

    async def get_balance(self, address: str) -> Dict[str, Any]:
        """
        Get SOL balance for an address.

        Args:
            address: Solana address

        Returns:
            Balance info in SOL and lamports
        """
        balance_resp = self.connection.get_balance(PublicKey.from_string(address))
        balance = balance_resp.value

        return {
            "address": address,
            "balance_lamports": balance,
            "balance_sol": balance / 1e9,
        }

    async def wait_for_balance(
        self,
        address: str,
        min_balance: int = 1,
        max_attempts: int = 30,
    ) -> Dict[str, Any]:
        """
        Wait for an account to be funded.

        Args:
            address: Solana address
            min_balance: Minimum balance to wait for (in lamports)
            max_attempts: Maximum polling attempts

        Returns:
            Final balance info
        """
        balance = 0
        attempts = 0

        while balance < min_balance and attempts < max_attempts:
            balance_resp = self.connection.get_balance(PublicKey.from_string(address))
            balance = balance_resp.value
            if balance < min_balance:
                await asyncio.sleep(1)
                attempts += 1

        if balance < min_balance:
            raise TimeoutError(f"Account not funded after {max_attempts} attempts")

        return {
            "address": address,
            "balance_lamports": balance,
            "balance_sol": balance / 1e9,
            "attempts": attempts,
        }

    async def sign_transaction(self, address: str, transaction: str) -> Dict[str, Any]:
        """
        Sign a Solana transaction using CDP.

        Args:
            address: Signer address
            transaction: Base64 encoded transaction

        Returns:
            Signed transaction response
        """
        response = await self.cdp.solana.sign_transaction(
            address, transaction=transaction
        )
        return {
            "signed_transaction": response.signed_transaction,
        }

    async def send_sol(
        self,
        from_address: str,
        to_address: str,
        lamports: int = 1000,
    ) -> Dict[str, Any]:
        """
        Send SOL from one account to another.

        Args:
            from_address: Sender address (must be CDP-managed)
            to_address: Recipient address
            lamports: Amount in lamports (default: 1000 = 0.000001 SOL)

        Returns:
            Transaction result with signature
        """
        from_pubkey = PublicKey.from_string(from_address)
        to_pubkey = PublicKey.from_string(to_address)

        # Get latest blockhash
        blockhash_resp = self.connection.get_latest_blockhash()
        blockhash = blockhash_resp.value.blockhash

        # Create transfer instruction
        transfer_params = TransferParams(
            from_pubkey=from_pubkey,
            to_pubkey=to_pubkey,
            lamports=lamports,
        )
        transfer_instr = transfer(transfer_params)

        # Build message
        message = Message.new_with_blockhash(
            [transfer_instr],
            from_pubkey,
            blockhash,
        )

        # Create transaction envelope with signature space
        sig_count = bytes([1])
        empty_sig = bytes([0] * 64)
        message_bytes = bytes(message)
        tx_bytes = sig_count + empty_sig + message_bytes

        # Encode to base64 for CDP API
        serialized_tx = base64.b64encode(tx_bytes).decode("utf-8")

        # Sign with CDP
        signed_tx_response = await self.cdp.solana.sign_transaction(
            from_address,
            transaction=serialized_tx,
        )

        # Decode and send
        decoded_signed_tx = base64.b64decode(signed_tx_response.signed_transaction)

        tx_resp = self.connection.send_raw_transaction(
            decoded_signed_tx,
            opts=TxOpts(skip_preflight=False, preflight_commitment="processed"),
        )
        signature = tx_resp.value

        # Wait for confirmation
        confirmation = self.connection.confirm_transaction(
            signature, commitment="processed"
        )

        if hasattr(confirmation, "err") and confirmation.err:
            raise ValueError(f"Transaction failed: {confirmation.err}")

        return {
            "signature": str(signature),
            "from_address": from_address,
            "to_address": to_address,
            "lamports": lamports,
            "sol_amount": lamports / 1e9,
            "explorer_url": self._get_explorer_url(str(signature)),
        }

    async def sign_message(self, address: str, message: str) -> Dict[str, Any]:
        """
        Sign a message using CDP.

        Args:
            address: Signer address
            message: Message to sign

        Returns:
            Signed message response
        """
        encoded_message = base64.b64encode(message.encode()).decode("utf-8")
        response = await self.cdp.solana.sign_message(address, message=encoded_message)
        return {
            "signature": response.signature,
            "address": address,
        }

    async def close(self):
        """Close the CDP client connection."""
        await self.cdp.close()


# Factory function for easy initialization
def create_cdp_client(
    api_key_id: Optional[str] = None,
    api_key_secret: Optional[str] = None,
    wallet_secret: Optional[str] = None,
    rpc_url: str = "https://api.mainnet-beta.solana.com",
    network: str = "solana-mainnet",
) -> Optional[CDPSolanaClient]:
    """
    Create a CDP client from environment variables or parameters.

    Args:
        api_key_id: CDP API Key ID (or CDP_API_KEY_ID env var)
        api_key_secret: CDP API Key Secret (or CDP_API_KEY_SECRET env var)
        wallet_secret: Optional wallet secret (or CDP_WALLET_SECRET env var)
        rpc_url: Solana RPC URL (defaults to mainnet)
        network: Network identifier - "solana-mainnet" or "solana-devnet"

    Returns None if CDP SDK is not available or credentials are missing.
    """
    if not CDP_AVAILABLE:
        return None

    api_key_id = api_key_id or os.getenv("CDP_API_KEY_ID")
    api_key_secret = api_key_secret or os.getenv("CDP_API_KEY_SECRET")
    wallet_secret = wallet_secret or os.getenv("CDP_WALLET_SECRET")

    if not api_key_id or not api_key_secret:
        return None

    return CDPSolanaClient(
        api_key_id=api_key_id,
        api_key_secret=api_key_secret,
        wallet_secret=wallet_secret,
        rpc_url=rpc_url,
        network=network,
    )
