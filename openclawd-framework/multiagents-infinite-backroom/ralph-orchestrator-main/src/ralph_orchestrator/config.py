"""Configuration management for Ralph Orchestrator."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from dotenv import load_dotenv


@dataclass
class AgentConfig:
    """Configuration for a single agent."""

    name: str = "default-agent"
    role: str = "general"
    model: str = "claude-3-sonnet"
    timeout: int = 60
    max_retries: int = 3


@dataclass
class Config:
    """Master configuration for Ralph Orchestrator."""

    name: str = "ralph-orchestrator"
    version: str = "1.2.2"
    recursive_depth: int = 5
    log_level: str = "INFO"
    agent_timeout: int = 60
    acp_enabled: bool = True
    acp_port: int = 8765
    acp_host: str = "0.0.0.0"
    data_dir: str = ".ralph"
    agents: List[AgentConfig] = field(default_factory=list)
    config_path: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Config":
        """Create Config from a dictionary."""
        agents_data = data.pop("agents", [])
        cfg = cls(**{k: v for k, v in data.items() if k in cls.__annotations__})
        cfg.agents = [AgentConfig(**a) if isinstance(a, dict) else a for a in agents_data]
        return cfg

    def to_dict(self) -> Dict[str, Any]:
        """Convert Config to dictionary."""
        return {
            "name": self.name,
            "version": self.version,
            "recursive_depth": self.recursive_depth,
            "log_level": self.log_level,
            "agent_timeout": self.agent_timeout,
            "acp_enabled": self.acp_enabled,
            "acp_port": self.acp_port,
            "acp_host": self.acp_host,
            "data_dir": self.data_dir,
            "agents": [{"name": a.name, "role": a.role, "model": a.model, "timeout": a.timeout} for a in self.agents],
        }


def load_env_config() -> Dict[str, Any]:
    """Load configuration from environment variables."""
    config: Dict[str, Any] = {}
    prefix = "RALPH_"
    for key, value in os.environ.items():
        if key.startswith(prefix):
            config_key = key[len(prefix):].lower()
            config[config_key] = value
    return config


def load_yaml_config(path: str) -> Dict[str, Any]:
    """Load configuration from a YAML file."""
    yaml_path = Path(path)
    if not yaml_path.exists():
        return {}
    with open(yaml_path, "r") as f:
        data = yaml.safe_load(f)
    if data is None:
        return {}
    if "orchestrator" in data:
        return data["orchestrator"]
    return data


def load_dotenv_file(path: Optional[str] = None) -> None:
    """Load .env file if it exists."""
    env_path = path or ".env"
    if Path(env_path).exists():
        load_dotenv(env_path)


def validate_config(config: Config) -> List[str]:
    """Validate configuration and return list of errors."""
    errors: List[str] = []
    if config.recursive_depth < 1:
        errors.append("recursive_depth must be >= 1")
    if config.recursive_depth > 100:
        errors.append("recursive_depth must be <= 100")
    if config.agent_timeout < 1:
        errors.append("agent_timeout must be >= 1")
    if config.acp_port < 1 or config.acp_port > 65535:
        errors.append("acp_port must be between 1 and 65535")
    if config.log_level not in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
        errors.append(f"Invalid log_level: {config.log_level}")
    return errors


def load_config(config_path: Optional[str] = None) -> Config:
    """Load configuration from all sources with correct priority."""
    load_dotenv_file()

    config_data: Dict[str, Any] = {}

    # Load yaml config (lowest priority)
    if config_path and Path(config_path).exists():
        config_data.update(load_yaml_config(config_path))

    # Load env vars (medium priority)
    config_data.update(load_env_config())

    cfg = Config.from_dict(config_data)

    if config_path:
        cfg.config_path = config_path

    errors = validate_config(cfg)
    if errors:
        raise ValueError(f"Configuration errors: {', '.join(errors)}")

    return cfg
