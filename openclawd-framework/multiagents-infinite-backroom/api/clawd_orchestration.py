"""
CLAWD Orchestration loops.

This is the backroom-facing integration of the Ralph Orchestrator pattern:
continuous bounded iteration, safety checks, task decomposition, recovery, and
status telemetry. The public API is intentionally read-only/simulation-only so
users can plan orchestration loops from the backroom without granting shell
execution from the web.
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import Any

from .trading_arena import build_trading_arena


@dataclass(frozen=True)
class ClawdPhase:
    name: str
    agent: str
    goal: str


CLAWD_PHASES = [
    ClawdPhase("scope", "The Analyst", "extract constraints, risks, and success criteria"),
    ClawdPhase("pressure-test", "The Satirist", "find contradictions, weak assumptions, and failure modes"),
    ClawdPhase("execute", "Clawd", "turn the task into a concrete shell-safe action plan"),
    ClawdPhase("verify", "CLAWD Orchestrator", "define checks, telemetry, and rollback criteria"),
]


def _tokenize_task(task: str) -> list[str]:
    words = re.findall(r"[a-zA-Z0-9_$./:-]+", task.lower())
    return [word for word in words if len(word) > 2][:18]


def _risk_level(task: str) -> str:
    lowered = task.lower()
    high = ("deploy", "trade", "wallet", "key", "secret", "token launch", "mainnet", "delete", "reset")
    medium = ("write", "commit", "install", "migrate", "database", "convex", "fly")
    if any(term in lowered for term in high):
        return "high"
    if any(term in lowered for term in medium):
        return "medium"
    return "low"


def _checks_for_task(task: str) -> list[str]:
    lowered = task.lower()
    checks = ["record orchestration trace", "return completion summary"]
    if "fly" in lowered or "deploy" in lowered:
        checks.extend(["run build before deploy", "verify /healthz after deploy"])
    if "convex" in lowered:
        checks.extend(["validate Convex schema", "deploy with explicit deploy key only"])
    if "readme" in lowered or "docs" in lowered:
        checks.append("verify README commands match deployed endpoints")
    if "token" in lowered or "metaplex" in lowered:
        checks.append("require explicit confirmation before irreversible on-chain action")
    if "perps" in lowered or "trade" in lowered:
        checks.append("treat market output as simulation, not financial instruction")
    return checks


def run_clawd_orchestration(task: str, loops: int = 3, include_market: bool = True) -> dict[str, Any]:
    clean_task = task.strip()[:1200]
    if not clean_task:
        clean_task = "Explore the backroom and produce a safe orchestration plan."

    loops = max(1, min(int(loops or 1), 8))
    keywords = _tokenize_task(clean_task)
    risk = _risk_level(clean_task)
    checks = _checks_for_task(clean_task)
    market = build_trading_arena(limit=6) if include_market else None
    market_mood = market.get("mood") if market else "not-requested"

    trace = []
    for index in range(loops):
      phase = CLAWD_PHASES[index % len(CLAWD_PHASES)]
      progress = round((index + 1) / loops, 3)
      trace.append({
          "iteration": index + 1,
          "phase": phase.name,
          "agent": phase.agent,
          "goal": phase.goal,
          "input": clean_task,
          "keywords": keywords[:8],
          "risk": risk,
          "marketMood": market_mood,
          "output": _iteration_output(phase, clean_task, keywords, checks, progress, market),
      })

    return {
        "name": "CLAWD Orchestrator",
        "source": "Ralph Orchestrator pattern, CLAWD-branded backroom loop",
        "mode": "bounded-read-only",
        "task": clean_task,
        "loops": loops,
        "risk": risk,
        "checks": checks,
        "trace": trace,
        "summary": {
            "status": "planned",
            "nextAction": "Run locally with explicit shell access if execution is required.",
            "completionCriteria": checks[-3:] if len(checks) >= 3 else checks,
            "generatedAt": int(time.time() * 1000),
        },
    }


def _iteration_output(
    phase: ClawdPhase,
    task: str,
    keywords: list[str],
    checks: list[str],
    progress: float,
    market: dict[str, Any] | None,
) -> str:
    market_line = ""
    if market and market.get("decisions"):
        lead = market["decisions"][0]
        market_line = f" Market tape: {lead['agent']} is {lead['action']} {lead['symbol']} with {lead['confidence']:.0%} confidence."

    if phase.name == "scope":
        return (
            f"Scope locked at {progress:.0%}. Target: {task}. "
            f"Primary handles: {', '.join(keywords[:5]) or 'none'}.{market_line}"
        )
    if phase.name == "pressure-test":
        return (
            "Failure scan: avoid unbounded loops, accidental secret exposure, nested repo commits, "
            f"and irreversible actions. Required checks: {', '.join(checks[:3])}."
        )
    if phase.name == "execute":
        return (
            "Execution plan: stage changes narrowly, run deterministic verification, deploy only after "
            "health checks pass, and keep user-created dirty files untouched."
        )
    return (
        "Verification plan: compare deployed endpoints, inspect build output, verify public health, "
        "and preserve a concise trace for the backroom transcript."
    )
