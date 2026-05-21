"""PumpFun Client - Launch and trade tokens on pump.fun"""

import httpx
import base58
import struct
import json
from typing import Optional, List
from dataclasses import dataclass
from pathlib import Path

from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.transaction import VersionedTransaction
from solders.message import MessageV0
from solders.hash import Hash
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solders.sysvar import RENT as SYSVAR_RENT_ID


# Program IDs
PUMP_PROGRAM_ID = Pubkey.from_string("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P")
PUMP_GLOBAL = Pubkey.from_string("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf")
PUMP_FEE_RECIPIENT = Pubkey.from_string("62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV")
PUMP_EVENT_AUTHORITY = Pubkey.from_string("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1")

# Mayhem mode (new token creation)
MAYHEM_PROGRAM_ID = Pubkey.from_string("MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e")
MAYHEM_GLOBAL_PARAMS = Pubkey.from_string("13ec7XdrjF3h3YcqBTFDSReRcUFwbCnJaAQspM4j6DDJ")
MAYHEM_SOL_VAULT = Pubkey.from_string("BwWK17cbHxwWBKZkUYvzxLcNQ1YVyaFezduWbtm2de6s")

# Token programs
TOKEN_PROGRAM_ID = Pubkey.from_string("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
TOKEN_2022_PROGRAM_ID = Pubkey.from_string("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")
ASSOCIATED_TOKEN_PROGRAM_ID = Pubkey.from_string("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")

# Metaplex
METAPLEX_PROGRAM_ID = Pubkey.from_string("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

# Instruction discriminators (from IDL)
CREATE_DISCRIMINATOR = bytes([24, 30, 200, 40, 5, 28, 7, 119])
CREATE_V2_DISCRIMINATOR = bytes([31, 240, 17, 64, 245, 233, 167, 192])
BUY_DISCRIMINATOR = bytes([102, 6, 61, 18, 1, 218, 235, 234])
SELL_DISCRIMINATOR = bytes([51, 230, 133, 164, 1, 127, 131, 173])

# pump.fun API
PUMPFUN_API_BASE = "https://pump.fun/api"
IPFS_UPLOAD_URL = "https://pump.fun/api/ipfs"


@dataclass
class TokenMetadata:
    """Token metadata for pump.fun"""
    name: str
    symbol: str
    description: str
    image_url: Optional[str] = None
    twitter: Optional[str] = None
    telegram: Optional[str] = None
    website: Optional[str] = None


@dataclass
class BondingCurveState:
    """Bonding curve account state"""
    virtual_token_reserves: int
    virtual_sol_reserves: int
    real_token_reserves: int
    real_sol_reserves: int
    token_total_supply: int
    complete: bool
    creator: Pubkey
    is_mayhem_mode: bool


@dataclass
class CreateTokenResult:
    """Result of token creation"""
    mint: Pubkey
    bonding_curve: Pubkey
    signature: str
    token_url: str


class PumpFunClient:
    """Client for pump.fun token launches and trading"""

    def __init__(
        self,
        rpc_url: str,
        private_key: Optional[str] = None,
    ):
        """
        Initialize PumpFun client.

        Args:
            rpc_url: Solana RPC URL
            private_key: Wallet private key (base58 encoded)
        """
        self.rpc_url = rpc_url
        self.keypair = None

        if private_key:
            try:
                secret_bytes = base58.b58decode(private_key)
                self.keypair = Keypair.from_bytes(secret_bytes)
            except Exception as e:
                raise ValueError(f"Invalid private key: {e}")

        self._http_client = httpx.AsyncClient(timeout=60.0)
        self._rpc_client = httpx.AsyncClient(
            base_url=rpc_url,
            headers={"Content-Type": "application/json"},
            timeout=60.0
        )

    @property
    def wallet_pubkey(self) -> Optional[Pubkey]:
        """Get wallet public key"""
        if self.keypair:
            return self.keypair.pubkey()
        return None

    # ===================
    # PDA Derivations
    # ===================

    def get_mint_authority_pda(self) -> Pubkey:
        """Derive mint authority PDA"""
        seeds = [b"mint-authority"]
        pda, _ = Pubkey.find_program_address(seeds, PUMP_PROGRAM_ID)
        return pda

    def get_bonding_curve_pda(self, mint: Pubkey) -> Pubkey:
        """Derive bonding curve PDA for a mint"""
        seeds = [b"bonding-curve", bytes(mint)]
        pda, _ = Pubkey.find_program_address(seeds, PUMP_PROGRAM_ID)
        return pda

    def get_metadata_pda(self, mint: Pubkey) -> Pubkey:
        """Derive metadata PDA for a mint"""
        seeds = [b"metadata", bytes(METAPLEX_PROGRAM_ID), bytes(mint)]
        pda, _ = Pubkey.find_program_address(seeds, METAPLEX_PROGRAM_ID)
        return pda

    def get_event_authority_pda(self) -> Pubkey:
        """Derive event authority PDA"""
        seeds = [b"__event_authority"]
        pda, _ = Pubkey.find_program_address(seeds, PUMP_PROGRAM_ID)
        return pda

    def get_mayhem_state_pda(self, mint: Pubkey) -> Pubkey:
        """Derive mayhem state PDA for create_v2"""
        seeds = [b"mayhem-state", bytes(mint)]
        pda, _ = Pubkey.find_program_address(seeds, MAYHEM_PROGRAM_ID)
        return pda

    def get_associated_token_address(
        self,
        owner: Pubkey,
        mint: Pubkey,
        token_program: Pubkey = TOKEN_PROGRAM_ID
    ) -> Pubkey:
        """Get associated token address"""
        seeds = [bytes(owner), bytes(token_program), bytes(mint)]
        pda, _ = Pubkey.find_program_address(seeds, ASSOCIATED_TOKEN_PROGRAM_ID)
        return pda

    # ===================
    # RPC Methods
    # ===================

    async def _rpc_request(self, method: str, params: list) -> dict:
        """Make RPC request"""
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        }
        response = await self._rpc_client.post("", json=payload)
        response.raise_for_status()
        result = response.json()
        if "error" in result:
            raise Exception(f"RPC error: {result['error']}")
        return result.get("result")

    async def get_latest_blockhash(self) -> Hash:
        """Get latest blockhash"""
        result = await self._rpc_request("getLatestBlockhash", [{"commitment": "confirmed"}])
        return Hash.from_string(result["value"]["blockhash"])

    async def get_account_info(self, pubkey: Pubkey) -> Optional[dict]:
        """Get account info"""
        result = await self._rpc_request(
            "getAccountInfo",
            [str(pubkey), {"encoding": "base64", "commitment": "confirmed"}]
        )
        return result.get("value")

    async def send_transaction(self, tx: VersionedTransaction) -> str:
        """Send and confirm transaction"""
        tx_bytes = bytes(tx)
        tx_base64 = base58.b58encode(tx_bytes).decode()

        result = await self._rpc_request(
            "sendTransaction",
            [tx_base64, {"encoding": "base58", "skipPreflight": False}]
        )
        return result

    async def get_bonding_curve_state(self, mint: Pubkey) -> Optional[BondingCurveState]:
        """Get bonding curve state for a mint"""
        bonding_curve = self.get_bonding_curve_pda(mint)
        account_info = await self.get_account_info(bonding_curve)

        if not account_info or not account_info.get("data"):
            return None

        import base64
        data = base64.b64decode(account_info["data"][0])

        # Skip 8-byte discriminator
        data = data[8:]

        # Parse struct (all u64 except bool and pubkey)
        virtual_token_reserves = struct.unpack("<Q", data[0:8])[0]
        virtual_sol_reserves = struct.unpack("<Q", data[8:16])[0]
        real_token_reserves = struct.unpack("<Q", data[16:24])[0]
        real_sol_reserves = struct.unpack("<Q", data[24:32])[0]
        token_total_supply = struct.unpack("<Q", data[32:40])[0]
        complete = data[40] == 1
        creator = Pubkey.from_bytes(data[41:73])
        is_mayhem_mode = data[73] == 1 if len(data) > 73 else False

        return BondingCurveState(
            virtual_token_reserves=virtual_token_reserves,
            virtual_sol_reserves=virtual_sol_reserves,
            real_token_reserves=real_token_reserves,
            real_sol_reserves=real_sol_reserves,
            token_total_supply=token_total_supply,
            complete=complete,
            creator=creator,
            is_mayhem_mode=is_mayhem_mode,
        )

    # ===================
    # Metadata Upload
    # ===================

    async def upload_metadata(
        self,
        metadata: TokenMetadata,
        image_path: Optional[str] = None,
    ) -> str:
        """
        Upload token metadata to pump.fun IPFS.

        Args:
            metadata: Token metadata
            image_path: Path to local image file (optional)

        Returns:
            IPFS URI for metadata
        """
        # If we have a local image, upload it first
        if image_path:
            image_url = await self._upload_image(image_path)
            metadata.image_url = image_url

        # Build metadata JSON
        metadata_json = {
            "name": metadata.name,
            "symbol": metadata.symbol,
            "description": metadata.description,
        }

        if metadata.image_url:
            metadata_json["image"] = metadata.image_url
        if metadata.twitter:
            metadata_json["twitter"] = metadata.twitter
        if metadata.telegram:
            metadata_json["telegram"] = metadata.telegram
        if metadata.website:
            metadata_json["website"] = metadata.website

        # Upload to pump.fun IPFS
        response = await self._http_client.post(
            IPFS_UPLOAD_URL,
            json=metadata_json,
        )
        response.raise_for_status()
        result = response.json()

        return result.get("metadataUri", result.get("uri"))

    async def _upload_image(self, image_path: str) -> str:
        """Upload image to pump.fun"""
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        # Determine mime type
        mime_types = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        mime_type = mime_types.get(path.suffix.lower(), "application/octet-stream")

        with open(path, "rb") as f:
            files = {"file": (path.name, f, mime_type)}
            response = await self._http_client.post(
                f"{PUMPFUN_API_BASE}/ipfs",
                files=files,
            )

        response.raise_for_status()
        result = response.json()
        return result.get("imageUri", result.get("uri"))

    # ===================
    # Token Creation
    # ===================

    async def create_token(
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
    ) -> CreateTokenResult:
        """
        Create a new token on pump.fun.

        Args:
            name: Token name
            symbol: Token symbol (ticker)
            description: Token description
            image_url: URL to token image
            image_path: Path to local image file (alternative to image_url)
            twitter: Twitter URL
            telegram: Telegram URL
            website: Website URL
            initial_buy_sol: Initial buy amount in SOL (0 = no initial buy)

        Returns:
            CreateTokenResult with mint, bonding curve, and signature
        """
        if not self.keypair:
            raise ValueError("Keypair required for token creation")

        # Create metadata
        metadata = TokenMetadata(
            name=name,
            symbol=symbol.upper().replace("$", ""),
            description=description,
            image_url=image_url,
            twitter=twitter,
            telegram=telegram,
            website=website,
        )

        # Upload metadata
        metadata_uri = await self.upload_metadata(metadata, image_path)

        # Generate mint keypair
        mint_keypair = Keypair()
        mint = mint_keypair.pubkey()

        # Derive PDAs
        mint_authority = self.get_mint_authority_pda()
        bonding_curve = self.get_bonding_curve_pda(mint)
        associated_bonding_curve = self.get_associated_token_address(bonding_curve, mint)
        metadata_pda = self.get_metadata_pda(mint)
        event_authority = self.get_event_authority_pda()

        # Build create instruction data
        name_bytes = name.encode("utf-8")
        symbol_bytes = symbol.upper().replace("$", "").encode("utf-8")
        uri_bytes = metadata_uri.encode("utf-8")

        # Serialize: discriminator + strings (each prefixed with 4-byte length)
        data = CREATE_DISCRIMINATOR
        data += struct.pack("<I", len(name_bytes)) + name_bytes
        data += struct.pack("<I", len(symbol_bytes)) + symbol_bytes
        data += struct.pack("<I", len(uri_bytes)) + uri_bytes

        # Build accounts
        accounts = [
            AccountMeta(mint, is_signer=True, is_writable=True),
            AccountMeta(mint_authority, is_signer=False, is_writable=False),
            AccountMeta(bonding_curve, is_signer=False, is_writable=True),
            AccountMeta(associated_bonding_curve, is_signer=False, is_writable=True),
            AccountMeta(PUMP_GLOBAL, is_signer=False, is_writable=False),
            AccountMeta(METAPLEX_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(metadata_pda, is_signer=False, is_writable=True),
            AccountMeta(self.wallet_pubkey, is_signer=True, is_writable=True),
            AccountMeta(SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(ASSOCIATED_TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(SYSVAR_RENT_ID, is_signer=False, is_writable=False),
            AccountMeta(event_authority, is_signer=False, is_writable=False),
            AccountMeta(PUMP_PROGRAM_ID, is_signer=False, is_writable=False),
        ]

        create_ix = Instruction(PUMP_PROGRAM_ID, data, accounts)

        # Build transaction
        blockhash = await self.get_latest_blockhash()

        instructions = [create_ix]

        # Add initial buy if requested
        if initial_buy_sol > 0:
            buy_ix = await self._build_buy_instruction(
                mint=mint,
                bonding_curve=bonding_curve,
                associated_bonding_curve=associated_bonding_curve,
                amount=int(initial_buy_sol * 1_000_000_000),  # Convert to lamports
                max_sol_cost=int(initial_buy_sol * 1.1 * 1_000_000_000),  # 10% slippage
            )
            instructions.append(buy_ix)

        message = MessageV0.try_compile(
            payer=self.wallet_pubkey,
            instructions=instructions,
            address_lookup_table_accounts=[],
            recent_blockhash=blockhash,
        )

        tx = VersionedTransaction(message, [self.keypair, mint_keypair])

        # Send transaction
        signature = await self.send_transaction(tx)

        return CreateTokenResult(
            mint=mint,
            bonding_curve=bonding_curve,
            signature=signature,
            token_url=f"https://pump.fun/{mint}",
        )

    # ===================
    # Trading
    # ===================

    async def _build_buy_instruction(
        self,
        mint: Pubkey,
        bonding_curve: Pubkey,
        associated_bonding_curve: Pubkey,
        amount: int,
        max_sol_cost: int,
    ) -> Instruction:
        """Build buy instruction"""
        user_token_account = self.get_associated_token_address(self.wallet_pubkey, mint)

        # Serialize data: discriminator + amount (u64) + max_sol_cost (u64)
        data = BUY_DISCRIMINATOR
        data += struct.pack("<Q", amount)
        data += struct.pack("<Q", max_sol_cost)

        accounts = [
            AccountMeta(PUMP_GLOBAL, is_signer=False, is_writable=False),
            AccountMeta(PUMP_FEE_RECIPIENT, is_signer=False, is_writable=True),
            AccountMeta(mint, is_signer=False, is_writable=False),
            AccountMeta(bonding_curve, is_signer=False, is_writable=True),
            AccountMeta(associated_bonding_curve, is_signer=False, is_writable=True),
            AccountMeta(user_token_account, is_signer=False, is_writable=True),
            AccountMeta(self.wallet_pubkey, is_signer=True, is_writable=True),
            AccountMeta(SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(SYSVAR_RENT_ID, is_signer=False, is_writable=False),
            AccountMeta(self.get_event_authority_pda(), is_signer=False, is_writable=False),
            AccountMeta(PUMP_PROGRAM_ID, is_signer=False, is_writable=False),
        ]

        return Instruction(PUMP_PROGRAM_ID, data, accounts)

    async def buy(
        self,
        mint: Pubkey,
        sol_amount: float,
        slippage_bps: int = 500,
    ) -> str:
        """
        Buy tokens from a pump.fun bonding curve.

        Args:
            mint: Token mint address
            sol_amount: Amount of SOL to spend
            slippage_bps: Slippage tolerance in basis points (default 5%)

        Returns:
            Transaction signature
        """
        if not self.keypair:
            raise ValueError("Keypair required for trading")

        # Get bonding curve state to calculate expected tokens
        state = await self.get_bonding_curve_state(mint)
        if not state:
            raise ValueError(f"Bonding curve not found for {mint}")

        if state.complete:
            raise ValueError("Bonding curve is complete - trade on PumpSwap instead")

        # Calculate expected tokens using constant product formula
        lamports = int(sol_amount * 1_000_000_000)

        # k = virtual_sol * virtual_token
        # new_virtual_sol = virtual_sol + lamports
        # new_virtual_token = k / new_virtual_sol
        # tokens_out = virtual_token - new_virtual_token
        k = state.virtual_sol_reserves * state.virtual_token_reserves
        new_virtual_sol = state.virtual_sol_reserves + lamports
        new_virtual_token = k // new_virtual_sol
        tokens_out = state.virtual_token_reserves - new_virtual_token

        # Apply slippage
        max_sol_cost = int(lamports * (1 + slippage_bps / 10000))

        # Build and send transaction
        bonding_curve = self.get_bonding_curve_pda(mint)
        associated_bonding_curve = self.get_associated_token_address(bonding_curve, mint)

        buy_ix = await self._build_buy_instruction(
            mint=mint,
            bonding_curve=bonding_curve,
            associated_bonding_curve=associated_bonding_curve,
            amount=tokens_out,
            max_sol_cost=max_sol_cost,
        )

        blockhash = await self.get_latest_blockhash()
        message = MessageV0.try_compile(
            payer=self.wallet_pubkey,
            instructions=[buy_ix],
            address_lookup_table_accounts=[],
            recent_blockhash=blockhash,
        )

        tx = VersionedTransaction(message, [self.keypair])
        return await self.send_transaction(tx)

    async def sell(
        self,
        mint: Pubkey,
        token_amount: int,
        slippage_bps: int = 500,
    ) -> str:
        """
        Sell tokens to a pump.fun bonding curve.

        Args:
            mint: Token mint address
            token_amount: Amount of tokens to sell (in smallest unit)
            slippage_bps: Slippage tolerance in basis points (default 5%)

        Returns:
            Transaction signature
        """
        if not self.keypair:
            raise ValueError("Keypair required for trading")

        # Get bonding curve state
        state = await self.get_bonding_curve_state(mint)
        if not state:
            raise ValueError(f"Bonding curve not found for {mint}")

        if state.complete:
            raise ValueError("Bonding curve is complete - trade on PumpSwap instead")

        # Calculate expected SOL using constant product formula
        # k = virtual_sol * virtual_token
        # new_virtual_token = virtual_token + token_amount
        # new_virtual_sol = k / new_virtual_token
        # sol_out = virtual_sol - new_virtual_sol
        k = state.virtual_sol_reserves * state.virtual_token_reserves
        new_virtual_token = state.virtual_token_reserves + token_amount
        new_virtual_sol = k // new_virtual_token
        sol_out = state.virtual_sol_reserves - new_virtual_sol

        # Apply slippage
        min_sol_output = int(sol_out * (1 - slippage_bps / 10000))

        # Build accounts
        bonding_curve = self.get_bonding_curve_pda(mint)
        associated_bonding_curve = self.get_associated_token_address(bonding_curve, mint)
        user_token_account = self.get_associated_token_address(self.wallet_pubkey, mint)

        # Serialize data
        data = SELL_DISCRIMINATOR
        data += struct.pack("<Q", token_amount)
        data += struct.pack("<Q", min_sol_output)

        accounts = [
            AccountMeta(PUMP_GLOBAL, is_signer=False, is_writable=False),
            AccountMeta(PUMP_FEE_RECIPIENT, is_signer=False, is_writable=True),
            AccountMeta(mint, is_signer=False, is_writable=False),
            AccountMeta(bonding_curve, is_signer=False, is_writable=True),
            AccountMeta(associated_bonding_curve, is_signer=False, is_writable=True),
            AccountMeta(user_token_account, is_signer=False, is_writable=True),
            AccountMeta(self.wallet_pubkey, is_signer=True, is_writable=True),
            AccountMeta(SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(ASSOCIATED_TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(self.get_event_authority_pda(), is_signer=False, is_writable=False),
            AccountMeta(PUMP_PROGRAM_ID, is_signer=False, is_writable=False),
        ]

        sell_ix = Instruction(PUMP_PROGRAM_ID, data, accounts)

        blockhash = await self.get_latest_blockhash()
        message = MessageV0.try_compile(
            payer=self.wallet_pubkey,
            instructions=[sell_ix],
            address_lookup_table_accounts=[],
            recent_blockhash=blockhash,
        )

        tx = VersionedTransaction(message, [self.keypair])
        return await self.send_transaction(tx)

    # ===================
    # Utility Methods
    # ===================

    async def get_token_price(self, mint: Pubkey) -> Optional[dict]:
        """Get current token price from bonding curve"""
        state = await self.get_bonding_curve_state(mint)
        if not state:
            return None

        # Price = virtual_sol_reserves / virtual_token_reserves
        price_per_token = state.virtual_sol_reserves / state.virtual_token_reserves
        price_per_token_sol = price_per_token / 1_000_000_000

        # Market cap = price * total_supply
        market_cap_lamports = price_per_token * state.token_total_supply
        market_cap_sol = market_cap_lamports / 1_000_000_000

        return {
            "price_per_token_lamports": price_per_token,
            "price_per_token_sol": price_per_token_sol,
            "market_cap_lamports": market_cap_lamports,
            "market_cap_sol": market_cap_sol,
            "virtual_sol_reserves": state.virtual_sol_reserves / 1_000_000_000,
            "virtual_token_reserves": state.virtual_token_reserves,
            "real_sol_reserves": state.real_sol_reserves / 1_000_000_000,
            "real_token_reserves": state.real_token_reserves,
            "complete": state.complete,
            "progress_percent": (1 - state.real_token_reserves / 793_100_000_000_000) * 100,
        }

    async def close(self):
        """Close HTTP clients"""
        await self._http_client.aclose()
        await self._rpc_client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
