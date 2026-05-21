"""Enhanced Configuration for Solana Trading Agent"""

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

import yaml
from dotenv import load_dotenv


@dataclass
class RetryConfig:
    """Retry configuration"""
    enabled: bool = True
    max_retries: int = 3
    initial_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0


@dataclass
class LLMConfig:
    """LLM configuration"""
    api_key: str
    api_base: str = "https://openrouter.ai/api/v1"
    model: str = "anthropic/claude-sonnet-4"
    max_tokens: int = 4096
    retry: RetryConfig = field(default_factory=RetryConfig)


@dataclass
class SolanaConfig:
    """Solana connection configuration"""
    helius_api_key: str
    helius_rpc_url: str
    helius_wss_url: str
    bags_api_key: str
    bags_config_key: str
    bags_ref_code: str = ""
    birdeye_api_key: str = ""


@dataclass
class WalletConfig:
    """Wallet configuration"""
    address: str
    private_key: Optional[str] = None


@dataclass
class AgentConfig:
    """Agent configuration"""
    max_steps: int = 50
    workspace_dir: str = "./workspace"
    system_prompt_path: str = "system_prompt.md"
    token_limit: int = 80000


@dataclass
class ToolsConfig:
    """Tools configuration"""
    enable_trading: bool = True
    enable_note: bool = True
    enable_file_tools: bool = False
    enable_bash: bool = False
    memory_file: str = ".trading_memory.json"


@dataclass
class CDPConfig:
    """Coinbase Developer Platform configuration"""
    api_key_id: str = ""
    api_key_secret: str = ""
    wallet_secret: str = ""
    rpc_url: str = "https://api.mainnet-beta.solana.com"
    network: str = "solana-mainnet"  # solana-mainnet or solana-devnet


@dataclass
class HyperliquidConfig:
    """Hyperliquid DEX configuration"""
    wallet: str = ""
    private_key: str = ""
    use_testnet: bool = False


@dataclass
class SolanaAgentConfig:
    """Main configuration class for Solana Trading Agent"""
    
    llm: LLMConfig
    solana: SolanaConfig
    wallet: WalletConfig
    agent: AgentConfig = field(default_factory=AgentConfig)
    tools: ToolsConfig = field(default_factory=ToolsConfig)
    cdp: CDPConfig = field(default_factory=CDPConfig)
    hyperliquid: HyperliquidConfig = field(default_factory=HyperliquidConfig)
    
    @classmethod
    def from_env(cls, env_path: Optional[str] = None) -> "SolanaAgentConfig":
        """Load configuration from environment variables or .env file."""
        
        # Load .env file
        if env_path:
            load_dotenv(env_path)
        else:
            for path in [".env.local", ".env", "../.env.local", "../.env"]:
                if Path(path).exists():
                    load_dotenv(path)
                    break
        
        # Validate required fields
        missing = []
        
        helius_api_key = os.getenv("HELIUS_API_KEY")
        if not helius_api_key:
            missing.append("HELIUS_API_KEY")
        
        helius_rpc_url = os.getenv("HELIUS_RPC_URL")
        if not helius_rpc_url:
            missing.append("HELIUS_RPC_URL")
        
        bags_api_key = os.getenv("BAGS_API_KEY")
        if not bags_api_key:
            missing.append("BAGS_API_KEY")
        
        bags_config_key = os.getenv("BAGS_CONFIG_KEY")
        if not bags_config_key:
            missing.append("BAGS_CONFIG_KEY")
        
        birdeye_api_key = os.getenv("BIRDEYE_API_KEY")
        if not birdeye_api_key:
            missing.append("BIRDEYE_API_KEY")
        
        wallet_address = os.getenv("MAWD_WALLET")
        if not wallet_address:
            missing.append("MAWD_WALLET")
        
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_api_key:
            missing.append("OPENROUTER_API_KEY")
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        # Build configs
        llm_config = LLMConfig(
            api_key=openrouter_api_key,
            api_base=os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1"),
            model=os.getenv("OPENROUTER_CLAUDE", "anthropic/claude-sonnet-4"),
        )
        
        solana_config = SolanaConfig(
            helius_api_key=helius_api_key,
            helius_rpc_url=helius_rpc_url,
            helius_wss_url=os.getenv("HELIUS_WSS_URL", f"wss://mainnet.helius-rpc.com/?api-key={helius_api_key}"),
            bags_api_key=bags_api_key,
            bags_config_key=bags_config_key,
            bags_ref_code=os.getenv("BAGS_REF_CODE", ""),
            birdeye_api_key=birdeye_api_key,
        )
        
        wallet_config = WalletConfig(
            address=wallet_address,
            private_key=os.getenv("MAWD_PRIVATE_KEY"),
        )
        
        agent_config = AgentConfig(
            max_steps=int(os.getenv("AGENT_MAX_STEPS", "50")),
            workspace_dir=os.getenv("AGENT_WORKSPACE", "./workspace"),
        )
        
        tools_config = ToolsConfig(
            enable_trading=True,
            enable_note=True,
        )
        
        # CDP config (optional) - defaults to mainnet
        cdp_rpc_url = os.getenv("CDP_RPC_URL") or helius_rpc_url or "https://api.mainnet-beta.solana.com"
        cdp_config = CDPConfig(
            api_key_id=os.getenv("CDP_API_KEY_ID", ""),
            api_key_secret=os.getenv("CDP_API_KEY_SECRET", ""),
            wallet_secret=os.getenv("CDP_WALLET_SECRET", ""),
            rpc_url=cdp_rpc_url,
            network=os.getenv("CDP_NETWORK", "solana-mainnet"),
        )

        # Hyperliquid config (optional)
        hyperliquid_config = HyperliquidConfig(
            wallet=os.getenv("HYPERLIQUID_WALLET", ""),
            private_key=os.getenv("HYPERLIQUID_PRIVATE_KEY", ""),
            use_testnet=os.getenv("HYPERLIQUID_USE_TESTNET", "false").lower() == "true",
        )

        return cls(
            llm=llm_config,
            solana=solana_config,
            wallet=wallet_config,
            agent=agent_config,
            tools=tools_config,
            cdp=cdp_config,
            hyperliquid=hyperliquid_config,
        )
    
    @classmethod
    def from_yaml(cls, config_path: str | Path, env_path: Optional[str] = None) -> "SolanaAgentConfig":
        """Load configuration from YAML file with env fallbacks."""
        
        # Load environment first
        if env_path:
            load_dotenv(env_path)
        else:
            for path in [".env.local", ".env", "../.env.local", "../.env"]:
                if Path(path).exists():
                    load_dotenv(path)
                    break
        
        config_path = Path(config_path)
        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
        
        with open(config_path, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        
        # LLM config
        llm_data = data.get("llm", {})
        llm_config = LLMConfig(
            api_key=llm_data.get("api_key") or os.getenv("OPENROUTER_API_KEY"),
            api_base=llm_data.get("api_base", os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")),
            model=llm_data.get("model", os.getenv("OPENROUTER_CLAUDE", "anthropic/claude-sonnet-4")),
            max_tokens=llm_data.get("max_tokens", 4096),
        )
        
        # Solana config
        solana_data = data.get("solana", {})
        solana_config = SolanaConfig(
            helius_api_key=solana_data.get("helius_api_key") or os.getenv("HELIUS_API_KEY"),
            helius_rpc_url=solana_data.get("helius_rpc_url") or os.getenv("HELIUS_RPC_URL"),
            helius_wss_url=solana_data.get("helius_wss_url") or os.getenv("HELIUS_WSS_URL"),
            bags_api_key=solana_data.get("bags_api_key") or os.getenv("BAGS_API_KEY"),
            bags_config_key=solana_data.get("bags_config_key") or os.getenv("BAGS_CONFIG_KEY"),
            bags_ref_code=solana_data.get("bags_ref_code") or os.getenv("BAGS_REF_CODE", ""),
            birdeye_api_key=solana_data.get("birdeye_api_key") or os.getenv("BIRDEYE_API_KEY"),
        )
        
        # Wallet config
        wallet_data = data.get("wallet", {})
        wallet_config = WalletConfig(
            address=wallet_data.get("address") or os.getenv("MAWD_WALLET"),
            private_key=wallet_data.get("private_key") or os.getenv("MAWD_PRIVATE_KEY"),
        )
        
        # Agent config
        agent_data = data.get("agent", {})
        agent_config = AgentConfig(
            max_steps=agent_data.get("max_steps", 50),
            workspace_dir=agent_data.get("workspace_dir", "./workspace"),
            system_prompt_path=agent_data.get("system_prompt_path", "system_prompt.md"),
            token_limit=agent_data.get("token_limit", 80000),
        )
        
        # Tools config
        tools_data = data.get("tools", {})
        tools_config = ToolsConfig(
            enable_trading=tools_data.get("enable_trading", True),
            enable_note=tools_data.get("enable_note", True),
            enable_file_tools=tools_data.get("enable_file_tools", False),
            enable_bash=tools_data.get("enable_bash", False),
            memory_file=tools_data.get("memory_file", ".trading_memory.json"),
        )

        # CDP config
        cdp_data = data.get("cdp", {})
        cdp_config = CDPConfig(
            api_key_id=cdp_data.get("api_key_id") or os.getenv("CDP_API_KEY_ID", ""),
            api_key_secret=cdp_data.get("api_key_secret") or os.getenv("CDP_API_KEY_SECRET", ""),
            wallet_secret=cdp_data.get("wallet_secret") or os.getenv("CDP_WALLET_SECRET", ""),
            rpc_url=cdp_data.get("rpc_url") or os.getenv("CDP_RPC_URL", "https://api.mainnet-beta.solana.com"),
            network=cdp_data.get("network") or os.getenv("CDP_NETWORK", "solana-mainnet"),
        )

        # Hyperliquid config
        hl_data = data.get("hyperliquid", {})
        hyperliquid_config = HyperliquidConfig(
            wallet=hl_data.get("wallet") or os.getenv("HYPERLIQUID_WALLET", ""),
            private_key=hl_data.get("private_key") or os.getenv("HYPERLIQUID_PRIVATE_KEY", ""),
            use_testnet=hl_data.get("use_testnet") or os.getenv("HYPERLIQUID_USE_TESTNET", "false").lower() == "true",
        )

        return cls(
            llm=llm_config,
            solana=solana_config,
            wallet=wallet_config,
            agent=agent_config,
            tools=tools_config,
            cdp=cdp_config,
            hyperliquid=hyperliquid_config,
        )


def load_config(env_path: Optional[str] = None) -> SolanaAgentConfig:
    """Load configuration from environment variables."""
    return SolanaAgentConfig.from_env(env_path)
