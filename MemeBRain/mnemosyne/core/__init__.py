"""Mnemosyne Core - Native SQLite memory implementation"""

from mnemosyne.core.plugins import (
    MnemosynePlugin,
    PluginManager,
    LoggingPlugin,
    MetricsPlugin,
    FilterPlugin,
    get_manager,
)
from mnemosyne.core.streaming import (
    MemoryStream,
    MemoryEvent,
    EventType,
    DeltaSync,
    SyncCheckpoint,
)
from mnemosyne.core.patterns import (
    MemoryCompressor,
    PatternDetector,
    CompressionStats,
    DetectedPattern,
)

__all__ = [
    # Plugins
    "MnemosynePlugin",
    "PluginManager",
    "LoggingPlugin",
    "MetricsPlugin",
    "FilterPlugin",
    "get_manager",
    # Streaming
    "MemoryStream",
    "MemoryEvent",
    "EventType",
    "DeltaSync",
    "SyncCheckpoint",
    # Patterns
    "MemoryCompressor",
    "PatternDetector",
    "CompressionStats",
    "DetectedPattern",
]
