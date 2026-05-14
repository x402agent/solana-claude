"""
Mnemosyne MCP Server — Model Context Protocol for cross-agent sharing.

This module provides MCP tool definitions and handlers for Mnemosyne,
enabling any MCP-compatible client (Claude Desktop, etc.) to interact
with the memory system.

Usage:
    from mnemosyne.mcp_tools import TOOLS, handle_tool_call

All imports are guarded — this module loads safely even if mcp is not installed.
"""

from typing import Dict, Any, List, Optional
import json
import os

# Guarded import — MCP is optional
try:
    from mcp.types import Tool, TextContent, CallToolResult, ErrorData
    _MCP_AVAILABLE = True
except ImportError:
    _MCP_AVAILABLE = False
    Tool = None
    TextContent = None
    CallToolResult = None
    ErrorData = None

from mnemosyne.core.memory import Mnemosyne
from mnemosyne.clawd_brain import BrainConfig, ClawdBrain

# ---------------------------------------------------------------------------
# Tool Schemas
# ---------------------------------------------------------------------------

_REMEMBER_SCHEMA = {
    "type": "object",
    "properties": {
        "content": {
            "type": "string",
            "description": "The memory content to store."
        },
        "source": {
            "type": "string",
            "description": "Source label (e.g., 'conversation', 'file', 'web').",
            "default": "conversation"
        },
        "importance": {
            "type": "number",
            "description": "Importance score from 0.0 to 1.0.",
            "default": 0.5
        },
        "metadata": {
            "type": "object",
            "description": "Optional key-value metadata.",
            "default": {}
        },
        "extract_entities": {
            "type": "boolean",
            "description": "Extract and store entities from content (Phase 1 feature).",
            "default": False
        },
        "extract": {
            "type": "boolean",
            "description": "Extract structured facts from content (Phase 2 feature).",
            "default": False
        },
        "author_id": {
            "type": "string",
            "description": "Who stored this memory (e.g., 'abdias', 'codex-agent'). Auto-set from env MNEMOSYNE_AUTHOR_ID if not provided."
        },
        "author_type": {
            "type": "string",
            "description": "Type of author: 'human', 'agent', or 'system'. Auto-set from env MNEMOSYNE_AUTHOR_TYPE."
        },
        "channel_id": {
            "type": "string",
            "description": "Channel or group this memory belongs to (e.g., 'fluxspeak-team')."
        },
        "bank": {
            "type": "string",
            "description": "Memory bank to store in (Phase 5 feature).",
            "default": "default"
        }
    },
    "required": ["content"]
}

_RECALL_SCHEMA = {
    "type": "object",
    "properties": {
        "query": {
            "type": "string",
            "description": "Search query."
        },
        "top_k": {
            "type": "integer",
            "description": "Maximum results to return.",
            "default": 5
        },
        "bank": {
            "type": "string",
            "description": "Memory bank to search (Phase 5 feature).",
            "default": "default"
        },
        "temporal_weight": {
            "type": "number",
            "description": "Temporal boost weight (Phase 3 feature). 0.0 = disabled.",
            "default": 0.0
        },
        "query_time": {
            "type": "string",
            "description": "ISO timestamp for temporal reference. Null = now.",
            "default": None
        },
        "vec_weight": {
            "type": "number",
            "description": "Vector similarity weight (Phase 4 feature).",
            "default": 0.5
        },
        "fts_weight": {
            "type": "number",
            "description": "Full-text search weight (Phase 4 feature).",
            "default": 0.3
        },
        "importance_weight": {
            "type": "number",
            "description": "Importance score weight (Phase 4 feature).",
            "default": 0.2
        },
        "author_id": {
            "type": "string",
            "description": "Filter by author (e.g., 'abdias', 'codex-agent'). Only recalls memories by this author."
        },
        "author_type": {
            "type": "string",
            "description": "Filter by author type: 'human', 'agent', or 'system'."
        },
        "channel_id": {
            "type": "string",
            "description": "Filter by channel/group (e.g., 'fluxspeak-team')."
        }
    },
    "required": ["query"]
}

_SLEEP_SCHEMA = {
    "type": "object",
    "properties": {
        "dry_run": {
            "type": "boolean",
            "description": "If true, preview consolidation without executing.",
            "default": False
        },
        "bank": {
            "type": "string",
            "description": "Memory bank to consolidate.",
            "default": "default"
        }
    }
}

_SCRATCHPAD_READ_SCHEMA = {
    "type": "object",
    "properties": {
        "bank": {
            "type": "string",
            "description": "Memory bank.",
            "default": "default"
        }
    }
}

_SCRATCHPAD_WRITE_SCHEMA = {
    "type": "object",
    "properties": {
        "content": {
            "type": "string",
            "description": "Content to write to scratchpad."
        },
        "bank": {
            "type": "string",
            "description": "Memory bank.",
            "default": "default"
        }
    },
    "required": ["content"]
}

_GET_STATS_SCHEMA = {
    "type": "object",
    "properties": {
        "bank": {
            "type": "string",
            "description": "Memory bank.",
            "default": "default"
        }
    }
}

_CLAWD_REMEMBER_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string", "description": "Obsidian note title."},
        "content": {"type": "string", "description": "Memory/wiki note body."},
        "kind": {
            "type": "string",
            "description": "note, research, signal, trade, agent, protocol, wallet, or perp.",
            "default": "note",
        },
        "source": {"type": "string", "description": "Source label or URL.", "default": "mcp"},
        "tags": {"type": "array", "items": {"type": "string"}, "default": []},
        "importance": {"type": "number", "default": 0.65},
        "bank": {"type": "string", "default": "clawd"},
    },
    "required": ["title", "content"],
}

_CLAWD_RECALL_SCHEMA = {
    "type": "object",
    "properties": {
        "query": {"type": "string", "description": "Search query."},
        "top_k": {"type": "integer", "default": 8},
        "bank": {"type": "string", "default": "clawd"},
    },
    "required": ["query"],
}

_CLAWD_RESEARCH_SCHEMA = {
    "type": "object",
    "properties": {
        "target": {"type": "string", "description": "URL to archive or topic to queue."},
        "tags": {"type": "array", "items": {"type": "string"}, "default": []},
        "bank": {"type": "string", "default": "clawd"},
    },
    "required": ["target"],
}

# ---------------------------------------------------------------------------
# Tool Definitions
# ---------------------------------------------------------------------------

TOOLS: List[Dict[str, Any]] = [
    {
        "name": "mnemosyne_remember",
        "description": "Store a memory in Mnemosyne. Supports entity extraction, fact extraction, and bank selection.",
        "inputSchema": _REMEMBER_SCHEMA
    },
    {
        "name": "mnemosyne_recall",
        "description": "Search memories with hybrid scoring (vector + full-text + importance + temporal). Supports bank selection and configurable weights.",
        "inputSchema": _RECALL_SCHEMA
    },
    {
        "name": "mnemosyne_sleep",
        "description": "Run consolidation sleep cycle to merge old working memories into episodic memory.",
        "inputSchema": _SLEEP_SCHEMA
    },
    {
        "name": "mnemosyne_scratchpad_read",
        "description": "Read the agent scratchpad (temporary reasoning workspace).",
        "inputSchema": _SCRATCHPAD_READ_SCHEMA
    },
    {
        "name": "mnemosyne_scratchpad_write",
        "description": "Write to the agent scratchpad.",
        "inputSchema": _SCRATCHPAD_WRITE_SCHEMA
    },
    {
        "name": "mnemosyne_get_stats",
        "description": "Get memory system statistics (counts, banks, last memory).",
        "inputSchema": _GET_STATS_SCHEMA
    },
    {
        "name": "clawd_brain_remember",
        "description": "Store a Solana-Clawd memory in the persistent Mnemosyne bank and Obsidian-style wiki vault.",
        "inputSchema": _CLAWD_REMEMBER_SCHEMA
    },
    {
        "name": "clawd_brain_recall",
        "description": "Recall Clawd memories and matching wiki notes from the persistent brain.",
        "inputSchema": _CLAWD_RECALL_SCHEMA
    },
    {
        "name": "clawd_brain_research",
        "description": "Archive a research URL or queue a Solana/perp/agent research topic in the Clawd brain.",
        "inputSchema": _CLAWD_RESEARCH_SCHEMA
    }
]

# ---------------------------------------------------------------------------
# Mnemosyne Instance Per Connection (no module-level cache)
# ---------------------------------------------------------------------------
def _create_instance(session_id: str = None, author_id: str = None,
                     author_type: str = None, channel_id: str = None,
                     bank: str = "default") -> Mnemosyne:
    """Create a fresh Mnemosyne instance for each MCP connection.
    
    Identity is resolved from:
    1. Explicit args (from tool call or constructor)
    2. Environment variables (MNEMOSYNE_AUTHOR_ID, etc.)
    3. None (backward compatible, no identity tracking)
    """
    auth = author_id or os.environ.get("MNEMOSYNE_AUTHOR_ID")
    auth_type = author_type or os.environ.get("MNEMOSYNE_AUTHOR_TYPE")
    chan = channel_id or os.environ.get("MNEMOSYNE_CHANNEL_ID") or session_id or "default"
    sess = session_id or f"mcp_{bank}"
    
    return Mnemosyne(
        session_id=sess,
        author_id=auth,
        author_type=auth_type,
        channel_id=chan,
        bank=bank
    )


def _resolve_bank(arguments: Dict[str, Any]) -> str:
    """Resolve per-call bank, falling back to MCP server default bank."""
    return arguments.get("bank") or os.environ.get("MNEMOSYNE_MCP_BANK") or "default"


# ---------------------------------------------------------------------------
# Tool Handlers
# ---------------------------------------------------------------------------

def _handle_remember(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Handle mnemosyne_remember tool call."""
    content = arguments["content"]
    source = arguments.get("source", "conversation")
    importance = arguments.get("importance", 0.5)
    metadata = arguments.get("metadata", {})
    extract_entities = arguments.get("extract_entities", False)
    extract = arguments.get("extract", False)
    bank = _resolve_bank(arguments)

    mem = _create_instance(author_id=arguments.get("author_id"), author_type=arguments.get("author_type"), channel_id=arguments.get("channel_id"), bank=bank)
    memory_id = mem.remember(
        content=content,
        source=source,
        importance=importance,
        metadata=metadata,
        extract_entities=extract_entities,
        extract=extract
    )

    return {
        "status": "stored",
        "memory_id": memory_id,
        "bank": bank
    }


def _handle_recall(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Handle mnemosyne_recall tool call."""
    query = arguments["query"]
    top_k = arguments.get("top_k", 5)
    bank = _resolve_bank(arguments)
    temporal_weight = arguments.get("temporal_weight", 0.0)
    query_time = arguments.get("query_time")
    vec_weight = arguments.get("vec_weight")
    fts_weight = arguments.get("fts_weight")
    importance_weight = arguments.get("importance_weight")

    mem = _create_instance(author_id=arguments.get("author_id"), author_type=arguments.get("author_type"), channel_id=arguments.get("channel_id"), bank=bank)
    results = mem.recall(
        query=query,
        top_k=top_k,
        temporal_weight=temporal_weight,
        query_time=query_time,
        vec_weight=vec_weight,
        fts_weight=fts_weight,
        importance_weight=importance_weight,
    )

    # Serialize for JSON — datetime objects aren't JSON serializable
    serializable = []
    for r in results:
        item = dict(r) if hasattr(r, "keys") else r
        # Convert any datetime to ISO string
        for key in ["timestamp", "created_at", "valid_until", "last_recalled"]:
            if key in item and item[key] is not None:
                if hasattr(item[key], "isoformat"):
                    item[key] = item[key].isoformat()
        serializable.append(item)

    return {
        "status": "ok",
        "count": len(serializable),
        "results": serializable,
        "bank": bank
    }


def _handle_sleep(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Handle mnemosyne_sleep tool call."""
    dry_run = arguments.get("dry_run", False)
    all_sessions = arguments.get("all_sessions", False)
    bank = _resolve_bank(arguments)

    mem = _create_instance(author_id=arguments.get("author_id"), author_type=arguments.get("author_type"), channel_id=arguments.get("channel_id"), bank=bank)
    if all_sessions and hasattr(mem, "sleep_all_sessions"):
        result = mem.sleep_all_sessions(dry_run=dry_run)
    else:
        result = mem.sleep(dry_run=dry_run)

    return {
        "status": "ok",
        "dry_run": dry_run,
        "all_sessions": all_sessions,
        "result": result,
        "bank": bank
    }


def _handle_scratchpad_read(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Handle mnemosyne_scratchpad_read tool call."""
    bank = _resolve_bank(arguments)

    mem = _create_instance(author_id=arguments.get("author_id"), author_type=arguments.get("author_type"), channel_id=arguments.get("channel_id"), bank=bank)
    entries = mem.scratchpad_read()

    return {
        "status": "ok",
        "count": len(entries),
        "entries": entries,
        "bank": bank
    }


def _handle_scratchpad_write(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Handle mnemosyne_scratchpad_write tool call."""
    content = arguments["content"]
    bank = _resolve_bank(arguments)

    mem = _create_instance(author_id=arguments.get("author_id"), author_type=arguments.get("author_type"), channel_id=arguments.get("channel_id"), bank=bank)
    entry_id = mem.scratchpad_write(content)

    return {
        "status": "stored",
        "entry_id": entry_id,
        "bank": bank
    }


def _handle_get_stats(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Handle mnemosyne_get_stats tool call."""
    bank = _resolve_bank(arguments)

    mem = _create_instance(author_id=arguments.get("author_id"), author_type=arguments.get("author_type"), channel_id=arguments.get("channel_id"), bank=bank)
    stats = mem.get_stats()

    # Serialize for JSON
    def _serialize(obj):
        if hasattr(obj, "isoformat"):
            return obj.isoformat()
        if isinstance(obj, dict):
            return {k: _serialize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_serialize(i) for i in obj]
        return obj

    return {
        "status": "ok",
        "stats": _serialize(stats),
        "bank": bank
    }


def _create_clawd_brain(arguments: Dict[str, Any]) -> ClawdBrain:
    bank = arguments.get("bank") or "clawd"
    return ClawdBrain(BrainConfig(bank=bank))


def _handle_clawd_remember(arguments: Dict[str, Any]) -> Dict[str, Any]:
    brain = _create_clawd_brain(arguments)
    result = brain.remember(
        arguments["title"],
        arguments["content"],
        kind=arguments.get("kind", "note"),
        source=arguments.get("source", "mcp"),
        tags=arguments.get("tags", []),
        importance=arguments.get("importance", 0.65),
    )
    return {"status": "stored", "result": result, "bank": brain.config.bank}


def _handle_clawd_recall(arguments: Dict[str, Any]) -> Dict[str, Any]:
    brain = _create_clawd_brain(arguments)
    return {"status": "ok", "result": brain.recall(arguments["query"], arguments.get("top_k", 8)), "bank": brain.config.bank}


def _handle_clawd_research(arguments: Dict[str, Any]) -> Dict[str, Any]:
    brain = _create_clawd_brain(arguments)
    result = brain.auto_research(arguments["target"], tags=arguments.get("tags", []))
    return {"status": "queued" if result else "ok", "result": result, "bank": brain.config.bank}


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

_TOOL_HANDLERS = {
    "mnemosyne_remember": _handle_remember,
    "mnemosyne_recall": _handle_recall,
    "mnemosyne_sleep": _handle_sleep,
    "mnemosyne_scratchpad_read": _handle_scratchpad_read,
    "mnemosyne_scratchpad_write": _handle_scratchpad_write,
    "mnemosyne_get_stats": _handle_get_stats,
    "clawd_brain_remember": _handle_clawd_remember,
    "clawd_brain_recall": _handle_clawd_recall,
    "clawd_brain_research": _handle_clawd_research,
}


def handle_tool_call(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dispatch an MCP tool call to the correct handler.

    Args:
        name: Tool name (e.g., "mnemosyne_remember")
        arguments: Parsed JSON arguments

    Returns:
        JSON-serializable result dict

    Raises:
        ValueError: If tool name is unknown
    """
    handler = _TOOL_HANDLERS.get(name)
    if handler is None:
        raise ValueError(f"Unknown tool: {name}. Available: {list(_TOOL_HANDLERS.keys())}")

    return handler(arguments)


def get_tool_definitions() -> List[Dict[str, Any]]:
    """Return all tool definitions for MCP server registration."""
    return TOOLS
