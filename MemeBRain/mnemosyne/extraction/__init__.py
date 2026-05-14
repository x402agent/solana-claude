"""Mnemosyne Cloud — LLM-driven fact extraction engine.

100% open source (MIT). Same engine runs on Free (self-hosted) and Cloud (managed).

Self-hosted users provide their own OpenRouter API key via OPENROUTER_API_KEY env var.
Cloud users get managed extraction through the Mnemosyne Cloud service.
"""

from dataclasses import dataclass

from .client import ExtractionClient
from .prompts import EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_TEMPLATE


@dataclass
class ExtractionConfig:
    """Configuration for the LLM fact extraction engine."""

    enabled: bool = False
    model: str = "google/gemini-2.5-flash"
    batch_size: int = 20
    min_confidence: float = 0.3


__all__ = [
    "ExtractionClient",
    "ExtractionConfig",
    "EXTRACTION_SYSTEM_PROMPT",
    "EXTRACTION_USER_TEMPLATE",
]
