#!/usr/bin/env python3
"""Solana CLAWD Perps Agent.

Official Python wrapper for Phoenix perpetuals through Vulcan/Rise SDK.

The agent deliberately delegates exchange interaction to the local `vulcan`
binary so Python code does not reimplement signing, lot conversion, strategy
ledgers, or MCP safety gates. Paper and read-only commands are available by
default. Live actions require an explicit `--yes` flag and still pass through
Vulcan's own confirmation/preflight checks.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]
VULCAN_ROOT = REPO_ROOT / "vulcan-cli-master"
VULCAN_SKILLS_ROOT = VULCAN_ROOT / "skills"
VULCAN_CONTEXT = VULCAN_ROOT / "CONTEXT.md"
VULCAN_TOOL_CATALOG = VULCAN_ROOT / "agents" / "tool-catalog.json"
VULCAN_ERROR_CATALOG = VULCAN_ROOT / "agents" / "error-catalog.json"

SKILL_NAMES = [
    "vulcan",
    "vulcan-error-recovery",
    "vulcan-execution-modes",
    "vulcan-grid-trading",
    "vulcan-lot-size-calculator",
    "vulcan-margin-operations",
    "vulcan-market-intel",
    "vulcan-onboarding",
    "vulcan-portfolio-intel",
    "vulcan-position-management",
    "vulcan-quickstart",
    "vulcan-risk-management",
    "vulcan-ta-strategy",
    "vulcan-technical-analysis",
    "vulcan-tpsl-management",
    "vulcan-trade-execution",
    "vulcan-twap-execution",
]


@dataclass(frozen=True)
class VulcanSkill:
    name: str
    path: Path
    summary: str


class PerpsAgentError(RuntimeError):
    """Raised for expected agent/runtime failures."""


class SolanaClawdPerpsAgent:
    """Paper-first Phoenix perps agent for Solana CLAWD."""

    def __init__(self, vulcan_bin: str | None = None, cwd: Path | None = None) -> None:
        self.vulcan_bin = vulcan_bin or self._resolve_vulcan()
        self.cwd = cwd or REPO_ROOT
        self.skills = self.load_skills()

    @staticmethod
    def _resolve_vulcan() -> str:
        found = shutil.which("vulcan")
        if found:
            return found
        local = VULCAN_ROOT / "target" / "debug" / "vulcan"
        if local.exists():
            return str(local)
        home_local = Path.home() / ".local" / "bin" / "vulcan"
        if home_local.exists():
            return str(home_local)
        raise PerpsAgentError(
            "Vulcan CLI not found. Install it with: "
            "curl -fsSL https://github.com/Ellipsis-Labs/vulcan-cli/releases/latest/download/install.sh | sh"
        )

    def load_skills(self) -> list[VulcanSkill]:
        skills: list[VulcanSkill] = []
        for name in SKILL_NAMES:
            path = VULCAN_SKILLS_ROOT / name / "SKILL.md"
            if not path.exists():
                raise PerpsAgentError(f"Missing Vulcan skill: {path}")
            skills.append(VulcanSkill(name=name, path=path, summary=self._first_heading(path)))
        return skills

    def context_summary(self) -> dict[str, Any]:
        return {
            "agent": "solana-clawd-perps-agent",
            "vulcan_bin": self.vulcan_bin,
            "vulcan_context": str(VULCAN_CONTEXT),
            "skills_root": str(VULCAN_SKILLS_ROOT),
            "skills": [skill.__dict__ | {"path": str(skill.path)} for skill in self.skills],
            "tool_catalog": str(VULCAN_TOOL_CATALOG),
            "error_catalog": str(VULCAN_ERROR_CATALOG),
            "safety": {
                "default_mode": "paper",
                "live_requires_yes": True,
                "never_reads_private_keys": True,
                "preflight_before_live_strategy": True,
            },
        }

    def health(self) -> dict[str, Any]:
        return self.vulcan(["agent", "health"], output="json").json_data

    def preflight(self) -> dict[str, Any]:
        return self.vulcan(["strategy", "preflight"], output="json").json_data

    def market(self, symbol: str = "SOL") -> dict[str, Any]:
        symbol = normalize_symbol(symbol)
        ticker = self.vulcan(["market", "ticker", symbol], output="json").json_data
        orderbook = self.vulcan(["market", "orderbook", symbol, "--depth", "5"], output="json").json_data
        ta = self.vulcan(["ta", "report", symbol, "--timeframe", "1h"], output="json").json_data
        return {"symbol": symbol, "ticker": ticker, "orderbook": orderbook, "ta": ta}

    def portfolio(self) -> dict[str, Any]:
        return self.vulcan(["portfolio"], output="json").json_data

    def paper_init(self, balance: float = 10_000.0) -> dict[str, Any]:
        return self.vulcan(["paper", "init", "--balance", str(balance)], output="json").json_data

    def paper_order(self, side: str, symbol: str, notional_usdc: float, order_type: str = "market") -> dict[str, Any]:
        side = normalize_side(side)
        command = "buy" if side == "buy" else "sell"
        return self.vulcan(
            ["paper", command, normalize_symbol(symbol), "--notional-usdc", str(notional_usdc), "--type", order_type],
            output="json",
        ).json_data

    def live_market_order(self, side: str, symbol: str, notional_usdc: float, approved: bool) -> dict[str, Any]:
        if not approved:
            raise PerpsAgentError("Live order refused: pass --yes after explicit operator approval.")
        side = normalize_side(side)
        command = "market-buy" if side == "buy" else "market-sell"
        return self.vulcan(
            ["trade", command, normalize_symbol(symbol), "--notional-usdc", str(notional_usdc), "--yes"],
            output="json",
        ).json_data

    def twap(
        self,
        symbol: str,
        side: str,
        notional_usdc: float,
        slices: int,
        interval_seconds: int,
        mode: str = "paper",
        approved: bool = False,
    ) -> dict[str, Any]:
        mode = normalize_mode(mode)
        args = [
            "strategy",
            "twap",
            "start",
            "--symbol",
            normalize_symbol(symbol),
            "--side",
            normalize_side(side),
            "--notional-usdc",
            str(notional_usdc),
            "--slices",
            str(slices),
            "--interval-seconds",
            str(interval_seconds),
            "--mode",
            mode,
        ]
        if mode in {"confirm_each", "auto_execute"}:
            if not approved:
                raise PerpsAgentError(f"Live TWAP mode '{mode}' refused: pass --yes after explicit operator approval.")
            args.append("--yes")
        return self.vulcan(args, output="json").json_data

    def monitor(self, run_id: str) -> dict[str, Any]:
        return self.vulcan(["strategy", "monitor", run_id], output="json").json_data

    def finalize(self, run_id: str, cancel_orders: bool = False, close_position: bool = False, approved: bool = False) -> dict[str, Any]:
        args = ["strategy", "finalize", run_id]
        if cancel_orders:
            args.append("--cancel-orders")
        if close_position:
            args.append("--close-position")
        if cancel_orders or close_position:
            if not approved:
                raise PerpsAgentError("Finalize cleanup refused: pass --yes after explicit operator approval.")
            args.append("--yes")
        return self.vulcan(args, output="json").json_data

    def vulcan(self, args: list[str], output: str = "json") -> "VulcanRun":
        final_args = [self.vulcan_bin, *args]
        if output and "-o" not in args and "--output" not in args:
            final_args.extend(["-o", output])
        proc = subprocess.run(
            final_args,
            cwd=self.cwd,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            env=self._safe_env(),
        )
        return VulcanRun.from_process(final_args, proc)

    @staticmethod
    def _safe_env() -> dict[str, str]:
        env = os.environ.copy()
        # Do not synthesize or read wallet passwords. If already exported by
        # the operator, Vulcan may use it; the agent never prints env values.
        return env

    @staticmethod
    def _first_heading(path: Path) -> str:
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped.startswith("#"):
                return stripped.lstrip("#").strip()
        return path.parent.name


@dataclass(frozen=True)
class VulcanRun:
    args: list[str]
    returncode: int
    stdout: str
    stderr: str
    json_data: dict[str, Any]

    @classmethod
    def from_process(cls, args: list[str], proc: subprocess.CompletedProcess[str]) -> "VulcanRun":
        data: dict[str, Any]
        if proc.stdout.strip():
            try:
                parsed = json.loads(proc.stdout)
                data = parsed if isinstance(parsed, dict) else {"ok": True, "data": parsed}
            except json.JSONDecodeError:
                data = {"ok": proc.returncode == 0, "text": proc.stdout}
        else:
            data = {"ok": proc.returncode == 0}

        if proc.returncode != 0:
            message = data.get("error", {}).get("message") if isinstance(data.get("error"), dict) else None
            raise PerpsAgentError(message or proc.stderr.strip() or f"Vulcan command failed: {' '.join(args)}")
        return cls(args=args, returncode=proc.returncode, stdout=proc.stdout, stderr=proc.stderr, json_data=data)


def normalize_symbol(symbol: str) -> str:
    return (symbol or "SOL").replace("-PERP", "").upper()


def normalize_side(side: str) -> str:
    lowered = (side or "").lower()
    if lowered in {"buy", "long"}:
        return "buy"
    if lowered in {"sell", "short"}:
        return "sell"
    raise PerpsAgentError("side must be buy/long or sell/short")


def normalize_mode(mode: str) -> str:
    normalized = (mode or "paper").replace("-", "_").lower()
    allowed = {"paper", "dry_run", "confirm_each", "auto_execute"}
    if normalized not in allowed:
        raise PerpsAgentError(f"mode must be one of {sorted(allowed)}")
    return normalized


def print_json(data: Any) -> None:
    print(json.dumps(data, indent=2, sort_keys=False))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Official Solana CLAWD perps agent for Phoenix via Vulcan/Rise SDK",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("context", help="Show loaded Vulcan context, skills, catalogs, and safety contract")
    sub.add_parser("health", help="Run Vulcan agent health")
    sub.add_parser("preflight", help="Run live strategy preflight")

    market = sub.add_parser("market", help="Read live ticker, orderbook, and TA report")
    market.add_argument("symbol", nargs="?", default="SOL")

    sub.add_parser("portfolio", help="Read portfolio, margin, positions, and orders")

    paper_init = sub.add_parser("paper-init", help="Initialize paper account")
    paper_init.add_argument("--balance", type=float, default=10_000.0)

    paper = sub.add_parser("paper-order", help="Place a paper order")
    paper.add_argument("side", choices=["buy", "sell", "long", "short"])
    paper.add_argument("symbol")
    paper.add_argument("--notional-usdc", type=float, required=True)
    paper.add_argument("--type", default="market", choices=["market", "limit"])

    live = sub.add_parser("live-market-order", help="Place a live market order after explicit approval")
    live.add_argument("side", choices=["buy", "sell", "long", "short"])
    live.add_argument("symbol")
    live.add_argument("--notional-usdc", type=float, required=True)
    live.add_argument("--yes", action="store_true", help="Required after explicit operator approval")

    twap = sub.add_parser("twap", help="Start a TWAP strategy, paper by default")
    twap.add_argument("symbol")
    twap.add_argument("--side", choices=["buy", "sell", "long", "short"], required=True)
    twap.add_argument("--notional-usdc", type=float, required=True)
    twap.add_argument("--slices", type=int, default=5)
    twap.add_argument("--interval-seconds", type=int, default=30)
    twap.add_argument("--mode", default="paper", choices=["paper", "dry_run", "confirm_each", "auto_execute"])
    twap.add_argument("--yes", action="store_true", help="Required for live modes")

    monitor = sub.add_parser("monitor", help="Monitor a strategy run")
    monitor.add_argument("run_id")

    finalize = sub.add_parser("finalize", help="Finalize a strategy run")
    finalize.add_argument("run_id")
    finalize.add_argument("--cancel-orders", action="store_true")
    finalize.add_argument("--close-position", action="store_true")
    finalize.add_argument("--yes", action="store_true", help="Required for cleanup actions")

    return parser


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    try:
        agent = SolanaClawdPerpsAgent()
        if args.command == "context":
            print_json(agent.context_summary())
        elif args.command == "health":
            print_json(agent.health())
        elif args.command == "preflight":
            print_json(agent.preflight())
        elif args.command == "market":
            print_json(agent.market(args.symbol))
        elif args.command == "portfolio":
            print_json(agent.portfolio())
        elif args.command == "paper-init":
            print_json(agent.paper_init(args.balance))
        elif args.command == "paper-order":
            print_json(agent.paper_order(args.side, args.symbol, args.notional_usdc, args.type))
        elif args.command == "live-market-order":
            print_json(agent.live_market_order(args.side, args.symbol, args.notional_usdc, args.yes))
        elif args.command == "twap":
            print_json(agent.twap(args.symbol, args.side, args.notional_usdc, args.slices, args.interval_seconds, args.mode, args.yes))
        elif args.command == "monitor":
            print_json(agent.monitor(args.run_id))
        elif args.command == "finalize":
            print_json(agent.finalize(args.run_id, args.cancel_orders, args.close_position, args.yes))
        else:
            parser.error(f"unknown command: {args.command}")
        return 0
    except PerpsAgentError as exc:
        print_json({"ok": False, "error": {"message": str(exc)}})
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
