"""
Mnemosyne Diagnostics
=====================
PII-safe debug logging for troubleshooting installation and runtime issues.

Logs to ~/.hermes/mnemosyne/logs/diagnose_YYYY-MM-DD_HHMMSS.jsonl
Never includes memory content, user queries, or API keys.
"""

import json
import os
import sys
import platform
from datetime import datetime
from pathlib import Path
from typing import Dict, List

LOG_DIR = Path.home() / ".hermes" / "mnemosyne" / "logs"


def _ensure_log_dir():
    LOG_DIR.mkdir(parents=True, exist_ok=True)


def _log_path() -> Path:
    _ensure_log_dir()
    ts = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    return LOG_DIR / f"diagnose_{ts}.jsonl"


def _safe_env(name: str) -> str:
    """Return env var presence indicator, never the value."""
    val = os.environ.get(name, "")
    return "set" if val else "unset"


def run_diagnostics() -> Dict:
    """
    Run full diagnostic scan and write PII-safe log.
    Returns summary dict for display.
    """
    log_path = _log_path()
    entries: List[Dict] = []
    
    def log(category: str, check: str, status: str, detail: str = ""):
        entry = {
            "ts": datetime.now().isoformat(),
            "category": category,
            "check": check,
            "status": status,
            "detail": detail
        }
        entries.append(entry)
        return entry

    # --- Python environment ---
    log("env", "python_version", sys.version.split()[0])
    log("env", "platform", platform.platform())
    log("env", "python_executable", sys.executable)

    # --- Mnemosyne package ---
    try:
        import mnemosyne
        log("package", "mnemosyne_version", mnemosyne.__version__)
    except Exception as e:
        log("package", "mnemosyne_version", "ERROR", str(e))

    # --- Core dependencies ---
    deps = {
        "fastembed": "fastembed",
        "sqlite_vec": "sqlite_vec",
        "numpy": "numpy",
        "ctransformers": "ctransformers",
        "huggingface_hub": "huggingface_hub",
    }
    for name, module in deps.items():
        try:
            mod = __import__(module)
            ver = getattr(mod, "__version__", "unknown")
            log("deps", name, "OK", f"version={ver}")
        except ImportError:
            log("deps", name, "MISSING")
        except Exception as e:
            log("deps", name, "ERROR", str(e))

    # --- Mnemosyne core components ---
    try:
        from mnemosyne.core import embeddings as _embeddings
        log("core", "embeddings_available", "YES" if _embeddings.available() else "NO")
        log("core", "embeddings_model", _embeddings._DEFAULT_MODEL)
    except Exception as e:
        log("core", "embeddings", "ERROR", str(e))

    try:
        from mnemosyne.core.beam import _SQLITE_VEC_AVAILABLE
        log("core", "sqlite_vec_available", "YES" if _SQLITE_VEC_AVAILABLE else "NO")
    except Exception as e:
        log("core", "sqlite_vec", "ERROR", str(e))

    # --- Database state ---
    try:
        from mnemosyne.core.memory import Mnemosyne
        mem = Mnemosyne()
        stats = mem.get_stats()
        
        # PII-safe: counts and config only, never content
        log("db", "legacy_total", str(stats.get("total_memories", 0)))
        log("db", "total_sessions", str(stats.get("total_sessions", 0)))
        
        beam = stats.get("beam", {})
        wm = beam.get("working_memory", {})
        ep = beam.get("episodic_memory", {})
        
        log("db", "working_total", str(wm.get("total", 0)))
        log("db", "episodic_total", str(ep.get("total", 0)))
        log("db", "episodic_vectors", str(ep.get("vectors", 0)))
        log("db", "episodic_vec_type", ep.get("vec_type", "none"))
        log("db", "db_path", stats.get("database", "unknown"))
    except Exception as e:
        log("db", "stats", "ERROR", str(e))

    # --- Environment variables (presence only, never values) ---
    env_vars = [
        "MNEMOSYNE_DATA_DIR",
        "MNEMOSYNE_LLM_ENABLED",
        "MNEMOSYNE_LLM_BASE_URL",
        "MNEMOSYNE_VEC_TYPE",
        "MNEMOSYNE_WM_MAX_ITEMS",
        "HERMES_HOME",
    ]
    for var in env_vars:
        log("env", var, _safe_env(var))

    # --- Write log file ---
    with open(log_path, "w", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry) + "\n")

    # --- Build summary ---
    summary = {
        "log_path": str(log_path),
        "checks_total": len(entries),
        "checks_passed": sum(1 for e in entries if e["status"] in ("OK", "YES", "set")),
        "checks_failed": sum(1 for e in entries if e["status"] in ("MISSING", "NO", "ERROR")),
        "key_findings": []
    }

    # Auto-detect common problems
    embed_ok = any(e["check"] == "embeddings_available" and e["status"] == "YES" for e in entries)
    vec_ok = any(e["check"] == "sqlite_vec_available" and e["status"] == "YES" for e in entries)
    ep_vec = next((e for e in entries if e["check"] == "episodic_vectors"), None)
    
    if not embed_ok:
        summary["key_findings"].append("fastembed not available — install with: pip install mnemosyne-memory[embeddings]")
    if not vec_ok:
        summary["key_findings"].append("sqlite-vec not available — install with: pip install sqlite-vec")
    if embed_ok and vec_ok and ep_vec and ep_vec["status"] == "0":
        summary["key_findings"].append("Both fastembed and sqlite-vec are available but episodic vectors=0 — memories may not have been consolidated yet. Run: hermes mnemosyne sleep")
    if embed_ok and vec_ok and ep_vec and int(ep_vec["status"]) > 0:
        summary["key_findings"].append("Semantic search is active with " + ep_vec["status"] + " vectors in episodic memory")

    return summary


if __name__ == "__main__":
    result = run_diagnostics()
    print(json.dumps(result, indent=2))
