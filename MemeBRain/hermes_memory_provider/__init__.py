"""Mnemosyne Memory Provider for Hermes.

Deploy to Hermes via:
    ln -s /path/to/mnemosyne/hermes_memory_provider ~/.hermes/plugins/mnemosyne

Then set in ~/.hermes/config.yaml:
    memory:
      provider: mnemosyne

This gives Mnemosyne first-class MemoryProvider integration (system prompt
injection, pre-turn prefetch, post-turn sync, tool dispatch) while remaining
a standalone plugin deployed through the plugin system.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure mnemosyne core is importable from this directory
_mnemosyne_root = Path(__file__).resolve().parent.parent
if str(_mnemosyne_root) not in sys.path:
    sys.path.insert(0, str(_mnemosyne_root))

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy imports — fail gracefully if mnemosyne core is missing
# ---------------------------------------------------------------------------

def _get_beam_class():
    from mnemosyne.core.beam import BeamMemory
    return BeamMemory


def _get_triple_module():
    from mnemosyne.core.triples import add_triple, query_triples
    return add_triple, query_triples


# ---------------------------------------------------------------------------
# Tool schemas
# ---------------------------------------------------------------------------

REMEMBER_SCHEMA = {
    "name": "mnemosyne_remember",
    "description": (
        "Store a durable memory in Mnemosyne. Use for ANY fact, preference, "
        "insight, or context that should persist across sessions. Higher importance "
        "(0.0-1.0) surfaces the memory more often. Use scope='global' for user-level "
        "facts; scope='session' for conversation-specific context. Use valid_until "
        "(ISO date YYYY-MM-DD) for time-bound facts. Use extract_entities=True to "
        "extract named entities for fuzzy recall (e.g. 'Abdias' and 'Abdias J.' will match). "
        "Use extract=True to also pull subject-predicate-object fact triples via LLM "
        "for fact-aware recall. Use veracity to tag confidence: 'stated' for direct "
        "user assertions, 'tool' for deterministic tool output, 'inferred' for derived "
        "guesses; 'unknown' (default) gets no recall boost."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "content": {"type": "string", "description": "The memory content to store."},
            "importance": {"type": "number", "description": "Importance 0.0-1.0. Default 0.5.", "default": 0.5},
            "source": {"type": "string", "description": "Source tag: preference, fact, insight, task, etc.", "default": "user"},
            "scope": {"type": "string", "description": "'session' (default) or 'global'.", "default": "session"},
            "valid_until": {"type": "string", "description": "Optional expiry date YYYY-MM-DD.", "default": ""},
            "extract_entities": {"type": "boolean", "description": "Extract named entities for fuzzy recall. Default False.", "default": False},
            "extract": {"type": "boolean", "description": "Extract subject-predicate-object fact triples via LLM for fact-aware recall. Default False.", "default": False},
            "metadata": {"type": "object", "description": "Optional dict of additional fields (source_doc, tags, page, etc.). Default empty.", "default": {}},
            "veracity": {"type": "string", "description": "Confidence label: 'stated' | 'inferred' | 'tool' | 'imported' | 'unknown'. Default 'unknown'.", "default": "unknown"},
        },
        "required": ["content"],
    },
}

RECALL_SCHEMA = {
    "name": "mnemosyne_recall",
    "description": (
        "Search Mnemosyne for relevant memories. Uses hybrid ranking: by default "
        "50% vector similarity + 30% FTS5 text rank + 20% importance + optional "
        "temporal boost. Tune the per-query weights via vec_weight, fts_weight, "
        "importance_weight (omit to use environment defaults). Returns ranked results."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Natural language query."},
            "limit": {"type": "integer", "description": "Max results. Default 5.", "default": 5},
            "temporal_weight": {
                "type": "number",
                "description": "How much to boost recent memories (0.0 = ignore time, 0.2 = mild recency bias, 0.5 = strong recency bias). Default 0.0.",
                "default": 0.0,
            },
            "query_time": {
                "type": "string",
                "description": "ISO timestamp to treat as 'now' for temporal scoring. Default is current time.",
                "default": "",
            },
            "temporal_halflife": {
                "type": "number",
                "description": "Hours until temporal boost decays by half. Default 24. Lower = faster decay.",
                "default": 24,
            },
            "vec_weight": {
                "type": "number",
                "description": "Vector similarity weight in hybrid scoring. Omit (or pass null) to use MNEMOSYNE_VEC_WEIGHT env var or built-in default 0.5.",
            },
            "fts_weight": {
                "type": "number",
                "description": "Full-text search weight in hybrid scoring. Omit (or pass null) to use MNEMOSYNE_FTS_WEIGHT env var or built-in default 0.3.",
            },
            "importance_weight": {
                "type": "number",
                "description": "Importance score weight in hybrid scoring. Omit (or pass null) to use MNEMOSYNE_IMPORTANCE_WEIGHT env var or built-in default 0.2.",
            },
        },
        "required": ["query"],
    },
}

SLEEP_SCHEMA = {
    "name": "mnemosyne_sleep",
    "description": (
        "Run the Mnemosyne consolidation cycle. Compresses old working memories "
        "into episodic summaries. Call after long sessions or when memory feels stale. "
        "Set all_sessions=true to consolidate eligible old working memories across inactive sessions."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "all_sessions": {
                "type": "boolean",
                "description": "If true, consolidate eligible old working memories across all sessions instead of only the current session.",
                "default": False,
            },
            "dry_run": {
                "type": "boolean",
                "description": "If true, report what would be consolidated without writing changes.",
                "default": False,
            },
        },
    },
}

STATS_SCHEMA = {
    "name": "mnemosyne_stats",
    "description": "Return Mnemosyne memory statistics: working count, episodic count, BEAM tiers.",
    "parameters": {
        "type": "object",
        "properties": {}
    }
}

INVALIDATE_SCHEMA = {
    "name": "mnemosyne_invalidate",
    "description": (
        "Mark a memory as expired or superseded. Provide memory_id from recall results. "
        "Optionally provide replacement_id to chain old → new."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "memory_id": {"type": "string", "description": "ID of memory to invalidate."},
            "replacement_id": {"type": "string", "description": "Optional new memory that replaces this one.", "default": ""},
        },
        "required": ["memory_id"],
    },
}

TRIPLE_ADD_SCHEMA = {
    "name": "mnemosyne_triple_add",
    "description": (
        "Add a temporal fact triple (subject, predicate, object) to the knowledge graph. "
        "Example: ('user', 'prefers', 'neovim'). Use for structured relationships."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "subject": {"type": "string"},
            "predicate": {"type": "string"},
            "object": {"type": "string"},
            "valid_from": {"type": "string", "description": "ISO date YYYY-MM-DD", "default": ""},
        },
        "required": ["subject", "predicate", "object"],
    },
}

TRIPLE_QUERY_SCHEMA = {
    "name": "mnemosyne_triple_query",
    "description": "Query the temporal knowledge graph for facts matching subject/predicate/object patterns.",
    "parameters": {
        "type": "object",
        "properties": {
            "subject": {"type": "string", "default": ""},
            "predicate": {"type": "string", "default": ""},
            "object": {"type": "string", "default": ""},
        },
    },
}

ALL_TOOL_SCHEMAS = [
    REMEMBER_SCHEMA, RECALL_SCHEMA, SLEEP_SCHEMA, STATS_SCHEMA,
    INVALIDATE_SCHEMA, TRIPLE_ADD_SCHEMA, TRIPLE_QUERY_SCHEMA,
]


# ---------------------------------------------------------------------------
# MemoryProvider implementation
# ---------------------------------------------------------------------------

try:
    from agent.memory_provider import MemoryProvider
except ImportError:
    # Graceful fallback if ABC not available (shouldn't happen in practice)
    MemoryProvider = object  # type: ignore


class MnemosyneMemoryProvider(MemoryProvider):
    """Mnemosyne native memory — local SQLite with vector + FTS5 hybrid search."""

    # How long on_session_end will wait for sleep/consolidation to finish before
    # giving up and letting the daemon thread continue in the background. Tests
    # may shorten this to keep the suite fast.
    SESSION_END_SLEEP_TIMEOUT_SECONDS = 15

    def __init__(self):
        self._beam: Optional[Any] = None
        self._session_id = "hermes_default"
        self._hermes_home = ""
        self._platform = "cli"
        self._agent_context = "primary"
        self._turn_count = 0
        self._auto_sleep_threshold = 50
        self._auto_sleep_enabled = os.environ.get("MNEMOSYNE_AUTO_SLEEP_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")
        self._ignore_patterns: List[str] = []  # Regex patterns to filter from memory
        self._skip_contexts = {"cron", "flush", "subagent", "background", "skill_loop"}  # Agent contexts to skip
        # Tracked so shutdown() can wait briefly for in-flight consolidation
        # before clearing the host LLM backend, preventing the post-timeout
        # daemon thread from racing with unregister and falling through to
        # MNEMOSYNE_LLM_BASE_URL.
        self._session_end_thread: Optional[threading.Thread] = None

    @property
    def name(self) -> str:
        return "mnemosyne"

    def is_available(self) -> bool:
        """Check if Mnemosyne core is importable. No network calls."""
        try:
            _get_beam_class()
            return True
        except Exception:
            return False

    def _apply_provider_config(self, kwargs: Dict[str, Any]) -> None:
        """Apply provider-specific config from Hermes kwargs or config.yaml.

        Precedence: kwargs > config.yaml > env var > hardcoded defaults.
        """
        # auto_sleep: prefer kwargs, then config.yaml, then env var
        auto_sleep = kwargs.get("auto_sleep")
        if auto_sleep is None:
            auto_sleep = self._read_config_key("auto_sleep")
        if auto_sleep is not None:
            self._auto_sleep_enabled = bool(auto_sleep)
        # env var is already applied in __init__, so it is the base default

        # sleep_threshold: prefer kwargs, then config.yaml, then default 50
        sleep_threshold = kwargs.get("sleep_threshold")
        if sleep_threshold is None:
            sleep_threshold = self._read_config_key("sleep_threshold")
        if sleep_threshold is not None:
            try:
                self._auto_sleep_threshold = int(sleep_threshold)
            except (TypeError, ValueError):
                logger.warning("Mnemosyne: invalid sleep_threshold=%r, keeping %d",
                               sleep_threshold, self._auto_sleep_threshold)

        # vector_type: pass through to BeamMemory if supported, log if not yet wired
        vector_type = kwargs.get("vector_type") or self._read_config_key("vector_type")
        if vector_type and vector_type not in ("float32", "int8", "bit"):
            logger.warning("Mnemosyne: unknown vector_type=%r, ignoring", vector_type)

        # ignore_patterns: list of regex patterns to filter from memory storage
        patterns = kwargs.get("ignore_patterns") or self._read_config_key("ignore_patterns")
        if patterns:
            if isinstance(patterns, str):
                patterns = [p.strip() for p in patterns.replace(",", "\n").split("\n") if p.strip()]
            elif isinstance(patterns, list):
                patterns = [str(p).strip() for p in patterns if str(p).strip()]
            self._ignore_patterns = patterns

    def _should_filter(self, content: str) -> bool:
        """Check if content matches any ignore pattern. Returns True if it should be skipped."""
        if not self._ignore_patterns:
            return False
        import re
        for pattern in self._ignore_patterns:
            try:
                if re.search(pattern, content, re.IGNORECASE):
                    return True
            except re.error:
                logger.debug("Mnemosyne: invalid ignore pattern %r, skipping", pattern)
        return False

    def _read_config_key(self, key: str) -> Any:
        """Read a single key from memory.mnemosyne in config.yaml."""
        try:
            import yaml, os
            config_path = os.path.join(self._hermes_home, "config.yaml") if self._hermes_home else ""
            if not config_path or not os.path.exists(config_path):
                return None
            with open(config_path, "r") as f:
                config = yaml.safe_load(f) or {}
            return config.get("memory", {}).get("mnemosyne", {}).get(key)
        except Exception:
            return None

    def get_config_schema(self) -> List[Dict[str, Any]]:
        return [
            {"key": "auto_sleep", "description": "Auto-run sleep() when working memory exceeds threshold. Set true to enable. Backward-compatible with MNEMOSYNE_AUTO_SLEEP_ENABLED env var.", "default": False},
            {"key": "sleep_threshold", "description": "Working memory count before auto-sleep triggers", "default": 50},
            {"key": "vector_type", "description": "Vector storage type (note: not yet wired to BeamMemory at runtime; reserved for future use)", "choices": ["float32", "int8", "bit"], "default": "int8"},
            {"key": "ignore_patterns", "description": "Regex patterns to filter from memory storage (one per line in config, or comma-separated). Memories matching any pattern are skipped.", "default": []},
        ]

    def save_config(self, values: Dict[str, Any], hermes_home: str) -> None:
        """Persist provider-specific config values."""
        try:
            import yaml, os
            config_path = os.path.join(hermes_home, "config.yaml") if hermes_home else ""
            if not config_path or not os.path.exists(config_path):
                return
            with open(config_path, "r") as f:
                config = yaml.safe_load(f) or {}
            memory_cfg = config.setdefault("memory", {}).setdefault("mnemosyne", {})
            memory_cfg.update(values)
            with open(config_path, "w") as f:
                yaml.safe_dump(config, f, default_flow_style=False, allow_unicode=True)
        except Exception:
            logger.debug("Mnemosyne: could not persist config values", exc_info=True)

    def initialize(self, session_id: str, **kwargs) -> None:
        """Initialize Mnemosyne beam for this session."""
        self._agent_context = kwargs.get("agent_context", "primary")
        self._platform = kwargs.get("platform", "cli")
        self._hermes_home = kwargs.get("hermes_home", "")

        # Apply provider-specific config from kwargs (Hermes-passed) or config.yaml fallback
        self._apply_provider_config(kwargs)

        if self._agent_context in self._skip_contexts:
            logger.debug("Mnemosyne skipped: non-primary context=%s", self._agent_context)
            return

        self._session_id = f"hermes_{session_id}"

        try:
            BeamMemory = _get_beam_class()
            self._beam = BeamMemory(session_id=self._session_id)
            logger.info("Mnemosyne initialized: session=%s", self._session_id)
        except Exception as e:
            logger.warning("Mnemosyne init failed: %s", e)
            self._beam = None

        # Register the Hermes auxiliary LLM backend so Mnemosyne can route
        # consolidation and fact extraction through Hermes' authenticated
        # provider (e.g., openai-codex via OAuth) when the user opts in via
        # MNEMOSYNE_HOST_LLM_ENABLED=true. Registration alone does not
        # change Mnemosyne behavior; failure here must not break the provider.
        try:
            from hermes_memory_provider.hermes_llm_adapter import register_hermes_host_llm
            if register_hermes_host_llm():
                logger.info("Mnemosyne registered Hermes auxiliary LLM backend for memory operations")
        except Exception as exc:
            logger.debug("Mnemosyne could not register Hermes auxiliary LLM backend: %s", exc)

    def system_prompt_block(self) -> str:
        if not self._beam:
            return ""
        return (
            "# Mnemosyne Memory\n"
            "Active (native local memory). Use mnemosyne_remember to store ANY "
            "durable fact, preference, or insight. Use mnemosyne_recall to search. "
            "The legacy memory tool is deprecated for durable storage — Mnemosyne is primary."
        )

    def prefetch(self, query: str, *, session_id: str = "") -> str:
        """Recall relevant context via Mnemosyne hybrid search with temporal weighting.
        
        Only includes memories above a relevance threshold to prevent context pollution
        from low-quality matches."""
        if not self._beam or self._agent_context in self._skip_contexts:
            return ""
        try:
            results = self._beam.recall(query, top_k=8, temporal_weight=0.2, temporal_halflife=48)
            if not results:
                return ""
            # Filter out low-relevance results to prevent context pollution
            # Only include memories with score above threshold or high importance
            MIN_SCORE_THRESHOLD = 0.15
            MIN_IMPORTANCE_THRESHOLD = 0.5
            filtered = [
                r for r in results
                if r.get("score", 0) >= MIN_SCORE_THRESHOLD
                or r.get("importance", 0) >= MIN_IMPORTANCE_THRESHOLD
            ]
            if not filtered:
                return ""
            lines = ["## Mnemosyne Context"]
            for r in filtered:
                content = r.get("content", "")[:200]
                if len(r.get("content", "")) > 200:
                    content += "..."
                ts = r.get("timestamp", "")[:16] if r.get("timestamp") else ""
                imp = r.get("importance", 0.0)
                lines.append(f"  [{ts}] (importance {imp:.2f}) {content}")
            return "\n".join(lines)
        except Exception as e:
            logger.debug("Mnemosyne prefetch failed: %s", e)
            return ""

    def queue_prefetch(self, query: str, *, session_id: str = "") -> None:
        pass

    def sync_turn(self, user_content: str, assistant_content: str, *, session_id: str = "") -> None:
        """Persist the turn to Mnemosyne episodic memory."""
        if not self._beam or self._agent_context in self._skip_contexts:
            return
        try:
            if user_content and len(user_content) > 5 and not self._should_filter(user_content):
                self._beam.remember(
                    content=f"[USER] {user_content[:500]}",
                    source="conversation",
                    importance=0.3,
                    extract_entities=True,
                )
            if assistant_content and len(assistant_content) > 10 and not self._should_filter(assistant_content):
                self._beam.remember(
                    content=f"[ASSISTANT] {assistant_content[:800]}",
                    source="conversation",
                    importance=0.2,
                    extract_entities=True,
                )
            self._turn_count += 1
            if self._auto_sleep_enabled and self._turn_count % 10 == 0:
                self._maybe_auto_sleep()
        except Exception as e:
            logger.debug("Mnemosyne sync_turn failed: %s", e)

    def _maybe_auto_sleep(self) -> None:
        try:
            stats = self._beam.get_working_stats()
            working = stats.get("total", 0)
            if working > self._auto_sleep_threshold:
                logger.info("Mnemosyne auto-sleep: working=%d > threshold=%d", working, self._auto_sleep_threshold)
                sleep_fn = self._beam.sleep_all_sessions if hasattr(self._beam, "sleep_all_sessions") else self._beam.sleep
                sleep_thread = threading.Thread(target=sleep_fn, daemon=True)
                sleep_thread.start()
                sleep_thread.join(timeout=5)
                if sleep_thread.is_alive():
                    logger.warning("Mnemosyne auto-sleep timed out after 5s — consolidation deferred")
        except Exception:
            pass

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """Return tool schemas — static, do not depend on initialization state."""
        return list(ALL_TOOL_SCHEMAS)

    def handle_tool_call(self, tool_name: str, args: Dict[str, Any], **kwargs) -> str:
        if not self._beam:
            return json.dumps({"error": "Mnemosyne not initialized"})
        try:
            if tool_name == "mnemosyne_remember":
                return self._handle_remember(args)
            elif tool_name == "mnemosyne_recall":
                return self._handle_recall(args)
            elif tool_name == "mnemosyne_sleep":
                return self._handle_sleep(args)
            elif tool_name == "mnemosyne_stats":
                return self._handle_stats(args)
            elif tool_name == "mnemosyne_invalidate":
                return self._handle_invalidate(args)
            elif tool_name == "mnemosyne_triple_add":
                return self._handle_triple_add(args)
            elif tool_name == "mnemosyne_triple_query":
                return self._handle_triple_query(args)
            else:
                return json.dumps({"error": f"Unknown Mnemosyne tool: {tool_name}"})
        except Exception as e:
            logger.error("Mnemosyne tool %s failed: %s", tool_name, e)
            return json.dumps({"error": f"Mnemosyne tool '{tool_name}' failed: {e}"})

    # Canonical veracity allowlist mirrors VERACITY_WEIGHTS in
    # mnemosyne/core/veracity_consolidation.py. Anything outside this set
    # bypasses the recall weighting AND pollutes the contamination filter
    # (which compares `veracity != 'stated'`), so unknown labels persist as
    # garbage in the row. Clamp at the trust boundary.
    _VERACITY_ALLOWED = {"stated", "inferred", "tool", "imported", "unknown"}

    def _handle_remember(self, args: Dict[str, Any]) -> str:
        content = args.get("content", "")
        importance = float(args.get("importance", 0.5))
        source = args.get("source", "user")
        scope = args.get("scope", "session")
        valid_until = args.get("valid_until", None) or None
        extract_entities = bool(args.get("extract_entities", False))
        extract = bool(args.get("extract", False))
        metadata = args.get("metadata") or None
        raw_veracity = args.get("veracity", "unknown") or "unknown"
        veracity_norm = str(raw_veracity).strip().lower()
        if veracity_norm in self._VERACITY_ALLOWED:
            veracity = veracity_norm
        else:
            logger.warning(
                "mnemosyne_remember received unknown veracity %r; clamping to 'unknown'",
                raw_veracity,
            )
            veracity = "unknown"
        if not content:
            return json.dumps({"error": "content is required"})
        memory_id = self._beam.remember(
            content=content,
            importance=importance,
            source=source,
            scope=scope,
            valid_until=valid_until,
            extract_entities=extract_entities,
            extract=extract,
            metadata=metadata,
            veracity=veracity,
        )
        return json.dumps({
            "status": "stored",
            "memory_id": memory_id,
            "content_preview": content[:100],
            "extract_entities": extract_entities,
            "extract": extract,
            "metadata": metadata,
            "veracity": veracity,
        })

    def _handle_recall(self, args: Dict[str, Any]) -> str:
        query = args.get("query", "")
        top_k = int(args.get("limit", 5))
        temporal_weight = float(args.get("temporal_weight", 0.0))
        query_time = args.get("query_time") or None
        temporal_halflife_hours = float(args.get("temporal_halflife", 24))
        if not query:
            return json.dumps({"error": "query is required"})

        # Forward configurable scoring weights ONLY when the caller actually
        # supplied them. beam.recall treats None as "fall back to env var or
        # default" via _normalize_weights; passing 0.0 / 0.5 / etc. when the
        # caller didn't ask for tuning would override that resolution and
        # break MNEMOSYNE_*_WEIGHT env-var deployments. See issue #45.
        recall_kwargs: Dict[str, Any] = {
            "top_k": top_k,
            "temporal_weight": temporal_weight,
            "query_time": query_time,
            "temporal_halflife": temporal_halflife_hours,
        }
        for weight_key in ("vec_weight", "fts_weight", "importance_weight"):
            if weight_key in args:
                recall_kwargs[weight_key] = args[weight_key]

        results = self._beam.recall(query, **recall_kwargs)
        return json.dumps({"query": query, "count": len(results), "temporal_weight": temporal_weight, "results": results})

    def _handle_sleep(self, args: Dict[str, Any]) -> str:
        dry_run = bool(args.get("dry_run", False))
        all_sessions = bool(args.get("all_sessions", False))
        if all_sessions and hasattr(self._beam, "sleep_all_sessions"):
            result = self._beam.sleep_all_sessions(dry_run=dry_run)
        else:
            result = self._beam.sleep(dry_run=dry_run)
        working = self._beam.get_working_stats()
        episodic = self._beam.get_episodic_stats()
        return json.dumps({"status": result.get("status", "consolidated"), "result": result, "working": working, "episodic": episodic})

    def _handle_stats(self, args: Dict[str, Any]) -> str:
        working = self._beam.get_working_stats()
        episodic = self._beam.get_episodic_stats()
        return json.dumps({"provider": "mnemosyne", "session_id": self._session_id, "working": working, "episodic": episodic})

    def _handle_invalidate(self, args: Dict[str, Any]) -> str:
        memory_id = args.get("memory_id", "")
        replacement_id = args.get("replacement_id", None) or None
        if not memory_id:
            return json.dumps({"error": "memory_id is required"})
        self._beam.invalidate(memory_id, replacement_id=replacement_id if replacement_id else None)
        return json.dumps({"status": "invalidated", "memory_id": memory_id})

    def _handle_triple_add(self, args: Dict[str, Any]) -> str:
        subject = args.get("subject", "")
        predicate = args.get("predicate", "")
        obj = args.get("object", "")
        valid_from = args.get("valid_from", None) or None
        if not all([subject, predicate, obj]):
            return json.dumps({"error": "subject, predicate, and object are required"})
        add_triple, _ = _get_triple_module()
        triple_id = add_triple(subject, predicate, obj, valid_from=valid_from,
                               db_path=self._beam.db_path)
        return json.dumps({"status": "stored", "triple_id": triple_id})

    def _handle_triple_query(self, args: Dict[str, Any]) -> str:
        subject = args.get("subject", "") or None
        predicate = args.get("predicate", "") or None
        obj = args.get("object", "") or None
        _, query_triples = _get_triple_module()
        results = query_triples(subject=subject, predicate=predicate, object=obj,
                                db_path=self._beam.db_path)
        return json.dumps({"count": len(results), "results": results})

    def on_turn_start(self, turn_number: int, message: str, **kwargs) -> None:
        self._turn_count = turn_number

    def on_session_end(self, messages: List[Dict[str, Any]]) -> None:
        # Bound the consolidation call so a slow LLM (e.g., a Hermes-routed
        # network call) cannot block Hermes shutdown indefinitely. Mirrors
        # the daemon-thread pattern already used by _maybe_auto_sleep above:
        # the thread keeps running in the background if it overruns, but the
        # main shutdown path is freed after the join timeout.
        if not self._beam:
            return
        try:
            logger.info("Mnemosyne session end — running consolidation")
            timeout = self.SESSION_END_SLEEP_TIMEOUT_SECONDS
            beam = self._beam

            def _sleep_with_logging():
                # Wrap the target so exceptions get logged at the same
                # severity the previous synchronous version used, instead
                # of bubbling out as an uncaught daemon-thread traceback.
                try:
                    beam.sleep()
                except Exception as inner:
                    logger.debug("Mnemosyne session-end sleep failed: %s", inner)

            sleep_thread = threading.Thread(target=_sleep_with_logging, daemon=True)
            self._session_end_thread = sleep_thread
            sleep_thread.start()
            sleep_thread.join(timeout=timeout)
            if sleep_thread.is_alive():
                logger.warning(
                    "Mnemosyne session-end sleep timed out after %ss — consolidation deferred",
                    timeout,
                )
        except Exception as e:
            logger.debug("Mnemosyne session-end sleep failed: %s", e)

    def on_memory_write(self, action: str, target: str, content: str) -> None:
        if not self._beam or action not in ("add", "replace"):
            return
        try:
            scope = "global" if target == "user" else "session"
            self._beam.remember(
                content=content,
                source=f"builtin_memory_{target}",
                importance=0.7 if target == "user" else 0.5,
                scope=scope,
            )
        except Exception as e:
            logger.debug("Mnemosyne mirror write failed: %s", e)

    # How long shutdown() will wait for an in-flight session_end consolidation
    # to finish before clearing the host backend. Bounded so shutdown is never
    # held up indefinitely; just long enough to close the race window where
    # the daemon thread's post-join host call could see a None backend and
    # fall through to MNEMOSYNE_LLM_BASE_URL (violating the host-skips-remote
    # contract). Tests may shorten this to keep the suite fast.
    SHUTDOWN_DRAIN_TIMEOUT_SECONDS = 2

    def shutdown(self) -> None:
        # If session_end's daemon thread is still consolidating when shutdown
        # arrives, briefly wait for it. Otherwise clearing the host backend
        # next would race with the in-flight summarize/extract call and a
        # post-timeout "host attempted" decision could degrade to remote URL
        # despite A3.
        thread = self._session_end_thread
        if thread is not None and thread.is_alive():
            thread.join(timeout=self.SHUTDOWN_DRAIN_TIMEOUT_SECONDS)
            if thread.is_alive():
                logger.debug(
                    "Mnemosyne shutdown: session-end thread still running after %ss; "
                    "proceeding (daemon thread will be reaped on process exit)",
                    self.SHUTDOWN_DRAIN_TIMEOUT_SECONDS,
                )
        self._session_end_thread = None

        # Symmetric with initialize(): clear the Hermes host LLM backend so a
        # process that later uses Mnemosyne outside Hermes does not retain a
        # stale reference into agent.auxiliary_client.
        try:
            from hermes_memory_provider.hermes_llm_adapter import unregister_hermes_host_llm
            unregister_hermes_host_llm()
        except Exception as exc:
            logger.debug("Mnemosyne could not unregister Hermes auxiliary LLM backend: %s", exc)
        self._beam = None


# ---------------------------------------------------------------------------
# Plugin registration (used when loaded via plugins.memory discovery)
# ---------------------------------------------------------------------------

def register_memory_provider(ctx):
    """Called by Hermes memory provider discovery system."""
    provider = MnemosyneMemoryProvider()
    ctx.register_memory_provider(provider)


# ---------------------------------------------------------------------------
# Plugin registration (used when loaded via Hermes plugin system)
# ---------------------------------------------------------------------------

def register(ctx):
    """Called by Hermes plugin loader to register CLI commands and tools."""
    from .cli import register_cli, mnemosyne_command
    ctx.register_cli_command(
        name="mnemosyne",
        help="Manage Mnemosyne local memory",
        description="Inspect, consolidate, and manage Mnemosyne native memory.",
        setup_fn=register_cli,
        handler_fn=mnemosyne_command,
    )

    # Also register tools and hooks from hermes_plugin (sibling directory).
    # This way a single symlink to hermes_memory_provider/ gives us the
    # full Mnemosyne experience: CLI + tools + hooks.
    try:
        _repo_root = str(Path(__file__).resolve().parent.parent)
        if _repo_root not in sys.path:
            sys.path.insert(0, _repo_root)
        from hermes_plugin import register as _plugin_register
        _plugin_register(ctx)
    except Exception:
        pass  # Graceful degradation — CLI still works without plugin tools
