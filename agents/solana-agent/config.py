"""Configuration loader for Solana Trading Agent"""

import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv


@dataclass
class SolanaAgentConfig:
    """Configuration for the Solana Trading Agent"""

    # REQUIRED FIELDS (must come first)
    # Helius RPC
    helius_api_key: str
    helius_rpc_url: str
    helius_wss_url: str

    # Birdeye
    birdeye_api_key: str

    # Wallet
    wallet_address: str

    # OPTIONAL FIELDS (with defaults)
    # Jupiter Trading (preferred)
    jupiter_api_key: Optional[str] = None
    jupiter_referral_account: Optional[str] = None

    # Bags Trading (legacy, optional)
    bags_api_key: Optional[str] = None
    bags_config_key: Optional[str] = None
    bags_ref_code: Optional[str] = None

    # Optional configurations
    birdeye_wss_url: Optional[str] = None
    private_key: Optional[str] = None

    # LLM (OpenRouter)
    openrouter_api_key: Optional[str] = None
    openrouter_model: str = "minimax/minimax-m2-her"

    # LLM (Ollama - local)
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "minimax-m2.1:cloud"
    llm_provider: str = "openrouter"  # "openrouter" or "ollama"

    # Twitter/X API (optional)
    twitter_consumer_key: Optional[str] = None
    twitter_consumer_secret: Optional[str] = None
    twitter_access_token: Optional[str] = None
    twitter_access_token_secret: Optional[str] = None
    twitter_bearer_token: Optional[str] = None
    twitter_client_id: Optional[str] = None
    twitter_client_secret: Optional[str] = None

    # MiniMax API (optional - for image, music, video, speech generation)
    minimax_api_key: Optional[str] = None

    # Search API (optional - for real-time web search)
    search_api_key: Optional[str] = None
    xai_api_key: Optional[str] = None

    # CoinGecko API (optional - for real-time crypto market data)
    coingecko_api_key: Optional[str] = None

    # Aster DEX (optional - for perpetual and spot trading)
    aster_api_key: Optional[str] = None
    aster_user_address: Optional[str] = None
    aster_signer_address: Optional[str] = None
    aster_private_key: Optional[str] = None

    # Hyperliquid DEX (optional - for perpetual and spot trading on Hyperliquid L1)
    hyperliquid_wallet: Optional[str] = None
    hyperliquid_private_key: Optional[str] = None
    hyperliquid_use_testnet: bool = False

    # CDP (Coinbase Developer Platform) - for managed Solana accounts
    cdp_api_key_id: Optional[str] = None
    cdp_api_key_secret: Optional[str] = None
    cdp_wallet_secret: Optional[str] = None
    cdp_rpc_url: str = "https://api.mainnet-beta.solana.com"
    cdp_network: str = "solana-mainnet"

    # Agent settings
    max_steps: int = 50
    workspace_dir: str = "./workspace"
    
    @classmethod
    def from_env(cls, env_path: Optional[str] = None) -> "SolanaAgentConfig":
        """Load configuration from environment variables or .env file."""
        
        # Load .env file if provided
        if env_path:
            load_dotenv(env_path)
        else:
            # Try common locations
            for path in [".env.local", ".env", "../.env.local", "../.env"]:
                if Path(path).exists():
                    load_dotenv(path)
                    break
        
        # Required configurations
        helius_api_key = os.getenv("HELIUS_API_KEY")
        helius_rpc_url = os.getenv("HELIUS_RPC_URL")
        helius_wss_url = os.getenv("HELIUS_WSS_URL")

        # Jupiter (preferred trading API)
        jupiter_api_key = os.getenv("JUPITER_API_KEY")
        jupiter_referral_account = os.getenv("JUPITER_REFERRAL_ACCOUNT")

        # Bags (legacy, optional)
        bags_api_key = os.getenv("BAGS_API_KEY")
        bags_config_key = os.getenv("BAGS_CONFIG_KEY")
        bags_ref_code = os.getenv("BAGS_REF_CODE", "")

        birdeye_api_key = os.getenv("BIRDEYE_API_KEY")
        birdeye_wss_url = os.getenv("BIRDEYE_WSS_URL")

        twitter_consumer_key = os.getenv("TWITTER_CONSUMER_KEY")
        twitter_consumer_secret = os.getenv("TWITTER_CONSUMER_SECRET")
        twitter_access_token = os.getenv("TWITTER_ACCESS_TOKEN")
        twitter_access_token_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")
        twitter_bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
        twitter_client_id = os.getenv("TWITTER_CLIENT_ID")
        twitter_client_secret = os.getenv("TWITTER_CLIENT_SECRET")

        minimax_api_key = os.getenv("MINIMAX_API_KEY")

        search_api_key = os.getenv("SEARCH_API_KEY") or os.getenv("SERP_API_KEY")
        xai_api_key = os.getenv("XAI_API_KEY")

        coingecko_api_key = os.getenv("COINGECKO_API_KEY")

        aster_api_key = os.getenv("ASTER_API_KEY")
        aster_user_address = os.getenv("ASTER_USER_ADDRESS")
        aster_signer_address = os.getenv("ASTER_SIGNER_ADDRESS")
        aster_private_key = os.getenv("ASTER_PRIVATE_KEY")

        # Hyperliquid DEX
        hyperliquid_wallet = os.getenv("HYPERLIQUID_WALLET")
        hyperliquid_private_key = os.getenv("HYPERLIQUID_PRIVATE_KEY")
        hyperliquid_use_testnet = os.getenv("HYPERLIQUID_USE_TESTNET", "false").lower() == "true"

        # CDP (Coinbase Developer Platform) - defaults to mainnet
        cdp_api_key_id = os.getenv("CDP_API_KEY_ID")
        cdp_api_key_secret = os.getenv("CDP_API_KEY_SECRET")
        cdp_wallet_secret = os.getenv("CDP_WALLET_SECRET")
        cdp_rpc_url = os.getenv("CDP_RPC_URL") or helius_rpc_url or "https://api.mainnet-beta.solana.com"
        cdp_network = os.getenv("CDP_NETWORK", "solana-mainnet")

        wallet_address = os.getenv("MAWD_WALLET")
        private_key = os.getenv("MAWD_PRIVATE_KEY")
        
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        # Try OPENROUTER_MODEL first, then OPENROUTER_CLAUDE for backwards compatibility
        openrouter_model = os.getenv("OPENROUTER_MODEL") or os.getenv("OPENROUTER_CLAUDE", "minimax/minimax-m2-her")

        # Ollama configuration
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
        ollama_model = os.getenv("OLLAMA_MODEL", "minimax-m2.1:cloud")
        llm_provider = os.getenv("LLM_PROVIDER", "openrouter")  # "openrouter" or "ollama"
        
        # Validate required fields
        missing = []
        if not helius_api_key:
            missing.append("HELIUS_API_KEY")
        if not helius_rpc_url:
            missing.append("HELIUS_RPC_URL")
        if not birdeye_api_key:
            missing.append("BIRDEYE_API_KEY")
        if not wallet_address:
            missing.append("MAWD_WALLET")

        # Require at least one trading API (Jupiter preferred)
        if not jupiter_api_key and not bags_api_key:
            missing.append("JUPITER_API_KEY or BAGS_API_KEY")
        if bags_api_key and not bags_config_key:
            missing.append("BAGS_CONFIG_KEY (required if using BAGS_API_KEY)")
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        return cls(
            helius_api_key=helius_api_key,
            helius_rpc_url=helius_rpc_url,
            helius_wss_url=helius_wss_url or f"wss://mainnet.helius-rpc.com/?api-key={helius_api_key}",
            jupiter_api_key=jupiter_api_key,
            jupiter_referral_account=jupiter_referral_account,
            bags_api_key=bags_api_key,
            bags_config_key=bags_config_key,
            bags_ref_code=bags_ref_code,
            birdeye_api_key=birdeye_api_key,
            birdeye_wss_url=birdeye_wss_url or f"wss://public-api.birdeye.so/socket/solana?x-api-key={birdeye_api_key}",
            twitter_consumer_key=twitter_consumer_key,
            twitter_consumer_secret=twitter_consumer_secret,
            twitter_access_token=twitter_access_token,
            twitter_access_token_secret=twitter_access_token_secret,
            twitter_bearer_token=twitter_bearer_token,
            twitter_client_id=twitter_client_id,
            twitter_client_secret=twitter_client_secret,
            minimax_api_key=minimax_api_key,
            search_api_key=search_api_key,
            xai_api_key=xai_api_key,
            coingecko_api_key=coingecko_api_key,
            aster_api_key=aster_api_key,
            aster_user_address=aster_user_address,
            aster_signer_address=aster_signer_address,
            aster_private_key=aster_private_key,
            hyperliquid_wallet=hyperliquid_wallet,
            hyperliquid_private_key=hyperliquid_private_key,
            hyperliquid_use_testnet=hyperliquid_use_testnet,
            cdp_api_key_id=cdp_api_key_id,
            cdp_api_key_secret=cdp_api_key_secret,
            cdp_wallet_secret=cdp_wallet_secret,
            cdp_rpc_url=cdp_rpc_url,
            cdp_network=cdp_network,
            wallet_address=wallet_address,
            private_key=private_key,
            openrouter_api_key=openrouter_api_key,
            openrouter_model=openrouter_model,
            ollama_base_url=ollama_base_url,
            ollama_model=ollama_model,
            llm_provider=llm_provider,
        )


def load_config(env_path: Optional[str] = None) -> SolanaAgentConfig:
    """Load configuration from environment."""
    return SolanaAgentConfig.from_env(env_path)
